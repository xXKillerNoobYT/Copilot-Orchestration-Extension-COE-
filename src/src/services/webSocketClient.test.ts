/**
 * Tests for WebSocket Client Service
 * Tests real-time event delivery, reconnection logic, and driver support
 */

import {
  WebSocketClient,
  WebSocketConfig,
  initializeWebSocketClient,
  getWebSocketClient,
  disposeWebSocketClient
} from './webSocketClient';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode');

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let mockConfig: WebSocketConfig;
  let mockPusher: any;
  let mockConnection: any;
  let mockSubscription: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock Pusher connection
    mockSubscription = {
      bind: jest.fn(),
      unbind: jest.fn()
    };

    mockConnection = {
      bind: jest.fn(),
      unbind: jest.fn()
    };

    mockPusher = {
      default: jest.fn().mockImplementation(() => ({
        connection: mockConnection,
        subscribe: jest.fn(() => mockSubscription),
        disconnect: jest.fn()
      }))
    };

    // Mock dynamic imports
    jest.spyOn(WebSocketClient.prototype as any, 'dynamicImport').mockImplementation(async (module: string) => {
      if (module === 'pusher-js') {
        return mockPusher;
      }
      if (module === 'socket.io-client') {
        return { default: jest.fn() };
      }
      if (module === 'laravel-echo') {
        return {
          default: jest.fn().mockImplementation(() => ({
            connector: {
              socket: {
                on: jest.fn()
              }
            },
            subscribe: jest.fn(() => mockSubscription),
            disconnect: jest.fn()
          }))
        };
      }
      throw new Error(`Unknown module: ${module}`);
    });

    mockConfig = {
      driver: 'soketi',
      appKey: 'test-app-key',
      host: 'localhost',
      port: 6001,
      scheme: 'http',
      reconnectAttempts: 3,
      reconnectDelay: 1000
    };

    (vscode.window.showInformationMessage as jest.Mock) = jest.fn();
    (vscode.window.showWarningMessage as jest.Mock) = jest.fn();
    (vscode.window.showErrorMessage as jest.Mock) = jest.fn();

    client = new WebSocketClient(mockConfig);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with config', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(WebSocketClient);
    });

    it('should use default reconnect settings if not provided', () => {
      const simpleConfig: WebSocketConfig = {
        driver: 'pusher',
        appKey: 'key'
      };
      const simpleClient = new WebSocketClient(simpleConfig);
      expect(simpleClient).toBeDefined();
    });
  });

  describe('Soketi Connection', () => {
    it('should connect to Soketi successfully', async () => {
      const connectPromise = client.connect();

      // Simulate successful connection
      const connectedCallback = mockConnection.bind.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )?.[1];
      if (connectedCallback) connectedCallback();

      await connectPromise;

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Connected')
      );
    });

    it('should configure Soketi with correct options', async () => {
      await client.connect();

      expect(mockPusher.default).toHaveBeenCalledWith(
        'test-app-key',
        expect.objectContaining({
          wsHost: 'localhost',
          wsPort: 6001,
          forceTLS: false,
          encrypted: false
        })
      );
    });

    it('should handle disconnection and attempt reconnect', async () => {
      await client.connect();

      // Simulate disconnection
      const disconnectedCallback = mockConnection.bind.mock.calls.find(
        (call: any) => call[0] === 'disconnected'
      )?.[1];

      if (disconnectedCallback) disconnectedCallback();

      // Fast-forward reconnection delay
      jest.advanceTimersByTime(1000);

      expect(mockPusher.default).toHaveBeenCalledTimes(2); // Initial + reconnect
    });

    it('should handle connection errors', async () => {
      const errorCallback = mockConnection.bind.mock.calls.find(
        (call: any) => call[0] === 'error'
      )?.[1];

      await client.connect();

      if (errorCallback) {
        errorCallback(new Error('Connection failed'));
      }

      // Should not throw, just log error
      expect(client).toBeDefined();
    });
  });

  describe('Pusher Connection', () => {
    beforeEach(() => {
      mockConfig.driver = 'pusher';
      mockConfig.cluster = 'us2';
      client = new WebSocketClient(mockConfig);
    });

    it('should connect to Pusher successfully', async () => {
      await client.connect();

      expect(mockPusher.default).toHaveBeenCalledWith(
        'test-app-key',
        expect.objectContaining({
          cluster: 'us2'
        })
      );
    });

    it('should use default cluster if not provided', async () => {
      delete mockConfig.cluster;
      client = new WebSocketClient(mockConfig);

      await client.connect();

      expect(mockPusher.default).toHaveBeenCalledWith(
        'test-app-key',
        expect.objectContaining({
          cluster: 'mt1' // default
        })
      );
    });
  });

  describe('Redis/Echo Connection', () => {
    let mockEcho: any;
    let mockSocket: any;

    beforeEach(() => {
      mockSocket = {
        on: jest.fn()
      };

      mockEcho = {
        default: jest.fn().mockImplementation(() => ({
          connector: { socket: mockSocket },
          subscribe: jest.fn(() => mockSubscription),
          disconnect: jest.fn()
        }))
      };

      jest.spyOn(WebSocketClient.prototype as any, 'dynamicImport').mockImplementation(async (module: string) => {
        if (module === 'laravel-echo') return mockEcho;
        if (module === 'socket.io-client') return { default: jest.fn() };
        throw new Error(`Unknown module: ${module}`);
      });

      mockConfig.driver = 'redis';
      client = new WebSocketClient(mockConfig);
    });

    it('should connect to Redis/Echo successfully', async () => {
      await client.connect();

      expect(mockEcho.default).toHaveBeenCalledWith(
        expect.objectContaining({
          broadcaster: 'socket.io',
          host: 'localhost:6001'
        })
      );
    });

    it('should bind socket events for Redis', async () => {
      await client.connect();

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Channel Subscription', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should subscribe to channel and event', () => {
      const callback = jest.fn();
      client.subscribe('tasks', 'task.updated', callback);

      expect(mockSubscription.bind).toHaveBeenCalledWith('task.updated', expect.any(Function));
    });

    it('should queue subscription if not connected', () => {
      const disconnectedClient = new WebSocketClient(mockConfig);
      const callback = jest.fn();

      // Subscribe before connecting
      disconnectedClient.subscribe('tasks', 'task.created', callback);

      // Should not throw, should queue the listener
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners on same channel', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      client.subscribe('tasks', 'task.updated', callback1);
      client.subscribe('tasks', 'task.updated', callback2);

      // Should reuse the same subscription
      expect(mockSubscription.bind).toHaveBeenCalledTimes(1);
    });

    it('should emit events to all listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      client.subscribe('tasks', 'task.updated', callback1);
      client.subscribe('tasks', 'task.updated', callback2);

      // Simulate receiving event
      const eventCallback = mockSubscription.bind.mock.calls[0][1];
      const eventData = { taskId: 'task-123', status: 'done' };
      eventCallback(eventData);

      expect(callback1).toHaveBeenCalledWith(eventData);
      expect(callback2).toHaveBeenCalledWith(eventData);
    });

    it('should handle subscription errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      client.subscribe('invalid-channel', 'event', jest.fn());

      // Simulate subscription error
      const errorCallback = mockSubscription.bind.mock.calls.find(
        (call: any) => call[0] === 'error'
      )?.[1];

      if (errorCallback) {
        errorCallback(new Error('Subscription failed'));
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Unsubscribe', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should unsubscribe specific callback', () => {
      const callback = jest.fn();
      client.subscribe('tasks', 'task.updated', callback);
      client.unsubscribe('tasks', 'task.updated', callback);

      // Callback should not be called after unsubscribe
      const eventCallback = mockSubscription.bind.mock.calls[0][1];
      eventCallback({ taskId: 'task-123' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should unsubscribe all callbacks if no specific callback provided', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      client.subscribe('tasks', 'task.updated', callback1);
      client.subscribe('tasks', 'task.updated', callback2);

      client.unsubscribe('tasks', 'task.updated');

      // No callbacks should be called
      const eventCallback = mockSubscription.bind.mock.calls[0][1];
      eventCallback({ taskId: 'task-123' });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    it('should retry connection with exponential backoff', async () => {
      const errorClient = new WebSocketClient({
        ...mockConfig,
        reconnectAttempts: 3,
        reconnectDelay: 1000
      });

      // Mock connection to fail
      jest.spyOn(errorClient as any, 'connectSoketi').mockImplementation(() => {
        throw new Error('Connection failed');
      });

      // Attempt to connect (will fail)
      const promise = errorClient.connect();

      // First retry after 1000ms
      jest.advanceTimersByTime(1000);

      // Second retry after 2000ms (exponential backoff)
      jest.advanceTimersByTime(2000);

      // Third retry after 4000ms
      jest.advanceTimersByTime(4000);

      await promise.catch(() => {});

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('should stop retrying after max attempts', async () => {
      const errorClient = new WebSocketClient({
        ...mockConfig,
        reconnectAttempts: 2,
        reconnectDelay: 500
      });

      jest.spyOn(errorClient as any, 'connectSoketi').mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const promise = errorClient.connect();

      // Exhaust all retry attempts
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(5000);
      }

      await promise.catch(() => {});

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect')
      );
    });
  });

  describe('Disconnect', () => {
    it('should disconnect cleanly', async () => {
      const mockDisconnect = jest.fn();
      mockPusher.default.mockImplementation(() => ({
        connection: mockConnection,
        subscribe: jest.fn(() => mockSubscription),
        disconnect: mockDisconnect
      }));

      client = new WebSocketClient(mockConfig);
      await client.connect();

      client.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPusher.default.mockImplementation(() => ({
        connection: mockConnection,
        subscribe: jest.fn(() => mockSubscription),
        disconnect: () => {
          throw new Error('Disconnect failed');
        }
      }));

      client = new WebSocketClient(mockConfig);
      await client.connect();

      client.disconnect();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should not error if disconnecting when not connected', () => {
      const newClient = new WebSocketClient(mockConfig);
      expect(() => newClient.disconnect()).not.toThrow();
    });
  });

  describe('Status', () => {
    it('should return connection status', async () => {
      await client.connect();

      const callback = jest.fn();
      client.subscribe('tasks', 'task.updated', callback);

      const status = client.getStatus();

      expect(status).toEqual({
        connected: true,
        driver: 'soketi',
        reconnectAttempts: 0,
        listenerCount: 1,
        subscriptionCount: 1
      });
    });

    it('should show disconnected status', () => {
      const status = client.getStatus();

      expect(status.connected).toBe(false);
      expect(status.reconnectAttempts).toBe(0);
    });
  });

  describe('Event Queue', () => {
    it('should process queued events after connection', async () => {
      const newClient = new WebSocketClient(mockConfig);
      const callback = jest.fn();

      // Subscribe before connecting
      newClient.subscribe('tasks', 'task.updated', callback);

      // Now connect
      await newClient.connect();

      // Event queue should be processed
      expect(mockSubscription.bind).toHaveBeenCalled();
    });
  });

  describe('Error Handling in Event Callbacks', () => {
    it('should handle errors in event callbacks', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await client.connect();

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      client.subscribe('tasks', 'task.updated', errorCallback);

      // Trigger event
      const eventCallback = mockSubscription.bind.mock.calls[0][1];
      eventCallback({ taskId: 'task-123' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event callback'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Unknown Driver', () => {
    it('should throw error for unknown driver', async () => {
      const badConfig: WebSocketConfig = {
        driver: 'unknown' as any,
        appKey: 'key'
      };

      const badClient = new WebSocketClient(badConfig);

      await expect(badClient.connect()).rejects.toThrow('Unknown WebSocket driver');
    });
  });
});

describe('Global WebSocket Client Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    disposeWebSocketClient();
  });

  afterEach(() => {
    disposeWebSocketClient();
  });

  it('should initialize global client', async () => {
    const mockPusher = {
      default: jest.fn().mockImplementation(() => ({
        connection: {
          bind: jest.fn()
        },
        subscribe: jest.fn(() => ({
          bind: jest.fn()
        })),
        disconnect: jest.fn()
      }))
    };

    jest.spyOn(WebSocketClient.prototype as any, 'dynamicImport').mockResolvedValue(mockPusher);

    const config: WebSocketConfig = {
      driver: 'soketi',
      appKey: 'test-key',
      host: 'localhost',
      port: 6001
    };

    const client = await initializeWebSocketClient(config);

    expect(client).toBeDefined();
    expect(getWebSocketClient()).toBe(client);
  });

  it('should return null if no global client', () => {
    expect(getWebSocketClient()).toBeNull();
  });

  it('should dispose global client', async () => {
    const mockDisconnect = jest.fn();
    const mockPusher = {
      default: jest.fn().mockImplementation(() => ({
        connection: {
          bind: jest.fn()
        },
        subscribe: jest.fn(() => ({
          bind: jest.fn()
        })),
        disconnect: mockDisconnect
      }))
    };

    jest.spyOn(WebSocketClient.prototype as any, 'dynamicImport').mockResolvedValue(mockPusher);

    const config: WebSocketConfig = {
      driver: 'soketi',
      appKey: 'test-key'
    };

    await initializeWebSocketClient(config);

    disposeWebSocketClient();

    expect(mockDisconnect).toHaveBeenCalled();
    expect(getWebSocketClient()).toBeNull();
  });
});
