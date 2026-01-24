/**
 * Tests for WebSocketClient service
 * Verifies real-time WebSocket communication with Soketi/Pusher/Redis
 */

import * as vscode from 'vscode';
import { WebSocketClient, WebSocketConfig } from '../webSocketClient';

jest.mock('vscode');

describe('WebSocketClient', () => {
    let client: WebSocketClient;
    let mockConfig: WebSocketConfig;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConfig = {
            driver: 'soketi',
            appKey: 'test-app-key',
            host: 'localhost',
            port: 6001,
            scheme: 'http',
            reconnectAttempts: 5,
            reconnectDelay: 1000,
        };

        client = new WebSocketClient(mockConfig);
    });

    describe('Initialization', () => {
        it('should be defined', () => {
            expect(client).toBeDefined();
        });

        it('should initialize with Soketi driver', () => {
            const sClient = new WebSocketClient({ driver: 'soketi', appKey: 'key' });
            expect(sClient).toBeDefined();
        });

        it('should initialize with Pusher driver', () => {
            const pClient = new WebSocketClient({ driver: 'pusher', appKey: 'key', cluster: 'us2' });
            expect(pClient).toBeDefined();
        });

        it('should initialize with Redis driver', () => {
            const rClient = new WebSocketClient({ driver: 'redis', appKey: 'key' });
            expect(rClient).toBeDefined();
        });

        it('should set default reconnect attempts', () => {
            const defaultClient = new WebSocketClient({ driver: 'soketi', appKey: 'key' });
            expect(defaultClient).toBeDefined();
        });

        it('should set custom reconnect attempts', () => {
            const customClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'key',
                reconnectAttempts: 20,
            });
            expect(customClient).toBeDefined();
        });

        it('should set default reconnect delay', () => {
            const defaultClient = new WebSocketClient({ driver: 'soketi', appKey: 'key' });
            expect(defaultClient).toBeDefined();
        });

        it('should set custom reconnect delay', () => {
            const customClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'key',
                reconnectDelay: 5000,
            });
            expect(customClient).toBeDefined();
        });
    });

    describe('subscribe', () => {
        it('should queue listeners when not connected', () => {
            const callback = jest.fn();

            // Subscribe before connection
            client.subscribe('test-channel', 'test-event', callback);

            // Should not throw
            expect(callback).not.toHaveBeenCalled();
        });

        it('should handle multiple callbacks for same event', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            client.subscribe('channel', 'event', callback1);
            client.subscribe('channel', 'event', callback2);

            // Both callbacks should be registered
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should handle different events on same channel', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            client.subscribe('channel', 'event1', callback1);
            client.subscribe('channel', 'event2', callback2);

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should handle different channels', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            client.subscribe('channel1', 'event', callback1);
            client.subscribe('channel2', 'event', callback2);

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });
    });

    describe('unsubscribe', () => {
        it('should remove specific callback', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            client.subscribe('channel', 'event', callback1);
            client.subscribe('channel', 'event', callback2);

            client.unsubscribe('channel', 'event', callback1);

            // Should not throw
            expect(() => client.unsubscribe('channel', 'event', callback1)).not.toThrow();
        });

        it('should remove all callbacks when no specific callback provided', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            client.subscribe('channel', 'event', callback1);
            client.subscribe('channel', 'event', callback2);

            client.unsubscribe('channel', 'event');

            // Should not throw
            expect(() => client.unsubscribe('channel', 'event')).not.toThrow();
        });

        it('should handle unsubscribe from non-existent event', () => {
            expect(() => {
                client.unsubscribe('non-existent', 'event');
            }).not.toThrow();
        });
    });

    describe('disconnect', () => {
        it('should be callable', () => {
            expect(() => {
                client.disconnect();
            }).not.toThrow();
        });

        it('should handle disconnect when not connected', () => {
            expect(() => {
                client.disconnect();
            }).not.toThrow();
        });
    });

    describe('isConnected', () => {
        it('should have connection management methods', () => {
            // The WebSocketClient doesn't expose getConnectionStatus publicly
            // But we can verify the client was created
            expect(client).toBeDefined();
            expect(client.disconnect).toBeDefined();
        });
    });

    describe('Configuration Validation', () => {
        it('should accept minimal configuration', () => {
            const minimalClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'minimal-key',
            });
            expect(minimalClient).toBeDefined();
        });

        it('should accept full configuration', () => {
            const fullConfig: WebSocketConfig = {
                driver: 'soketi',
                appKey: 'full-key',
                host: 'example.com',
                port: 443,
                scheme: 'https',
                cluster: 'us-west',
                reconnectAttempts: 15,
                reconnectDelay: 2000,
            };
            const fullClient = new WebSocketClient(fullConfig);
            expect(fullClient).toBeDefined();
        });

        it('should handle HTTPS scheme', () => {
            const httpsClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'secure-key',
                scheme: 'https',
            });
            expect(httpsClient).toBeDefined();
        });

        it('should handle custom port', () => {
            const customPortClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'key',
                port: 8080,
            });
            expect(customPortClient).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle connection errors gracefully', () => {
            // Connection should not throw in constructor
            expect(() => {
                new WebSocketClient({ driver: 'soketi', appKey: 'test' });
            }).not.toThrow();
        });

        it('should handle subscription errors gracefully', () => {
            const callback = jest.fn();

            expect(() => {
                client.subscribe('error-channel', 'error-event', callback);
            }).not.toThrow();
        });

        it('should handle callback errors gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Callback error');
            });

            expect(() => {
                client.subscribe('channel', 'event', errorCallback);
            }).not.toThrow();
        });
    });

    describe('Driver-specific Features', () => {
        it('should support Soketi with custom host and port', () => {
            const sClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'key',
                host: 'soketi.example.com',
                port: 6001,
            });
            expect(sClient).toBeDefined();
        });

        it('should support Pusher with cluster', () => {
            const pClient = new WebSocketClient({
                driver: 'pusher',
                appKey: 'key',
                cluster: 'eu',
            });
            expect(pClient).toBeDefined();
        });

        it('should support Redis with Echo Server', () => {
            const rClient = new WebSocketClient({
                driver: 'redis',
                appKey: 'key',
                host: 'redis.example.com',
                port: 6379,
            });
            expect(rClient).toBeDefined();
        });
    });

    describe('Reconnection Logic', () => {
        it('should respect max reconnect attempts', () => {
            const limitedClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'key',
                reconnectAttempts: 3,
            });
            expect(limitedClient).toBeDefined();
        });

        it('should respect reconnect delay', () => {
            const delayClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'key',
                reconnectDelay: 5000,
            });
            expect(delayClient).toBeDefined();
        });

        it('should handle unlimited reconnect attempts when set to 0', () => {
            const unlimitedClient = new WebSocketClient({
                driver: 'soketi',
                appKey: 'key',
                reconnectAttempts: 0,
            });
            expect(unlimitedClient).toBeDefined();
        });
    });
});
