import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { parseTasksFromDirectory, ParsedTask } from './taskParser';
import { generateTaskGraph, TaskGraphGenerator, exportToMermaid } from './taskGraphGenerator';
import { OrchestratorPanelProvider, MemoryEntry, ContextBundle } from './orchestratorPanel';
import { TaskFileCodeLensProvider } from './taskFileCodeLens';
import { TaskFileDocumentWatcher } from './taskFileDocumentWatcher';
import { TaskInteractionAPI, TaskInteractionEvent } from './taskInteractionAPI';
import { TaskFileSyntaxHighlighter } from './taskFileSyntaxHighlighter';
import { configureLlmCommand } from './commands/configureLLM';
import { testConnectionCommand } from './commands/testConnection';
import { executeLlmCommand } from './commands/executeLLM';
import { readLlmConfig } from './config/llmConfig';

export function activate(context: vscode.ExtensionContext) {
  const llmStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
  // Create a status bar item on activation
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(rocket) Copilot Orchestrator';
  statusBarItem.tooltip = 'Start Copilot Orchestrator';
  statusBarItem.command = 'copilot-orchestrator.start';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  llmStatusBar.command = 'copilot-orchestrator.configureLLM';
  context.subscriptions.push(llmStatusBar);

  const disposable = vscode.commands.registerCommand('copilot-orchestrator.start', () => {
    statusBarItem.text = '$(sync~spin) Copilot Orchestrator';
    vscode.window.showInformationMessage('Copilot Orchestrator started!');
    setTimeout(() => {
      statusBarItem.text = '$(rocket) Copilot Orchestrator';
    }, 1500);
  });

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.configureLLM', async () => {
      await configureLlmCommand();
      refreshLlmStatus(llmStatusBar);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.testConnection', async () => {
      await testConnectionCommand();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.executeLLM', async () => {
      await executeLlmCommand();
    })
  );

  // ============ .task.md File Support (CodeLens, Watcher, Syntax) ============
  // Initialize CodeLens provider for .task.md files
  const codeLensProvider = new TaskFileCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file', pattern: '**/*.task.md' },
      codeLensProvider
    )
  );

  // Initialize document watcher and syntax highlighter
  const taskDocumentWatcher = new TaskFileDocumentWatcher(codeLensProvider);
  context.subscriptions.push(...taskDocumentWatcher.startWatching());
  context.subscriptions.push(taskDocumentWatcher);

  const syntaxHighlighter = new TaskFileSyntaxHighlighter();
  context.subscriptions.push(syntaxHighlighter);

  // Initialize task interaction API
  const taskInteractionAPI = new TaskInteractionAPI();
  context.subscriptions.push(taskInteractionAPI);

  // Listen for editor changes and apply syntax highlighting to .task.md files
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor && editor.document.uri.fsPath.endsWith('.task.md')) {
        syntaxHighlighter.applySyntaxHighlighting(editor);
      }
    },
    null,
    context.subscriptions
  );

  // Apply syntax highlighting to all visible editors
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (editor.document.uri.fsPath.endsWith('.task.md')) {
      syntaxHighlighter.applySyntaxHighlighting(editor);
    }
  });

  // Register commands for task file interactions
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.executeTask', async (uri: vscode.Uri, taskId: string) => {
      await taskInteractionAPI.executeTask(taskId, uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.changeTaskStatus', async (uri: vscode.Uri, taskId: string) => {
      await taskInteractionAPI.changeTaskStatus(taskId, uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.openContextBundle', async (bundlePath: string) => {
      await taskInteractionAPI.openContextBundle(bundlePath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.createContextBundle', async (uri: vscode.Uri, taskId: string) => {
      await taskInteractionAPI.createContextBundle(taskId, uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.linkGitHubIssue', async (uri: vscode.Uri, taskId: string) => {
      await taskInteractionAPI.linkGitHubIssue(taskId, uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.openGitHubIssue', async (issueUrl: string) => {
      await taskInteractionAPI.openGitHubIssue(issueUrl);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.showTaskMetadata', async (task: ParsedTask) => {
      await taskInteractionAPI.showTaskMetadata(task);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.manageDependencies', async (uri: vscode.Uri, taskId: string, dependencies: string[]) => {
      await taskInteractionAPI.manageDependencies(taskId, uri, dependencies);
    })
  );

  // Listen to task interaction events to update orchestrator workflow
  taskInteractionAPI.onTaskInteraction((event: TaskInteractionEvent) => {
    switch (event.type) {
      case 'executeTask':
        vscode.window.showInformationMessage(`Task execution initiated: ${event.taskId}`);
        // TODO: Connect to orchestrator workflow/backend API
        break;
      case 'statusChanged':
        vscode.window.showInformationMessage(`Task status updated: ${event.newStatus}`);
        codeLensProvider.refresh();
        break;
      case 'contextBundleCreated':
        vscode.window.showInformationMessage(`Context bundle created at: ${event.bundlePath}`);
        break;
      case 'gitHubLinked':
        vscode.window.showInformationMessage(`GitHub issue #${event.issueNumber} linked`);
        codeLensProvider.refresh();
        break;
      case 'dependenciesChanged':
        vscode.window.showInformationMessage(`Dependencies updated`);
        codeLensProvider.refresh();
        break;
    }
  });

  // ============ End of .task.md File Support ============
  const treeDataProvider = new OrchestratorStatusProvider(context);
  vscode.window.registerTreeDataProvider('copilotOrchestrator.status', treeDataProvider);

  const refreshDisposable = vscode.commands.registerCommand('copilot-orchestrator.refreshTasks', async () => {
    await treeDataProvider.refreshFromDisk();
    vscode.window.showInformationMessage('Copilot Orchestrator tasks refreshed.');
  });

  context.subscriptions.push(refreshDisposable);

  // Command to show task graph visualization
  const graphDisposable = vscode.commands.registerCommand('copilot-orchestrator.showGraph', async () => {
    const tasks = treeDataProvider.getTasks();
    
    if (tasks.length === 0) {
      vscode.window.showWarningMessage('No tasks found to visualize.');
      return;
    }

    const generator = new TaskGraphGenerator(tasks);
    const graph = generator.generateGraph();
    const stats = generator.getStats(graph);

    // Show graph statistics
    const message = `Task Graph: ${stats.totalTasks} tasks, ${stats.completedTasks} completed, ${stats.readyToExecute} ready to execute`;
    vscode.window.showInformationMessage(message);

    // Generate Mermaid diagram
    const mermaidDiagram = exportToMermaid(graph);
    
    // Create and show document with Mermaid diagram
    const doc = await vscode.workspace.openTextDocument({
      content: mermaidDiagram,
      language: 'mermaid',
    });
    await vscode.window.showTextDocument(doc);
  });

  context.subscriptions.push(graphDisposable);

  // Command to show task dependencies
  const depsDisposable = vscode.commands.registerCommand('copilot-orchestrator.showDependencies', async () => {
    const tasks = treeDataProvider.getTasks();
    
    if (tasks.length === 0) {
      vscode.window.showWarningMessage('No tasks found.');
      return;
    }

    const generator = new TaskGraphGenerator(tasks);
    const graph = generator.generateGraph();
    const validation = generator.validateDependencies();

    const output: string[] = [];
    output.push('=== Task Dependencies ===\n');

    if (!validation.valid) {
      output.push('ERRORS:');
      validation.errors.forEach(err => output.push(`  ❌ ${err}`));
      output.push('');
    }

    if (validation.warnings.length > 0) {
      output.push('WARNINGS:');
      validation.warnings.forEach(warn => output.push(`  ⚠️  ${warn}`));
      output.push('');
    }

    if (graph.cycles.length > 0) {
      output.push('CIRCULAR DEPENDENCIES:');
      graph.cycles.forEach((cycle, idx) => {
        output.push(`  Cycle ${idx + 1}: ${cycle.join(' -> ')}`);
      });
      output.push('');
    }

    output.push('EXECUTION ORDER:');
    graph.executionOrder.forEach((level, idx) => {
      output.push(`  Level ${idx} (${level.length} tasks):`);
      level.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          output.push(`    - ${taskId}: ${task.title} [${task.status}]`);
        }
      });
    });

    const doc = await vscode.workspace.openTextDocument({
      content: output.join('\n'),
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
  });

  context.subscriptions.push(depsDisposable);

  // Command to show orchestrator panel
  const panelDisposable = vscode.commands.registerCommand('copilot-orchestrator.showPanel', async () => {
    const tasks = treeDataProvider.getTasks();
    
    // Sample memory and context bundles (in real implementation, load from state/files)
    const sampleMemory: MemoryEntry[] = [
      { role: 'system', content: 'Orchestration system initialized', timestamp: new Date().toISOString() },
      { role: 'user', content: 'Started working on task implementation', timestamp: new Date().toISOString() },
    ];

    const sampleBundles: ContextBundle[] = [
      {
        id: 'bundle-1',
        name: 'Core Architecture',
        files: ['src/taskParser.ts', 'src/taskGraphGenerator.ts'],
        description: 'Main task processing files',
      },
      {
        id: 'bundle-2',
        name: 'Agent Profiles',
        files: ['config/agents/coder.yaml', 'config/agents/planner.yaml'],
        description: 'Agent configuration files',
      },
    ];

    OrchestratorPanelProvider.createOrShow(
      context.extensionUri,
      tasks,
      sampleMemory,
      sampleBundles
    );
  });

  context.subscriptions.push(panelDisposable);

  // Initial load of tasks
  treeDataProvider
    .refreshFromDisk()
    .catch((error) => vscode.window.showErrorMessage(`Failed to load tasks: ${error instanceof Error ? error.message : String(error)}`));

  // Initialize LLM status indicator and refresh on configuration changes
  refreshLlmStatus(llmStatusBar);
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('copilot-orchestrator.llm') || event.affectsConfiguration('copilot-orchestrator.taskRoots')) {
        refreshLlmStatus(llmStatusBar);
      }
    })
  );
}

export function deactivate() {
  // Cleanup if needed when the extension is deactivated
}

function refreshLlmStatus(statusBar: vscode.StatusBarItem) {
  const state = readLlmConfig();
  if (state.isConfigured) {
    statusBar.text = '$(plug) LLM: Configured';
    statusBar.tooltip = 'LLM settings are configured. Click to edit.';
  } else {
    statusBar.text = '$(alert) LLM: Missing config';
    statusBar.tooltip = state.issues.join('; ') || 'Configure LLM settings';
  }
  statusBar.show();
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
  private taskSource: string = 'unknown';

  constructor(private readonly context: vscode.ExtensionContext) {}

  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    if (element) {
      return element.task.subtasks.map((task) => new TaskTreeItem(task));
    }

    if (!this.tasks.length) {
      const source = this.taskSource === 'error' ? 'Failed to load tasks' : 
                     this.taskSource === 'workspace' ? 'No workspace tasks found' :
                     'No bundled tasks found';
      return [new TaskTreeItem({
        id: 'no-tasks',
        title: 'No tasks found',
        description: source,
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
    const config = readLlmConfig();
    const taskRoots = config.config.taskRoots || ['_ZENTASKS'];
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let tasksDir: string | undefined;
    let loadedFromWorkspace = false;

    if (workspaceFolder) {
      for (const root of taskRoots) {
        const candidate = path.join(workspaceFolder.uri.fsPath, root);
        try {
          const stat = await fs.stat(candidate);
          if (stat.isDirectory()) {
            tasksDir = candidate;
            loadedFromWorkspace = true;
            break;
          }
        } catch {
          // Directory doesn't exist, try next root
        }
      }
    }

    if (!tasksDir) {
      tasksDir = path.join(this.context.extensionPath, 'sample-tasks');
    }

    try {
      this.tasks = await parseTasksFromDirectory(tasksDir);
      this.taskSource = loadedFromWorkspace ? 'workspace' : 'bundled';
    } catch (error) {
      console.error(`Failed to load tasks from ${tasksDir}:`, error);
      this.tasks = [];
      this.taskSource = 'error';
    }
    this._onDidChangeTreeData.fire();
  }

  getTasks(): ParsedTask[] {
    return this.tasks;
  }

  getTaskSource(): string {
    return this.taskSource;
  }
}
