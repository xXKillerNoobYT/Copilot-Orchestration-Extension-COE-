/**
 * Tests for WebSocketConfigManager
 * Verifies WebSocket configuration management in VS Code settings
 */

import * as vscode from 'vscode';
import { WebSocketConfigManager, WebSocketSettings } from '../webSocketConfigManager';

jest.mock('vscode');

describe('WebSocketConfigManager', () => {
    let mockConfig: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConfig = {
            get: jest.fn((key: string) => {
                const defaults: Record<string, any> = {
                    driver: 'soketi',
                    appKey: 'test-app-key',
                    host: 'localhost',
                    port: 6001,
                    scheme: 'http',
                    autoConnect: true,
                    reconnectAttempts: 10,
                    reconnectDelay: 1000,
                };
                return defaults[key];
            }),
            update: jest.fn(),
        };

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    });

    describe('getConfig', () => {
        it('should get WebSocket configuration from VS Code settings', () => {
            const config = WebSocketConfigManager.getConfig();

            expect(config).toBeDefined();
            expect(config.driver).toBe('soketi');
            expect(config.appKey).toBe('test-app-key');
            expect(vscode.workspace.getConfiguration).toHaveBeenCalled();
        });

        it('should provide default values when not configured', () => {
            mockConfig.get.mockReturnValue(undefined);

            const config = WebSocketConfigManager.getConfig();

            expect(config.driver).toBe('soketi');
            expect(config.appKey).toBe('default-app-key');
        });

        it('should read all configuration fields', () => {
            const config = WebSocketConfigManager.getConfig();

            expect(config.driver).toBeDefined();
            expect(config.appKey).toBeDefined();
            expect(config.host).toBeDefined();
            expect(config.port).toBeDefined();
            expect(config.scheme).toBeDefined();
        });

        it('should handle autoConnect boolean', () => {
            mockConfig.get.mockImplementation((key: string) => {
                return key === 'autoConnect' ? false : undefined;
            });

            const config = WebSocketConfigManager.getConfig();
            expect(config.autoConnect).toBe(false);
        });
    });

    describe('updateConfig', () => {
        it('should update single configuration value', async () => {
            await WebSocketConfigManager.updateConfig({ appKey: 'new-key' });

            expect(mockConfig.update).toHaveBeenCalledWith(
                'appKey',
                'new-key',
                vscode.ConfigurationTarget.Workspace
            );
        });

        it('should update multiple configuration values', async () => {
            await WebSocketConfigManager.updateConfig({
                appKey: 'new-key',
                host: 'new-host',
                port: 8080,
            });

            expect(mockConfig.update).toHaveBeenCalledTimes(3);
        });

        it('should skip undefined values', async () => {
            await WebSocketConfigManager.updateConfig({
                appKey: 'new-key',
                host: undefined,
            });

            expect(mockConfig.update).toHaveBeenCalledTimes(1);
            expect(mockConfig.update).toHaveBeenCalledWith('appKey', 'new-key', expect.any(Number));
        });

        it('should update driver', async () => {
            await WebSocketConfigManager.updateConfig({ driver: 'pusher' });

            expect(mockConfig.update).toHaveBeenCalledWith(
                'driver',
                'pusher',
                vscode.ConfigurationTarget.Workspace
            );
        });
    });

    describe('toClientConfig', () => {
        it('should convert settings to client config', () => {
            const clientConfig = WebSocketConfigManager.toClientConfig();

            expect(clientConfig).toBeDefined();
            expect(clientConfig.driver).toBe('soketi');
            expect(clientConfig.appKey).toBe('test-app-key');
        });

        it('should omit autoConnect from client config', () => {
            const clientConfig = WebSocketConfigManager.toClientConfig();

            expect((clientConfig as any).autoConnect).toBeUndefined();
        });

        it('should include all required WebSocket config fields', () => {
            const clientConfig = WebSocketConfigManager.toClientConfig();

            expect(clientConfig.driver).toBeDefined();
            expect(clientConfig.appKey).toBeDefined();
        });
    });

    describe('validate', () => {
        it('should validate valid configuration', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'valid-key',
                host: 'localhost',
                port: 6001,
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toBeNull();
        });

        it('should reject empty appKey', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: '',
                host: 'localhost',
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toContain('appKey');
        });

        it('should require host for Soketi', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'key',
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toContain('Soketi');
            expect(error).toContain('host');
        });

        it('should require host for Redis', () => {
            const settings: WebSocketSettings = {
                driver: 'redis',
                appKey: 'key',
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toContain('Redis');
            expect(error).toContain('host');
        });

        it('should not require host for Pusher', () => {
            const settings: WebSocketSettings = {
                driver: 'pusher',
                appKey: 'key',
                cluster: 'mt1',
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toBeNull();
        });

        it('should validate port range', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'key',
                host: 'localhost',
                port: 70000,
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toContain('Port');
        });

        it('should validate minimum port', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'key',
                host: 'localhost',
                port: -1, // Negative port is invalid
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toContain('Port');
        });

        it('should allow valid port range', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: 'key',
                host: 'localhost',
                port: 8080,
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toBeNull();
        });
    });

    describe('getDefaultConfig', () => {
        it('should return Soketi defaults', () => {
            const defaults = WebSocketConfigManager.getDefaultConfig('soketi');

            expect(defaults.driver).toBe('soketi');
            expect(defaults.host).toBe('localhost');
            expect(defaults.port).toBe(6001);
        });

        it('should return Pusher defaults', () => {
            const defaults = WebSocketConfigManager.getDefaultConfig('pusher');

            expect(defaults.driver).toBe('pusher');
            expect(defaults.cluster).toBe('mt1');
        });

        it('should return Redis defaults', () => {
            const defaults = WebSocketConfigManager.getDefaultConfig('redis');

            expect(defaults.driver).toBe('redis');
            expect(defaults.host).toBe('localhost');
            expect(defaults.port).toBe(6001);
        });

        it('should include reconnect settings in defaults', () => {
            const defaults = WebSocketConfigManager.getDefaultConfig('soketi');

            expect(defaults.reconnectAttempts).toBe(10);
            expect(defaults.reconnectDelay).toBe(1000);
        });
    });

    describe('Configuration Panel', () => {
        it('should show configuration panel', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await WebSocketConfigManager.showConfigurationPanel();

            expect(vscode.window.showQuickPick).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing configuration section', () => {
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn(() => undefined),
                update: jest.fn(),
            });

            const config = WebSocketConfigManager.getConfig();
            expect(config).toBeDefined();
            expect(config.driver).toBe('soketi');
        });

        it('should handle null port', () => {
            mockConfig.get.mockImplementation((key: string) => {
                return key === 'port' ? null : undefined;
            });

            const config = WebSocketConfigManager.getConfig();
            // config.get returns null, which is preserved
            expect(config.port).toBeNull();
        });

        it('should validate whitespace-only appKey as invalid', () => {
            const settings: WebSocketSettings = {
                driver: 'soketi',
                appKey: '   ',
                host: 'localhost',
            };

            const error = WebSocketConfigManager.validate(settings);
            expect(error).toContain('appKey');
        });
    });
});
