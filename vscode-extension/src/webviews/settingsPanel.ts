/**
 * LLM Settings Panel Webview
 * Provides a tabbed settings interface for LLM configuration
 */

import * as vscode from 'vscode';
import { ProgrammingOrchestratorManager } from './programmingOrchestratorTab';
import { MCPClient } from '../services/mcpClient';

export class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private orchestratorManager: ProgrammingOrchestratorManager;
  private mcpClient: MCPClient;

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

  private async _testConnection(config: any) {
    try {
      // Import required modules for backend connection testing
      const { ProviderFactory } = await import('../transport/transportManager');
      
      // Create a provider instance using the config from the webview
      const provider = ProviderFactory.createProvider('lmstudio', {
        name: 'LM Studio',
        baseUrl: config.baseUrl,
        apiKey: config.apiKey || undefined,
        defaultModel: config.model,
        timeout: 30000,
      });

      // Use the provider's built-in testConnection method
      // This runs in the extension host context, avoiding webview CSP restrictions
      const connected = await provider.testConnection();

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
          message: `Connection test failed. Please verify:\n1. LLM server is running at ${config.baseUrl}\n2. Model "${config.model}" is loaded\n3. Server is accessible from this machine\n4. If remote server, external API access is enabled`,
        });
      }
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'connectionTestResult',
        success: false,
        message: `Connection test failed for ${config.baseUrl}: ${error instanceof Error ? error.message : String(error)}. Confirm network reachability and that the server exposes /v1/chat/completions.`,
      });
    }
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

    <!-- Advanced Tab -->
    <div class="tab-content" id="advanced">
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
            console.log('Configure team:', team);
            // TODO: Open team configuration dialog
            break;
        }
      });
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
