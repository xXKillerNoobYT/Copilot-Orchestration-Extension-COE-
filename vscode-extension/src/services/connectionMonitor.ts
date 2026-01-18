/**
 * Connection Monitor Service
 * Polls MCP server health and monitors WebSocket connection status
 */

import * as vscode from 'vscode';
import { MCPClient } from '../services/mcpClient';
import { DockerMCPClient } from '../services/dockerMCPClient';
import { logError } from '../utils/errorHandler';

export type ConnectionStatus = 'connected' | 'degraded' | 'disconnected';

export interface ConnectionState {
  mcp: ConnectionStatus;
  websocket: ConnectionStatus;
  docker: ConnectionStatus;
  lastMcpCheck: string;
  lastWsCheck: string;
  lastDockerCheck: string;
  mcpError?: string;
  wsError?: string;
  dockerError?: string;
  dockerAuthRequired?: boolean;
  retryCount: number;
}

export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private state: ConnectionState;
  private onStateChange: vscode.EventEmitter<ConnectionState>;
  private pollInterval?: NodeJS.Timeout;
  private readonly POLL_INTERVAL_MS = 5000; // 5 seconds
  private readonly MAX_AUTO_RETRY = 3;

  private constructor() {
    this.state = {
      mcp: 'disconnected',
      websocket: 'disconnected',
      docker: 'disconnected',
      lastMcpCheck: new Date().toISOString(),
      lastWsCheck: new Date().toISOString(),
      lastDockerCheck: new Date().toISOString(),
      retryCount: 0,
    };
    this.onStateChange = new vscode.EventEmitter<ConnectionState>();
  }

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  /**
   * Subscribe to connection state changes
   */
  get onDidChangeState(): vscode.Event<ConnectionState> {
    return this.onStateChange.event;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Start monitoring connections
   */
  start(): void {
    if (this.pollInterval) {
      return; // Already running
    }

    // Immediate check
    this.checkConnections();

    // Periodic checks
    this.pollInterval = setInterval(() => {
      this.checkConnections();
    }, this.POLL_INTERVAL_MS);

    console.log('[ConnectionMonitor] Started monitoring');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
      console.log('[ConnectionMonitor] Stopped monitoring');
    }
  }

  /**
   * Check both MCP and WebSocket connections
   */
  private async checkConnections(): Promise<void> {
    await Promise.all([
      this.checkMcpConnection(),
      this.checkWebSocketConnection(),
      this.checkDockerGateway(),
    ]);

    // Fire state change event
    this.onStateChange.fire(this.getState());
  }

  /**
   * Check MCP server connection
   */
  private async checkMcpConnection(): Promise<void> {
    try {
      const mcpClient = MCPClient.getInstance();

      // Try to fetch next task as health check (or use dedicated health endpoint)
      const response = await Promise.race([
        mcpClient.getNextTask(),
        this.timeout(3000),
      ]);

      this.state.mcp = 'connected';
      this.state.mcpError = undefined;
      this.state.retryCount = 0;
      this.state.lastMcpCheck = new Date().toISOString();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (this.state.mcp === 'connected') {
        // Just disconnected
        console.warn('[ConnectionMonitor] MCP connection lost');
      }

      this.state.mcpError = errorMessage;
      this.state.lastMcpCheck = new Date().toISOString();

      // Auto-retry logic
      if (this.state.retryCount < this.MAX_AUTO_RETRY) {
        this.state.mcp = 'degraded';
        this.state.retryCount++;
        console.log(`[ConnectionMonitor] MCP retry attempt ${this.state.retryCount}/${this.MAX_AUTO_RETRY}`);
      } else {
        this.state.mcp = 'disconnected';
      }

      logError(error, 'ConnectionMonitor.checkMcpConnection');
    }
  }

  /**
   * Check WebSocket connection
   */
  private async checkWebSocketConnection(): Promise<void> {
    try {
      // TODO: Implement WebSocket health check
      // For now, assume connected if MCP is connected
      this.state.websocket = this.state.mcp === 'connected' ? 'connected' : 'disconnected';
      this.state.lastWsCheck = new Date().toISOString();

    } catch (error) {
      this.state.websocket = 'disconnected';
      this.state.wsError = error instanceof Error ? error.message : 'Unknown error';
      this.state.lastWsCheck = new Date().toISOString();

      logError(error, 'ConnectionMonitor.checkWebSocketConnection');
    }
  }

  /**
   * Check Docker MCP Gateway connection
   */
  private async checkDockerGateway(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('copilot-orchestrator');
      const dockerEnabled = config.get('mcp.dockerGatewayEnabled', true);

      if (!dockerEnabled) {
        this.state.docker = 'disconnected';
        this.state.lastDockerCheck = new Date().toISOString();
        return;
      }

      const dockerClient = DockerMCPClient.getInstance();

      // Check if Docker MCP is available
      const isAvailable = await dockerClient.isAvailable();

      if (!isAvailable) {
        this.state.docker = 'disconnected';
        this.state.dockerError = 'Docker MCP Toolkit not installed or not available';
        this.state.lastDockerCheck = new Date().toISOString();
        return;
      }

      // Try to list tools (validates gateway is working)
      const tools = await Promise.race([
        dockerClient.listTools(),
        this.timeout(5000)
      ]);

      this.state.docker = 'connected';
      this.state.dockerError = undefined;
      this.state.dockerAuthRequired = false;
      this.state.lastDockerCheck = new Date().toISOString();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's an authentication error
      if (errorMessage.includes('unauthorized') || errorMessage.includes('permission denied')) {
        this.state.docker = 'degraded';
        this.state.dockerError = 'Authentication required';
        this.state.dockerAuthRequired = true;
        this.state.lastDockerCheck = new Date().toISOString();

        // Show authentication notification
        this.showDockerAuthNotification();
      } else {
        this.state.docker = 'disconnected';
        this.state.dockerError = errorMessage;
        this.state.lastDockerCheck = new Date().toISOString();
      }

      logError(error, 'ConnectionMonitor.checkDockerGateway');
    }
  }

  /**
   * Show Docker authentication notification with action button
   */
  private showDockerAuthNotification(): void {
    // Only show notification once per session
    if (this.state.dockerAuthRequired && this.state.docker === 'degraded') {
      vscode.window.showWarningMessage(
        'Docker MCP Gateway requires authentication',
        'Login to Docker',
        'Dismiss'
      ).then(action => {
        if (action === 'Login to Docker') {
          // Open Docker login terminal
          const terminal = vscode.window.createTerminal('Docker Login');
          terminal.show();
          terminal.sendText('docker login');
        }
      });
    }
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), ms);
    });
  }

  /**
   * Force reconnection attempt
   */
  async retry(): Promise<void> {
    console.log('[ConnectionMonitor] Manual retry triggered');
    this.state.retryCount = 0;
    await this.checkConnections();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stop();
    this.onStateChange.dispose();
  }
}

/**
 * Create status bar item for connection status
 */
export function createConnectionStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  const monitor = ConnectionMonitor.getInstance();

  // Update status bar on state change
  monitor.onDidChangeState(state => {
    updateStatusBarItem(statusBarItem, state);
  });

  // Initial update
  updateStatusBarItem(statusBarItem, monitor.getState());

  // Show status bar
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push({
    dispose: () => monitor.dispose(),
  });

  return statusBarItem;
}

/**
 * Update status bar item based on connection state
 */
function updateStatusBarItem(item: vscode.StatusBarItem, state: ConnectionState): void {
  const mcpIcon = getStatusIcon(state.mcp);
  const wsIcon = getStatusIcon(state.websocket);

  item.text = `$(${mcpIcon}) MCP | $(${wsIcon}) WS`;

  const tooltip = [
    `MCP Server: ${state.mcp}`,
    state.mcpError ? `  Error: ${state.mcpError}` : '',
    `  Last check: ${new Date(state.lastMcpCheck).toLocaleTimeString()}`,
    '',
    `WebSocket: ${state.websocket}`,
    state.wsError ? `  Error: ${state.wsError}` : '',
    `  Last check: ${new Date(state.lastWsCheck).toLocaleTimeString()}`,
  ].filter(Boolean).join('\n');

  item.tooltip = tooltip;
  item.command = 'copilot-orchestrator.showConnectionDetails';
}

/**
 * Get status icon based on connection status
 */
function getStatusIcon(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'check';
    case 'degraded':
      return 'warning';
    case 'disconnected':
      return 'error';
  }
}

/**
 * Show detailed connection status
 */
export function showConnectionDetails(): void {
  const monitor = ConnectionMonitor.getInstance();
  const state = monitor.getState();

  const message = `
**MCP Server**: ${state.mcp}
${state.mcpError ? `Error: ${state.mcpError}` : ''}
Last check: ${new Date(state.lastMcpCheck).toLocaleString()}

**WebSocket**: ${state.websocket}
${state.wsError ? `Error: ${state.wsError}` : ''}
Last check: ${new Date(state.lastWsCheck).toLocaleString()}

**Docker Gateway**: ${state.docker}
${state.dockerError ? `Error: ${state.dockerError}` : ''}
${state.dockerAuthRequired ? '⚠️ Authentication required' : ''}
Last check: ${new Date(state.lastDockerCheck).toLocaleString()}

Retry count: ${state.retryCount}/${3}
  `.trim();

  vscode.window.showInformationMessage(message, { modal: true }, 'Retry', 'Docker Login').then(action => {
    if (action === 'Retry') {
      monitor.retry();
    } else if (action === 'Docker Login') {
      const terminal = vscode.window.createTerminal('Docker Login');
      terminal.show();
      terminal.sendText('docker login');
    }
  });
}
