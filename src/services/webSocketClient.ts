import * as vscode from 'vscode';

/**
 * WebSocket Configuration
 * Supports Soketi (self-hosted Pusher alternative), Pusher (managed), and Redis (Echo Server)
 */
export interface WebSocketConfig {
  driver: 'soketi' | 'pusher' | 'redis';
  appKey: string;
  host?: string;
  port?: number;
  scheme?: 'http' | 'https';
  cluster?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface WebSocketEvent {
  channel: string;
  event: string;
  data: any;
  timestamp: number;
}

/**
 * WebSocket client for real-time event delivery from Laravel backend
 * Handles Soketi/Pusher/Redis broadcasting with automatic reconnection
 */
export class WebSocketClient {
  private connection: any;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private isConnected = false;
  private eventQueue: WebSocketEvent[] = [];

  constructor(private config: WebSocketConfig) {
    this.maxReconnectAttempts = config.reconnectAttempts || 10;
    this.reconnectDelay = config.reconnectDelay || 1000;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    try {
      vscode.window.showInformationMessage(
        `[WebSocket] Connecting to ${this.config.driver}...`
      );

      switch (this.config.driver) {
        case 'soketi':
          await this.connectSoketi();
          break;
        case 'pusher':
          await this.connectPusher();
          break;
        case 'redis':
          await this.connectRedis();
          break;
        default:
          throw new Error(`Unknown WebSocket driver: ${this.config.driver}`);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      vscode.window.showInformationMessage(
        `[WebSocket] Connected to ${this.config.driver} ✓`
      );

      // Process queued events
      this.processEventQueue();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Connect to Soketi (self-hosted Pusher alternative)
   */
  private async connectSoketi(): Promise<void> {
    const Pusher = await this.dynamicImport('pusher-js');

    this.connection = new Pusher.default(this.config.appKey, {
      cluster: this.config.cluster || 'us-east-1',
      wsHost: this.config.host || 'localhost',
      wsPort: this.config.port || 6001,
      wssPort: this.config.port || 6001,
      forceTLS: this.config.scheme === 'https',
      encrypted: this.config.scheme === 'https',
    });

    // Setup connection event handlers
    this.connection.connection.bind('connected', () => {
      console.log('[Soketi] Connection established');
    });

    this.connection.connection.bind('disconnected', () => {
      console.log('[Soketi] Connection lost - attempting reconnect');
      this.handleDisconnection();
    });

    this.connection.connection.bind('error', (error: any) => {
      console.error('[Soketi] Connection error:', error);
    });
  }

  /**
   * Connect to Pusher (managed service)
   */
  private async connectPusher(): Promise<void> {
    const Pusher = await this.dynamicImport('pusher-js');

    this.connection = new Pusher.default(this.config.appKey, {
      cluster: this.config.cluster || 'mt1',
    });

    // Setup connection event handlers
    this.connection.connection.bind('connected', () => {
      console.log('[Pusher] Connection established');
    });

    this.connection.connection.bind('disconnected', () => {
      console.log('[Pusher] Connection lost - attempting reconnect');
      this.handleDisconnection();
    });

    this.connection.connection.bind('error', (error: any) => {
      console.error('[Pusher] Connection error:', error);
    });
  }

  /**
   * Connect to Redis via Laravel Echo Server
   */
  private async connectRedis(): Promise<void> {
    const Echo = await this.dynamicImport('laravel-echo');
    const io = await this.dynamicImport('socket.io-client');

    // @ts-ignore - Make io available globally for Echo
    (global as any).io = io.default || io;

    this.connection = new Echo.default({
      broadcaster: 'socket.io',
      host: `${this.config.host || 'localhost'}:${this.config.port || 6001}`,
      transports: ['websocket', 'polling'],
    });

    this.connection.connector.socket.on('connect', () => {
      console.log('[Redis/Echo] Connection established');
    });

    this.connection.connector.socket.on('disconnect', () => {
      console.log('[Redis/Echo] Connection lost - attempting reconnect');
      this.handleDisconnection();
    });

    this.connection.connector.socket.on('error', (error: any) => {
      console.error('[Redis/Echo] Connection error:', error);
    });
  }

  /**
   * Subscribe to channel and listen for events
   */
  subscribe(channel: string, eventName: string, callback: (data: any) => void): void {
    if (!this.isConnected) {
      console.warn(
        `[WebSocket] Not connected - queueing listener for ${channel}.${eventName}`
      );
      // Queue listener for when connection is established
      const event: WebSocketEvent = {
        channel,
        event: eventName,
        data: null,
        timestamp: Date.now(),
      };
      // Store callback for later
      if (!this.listeners.has(`${channel}.${eventName}`)) {
        this.listeners.set(`${channel}.${eventName}`, new Set());
      }
      this.listeners.get(`${channel}.${eventName}`)!.add(callback);
      return;
    }

    const key = `${channel}.${eventName}`;

    // Add listener
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Subscribe to channel if not already subscribed
    if (!this.subscriptions.has(channel)) {
      try {
        const sub = this.connection.subscribe(channel);

        // Bind event handler
        sub.bind(eventName, (data: any) => {
          console.log(`[WebSocket] Event: ${channel}.${eventName}`, data);
          this.emit(channel, eventName, data);
        });

        // Also handle catch-all errors
        sub.bind('error', (error: any) => {
          console.error(`[WebSocket] Subscription error on ${channel}:`, error);
        });

        this.subscriptions.set(channel, sub);
      } catch (error) {
        console.error(`[WebSocket] Failed to subscribe to ${channel}:`, error);
      }
    }
  }

  /**
   * Unsubscribe from event
   */
  unsubscribe(channel: string, eventName: string, callback?: (data: any) => void): void {
    const key = `${channel}.${eventName}`;
    const callbacks = this.listeners.get(key);

    if (callback && callbacks) {
      callbacks.delete(callback);
    } else {
      this.listeners.delete(key);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(channel: string, eventName: string, data: any): void {
    const key = `${channel}.${eventName}`;
    const callbacks = this.listeners.get(key);

    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in event callback:`, error);
        }
      });
    }
  }

  /**
   * Handle connection loss with exponential backoff
   */
  private handleDisconnection(): void {
    this.isConnected = false;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      this.reconnectAttempts++;

      console.log(
        `[WebSocket] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      vscode.window.showErrorMessage(
        '[WebSocket] Failed to reconnect after maximum attempts. Please check server status.'
      );
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: any): void {
    console.error('[WebSocket] Connection error:', error);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      this.reconnectAttempts++;

      vscode.window.showWarningMessage(
        `[WebSocket] Connection failed (${this.reconnectAttempts}/${this.maxReconnectAttempts}). Retrying in ${delay}ms...`
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      vscode.window.showErrorMessage(
        `[WebSocket] Failed to connect to ${this.config.driver}. Please check your configuration.`
      );
    }
  }

  /**
   * Queue event for processing when connection is established
   */
  private processEventQueue(): void {
    const queued = [...this.eventQueue];
    this.eventQueue = [];

    queued.forEach((event) => {
      this.subscribe(event.channel, event.event, (data) => {
        console.log(
          `[WebSocket] Queued event received: ${event.channel}.${event.event}`
        );
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.connection) {
      try {
        this.connection.disconnect?.();
        this.isConnected = false;
        console.log('[WebSocket] Disconnected');
      } catch (error) {
        console.error('[WebSocket] Error during disconnect:', error);
      }
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    driver: string;
    reconnectAttempts: number;
    listenerCount: number;
    subscriptionCount: number;
  } {
    return {
      connected: this.isConnected,
      driver: this.config.driver,
      reconnectAttempts: this.reconnectAttempts,
      listenerCount: this.listeners.size,
      subscriptionCount: this.subscriptions.size,
    };
  }

  /**
   * Dynamic import helper for ESM modules
   */
  private async dynamicImport(module: string): Promise<any> {
    try {
      return await import(/* webpackIgnore: true */ module);
    } catch (error) {
      console.warn(
        `[WebSocket] Failed to import ${module}. Install with: npm install ${module}`
      );
      throw error;
    }
  }
}

/**
 * Global WebSocket client instance
 */
let globalWebSocketClient: WebSocketClient | null = null;

/**
 * Initialize global WebSocket client
 */
export async function initializeWebSocketClient(
  config: WebSocketConfig
): Promise<WebSocketClient> {
  globalWebSocketClient = new WebSocketClient(config);
  await globalWebSocketClient.connect();
  return globalWebSocketClient;
}

/**
 * Get global WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient | null {
  return globalWebSocketClient;
}

/**
 * Dispose of global WebSocket client
 */
export function disposeWebSocketClient(): void {
  if (globalWebSocketClient) {
    globalWebSocketClient.disconnect();
    globalWebSocketClient = null;
  }
}
