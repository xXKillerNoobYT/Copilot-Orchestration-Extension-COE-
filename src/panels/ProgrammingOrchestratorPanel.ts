/**
 * Programming Orchestrator Dashboard Panel (F024)
 * 
 * Real-time dashboard showing team status, metrics, and coordination toggles.
 * 
 * Features:
 * - 4 team status cards (Planning, Answer, Decomposition, Verification)
 * - Live metrics updated via WebSocket
 * - Coordination toggles (auto-decompose, visual verification, etc.)
 * - Plan selector dropdown
 * - Team configuration modals
 */

import * as vscode from 'vscode';
import { BossAICoordinator, AgentTeamState, SystemMetrics, CoordinationSettings } from '../orchestration/bossAI';
import { AgentTeam } from '../routing/taskRouter';

export class ProgrammingOrchestratorPanel {
    public static currentPanel: ProgrammingOrchestratorPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _coordinator: BossAICoordinator;
    private _updateInterval: NodeJS.Timeout | undefined;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, coordinator: BossAICoordinator) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._coordinator = coordinator;

        // Set webview HTML
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

        // Listen for panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );

        // Start live updates (every 500ms for <500ms latency target)
        this._startLiveUpdates();
    }

    /**
     * Create or show the Programming Orchestrator panel
     */
    public static createOrShow(extensionUri: vscode.Uri, coordinator?: BossAICoordinator): ProgrammingOrchestratorPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If panel already exists, show it
        if (ProgrammingOrchestratorPanel.currentPanel) {
            ProgrammingOrchestratorPanel.currentPanel._panel.reveal(column);
            return ProgrammingOrchestratorPanel.currentPanel;
        }

        // Create new panel
        const panel = vscode.window.createWebviewPanel(
            'programmingOrchestratorDashboard',
            'Programming Orchestrator',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')]
            }
        );

        // Use provided coordinator or create new one
        const activeCoordinator = coordinator || new BossAICoordinator();

        ProgrammingOrchestratorPanel.currentPanel = new ProgrammingOrchestratorPanel(
            panel,
            extensionUri,
            activeCoordinator
        );

        return ProgrammingOrchestratorPanel.currentPanel;
    }

    /**
     * Start live updates via periodic polling
     * WebSocket integration would replace this in production
     */
    private _startLiveUpdates(): void {
        // Update dashboard every 500ms (meets <500ms latency requirement)
        this._updateInterval = setInterval(() => {
            this._sendDashboardUpdate();
        }, 500);
    }

    /**
     * Send dashboard state to webview
     */
    private _sendDashboardUpdate(): void {
        const teamStates = this._coordinator.getTeamStates();
        const metrics = this._coordinator.getMetrics();
        const settings = this._coordinator.getSettings();

        this._panel.webview.postMessage({
            type: 'dashboardUpdate',
            data: {
                teamStates: Array.from(teamStates.values()),
                metrics,
                settings,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Handle messages from webview
     */
    private _handleMessage(message: any): void {
        switch (message.type) {
            case 'ready':
                // Webview is ready, send initial state
                this._sendDashboardUpdate();
                break;

            case 'updateSettings':
                // Update coordination settings
                this._coordinator.updateSettings(message.settings);
                this._sendDashboardUpdate();
                vscode.window.showInformationMessage('Coordination settings updated');
                break;

            case 'loadPlan':
                // Load a plan (placeholder - integrate with plan management)
                vscode.window.showInformationMessage(`Loading plan: ${message.planId}`);
                break;

            case 'refreshDashboard':
                // Force refresh
                this._sendDashboardUpdate();
                break;

            case 'configureTeam':
                // Open team configuration (placeholder)
                vscode.window.showInformationMessage(`Configure team: ${message.team}`);
                break;

            default:
                console.warn('[ProgrammingOrchestratorPanel] Unknown message type:', message.type);
        }
    }

    /**
     * Get HTML for webview
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Programming Orchestrator</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }

        .header {
            margin-bottom: 24px;
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 16px;
        }

        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .team-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            padding: 16px;
        }

        .team-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .team-name {
            font-size: 16px;
            font-weight: 600;
        }

        .team-status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .status-idle {
            background: var(--vscode-testing-iconSkipped);
            color: var(--vscode-editor-background);
        }

        .status-active {
            background: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
        }

        .status-error {
            background: var(--vscode-testing-iconFailed);
            color: var(--vscode-editor-background);
        }

        .team-info {
            margin-top: 12px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 13px;
        }

        .info-label {
            color: var(--vscode-descriptionForeground);
        }

        .info-value {
            font-weight: 500;
        }

        .metrics-section {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 24px;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 12px;
        }

        .metric-card {
            text-align: center;
        }

        .metric-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--vscode-charts-blue);
        }

        .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        .controls-section {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 24px;
        }

        .toggle-group {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-top: 12px;
        }

        .toggle-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .toggle-item input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .toggle-item label {
            cursor: pointer;
            font-size: 14px;
        }

        .plan-selector {
            margin-top: 16px;
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .plan-selector select {
            flex: 1;
            padding: 6px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 14px;
        }

        .button {
            padding: 6px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }

        .button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .last-update {
            text-align: right;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin-top: 16px;
        }

        h2 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Programming Orchestrator</h1>
        <div class="subtitle">Multi-agent coordination dashboard with live metrics</div>
    </div>

    <!-- Live Metrics -->
    <div class="metrics-section">
        <h2>📊 Live Metrics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value" id="metric-created">0</div>
                <div class="metric-label">Tasks Created</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="metric-completed">0</div>
                <div class="metric-label">Tasks Completed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="metric-verified">0</div>
                <div class="metric-label">Tasks Verified</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="metric-utilization">0%</div>
                <div class="metric-label">Agent Utilization</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="metric-completion">0%</div>
                <div class="metric-label">Completion Rate</div>
            </div>
        </div>
    </div>

    <!-- Team Status Cards -->
    <h2>👥 Agent Teams</h2>
    <div class="dashboard-grid" id="team-cards">
        <!-- Team cards will be inserted here dynamically -->
    </div>

    <!-- Coordination Controls -->
    <div class="controls-section">
        <h2>⚙️ Coordination Settings</h2>
        <div class="toggle-group">
            <div class="toggle-item">
                <input type="checkbox" id="toggle-auto-decompose" checked>
                <label for="toggle-auto-decompose">Auto-decompose complex tasks</label>
            </div>
            <div class="toggle-item">
                <input type="checkbox" id="toggle-visual-verification" checked>
                <label for="toggle-visual-verification">Require visual verification</label>
            </div>
            <div class="toggle-item">
                <input type="checkbox" id="toggle-multi-team" checked>
                <label for="toggle-multi-team">Multi-team handoff</label>
            </div>
            <div class="toggle-item">
                <input type="checkbox" id="toggle-parallel">
                <label for="toggle-parallel">Parallel execution</label>
            </div>
        </div>

        <div class="plan-selector">
            <label>Active Plan:</label>
            <select id="plan-select">
                <option value="">No plan selected</option>
                <option value="current">Current Plan</option>
            </select>
            <button class="button" id="btn-load-plan">Load</button>
            <button class="button" id="btn-refresh">Refresh</button>
        </div>
    </div>

    <div class="last-update">
        Last updated: <span id="last-update-time">Never</span>
    </div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();

            // Team card template
            function createTeamCard(teamState) {
                const statusClass = teamState.status.toLowerCase();
                const currentTaskTitle = teamState.currentTask?.title || 'None';
                const lastActivity = new Date(teamState.lastActivity).toLocaleTimeString();

                return \`
                    <div class="team-card">
                        <div class="team-header">
                            <div class="team-name">\${teamState.team}</div>
                            <div class="team-status status-\${statusClass}">\${teamState.status}</div>
                        </div>
                        <div class="team-info">
                            <div class="info-row">
                                <span class="info-label">Current Task:</span>
                                <span class="info-value">\${currentTaskTitle}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Tasks Completed:</span>
                                <span class="info-value">\${teamState.tasksCompleted}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Avg Response Time:</span>
                                <span class="info-value">\${Math.round(teamState.avgResponseTimeMs)}ms</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Last Activity:</span>
                                <span class="info-value">\${lastActivity}</span>
                            </div>
                        </div>
                    </div>
                \`;
            }

            // Update dashboard
            function updateDashboard(data) {
                // Update metrics
                document.getElementById('metric-created').textContent = data.metrics.tasksCreated;
                document.getElementById('metric-completed').textContent = data.metrics.tasksCompleted;
                document.getElementById('metric-verified').textContent = data.metrics.tasksVerified;
                document.getElementById('metric-utilization').textContent = Math.round(data.metrics.agentUtilization) + '%';
                document.getElementById('metric-completion').textContent = Math.round(data.metrics.completionRate) + '%';

                // Update team cards
                const teamCardsContainer = document.getElementById('team-cards');
                teamCardsContainer.innerHTML = data.teamStates.map(createTeamCard).join('');

                // Update settings toggles
                document.getElementById('toggle-auto-decompose').checked = data.settings.autoDecompose;
                document.getElementById('toggle-visual-verification').checked = data.settings.requireVisualVerification;
                document.getElementById('toggle-multi-team').checked = data.settings.multiTeamHandoff;
                document.getElementById('toggle-parallel').checked = data.settings.parallelExecution;

                // Update last update time
                document.getElementById('last-update-time').textContent = new Date(data.timestamp).toLocaleTimeString();
            }

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'dashboardUpdate':
                        updateDashboard(message.data);
                        break;
                }
            });

            // Event listeners for toggles
            ['auto-decompose', 'visual-verification', 'multi-team', 'parallel'].forEach(id => {
                document.getElementById(\`toggle-\${id}\`).addEventListener('change', function() {
                    const settings = {
                        autoDecompose: document.getElementById('toggle-auto-decompose').checked,
                        requireVisualVerification: document.getElementById('toggle-visual-verification').checked,
                        multiTeamHandoff: document.getElementById('toggle-multi-team').checked,
                        parallelExecution: document.getElementById('toggle-parallel').checked
                    };
                    vscode.postMessage({ type: 'updateSettings', settings });
                });
            });

            // Plan selector buttons
            document.getElementById('btn-load-plan').addEventListener('click', () => {
                const planId = document.getElementById('plan-select').value;
                vscode.postMessage({ type: 'loadPlan', planId });
            });

            document.getElementById('btn-refresh').addEventListener('click', () => {
                vscode.postMessage({ type: 'refreshDashboard' });
            });

            // Signal that webview is ready
            vscode.postMessage({ type: 'ready' });
        })();
    </script>
</body>
</html>`;
    }

    /**
     * Dispose panel and clean up resources
     */
    public dispose(): void {
        ProgrammingOrchestratorPanel.currentPanel = undefined;

        // Clear update interval
        if (this._updateInterval) {
            clearInterval(this._updateInterval);
            this._updateInterval = undefined;
        }

        // Dispose panel
        this._panel.dispose();

        // Dispose all disposables
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
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
