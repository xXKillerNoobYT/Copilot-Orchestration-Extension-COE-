/**
 * Notification Service for Task Decomposition and other user alerts
 * Provides toast/modal UI for decomposition summaries with Accept/Reject/Edit actions
 */

import * as vscode from 'vscode';

export interface DecompositionNotification {
    originalTaskId: string;
    originalTaskTitle: string;
    subtaskCount: number;
    subtasks: Array<{
        title: string;
        estimated_effort: number; // minutes
        type: string;
        priority: string;
    }>;
    impact: {
        timeline_change_minutes: number;
        parallel_opportunities: string[];
    };
}

export interface NotificationAction {
    label: string;
    callback: () => Promise<void> | void;
}

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

/**
 * Notification Service
 */
export class NotificationService {
    private static instance: NotificationService;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('COE Notifications');
    }

    /**
     * Get singleton instance
     */
    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Show a decomposition summary notification with actions
     */
    async showDecompositionSummary(
        notification: DecompositionNotification
    ): Promise<'accept' | 'reject' | 'edit' | 'dismiss'> {
        const { originalTaskTitle, subtaskCount, subtasks, impact } = notification;

        // Build notification message
        const timelineChange = impact.timeline_change_minutes;
        const timelineMessage =
            timelineChange > 0
                ? `+${timelineChange} min (more detail added)`
                : timelineChange < 0
                    ? `${timelineChange} min (optimized)`
                    : 'No change';

        const message = `✨ Task Decomposition: "${originalTaskTitle}" → ${subtaskCount} subtasks\n` +
            `Timeline Impact: ${timelineMessage}\n` +
            `Parallel Opportunities: ${impact.parallel_opportunities.length || 0}`;

        // Show quick pick with actions
        const action = await vscode.window.showInformationMessage(
            message,
            { modal: false },
            'Accept',
            'Reject',
            'Edit',
            'View Details'
        );

        // Log to output channel
        this.logDecomposition(notification);

        if (action === 'View Details') {
            await this.showDecompositionDetailsPanel(notification);
            return 'accept'; // Default to accept after viewing
        }

        switch (action) {
            case 'Accept':
                return 'accept';
            case 'Reject':
                return 'reject';
            case 'Edit':
                return 'edit';
            default:
                return 'dismiss';
        }
    }

    /**
     * Show detailed decomposition panel in webview
     */
    private async showDecompositionDetailsPanel(
        notification: DecompositionNotification
    ): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'coeDecompositionDetails',
            `Decomposition: ${notification.originalTaskTitle}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        panel.webview.html = this.getDecompositionDetailsHtml(notification);

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case 'accept':
                    case 'reject':
                    case 'edit':
                        panel.dispose();
                        break;
                }
            },
            undefined,
            []
        );
    }

    /**
     * Generate HTML for decomposition details panel
     */
    private getDecompositionDetailsHtml(notification: DecompositionNotification): string {
        const { originalTaskTitle, subtaskCount, subtasks, impact } = notification;

        const subtasksHtml = subtasks
            .map(
                (subtask, index) => `
      <div class="subtask">
        <div class="subtask-header">
          <span class="subtask-number">${index + 1}</span>
          <strong>${subtask.title}</strong>
        </div>
        <div class="subtask-meta">
          <span class="badge">${subtask.type}</span>
          <span class="badge priority-${subtask.priority}">${subtask.priority}</span>
          <span class="effort">${subtask.estimated_effort} min</span>
        </div>
      </div>
    `
            )
            .join('');

        const parallelsHtml = impact.parallel_opportunities
            .map((opp) => `<li>${opp}</li>`)
            .join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Decomposition Details</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.6;
    }
    h1, h2, h3 {
      color: var(--vscode-editor-foreground);
      margin-top: 0;
    }
    .header {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .summary {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-left: 4px solid var(--vscode-button-background);
      padding: 12px 16px;
      margin-bottom: 24px;
      border-radius: 4px;
    }
    .subtask {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .subtask-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .subtask-number {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 12px;
      font-weight: bold;
      flex-shrink: 0;
    }
    .subtask-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
    }
    .badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      text-transform: uppercase;
    }
    .priority-high { background: #f14c4c; color: white; }
    .priority-medium { background: #ff8c00; color: white; }
    .priority-low { background: #73c991; color: white; }
    .effort {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      margin-left: auto;
    }
    .parallel {
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid var(--vscode-textLink-foreground);
      padding: 12px;
      margin-top: 16px;
      border-radius: 4px;
    }
    .parallel ul {
      margin: 8px 0 0 0;
      padding-left: 24px;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔀 Task Decomposition</h1>
    <p style="color: var(--vscode-descriptionForeground); margin: 4px 0 0 0;">
      ${originalTaskTitle}
    </p>
  </div>

  <div class="summary">
    <h3 style="margin: 0 0 8px 0;">Summary</h3>
    <p style="margin: 0;">
      <strong>${subtaskCount} subtasks</strong> generated<br>
      <span style="color: var(--vscode-descriptionForeground);">
        Timeline Impact: ${impact.timeline_change_minutes} minutes
      </span>
    </p>
  </div>

  <h2>Subtasks</h2>
  ${subtasksHtml}

  ${impact.parallel_opportunities.length > 0
                ? `
  <div class="parallel">
    <h3 style="margin-top: 0;">⚡ Parallel Opportunities</h3>
    <ul>${parallelsHtml}</ul>
  </div>
  `
                : ''
            }

  <div class="actions">
    <button onclick="sendMessage('accept')">✓ Accept</button>
    <button class="secondary" onclick="sendMessage('edit')">✎ Edit</button>
    <button class="secondary" onclick="sendMessage('reject')">✗ Reject</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function sendMessage(command) {
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
    }

    /**
     * Log decomposition to output channel
     */
    private logDecomposition(notification: DecompositionNotification): void {
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('='.repeat(60));
        this.outputChannel.appendLine(`[${new Date().toISOString()}] Task Decomposition`);
        this.outputChannel.appendLine('='.repeat(60));
        this.outputChannel.appendLine(`Original Task: ${notification.originalTaskTitle}`);
        this.outputChannel.appendLine(`Subtasks: ${notification.subtaskCount}`);
        this.outputChannel.appendLine('');
        notification.subtasks.forEach((subtask, index) => {
            this.outputChannel.appendLine(
                `  ${index + 1}. ${subtask.title} (${subtask.estimated_effort}min, ${subtask.priority})`
            );
        });
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine(
            `Timeline Impact: ${notification.impact.timeline_change_minutes} minutes`
        );
        if (notification.impact.parallel_opportunities.length > 0) {
            this.outputChannel.appendLine('Parallel Opportunities:');
            notification.impact.parallel_opportunities.forEach((opp) => {
                this.outputChannel.appendLine(`  - ${opp}`);
            });
        }
        this.outputChannel.appendLine('='.repeat(60));
    }

    /**
     * Show a simple notification
     */
    async showNotification(
        message: string,
        level: NotificationLevel = 'info',
        actions?: NotificationAction[]
    ): Promise<string | undefined> {
        const showFn = {
            info: vscode.window.showInformationMessage,
            warning: vscode.window.showWarningMessage,
            error: vscode.window.showErrorMessage,
            success: vscode.window.showInformationMessage,
        }[level];

        const actionLabels = actions?.map((a) => a.label) || [];
        const result = await showFn(message, ...actionLabels);

        if (result && actions) {
            const selectedAction = actions.find((a) => a.label === result);
            if (selectedAction) {
                await selectedAction.callback();
            }
        }

        return result;
    }

    /**
     * Show output channel
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}
