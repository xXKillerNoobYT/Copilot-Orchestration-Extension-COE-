import * as vscode from 'vscode';
import { WebSocketConfig } from './webSocketClient';

/**
 * WebSocket configuration stored in VS Code workspace settings
 */
export interface WebSocketSettings {
  driver: 'soketi' | 'pusher' | 'redis';
  appKey: string;
  host?: string;
  port?: number;
  scheme?: 'http' | 'https';
  cluster?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Manages WebSocket configuration in VS Code settings
 */
export class WebSocketConfigManager {
  private static readonly CONFIG_SECTION = 'copilotOrchestrator.webSocket';

  /**
   * Get WebSocket configuration from VS Code settings
   */
  static getConfig(): WebSocketSettings {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    const appKey = config.get<string>('appKey');
    const effectiveAppKey = (appKey === undefined || appKey === null) ? 'default-app-key' : appKey;

    return {
      driver: config.get<'soketi' | 'pusher' | 'redis'>('driver') || 'soketi',
      appKey: effectiveAppKey,
      host: config.get<string>('host'),
      port: config.get<number>('port'),
      scheme: config.get<'http' | 'https'>('scheme'),
      cluster: config.get<string>('cluster'),
      autoConnect: config.get<boolean>('autoConnect') ?? true,
      reconnectAttempts: config.get<number>('reconnectAttempts') || 10,
      reconnectDelay: config.get<number>('reconnectDelay') || 1000,
    };
  }

  /**
   * Update WebSocket configuration in VS Code settings
   */
  static async updateConfig(partial: Partial<WebSocketSettings>): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        await config.update(key, value, vscode.ConfigurationTarget.Workspace);
      }
    }
  }

  /**
   * Get WebSocketConfig for client initialization
   */
  static toClientConfig(): WebSocketConfig {
    const settings = this.getConfig();

    return {
      driver: settings.driver,
      appKey: settings.appKey,
      host: settings.host,
      port: settings.port,
      scheme: settings.scheme,
      cluster: settings.cluster,
      reconnectAttempts: settings.reconnectAttempts,
      reconnectDelay: settings.reconnectDelay,
    };
  }

  /**
   * Validate WebSocket configuration
   */
  static validate(settings: WebSocketSettings): string | null {
    if (!settings.appKey || settings.appKey.trim() === '') {
      return 'appKey is required';
    }

    if (settings.driver === 'soketi' && !settings.host) {
      return 'Soketi requires host to be configured';
    }

    if (settings.driver === 'redis' && !settings.host) {
      return 'Redis requires host to be configured';
    }

    if (settings.port !== undefined && settings.port !== null && (settings.port < 1 || settings.port > 65535)) {
      return 'Port must be between 1 and 65535';
    }

    return null;
  }

  /**
   * Get default configuration for a driver
   */
  static getDefaultConfig(driver: 'soketi' | 'pusher' | 'redis'): WebSocketSettings {
    switch (driver) {
      case 'soketi':
        return {
          driver: 'soketi',
          appKey: 'default-app-key',
          host: 'localhost',
          port: 6001,
          scheme: 'http',
          autoConnect: true,
          reconnectAttempts: 10,
          reconnectDelay: 1000,
        };

      case 'pusher':
        return {
          driver: 'pusher',
          appKey: '',
          cluster: 'mt1',
          autoConnect: true,
          reconnectAttempts: 10,
          reconnectDelay: 1000,
        };

      case 'redis':
        return {
          driver: 'redis',
          appKey: 'default-app-key',
          host: 'localhost',
          port: 6001,
          scheme: 'http',
          autoConnect: true,
          reconnectAttempts: 10,
          reconnectDelay: 1000,
        };
    }
  }

  /**
   * Open WebSocket configuration panel
   */
  static async showConfigurationPanel(): Promise<void> {
    const driver = await vscode.window.showQuickPick(
      ['soketi', 'pusher', 'redis'],
      { placeHolder: 'Select WebSocket driver' }
    );

    if (!driver) {
      return;
    }

    const defaults = this.getDefaultConfig(driver as any);

    // Get App Key
    const appKey = await vscode.window.showInputBox({
      prompt: 'Enter WebSocket App Key',
      value: defaults.appKey,
      placeHolder: 'e.g., pusher-app-key-123',
    });

    if (appKey === undefined) {
      return;
    }

    let host, port, cluster;

    if (driver !== 'pusher') {
      // Get Host for Soketi/Redis
      host = await vscode.window.showInputBox({
        prompt: 'Enter WebSocket Host',
        value: defaults.host || 'localhost',
        placeHolder: 'e.g., localhost or wss.example.com',
      });

      if (host === undefined) {
        return;
      }

      // Get Port for Soketi/Redis
      const portStr = await vscode.window.showInputBox({
        prompt: 'Enter WebSocket Port',
        value: String(defaults.port || 6001),
        placeHolder: '6001',
      });

      if (portStr === undefined) {
        return;
      }

      port = parseInt(portStr);
    } else {
      // Get Cluster for Pusher
      cluster = await vscode.window.showInputBox({
        prompt: 'Enter Pusher Cluster',
        value: defaults.cluster || 'mt1',
        placeHolder: 'e.g., mt1, us2, eu, ap1',
      });

      if (cluster === undefined) {
        return;
      }
    }

    // Update configuration
    const updateSettings: Partial<WebSocketSettings> = {
      driver: driver as any,
      appKey,
      host,
      port,
      cluster,
    };

    await this.updateConfig(updateSettings);
    vscode.window.showInformationMessage('[WebSocket] Configuration updated successfully!');
  }

  /**
   * Test WebSocket connection
   */
  static async testConnection(): Promise<void> {
    const config = this.getConfig();
    const error = this.validate(config);

    if (error) {
      vscode.window.showErrorMessage(`[WebSocket] Configuration error: ${error}`);
      return;
    }

    vscode.window.showInformationMessage(
      `[WebSocket] Testing connection to ${config.driver}://` +
      `${config.host || config.cluster}:${config.port || 'default'}...`
    );

    try {
      const { initializeWebSocketClient, disposeWebSocketClient } =
        await import('./webSocketClient');

      const clientConfig = this.toClientConfig();
      const client = await initializeWebSocketClient(clientConfig);

      const status = client.getStatus();
      disposeWebSocketClient();

      if (status.connected) {
        vscode.window.showInformationMessage(
          `[WebSocket] ✓ Connected to ${config.driver} successfully!`
        );
      } else {
        vscode.window.showWarningMessage(
          '[WebSocket] Connection status pending - check server logs'
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `[WebSocket] Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
