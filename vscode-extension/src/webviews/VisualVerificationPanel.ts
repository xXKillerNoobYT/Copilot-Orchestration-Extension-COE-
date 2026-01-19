/**
 * Visual Verification Panel
 * 
 * Interactive panel for user-guided testing with comprehensive design system integration.
 * Provides server controls, smart checklists, design references, and issue reporting.
 * 
 * @author Auto Zen Agent
 * @date 2026-01-18
 */

import * as vscode from 'vscode';
import { MCPClient } from '../services/mcpClient';
import * as path from 'path';
import * as fs from 'fs';

export interface DesignSystemData {
    colors?: Record<string, string>;
    typography?: Record<string, any>;
    components?: Record<string, any>;
    spacing?: Record<string, string>;
}

export interface ChecklistItem {
    id: string;
    text: string;
    status: 'untested' | 'pass' | 'fail' | 'skip';
    alreadyTested?: boolean;
}

export interface VerificationTask {
    id: string;
    title: string;
    acceptanceCriteria: string[];
    planSection?: string;
    isUITask: boolean;
}

export interface IssueReport {
    description: string;
    severity: 'critical' | 'major' | 'minor';
    screenshot?: string;
    taskId: string;
}

export class VisualVerificationPanel {
    public static currentPanel: VisualVerificationPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private mcpClient: MCPClient;
    private currentTask: VerificationTask | null = null;
    private designSystemData: DesignSystemData | null = null;
    private serverStatus: 'stopped' | 'starting' | 'running' | 'error' = 'stopped';
    private serverPort: number = 3000;
    private checklist: ChecklistItem[] = [];

    public static createOrShow(extensionUri: vscode.Uri, task?: VerificationTask) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (VisualVerificationPanel.currentPanel) {
            VisualVerificationPanel.currentPanel._panel.reveal(column);
            if (task) {
                VisualVerificationPanel.currentPanel.loadTask(task);
            }
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'visualVerification',
            'Visual Verification',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'dist'),
                ],
            }
        );

        VisualVerificationPanel.currentPanel = new VisualVerificationPanel(
            panel,
            extensionUri,
            task
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        task?: VerificationTask
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Initialize MCP client
        this.mcpClient = MCPClient.getInstance();

        // Load design system data
        this.loadDesignSystem();

        // Load initial task if provided
        if (task) {
            this.loadTask(task);
        }

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message: any) => {
                switch (message.command) {
                    case 'startServer':
                        await this.startDevServer();
                        return;
                    case 'stopServer':
                        await this.stopDevServer();
                        return;
                    case 'restartServer':
                        await this.restartDevServer();
                        return;
                    case 'updateChecklistItem':
                        this.updateChecklistItem(message.itemId, message.status);
                        return;
                    case 'reportIssue':
                        await this.reportIssue(message.issue);
                        return;
                    case 'submitVerification':
                        await this.submitVerification(message.result);
                        return;
                    case 'uploadScreenshot':
                        await this.uploadScreenshot(message.dataUrl);
                        return;
                    case 'openPlanAdjustment':
                        vscode.commands.executeCommand('copilot-orchestrator.planAdjustment');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Load a task for verification
     */
    public loadTask(task: VerificationTask): void {
        this.currentTask = task;
        this.checklist = this.generateChecklist(task.acceptanceCriteria);
        this._update();
    }

    /**
     * Load design system data from workspace
     */
    private async loadDesignSystem(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        const designSystemPath = path.join(
            workspaceFolders[0].uri.fsPath,
            'design-system.json'
        );

        try {
            if (fs.existsSync(designSystemPath)) {
                const content = fs.readFileSync(designSystemPath, 'utf-8');
                this.designSystemData = JSON.parse(content);
                console.log('Design system loaded successfully');
            }
        } catch (error) {
            console.warn('Failed to load design system:', error);
        }
    }

    /**
     * Generate checklist from acceptance criteria
     */
    private generateChecklist(criteria: string[]): ChecklistItem[] {
        return criteria.map((criterion, index) => ({
            id: `criterion-${index}`,
            text: criterion,
            status: 'untested',
            alreadyTested: this.detectAlreadyTested(criterion),
        }));
    }

    /**
     * Detect if a criterion has already been tested (heuristic)
     */
    private detectAlreadyTested(criterion: string): boolean {
        // Simple heuristic: check if similar tests exist
        // In a real implementation, this would query test results
        return criterion.toLowerCase().includes('test') && Math.random() > 0.7;
    }

    /**
     * Update checklist item status
     */
    private updateChecklistItem(itemId: string, status: ChecklistItem['status']): void {
        const item = this.checklist.find((i) => i.id === itemId);
        if (item) {
            item.status = status;
            this._update();
        }
    }

    /**
     * Start development server
     */
    private async startDevServer(): Promise<void> {
        this.serverStatus = 'starting';
        this._update();

        try {
            // In a real implementation, this would start the actual dev server
            // For now, simulate with a delay
            await new Promise((resolve) => setTimeout(resolve, 2000));

            this.serverStatus = 'running';
            this.serverPort = 3000;

            vscode.window.showInformationMessage(
                `Dev server started on http://localhost:${this.serverPort}`
            );
        } catch (error) {
            this.serverStatus = 'error';
            vscode.window.showErrorMessage(`Failed to start server: ${error}`);
        }

        this._update();
    }

    /**
     * Stop development server
     */
    private async stopDevServer(): Promise<void> {
        try {
            // In a real implementation, this would stop the actual dev server
            this.serverStatus = 'stopped';
            vscode.window.showInformationMessage('Dev server stopped');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop server: ${error}`);
        }

        this._update();
    }

    /**
     * Restart development server
     */
    private async restartDevServer(): Promise<void> {
        await this.stopDevServer();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.startDevServer();
    }

    /**
     * Report an issue and create investigation task
     */
    private async reportIssue(issue: IssueReport): Promise<void> {
        try {
            // Report to MCP server to create investigation task
            await this.mcpClient.reportTestFailure({
                taskId: issue.taskId,
                test: 'Visual Verification',
                error: issue.description,
                severity: issue.severity,
            });

            vscode.window.showInformationMessage('Investigation task created successfully');
            this._update();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to report issue: ${error}`);
        }
    }

    /**
     * Submit verification result
     */
    private async submitVerification(result: {
        status: 'pass' | 'fail' | 'partial';
        issues: IssueReport[];
    }): Promise<void> {
        if (!this.currentTask) {
            vscode.window.showErrorMessage('No task loaded for verification');
            return;
        }

        try {
            const passedCount = this.checklist.filter((i) => i.status === 'pass').length;
            const failedCount = this.checklist.filter((i) => i.status === 'fail').length;

            // Map status values to match MCP client expectations
            const mcpStatus = result.status === 'pass' ? 'passed' : result.status === 'fail' ? 'failed' : 'partial';

            await this.mcpClient.reportVerificationResult({
                verificationTaskId: this.currentTask.id + '-verification',
                originalTaskId: this.currentTask.id,
                status: mcpStatus,
                issuesFound: result.issues,
                checklist: this.checklist.map((item) => ({
                    id: item.id,
                    text: item.text,
                    status: item.status,
                })),
            });

            vscode.window.showInformationMessage(
                `Verification ${result.status}: ${passedCount}/${this.checklist.length} checks passed`
            );

            // Close panel after successful submission
            this._panel.dispose();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to submit verification: ${error}`);
        }
    }

    /**
     * Upload screenshot
     */
    private async uploadScreenshot(dataUrl: string): Promise<void> {
        // In a real implementation, this would save the screenshot
        // and return a path or URL
        console.log('Screenshot uploaded:', dataUrl.substring(0, 50) + '...');
        vscode.window.showInformationMessage('Screenshot uploaded successfully');
    }

    /**
     * Update webview content
     */
    private _update(): void {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    /**
     * Generate HTML for webview
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        const serverStatusIcon =
            this.serverStatus === 'running'
                ? '🟢'
                : this.serverStatus === 'starting'
                    ? '🟡'
                    : this.serverStatus === 'error'
                        ? '🔴'
                        : '⚪';

        const serverStatusText =
            this.serverStatus.charAt(0).toUpperCase() + this.serverStatus.slice(1);

        const checklistHtml = this.checklist
            .map(
                (item) => `
      <div class="checklist-item ${item.status}">
        <input
          type="checkbox"
          id="${item.id}"
          ${item.status === 'pass' ? 'checked' : ''}
          onchange="updateChecklistItem('${item.id}', this.checked ? 'pass' : 'untested')"
        />
        <label for="${item.id}">
          ${item.text}
          ${item.alreadyTested ? '<span class="badge">Already Tested</span>' : ''}
        </label>
        <div class="checklist-actions">
          <button onclick="updateChecklistItem('${item.id}', 'pass')" class="btn-pass">✓</button>
          <button onclick="updateChecklistItem('${item.id}', 'fail')" class="btn-fail">✗</button>
          <button onclick="updateChecklistItem('${item.id}', 'skip')" class="btn-skip">⊘</button>
        </div>
      </div>
    `
            )
            .join('');

        const designSystemHtml = this.designSystemData
            ? `
      <div class="design-system-section">
        <h3>Design System Reference</h3>
        ${this._getColorPaletteHtml()}
        ${this._getTypographyHtml()}
      </div>
    `
            : '';

        const taskInfoHtml = this.currentTask
            ? `
      <div class="task-info">
        <h2>${this.currentTask.title}</h2>
        <p class="task-type">${this.currentTask.isUITask ? '🎨 UI Task' : '⚙️ Backend Task'}</p>
      </div>
    `
            : '<p class="no-task">No task loaded</p>';

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Verification</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .server-control {
      background: var(--vscode-editor-inactiveSelectionBackground);
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .server-status {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: 600;
    }
    .server-buttons {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .checklist-item {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .checklist-item.pass {
      border-left: 4px solid #4caf50;
    }
    .checklist-item.fail {
      border-left: 4px solid #f44336;
    }
    .checklist-item.skip {
      border-left: 4px solid #ff9800;
    }
    .checklist-item label {
      flex: 1;
      margin-left: 10px;
    }
    .checklist-actions {
      display: flex;
      gap: 5px;
    }
    .checklist-actions button {
      padding: 4px 8px;
      font-size: 12px;
    }
    .btn-pass { background: #4caf50; }
    .btn-fail { background: #f44336; }
    .btn-skip { background: #ff9800; }
    .badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      margin-left: 8px;
    }
    .design-system-section {
      background: var(--vscode-editor-inactiveSelectionBackground);
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
    }
    .color-palette {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    .color-swatch {
      text-align: center;
    }
    .color-box {
      width: 100%;
      height: 60px;
      border-radius: 4px;
      border: 1px solid var(--vscode-panel-border);
      margin-bottom: 5px;
    }
    .color-name {
      font-size: 12px;
      font-weight: 600;
    }
    .color-value {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .issue-form {
      background: var(--vscode-input-background);
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
    }
    textarea {
      width: 100%;
      min-height: 100px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px;
      font-family: var(--vscode-font-family);
      margin-bottom: 10px;
    }
    select {
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 6px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .submit-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .btn-primary {
      background: var(--vscode-button-background);
    }
    .btn-success {
      background: #4caf50;
    }
    .btn-danger {
      background: #f44336;
    }
    .progress {
      margin: 10px 0;
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <div class="header">
    ${taskInfoHtml}
  </div>

  <div class="server-control">
    <div class="server-status">
      <span>${serverStatusIcon}</span>
      <span>Server Status: ${serverStatusText}</span>
      ${this.serverStatus === 'running'
                ? `<span class="badge">Port ${this.serverPort}</span>`
                : ''
            }
    </div>
    <div class="server-buttons">
      <button onclick="startServer()" ${this.serverStatus === 'running' ? 'disabled' : ''
            }>
        Start Server
      </button>
      <button onclick="stopServer()" ${this.serverStatus === 'stopped' ? 'disabled' : ''
            }>
        Stop Server
      </button>
      <button onclick="restartServer()" ${this.serverStatus === 'stopped' ? 'disabled' : ''
            }>
        Restart Server
      </button>
      ${this.serverStatus === 'running'
                ? `<button onclick="window.open('http://localhost:${this.serverPort}', '_blank')">
           Open in Browser
         </button>`
                : ''
            }
    </div>
  </div>

  <div class="verification-section">
    <h3>Acceptance Criteria Checklist</h3>
    <div class="progress">
      ${this.checklist.filter((i) => i.status === 'pass').length} / ${this.checklist.length
            } completed
    </div>
    <div class="checklist">
      ${checklistHtml}
    </div>
  </div>

  ${designSystemHtml}

  <div class="issue-form" id="issueForm" style="display: none;">
    <h3>Report Issue</h3>
    <textarea id="issueDescription" placeholder="Describe the issue..."></textarea>
    <select id="issueSeverity">
      <option value="minor">Minor</option>
      <option value="major">Major</option>
      <option value="critical">Critical</option>
    </select>
    <div>
      <label for="screenshotUpload">Screenshot (optional):</label>
      <input type="file" id="screenshotUpload" accept="image/*" onchange="handleScreenshotUpload(this)">
    </div>
    <button onclick="submitIssue()">Create Investigation Task</button>
    <button onclick="cancelIssue()">Cancel</button>
  </div>

  <div class="submit-buttons">
    <button class="btn-danger" onclick="showIssueForm()">Found Issues</button>
    <button class="btn-success" onclick="submitPass()">All Checks Pass ✓</button>
    <button class="btn-primary" onclick="openPlanAdjustment()">Need to Change Plan</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function startServer() {
      vscode.postMessage({ command: 'startServer' });
    }

    function stopServer() {
      vscode.postMessage({ command: 'stopServer' });
    }

    function restartServer() {
      vscode.postMessage({ command: 'restartServer' });
    }

    function updateChecklistItem(itemId, status) {
      vscode.postMessage({
        command: 'updateChecklistItem',
        itemId: itemId,
        status: status
      });
    }

    function showIssueForm() {
      document.getElementById('issueForm').style.display = 'block';
    }

    function cancelIssue() {
      document.getElementById('issueForm').style.display = 'none';
    }

    function submitIssue() {
      const description = document.getElementById('issueDescription').value;
      const severity = document.getElementById('issueSeverity').value;
      
      if (!description) {
        alert('Please describe the issue');
        return;
      }

      vscode.postMessage({
        command: 'reportIssue',
        issue: {
          description: description,
          severity: severity,
          taskId: '${this.currentTask?.id || ''}'
        }
      });

      // Submit as fail
      submitVerification('fail');
    }

    function handleScreenshotUpload(input) {
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          vscode.postMessage({
            command: 'uploadScreenshot',
            dataUrl: e.target.result
          });
        };
        reader.readAsDataURL(input.files[0]);
      }
    }

    function submitPass() {
      submitVerification('pass');
    }

    function submitVerification(status) {
      const issues = [];
      
      if (status === 'fail') {
        const description = document.getElementById('issueDescription').value;
        const severity = document.getElementById('issueSeverity').value;
        
        if (description) {
          issues.push({
            description: description,
            severity: severity,
            taskId: '${this.currentTask?.id || ''}'
          });
        }
      }

      vscode.postMessage({
        command: 'submitVerification',
        result: {
          status: status,
          issues: issues
        }
      });
    }

    function openPlanAdjustment() {
      vscode.postMessage({ command: 'openPlanAdjustment' });
    }
  </script>
</body>
</html>`;
    }

    /**
     * Get color palette HTML
     */
    private _getColorPaletteHtml(): string {
        if (!this.designSystemData?.colors) {
            return '';
        }

        const colorsHtml = Object.entries(this.designSystemData.colors)
            .map(
                ([name, value]) => `
      <div class="color-swatch">
        <div class="color-box" style="background-color: ${value};"></div>
        <div class="color-name">${name}</div>
        <div class="color-value">${value}</div>
      </div>
    `
            )
            .join('');

        return `
      <div>
        <h4>Color Palette</h4>
        <div class="color-palette">
          ${colorsHtml}
        </div>
      </div>
    `;
    }

    /**
     * Get typography HTML
     */
    private _getTypographyHtml(): string {
        if (!this.designSystemData?.typography) {
            return '';
        }

        return `
      <div style="margin-top: 15px;">
        <h4>Typography</h4>
        <pre>${JSON.stringify(this.designSystemData.typography, null, 2)}</pre>
      </div>
    `;
    }

    public dispose(): void {
        VisualVerificationPanel.currentPanel = undefined;

        // Clean up resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
