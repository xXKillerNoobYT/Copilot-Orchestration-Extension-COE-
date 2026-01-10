import * as vscode from 'vscode';
import { MCPClient, MCPWebSocketListener } from '../services/mcpClient';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'passed' | 'failed';
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
  }

  private updateState(patch: Partial<VerificationState>) {
    this.state = { ...this.state, ...patch };
    this.updatePanel();
  }

  private updatePanel() {
    this.panel.webview.html = this.renderHtml(this.state);
  }

  private renderHtml(state: VerificationState): string {
    const checklistHtml = state.checklist
      .map((item) => {
        return `<div class="checklist-item">
          <div>
            <div class="item-title">${this.escapeHtml(item.title)}</div>
            <div class="item-desc">${this.escapeHtml(item.description ?? '')}</div>
          </div>
          <select data-check-id="${item.id}">
            ${this.renderOption('pending', item.status, 'Pending')}
            ${this.renderOption('in-progress', item.status, 'In Progress')}
            ${this.renderOption('passed', item.status, 'Passed')}
            ${this.renderOption('failed', item.status, 'Failed')}
          </select>
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
    .item-title { font-weight: 600; }
    .item-desc { color: var(--vscode-descriptionForeground); font-size: 12px; }
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

  <script>
    const vscode = acquireVsCodeApi();

    function send(command, payload={}) {
      vscode.postMessage({ command, ...payload });
    }

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
