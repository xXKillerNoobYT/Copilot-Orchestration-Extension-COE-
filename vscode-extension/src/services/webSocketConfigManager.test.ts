/**
 * Tests for WebSocket Config Manager
 * Tests configuration management, validation, and driver defaults
 */

import { WebSocketConfigManager, WebSocketSettings } from './webSocketConfigManager';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode');

// Mock webSocketClient to avoid circular dependencies
jest.mock('./webSocketClient', () => ({
    initializeWebSocketClient: jest.fn(),
    disposeWebSocketClient: jest.fn(),
}), { virtual: true });

describe('WebSocketConfigManager', () => {
    let mockConfig: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock workspace configuration
        mockConfig = {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
            update: jest.fn().mockResolvedValue(undefined),
        };

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
        (vscode.ConfigurationTarget as any) = { Workspace: 2 };
    });

    describe('getConfig', () => {
        it('should return default configuration', () => {
            const config = WebSocketConfigManager.getConfig();

            expect(config.driver).toBe('soketi');
            expect(config.appKey).toBe('default-app-key');
            expect(config.autoConnect).toBe(true);
            expect(config.reconnectAttempts).toBe(10);
            expect(config.reconnectDelay).toBe(1000);
        });

        it('should read configuration from VS Code settings', () => {
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                const values: any = {
                    driver: 'pusher',
                    appKey: 'custom-app-key',
                    host: 'custom-host',
                    port: 8080,
                    scheme: 'https',
                    cluster: 'eu',
                    autoConnect: false,
                    reconnectAttempts: 5,
                    reconnectDelay: 2000,
                };
                return values[key] ?? defaultValue;
            });

            const config = WebSocketConfigManager.getConfig();

            expect(config.driver).toBe('pusher');
            expect(config.appKey).toBe('custom-app-key');
            expect(config.host).toBe('custom-host');
            expect(config.port).toBe(8080);
            expect(config.scheme).toBe('https');
            expect(config.cluster).toBe('eu');
            expect(config.autoConnect).toBe(false);
            expect(config.reconnectAttempts).toBe(5);
            expect(config.reconnectDelay).toBe(2000);
        });

        it('should handle null autoConnect as default to true', () => {
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'autoConnect') return null;
                return defaultValue;
            });

            const config = WebSocketConfigManager.getConfig();

            expect(config.autoConnect).toBe(true);
        });

        it('should use fallback for missing optional fields', () => {
            mockConfig.get.mockReturnValue(undefined);

            const config = WebSocketConfigManager.getConfig();

            expect(config.host).toBeUndefined();
            expect(config.port).toBeUndefined();
            expect(config.scheme).toBeUndefined();
            expect(config.cluster).toBeUndefined();
        });
    });

    describe('updateConfig', () => {
        it('should update single setting', async () => {
            await WebSocketConfigManager.updateConfig({ appKey: 'new-key' });

            expect(mockConfig.update).toHaveBeenCalledWith(
                'appKey',
                'new-key',
                vscode.ConfigurationTarget.Workspace
            );
        });

        it('should update multiple settings', async () => {
            await WebSocketConfigManager.updateConfig({
                driver: 'pusher',
                appKey: 'pusher-key',
                cluster: 'us2',
            });

            expect(mockConfig.update).toHaveBeenCalledTimes(3);
            expect(mockConfig.update).toHaveBeenCalledWith('driver', 'pusher', expect.any(Number));
            expect(mockConfig.update).toHaveBeenCalledWith('appKey', 'pusher-key', expect.any(Number));
            expect(mockConfig.update).toHaveBeenCalledWith('cluster', 'us2', expect.any(Number));
        });

        it('should skip undefined values', async () => {
            await WebSocketConfigManager.updateConfig({
                appKey: 'new-key',
                host: undefined,
            });

            expect(mockConfig.update).toHaveBeenCalledTimes(1);
            expect(mockConfig.update).toHaveBeenCalledWith('appKey', 'new-key', expect.any(Number));
        });

        it('should handle empty partial update', async () => {
            await WebSocketConfigManager.updateConfig({});

            expect(mockConfig.update).not.toHaveBeenCalled();
        });
    });

    describe('toClientConfig', () => {
        it('should convert settings to client config', () => {
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                const values: any = {
                    driver: 'soketi',
                    appKey: 'test-key',
                    host: 'localhost',
                    port: 6001,
                    scheme: 'http',
                    reconnectAttempts: 10,
                    reconnectDelay: 1000,
                };
                return values[key] ?? defaultValue;
            });

            const clientConfig = WebSocketConfigManager.toClientConfig();

            expect(clientConfig.driver).toBe('soketi');
            expect(clientConfig.appKey).toBe('test-key');
            expect(clientConfig.host).toBe('localhost');
            expect(clientConfig.port).toBe(6001);
            expect(clientConfig.scheme).toBe('http');
            expect(clientConfig.reconnectAttempts).toBe(10);
            expect(clientConfig.reconnectDelay).toBe(1000);
        });

        it('should exclude autoConnect from client config', () => {
            const clientConfig = WebSocketConfigManager.toClientConfig();

            expect(clientConfig).not.toHaveProperty('autoConnect');
        });
    });

    describe('validate', () => {
        it('should pass valid soketi configuration', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'test-key',
                host: 'localhost',
                port: 6001,
                scheme: 'http',
                autoConnect: true,
                reconnectAttempts: 10,
                reconnectDelay: 1000,
            };

            const error = WebSocketConfigManager.validate(settings);

            expect(error).toBeNull();
        });

        it('should fail when appKey is empty', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: '',
                host: 'localhost',
            };

            const error = WebSocketConfigManager.validate(settings);

            expect(error).toBe('appKey is required');
        });

        it('should fail when appKey is whitespace', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: '   ',
                host: 'localhost',
            };

            const error = WebSocketConfigManager.validate(settings);

            expect(error).toBe('appKey is required');
        });

        it('should fail when soketi is missing host', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'test-key',
            };

            const error = WebSocketConfigManager.validate(settings);

            expect(error).toBe('Soketi requires host to be configured');
        });

        it('should fail when redis is missing host', () => {
            const settings: WebSocketSettings = {
                driver: 'redis',
                appKey: 'test-key',
            };

            const error = WebSocketConfigManager.validate(settings);

            expect(error).toBe('Redis requires host to be configured');
        });

        it('should pass pusher without host', () => {
            const settings: WebSocketSettings = {
                driver: 'pusher',
                appKey: 'test-key',
                cluster: 'us2',
            };

            const error = WebSocketConfigManager.validate(settings);

            expect(error).toBeNull();
        });

        it('should fail when port is below 1', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'test-key',
                host: 'localhost',
                port: 0,
            };

            const error = WebSocketConfigManager.validate(settings);

            expect(error).toBe('Port must be between 1 and 65535');
        });

        it('should fail when port is above 65535', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'test-key',
                host: 'localhost',
                port: 70000,
            };

            const error = WebSocketConfigManager.validate(settings);

            expect(error).toBe('Port must be between 1 and 65535');
        });

        it('should pass with valid port boundaries', () => {
            const settings1: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'test-key',
                host: 'localhost',
                port: 1,
            };

            const settings2: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'test-key',
                host: 'localhost',
                port: 65535,
            };

            expect(WebSocketConfigManager.validate(settings1)).toBeNull();
            expect(WebSocketConfigManager.validate(settings2)).toBeNull();
        });
    });

    describe('getDefaultConfig', () => {
        it('should return default config for soketi', () => {
            const config = WebSocketConfigManager.getDefaultConfig('soketi');

            expect(config.driver).toBe('soketi');
            expect(config.appKey).toBe('default-app-key');
            expect(config.host).toBe('localhost');
            expect(config.port).toBe(6001);
            expect(config.scheme).toBe('http');
            expect(config.autoConnect).toBe(true);
            expect(config.reconnectAttempts).toBe(10);
            expect(config.reconnectDelay).toBe(1000);
        });

        it('should return default config for pusher', () => {
            const config = WebSocketConfigManager.getDefaultConfig('pusher');

            expect(config.driver).toBe('pusher');
            expect(config.appKey).toBe('');
            expect(config.cluster).toBe('mt1');
            expect(config.autoConnect).toBe(true);
            expect(config.reconnectAttempts).toBe(10);
            expect(config.reconnectDelay).toBe(1000);
            expect(config.host).toBeUndefined();
            expect(config.port).toBeUndefined();
        });

        it('should return default config for redis', () => {
            const config = WebSocketConfigManager.getDefaultConfig('redis');

            expect(config.driver).toBe('redis');
            expect(config.appKey).toBe('default-app-key');
            expect(config.host).toBe('localhost');
            expect(config.port).toBe(6001);
            expect(config.scheme).toBe('http');
            expect(config.autoConnect).toBe(true);
            expect(config.reconnectAttempts).toBe(10);
            expect(config.reconnectDelay).toBe(1000);
        });
    });

    describe('showConfigurationPanel', () => {
        it('should configure soketi driver', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('soketi');
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('soketi-app-key') // appKey
                .mockResolvedValueOnce('localhost') // host
                .mockResolvedValueOnce('6001'); // port

            await WebSocketConfigManager.showConfigurationPanel();

            expect(mockConfig.update).toHaveBeenCalledWith('driver', 'soketi', expect.any(Number));
            expect(mockConfig.update).toHaveBeenCalledWith('appKey', 'soketi-app-key', expect.any(Number));
            expect(mockConfig.update).toHaveBeenCalledWith('host', 'localhost', expect.any(Number));
            expect(mockConfig.update).toHaveBeenCalledWith('port', 6001, expect.any(Number));

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                '[WebSocket] Configuration updated successfully!'
            );
        });

        it('should configure pusher driver', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('pusher');
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('pusher-key') // appKey
                .mockResolvedValueOnce('us2'); // cluster

            await WebSocketConfigManager.showConfigurationPanel();

            expect(mockConfig.update).toHaveBeenCalledWith('driver', 'pusher', expect.any(Number));
            expect(mockConfig.update).toHaveBeenCalledWith('appKey', 'pusher-key', expect.any(Number));
            expect(mockConfig.update).toHaveBeenCalledWith('cluster', 'us2', expect.any(Number));
        });

        it('should cancel when driver is not selected', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await WebSocketConfigManager.showConfigurationPanel();

            expect(mockConfig.update).not.toHaveBeenCalled();
        });

        it('should cancel when appKey is cancelled', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('soketi');
            (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(undefined); // appKey cancelled

            await WebSocketConfigManager.showConfigurationPanel();

            expect(mockConfig.update).not.toHaveBeenCalled();
        });

        it('should cancel when host is cancelled for soketi', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('soketi');
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('app-key')
                .mockResolvedValueOnce(undefined); // host cancelled

            await WebSocketConfigManager.showConfigurationPanel();

            expect(mockConfig.update).not.toHaveBeenCalled();
        });

        it('should cancel when port is cancelled for soketi', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('soketi');
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('app-key')
                .mockResolvedValueOnce('localhost')
                .mockResolvedValueOnce(undefined); // port cancelled

            await WebSocketConfigManager.showConfigurationPanel();

            expect(mockConfig.update).not.toHaveBeenCalled();
        });

        it('should parse port as integer', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('redis');
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('redis-key')
                .mockResolvedValueOnce('redis-host')
                .mockResolvedValueOnce('9000');

            await WebSocketConfigManager.showConfigurationPanel();

            expect(mockConfig.update).toHaveBeenCalledWith('port', 9000, expect.any(Number));
        });
    });

    describe('testConnection', () => {
        it('should show error for invalid configuration', async () => {
            mockConfig.get.mockImplementation((key: string) => {
                if (key === 'appKey') return '';
                return undefined;
            });

            await WebSocketConfigManager.testConnection();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                '[WebSocket] Configuration error: appKey is required'
            );
        });

        it('should test connection with valid config', async () => {
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                const values: any = {
                    driver: 'soketi',
                    appKey: 'test-key',
                    host: 'localhost',
                    port: 6001,
                    scheme: 'http',
                    reconnectAttempts: 10,
                    reconnectDelay: 1000,
                };
                return values[key] ?? defaultValue;
            });

            const { initializeWebSocketClient, disposeWebSocketClient } = require('./webSocketClient');

            const mockClient = {
                getStatus: jest.fn().mockReturnValue({ connected: true }),
            };

            (initializeWebSocketClient as jest.Mock).mockResolvedValue(mockClient);

            await WebSocketConfigManager.testConnection();

            expect(initializeWebSocketClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    driver: 'soketi',
                    appKey: 'test-key',
                    host: 'localhost',
                })
            );

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Testing connection to soketi')
            );

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Connected to soketi successfully')
            );

            expect(disposeWebSocketClient).toHaveBeenCalled();
        });

        it('should show warning when connection status pending', async () => {
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                const values: any = {
                    driver: 'soketi',
                    appKey: 'test-key',
                    host: 'localhost',
                };
                return values[key] ?? defaultValue;
            });

            const { initializeWebSocketClient } = require('./webSocketClient');

            const mockClient = {
                getStatus: jest.fn().mockReturnValue({ connected: false }),
            };

            (initializeWebSocketClient as jest.Mock).mockResolvedValue(mockClient);

            await WebSocketConfigManager.testConnection();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                '[WebSocket] Connection status pending - check server logs'
            );
        });

        it('should handle connection errors', async () => {
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                const values: any = {
                    driver: 'soketi',
                    appKey: 'test-key',
                    host: 'localhost',
                };
                return values[key] ?? defaultValue;
            });

            const { initializeWebSocketClient } = require('./webSocketClient');
            (initializeWebSocketClient as jest.Mock).mockRejectedValue(new Error('Connection failed'));

            await WebSocketConfigManager.testConnection();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                '[WebSocket] Connection failed: Connection failed'
            );
        });

        it('should handle non-Error exceptions', async () => {
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                const values: any = {
                    driver: 'soketi',
                    appKey: 'test-key',
                    host: 'localhost',
                };
                return values[key] ?? defaultValue;
            });

            const { initializeWebSocketClient } = require('./webSocketClient');
            (initializeWebSocketClient as jest.Mock).mockRejectedValue('String error');

            await WebSocketConfigManager.testConnection();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                '[WebSocket] Connection failed: Unknown error'
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle all drivers in configuration panel', async () => {
            for (const driver of ['soketi', 'pusher', 'redis']) {
                jest.clearAllMocks();

                (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(driver);

                if (driver === 'pusher') {
                    (vscode.window.showInputBox as jest.Mock)
                        .mockResolvedValueOnce('key')
                        .mockResolvedValueOnce('mt1');
                } else {
                    (vscode.window.showInputBox as jest.Mock)
                        .mockResolvedValueOnce('key')
                        .mockResolvedValueOnce('localhost')
                        .mockResolvedValueOnce('6001');
                }

                await WebSocketConfigManager.showConfigurationPanel();

                expect(mockConfig.update).toHaveBeenCalledWith('driver', driver, expect.any(Number));
            }
        });

        it('should handle empty cluster for pusher', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('pusher');
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('pusher-key')
                .mockResolvedValueOnce(''); // empty cluster

            await WebSocketConfigManager.showConfigurationPanel();

            expect(mockConfig.update).toHaveBeenCalledWith('cluster', '', expect.any(Number));
        });

        it('should handle non-numeric port input', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('soketi');
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('key')
                .mockResolvedValueOnce('localhost')
                .mockResolvedValueOnce('abc'); // invalid port

            await WebSocketConfigManager.showConfigurationPanel();

            // parseInt('abc') = NaN, which becomes NaN in update
            expect(mockConfig.update).toHaveBeenCalledWith('port', NaN, expect.any(Number));
        });
    });
});
