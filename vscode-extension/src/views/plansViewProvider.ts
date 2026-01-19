import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Tree data provider for the Plans view in the Copilot Orchestrator sidebar
 */
export class PlansViewProvider implements vscode.TreeDataProvider<PlanItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PlanItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PlanItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: PlanItem): Promise<PlanItem[]> {
    if (!element) {
      // Root level - show available plans
      return this.getPlansFromWorkspace();
    }
    return [];
  }

  private async getPlansFromWorkspace(): Promise<PlanItem[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return [
        new PlanItem(
          'No workspace open',
          '',
          vscode.TreeItemCollapsibleState.None,
          'warning'
        ),
      ];
    }

    // Look for plans in Docs/Plans/ directory
    const plansDir = path.join(workspaceFolder.uri.fsPath, 'Docs', 'Plans');
    
    if (!fs.existsSync(plansDir)) {
      return [
        new PlanItem(
          'No plans found',
          '',
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
        new PlanItem(
          'Create your first plan',
          'create-plan',
          vscode.TreeItemCollapsibleState.None,
          'add',
          'Click to open Plan Builder'
        ),
      ];
    }

    // List all .json files in Plans directory
    const planFiles = fs
      .readdirSync(plansDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const planPath = path.join(plansDir, file);
        let planData: any = {};
        try {
          planData = JSON.parse(fs.readFileSync(planPath, 'utf8'));
        } catch (err) {
          // Invalid JSON
        }

        return new PlanItem(
          planData.title || file.replace('.json', ''),
          planPath,
          vscode.TreeItemCollapsibleState.None,
          'file-code',
          `${planData.description || 'Project plan'}\nProgress: ${planData.progress || 0}%`
        );
      });

    if (planFiles.length === 0) {
      return [
        new PlanItem(
          'No plans found',
          '',
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
      ];
    }

    return planFiles;
  }
}

export class PlanItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly planPath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly iconType?: string,
    public readonly tooltip?: string
  ) {
    super(label, collapsibleState);

    if (iconType) {
      this.iconPath = new vscode.ThemeIcon(iconType);
    }

    if (tooltip) {
      this.tooltip = tooltip;
    }

    this.contextValue = 'plan';

    // Add command to open plan
    if (planPath && planPath !== 'create-plan' && fs.existsSync(planPath)) {
      this.command = {
        command: 'vscode.open',
        title: 'Open Plan',
        arguments: [vscode.Uri.file(planPath)],
      };
    } else if (planPath === 'create-plan') {
      this.command = {
        command: 'copilot-orchestrator.openPlanBuilder',
        title: 'Create Plan',
      };
    }
  }
}
