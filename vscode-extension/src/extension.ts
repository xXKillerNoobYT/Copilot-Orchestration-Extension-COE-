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
import { testConnectionCommand } from './commands/testConnection';
import { executeLlmCommand } from './commands/executeLLM';
import { readLlmConfig } from './config/llmConfig';
import { AutoAgentLoopCommand } from './commands/autoAgentLoop';
import { SettingsPanel } from './webviews/settingsPanel';
import { VisualVerificationPanel } from './panels/visualVerificationPanel';
import { PlanAdjustmentWizard } from './panels/planAdjustmentWizard';
import { PlanBuilderPanel } from './panels/planBuilderPanel';
import { AuditDashboardPanel } from './panels/auditDashboardPanel';
import { WebSocketConfigManager } from './services/webSocketConfigManager';
import { initializeWebSocketClient, disposeWebSocketClient } from './services/webSocketClient';
import { getLLMIPMonitor } from './services/llmIPMonitor';
import { ConnectionMonitor, createConnectionStatusBarItem, ConnectionState, showConnectionDetails } from './services/connectionMonitor';
import { MCPClient } from './services/mcpClient';
import { MCPRouter } from './services/mcpRouter';
import { ToolSelector } from './services/toolSelector';
import { registerPlanAdjustmentCommands } from './commands/planAdjustmentCommands';
import { registerMCPConfigCommands } from './commands/mcpConfigCommands';
import { getAgentProfileWatcher, disposeAgentProfileWatcher } from './agentProfileWatcher';
import { TasksViewProvider } from './views/tasksViewProvider';
import { AgentsViewProvider } from './views/agentsViewProvider';
import { PlansViewProvider } from './views/plansViewProvider';
import { initializeErrorLogging, disposeErrorLogging } from './utils/errorMessages';

export function activate(context: vscode.ExtensionContext) {
  // Initialize Error Logging Output Channel
  const errorOutputChannel = initializeErrorLogging();
  context.subscriptions.push(errorOutputChannel);
  context.subscriptions.push({
    dispose: () => disposeErrorLogging(),
  });
  
  // Initialize Agent Profile Watcher (Phase 5: Hot-reload for agent profiles)
  const profileWatcher = getAgentProfileWatcher(context.extensionUri);
  profileWatcher.start();
  profileWatcher.onChange((event) => {
    console.log(`[Extension] Agent profile ${event.changeType}: ${event.profileName}`);
    vscode.window.showInformationMessage(
      `Agent profile '${event.profileName}' ${event.changeType}`
    );
  });
  context.subscriptions.push({
    dispose: () => disposeAgentProfileWatcher(),
  });

  // Initialize LLM IP Monitor (Background service for LLM connectivity)
  const llmIPMonitor = getLLMIPMonitor(context);
  llmIPMonitor.start();
  context.subscriptions.push({
    dispose: () => llmIPMonitor.stop(),
  });

  // Initialize auto agent loop command (Phase 7: Auto-Agent Switching)
  new AutoAgentLoopCommand(context);

  // Start connection monitoring (Phase 3: MCP/WebSocket status badges)
  const connectionMonitor = ConnectionMonitor.getInstance();
  connectionMonitor.start();
  context.subscriptions.push({
    dispose: () => connectionMonitor.dispose(),
  });

  // Unified Status Bar Item
  const unifiedStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  unifiedStatusBar.command = 'copilot-orchestrator.showStatusMenu';
  context.subscriptions.push(unifiedStatusBar);

  // Status State
  let orchestratorState = { text: '$(rocket)', tooltip: 'Orchestrator: Ready' };
  let llmState = { text: '$(alert)', tooltip: 'LLM: Not Configured' };
  let connectionState: ConnectionState = {
    mcp: 'disconnected',
    websocket: 'disconnected',
    docker: 'disconnected',
    lastMcpCheck: '',
    lastWsCheck: '',
    lastDockerCheck: '',
    retryCount: 0
  };

  const updateUnifiedStatus = () => {
    // LLM Icon
    const llmIcon = llmState.text.includes('plug') ? '$(plug)' : '$(alert)';

    // Connection Icons
    const mcpIcon = connectionState.mcp === 'connected' ? '$(check)' :
      connectionState.mcp === 'degraded' ? '$(warning)' : '$(error)';

    const dockerIcon = connectionState.docker === 'connected' ? '$(check)' :
      connectionState.docker === 'degraded' ? '$(warning)' : '$(error)';

    unifiedStatusBar.text = `${orchestratorState.text} Orchestrator | ${llmIcon} LLM | ${mcpIcon} MCP | ${dockerIcon} Docker`;

    unifiedStatusBar.tooltip = new vscode.MarkdownString([
      `**Orchestrator**: ${orchestratorState.tooltip}`,
      `**LLM**: ${llmState.tooltip}`,
      `**MCP**: ${connectionState.mcp}`,
      `**WebSocket**: ${connectionState.websocket}`,
      `**Docker Gateway**: ${connectionState.docker}${connectionState.dockerAuthRequired ? ' (Auth Required)' : ''}`
    ].join('\n\n'));

    unifiedStatusBar.show();
  };

  const refreshLlmStatus = () => {
    const state = readLlmConfig();
    if (state.isConfigured) {
      llmState = { text: '$(plug)', tooltip: 'LLM: Configured' };
    } else {
      llmState = { text: '$(alert)', tooltip: state.issues.join('; ') || 'Configure LLM settings' };
    }
    updateUnifiedStatus();
  };

  // Orchestrator Start Command
  const disposable = vscode.commands.registerCommand('copilot-orchestrator.start', () => {
    orchestratorState = { text: '$(sync~spin)', tooltip: 'Orchestrator: Starting...' };
    updateUnifiedStatus();
    vscode.window.showInformationMessage('Copilot Orchestrator started!');
    setTimeout(() => {
      orchestratorState = { text: '$(rocket)', tooltip: 'Orchestrator: Running' };
      updateUnifiedStatus();
    }, 1500);
  });
  context.subscriptions.push(disposable);

  // Configure LLM Command
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.configureLLM', async () => {
      SettingsPanel.createOrShow(context.extensionUri);
      refreshLlmStatus();
    })
  );

  // Show Status Menu Command
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.showStatusMenu', async () => {
      const items = [
        { label: '$(rocket) Start Orchestrator', command: 'copilot-orchestrator.start' },
        { label: '$(gear) Configure LLM', command: 'copilot-orchestrator.configureLLM' },
        { label: '$(plug) Test LLM Connection', command: 'copilot-orchestrator.testConnection' },
        { label: '$(server) Connection Details', command: 'copilot-orchestrator.showConnectionDetails' }
      ];

      const selection = await vscode.window.showQuickPick(items, { placeHolder: 'Orchestrator Status & Actions' });
      if (selection) {
        vscode.commands.executeCommand(selection.command);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.showConnectionDetails', () => {
      showConnectionDetails();
    })
  );

  connectionMonitor.onDidChangeState(state => {
    connectionState = state;
    updateUnifiedStatus();
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.showVisualVerification', async () => {
      VisualVerificationPanel.createOrShow(context.extensionUri, {
        taskId: 'TASK-001',
        taskTitle: 'Implement color palette system',
        planVersion: '1.0.0',
        serverUrl: 'http://localhost:3000',
        requiresUserReady: true,
      });
    })
  );

  // ============ Plan Adjustment Commands (EPIC-008) ============
  registerPlanAdjustmentCommands(context);

  // ============ MCP Config Commands ============
  registerMCPConfigCommands(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.openPlanAdjustmentWizard', async () => {
      const summary = await vscode.window.showInputBox({
        prompt: 'Briefly describe the plan change',
        placeHolder: 'e.g., Add user authentication module',
      });

      if (summary) {
        PlanAdjustmentWizard.createOrShow(context.extensionUri, {
          summary,
          impact: undefined,
          proposedChange: summary,
        });
      }
    })
  );

  // ============ Plan Builder Commands ============
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.openPlanBuilder', async () => {
      PlanBuilderPanel.createOrShow(context.extensionUri);
    })
  );



  // ============ Audit Dashboard Command ============
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.showAuditDashboard', async () => {
      AuditDashboardPanel.createOrShow(context.extensionUri);
    })
  );

  // ============ WebSocket Broadcasting (Code Master Section 11.8-11.9) ============
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.configureWebSocket', async () => {
      await WebSocketConfigManager.showConfigurationPanel();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.testWebSocket', async () => {
      await WebSocketConfigManager.testConnection();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.connectWebSocket', async () => {
      try {
        const config = WebSocketConfigManager.getConfig();
        const clientConfig = WebSocketConfigManager.toClientConfig();

        vscode.window.showInformationMessage(
          `[WebSocket] Connecting to ${config.driver}...`
        );

        const wsClient = await initializeWebSocketClient(clientConfig);

        // Subscribe to common event channels
        wsClient.subscribe('mcp-events', 'task-status-updated', (data) => {
          vscode.window.showInformationMessage(
            `[Task] ${data.taskId} → ${data.status}`
          );
        });

        wsClient.subscribe('mcp-events', 'test-failure-alert', (data) => {
          vscode.window.showErrorMessage(
            `[Test Failure] ${data.message}`
          );
        });

        wsClient.subscribe('mcp-events', 'observation-logged', (data) => {
          console.log('[Observation]', data.message);
        });

        wsClient.subscribe('mcp-events', 'verification-completed', (data) => {
          vscode.window.showInformationMessage(
            `[Verification] ${data.status}`
          );
        });

        const status = wsClient.getStatus();
        vscode.window.showInformationMessage(
          `[WebSocket] Connected to ${status.driver} ✓`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `[WebSocket] Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.disconnectWebSocket', async () => {
      disposeWebSocketClient();
      vscode.window.showInformationMessage('[WebSocket] Disconnected ✓');
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
  taskInteractionAPI.onTaskInteraction(async (event: TaskInteractionEvent) => {
    switch (event.type) {
      case 'executeTask':
        await handleTaskExecution(event.taskId);
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

  /**
   * Handle task execution by connecting to orchestrator backend API via MCP
   */
  async function handleTaskExecution(taskId: string): Promise<void> {
    try {
      // Show progress indicator
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Executing task ${taskId}...`,
          cancellable: true,
        },
        async (progress) => {
          // Get MCP client instance
          const mcpClient = MCPClient.getInstance();
          
          // Report task status to backend
          progress.report({ increment: 30, message: 'Reporting task status to orchestrator...' });
          const statusResponse = await mcpClient.reportTaskStatus({
            taskId,
            status: 'in-progress',
            progressPercent: 50,
            implementationNotes: 'Task execution initiated from VS Code extension',
          });
          
          // Log observation for audit trail
          progress.report({ increment: 20, message: 'Logging execution observation...' });
          await mcpClient.reportObservation({
            taskId,
            type: 'discovery',
            message: `Task execution started from VS Code extension at ${new Date().toISOString()}`,
            severity: 'info',
          });
          
          // Request next task details from orchestrator queue
          progress.report({ increment: 30, message: 'Fetching task from orchestrator queue...' });
          const nextTask = await mcpClient.getNextTask();
          
          progress.report({ increment: 20 });
          
          // Show success message with task details
          if (nextTask) {
            vscode.window.showInformationMessage(
              `✓ Task ${taskId} execution started. Next task: ${nextTask.id}`,
              'View Task', 'View Queue'
            ).then((action) => {
              if (action === 'View Task') {
                // Open task details in Visual Verification panel
                vscode.commands.executeCommand('copilot-orchestrator.openVisualVerification');
              } else if (action === 'View Queue') {
                // Open orchestrator dashboard
                vscode.commands.executeCommand('copilot-orchestrator.openOrchestrator');
              }
            });
          } else {
            vscode.window.showInformationMessage(
              `✓ Task ${taskId} execution started. No more tasks in queue.`
            );
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to execute task: ${error instanceof Error ? error.message : String(error)}`
      );
      
      // Report failure to backend
      try {
        const mcpClient = MCPClient.getInstance();
        await mcpClient.reportTaskStatus({
          taskId,
          status: 'failed',
          implementationNotes: `Task execution failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      } catch (reportError) {
        console.error('Failed to report task failure:', reportError);
      }
    }
  }

  // ============ End of .task.md File Support ============

  // Register Sidebar View Providers
  const treeDataProvider = new OrchestratorStatusProvider(context);
  vscode.window.registerTreeDataProvider('copilotOrchestrator.status', treeDataProvider);

  const tasksViewProvider = new TasksViewProvider(context);
  vscode.window.registerTreeDataProvider('copilotOrchestrator.tasks', tasksViewProvider);

  const agentsViewProvider = new AgentsViewProvider(context);
  vscode.window.registerTreeDataProvider('copilotOrchestrator.agents', agentsViewProvider);

  const plansViewProvider = new PlansViewProvider(context);
  vscode.window.registerTreeDataProvider('copilotOrchestrator.plans', plansViewProvider);

  // Refresh commands for each view
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.refreshTasks', async () => {
      await treeDataProvider.refreshFromDisk();
      tasksViewProvider.refresh();
      vscode.window.showInformationMessage('Tasks refreshed.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.refreshAgents', async () => {
      agentsViewProvider.refresh();
      vscode.window.showInformationMessage('Agent status refreshed.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.refreshPlans', async () => {
      plansViewProvider.refresh();
      vscode.window.showInformationMessage('Plans refreshed.');
    })
  );

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

  // Planning Phase Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.planningPhase', async () => {
      const message = 'Planning Phase: Define scope, dependencies, and task structure.\n\nActions:\n1. Open _ZENTASKS folder\n2. Create task hierarchy\n3. Define dependencies and priorities';
      await vscode.window.showInformationMessage(message, 'Open Tasks Folder', 'Show Example').then((selection) => {
        if (selection === 'Open Tasks Folder') {
          void vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath + '/_ZENTASKS'));
        } else if (selection === 'Show Example') {
          vscode.window.showInformationMessage('See TASK-*.md files in _ZENTASKS for examples');
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.aiDevPlanning', async () => {
      const message = 'AI Development Planning: Generate AI-driven implementation plan.\n\nThis phase:\n1. Analyzes task requirements\n2. Generates implementation strategy\n3. Creates subtasks for AI execution\n\nLaunch Zen Planner agent?';
      await vscode.window.showInformationMessage(message, 'Launch Zen Planner', 'Cancel').then((selection) => {
        if (selection === 'Launch Zen Planner') {
          vscode.window.showInformationMessage('Zen Planner: Analyzing tasks and generating plan...');
          // In a full implementation, this would invoke Zen Planner agent
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.guidanceExecution', async () => {
      const message = 'Guidance & Execution: Guide AI through implementation.\n\nThis phase:\n1. Shows real-time AI progress\n2. Allows course correction\n3. Executes Auto Zen agent loop\n\nStart execution?';
      await vscode.window.showInformationMessage(message, 'Start Auto Zen', 'Show Status', 'Cancel').then((selection) => {
        if (selection === 'Start Auto Zen') {
          void vscode.commands.executeCommand('copilot-orchestrator.startAutoLoop');
        } else if (selection === 'Show Status') {
          void vscode.commands.executeCommand('copilot-orchestrator.showPanel');
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.reviewCompletion', async () => {
      const message = 'Review & Completion: Verify and complete tasks.\n\nActions:\n1. Review implementation\n2. Run tests\n3. Mark tasks as complete\n4. Update documentation';
      await vscode.window.showInformationMessage(message, 'Open Orchestrator Panel', 'Show Tasks').then((selection) => {
        if (selection === 'Open Orchestrator Panel') {
          void vscode.commands.executeCommand('copilot-orchestrator.showPanel');
        } else if (selection === 'Show Tasks') {
          void vscode.commands.executeCommand('copilot-orchestrator.refreshTasks');
        }
      });
    })
  );

  // Initial load of tasks
  treeDataProvider
    .refreshFromDisk()
    .catch((error) => vscode.window.showErrorMessage(`Failed to load tasks: ${error instanceof Error ? error.message : String(error)}`));

  // Initialize LLM status indicator and refresh on configuration changes
  refreshLlmStatus();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('copilot-orchestrator.llm') || event.affectsConfiguration('copilot-orchestrator.taskRoots')) {
        refreshLlmStatus();
      }

      // Handle MCP configuration changes - invalidate MCPClient singleton cache
      if (event.affectsConfiguration('copilot-orchestrator.mcp')) {
        console.log('[Extension] MCP configuration changed - invalidating MCPClient cache');
        MCPClient.invalidateInstance();
        // Note: New configuration will be applied on next MCP request
      }
    })
  );
}

export function deactivate() {
  // Cleanup WebSocket connection on extension deactivation
  disposeWebSocketClient();
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

class ActionTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly commandId: string,
    description?: string,
    icon?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.command = {
      command: commandId,
      title: label,
    };
    this.iconPath = new vscode.ThemeIcon(icon || 'chevron-right');
    this.contextValue = 'copilotOrchestratorAction';
  }
}

class SectionTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly children: vscode.TreeItem[],
    icon?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon(icon || 'folder');
    this.contextValue = 'copilotOrchestratorSection';
  }
}

class OrchestratorStatusProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> =
    new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private tasks: ParsedTask[] = [];
  private taskSource: string = 'unknown';

  constructor(private readonly context: vscode.ExtensionContext) { }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    // Handle task children
    if (element instanceof TaskTreeItem) {
      return element.task.subtasks.map((task) => new TaskTreeItem(task));
    }

    // Handle section children
    if (element instanceof SectionTreeItem) {
      return element.children;
    }

    // Root level - show sections
    if (!element) {
      const sections: vscode.TreeItem[] = [];

      // Agent Loop Controls Section
      sections.push(new SectionTreeItem(
        '🤖 Agent Loop Controls',
        [
          new ActionTreeItem('▶️ Start Auto Loop', 'copilot-orchestrator.startAutoLoop', 'Start continuous agent switching', 'play'),
          new ActionTreeItem('⏸️ Stop Auto Loop', 'copilot-orchestrator.stopAutoLoop', 'Stop the agent loop', 'debug-stop'),
          new ActionTreeItem('📊 Loop Status', 'copilot-orchestrator.autoLoopStatus', 'View loop statistics', 'info'),
          new ActionTreeItem('⚡ Execute Single Cycle', 'copilot-orchestrator.executeSingleCycle', 'Run one cycle', 'debug-step-into'),
        ],
        'debug-alt'
      ));

      // Settings & Configuration Section
      sections.push(new SectionTreeItem(
        '⚙️ Settings & Configuration',
        [
          new ActionTreeItem('🔧 Configure LLM', 'copilot-orchestrator.configureLLM', 'Set up LLM provider', 'settings-gear'),
          new ActionTreeItem('🔌 Test LLM Connection', 'copilot-orchestrator.testConnection', 'Verify LLM connectivity', 'plug'),
          new ActionTreeItem('🎯 Execute LLM Task', 'copilot-orchestrator.executeLLM', 'Run LLM prompt', 'play-circle'),
          new ActionTreeItem('📡 Configure WebSocket', 'copilot-orchestrator.configureWebSocket', 'Set up WebSocket connection', 'server'),
          new ActionTreeItem('🔗 Connection Details', 'copilot-orchestrator.showConnectionDetails', 'View connection status', 'info'),
        ],
        'gear'
      ));

      // Tools & Visualization Section
      sections.push(new SectionTreeItem(
        '🛠️ Tools & Visualization',
        [
          new ActionTreeItem('📊 Show Task Graph', 'copilot-orchestrator.showGraph', 'Visualize task dependencies', 'graph'),
          new ActionTreeItem('🔗 Show Dependencies', 'copilot-orchestrator.showDependencies', 'View dependency tree', 'references'),
          new ActionTreeItem('🎛️ Open Orchestrator Panel', 'copilot-orchestrator.showPanel', 'Full orchestrator dashboard', 'dashboard'),
          new ActionTreeItem('👁️ Visual Verification', 'copilot-orchestrator.showVisualVerification', 'Visual verification panel', 'eye'),
          new ActionTreeItem('📋 Audit Dashboard', 'copilot-orchestrator.showAuditDashboard', 'View audit dashboard', 'report'),
          new ActionTreeItem('🔄 Refresh Tasks', 'copilot-orchestrator.refreshTasks', 'Reload tasks from disk', 'refresh'),
        ],
        'tools'
      ));

      // Planning & Workflow Section
      sections.push(new SectionTreeItem(
        '🗂️ Planning & Workflow',
        [
          new ActionTreeItem('📐 Planning Phase', 'copilot-orchestrator.planningPhase', 'Define task scope and dependencies', 'pencil'),
          new ActionTreeItem('✏️ Open Plan Builder', 'copilot-orchestrator.openPlanBuilder', 'Interactive plan builder', 'pencil'),
          new ActionTreeItem('🧠 AI Development Planning', 'copilot-orchestrator.aiDevPlanning', 'Generate AI-driven development plan', 'lightbulb'),
          new ActionTreeItem('🔄 Detect Plan Drift', 'copilot-orchestrator.detectPlanDrift', 'Check for plan changes', 'issues'),
          new ActionTreeItem('🪄 Plan Adjustment Wizard', 'copilot-orchestrator.openPlanAdjustmentWizard', 'Adjust plan interactively', 'wand'),
          new ActionTreeItem('🎯 Guidance & Execution', 'copilot-orchestrator.guidanceExecution', 'Guide AI through implementation', 'rocket'),
          new ActionTreeItem('✅ Review & Completion', 'copilot-orchestrator.reviewCompletion', 'Review and mark tasks complete', 'check'),
        ],
        'organization'
      ));

      // Tasks Section
      const taskItems: vscode.TreeItem[] = [];
      if (!this.tasks.length) {
        const source = this.taskSource === 'error' ? 'Failed to load tasks' :
          this.taskSource === 'workspace' ? 'No workspace tasks found' :
            'No bundled tasks found';
        taskItems.push(new TaskTreeItem({
          id: 'no-tasks',
          title: 'No tasks found',
          description: source,
          dependencies: [],
          assignees: [],
          labels: [],
          subtasks: [],
          rawFrontMatter: {},
        }));
      } else {
        taskItems.push(...this.tasks.map((task) => new TaskTreeItem(task)));
      }

      sections.push(new SectionTreeItem(
        '📋 Tasks',
        taskItems,
        'list-unordered'
      ));

      return sections;
    }

    return [];
  }

  async refreshFromDisk(): Promise<void> {
    const config = readLlmConfig();
    const vsConfig = vscode.workspace.getConfiguration('copilot-orchestrator');
    const issueFolder = vsConfig.get<string>('task.issueFolder', '.vscode/github-issues');
    const taskRoots = [issueFolder, ...(config.config.taskRoots || ['_ZENTASKS'])];
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
