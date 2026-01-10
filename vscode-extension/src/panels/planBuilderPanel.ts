import * as vscode from 'vscode';
import * as path from 'path';

export class PlanBuilderPanel {
  public static currentPanel: PlanBuilderPanel | undefined;

  public readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;

    // If we already have a panel, show it.
    if (PlanBuilderPanel.currentPanel) {
      PlanBuilderPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      'planBuilder',
      'Interactive Plan Builder',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'planBuilder')
        ]
      }
    );

    PlanBuilderPanel.currentPanel = new PlanBuilderPanel(panel, extensionUri);
  }

  public static kill(): void {
    PlanBuilderPanel.currentPanel?.dispose();
    PlanBuilderPanel.currentPanel = undefined;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables
    );

    // Listen for changes to the extension's dark/light theme
    vscode.window.onDidChangeActiveColorTheme(
      () => this._update(),
      null,
      this._disposables
    );
  }

  private _handleMessage(message: any): void {
    switch (message.type) {
      case 'ready':
        console.log('[PlanBuilder] Webview ready');
        break;

      case 'wizardComplete':
        this._handleWizardCompletion(message.data);
        break;

      case 'stateExported':
        console.log('[PlanBuilder] State exported:', message.data);
        break;

      case 'error':
        vscode.window.showErrorMessage(`[PlanBuilder] ${message.data}`);
        break;

      case 'log':
        console.log('[PlanBuilder]', message.data);
        break;
    }
  }

  private async _handleWizardCompletion(wizardState: any): Promise<void> {
    try {
      // Show success message
      vscode.window.showInformationMessage('Plan created successfully! Generating tasks...');

      // TODO: Call backend API to save plan
      // TODO: Decompose plan into tasks
      // TODO: Create task files in _ZENTASKS folder
      // TODO: Show task decomposition results
      // TODO: Offer export options

      console.log('[PlanBuilder] Wizard completed with state:', wizardState);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to process plan: ${message}`);
    }
  }

  private _update(): void {
    const webviewHtml = this._getHtmlForWebview(this._panel.webview);
    this._panel.webview.html = webviewHtml;
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get paths to resources as URIs
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'planBuilder', 'assets', 'main-BGWyiIlE.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'planBuilder', 'assets', 'main--qTpEcUA.js')
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <link rel="stylesheet" type="text/css" href="${styleUri}">
        <title>Interactive Plan Builder</title>
      </head>
      <body>
        <div id="app"></div>
        <script nonce="${nonce}">
          window.vscode = acquireVsCodeApi();
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  public dispose(): void {
    PlanBuilderPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
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
