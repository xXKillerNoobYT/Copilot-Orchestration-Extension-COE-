/**
 * Dead Letter Queue Panel
 * 
 * Displays failed MCP messages with filtering, replay, and management capabilities.
 * Provides operational insights for debugging failed message handling.
 */

import * as vscode from 'vscode';
import * as Database from 'better-sqlite3';
import { DeadLetterQueueService, DeadLetterEntry } from '../services/deadLetterQueue';

export class DeadLetterQueuePanel {
  public static readonly viewType = 'deadLetterQueue';
  private static instance: DeadLetterQueuePanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private dlqService: DeadLetterQueueService | null = null;
  private entries: DeadLetterEntry[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, dlqService: DeadLetterQueueService) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.dlqService = dlqService;

    this.panel.onDidDispose(() => this.dispose(), null);
    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null
    );
  }

  /**
   * Create or show the dead letter queue panel
   */
  public static createOrShow(extensionUri: vscode.Uri, dlqService: DeadLetterQueueService): DeadLetterQueuePanel {
    const column = vscode.ViewColumn.Two;

    if (DeadLetterQueuePanel.instance) {
      DeadLetterQueuePanel.instance.panel.reveal(column);
      return DeadLetterQueuePanel.instance;
    }

    const panel = vscode.window.createWebviewPanel(
      DeadLetterQueuePanel.viewType,
      '💀 Dead Letter Queue',
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    DeadLetterQueuePanel.instance = new DeadLetterQueuePanel(panel, extensionUri, dlqService);
    DeadLetterQueuePanel.instance.update();
    return DeadLetterQueuePanel.instance;
  }

  /**
   * Update the panel with latest entries
   */
  public async update(filters?: { status?: string; handlerName?: string; messageType?: string }): Promise<void> {
    if (!this.dlqService) {
      this.panel.webview.html = this.getErrorHtml(new Error('Dead Letter Queue service not initialized'));
      return;
    }

    try {
      this.entries = await this.dlqService.getEntries(filters);
      this.panel.webview.html = this.getHtmlContent();
    } catch (error) {
      console.error('Failed to load dead letter queue entries:', error);
      this.panel.webview.html = this.getErrorHtml(error);
    }
  }

  /**
   * Handle messages from the webview
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      switch (message.command) {
        case 'refresh':
          await this.update(message.filters);
          break;
        case 'replay':
          await this.replayMessage(message.entryId);
          break;
        case 'archive':
          await this.archiveOldEntries(message.days || 7);
          break;
        case 'delete':
          await this.deleteArchivedEntries(message.days || 30);
          break;
        case 'export':
          await this.exportEntries(message.format || 'json');
          break;
        case 'filter':
          await this.update(message.filters);
          break;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Dead Letter Queue Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Replay a failed message
   */
  private async replayMessage(entryId: string): Promise<void> {
    if (!this.dlqService) {
      return;
    }

    try {
      await this.dlqService.replayMessage(entryId);
      vscode.window.showInformationMessage(`Message ${entryId} marked for replay`);
      await this.update();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to replay message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Archive old entries
   */
  private async archiveOldEntries(days: number): Promise<void> {
    if (!this.dlqService) {
      return;
    }

    try {
      const archived = await this.dlqService.archiveOldEntries(days);
      vscode.window.showInformationMessage(`Archived ${archived} entries older than ${days} days`);
      await this.update();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to archive entries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete archived entries
   */
  private async deleteArchivedEntries(days: number): Promise<void> {
    if (!this.dlqService) {
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Delete archived entries older than ${days} days?`,
      { modal: true },
      'Delete'
    );

    if (confirm !== 'Delete') {
      return;
    }

    try {
      const deleted = await this.dlqService.deleteArchivedEntries(days);
      vscode.window.showInformationMessage(`Deleted ${deleted} archived entries`);
      await this.update();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete entries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export entries to file
   */
  private async exportEntries(format: 'json' | 'csv'): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`dead-letter-queue-${Date.now()}.${format}`),
      filters: format === 'json' 
        ? { 'JSON Files': ['json'] }
        : { 'CSV Files': ['csv'] }
    });

    if (!uri) {
      return;
    }

    try {
      let content: string;
      
      if (format === 'json') {
        content = JSON.stringify(this.entries, null, 2);
      } else {
        // CSV format
        const headers = ['ID', 'Message ID', 'Type', 'Handler', 'Error', 'Retry Count', 'Status', 'Created At'];
        const rows = this.entries.map(entry => [
          entry.id,
          entry.messageId,
          entry.messageType,
          entry.handlerName || '',
          entry.errorMessage,
          entry.retryCount.toString(),
          entry.status,
          entry.firstFailedAt.toISOString()
        ]);
        
        content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      }

      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
      vscode.window.showInformationMessage(`Exported ${this.entries.length} entries to ${uri.fsPath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get HTML content for the panel
   */
  private getHtmlContent(): string {
    const statusCounts = this.entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dead Letter Queue</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
          }
          .stat-card {
            flex: 1;
            padding: 15px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .stat-label {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
          }
          .filters {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
          }
          .filters select, .filters input {
            padding: 5px 10px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
          }
          .actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
          }
          button {
            padding: 6px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
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
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          th {
            font-weight: 600;
            background: var(--vscode-editor-inactiveSelectionBackground);
          }
          tr:hover {
            background: var(--vscode-list-hoverBackground);
          }
          .status-badge {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
          }
          .status-failed { background: #f48771; color: #000; }
          .status-retrying { background: #f6c177; color: #000; }
          .status-archived { background: #b4befe; color: #000; }
          .status-replayed { background: #a6da95; color: #000; }
          .error-message {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💀 Dead Letter Queue</h1>
          <button onclick="refresh()">🔄 Refresh</button>
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${this.entries.length}</div>
            <div class="stat-label">Total Entries</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${statusCounts.failed || 0}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${statusCounts.archived || 0}</div>
            <div class="stat-label">Archived</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${statusCounts.replayed || 0}</div>
            <div class="stat-label">Replayed</div>
          </div>
        </div>

        <div class="filters">
          <select id="statusFilter" onchange="applyFilters()">
            <option value="">All Statuses</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
            <option value="archived">Archived</option>
            <option value="replayed">Replayed</option>
          </select>
          <select id="handlerFilter" onchange="applyFilters()">
            <option value="">All Handlers</option>
            ${this.getUniqueHandlers().map(h => `<option value="${h}">${h}</option>`).join('')}
          </select>
          <select id="typeFilter" onchange="applyFilters()">
            <option value="">All Types</option>
            ${this.getUniqueTypes().map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>

        <div class="actions">
          <button onclick="archiveOld()">📦 Archive Old (7d)</button>
          <button onclick="deleteArchived()" class="secondary">🗑️ Delete Archived (30d)</button>
          <button onclick="exportJSON()">📥 Export JSON</button>
          <button onclick="exportCSV()">📊 Export CSV</button>
        </div>

        ${this.entries.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Message ID</th>
                <th>Type</th>
                <th>Handler</th>
                <th>Error</th>
                <th>Retries</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.entries.map(entry => `
                <tr>
                  <td><code>${entry.messageId}</code></td>
                  <td>${entry.messageType}</td>
                  <td>${entry.handlerName || '-'}</td>
                  <td class="error-message" title="${entry.errorMessage}">${entry.errorMessage}</td>
                  <td>${entry.retryCount}</td>
                  <td><span class="status-badge status-${entry.status}">${entry.status}</span></td>
                  <td>${new Date(entry.firstFailedAt).toLocaleString()}</td>
                  <td>
                    ${entry.status === 'failed' ? `<button onclick="replay('${entry.id}')">▶️ Replay</button>` : '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">
            <h2>✅ No Failed Messages</h2>
            <p>The dead letter queue is empty. All messages are being processed successfully!</p>
          </div>
        `}

        <script>
          const vscode = acquireVsCodeApi();

          function refresh() {
            vscode.postMessage({ command: 'refresh' });
          }

          function applyFilters() {
            const status = document.getElementById('statusFilter').value;
            const handlerName = document.getElementById('handlerFilter').value;
            const messageType = document.getElementById('typeFilter').value;
            
            vscode.postMessage({
              command: 'filter',
              filters: {
                status: status || undefined,
                handlerName: handlerName || undefined,
                messageType: messageType || undefined
              }
            });
          }

          function replay(entryId) {
            vscode.postMessage({ command: 'replay', entryId });
          }

          function archiveOld() {
            vscode.postMessage({ command: 'archive', days: 7 });
          }

          function deleteArchived() {
            vscode.postMessage({ command: 'delete', days: 30 });
          }

          function exportJSON() {
            vscode.postMessage({ command: 'export', format: 'json' });
          }

          function exportCSV() {
            vscode.postMessage({ command: 'export', format: 'csv' });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Get unique handler names from entries
   */
  private getUniqueHandlers(): string[] {
    const handlers = new Set(this.entries.map(e => e.handlerName).filter(h => h !== null && h !== undefined));
    return Array.from(handlers) as string[];
  }

  /**
   * Get unique message types from entries
   */
  private getUniqueTypes(): string[] {
    const types = new Set(this.entries.map(e => e.messageType));
    return Array.from(types);
  }

  /**
   * Get error HTML
   */
  private getErrorHtml(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 40px;
            text-align: center;
            color: var(--vscode-foreground);
          }
          .error {
            color: var(--vscode-errorForeground);
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>⚠️ Error</h1>
        <div class="error">${errorMessage}</div>
      </body>
      </html>
    `;
  }

  /**
   * Dispose of the panel
   */
  private dispose(): void {
    DeadLetterQueuePanel.instance = undefined;
    this.panel.dispose();
  }
}
