import * as vscode from 'vscode';
import * as path from 'path';
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
