import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logErrorToOutput } from '../utils/errorMessages';

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

    // Look for plans in multiple locations
    const searchLocations = [
      path.join(workspaceFolder.uri.fsPath, 'Docs', 'Plans'),
      path.join(workspaceFolder.uri.fsPath, '.vscode', 'plans'),
    ];
    
    let allPlanFiles: PlanItem[] = [];
    
    // Search all locations
    for (const plansDir of searchLocations) {
      if (!fs.existsSync(plansDir)) {
        continue;
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
      
      allPlanFiles.push(...planFiles);
    }

    if (allPlanFiles.length === 0) {
      // Show enhanced error message
      const errorMessage = [
        '⚠️ No Plans Found\n',
        'Searched locations:',
        ...searchLocations.map(loc => `  - ${loc}`),
        '',
        'Possible causes:',
        '  ✓ Plans directory does not exist',
        '  ✓ No plan files created yet',
        '  ✓ Searching in wrong workspace folder',
        '',
        'Solutions:',
        '  1. Create your first plan using the Plan Builder',
        '  2. Ensure plans are saved in Docs/Plans/ or .vscode/plans/',
        '  3. Open the correct workspace folder',
        '  4. Run: copilot-orchestrator.openPlanBuilder'
      ].join('\n');
      
      logErrorToOutput(errorMessage);
      
      return [
        new PlanItem(
          'No plans found',
          '',
          vscode.TreeItemCollapsibleState.None,
          'info',
          'Searched: ' + searchLocations.join(', ')
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

    return allPlanFiles;
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
