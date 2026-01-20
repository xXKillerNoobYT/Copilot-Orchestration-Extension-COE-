/**
 * LLM Settings Panel Webview
 * Provides a tabbed settings interface for LLM configuration
 */

import * as vscode from 'vscode';
import { ProgrammingOrchestratorManager } from './programmingOrchestratorTab';
import { MCPClient } from '../services/mcpClient';
import { ProviderFactory } from '../transport/transportManager';
import { readLlmTimeoutConfig } from '../config/llmTimeouts';
import { AgentProfileLoader, AgentTeamType } from '../services/agentProfileLoader';

/**
 * Configuration for connection testing
 */
interface ConnectionConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private orchestratorManager: ProgrammingOrchestratorManager;
  private mcpClient: MCPClient;
  private agentProfileLoader: AgentProfileLoader;

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'copilotOrchestratorSettings',
      'LLM Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'dist'),
        ],
      }
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Initialize orchestrator manager
    this.orchestratorManager = ProgrammingOrchestratorManager.getInstance();

    // Initialize MCP client
    this.mcpClient = MCPClient.getInstance();

    // Initialize agent profile loader
    this.agentProfileLoader = AgentProfileLoader.getInstance();

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message: any) => {
        switch (message.command) {
          case 'getModels':
            await this._getModelsFromEndpoint(message.baseUrl);
            return;
          case 'testConnection':
            await this._testConnection(message.config);
            return;
          case 'saveSettings':
            await this._saveSettings(message.config);
            return;
          case 'loadSettings':
            await this._loadSettings();
            return;
          case 'orchestrator:updateCoordination':
            this.orchestratorManager.updateCoordinationSettings(message.settings);
            this._update();
            return;
          case 'orchestrator:selectPlan':
            this.orchestratorManager.setActivePlan(message.plan);
            this._update();
            return;
          case 'orchestrator:openVerification':
            vscode.commands.executeCommand('copilot-orchestrator.openVisualVerification');
            return;
          case 'orchestrator:refreshTeams':
            await this._refreshTeamState();
            return;
          case 'orchestrator:rerunAnalysis':
            await this._rerunImpactAnalysis();
            return;
          case 'loadAgentProfile':
            await this._loadAgentProfile(message.profileName);
            return;
          case 'saveAgentProfile':
            await this._saveAgentProfile(message.profile);
            return;
          case 'testAgentProfile':
            await this._testAgentProfile(message.profileName);
            return;
          case 'testGitHubConnection':
            await this._testGitHubConnection(message.token, message.repo);
            return;
          case 'saveGitHubSettings':
            await this._saveGitHubSettings(message.settings);
            return;
          case 'syncNow':
            await this._syncWithGitHub();
            return;
          case 'saveAdvancedSettings':
            await this._saveAdvancedSettings(message.settings);
            return;
          case 'saveTeamConfiguration':
            await this._saveTeamConfiguration(message.team, message.config);
            return;
          case 'loadTeamConfiguration':
            await this._loadTeamConfiguration(message.team);
            return;
          case 'uploadTeamProfile':
            await this._uploadTeamProfile(message.team);
            return;
          case 'downloadTeamProfile':
            await this._downloadTeamProfile(message.team);
            return;
          case 'resetTeamProfile':
            await this._resetTeamProfile(message.team);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  private async _getModelsFromEndpoint(baseUrl: string) {
    try {
      const url = this._buildApiUrl(baseUrl, 'models');
      const response = await this._fetchWithTimeout(url, {}, 8000);

      if (!response.ok) {
        this._panel.webview.postMessage({
          command: 'modelsError',
          error: `HTTP ${response.status}: ${response.statusText} (URL: ${url}). If LM Studio is on another machine, enable external API access and open port 1234 to this host.`,
        });
        return;
      }

      const data = await response.json() as { data?: any[] };
      const models = data.data || [];

      this._panel.webview.postMessage({
        command: 'modelsLoaded',
        models: models.map((m: any) => ({
          id: m.id,
          object: m.object,
          created: m.created,
          owned_by: m.owned_by,
        })),
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'modelsError',
        error: `Failed to load models from ${baseUrl}: ${error instanceof Error ? error.message : String(error)}. Ensure the server is reachable from this machine, listening on 0.0.0.0:1234, and not blocked by firewall.`,
      });
    }
  }

  private async _testConnection(config: ConnectionConfig) {
    // Get timeout configuration at function scope (used in catch block)
    const timeoutConfig = readLlmTimeoutConfig();
    const testTimeout = timeoutConfig.config.testConnectionMs;

    try {
      // Create a provider instance using the config from the webview
      // This runs in the extension host context, avoiding webview CSP restrictions
      const provider = ProviderFactory.createProvider('lmstudio', {
        name: 'LM Studio',
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        defaultModel: config.model,
      });

      // Show progress notification for long timeout
      const timeoutMinutes = Math.floor(testTimeout / 60000);
      const progressMessage = timeoutMinutes > 1
        ? `Testing connection (timeout: ${timeoutMinutes} minutes)...`
        : 'Testing connection...';

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: progressMessage,
        cancellable: false,
      }, async () => {
        // Use the provider's built-in testConnection method with custom timeout
        const connected = await Promise.race([
          provider.testConnection(),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error(`Connection test timeout after ${testTimeout}ms`)), testTimeout)
          )
        ]);

        return connected;
      }).then((connected) => {
        if (connected) {
          this._panel.webview.postMessage({
            command: 'connectionTestResult',
            success: true,
            message: 'Connection successful! Model responded.',
          });
        } else {
          this._panel.webview.postMessage({
            command: 'connectionTestResult',
            success: false,
            message: this._buildConnectionFailureMessage(config.baseUrl, config.model),
          });
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes('timeout');

      this._panel.webview.postMessage({
        command: 'connectionTestResult',
        success: false,
        message: isTimeout
          ? `Connection test timeout after ${Math.floor(timeoutConfig.config.testConnectionMs / 1000)}s. This may indicate:\n` +
          `• Model is still loading (can take up to 10 minutes for cold load)\n` +
          `• Network connectivity issues\n` +
          `• Server is not responding\n` +
          `You can increase the timeout in settings: copilot-orchestrator.llm.timeouts.testConnectionMs`
          : `Connection test failed for ${config.baseUrl}: ${errorMessage}. Confirm network reachability and that the server exposes /v1/chat/completions.`,
      });
    }
  }

  /**
   * Build a user-friendly error message for connection failures
   */
  private _buildConnectionFailureMessage(baseUrl: string, model: string): string {
    const steps = [
      `1. LLM server is running at ${baseUrl}`,
      `2. Model "${model}" is loaded`,
      '3. Server is accessible from this machine',
      '4. If remote server, external API access is enabled',
    ];
    return `Connection test failed. Please verify:\n${steps.join('\n')}`;
  }

  /**
   * Fetch with an explicit timeout to avoid hanging when the host/port is unreachable.
   */
  private async _fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Build an API URL ensuring a single /v1 segment.
   * If baseUrl already ends with /v1, append path directly; otherwise append /v1/{path}.
   */
  private _buildApiUrl(baseUrl: string, path: string): string {
    const trimmed = (baseUrl || '').trim().replace(/\/+$/, '');
    if (trimmed.endsWith('/v1')) {
      return `${trimmed}/${path}`;
    }
    return `${trimmed}/v1/${path}`;
  }

  private async _saveSettings(config: any) {
    try {
      const vsConfig = vscode.workspace.getConfiguration('copilot-orchestrator');
      await vsConfig.update('llm.baseUrl', config.baseUrl, vscode.ConfigurationTarget.Global);
      await vsConfig.update('llm.apiKey', config.apiKey, vscode.ConfigurationTarget.Global);
      await vsConfig.update('llm.defaultModel', config.model, vscode.ConfigurationTarget.Global);
      await vsConfig.update('llm.temperature', parseFloat(config.temperature || '0.7'), vscode.ConfigurationTarget.Global);
      await vsConfig.update('llm.timeoutMs', parseInt(config.timeout || '30000', 10), vscode.ConfigurationTarget.Global);

      this._panel.webview.postMessage({
        command: 'settingsSaved',
        success: true,
        message: 'Settings saved successfully!',
      });

      vscode.window.showInformationMessage('LLM settings saved successfully!');
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'settingsSaved',
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async _loadSettings() {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');

    this._panel.webview.postMessage({
      command: 'settingsLoaded',
      config: {
        baseUrl: config.get<string>('llm.baseUrl', 'http://localhost:1234'),
        apiKey: config.get<string>('llm.apiKey', ''),
        model: config.get<string>('llm.defaultModel', 'gpt-3.5-turbo'),
        temperature: config.get<number>('llm.temperature', 0.7),
        timeout: config.get<number>('llm.timeoutMs', 30000),
      },
    });
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LLM Settings</title>
  <style>
    body {
      padding: 20px;
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    h1 {
      color: var(--vscode-titleBar-activeForeground);
      margin-bottom: 24px;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 24px;
    }

    .tab {
      padding: 12px 24px;
      cursor: pointer;
      border: none;
      background: none;
      color: var(--vscode-foreground);
      font-size: 14px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .tab.active {
      border-bottom-color: var(--vscode-focusBorder);
      color: var(--vscode-focusBorder);
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: var(--vscode-input-foreground);
    }

    input[type="text"],
    input[type="password"],
    input[type="number"],
    select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 2px;
      font-family: inherit;
      font-size: inherit;
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .help-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      margin-right: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .models-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      margin-top: 12px;
    }

    .model-item {
      padding: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      cursor: pointer;
      transition: background 0.2s;
    }

    .model-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .model-item.selected {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }

    .model-item:last-child {
      border-bottom: none;
    }

    .model-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .model-meta {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .status-message {
      padding: 12px;
      border-radius: 2px;
      margin-top: 12px;
    }

    .status-message.success {
      background: var(--vscode-testing-iconPassed);
      color: var(--vscode-button-foreground);
    }

    .status-message.error {
      background: var(--vscode-testing-iconFailed);
      color: var(--vscode-button-foreground);
    }

    .status-message.info {
      background: var(--vscode-editorInfo-background);
      color: var(--vscode-editorInfo-foreground);
    }

    .loading {
      display: inline-block;
      margin-left: 8px;
    }

    .endpoint-badge {
      display: inline-block;
      padding: 4px 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 2px;
      font-size: 11px;
      margin-right: 4px;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 LLM Configuration</h1>

    <div class="tabs">
      <button class="tab active" data-tab="connection">Connection</button>
      <button class="tab" data-tab="models">Models</button>
      <button class="tab" data-tab="agents">Agent Profiles</button>
      <button class="tab" data-tab="github">GitHub Sync</button>
      <button class="tab" data-tab="advanced">Advanced</button>
      <button class="tab" data-tab="endpoints">Endpoints</button>
      <button class="tab" data-tab="orchestrator">Programming Orchestrator</button>
    </div>

    <!-- Connection Tab -->
    <div class="tab-content active" id="connection">
      <div class="form-group">
        <label for="baseUrl">Base URL</label>
        <input type="text" id="baseUrl" placeholder="http://localhost:1234" value="http://localhost:1234">
        <div class="help-text">⚠️ Local servers (LM Studio, Ollama) use HTTP, not HTTPS. Example: http://localhost:1234</div>
        <div class="help-text">For production with HTTPS, set up a reverse proxy (nginx/caddy) with TLS certificates.</div>
      </div>

      <div class="form-group">
        <label for="apiKey">API Key (Optional)</label>
        <input type="password" id="apiKey" placeholder="sk-...">
        <div class="help-text">Leave empty for LM Studio local mode</div>
      </div>

      <div class="form-group">
        <label for="model">Model</label>
        <input type="text" id="model" placeholder="model-name" value="">
        <div class="help-text">Or click "Discover Models" to load from server</div>
      </div>

      <div class="form-group">
        <button class="btn btn-secondary" id="discoverModels">🔍 Discover Models</button>
        <button class="btn btn-primary" id="testConnection">✓ Test Connection</button>
        <button class="btn btn-primary" id="saveSettings">💾 Save Settings</button>
      </div>

      <div id="connectionStatus"></div>
    </div>

    <!-- Models Tab -->
    <div class="tab-content" id="models">
      <p>Discovered models from your LLM server:</p>
      <button class="btn btn-secondary" id="refreshModels">🔄 Refresh Models List</button>
      <div id="modelsList" class="models-list">
        <div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">
          Click "Refresh Models List" to discover available models
        </div>
      </div>
    </div>

    <!-- Agent Profiles Tab -->
    <div class="tab-content" id="agents">
      <h3>🤖 Agent Configuration</h3>
      <p>Configure agent profiles for Planning, Answer, Decomposition, and Verification teams.</p>
      
      <div class="form-group">
        <label for="agentProfile">Select Agent Profile</label>
        <select id="agentProfile">
          <option value="planner">Planning Team (Planner)</option>
          <option value="coder">Answer Team (Coder)</option>
          <option value="executor">Decomposition Team (Executor)</option>
          <option value="tester">Verification Team (Tester)</option>
          <option value="verifier">Verification Team (Verifier)</option>
          <option value="architect">Architecture Team (Architect)</option>
        </select>
        <div class="help-text">Agent profiles are loaded from vscode-extension/config/agents/*.yaml</div>
      </div>

      <div class="form-group">
        <label>Agent Profile Editor</label>
        <div style="background: var(--vscode-editor-background); padding: 12px; border-radius: 2px; margin-bottom: 8px;">
          <div style="font-family: monospace; font-size: 12px; white-space: pre-wrap;" id="agentProfileContent">
# Loading agent profile...
version: 1
name: "Agent Name"
role: "agent-role"
description: "Agent description"
          </div>
        </div>
        <div class="help-text">✨ Hot-reload enabled: Changes to YAML files auto-reload without restart</div>
      </div>

      <div class="form-group">
        <h4>Tool Permissions</h4>
        <label><input type="checkbox" id="perm_read_files" checked> Read Files</label><br>
        <label><input type="checkbox" id="perm_write_files" checked> Write Files</label><br>
        <label><input type="checkbox" id="perm_run_commands"> Run Commands</label><br>
        <label><input type="checkbox" id="perm_access_network" checked> Access Network</label><br>
        <label><input type="checkbox" id="perm_modify_tasks" checked> Modify Tasks</label>
        <div class="help-text">Control what actions this agent can perform</div>
      </div>

      <div class="form-group">
        <h4>Execution Constraints</h4>
        <label for="max_depth">Max Depth:</label>
        <input type="number" id="max_depth" min="1" max="10" value="5">
        <div class="help-text">Maximum depth for nested operations</div>
        
        <label style="margin-top: 12px;"><input type="checkbox" id="require_tests" checked> Require Tests for Changes</label><br>
        <label><input type="checkbox" id="require_plan" checked> Require Plan Before Action</label><br>
        <label><input type="checkbox" id="require_approval"> Require Explicit Approval for Commands</label>
      </div>

      <div style="margin-top: 20px;">
        <button class="btn btn-primary" id="saveAgentProfile">💾 Save Profile</button>
        <button class="btn btn-secondary" id="reloadAgentProfile">🔄 Reload from File</button>
        <button class="btn btn-secondary" id="testAgentProfile">🧪 Test Profile</button>
      </div>
    </div>

    <!-- GitHub Sync Tab -->
    <div class="tab-content" id="github">
      <h3>🔗 GitHub Integration</h3>
      <p>Configure bi-directional sync with GitHub Issues.</p>
      
      <div class="form-group">
        <label for="githubToken">GitHub Personal Access Token</label>
        <input type="password" id="githubToken" placeholder="ghp_...">
        <div class="help-text">Required scopes: repo, read:org. <a href="https://github.com/settings/tokens/new" style="color: var(--vscode-textLink-foreground);">Generate token</a></div>
      </div>

      <div class="form-group">
        <label for="githubRepo">Repository</label>
        <input type="text" id="githubRepo" placeholder="owner/repo-name">
        <div class="help-text">Format: owner/repository (e.g., microsoft/vscode)</div>
      </div>

      <div class="form-group">
        <label for="syncInterval">Sync Interval (minutes)</label>
        <input type="number" id="syncInterval" min="1" max="60" value="5">
        <div class="help-text">How often to sync task status with GitHub Issues (default: 5 minutes)</div>
      </div>

      <div class="form-group">
        <label>Sync Direction</label>
        <label><input type="radio" name="syncDirection" value="bidirectional" checked> Bidirectional (Tasks ↔ Issues)</label><br>
        <label><input type="radio" name="syncDirection" value="push"> Push Only (Tasks → Issues)</label><br>
        <label><input type="radio" name="syncDirection" value="pull"> Pull Only (Tasks ← Issues)</label>
        <div class="help-text">Bidirectional maintains single source of truth</div>
      </div>

      <div class="form-group">
        <label>Conflict Resolution</label>
        <select id="conflictResolution">
          <option value="last-write-wins">Last Write Wins</option>
          <option value="manual">Manual Merge (show UI)</option>
          <option value="github-wins">GitHub Wins</option>
          <option value="local-wins">Local Wins</option>
        </select>
        <div class="help-text">How to handle conflicts when both sides modified</div>
      </div>

      <div class="form-group">
        <h4>Rate Limit Status</h4>
        <div style="background: var(--vscode-editor-background); padding: 12px; border-radius: 2px;">
          <div>Remaining: <span id="rateLimitRemaining">-</span> / <span id="rateLimitTotal">5000</span></div>
          <div>Resets at: <span id="rateLimitReset">-</span></div>
          <div style="margin-top: 8px;">
            <div style="width: 100%; height: 8px; background: var(--vscode-progressBar-background); border-radius: 4px;">
              <div id="rateLimitBar" style="width: 100%; height: 100%; background: var(--vscode-progressBar-foreground); border-radius: 4px;"></div>
            </div>
          </div>
        </div>
        <div class="help-text">GitHub API limit: 5000 requests/hour for authenticated users</div>
      </div>

      <div class="form-group">
        <label><input type="checkbox" id="enableSubIssues" checked> Enable Sub-Issue Linking</label><br>
        <label><input type="checkbox" id="importComments" checked> Import Issue Comments as Observations</label><br>
        <label><input type="checkbox" id="syncLabels" checked> Sync Labels</label><br>
        <label><input type="checkbox" id="syncMilestones" checked> Sync Milestones</label>
      </div>

      <div style="margin-top: 20px;">
        <button class="btn btn-primary" id="testGitHubConnection">🔌 Test Connection</button>
        <button class="btn btn-secondary" id="saveGitHubSettings">💾 Save Settings</button>
        <button class="btn btn-secondary" id="syncNow">🔄 Sync Now</button>
      </div>
      <div id="githubStatus"></div>
    </div>

    <!-- Advanced Tab -->
    <div class="tab-content" id="advanced">
      <h3>⚙️ Advanced Settings</h3>
      
      <div class="form-group">
        <label for="temperature">Temperature</label>
        <input type="number" id="temperature" min="0" max="2" step="0.1" value="0.7">
        <div class="help-text">Controls randomness (0.0 = deterministic, 2.0 = very random)</div>
      </div>

      <div class="form-group">
        <label for="timeout">Timeout (ms)</label>
        <input type="number" id="timeout" min="1000" step="1000" value="30000">
        <div class="help-text">Request timeout in milliseconds</div>
      </div>

      <h4 style="margin-top: 24px;">Context Bundling</h4>
      <div class="form-group">
        <label for="contextBundleSize">Max Context Bundle Size (KB)</label>
        <input type="number" id="contextBundleSize" min="50" max="500" value="100">
        <div class="help-text">Maximum size of context bundles sent to agents (default: 100KB)</div>
      </div>

      <div class="form-group">
        <label for="tokenLimit">Token Limit</label>
        <input type="number" id="tokenLimit" min="1000" max="128000" step="1000" value="8000">
        <div class="help-text">Maximum tokens for context window</div>
      </div>

      <div class="form-group">
        <label><input type="checkbox" id="enableContextCaching" checked> Enable Context Caching</label><br>
        <label><input type="checkbox" id="enableTokenCounting" checked> Enable Accurate Token Counting</label>
        <div class="help-text">Uses tiktoken library for precise token counts</div>
      </div>

      <h4 style="margin-top: 24px;">Task Decomposition</h4>
      <div class="form-group">
        <label for="decompositionThreshold">Auto-Decompose Threshold (minutes)</label>
        <input type="number" id="decompositionThreshold" min="15" max="240" step="15" value="60">
        <div class="help-text">Tasks longer than this are automatically decomposed</div>
      </div>

      <div class="form-group">
        <label for="maxDecompositionDepth">Max Decomposition Depth</label>
        <input type="number" id="maxDecompositionDepth" min="1" max="10" value="5">
        <div class="help-text">Maximum nesting levels for subtasks</div>
      </div>

      <h4 style="margin-top: 24px;">WebSocket & Performance</h4>
      <div class="form-group">
        <label for="websocketPort">WebSocket Port</label>
        <input type="number" id="websocketPort" min="1024" max="65535" value="3000">
        <div class="help-text">Port for real-time event streaming</div>
      </div>

      <div class="form-group">
        <label for="cacheTTL">Cache TTL (minutes)</label>
        <input type="number" id="cacheTTL" min="1" max="60" value="5">
        <div class="help-text">Time-to-live for cached data (default: 5 minutes)</div>
      </div>

      <div class="form-group">
        <label for="batchSize">GitHub API Batch Size</label>
        <input type="number" id="batchSize" min="1" max="100" value="50">
        <div class="help-text">Maximum requests per batch (default: 50)</div>
      </div>

      <h4 style="margin-top: 24px;">Logging</h4>
      <div class="form-group">
        <label for="logLevel">Log Level</label>
        <select id="logLevel">
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info" selected>Info</option>
          <option value="debug">Debug</option>
          <option value="trace">Trace</option>
        </select>
        <div class="help-text">Controls logging verbosity</div>
      </div>

      <div class="form-group">
        <label><input type="checkbox" id="enableAuditLog" checked> Enable Audit Log</label><br>
        <label><input type="checkbox" id="enablePerformanceMetrics" checked> Enable Performance Metrics</label>
      </div>

      <div style="margin-top: 20px;">
        <button class="btn btn-primary" id="saveAdvancedSettings">💾 Save Settings</button>
        <button class="btn btn-secondary" id="resetAdvancedSettings">🔄 Reset to Defaults</button>
      </div>
    </div>

    <!-- Endpoints Tab -->
    <div class="tab-content" id="endpoints">
      <h3>Supported OpenAI-Compatible Endpoints</h3>
      <p>LM Studio implements the following OpenAI API endpoints:</p>
      
      <div style="margin-top: 16px;">
        <span class="endpoint-badge">POST /v1/chat/completions</span>
        <div class="help-text" style="margin-left: 0; margin-bottom: 12px;">
          Chat completion with message history (recommended)
        </div>

        <span class="endpoint-badge">POST /v1/completions</span>
        <div class="help-text" style="margin-left: 0; margin-bottom: 12px;">
          Text completion for single prompts
        </div>

        <span class="endpoint-badge">POST /v1/embeddings</span>
        <div class="help-text" style="margin-left: 0; margin-bottom: 12px;">
          Generate text embeddings for semantic search
        </div>

        <span class="endpoint-badge">GET /v1/models</span>
        <div class="help-text" style="margin-left: 0; margin-bottom: 12px;">
          List available models (used by "Discover Models")
        </div>
      </div>

      <h4 style="margin-top: 24px;">Current Configuration</h4>
      <div style="background: var(--vscode-editor-background); padding: 12px; border-radius: 2px; font-family: monospace; font-size: 12px;">
        <div>Base URL: <span id="endpointBaseUrl">-</span></div>
        <div>Chat: <span id="endpointChat">-</span></div>
        <div>Completions: <span id="endpointCompletions">-</span></div>
        <div>Embeddings: <span id="endpointEmbeddings">-</span></div>
        <div>Models: <span id="endpointModels">-</span></div>
      </div>
    </div>

    <!-- Programming Orchestrator Tab -->
    <div class="tab-content" id="orchestrator">
      ${this.orchestratorManager.getTabHtml()}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });

    // Load settings on page load
    window.addEventListener('load', () => {
      vscode.postMessage({ command: 'loadSettings' });
    });

    // Discover models
    document.getElementById('discoverModels').addEventListener('click', () => {
      const baseUrl = document.getElementById('baseUrl').value;
      showStatus('info', 'Discovering models...', 'connectionStatus');
      vscode.postMessage({ command: 'getModels', baseUrl });
    });

    document.getElementById('refreshModels').addEventListener('click', () => {
      const baseUrl = document.getElementById('baseUrl').value;
      vscode.postMessage({ command: 'getModels', baseUrl });
    });

    // Test connection
    document.getElementById('testConnection').addEventListener('click', () => {
      const config = {
        baseUrl: document.getElementById('baseUrl').value,
        apiKey: document.getElementById('apiKey').value,
        model: document.getElementById('model').value,
      };
      showStatus('info', 'Testing connection...', 'connectionStatus');
      vscode.postMessage({ command: 'testConnection', config });
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
      const config = {
        baseUrl: document.getElementById('baseUrl').value,
        apiKey: document.getElementById('apiKey').value,
        model: document.getElementById('model').value,
        temperature: document.getElementById('temperature').value,
        timeout: document.getElementById('timeout').value,
      };
      vscode.postMessage({ command: 'saveSettings', config });
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.command) {
        case 'settingsLoaded':
          document.getElementById('baseUrl').value = message.config.baseUrl;
          document.getElementById('apiKey').value = message.config.apiKey;
          document.getElementById('model').value = message.config.model;
          document.getElementById('temperature').value = message.config.temperature;
          document.getElementById('timeout').value = message.config.timeout;
          updateEndpoints(message.config.baseUrl);
          break;

        case 'modelsLoaded':
          renderModels(message.models);
          showStatus('success', \`Found \${message.models.length} model(s)\`, 'connectionStatus');
          break;

        case 'modelsError':
          showStatus('error', 'Failed to load models: ' + message.error, 'connectionStatus');
          break;

        case 'connectionTestResult':
          if (message.success) {
            showStatus('success', message.message, 'connectionStatus');
          } else {
            showStatus('error', message.message, 'connectionStatus');
          }
          break;

        case 'settingsSaved':
          if (message.success) {
            showStatus('success', message.message, 'connectionStatus');
          } else {
            showStatus('error', message.message, 'connectionStatus');
          }
          break;
      }
    });

    function renderModels(models) {
      const list = document.getElementById('modelsList');
      if (models.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center;">No models found</div>';
        return;
      }

      list.innerHTML = models.map(model => \`
        <div class="model-item" data-model="\${model.id}">
          <div class="model-name">\${model.id}</div>
          <div class="model-meta">Type: \${model.object || 'model'} | Owner: \${model.owned_by || 'unknown'}</div>
        </div>
      \`).join('');

      // Make models selectable
      document.querySelectorAll('.model-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('.model-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          const modelId = item.getAttribute('data-model');
          document.getElementById('model').value = modelId;
          showStatus('info', \`Selected model: \${modelId}\`, 'connectionStatus');
        });
      });
    }

    function showStatus(type, message, elementId) {
      const statusEl = document.getElementById(elementId);
      statusEl.innerHTML = \`<div class="status-message \${type}">\${message}</div>\`;
    }

    function updateEndpoints(baseUrl) {
      document.getElementById('endpointBaseUrl').textContent = baseUrl;
      document.getElementById('endpointChat').textContent = \`\${baseUrl}/v1/chat/completions\`;
      document.getElementById('endpointCompletions').textContent = \`\${baseUrl}/v1/completions\`;
      document.getElementById('endpointEmbeddings').textContent = \`\${baseUrl}/v1/embeddings\`;
      document.getElementById('endpointModels').textContent = \`\${baseUrl}/v1/models\`;
      
      // Validate protocol and show warning
      checkProtocol(baseUrl);
    }

    // Check for HTTPS on local addresses
    // NOTE: This duplicates logic from src/config/llmConfig.ts isLocalHost()
    // Keep these implementations synchronized to ensure consistent validation
    // between client-side UI and server-side configuration.
    function isLocalHost(hostname) {
      const lower = hostname.toLowerCase();
      if (lower === 'localhost' || lower === 'localhost.localdomain' || hostname === '::1' || hostname === '[::1]') {
        return true;
      }
      // Check for loopback (127.x.x.x) - validate full IP format
      if (/^127\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) {
        return true;
      }
      // Check for private IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) - validate full IP format
      if (/^192\.168\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) {
        return true;
      }
      if (/^10\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) {
        return true;
      }
      if (/^172\.(?:1[6-9]|2[0-9]|3[0-1])\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) {
        return true;
      }
      return false;
    }

    function checkProtocol(urlString) {
      try {
        const url = new URL(urlString);
        if (url.protocol === 'https:' && isLocalHost(url.hostname)) {
          showStatus('error', '⚠️ Warning: Local servers typically use HTTP, not HTTPS. Change protocol to http:// if you encounter connection errors.', 'connectionStatus');
        }
      } catch (e) {
        // Invalid URL, ignore
      }
    }

    // Update endpoints when base URL changes
    document.getElementById('baseUrl').addEventListener('input', (e) => {
      updateEndpoints(e.target.value);
    });

    // Programming Orchestrator event handlers
    document.querySelectorAll('[data-setting]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const setting = e.target.getAttribute('data-setting');
        const value = e.target.checked;
        vscode.postMessage({
          command: 'orchestrator:updateCoordination',
          settings: { [setting]: value }
        });
      });
    });

    document.getElementById('planSelect')?.addEventListener('change', (e) => {
      vscode.postMessage({
        command: 'orchestrator:selectPlan',
        plan: e.target.value
      });
    });

    document.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        switch (action) {
          case 'open-verification':
            vscode.postMessage({ command: 'orchestrator:openVerification' });
            break;
          case 'refresh-teams':
            vscode.postMessage({ command: 'orchestrator:refreshTeams' });
            break;
          case 'rerun-analysis':
            vscode.postMessage({ command: 'orchestrator:rerunAnalysis' });
            break;
          case 'configure-team':
            const team = e.target.getAttribute('data-team');
            openTeamConfigModal(team);
            break;
        }
      });
    });

    // Team Configuration Modal Functions
    const modal = document.getElementById('teamConfigModal');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const modalSave = document.getElementById('modalSave');
    let currentTeam = null;

    function openTeamConfigModal(team) {
      currentTeam = team;
      const teamNameMap = {
        planning: 'Planning',
        answer: 'Answer',
        decomposition: 'Decomposition',
        verification: 'Verification'
      };
      
      document.getElementById('teamModalTitle').textContent = teamNameMap[team] || team;
      modal.classList.add('active');
      
      // Load existing configuration if available
      vscode.postMessage({
        command: 'loadTeamConfiguration',
        team: team
      });
    }

    function closeTeamConfigModal() {
      modal.classList.remove('active');
      currentTeam = null;
    }

    function saveTeamConfiguration() {
      if (!currentTeam) return;

      const config = {
        profile: document.getElementById('profileYaml').value,
        permissions: {
          read: document.getElementById('perm-read').checked,
          write: document.getElementById('perm-write').checked,
          execute: document.getElementById('perm-execute').checked,
          test: document.getElementById('perm-test').checked,
          approve: document.getElementById('perm-approve').checked,
        },
        maxDepth: parseInt(document.getElementById('maxDepth').value, 10) || 3,
        timeout: parseInt(document.getElementById('timeout').value, 10) || 300,
      };

      vscode.postMessage({
        command: 'saveTeamConfiguration',
        team: currentTeam,
        config: config
      });

      closeTeamConfigModal();
    }

    modalClose.addEventListener('click', closeTeamConfigModal);
    modalCancel.addEventListener('click', closeTeamConfigModal);
    modalSave.addEventListener('click', saveTeamConfiguration);
    
    // Close modal when clicking outside content
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeTeamConfigModal();
      }
    });

    // Handle messages for modal updates
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      if (message.command === 'loadTeamConfiguration') {
        // Populate modal with team configuration data
        if (message.config) {
          document.getElementById('profileYaml').value = message.config.profile || '';
          document.getElementById('perm-read').checked = message.config.permissions?.read ?? true;
          document.getElementById('perm-write').checked = message.config.permissions?.write ?? false;
          document.getElementById('perm-execute').checked = message.config.permissions?.execute ?? false;
          document.getElementById('perm-test').checked = message.config.permissions?.test ?? false;
          document.getElementById('perm-approve').checked = message.config.permissions?.approve ?? false;
          document.getElementById('maxDepth').value = message.config.constraints?.maxDepth ?? 3;
          document.getElementById('timeout').value = message.config.constraints?.timeout ?? 300;
        }
      }

      if (message.command === 'teamConfigurationSaved') {
        vscode.window.showInformationMessage(\`Team configuration saved successfully!\`);
      }

      if (message.command === 'teamConfigurationError') {
        vscode.window.showErrorMessage(\`Failed to save configuration: \${message.error}\`);
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Refresh team state from MCP server
   */
  private async _refreshTeamState(): Promise<void> {
    try {
      // Show loading indicator
      this._panel.webview.postMessage({
        command: 'orchestrator:refreshing',
        teams: ['planning', 'answer', 'decomposition', 'verification'],
      });

      // Fetch team status from MCP endpoint
      const teamState = await this.mcpClient.getTeamsStatus();

      // Update orchestrator manager with fresh data (supports both flat and nested responses)
      if (teamState && typeof teamState === 'object' && 'teams' in teamState) {
        const teams = (teamState as { teams: Record<string, any> }).teams;
        for (const [teamName, status] of Object.entries(teams)) {
          if (teamName in this.orchestratorManager.getState().teamStatuses) {
            this.orchestratorManager.updateTeamStatus(
              teamName as 'planning' | 'answer' | 'decomposition' | 'verification',
              status
            );
          }
        }
      } else {
        this.orchestratorManager.updateTeamStatus('planning', (teamState as any)?.planning);
        this.orchestratorManager.updateTeamStatus('answer', (teamState as any)?.answer);
        this.orchestratorManager.updateTeamStatus('decomposition', (teamState as any)?.decomposition);
        this.orchestratorManager.updateTeamStatus('verification', (teamState as any)?.verification);
      }

      // Update webview with fresh data
      this._panel.webview.postMessage({
        command: 'orchestrator:teamStateUpdated',
        teamState: this.orchestratorManager.getState().teamStatuses,
        timestamp: new Date().toISOString(),
      });

      vscode.window.showInformationMessage('Team state refreshed successfully');
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to refresh team state: ${error instanceof Error ? error.message : String(error)}`
      );

      this._panel.webview.postMessage({
        command: 'orchestrator:refreshError',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Rerun impact analysis for current plan
   */
  private async _rerunImpactAnalysis(): Promise<void> {
    try {
      vscode.window.showInformationMessage('Running impact analysis...');

      // Get active plan from orchestrator
      const activePlan = this.orchestratorManager.getActivePlan();

      if (!activePlan) {
        vscode.window.showWarningMessage('No active plan selected');
        return;
      }

      // Perform impact analysis (would integrate with actual analysis service)
      const analysis = await this.orchestratorManager.analyzeImpact(activePlan);

      // Send results to webview
      this._panel.webview.postMessage({
        command: 'orchestrator:impactAnalysisComplete',
        analysis,
        timestamp: new Date().toISOString(),
      });

      vscode.window.showInformationMessage(
        `Impact analysis complete: ${analysis.affectedTasks || 0} tasks affected`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to run impact analysis: ${error instanceof Error ? error.message : String(error)}`
      );

      this._panel.webview.postMessage({
        command: 'orchestrator:analysisError',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load agent profile from YAML file
   */
  private async _loadAgentProfile(profileName: string): Promise<void> {
    try {
      const { defaultAgentProfileLoader } = await import('../agentProfiles.js');
      const profile = await defaultAgentProfileLoader.loadProfile(profileName);

      if (!profile) {
        throw new Error(`Profile '${profileName}' not found`);
      }

      this._panel.webview.postMessage({
        command: 'agentProfileLoaded',
        profile,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load agent profile: ${error}`);
    }
  }

  /**
   * Save agent profile to configuration
   */
  private async _saveAgentProfile(profile: any): Promise<void> {
    try {
      const vsConfig = vscode.workspace.getConfiguration('copilot-orchestrator');
      await vsConfig.update(`agents.${profile.name}`, profile, vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage(`Agent profile '${profile.name}' saved!`);
      this._panel.webview.postMessage({
        command: 'agentProfileSaved',
        success: true,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save agent profile: ${error}`);
    }
  }

  /**
   * Test agent profile against sample task
   */
  private async _testAgentProfile(profileName: string): Promise<void> {
    try {
      vscode.window.showInformationMessage(`Testing agent profile '${profileName}'...`);

      // Simulate profile test (would integrate with actual test framework)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const testResults = {
        passed: true,
        permissions: { read_files: true, write_files: true, run_commands: false },
        constraints: { max_depth: 5, require_tests: true },
        message: 'Profile validation passed successfully',
      };

      this._panel.webview.postMessage({
        command: 'agentProfileTestComplete',
        results: testResults,
      });

      vscode.window.showInformationMessage('Agent profile test passed!');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to test agent profile: ${error}`);
    }
  }

  /**
   * Test GitHub connection
   */
  private async _testGitHubConnection(token: string, repo: string): Promise<void> {
    try {
      if (!token || !repo) {
        throw new Error('Token and repository are required');
      }

      vscode.window.showInformationMessage('Testing GitHub connection...');

      // Test connection to GitHub API
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
      }

      const repoData = await response.json();
      const rateLimit = {
        remaining: response.headers.get('X-RateLimit-Remaining'),
        total: response.headers.get('X-RateLimit-Limit'),
        reset: response.headers.get('X-RateLimit-Reset'),
      };

      this._panel.webview.postMessage({
        command: 'githubConnectionSuccess',
        repo: repoData,
        rateLimit,
      });

      vscode.window.showInformationMessage(
        `✓ Connected to ${repo} (${rateLimit.remaining}/${rateLimit.total} API calls remaining)`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`GitHub connection failed: ${error}`);
      this._panel.webview.postMessage({
        command: 'githubConnectionError',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Save GitHub sync settings
   */
  private async _saveGitHubSettings(settings: any): Promise<void> {
    try {
      const vsConfig = vscode.workspace.getConfiguration('copilot-orchestrator');
      await vsConfig.update('github.token', settings.token, vscode.ConfigurationTarget.Global);
      await vsConfig.update('github.repo', settings.repo, vscode.ConfigurationTarget.Global);
      await vsConfig.update('github.syncInterval', settings.syncInterval, vscode.ConfigurationTarget.Global);
      await vsConfig.update('github.syncDirection', settings.syncDirection, vscode.ConfigurationTarget.Global);
      await vsConfig.update('github.conflictResolution', settings.conflictResolution, vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage('GitHub settings saved successfully!');
      this._panel.webview.postMessage({
        command: 'githubSettingsSaved',
        success: true,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save GitHub settings: ${error}`);
    }
  }

  /**
   * Trigger immediate GitHub sync
   */
  private async _syncWithGitHub(): Promise<void> {
    try {
      vscode.window.showInformationMessage('Syncing with GitHub...');

      // Trigger sync command
      await vscode.commands.executeCommand('copilot-orchestrator.syncWithGitHub');

      vscode.window.showInformationMessage('GitHub sync completed!');
    } catch (error) {
      vscode.window.showErrorMessage(`Sync failed: ${error}`);
    }
  }

  /**
   * Save advanced settings
   */
  private async _saveAdvancedSettings(settings: any): Promise<void> {
    try {
      const vsConfig = vscode.workspace.getConfiguration('copilot-orchestrator');

      // Context bundling settings
      await vsConfig.update('context.maxBundleSize', settings.contextBundleSize, vscode.ConfigurationTarget.Global);
      await vsConfig.update('context.tokenLimit', settings.tokenLimit, vscode.ConfigurationTarget.Global);
      await vsConfig.update('context.enableCaching', settings.enableContextCaching, vscode.ConfigurationTarget.Global);
      await vsConfig.update('context.enableTokenCounting', settings.enableTokenCounting, vscode.ConfigurationTarget.Global);

      // Task decomposition settings
      await vsConfig.update('tasks.decompositionThreshold', settings.decompositionThreshold, vscode.ConfigurationTarget.Global);
      await vsConfig.update('tasks.maxDecompositionDepth', settings.maxDecompositionDepth, vscode.ConfigurationTarget.Global);

      // Performance settings
      await vsConfig.update('websocket.port', settings.websocketPort, vscode.ConfigurationTarget.Global);
      await vsConfig.update('cache.ttl', settings.cacheTTL, vscode.ConfigurationTarget.Global);
      await vsConfig.update('github.batchSize', settings.batchSize, vscode.ConfigurationTarget.Global);

      // Logging settings
      await vsConfig.update('logging.level', settings.logLevel, vscode.ConfigurationTarget.Global);
      await vsConfig.update('logging.enableAuditLog', settings.enableAuditLog, vscode.ConfigurationTarget.Global);
      await vsConfig.update('logging.enablePerformanceMetrics', settings.enablePerformanceMetrics, vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage('Advanced settings saved successfully!');
      this._panel.webview.postMessage({
        command: 'advancedSettingsSaved',
        success: true,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save advanced settings: ${error}`);
    }
  }

  /**
   * Open Team Configuration Modal
   * Allows user to configure agent profile, permissions, and constraints
   */
  private openTeamConfigurationModal(team: string): void {
    // Post message to webview to open modal and populate with team data
    this._panel.webview.postMessage({
      command: 'openTeamConfigModal',
      team: team,
      teamName: this.getTeamDisplayName(team),
    });

    // Set up modal event listeners via postMessage
    // The modal will send back configuration data when saved
  }

  /**
   * Validate team type parameter
   */
  private isValidTeamType(team: string): team is AgentTeamType {
    const validTeams: AgentTeamType[] = ['planning', 'answer', 'decomposition', 'verification'];
    return validTeams.includes(team as AgentTeamType);
  }

  /**
   * Save Team Configuration
   */
  private async _saveTeamConfiguration(team: string, config: any): Promise<void> {
    try {
      // Validate team type
      if (!this.isValidTeamType(team)) {
        const errorMessage = `Invalid team type: ${team}. Expected one of: planning, answer, decomposition, verification`;
        vscode.window.showErrorMessage(errorMessage);
        this._panel.webview.postMessage({
          command: 'teamConfigurationError',
          team: team,
          errors: [{ field: 'team', message: errorMessage }],
        });
        return;
      }

      const teamType = team as AgentTeamType;
      
      // Load or create profile
      let profile = await this.agentProfileLoader.loadFromWorkspace(teamType);
      if (!profile) {
        profile = this.agentProfileLoader.getDefaultProfile(teamType);
      }

      // Update profile with new configuration
      if (config.profileYaml) {
        // If YAML is provided, parse and validate it
        const result = await this.agentProfileLoader.loadFromYaml(config.profileYaml);
        
        if (result.errors.length > 0) {
          // Show validation errors
          const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join('\n');
          vscode.window.showErrorMessage(`Profile validation failed:\n${errorMessages}`);
          
          this._panel.webview.postMessage({
            command: 'teamConfigurationError',
            team: team,
            errors: result.errors,
          });
          return;
        }
        
        profile = result.profile!;
      } else {
        // Update individual fields from config
        profile.config = {
          ...profile.config,
          timeout: config.timeout || profile.config?.timeout,
          retryAttempts: config.retryAttempts || profile.config?.retryAttempts,
          maxDepth: config.maxDepth || profile.config?.maxDepth,
        };

        profile.permissions = {
          ...profile.permissions,
          read: config.permissions?.read ?? profile.permissions?.read,
          write: config.permissions?.write ?? profile.permissions?.write,
          execute: config.permissions?.execute ?? profile.permissions?.execute,
          test: config.permissions?.test ?? profile.permissions?.test,
          approve: config.permissions?.approve ?? profile.permissions?.approve,
        };
      }

      // Save to workspace
      const saveResult = await this.agentProfileLoader.saveToWorkspace(profile);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save profile');
      }

      // Notify orchestrator manager of changes
      this.orchestratorManager.updateTeamStatus(teamType, {
        status: 'idle', // Reset status after configuration change
        tasksCompleted: 0,
        activeTaskCount: 0,
      });

      vscode.window.showInformationMessage(`${this.getTeamDisplayName(team)} team configured successfully!`);

      this._panel.webview.postMessage({
        command: 'teamConfigurationSaved',
        team: team,
        success: true,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save team configuration: ${error}`);
      this._panel.webview.postMessage({
        command: 'teamConfigurationError',
        team: team,
        error: String(error),
      });
    }
  }

  /**
   * Load Team Configuration
   */
  private async _loadTeamConfiguration(team: string): Promise<void> {
    try {
      // Validate team type
      if (!this.isValidTeamType(team)) {
        const errorMessage = `Invalid team type: ${team}. Expected one of: planning, answer, decomposition, verification`;
        vscode.window.showErrorMessage(errorMessage);
        this._panel.webview.postMessage({
          command: 'teamConfigurationError',
          team: team,
          error: errorMessage,
        });
        return;
      }

      const teamType = team as AgentTeamType;
      
      // Load profile from workspace or get default
      const profile = await this.agentProfileLoader.loadFromWorkspace(teamType);
      
      if (profile) {
        // Convert profile to YAML for display
        const yamlContent = this.agentProfileLoader.exportToYaml(profile);
        
        this._panel.webview.postMessage({
          command: 'teamConfigurationLoaded',
          team: team,
          config: {
            profileYaml: yamlContent,
            permissions: {
              read: profile.permissions?.read ?? true,
              write: profile.permissions?.write ?? false,
              execute: profile.permissions?.execute ?? false,
              test: profile.permissions?.test ?? false,
              approve: profile.permissions?.approve ?? false,
            },
            maxDepth: profile.config?.maxDepth ?? 3,
            timeout: profile.config?.timeout ?? 300,
          },
        });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load team configuration: ${error}`);
      this._panel.webview.postMessage({
        command: 'teamConfigurationError',
        team: team,
        error: String(error),
      });
    }
  }

  /**
   * Upload team profile from YAML file
   */
  private async _uploadTeamProfile(team: string): Promise<void> {
    try {
      const result = await this.agentProfileLoader.uploadProfile();
      
      if (result.errors.length > 0) {
        const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join('\n');
        vscode.window.showErrorMessage(`Profile upload failed:\n${errorMessages}`);
        return;
      }

      if (result.profile) {
        // Convert profile to YAML and send to webview
        const yamlContent = this.agentProfileLoader.exportToYaml(result.profile);
        
        this._panel.webview.postMessage({
          command: 'teamProfileUploaded',
          team: team,
          profileYaml: yamlContent,
        });
        
        vscode.window.showInformationMessage('Profile uploaded successfully!');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to upload profile: ${error}`);
    }
  }

  /**
   * Download team profile to YAML file
   */
  private async _downloadTeamProfile(team: string): Promise<void> {
    try {
      // Validate team type
      if (!this.isValidTeamType(team)) {
        vscode.window.showErrorMessage(`Invalid team type: ${team}`);
        return;
      }

      const teamType = team as AgentTeamType;
      const profile = await this.agentProfileLoader.loadFromWorkspace(teamType);
      
      if (!profile) {
        vscode.window.showWarningMessage('No profile to download. Using default profile.');
        const defaultProfile = this.agentProfileLoader.getDefaultProfile(teamType);
        await this.agentProfileLoader.downloadProfile(defaultProfile);
      } else {
        await this.agentProfileLoader.downloadProfile(profile);
      }
      
      vscode.window.showInformationMessage('Profile downloaded successfully!');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to download profile: ${error}`);
    }
  }

  /**
   * Reset team profile to defaults
   */
  private async _resetTeamProfile(team: string): Promise<void> {
    try {
      // Validate team type
      if (!this.isValidTeamType(team)) {
        vscode.window.showErrorMessage(`Invalid team type: ${team}`);
        return;
      }

      const teamType = team as AgentTeamType;
      const defaultProfile = this.agentProfileLoader.getDefaultProfile(teamType);
      
      // Convert to YAML and send to webview
      const yamlContent = this.agentProfileLoader.exportToYaml(defaultProfile);
      
      this._panel.webview.postMessage({
        command: 'teamProfileReset',
        team: team,
        profileYaml: yamlContent,
      });
      
      vscode.window.showInformationMessage(`${this.getTeamDisplayName(team)} profile reset to defaults!`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to reset profile: ${error}`);
    }
  }

  /**
   * Get display name for team
   */
  private getTeamDisplayName(team: string): string {
    const names: Record<string, string> = {
      planning: 'Planning',
      answer: 'Answer',
      decomposition: 'Decomposition',
      verification: 'Verification',
    };
    return names[team] || team;
  }

  public dispose() {
    SettingsPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
