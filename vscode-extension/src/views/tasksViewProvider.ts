import * as vscode from 'vscode';

/**
 * Tree data provider for the Tasks view in the Copilot Orchestrator sidebar
 */
export class TasksViewProvider implements vscode.TreeDataProvider<TaskItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TaskItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskItem): Promise<TaskItem[]> {
    if (!element) {
      // Root level - show task categories
      return [
        new TaskItem(
          'Ready Tasks',
          'ready',
          vscode.TreeItemCollapsibleState.Expanded,
          '$(check-all)'
        ),
        new TaskItem(
          'In Progress',
          'in-progress',
          vscode.TreeItemCollapsibleState.Expanded,
          '$(sync~spin)'
        ),
        new TaskItem(
          'Blocked Tasks',
          'blocked',
          vscode.TreeItemCollapsibleState.Collapsed,
          '$(error)'
        ),
        new TaskItem(
          'Completed',
          'completed',
          vscode.TreeItemCollapsibleState.Collapsed,
          '$(pass)'
        ),
      ];
    } else {
      // Get tasks for this category
      return this.getTasksForCategory(element.categoryId);
    }
  }

  private async getTasksForCategory(category: string): Promise<TaskItem[]> {
    // TODO: Load actual tasks from workspace or backend
    // For now, return sample data
    const sampleTasks: Record<string, TaskItem[]> = {
      ready: [
        new TaskItem(
          'Implement user authentication',
          'task-1',
          vscode.TreeItemCollapsibleState.None,
          '$(play)',
          'Execute this task'
        ),
        new TaskItem(
          'Add API endpoint for tasks',
          'task-2',
          vscode.TreeItemCollapsibleState.None,
          '$(play)',
          'Execute this task'
        ),
      ],
      'in-progress': [
        new TaskItem(
          'Setup database schema',
          'task-3',
          vscode.TreeItemCollapsibleState.None,
          '$(loading~spin)',
          'Currently executing'
        ),
      ],
      blocked: [],
      completed: [
        new TaskItem(
          'Project setup',
          'task-0',
          vscode.TreeItemCollapsibleState.None,
          '$(check)',
          'Completed'
        ),
      ],
    };

    return sampleTasks[category] || [];
  }
}

export class TaskItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly categoryId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly iconId?: string,
    public readonly tooltip?: string
  ) {
    super(label, collapsibleState);

    if (iconId) {
      this.iconPath = new vscode.ThemeIcon(iconId.replace('$(', '').replace(')', ''));
    }

    if (tooltip) {
      this.tooltip = tooltip;
    }

    // Set context value for menu contributions
    if (collapsibleState === vscode.TreeItemCollapsibleState.None) {
      this.contextValue = 'task';
      this.command = {
        command: 'copilot-orchestrator.executeTask',
        title: 'Execute Task',
        arguments: [this],
      };
    }
  }
}
