import * as vscode from 'vscode';
import { TasksSource, Task } from '../workspace/tasksSource';
import * as path from 'path';

/**
 * Tree data provider for the Tasks view in the Copilot Orchestrator sidebar
 */
export class TasksViewProvider implements vscode.TreeDataProvider<TaskItem>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private tasksSource: TasksSource | undefined;
  private fileWatcherDispose: (() => void) | undefined;
  private hasShownValidationWarning = false;

  constructor(private context: vscode.ExtensionContext) {
    this.initializeTasksSource();
  }

  /**
   * Initialize the tasks source and set up file watching
   */
  private async initializeTasksSource(): Promise<void> {
    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      console.log('[TasksViewProvider] No workspace folder available - tasks will not load');
      return;
    }

    // Create tasks source with workspace root
    this.tasksSource = new TasksSource([path.join(workspaceRoot, '_ZENTASKS')]);

    // Check if tasks file exists
    const exists = await this.tasksSource.exists();
    if (exists) {
      // Load initial data
      const state = await this.tasksSource.load();
      
      // Show validation warnings if any
      if (!state.isValid && state.issues.length > 0) {
        this.showValidationWarning(state.issues[0]);
      }
      
      this.refresh();

      // Set up file watcher for automatic updates
      this.fileWatcherDispose = this.tasksSource.watch((state) => {
        // Reset warning flag when file changes
        this.hasShownValidationWarning = false;
        
        // Show validation warnings if any
        if (!state.isValid && state.issues.length > 0) {
          this.showValidationWarning(state.issues[0]);
        }
        
        this.refresh();
      });
    } else {
      console.log('[TasksViewProvider] Tasks file not found at:', this.tasksSource.getTaskFilePath());
    }
  }

  /**
   * Show validation warning once per load
   */
  private showValidationWarning(issue: string): void {
    if (!this.hasShownValidationWarning) {
      vscode.window.showWarningMessage(`Tasks file has validation issues: ${issue}`);
      this.hasShownValidationWarning = true;
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.fileWatcherDispose) {
      this.fileWatcherDispose();
    }
    if (this.tasksSource) {
      this.tasksSource.dispose();
    }
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
    // If no tasks source is available, return empty array
    if (!this.tasksSource) {
      return [];
    }

    // Get cached tasks from the source
    const state = this.tasksSource.getCached();

    // Map task statuses to categories
    const tasks = state.tasks;
    const categoryTasks: Task[] = [];

    switch (category) {
      case 'ready':
        // Tasks with status 'pending' are ready to be executed
        categoryTasks.push(...tasks.filter((t) => t.status === 'pending'));
        break;
      case 'in-progress':
        // Tasks currently being worked on
        categoryTasks.push(...tasks.filter((t) => t.status === 'in-progress'));
        break;
      case 'blocked':
        // Tasks that are blocked
        categoryTasks.push(...tasks.filter((t) => t.status === 'blocked'));
        break;
      case 'completed':
        // Tasks that are done or in review
        categoryTasks.push(
          ...tasks.filter((t) => t.status === 'done' || t.status === 'review')
        );
        break;
    }

    // Convert tasks to TaskItems
    return categoryTasks.map((task) => this.createTaskItem(task, category));
  }

  /**
   * Create a TaskItem from a Task
   */
  private createTaskItem(task: Task, category: string): TaskItem {
    let icon = '$(play)';
    let tooltip = task.description;

    // Set icon and tooltip based on status
    switch (task.status) {
      case 'pending':
        icon = '$(play)';
        tooltip = `${task.description}\n\nClick to execute this task`;
        break;
      case 'in-progress':
        icon = '$(loading~spin)';
        tooltip = `${task.description}\n\nCurrently executing`;
        break;
      case 'blocked':
        icon = '$(error)';
        tooltip = `${task.description}\n\nBlocked`;
        break;
      case 'done':
        icon = '$(check)';
        tooltip = `${task.description}\n\nCompleted`;
        break;
      case 'review':
        icon = '$(eye)';
        tooltip = `${task.description}\n\nIn review`;
        break;
    }

    // Add priority indicator to label
    let label = task.title;
    if (task.priority === 'high') {
      label = `⚡ ${label}`;
    }

    return new TaskItem(
      label,
      task.id,
      vscode.TreeItemCollapsibleState.None,
      icon,
      tooltip
    );
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
