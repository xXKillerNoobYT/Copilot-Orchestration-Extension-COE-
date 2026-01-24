import * as vscode from 'vscode';

/**
 * Tree data provider for the Agents view in the Copilot Orchestrator sidebar
 */
export class AgentsViewProvider implements vscode.TreeDataProvider<AgentItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<AgentItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AgentItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AgentItem): Promise<AgentItem[]> {
    if (!element) {
      // Root level - show agent teams
      return [
        new AgentItem(
          'Programming Orchestrator',
          'orchestrator',
          'active',
          vscode.TreeItemCollapsibleState.Collapsed,
          'Master coordinator managing all agent teams'
        ),
        new AgentItem(
          'Planning Team',
          'planning',
          'active',
          vscode.TreeItemCollapsibleState.Collapsed,
          'Generates project plans and task breakdowns'
        ),
        new AgentItem(
          'Answer Team',
          'answer',
          'idle',
          vscode.TreeItemCollapsibleState.Collapsed,
          'Provides context-aware Q&A'
        ),
        new AgentItem(
          'Decomposition Team',
          'decomposition',
          'idle',
          vscode.TreeItemCollapsibleState.Collapsed,
          'Breaks down complex tasks'
        ),
        new AgentItem(
          'Verification Team',
          'verification',
          'active',
          vscode.TreeItemCollapsibleState.Collapsed,
          'Runs tests and visual verification'
        ),
      ];
    } else {
      // Show agent details
      return this.getAgentDetails(element.agentId);
    }
  }

  private async getAgentDetails(agentId: string): Promise<AgentItem[]> {
    // Return agent status details
    return [
      new AgentItem(
        'Status: Active',
        `${agentId}-status`,
        'active',
        vscode.TreeItemCollapsibleState.None
      ),
      new AgentItem(
        'Tasks Completed: 12',
        `${agentId}-completed`,
        'idle',
        vscode.TreeItemCollapsibleState.None
      ),
      new AgentItem(
        'Avg Response: 1.2s',
        `${agentId}-response`,
        'idle',
        vscode.TreeItemCollapsibleState.None
      ),
    ];
  }
}

export class AgentItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly agentId: string,
    public readonly status: 'active' | 'idle' | 'error',
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly tooltip?: string
  ) {
    super(label, collapsibleState);

    // Set icon based on status
    const iconMap = {
      active: 'play-circle',
      idle: 'circle-outline',
      error: 'error',
    };
    this.iconPath = new vscode.ThemeIcon(iconMap[status]);

    if (tooltip) {
      this.tooltip = tooltip;
    }

    this.contextValue = 'agent';
  }
}
