import * as vscode from 'vscode';
import * as path from 'path';
import { ParsedTask } from './taskParser';
import { TaskGraph, TaskGraphGenerator, exportToMermaid } from './taskGraphGenerator';
import { AgentProfile, defaultAgentProfileLoader } from './agentProfiles';

export interface MemoryEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ContextBundle {
  id: string;
  name: string;
  // File paths must be validated before being added to this array
  // Use validateFilePath() or validateAndFilterFilePaths() from utils/pathValidation
  // to ensure paths are valid URIs and files exist
  files: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  agentProfile?: {
    name: string;
    role: string;
    version: number;
    capabilities?: string[];
  };
  profileVersion?: string;
}

export class OrchestratorPanelProvider {
  public static currentPanel: OrchestratorPanelProvider | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  
  private tasks: ParsedTask[] = [];
  private taskGraph: TaskGraph | null = null;
  private agents: AgentProfile[] = [];
  private memory: MemoryEntry[] = [];
  private contextBundles: ContextBundle[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    tasks: ParsedTask[],
    memory?: MemoryEntry[],
    contextBundles?: ContextBundle[]
  ) {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (OrchestratorPanelProvider.currentPanel) {
      OrchestratorPanelProvider.currentPanel._panel.reveal(column);
      OrchestratorPanelProvider.currentPanel.updateData(tasks, memory, contextBundles);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'orchestratorPanel',
      'Orchestrator Panel',
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        retainContextWhenHidden: true,
      }
    );

    OrchestratorPanelProvider.currentPanel = new OrchestratorPanelProvider(
      panel,
      extensionUri,
      tasks,
      memory,
      contextBundles
    );
  }

  public constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    tasks: ParsedTask[],
    memory?: MemoryEntry[],
    contextBundles?: ContextBundle[]
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this.tasks = tasks;
    this.memory = memory || [];
    this.contextBundles = contextBundles || [];

    // Load agents
    this.loadAgents();

    // Generate task graph
    if (tasks.length > 0) {
      const generator = new TaskGraphGenerator(tasks);
      this.taskGraph = generator.generateGraph();
    }

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'selectTask':
            this.handleTaskSelection(message.taskId);
            break;
          case 'selectAgent':
            this.handleAgentSelection(message.agentName);
            break;
          case 'inspectBundle':
            this.handleBundleInspection(message.bundleId);
            break;
          case 'refreshGraph':
            this.refreshGraph();
            break;
          case 'executeTask':
            this.executeTask(message.taskId, message.source);
            break;
          case 'changeStatus':
            this.changeStatus(message.taskId, message.source);
            break;
          case 'openIssue':
            this.openIssue(message.issueUrl);
            break;
          case 'openContext':
            this.openContext(message.bundlePath);
            break;
          case 'getLoopStatus':
            void this.updateLiveStatus();
            break;
          case 'runCommand':
            if (message.id) {
              void vscode.commands.executeCommand(message.id);
            }
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private async loadAgents() {
    try {
      const agentNames = ['planner', 'architect', 'coder', 'tester', 'verifier', 'executor'];
      for (const name of agentNames) {
        const profile = await defaultAgentProfileLoader.loadProfile(name);
        if (profile) {
          this.agents.push(profile);
        }
      }
    } catch (error) {
      console.error('Failed to load agent profiles:', error);
    }
  }

  /**
   * Request live status from the backend and update the panel display
   */
  private async updateLiveStatus() {
    try {
      const backendUrl = vscode.workspace.getConfiguration('copilot-orchestrator').get<string>('backendUrl') || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/agent-loop/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        this._panel.webview.postMessage({
          command: 'updateLoopStatus',
          status: {
            running: false,
            error: `Failed to fetch status: ${response.status}`,
          },
        });
        return;
      }

      const data = await response.json() as any;
      const stats = data.stats || data;

      this._panel.webview.postMessage({
        command: 'updateLoopStatus',
        status: {
          running: stats.running || false,
          state: stats.state || 'idle',
          cycles: stats.cycles_executed || 0,
          successes: stats.successes || 0,
          errors: stats.errors || 0,
          avgTime: stats.avg_cycle_time || 0,
          currentTask: stats.current_task_id || 'none',
        },
      });
    } catch (error) {
      console.error('Error updating loop status:', error);
      this._panel.webview.postMessage({
        command: 'updateLoopStatus',
        status: {
          running: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  public updateData(tasks: ParsedTask[], memory?: MemoryEntry[], contextBundles?: ContextBundle[]) {
    this.tasks = tasks;
    if (memory) {
      this.memory = memory;
    }
    if (contextBundles) {
      this.contextBundles = contextBundles;
    }

    // Regenerate task graph
    if (tasks.length > 0) {
      const generator = new TaskGraphGenerator(tasks);
      this.taskGraph = generator.generateGraph();
    }

    this._update();
  }

  private handleTaskSelection(taskId: string) {
    vscode.window.showInformationMessage(`Task selected: ${taskId}`);
    // Future: Update context panel or trigger actions
  }

  private handleAgentSelection(agentName: string) {
    vscode.window.showInformationMessage(`Agent selected: ${agentName}`);
    // Future: Update agent context or prepare prompt
  }

  private handleBundleInspection(bundleId: string) {
    const bundle = this.contextBundles.find(b => b.id === bundleId);
    if (bundle) {
      vscode.window.showInformationMessage(`Inspecting bundle: ${bundle.name} (${bundle.files.length} files)`);
      // Future: Open bundle viewer or show file list
    }
  }

  private refreshGraph() {
    if (this.tasks.length > 0) {
      const generator = new TaskGraphGenerator(this.tasks);
      this.taskGraph = generator.generateGraph();
      this._update();
      vscode.window.showInformationMessage('Task graph refreshed');
    }
  }

  private async executeTask(taskId: string, source: string) {
    if (!source) {
      void vscode.window.showWarningMessage('Cannot execute task: missing source file path');
      return;
    }
    const uri = vscode.Uri.file(source);
    await vscode.commands.executeCommand('copilot-orchestrator.executeTask', uri, taskId);
  }

  private async changeStatus(taskId: string, source: string) {
    if (!source) {
      void vscode.window.showWarningMessage('Cannot change status: missing source file path');
      return;
    }
    const uri = vscode.Uri.file(source);
    await vscode.commands.executeCommand('copilot-orchestrator.changeTaskStatus', uri, taskId);
  }

  private async openIssue(issueUrl: string) {
    if (!issueUrl) {
      void vscode.window.showWarningMessage('No GitHub issue linked to this task');
      return;
    }
    await vscode.commands.executeCommand('copilot-orchestrator.openGitHubIssue', issueUrl);
  }

  private async openContext(bundlePath: string) {
    if (!bundlePath) {
      void vscode.window.showWarningMessage('No context bundle associated with this task');
      return;
    }
    await vscode.commands.executeCommand('copilot-orchestrator.openContextBundle', bundlePath);
  }

  public dispose() {
    OrchestratorPanelProvider.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.title = 'Orchestrator Panel';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  public _getHtmlForWebview(webview: vscode.Webview): string {
    // Prepare data for webview
    const tasksData = this.tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      type: task.type || 'feature',
      dependencies: task.dependencies,
      assignees: task.assignees,
      description: task.description,
      source: task.source || '',
      github_issue_url: task.github_issue_url || '',
      context_bundle: task.context_bundle || ''
    }));

    const agentsData = this.agents.map(agent => ({
      name: agent.name,
      role: agent.role,
      instructions: agent.instructions,
    }));

    const graphData = this.taskGraph
      ? {
          executionOrder: this.taskGraph.executionOrder,
          cycles: this.taskGraph.cycles,
          mermaid: exportToMermaid(this.taskGraph),
        }
      : null;

    const contextBundlesData = this.contextBundles.map(bundle => ({
      id: bundle.id,
      name: bundle.name,
      files: bundle.files,
      description: bundle.description,
    }));

    const memoryData = this.memory.slice(-10); // Last 10 entries

    // Use a nonce to only allow specific scripts to run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orchestrator Panel</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 16px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--vscode-foreground);
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 12px;
      color: var(--vscode-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 8px;
    }

    .section {
      margin-bottom: 24px;
      padding: 16px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .task-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .task-item {
      padding: 12px;
      margin-bottom: 8px;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .task-item:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    .task-item.selected {
      background-color: var(--vscode-list-activeSelectionBackground);
      border-color: var(--vscode-focusBorder);
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .task-title {
      font-weight: 600;
      font-size: 14px;
    }

    .task-badges {
      display: flex;
      gap: 6px;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .badge.status-pending { background-color: #6c757d; color: #fff; }
    .badge.status-in-progress { background-color: #0066cc; color: #fff; }
    .badge.status-completed { background-color: #28a745; color: #fff; }
    .badge.status-blocked { background-color: #dc3545; color: #fff; }
    .badge.status-review { background-color: #ffc107; color: #000; }

    .badge.priority-critical { background-color: #dc3545; color: #fff; }
    .badge.priority-high { background-color: #fd7e14; color: #fff; }
    .badge.priority-medium { background-color: #0066cc; color: #fff; }
    .badge.priority-low { background-color: #6c757d; color: #fff; }

    .task-meta {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .agent-selector {
      width: 100%;
      padding: 8px 12px;
      font-size: 14px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      cursor: pointer;
      outline: none;
    }

    .agent-selector:focus {
      border-color: var(--vscode-focusBorder);
    }

    .graph-viewer {
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 16px;
      min-height: 300px;
      overflow: auto;
    }

    .graph-placeholder {
      color: var(--vscode-descriptionForeground);
      text-align: center;
      padding: 40px;
      font-style: italic;
    }

    .mermaid-diagram {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre;
      overflow-x: auto;
      background-color: var(--vscode-textCodeBlock-background);
      padding: 12px;
      border-radius: 4px;
    }

    .bundle-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .bundle-item {
      padding: 10px;
      margin-bottom: 8px;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .bundle-item:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    .bundle-name {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .bundle-info {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .memory-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .memory-entry {
      padding: 8px;
      margin-bottom: 6px;
      background-color: var(--vscode-editor-background);
      border-left: 3px solid var(--vscode-input-border);
      border-radius: 2px;
      font-size: 12px;
    }

    .memory-entry.role-user {
      border-left-color: #0066cc;
    }

    .memory-entry.role-assistant {
      border-left-color: #28a745;
    }

    .memory-entry.role-system {
      border-left-color: #ffc107;
    }

    .memory-role {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
      margin-bottom: 4px;
    }

    .btn {
      padding: 6px 12px;
      font-size: 13px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .stats {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .stat-card {
      flex: 1;
      min-width: 120px;
      padding: 12px;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      text-align: center;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .stat-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Copilot Orchestrator Panel</h1>

    <!-- Orchestrator Controls -->
    <div class="section" style="margin-top: 8px;">
      <h2>⚙️ Orchestrator Controls</h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <button class="btn" onclick="handleStartLoop()">Start Loop</button>
        <button class="btn" onclick="handleStopLoop()">Stop Loop</button>
        <button class="btn" onclick="handleAutoLoopStatus()">Show Loop Status</button>
        <button class="btn" onclick="handleExecuteSingleCycle()">Execute Single Cycle</button>
      </div>
      <div id="loop-status-inline" style="margin-top:10px; font-size:12px; color: var(--vscode-descriptionForeground);"></div>
    </div>

    <!-- Statistics -->
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value" id="stat-total">0</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-completed">0</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-in-progress">0</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-blocked">0</div>
        <div class="stat-label">Blocked</div>
      </div>
    </div>

    <div class="grid">
      <!-- Section 1: Task List -->
      <div class="section">
        <h2>📋 Tasks</h2>
        <div class="task-list" id="task-list">
          <!-- Tasks will be populated here -->
        </div>
      </div>

      <!-- Section 2: Agent Selector -->
      <div class="section">
        <h2>🤖 Agent Selector</h2>
        <select class="agent-selector" id="agent-selector">
          <option value="">-- Select Agent --</option>
        </select>
        <div style="margin-top: 12px; padding: 12px; background-color: var(--vscode-editor-background); border-radius: 4px; min-height: 100px;">
          <div id="agent-details" style="font-size: 12px; color: var(--vscode-descriptionForeground);">
            Select an agent to view details
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Task Graph Viewer -->
    <div class="section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h2 style="margin: 0;">📊 Task Graph</h2>
        <button class="btn" onclick="handleRefreshGraph()">Refresh Graph</button>
      </div>
      <div class="graph-viewer" id="graph-viewer">
        <!-- Graph will be populated here -->
      </div>
    </div>

    <!-- Section 4: Context Bundle Inspector -->
    <div class="grid">
      <div class="section">
        <h2>📦 Context Bundles</h2>
        <div class="bundle-list" id="bundle-list">
          <!-- Bundles will be populated here -->
        </div>
      </div>

      <div class="section">
        <h2>🧠 Memory</h2>
        <div class="memory-list" id="memory-list">
          <!-- Memory entries will be populated here -->
        </div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Data from extension
    const tasksData = ${JSON.stringify(tasksData)};
    const agentsData = ${JSON.stringify(agentsData)};
    const graphData = ${JSON.stringify(graphData)};
    const bundlesData = ${JSON.stringify(contextBundlesData)};
    const memoryData = ${JSON.stringify(memoryData)};

    let selectedTaskId = null;
    let selectedAgentName = null;

    // Initialize UI
    function init() {
      renderStats();
      renderTasks();
      renderAgents();
      renderGraph();
      renderBundles();
      renderMemory();
    }

    function renderStats() {
      const total = tasksData.length;
      const completed = tasksData.filter(t => t.status === 'completed').length;
      const inProgress = tasksData.filter(t => t.status === 'in-progress' || t.status === 'in_progress').length;
      const blocked = tasksData.filter(t => t.status === 'blocked').length;

      document.getElementById('stat-total').textContent = total;
      document.getElementById('stat-completed').textContent = completed;
      document.getElementById('stat-in-progress').textContent = inProgress;
      document.getElementById('stat-blocked').textContent = blocked;
    }

    function renderTasks() {
      const container = document.getElementById('task-list');
      if (tasksData.length === 0) {
        container.innerHTML = '<div class="graph-placeholder">No tasks available</div>';
        return;
      }

      container.innerHTML = tasksData.map(task => {
        const statusClass = \`status-\${task.status.replace('_', '-')}\`;
        const priorityClass = \`priority-\${task.priority}\`;
        
        return \`
          <div class="task-item" data-task-id="\${task.id}" onclick="handleTaskClick('\${task.id}')">
            <div class="task-header">
              <div class="task-title">\${task.title}</div>
              <div class="task-badges">
                <span class="badge \${statusClass}">\${task.status}</span>
                <span class="badge \${priorityClass}">\${task.priority}</span>
              </div>
            </div>
            <div class="task-meta">
              ID: \${task.id} | Type: \${task.type}
              \${task.dependencies.length ? \` | Dependencies: \${task.dependencies.length}\` : ''}
            </div>
            <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn" onclick="handleExecute('\${task.id}', '\${task.source}')">Execute</button>
              <button class="btn" onclick="handleChangeStatus('\${task.id}', '\${task.source}')">Change Status</button>
              <button class="btn" onclick="handleOpenIssue('\${task.github_issue_url || ''}')">Open Issue</button>
              <button class="btn" onclick="handleOpenContext('\${task.context_bundle || ''}')">Open Context</button>
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderAgents() {
      const selector = document.getElementById('agent-selector');
      agentsData.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.name;
        option.textContent = \`\${agent.name} (\${agent.role})\`;
        selector.appendChild(option);
      });

      selector.addEventListener('change', (e) => {
        const agentName = e.target.value;
        if (agentName) {
          handleAgentSelect(agentName);
        }
      });
    }

    function renderGraph() {
      const container = document.getElementById('graph-viewer');
      if (!graphData || !graphData.mermaid) {
        container.innerHTML = '<div class="graph-placeholder">No graph data available</div>';
        return;
      }

      const executionInfo = graphData.executionOrder.map((level, idx) => 
        \`Level \${idx}: \${level.length} task(s)\`
      ).join(' | ');

      const cyclesInfo = graphData.cycles.length > 0 
        ? \`<div style="color: #dc3545; margin-bottom: 12px;">⚠️ Circular dependencies detected: \${graphData.cycles.length} cycle(s)</div>\`
        : '';

      container.innerHTML = \`
        \${cyclesInfo}
        <div style="margin-bottom: 12px; color: var(--vscode-descriptionForeground);">\${executionInfo}</div>
        <div class="mermaid-diagram">\${escapeHtml(graphData.mermaid)}</div>
      \`;
    }

    function renderBundles() {
      const container = document.getElementById('bundle-list');
      if (bundlesData.length === 0) {
        container.innerHTML = '<div class="graph-placeholder">No context bundles</div>';
        return;
      }

      container.innerHTML = bundlesData.map(bundle => \`
        <div class="bundle-item" onclick="handleBundleClick('\${bundle.id}')">
          <div class="bundle-name">\${bundle.name}</div>
          <div class="bundle-info">
            \${bundle.files.length} file(s)
            \${bundle.description ? \` - \${bundle.description}\` : ''}
          </div>
        </div>
      \`).join('');
    }

    function renderMemory() {
      const container = document.getElementById('memory-list');
      if (memoryData.length === 0) {
        container.innerHTML = '<div class="graph-placeholder">No memory entries</div>';
        return;
      }

      container.innerHTML = memoryData.map(entry => \`
        <div class="memory-entry role-\${entry.role}">
          <div class="memory-role">\${entry.role}</div>
          <div>\${escapeHtml(entry.content.substring(0, 200))}\${entry.content.length > 200 ? '...' : ''}</div>
        </div>
      \`).join('');
    }

    function handleTaskClick(taskId) {
      selectedTaskId = taskId;
      
      // Update UI
      document.querySelectorAll('.task-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.taskId === taskId);
      });

      // Notify extension
      vscode.postMessage({ command: 'selectTask', taskId });
    }

    function handleAgentSelect(agentName) {
      selectedAgentName = agentName;
      const agent = agentsData.find(a => a.name === agentName);
      
      if (agent) {
        const details = document.getElementById('agent-details');
        details.innerHTML = \`
          <div style="margin-bottom: 8px;"><strong>Role:</strong> \${agent.role}</div>
          <div><strong>Instructions:</strong></div>
          <div style="margin-top: 4px; white-space: pre-wrap;">\${escapeHtml(agent.instructions.substring(0, 300))}\${agent.instructions.length > 300 ? '...' : ''}</div>
        \`;
      }

      // Notify extension
      vscode.postMessage({ command: 'selectAgent', agentName });
    }

    function handleBundleClick(bundleId) {
      vscode.postMessage({ command: 'inspectBundle', bundleId });
    }

    function handleRefreshGraph() {
      vscode.postMessage({ command: 'refreshGraph' });
    }

    function handleExecute(taskId, source) {
      vscode.postMessage({ command: 'executeTask', taskId, source });
    }

    function handleChangeStatus(taskId, source) {
      vscode.postMessage({ command: 'changeStatus', taskId, source });
    }

    function handleOpenIssue(issueUrl) {
      vscode.postMessage({ command: 'openIssue', issueUrl });
    }

    function handleOpenContext(bundlePath) {
      vscode.postMessage({ command: 'openContext', bundlePath });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function handleStartLoop() {
      vscode.postMessage({ command: 'runCommand', id: 'copilot-orchestrator.startAutoLoop' });
      // Request live status updates after a brief delay
      setTimeout(() => pollLoopStatus(), 500);
    }
    function handleStopLoop() {
      vscode.postMessage({ command: 'runCommand', id: 'copilot-orchestrator.stopAutoLoop' });
      // Request status after stopping
      setTimeout(() => pollLoopStatus(), 500);
    }
    function handleAutoLoopStatus() {
      pollLoopStatus();
    }
    function handleExecuteSingleCycle() {
      vscode.postMessage({ command: 'runCommand', id: 'copilot-orchestrator.executeSingleCycle' });
      // Request status after cycle
      setTimeout(() => pollLoopStatus(), 1000);
    }

    /**
     * Poll the backend for live loop status and update the display
     */
    function pollLoopStatus() {
      vscode.postMessage({ command: 'getLoopStatus' });
    }

    /**
     * Handle incoming status updates from the backend
     */
    let loopStatusPoller = null;
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      if (message.command === 'updateLoopStatus') {
        updateLoopStatusDisplay(message.status);
      }
    });

    function updateLoopStatusDisplay(status) {
      const container = document.getElementById('loop-status-inline');
      if (!container) return;

      if (status.error) {
        container.innerHTML = '<div style="color: #dc3545;">⚠️ ' + escapeHtml(status.error) + '</div>';
        return;
      }

      const running = status.running ? '🟢' : '🔴';
      const state = status.state || 'idle';
      const cycles = status.cycles || 0;
      const successes = status.successes || 0;
      const errors = status.errors || 0;
      const avgTime = (status.avgTime || 0).toFixed(2);
      const currentTask = status.currentTask || 'none';

      container.innerHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 8px;">' +
        '<div style="padding: 8px; background-color: var(--vscode-editor-background); border-radius: 4px; border-left: 3px solid ' + (running === '🟢' ? '#28a745' : '#dc3545') + ';">' +
          '<div style="font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; margin-bottom: 4px;">Status</div>' +
          '<div style="font-size: 14px; font-weight: 600;">' + running + ' ' + state + '</div>' +
        '</div>' +
        '<div style="padding: 8px; background-color: var(--vscode-editor-background); border-radius: 4px; border-left: 3px solid #0275d8;">' +
          '<div style="font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; margin-bottom: 4px;">Cycles</div>' +
          '<div style="font-size: 14px; font-weight: 600;">' + cycles + '</div>' +
        '</div>' +
        '<div style="padding: 8px; background-color: var(--vscode-editor-background); border-radius: 4px; border-left: 3px solid #28a745;">' +
          '<div style="font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; margin-bottom: 4px;">Successes</div>' +
          '<div style="font-size: 14px; font-weight: 600;">' + successes + '</div>' +
        '</div>' +
        '<div style="padding: 8px; background-color: var(--vscode-editor-background); border-radius: 4px; border-left: 3px solid #dc3545;">' +
          '<div style="font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; margin-bottom: 4px;">Errors</div>' +
          '<div style="font-size: 14px; font-weight: 600;">' + errors + '</div>' +
        '</div>' +
        '<div style="padding: 8px; background-color: var(--vscode-editor-background); border-radius: 4px; border-left: 3px solid #ffc107;">' +
          '<div style="font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; margin-bottom: 4px;">Avg Time</div>' +
          '<div style="font-size: 14px; font-weight: 600;">' + avgTime + 'ms</div>' +
        '</div>' +
        '<div style="padding: 8px; background-color: var(--vscode-editor-background); border-radius: 4px; border-left: 3px solid #17a2b8;">' +
          '<div style="font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; margin-bottom: 4px;">Current Task</div>' +
          '<div style="font-size: 12px; font-weight: 600; word-break: break-all;">' + escapeHtml(currentTask) + '</div>' +
        '</div>' +
      '</div>';

      // Auto-refresh every 5 seconds if running
      if (status.running) {
        clearTimeout(loopStatusPoller);
        loopStatusPoller = setTimeout(() => pollLoopStatus(), 5000);
      } else {
        clearTimeout(loopStatusPoller);
      }
    }

    // Initialize on load
    init();
  </script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
