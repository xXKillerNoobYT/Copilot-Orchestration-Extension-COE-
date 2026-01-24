/**
 * LLM Response Panel
 * Displays LLM execution results with syntax highlighting and history
 */

import * as vscode from 'vscode';

export interface ExecutionResult {
  taskId: string;
  taskTitle: string;
  agentName: string;
  timestamp: string;
  duration: number;
  success: boolean;
  message: string;
  response?: string;
  error?: string;
}

export class LLMResponsePanel {
  public static currentPanel: LLMResponsePanel | undefined;
  public readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private executionHistory: ExecutionResult[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this.updatePanel();
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    if (LLMResponsePanel.currentPanel) {
      LLMResponsePanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      return LLMResponsePanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'llmResponsePanel',
      'LLM Responses',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        enableFindWidget: true,
        retainContextWhenHidden: true,
      }
    );

    const llmPanel = new LLMResponsePanel(panel);
    LLMResponsePanel.currentPanel = llmPanel;
    llmPanel.updatePanel();
    return llmPanel;
  }

  /**
   * Add an execution result to the panel
   */
  public addResult(result: ExecutionResult) {
    this.executionHistory.unshift(result);
    // Keep only last 50 results
    if (this.executionHistory.length > 50) {
      this.executionHistory = this.executionHistory.slice(0, 50);
    }
    this.updatePanel();
  }

  /**
   * Clear all history
   */
  public clearHistory() {
    this.executionHistory = [];
    this.updatePanel();
  }

  /**
   * Get the execution history
   */
  public getHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  private updatePanel() {
    const webview = this._panel.webview;
    this._panel.webview.html = this.getHtmlContent();
  }

  private getHtmlContent(): string {
    const resultsHtml = this.executionHistory.length === 0
      ? '<div class="no-results">No execution history yet</div>'
      : this.executionHistory.map((result, index) => this.renderResult(result, index)).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Responses</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 16px;
            overflow-y: auto;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 12px;
        }

        .header h1 {
            font-size: 18px;
            font-weight: 600;
        }

        .header-controls {
            display: flex;
            gap: 8px;
        }

        .btn {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .results {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .result-item {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .result-header {
            padding: 12px;
            background-color: var(--vscode-tab-inactiveBackground);
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .result-title {
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 14px;
        }

        .result-meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
        }

        .result-meta-item {
            display: flex;
            gap: 4px;
        }

        .result-meta-label {
            font-weight: 500;
            color: var(--vscode-textBlockQuote-border);
        }

        .status-badge {
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
        }

        .status-success {
            background-color: rgba(76, 175, 80, 0.2);
            color: #4caf50;
            border: 1px solid #4caf50;
        }

        .status-error {
            background-color: rgba(244, 67, 54, 0.2);
            color: #f44336;
            border: 1px solid #f44336;
        }

        .result-content {
            padding: 12px;
            max-height: 400px;
            overflow-y: auto;
        }

        .result-response {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 3px;
            padding: 8px;
            margin-bottom: 8px;
            white-space: pre-wrap;
            word-break: break-word;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: var(--vscode-editor-foreground);
        }

        .result-error {
            background-color: rgba(244, 67, 54, 0.1);
            border: 1px solid #f44336;
            border-radius: 3px;
            padding: 8px;
            color: #f44336;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .no-results {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

        .copy-btn {
            padding: 4px 8px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            margin-left: 8px;
        }

        .copy-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>LLM Execution Results</h1>
            <div class="header-controls">
                <button class="btn" onclick="clearHistory()">Clear History</button>
            </div>
        </div>
        <div class="results">
            ${resultsHtml}
        </div>
    </div>

    <script>
        function clearHistory() {
            if (confirm('Clear all execution history?')) {
                vscode.postMessage({ command: 'clearHistory' });
                document.querySelector('.results').innerHTML = '<div class="no-results">No execution history yet</div>';
            }
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                vscode.window.showInformationMessage('Copied to clipboard');
            });
        }
    </script>
</body>
</html>`;
  }

  private renderResult(result: ExecutionResult, index: number): string {
    const statusClass = result.success ? 'status-success' : 'status-error';
    const statusText = result.success ? 'Success' : 'Error';
    const timestamp = new Date(result.timestamp).toLocaleString();
    const duration = (result.duration / 1000).toFixed(2);

    return `
        <div class="result-item">
            <div class="result-header">
                <div>
                    <div class="result-title">${this.escapeHtml(result.taskTitle)}</div>
                    <div class="result-meta">
                        <div class="result-meta-item">
                            <span class="result-meta-label">Task:</span>
                            <span>${this.escapeHtml(result.taskId)}</span>
                        </div>
                        <div class="result-meta-item">
                            <span class="result-meta-label">Agent:</span>
                            <span>${this.escapeHtml(result.agentName)}</span>
                        </div>
                        <div class="result-meta-item">
                            <span class="result-meta-label">Time:</span>
                            <span>${timestamp}</span>
                        </div>
                        <div class="result-meta-item">
                            <span class="result-meta-label">Duration:</span>
                            <span>${duration}s</span>
                        </div>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="result-content">
                ${result.response ? `<div class="result-response">${this.escapeHtml(result.response)}</div>` : ''}
                ${result.error ? `<div class="result-error">${this.escapeHtml(result.error)}</div>` : ''}
                <div class="result-meta">
                    <span>${this.escapeHtml(result.message)}</span>
                </div>
            </div>
        </div>
    `;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  public dispose() {
    LLMResponsePanel.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
