import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  processPlanCompletion,
  displayCompletionResults,
  openDecompositionSummary,
  type PlanCompletionResult
} from '../planBuilder/planIntegration';
import {
  savePlan,
  loadPlan,
  listPlans,
  selectPlanFromList
} from '../planBuilder/planPersistence';

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
      case 'wizardReady':
        console.log('[PlanBuilder] Wizard ready');
        break;

      case 'planGenerated':
        this._handlePlanGenerated(message.data, message.timestamp);
        break;

      case 'wizardComplete':
        // Legacy support
        this._handleWizardCompletion(message.data);
        break;

      case 'planError':
        vscode.window.showErrorMessage(`[PlanBuilder] Plan generation error: ${message.error}`);
        console.error('[PlanBuilder] Plan error:', message.error);
        break;

      case 'savePlan':
        this._handleSavePlan(message.data);
        break;

      case 'loadPlan':
        this._handleLoadPlan();
        break;

      case 'listPlans':
        this._handleListPlans();
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

  private async _handlePlanGenerated(plan: any, timestamp: string): Promise<void> {
    try {
      console.log('[PlanBuilder] Plan generated at', timestamp);

      // Show initial success message
      vscode.window.showInformationMessage('✓ Plan created successfully! Generating tasks...');

      // Get workspace root
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        throw new Error('No workspace folder open');
      }

      // Process the plan: generate suggestions, decompose tasks, create files
      const result = await processPlanCompletion(plan, workspaceRoot);

      // Display results to user
      displayCompletionResults(result);

      if (result.success) {
        // Show decomposition summary in new editor
        await openDecompositionSummary(result);

        // Optional: Offer to explore created tasks
        const config = vscode.workspace.getConfiguration('copilot-orchestrator');
        const issueFolder = config.get<string>('task.issueFolder', '.vscode/github-issues');
        const explore = await vscode.window.showInformationMessage(
          `✓ Created ${result.taskCount} tasks. Open the ${issueFolder} folder?`,
          'Yes',
          'No'
        );

        if (explore === 'Yes') {
          const taskFolderUri = vscode.Uri.file(path.join(workspaceRoot, issueFolder));
          await vscode.commands.executeCommand('revealFileInOS', taskFolderUri);
        }
      }

      console.log('[PlanBuilder] Plan processing completed with result:', result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to process plan: ${message}`);
      console.error('[PlanBuilder] Error:', error);
    }
  }

  private async _handleWizardCompletion(wizardState: any): Promise<void> {
    try {
      // Show initial success message
      vscode.window.showInformationMessage('Plan created successfully! Generating tasks...');

      // Get workspace root
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        throw new Error('No workspace folder open');
      }

      // Process the plan: generate suggestions, decompose tasks, create files
      const result = await processPlanCompletion(wizardState, workspaceRoot);

      // Display results to user
      displayCompletionResults(result);

      if (result.success) {
        // Show decomposition summary in new editor
        await openDecompositionSummary(result);

        // Optional: Offer to explore created tasks
        const config = vscode.workspace.getConfiguration('copilot-orchestrator');
        const issueFolder = config.get<string>('task.issueFolder', '.vscode/github-issues');
        const explore = await vscode.window.showInformationMessage(
          `Created ${result.taskCount} tasks. Open the ${issueFolder} folder?`,
          'Yes',
          'No'
        );

        if (explore === 'Yes') {
          const taskFolderUri = vscode.Uri.file(path.join(workspaceRoot, issueFolder));
          await vscode.commands.executeCommand('revealFileInOS', taskFolderUri);
        }
      }

      console.log('[PlanBuilder] Wizard completed with result:', result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to process plan: ${message}`);
      console.error('[PlanBuilder] Error:', error);
    }
  }

  private async _handleSavePlan(wizardState: any): Promise<void> {
    try {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter a name for this plan',
        placeHolder: 'My Project Plan',
        validateInput: (value) => {
          if (!value.trim()) {
            return 'Plan name is required';
          }
          if (value.length > 100) {
            return 'Plan name must be 100 characters or less';
          }
          return null;
        }
      });

      if (!name) {
        return; // User cancelled
      }

      const result = await savePlan(wizardState, name);

      if (result) {
        await vscode.window.showInformationMessage(
          `✓ Plan "${name}" saved successfully (ID: ${result.id})`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error saving plan: ${message}`);
      console.error('[PlanBuilder] Save error:', error);
    }
  }

  private async _handleLoadPlan(): Promise<void> {
    try {
      const selected = await selectPlanFromList();
      if (!selected) {
        return; // User cancelled
      }

      // Send loaded state back to webview
      this._panel.webview.postMessage({
        type: 'planLoaded',
        data: {
          plan: selected,
          wizardState: selected.wizard_state
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error loading plan: ${message}`);
      console.error('[PlanBuilder] Load error:', error);
    }
  }

  private async _handleListPlans(): Promise<void> {
    try {
      const plans = await listPlans();

      if (!plans || plans.length === 0) {
        vscode.window.showInformationMessage('No saved plans found.');
        return;
      }

      // Display plans as a quick pick
      const selected = await vscode.window.showQuickPick(
        plans.map(p => ({
          label: p.name,
          description: p.description || 'No description',
          detail: `Status: ${p.status} | Created: ${new Date(p.created_at).toLocaleDateString()}`,
          id: p.id
        })),
        {
          placeHolder: 'Select a plan to view details',
          matchOnDescription: true
        }
      );

      if (selected) {
        const plan = plans.find(p => p.id === selected.id);
        if (plan) {
          vscode.window.showInformationMessage(
            `Plan: ${plan.name}\nStatus: ${plan.status}\nCreated: ${new Date(plan.created_at).toLocaleString()}`
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error listing plans: ${message}`);
      console.error('[PlanBuilder] List error:', error);
    }
  }

  private _update(): void {
    const webviewHtml = this._getHtmlForWebview(this._panel.webview);
    this._panel.webview.html = webviewHtml;
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get paths to resources as URIs using dynamic asset discovery
    const assetsPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'planBuilder', 'assets');
    
    let styleUri: vscode.Uri | undefined;
    let scriptUri: vscode.Uri | undefined;
    
    try {
      // Dynamically discover CSS and JS files (handles hash changes from Vite builds)
      const assetsDir = assetsPath.fsPath;
      
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        
        // Find main CSS file matching Vite's hashed output (e.g., main-XXXXXXXX.css or index-XXXXXXXX.css)
        const cssFile = files.find((f: string) =>
          /^(main|index)-[a-zA-Z0-9]+\.css$/.test(f)
        );
        
        // Find main JS file matching Vite's hashed output (e.g., main-XXXXXXXX.js or index-XXXXXXXX.js)
        const jsFile = files.find((f: string) =>
          /^(main|index)-[a-zA-Z0-9]+\.js$/.test(f)
        );
        
        if (cssFile) {
          styleUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsPath, cssFile));
        }
        
        if (jsFile) {
          scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsPath, jsFile));
        }
      }
    } catch (error) {
      console.error('[PlanBuilder] Error discovering assets:', error);
    }
    
    // Fallback: If assets not found, show helpful error message
    if (!styleUri || !scriptUri) {
      console.warn('[PlanBuilder] Plan Builder assets not found. Run "npm run build:vue" to build the Vue app.');
      return this._getErrorHtml('Plan Builder Not Built', 
        'The Plan Builder Vue app has not been built yet. Please run <code>npm run build:vue</code> in the vscode-extension directory, then reload VS Code.');
    }

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    // Note: CSP includes 'unsafe-eval' for Vue 3 runtime compilation
    // This is required for Vue's template compiler but does reduce security.
    // CSP includes 'unsafe-inline' for style-src to support Vue's runtime styles.
    // Consider pre-compiling all templates in production builds for better security.
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
        <link rel="stylesheet" type="text/css" href="${styleUri}">
        <title>Interactive Plan Builder</title>
      </head>
      <body>
        <div id="app"></div>
        <script nonce="${nonce}">
          window.vscode = acquireVsCodeApi();
          console.log('[PlanBuilder] Webview initialized');
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  private _getErrorHtml(title: string, message: string): string {
    // Escape HTML to prevent XSS vulnerabilities
    const escapeHtml = (unsafe: string): string => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(message);

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
        <title>${safeTitle}</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .error-container {
            max-width: 600px;
            text-align: center;
          }
          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: var(--vscode-errorForeground);
            margin-bottom: 1rem;
          }
          p {
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          code {
            background: var(--vscode-textCodeBlock-background);
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
          }
          .instructions {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            padding: 1rem;
            border-radius: 6px;
            text-align: left;
          }
          .instructions ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          .instructions li {
            margin: 0.5rem 0;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <h1>${safeTitle}</h1>
          <p>${safeMessage}</p>
          <div class="instructions">
            <h3>Build Instructions:</h3>
            <ol>
              <li>Open a terminal in the <code>vscode-extension</code> directory</li>
              <li>Run: <code>npm run build:vue</code></li>
              <li>Reload VS Code window (Ctrl+R or Cmd+R)</li>
              <li>Open Plan Builder again</li>
            </ol>
          </div>
        </div>
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
