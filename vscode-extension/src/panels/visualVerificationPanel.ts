import * as vscode from 'vscode';
import { MCPClient, MCPWebSocketListener } from '../services/mcpClient';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'passed' | 'failed';
  planSectionId?: string;
  planFile?: string;
  planLineStart?: number;
  planLineEnd?: number;
}

interface VerificationState {
  taskId: string;
  taskTitle: string;
  planVersion: string;
  serverStatus: 'stopped' | 'starting' | 'running' | 'error';
  serverUrl: string;
  requiresUserReady: boolean;
  checklist: ChecklistItem[];
  alreadyTested: string[];
  retestRequired: string[];
  notInScope: string[];
  planHighlights: { title: string; details: string }[];
  changeRequests: { summary: string; impact?: string }[];
}

export class VisualVerificationPanel {
  public static currentPanel: VisualVerificationPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private state: VerificationState;
  private disposables: vscode.Disposable[] = [];
  private wsListener: MCPWebSocketListener;
  private mcpClient: MCPClient;

  private constructor(panel: vscode.WebviewPanel, initialState?: Partial<VerificationState>) {
    this.panel = panel;
    this.state = this.buildInitialState(initialState);
    this.mcpClient = MCPClient.getInstance();
    this.wsListener = MCPWebSocketListener.getInstance();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Setup real-time checklist sync
    this.setupChecklistSync();

    // Setup WebSocket listeners
    this.disposables.push(
      this.wsListener.onEvent('verification', (data: any) => {
        if (data.taskId === this.state.taskId) {
          if (data.status === 'passed') {
            this.updateState({ serverStatus: 'running' });
          }
        }
      })
    );

    this.disposables.push(
      this.wsListener.onEvent('task-status', (data: any) => {
        if (data.taskId === this.state.taskId && data.status === 'testing') {
          vscode.window.showInformationMessage('Testing phase started on verification server.');
        }
      })
    );

    // Fetch initial checklist from backend
    if (this.state.taskId) {
      this.fetchChecklist(this.state.taskId).catch(error => {
        console.error('Failed to fetch initial checklist:', error);
      });
    }

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'startServer':
          this.updateState({ serverStatus: 'starting' });
          try {
            await this.mcpClient.reportTaskStatus({
              taskId: this.state.taskId,
              status: 'in-progress',
              implementationNotes: 'Verification server starting'
            });
            // Optimistic update while server starts
            setTimeout(() => this.updateState({ serverStatus: 'running' }), 500);
            vscode.window.showInformationMessage('Starting verification server...');
          } catch (error) {
            this.updateState({ serverStatus: 'error' });
            vscode.window.showErrorMessage('Failed to start server. Check MCP connection.');
          }
          return;
        case 'stopServer':
          this.updateState({ serverStatus: 'stopped' });
          try {
            await this.mcpClient.reportTaskStatus({
              taskId: this.state.taskId,
              status: 'in-progress',
              implementationNotes: 'Verification server stopped'
            });
            vscode.window.showInformationMessage('Server stopped.');
          } catch (error) {
            vscode.window.showErrorMessage('Failed to stop server.');
          }
          return;
        case 'restartServer':
          this.updateState({ serverStatus: 'starting' });
          try {
            await this.mcpClient.reportTaskStatus({
              taskId: this.state.taskId,
              status: 'in-progress',
              implementationNotes: 'Verification server restarting'
            });
            setTimeout(() => this.updateState({ serverStatus: 'running' }), 500);
            vscode.window.showInformationMessage('Server restarting...');
          } catch (error) {
            this.updateState({ serverStatus: 'error' });
            vscode.window.showErrorMessage('Failed to restart server.');
          }
          return;
        case 'markReady':
          this.updateState({ requiresUserReady: false });
          try {
            await this.mcpClient.reportTaskStatus({
              taskId: this.state.taskId,
              status: 'in-progress',
              implementationNotes: 'User marked Ready. Visual verification proceeding.'
            });
            vscode.window.showInformationMessage('User marked Ready. Visual verification can proceed.');
          } catch (error) {
            vscode.window.showErrorMessage('Failed to report ready status.');
          }
          return;
        case 'toggleChecklist':
          this.toggleChecklistItem(message.id, message.status);
          try {
            const passedItems = this.state.checklist.filter(item => item.status === 'passed');
            await this.mcpClient.reportObservation({
              taskId: this.state.taskId,
              type: 'discovery',
              message: `Checklist item updated: ${message.id} -> ${message.status} (${passedItems.length}/${this.state.checklist.length} passed)`
            });
          } catch (error) {
            // Observation logging failure doesn't block UI update
          }
          return;
        case 'submitIssues':
          try {
            const failedItems = this.state.checklist.filter(item => item.status === 'failed');
            await this.mcpClient.reportVerificationResult({
              verificationTaskId: this.state.taskId,
              originalTaskId: this.state.taskId,
              status: failedItems.length > 0 ? 'partial' : 'passed',
              checklist: this.state.checklist,
              issuesFound: failedItems.map(item => ({
                id: item.id,
                title: item.title,
                description: item.description
              })),
              notes: 'Visual verification issues submitted'
            });
            vscode.window.showInformationMessage('Issues submitted to Verification Team.');
          } catch (error) {
            vscode.window.showErrorMessage('Failed to submit issues.');
          }
          return;
        case 'submitChangeRequest':
          if (message.summary) {
            this.state.changeRequests.unshift({ summary: message.summary, impact: message.impact });
          }
          try {
            await this.mcpClient.reportObservation({
              taskId: this.state.taskId,
              type: 'issue',
              message: `Change request: ${message.summary}`,
              suggestedAction: message.impact ?? 'Plan adjustment required',
              createTask: true
            });
          } catch (error) {
            vscode.window.showErrorMessage('Failed to submit change request.');
          }
          this.updatePanel();
          vscode.window.showInformationMessage('Change request captured. Plan adjustment wizard will follow.');
          return;
        case 'navigateToPlan':
          if (message.itemId) {
            await this.navigateToPlanSection(message.itemId);
          }
          return;
        case 'reportIssue':
          if (message.itemId) {
            await this.createIssueTask(message.itemId, message.issueData);
          }
          return;
        default:
          return;
      }
    }, null, this.disposables);

    this.updatePanel();
  }

  public static createOrShow(extensionUri: vscode.Uri, initialState?: Partial<VerificationState>) {
    if (VisualVerificationPanel.currentPanel) {
      VisualVerificationPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      if (initialState) {
        VisualVerificationPanel.currentPanel.state = {
          ...VisualVerificationPanel.currentPanel.state,
          ...initialState,
        };
        VisualVerificationPanel.currentPanel.updatePanel();
      }
      return VisualVerificationPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'visualVerificationPanel',
      'Visual Verification',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const newPanel = new VisualVerificationPanel(panel, initialState);
    VisualVerificationPanel.currentPanel = newPanel;
    return newPanel;
  }

  private buildInitialState(initial?: Partial<VerificationState>): VerificationState {
    return {
      taskId: initial?.taskId ?? 'TASK-001',
      taskTitle: initial?.taskTitle ?? 'Implement color palette system',
      planVersion: initial?.planVersion ?? '1.0.0',
      serverStatus: initial?.serverStatus ?? 'stopped',
      serverUrl: initial?.serverUrl ?? 'http://localhost:3000',
      requiresUserReady: initial?.requiresUserReady ?? true,
      checklist:
        initial?.checklist ??
        [
          { id: 'check-colors', title: 'Color Palette Display', description: 'All 12 colors with 3 variants', status: 'pending' },
          { id: 'check-theme-toggle', title: 'Theme Toggle', description: 'Light/Dark switch updates all components', status: 'pending' },
          { id: 'check-accessibility', title: 'Accessibility', description: 'WCAG AA contrast verified', status: 'pending' },
        ],
      alreadyTested: initial?.alreadyTested ?? ['Color variables output correctly', 'Light mode renders correctly'],
      retestRequired: initial?.retestRequired ?? ['Dark mode inversion', 'Buttons use theme colors'],
      notInScope: initial?.notInScope ?? ['Typography system', 'Navigation components'],
      planHighlights:
        initial?.planHighlights ?? [
          { title: 'Colors > Primary', details: 'light: #E3F2FD, medium: #2196F3, dark: #1565C0' },
          { title: 'Breakpoints', details: '<768px collapse sidebar, 200ms animation' },
        ],
      changeRequests: initial?.changeRequests ?? [],
    };
  }

  private toggleChecklistItem(id: string, status: ChecklistItem['status']) {
    this.state.checklist = this.state.checklist.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    this.updatePanel();
    
    // Sync to backend in background
    this.syncChecklistItemToBackend(id, status).catch(error => {
      console.error('Background sync failed:', error);
    });
  }

  private updateState(patch: Partial<VerificationState>) {
    this.state = { ...this.state, ...patch };
    this.updatePanel();
  }

  /**
   * Fetch checklist from backend API
   */
  async fetchChecklist(taskId: string): Promise<void> {
    try {
      const response = await fetch(`${this.state.serverUrl}/api/v1/verification/checklist?taskId=${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch checklist: ${response.statusText}`);
      }

      const data = await response.json() as { checklist?: any[] };
      
      if (data.checklist && Array.isArray(data.checklist)) {
        this.updateState({
          checklist: data.checklist.map((item: any) => ({
            id: item.id || `check-${Date.now()}`,
            title: item.title || 'Untitled',
            description: item.description,
            status: item.status || 'pending',
          })),
        });
        
        vscode.window.showInformationMessage(`Loaded ${data.checklist.length} checklist items`);
      }
    } catch (error) {
      console.error('Failed to fetch checklist:', error);
      vscode.window.showWarningMessage(
        'Could not fetch checklist from backend. Using default checklist.'
      );
    }
  }

  /**
   * Setup WebSocket listener for real-time checklist updates
   */
  setupChecklistSync(): void {
    // Listen for checklist-updated events
    this.disposables.push(
      this.wsListener.onEvent('checklist-updated', (data: any) => {
        if (data.taskId === this.state.taskId) {
          if (data.checklist && Array.isArray(data.checklist)) {
            this.updateState({
              checklist: data.checklist.map((item: any) => ({
                id: item.id || `check-${Date.now()}`,
                title: item.title || 'Untitled',
                description: item.description,
                status: item.status || 'pending',
              })),
            });
            
            vscode.window.showInformationMessage('Checklist updated from server');
          }
        }
      })
    );

    // Listen for checklist-item-status events (individual item updates)
    this.disposables.push(
      this.wsListener.onEvent('checklist-item-status', (data: any) => {
        if (data.taskId === this.state.taskId && data.itemId) {
          this.state.checklist = this.state.checklist.map((item) =>
            item.id === data.itemId ? { ...item, status: data.status } : item
          );
          this.updatePanel();
        }
      })
    );
  }

  /**
   * Sync checklist item status to backend
   */
  async syncChecklistItemToBackend(itemId: string, status: ChecklistItem['status']): Promise<void> {
    try {
      const response = await fetch(`${this.state.serverUrl}/api/v1/verification/checklist/item`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.state.taskId,
          itemId,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync checklist item: ${response.statusText}`);
      }

      // Calculate progress
      const passedItems = this.state.checklist.filter(item => item.status === 'passed');
      const totalItems = this.state.checklist.length;
      const progressPercent = Math.round((passedItems.length / totalItems) * 100);

      console.log(`Checklist progress: ${passedItems.length}/${totalItems} (${progressPercent}%)`);
    } catch (error) {
      console.error('Failed to sync checklist item to backend:', error);
      vscode.window.showWarningMessage('Could not sync checklist to backend');
    }
  }

  /**
   * Get checklist completion statistics
   */
  getChecklistStats(): { total: number; passed: number; failed: number; pending: number; progress: number } {
    const total = this.state.checklist.length;
    const passed = this.state.checklist.filter(item => item.status === 'passed').length;
    const failed = this.state.checklist.filter(item => item.status === 'failed').length;
    const pending = this.state.checklist.filter(item => item.status === 'pending' || item.status === 'in-progress').length;
    const progress = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { total, passed, failed, pending, progress };
  }

  /**
   * Navigate to plan section based on checklist item
   */
  async navigateToPlanSection(itemId: string): Promise<void> {
    const item = this.state.checklist.find(i => i.id === itemId);
    
    if (!item) {
      vscode.window.showWarningMessage('Checklist item not found');
      return;
    }

    if (!item.planFile) {
      vscode.window.showInformationMessage(`No plan reference for "${item.title}"`);
      return;
    }

    try {
      // Find plan file in workspace
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder open');
      }

      const planFilePath = vscode.Uri.joinPath(workspaceFolders[0].uri, item.planFile);
      
      // Open the document
      const document = await vscode.workspace.openTextDocument(planFilePath);
      
      // Show the document in editor
      const editor = await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
      });

      // Highlight the section if line numbers are provided
      if (item.planLineStart !== undefined && item.planLineEnd !== undefined) {
        const startLine = item.planLineStart - 1; // Convert to 0-based
        const endLine = item.planLineEnd - 1;
        
        const range = new vscode.Range(
          new vscode.Position(startLine, 0),
          new vscode.Position(endLine, Number.MAX_VALUE)
        );

        // Reveal and select the range
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

        // Flash highlight (using decoration)
        const decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: 'rgba(255, 255, 0, 0.3)',
          isWholeLine: true,
        });

        editor.setDecorations(decorationType, [range]);

        // Remove highlight after 2 seconds
        setTimeout(() => {
          decorationType.dispose();
        }, 2000);
      }

      vscode.window.showInformationMessage(`Navigated to: ${item.title}`);
    } catch (error) {
      console.error('Failed to navigate to plan section:', error);
      vscode.window.showErrorMessage(`Could not open plan file: ${item.planFile}`);
    }
  }

  /**
   * Create issue task in _ZENTASKS based on checklist item
   */
  async createIssueTask(itemId: string, issueData: { title: string; description: string; severity: string }): Promise<void> {
    const item = this.state.checklist.find(i => i.id === itemId);
    
    if (!item) {
      vscode.window.showWarningMessage('Checklist item not found');
      return;
    }

    try {
      // Build task details with context
      const taskTitle = `[Verification Issue] ${issueData.title}`;
      const taskDescription = `Issue found during visual verification of "${item.title}":\n\n${issueData.description}`;
      
      const taskDetails = `**Source**: Visual Verification - ${this.state.taskTitle} (${this.state.taskId})
**Checklist Item**: ${item.title}
**Severity**: ${issueData.severity}
${item.planFile ? `**Plan Reference**: ${item.planFile}` : ''}
${item.planSectionId ? `**Plan Section**: ${item.planSectionId}` : ''}

**Issue Description**:
${issueData.description}

**Context**:
- Original Task: ${this.state.taskId}
- Plan Version: ${this.state.planVersion}
- Verification Phase: Testing
`;

      const testStrategy = `1. Reproduce the issue following the description
2. Verify the issue matches the severity level (${issueData.severity})
3. Implement the fix
4. Test the fix in the same verification scenario
5. Mark the original checklist item as passed`;

      // Determine priority based on severity
      const priorityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
        'critical': 'critical',
        'high': 'high',
        'medium': 'medium',
        'low': 'low',
      };
      const priority = priorityMap[issueData.severity.toLowerCase()] || 'medium';

      // Use VS Code command to create task (assuming extension has this command registered)
      // For now, we'll use the MCP client to report this
      await this.mcpClient.reportObservation({
        taskId: this.state.taskId,
        type: 'issue',
        message: `Verification issue: ${issueData.title}`,
        suggestedAction: taskDetails,
        createTask: true,
      });

      // Also try to create via workspace command if available
      try {
        await vscode.commands.executeCommand('copilot-orchestrator.createTask', {
          title: taskTitle,
          description: taskDescription,
          details: taskDetails,
          testStrategy: testStrategy,
          priority: priority,
          tags: ['verification-issue', `severity-${issueData.severity.toLowerCase()}`, `source-${this.state.taskId}`],
        });
      } catch (cmdError) {
        console.log('Direct task creation command not available, used MCP fallback');
      }

      // Mark checklist item as failed if it was pending
      if (item.status === 'pending' || item.status === 'in-progress') {
        this.toggleChecklistItem(itemId, 'failed');
      }

      vscode.window.showInformationMessage(
        `Issue task created: "${taskTitle}" (Priority: ${priority})`
      );

    } catch (error) {
      console.error('Failed to create issue task:', error);
      vscode.window.showErrorMessage('Failed to create issue task. Check logs for details.');
    }
  }

  private updatePanel() {
    this.panel.webview.html = this.renderHtml(this.state);
  }

  private renderHtml(state: VerificationState): string {
    // Calculate checklist statistics
    const stats = this.getChecklistStats();
    
    const checklistHtml = state.checklist
      .map((item) => {
        const hasNavigation = item.planFile && item.planFile.length > 0;
        const clickableClass = hasNavigation ? 'clickable-item' : '';
        const navButton = hasNavigation 
          ? `<button class="nav-button" data-navigate-id="${item.id}" title="Jump to plan section">📍</button>`
          : '';
        
        return `<div class="checklist-item ${clickableClass}">
          <div style="flex: 1;">
            <div class="item-title">${this.escapeHtml(item.title)}</div>
            <div class="item-desc">${this.escapeHtml(item.description ?? '')}</div>
            ${item.planSectionId ? `<div class="item-ref">Ref: ${this.escapeHtml(item.planSectionId)}</div>` : ''}
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${navButton}
            <button class="issue-button" data-issue-id="${item.id}" title="Report Issue">🐛</button>
            <select data-check-id="${item.id}">
              ${this.renderOption('pending', item.status, 'Pending')}
              ${this.renderOption('in-progress', item.status, 'In Progress')}
              ${this.renderOption('passed', item.status, 'Passed')}
              ${this.renderOption('failed', item.status, 'Failed')}
            </select>
          </div>
        </div>`;
      })
      .join('');

    const list = (items: string[], title: string) =>
      items.length === 0
        ? `<div class="pill pill-muted">None</div>`
        : items.map((t) => `<div class="pill">${this.escapeHtml(t)}</div>`).join('');

    const highlights = state.planHighlights
      .map((h) => `<div class="highlight"><div class="highlight-title">${this.escapeHtml(h.title)}</div><div class="highlight-body">${this.escapeHtml(h.details)}</div></div>`)
      .join('');

    const changeRequests = state.changeRequests.length
      ? state.changeRequests
          .map(
            (cr) => `<div class="change-card">
              <div class="change-title">${this.escapeHtml(cr.summary)}</div>
              ${cr.impact ? `<div class="change-impact">Impact: ${this.escapeHtml(cr.impact)}</div>` : ''}
            </div>`
          )
          .join('')
      : '<div class="muted">No change requests yet.</div>';

    const serverBadge = {
      running: 'badge-success',
      starting: 'badge-warn',
      stopped: 'badge-muted',
      error: 'badge-error',
    }[state.serverStatus];

    const serverLabel = state.serverStatus === 'running' ? 'Running' : state.serverStatus === 'starting' ? 'Starting' : state.serverStatus === 'error' ? 'Error' : 'Stopped';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Visual Verification</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .title {
      font-size: 16px;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success { background: var(--vscode-testing-iconPassed); color: #fff; }
    .badge-warn { background: var(--vscode-editorWarning-foreground); color: #fff; }
    .badge-error { background: var(--vscode-testing-iconFailed); color: #fff; }
    .badge-muted { background: var(--vscode-panel-border); color: var(--vscode-foreground); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 12px;
      background: var(--vscode-editor-background);
    }
    .card h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    .muted { color: var(--vscode-descriptionForeground); }
    .pill { display: inline-block; padding: 4px 8px; border-radius: 10px; border: 1px solid var(--vscode-panel-border); margin: 4px 4px 0 0; font-size: 12px; }
    .pill-muted { display: inline-block; padding: 4px 8px; border-radius: 10px; border: 1px dashed var(--vscode-panel-border); margin: 4px 4px 0 0; font-size: 12px; color: var(--vscode-descriptionForeground); }
    .checklist-item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--vscode-panel-border); padding: 8px 0; gap: 12px; }
    .checklist-item:last-child { border-bottom: none; }
    .clickable-item:hover { background-color: var(--vscode-list-hoverBackground); cursor: pointer; }
    .item-title { font-weight: 600; }
    .item-desc { color: var(--vscode-descriptionForeground); font-size: 12px; }
    .item-ref { color: var(--vscode-descriptionForeground); font-size: 11px; font-family: monospace; margin-top: 4px; }
    .nav-button { 
      background: var(--vscode-button-secondaryBackground); 
      color: var(--vscode-button-secondaryForeground); 
      border: none; 
      border-radius: 3px; 
      padding: 4px 8px; 
      cursor: pointer; 
      font-size: 14px;
    }
    .nav-button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .issue-button {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      padding: 4px 8px;
      cursor: pointer;
      font-size: 14px;
      border-radius: 3px;
      font-weight: 500;
    }
    .issue-button:hover { opacity: 0.8; }
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
    }
    .modal-content {
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      margin: 10% auto;
      padding: 20px;
      width: 80%;
      max-width: 600px;
      border-radius: 6px;
    }
    .modal-content h3 { margin-top: 0; color: var(--vscode-foreground); }
    .modal-content input,
    .modal-content textarea,
    .modal-content select {
      width: 100%;
      padding: 8px;
      margin: 8px 0;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
    }
    .modal-content textarea { min-height: 100px; resize: vertical; }
    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .modal-actions button { padding: 6px 14px; cursor: pointer; border-radius: 3px; font-size: 13px; }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
    }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    select { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 6px; border-radius: 4px; }
    .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    button { padding: 8px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; }
    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .highlight { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; margin-bottom: 8px; }
    .highlight-title { font-weight: 600; }
    .highlight-body { color: var(--vscode-descriptionForeground); font-size: 12px; }
    .change-card { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; margin-bottom: 8px; }
    .change-title { font-weight: 600; }
    .change-impact { color: var(--vscode-descriptionForeground); font-size: 12px; }
    textarea, input[type="text"] { width: 100%; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; padding: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Visual Verification: ${this.escapeHtml(state.taskTitle)}</div>
      <div class="muted">Task ${this.escapeHtml(state.taskId)} · Plan v${this.escapeHtml(state.planVersion)}</div>
    </div>
    <div>
      <span class="badge ${serverBadge}">${serverLabel}</span>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Server Controls</h3>
      <div class="muted">URL: ${this.escapeHtml(state.serverUrl)}</div>
      <div class="controls">
        <button data-action="startServer">Start</button>
        <button data-action="restartServer">Restart</button>
        <button data-action="stopServer" class="secondary">Stop</button>
      </div>
    </div>

    <div class="card">
      <h3>User Ready Gate</h3>
      <div class="muted">Visual verification requires user confirmation</div>
      <div class="controls">
        <button data-action="markReady" ${state.requiresUserReady ? '' : 'disabled'}>${state.requiresUserReady ? 'I\'m Ready' : 'Ready ✅'}</button>
      </div>
    </div>

    <div class="card">
      <h3>Plan Highlights</h3>
      ${highlights}
    </div>
  </div>

  <div class="card" style="margin-bottom:12px;">
    <h3>Checklist</h3>
    <div style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; color: var(--vscode-descriptionForeground);">
          ${stats.passed}/${stats.total} passed · ${stats.failed} failed · ${stats.pending} pending
        </span>
        <span style="font-size: 14px; font-weight: 600;">${stats.progress}%</span>
      </div>
      <div style="background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; overflow: hidden; height: 8px;">
        <div style="background: var(--vscode-progressBar-background); height: 100%; width: ${stats.progress}%; transition: width 0.3s ease;"></div>
      </div>
    </div>
    ${checklistHtml}
  </div>

  <div class="grid">
    <div class="card">
      <h3>Already Tested</h3>
      ${list(state.alreadyTested, 'Already Tested')}
    </div>
    <div class="card">
      <h3>Retest Required</h3>
      ${list(state.retestRequired, 'Retest Required')}
    </div>
    <div class="card">
      <h3>Not in Scope</h3>
      ${list(state.notInScope, 'Not In Scope')}
    </div>
  </div>

  <div class="card" style="margin-bottom:12px;">
    <h3>Found Issues</h3>
    <textarea id="issues" rows="3" placeholder="Describe issues found"></textarea>
    <div class="controls">
      <button data-action="submitIssues">Submit Issues</button>
    </div>
  </div>

  <div class="card">
    <h3>Change Request (Plan Adjustment)</h3>
    <input type="text" id="changeSummary" placeholder="I want to change..." />
    <textarea id="changeImpact" rows="2" placeholder="Impact (optional)"></textarea>
    <div class="controls">
      <button data-action="submitChangeRequest">Request Plan Adjustment</button>
    </div>
    <div class="muted" style="margin-top:8px;">Existing requests</div>
    ${changeRequests}
  </div>

  <!-- Issue Reporting Modal -->
  <div id="issueModal" class="modal">
    <div class="modal-content">
      <h3>Report Verification Issue</h3>
      <input type="text" id="issueTitle" placeholder="Issue title" />
      <textarea id="issueDescription" placeholder="Describe the issue in detail" rows="4"></textarea>
      <select id="issueSeverity">
        <option value="low">Low - Minor issue, cosmetic</option>
        <option value="medium" selected>Medium - Functionality affected</option>
        <option value="high">High - Critical feature broken</option>
        <option value="critical">Critical - System-wide failure</option>
      </select>
      <div class="modal-actions">
        <button class="btn-secondary" id="cancelIssue">Cancel</button>
        <button class="btn-primary" id="submitIssue">Create Task</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function send(command, payload={}) {
      vscode.postMessage({ command, ...payload });
    }

    let currentIssueItemId = null;

    document.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action === 'submitChangeRequest') {
          const summary = (document.getElementById('changeSummary') as HTMLInputElement).value;
          const impact = (document.getElementById('changeImpact') as HTMLTextAreaElement).value;
          send('submitChangeRequest', { summary, impact });
          return;
        }
        if (action === 'submitIssues') {
          const issues = (document.getElementById('issues') as HTMLTextAreaElement).value;
          send('submitIssues', { issues });
          return;
        }
        send(action);
      });
    });

    document.querySelectorAll('select[data-check-id]').forEach(sel => {
      sel.addEventListener('change', () => {
        const id = sel.getAttribute('data-check-id');
        const status = (sel as HTMLSelectElement).value;
        send('toggleChecklist', { id, status });
      });
    });

    document.querySelectorAll('button[data-navigate-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling
        const itemId = btn.getAttribute('data-navigate-id');
        send('navigateToPlan', { itemId });
      });
    });

    // Issue reporting modal handlers
    document.querySelectorAll('button[data-issue-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIssueItemId = btn.getAttribute('data-issue-id');
        document.getElementById('issueModal').style.display = 'block';
      });
    });

    document.getElementById('cancelIssue').addEventListener('click', () => {
      document.getElementById('issueModal').style.display = 'none';
      currentIssueItemId = null;
      document.getElementById('issueTitle').value = '';
      document.getElementById('issueDescription').value = '';
      document.getElementById('issueSeverity').value = 'medium';
    });

    document.getElementById('submitIssue').addEventListener('click', () => {
      const title = document.getElementById('issueTitle').value;
      const description = document.getElementById('issueDescription').value;
      const severity = document.getElementById('issueSeverity').value;

      if (!title || !description) {
        alert('Please fill in all fields');
        return;
      }

      send('reportIssue', {
        itemId: currentIssueItemId,
        issueData: { title, description, severity }
      });

      // Close modal and reset
      document.getElementById('issueModal').style.display = 'none';
      currentIssueItemId = null;
      document.getElementById('issueTitle').value = '';
      document.getElementById('issueDescription').value = '';
      document.getElementById('issueSeverity').value = 'medium';
    });
  </script>
</body>
</html>`;
  }

  private renderOption(value: ChecklistItem['status'], current: ChecklistItem['status'], label: string) {
    const selected = value === current ? 'selected' : '';
    return `<option value="${value}" ${selected}>${label}</option>`;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
  }

  public dispose() {
    VisualVerificationPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
