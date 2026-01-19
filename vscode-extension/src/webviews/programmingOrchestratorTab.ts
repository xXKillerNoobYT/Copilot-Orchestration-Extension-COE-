/**
 * Programming Orchestrator Tab Manager
 * Manages the Programming Orchestrator tab in the Settings Panel
 * 
 * Reference: Code Master notebook, Section 11.6 - Programming Orchestrator Tab
 * - Team cards: Planning, Answer, Decomposition, Verification (status, metrics, configure)
 * - Live data via WebSocket: task counts, blocked, verification pending, investigations, observations
 * - Coordination toggles: auto-decompose >60m, require visual verify for UI changes, auto-start server, pause on plan conflicts
 * - Plan selector: choose active plan (Docs/Plans/*)
 * - Actions: open Visual Verification panel, refresh team state, rerun impact analysis
 */

import * as vscode from 'vscode';

export interface TeamStatus {
  name: string;
  status: 'idle' | 'working' | 'blocked' | 'error';
  currentTask?: string;
  tasksCompleted: number;
  activeTaskCount: number;
  lastActivity?: string;
  metrics?: Record<string, any>;
}

export interface OrchestratorState {
  teamStatuses: {
    planning: TeamStatus;
    answer: TeamStatus;
    decomposition: TeamStatus;
    verification: TeamStatus;
  };
  queueCounts: {
    total: number;
    ready: number;
    blocked: number;
    verification: number;
    investigation: number;
  };
  coordination: {
    autoDecompose: boolean;
    requireVisualVerify: boolean;
    autoStartServer: boolean;
    pauseOnPlanConflict: boolean;
  };
  activePlan?: string;
  plans: string[];
}

export class ProgrammingOrchestratorManager {
  private static instance: ProgrammingOrchestratorManager;
  private state: OrchestratorState;
  private stateChangeEmitter = new vscode.EventEmitter<OrchestratorState>();
  readonly onStateChange = this.stateChangeEmitter.event;

  private constructor() {
    this.state = {
      teamStatuses: {
        planning: { name: 'Planning', status: 'idle', tasksCompleted: 0, activeTaskCount: 0 },
        answer: { name: 'Answer', status: 'idle', tasksCompleted: 0, activeTaskCount: 0 },
        decomposition: { name: 'Decomposition', status: 'idle', tasksCompleted: 0, activeTaskCount: 0 },
        verification: { name: 'Verification', status: 'idle', tasksCompleted: 0, activeTaskCount: 0 },
      },
      queueCounts: {
        total: 0,
        ready: 0,
        blocked: 0,
        verification: 0,
        investigation: 0,
      },
      coordination: {
        autoDecompose: true,
        requireVisualVerify: true,
        autoStartServer: false,
        pauseOnPlanConflict: true,
      },
      plans: [],
    };
  }

  static getInstance(): ProgrammingOrchestratorManager {
    if (!ProgrammingOrchestratorManager.instance) {
      ProgrammingOrchestratorManager.instance = new ProgrammingOrchestratorManager();
    }
    return ProgrammingOrchestratorManager.instance;
  }

  getState(): OrchestratorState {
    return this.state;
  }

  updateTeamStatus(team: keyof OrchestratorState['teamStatuses'], status: Partial<TeamStatus>): void {
    this.state.teamStatuses[team] = {
      ...this.state.teamStatuses[team],
      ...status,
      lastActivity: new Date().toISOString(),
    };
    this.stateChangeEmitter.fire(this.state);
  }

  updateQueueCounts(counts: Partial<OrchestratorState['queueCounts']>): void {
    this.state.queueCounts = { ...this.state.queueCounts, ...counts };
    this.stateChangeEmitter.fire(this.state);
  }

  updateCoordinationSettings(settings: Partial<OrchestratorState['coordination']>): void {
    this.state.coordination = { ...this.state.coordination, ...settings };
    this.stateChangeEmitter.fire(this.state);
  }

  setActivePlan(planName: string): void {
    this.state.activePlan = planName;
    this.stateChangeEmitter.fire(this.state);
  }

  updatePlans(plans: string[]): void {
    this.state.plans = plans;
    this.stateChangeEmitter.fire(this.state);
  }

  /**
   * Get team state for refresh operation
   */
  async getTeamState(): Promise<OrchestratorState['teamStatuses']> {
    // In production, this would call MCP endpoint: GET /api/v1/teams/status
    // For now, return current state with simulated refresh

    return {
      planning: {
        ...this.state.teamStatuses.planning,
        lastActivity: new Date().toISOString(),
      },
      answer: {
        ...this.state.teamStatuses.answer,
        lastActivity: new Date().toISOString(),
      },
      decomposition: {
        ...this.state.teamStatuses.decomposition,
        lastActivity: new Date().toISOString(),
      },
      verification: {
        ...this.state.teamStatuses.verification,
        lastActivity: new Date().toISOString(),
      },
    };
  }

  /**
   * Get active plan ID
   */
  getActivePlan(): string | undefined {
    return this.state.activePlan;
  }

  /**
   * Analyze impact of plan changes
   */
  async analyzeImpact(planId: string): Promise<{
    affectedTasks: number;
    affectedComponents: string[];
    estimatedHours: number;
    versionBump: 'major' | 'minor' | 'patch';
  }> {
    // In production, this would call MCP endpoint: POST /api/plans/{planId}/analyze-impact
    // For now, return simulated analysis

    return {
      affectedTasks: 5,
      affectedComponents: ['SettingsPanel', 'OrchestratorManager', 'TaskQueue'],
      estimatedHours: 3.5,
      versionBump: 'minor',
    };
  }

  /**
   * Generate HTML for the Programming Orchestrator tab
   */
  getTabHtml(): string {
    const state = this.state;

    const teamCard = (team: string, teamStatus: TeamStatus) => `
      <div class="team-card">
        <div class="team-header">
          <h3>${teamStatus.name} Team</h3>
          <span class="status-badge status-${teamStatus.status}">${teamStatus.status.toUpperCase()}</span>
        </div>
        <div class="team-metrics">
          <div class="metric">
            <span class="metric-label">Completed:</span>
            <span class="metric-value">${teamStatus.tasksCompleted}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Active:</span>
            <span class="metric-value">${teamStatus.activeTaskCount}</span>
          </div>
          ${teamStatus.currentTask ? `
            <div class="metric">
              <span class="metric-label">Current:</span>
              <span class="metric-value">${teamStatus.currentTask}</span>
            </div>
          ` : ''}
        </div>
        <button class="btn btn-secondary" data-action="configure-team" data-team="${team}">Configure</button>
      </div>
    `;

    return `
      <div id="orchestrator" class="tab-content">
        <div class="orchestrator-container">
          <!-- Queue Status -->
          <section class="queue-status">
            <h2>Queue Status</h2>
            <div class="status-grid">
              <div class="status-item">
                <span class="status-label">Total</span>
                <span class="status-count">${state.queueCounts.total}</span>
              </div>
              <div class="status-item ready">
                <span class="status-label">Ready</span>
                <span class="status-count">${state.queueCounts.ready}</span>
              </div>
              <div class="status-item blocked">
                <span class="status-label">Blocked</span>
                <span class="status-count">${state.queueCounts.blocked}</span>
              </div>
              <div class="status-item verification">
                <span class="status-label">Verification</span>
                <span class="status-count">${state.queueCounts.verification}</span>
              </div>
              <div class="status-item investigation">
                <span class="status-label">Investigation</span>
                <span class="status-count">${state.queueCounts.investigation}</span>
              </div>
            </div>
          </section>

          <!-- Team Status -->
          <section class="team-status">
            <h2>Agent Teams</h2>
            <div class="teams-grid">
              ${Object.entries(state.teamStatuses).map(([key, team]) => teamCard(key, team)).join('')}
            </div>
          </section>

          <!-- Coordination Settings -->
          <section class="coordination">
            <h2>Coordination Settings</h2>
            <div class="setting-group">
              <label class="setting-toggle">
                <input type="checkbox" ${state.coordination.autoDecompose ? 'checked' : ''} data-setting="autoDecompose">
                <span>Auto-decompose tasks > 60 minutes</span>
              </label>
              <label class="setting-toggle">
                <input type="checkbox" ${state.coordination.requireVisualVerify ? 'checked' : ''} data-setting="requireVisualVerify">
                <span>Require visual verification for UI changes</span>
              </label>
              <label class="setting-toggle">
                <input type="checkbox" ${state.coordination.autoStartServer ? 'checked' : ''} data-setting="autoStartServer">
                <span>Auto-start verification server</span>
              </label>
              <label class="setting-toggle">
                <input type="checkbox" ${state.coordination.pauseOnPlanConflict ? 'checked' : ''} data-setting="pauseOnPlanConflict">
                <span>Pause on plan conflicts</span>
              </label>
            </div>
          </section>

          <!-- Plan Selector -->
          <section class="plan-selector">
            <h2>Active Plan</h2>
            <select id="planSelect" data-action="select-plan">
              <option value="">No plan selected</option>
              ${state.plans.map(plan => `
                <option value="${plan}" ${state.activePlan === plan ? 'selected' : ''}>${plan}</option>
              `).join('')}
            </select>
          </section>

          <!-- Actions -->
          <section class="actions">
            <button class="btn btn-primary" data-action="open-verification">Open Visual Verification</button>
            <button class="btn btn-secondary" data-action="refresh-teams">Refresh Team State</button>
            <button class="btn btn-secondary" data-action="rerun-analysis">Rerun Impact Analysis</button>
          </section>
        </div>

        <style>
          .orchestrator-container {
            display: grid;
            gap: 24px;
            margin-bottom: 24px;
          }

          .orchestrator-container section h2 {
            color: var(--vscode-titleBar-activeForeground);
            margin-bottom: 12px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
          }

          .status-item {
            padding: 12px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            text-align: center;
          }

          .status-item.ready {
            border-left: 3px solid #4ec9b0;
          }

          .status-item.blocked {
            border-left: 3px solid #ce9178;
          }

          .status-item.verification {
            border-left: 3px solid #646695;
          }

          .status-item.investigation {
            border-left: 3px solid #dcdcaa;
          }

          .status-label {
            display: block;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
          }

          .status-count {
            display: block;
            font-size: 20px;
            font-weight: bold;
            color: var(--vscode-foreground);
          }

          .teams-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          .team-card {
            padding: 16px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
          }

          .team-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .team-header h3 {
            margin: 0;
            font-size: 14px;
            color: var(--vscode-foreground);
          }

          .status-badge {
            padding: 4px 8px;
            border-radius: 2px;
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
          }

          .status-badge.status-idle {
            background: #888888;
            color: white;
          }

          .status-badge.status-working {
            background: #4ec9b0;
            color: white;
          }

          .status-badge.status-blocked {
            background: #ce9178;
            color: white;
          }

          .status-badge.status-error {
            background: #f48771;
            color: white;
          }

          .team-metrics {
            margin-bottom: 12px;
          }

          .metric {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 4px;
            padding-bottom: 4px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }

          .metric-label {
            color: var(--vscode-descriptionForeground);
          }

          .metric-value {
            color: var(--vscode-foreground);
            font-weight: 500;
          }

          .setting-group {
            display: grid;
            gap: 12px;
          }

          .setting-toggle {
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 8px;
            border-radius: 2px;
            transition: background 0.2s;
          }

          .setting-toggle:hover {
            background: var(--vscode-list-hoverBackground);
          }

          .setting-toggle input {
            margin-right: 8px;
            cursor: pointer;
          }

          .setting-toggle span {
            user-select: none;
          }

          #planSelect {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 2px;
            font-family: inherit;
          }

          .actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          /* Team Configuration Modal */
          .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
          }

          .modal.active {
            display: flex;
          }

          .modal-content {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }

          .modal-header h2 {
            margin: 0;
            color: var(--vscode-titleBar-activeForeground);
            font-size: 16px;
          }

          .modal-close {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-close:hover {
            background: var(--vscode-list-hoverBackground);
          }

          .modal-section {
            margin-bottom: 20px;
          }

          .modal-section label {
            display: block;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
            font-size: 12px;
            font-weight: 500;
          }

          .modal-section textarea {
            width: 100%;
            min-height: 200px;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: 'Courier New', monospace;
            font-size: 12px;
            border-radius: 2px;
            resize: vertical;
          }

          .permissions-list {
            display: grid;
            gap: 10px;
          }

          .permission-item {
            display: flex;
            align-items: center;
            padding: 8px;
            background: var(--vscode-list-background);
            border-radius: 2px;
          }

          .permission-item input {
            margin-right: 8px;
            cursor: pointer;
          }

          .permission-item label {
            margin: 0;
            flex: 1;
            cursor: pointer;
            font-size: 12px;
          }

          .modal-footer {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
          }

          .btn-modal {
            padding: 8px 16px;
            border-radius: 2px;
            border: none;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
          }

          .btn-modal.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }

          .btn-modal.primary:hover {
            background: var(--vscode-button-hoverBackground);
          }

          .btn-modal.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }

          .btn-modal.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }
        </style>

        <!-- Team Configuration Modal -->
        <div id="teamConfigModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Configure <span id="teamModalTitle">Planning</span> Team</h2>
              <button class="modal-close" id="modalClose">×</button>
            </div>

            <div class="modal-section">
              <label for="profileYaml">Agent Profile (YAML)</label>
              <textarea id="profileYaml" placeholder="Enter YAML profile configuration..."></textarea>
            </div>

            <div class="modal-section">
              <label>Permissions</label>
              <div class="permissions-list">
                <div class="permission-item">
                  <input type="checkbox" id="perm-read" checked>
                  <label for="perm-read">Read files and context</label>
                </div>
                <div class="permission-item">
                  <input type="checkbox" id="perm-write">
                  <label for="perm-write">Write files and code changes</label>
                </div>
                <div class="permission-item">
                  <input type="checkbox" id="perm-execute">
                  <label for="perm-execute">Execute commands</label>
                </div>
                <div class="permission-item">
                  <input type="checkbox" id="perm-test">
                  <label for="perm-test">Run tests</label>
                </div>
                <div class="permission-item">
                  <input type="checkbox" id="perm-approve">
                  <label for="perm-approve">Approve task completion</label>
                </div>
              </div>
            </div>

            <div class="modal-section">
              <label for="maxDepth">Max Task Depth</label>
              <input type="number" id="maxDepth" min="1" max="10" value="3" style="width: 100%; padding: 8px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground);">
            </div>

            <div class="modal-section">
              <label for="timeout">Execution Timeout (seconds)</label>
              <input type="number" id="timeout" min="10" max="3600" value="300" style="width: 100%; padding: 8px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground);">
            </div>

            <div class="modal-footer">
              <button class="btn-modal secondary" id="modalCancel">Cancel</button>
              <button class="btn-modal primary" id="modalSave">Save Configuration</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
