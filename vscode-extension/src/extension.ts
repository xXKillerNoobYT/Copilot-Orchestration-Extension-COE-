import * as vscode from 'vscode';
import * as path from 'path';
import { parseTasksFromDirectory, ParsedTask } from './taskParser';

export function activate(context: vscode.ExtensionContext) {
  // Create a status bar item on activation
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(rocket) Copilot Orchestrator';
  statusBarItem.tooltip = 'Start Copilot Orchestrator';
  statusBarItem.command = 'copilot-orchestrator.start';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const disposable = vscode.commands.registerCommand('copilot-orchestrator.start', () => {
    statusBarItem.text = '$(sync~spin) Copilot Orchestrator';
    vscode.window.showInformationMessage('Copilot Orchestrator started!');
    setTimeout(() => {
      statusBarItem.text = '$(rocket) Copilot Orchestrator';
    }, 1500);
  });

  context.subscriptions.push(disposable);

  // Tree view for Activity Bar "Status"
  const treeDataProvider = new OrchestratorStatusProvider(context);
  vscode.window.registerTreeDataProvider('copilotOrchestrator.status', treeDataProvider);

  const refreshDisposable = vscode.commands.registerCommand('copilot-orchestrator.refreshTasks', async () => {
    await treeDataProvider.refreshFromDisk();
    vscode.window.showInformationMessage('Copilot Orchestrator tasks refreshed.');
  });

  context.subscriptions.push(refreshDisposable);

  // Initial load of tasks
  treeDataProvider
    .refreshFromDisk()
    .catch((error) => vscode.window.showErrorMessage(`Failed to load tasks: ${error instanceof Error ? error.message : String(error)}`));
}

export function deactivate() {
  // Cleanup if needed when the extension is deactivated
}

class TaskTreeItem extends vscode.TreeItem {
  constructor(public readonly task: ParsedTask) {
    super(task.title, task.subtasks.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    const detailParts = [task.status, task.priority].filter(Boolean).join(' · ');
    this.description = detailParts.length > 0 ? detailParts : undefined;
    this.tooltip = new vscode.MarkdownString([
      `**${task.title}** (${task.id})`,
      task.type ? `Type: ${task.type}` : undefined,
      task.priority ? `Priority: ${task.priority}` : undefined,
      task.status ? `Status: ${task.status}` : undefined,
      task.dependencies.length ? `Depends on: ${task.dependencies.join(', ')}` : undefined,
      '',
      task.description,
    ]
      .filter(Boolean)
      .join('\n'));
    this.contextValue = 'copilotOrchestratorTask';
    this.iconPath = new vscode.ThemeIcon(task.status === 'completed' ? 'pass' : 'rocket');
  }
}

class OrchestratorStatusProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | void> =
    new vscode.EventEmitter<TaskTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private tasks: ParsedTask[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    if (element) {
      return element.task.subtasks.map((task) => new TaskTreeItem(task));
    }

    if (!this.tasks.length) {
      return [new TaskTreeItem({
        id: 'no-tasks',
        title: 'No tasks found',
        description: 'Add Markdown tasks with YAML front matter to sample-tasks/',
        dependencies: [],
        assignees: [],
        labels: [],
        subtasks: [],
        rawFrontMatter: {},
      })];
    }

    return this.tasks.map((task) => new TaskTreeItem(task));
  }

  async refreshFromDisk(): Promise<void> {
    const tasksDir = path.join(this.context.extensionPath, 'sample-tasks');
    this.tasks = await parseTasksFromDirectory(tasksDir);
    this._onDidChangeTreeData.fire();
  }
}
