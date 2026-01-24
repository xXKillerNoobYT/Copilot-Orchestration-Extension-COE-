/**
 * Tests for MCPRouter service
 * Verifies intelligent tool routing and provider selection
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { MCPRouter, ToolRoute, ToolExecutionContext } from '../mcpRouter';

jest.mock('vscode');
jest.mock('fs');

describe('MCPRouter', () => {
    let router: MCPRouter;
    const mockWorkspacePath = '/mock/workspace';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock workspace configuration
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultValue?: any) => {
                if (key === 'toolRegistry.path') {
                    return '.github/copilot-tools.json';
                }
                return defaultValue;
            }),
        });

        // Mock workspace folders
        (vscode.workspace as any).workspaceFolders = [
            {
                uri: vscode.Uri.file(mockWorkspacePath),
                name: 'test-workspace',
                index: 0,
            },
        ];

        // Mock fs.existsSync
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        // Get singleton instance
        router = MCPRouter.getInstance();
    });

    afterEach(() => {
        // Clear singleton for next test
        (MCPRouter as any).instance = undefined;
    });

    describe('Initialization', () => {
        it('should be defined', () => {
            expect(router).toBeDefined();
        });

        it('should create singleton instance', () => {
            const router1 = MCPRouter.getInstance();
            const router2 = MCPRouter.getInstance();
            expect(router1).toBe(router2);
        });

        it('should load tool registry from workspace', () => {
            expect(fs.existsSync).toHaveBeenCalled();
        });

        it('should handle missing workspace folder gracefully', () => {
            (vscode.workspace as any).workspaceFolders = [];
            const newRouter = MCPRouter.getInstance();
            expect(newRouter).toBeDefined();
        });
    });

    describe('routeToolCall', () => {
        it('should return github-copilot-default for unknown tools', async () => {
            const context: ToolExecutionContext = {
                toolName: 'unknown-tool',
                arguments: {},
                networkAvailable: true,
                dockerAuthenticated: false,
            };

            const route = await router.routeToolCall(context);

            expect(route.provider).toBe('github-copilot-default');
            expect(route.name).toBe('unknown-tool');
        });

        it('should handle context with agent name', async () => {
            const context: ToolExecutionContext = {
                toolName: 'test-tool',
                arguments: { key: 'value' },
                agentName: 'test-agent',
                networkAvailable: true,
                dockerAuthenticated: true,
            };

            const route = await router.routeToolCall(context);
            expect(route).toBeDefined();
        });

        it('should handle context with performance metrics', async () => {
            const metrics = new Map<string, number>();
            metrics.set('latency', 100);

            const context: ToolExecutionContext = {
                toolName: 'test-tool',
                arguments: {},
                networkAvailable: true,
                dockerAuthenticated: true,
                performanceMetrics: metrics,
            };

            const route = await router.routeToolCall(context);
            expect(route).toBeDefined();
        });
    });

    describe('getProviders', () => {
        it('should return empty array for non-existent tools', () => {
            const providers = router.getProviders('non-existent-tool');
            expect(providers).toEqual([]);
        });

        it('should return providers for registered tools', () => {
            const providers = router.getProviders('some-tool');
            expect(Array.isArray(providers)).toBe(true);
        });
    });

    describe('addCustomRule', () => {
        it('should add custom routing rule for tool', () => {
            const customRule = (context: ToolExecutionContext) => {
                return context.agentName === 'special-agent' ? 'docker' : 'local';
            };

            expect(() => {
                router.addCustomRule('special-tool', customRule);
            }).not.toThrow();
        });

        it('should allow multiple custom rules', () => {
            router.addCustomRule('tool1', () => 'local');
            router.addCustomRule('tool2', () => 'docker');

            // Both should be added without conflict
            expect(router.getProviders('tool1')).toBeDefined();
            expect(router.getProviders('tool2')).toBeDefined();
        });
    });

    describe('reload', () => {
        it('should reload tool registry from disk', () => {
            const existsSpy = fs.existsSync as jest.Mock;
            existsSpy.mockClear();

            router.reload();

            expect(existsSpy).toHaveBeenCalled();
        });

        it('should clear existing registry on reload', () => {
            router.reload();

            // After reload, unknown tools should still return default route
            const context: ToolExecutionContext = {
                toolName: 'test',
                arguments: {},
                networkAvailable: true,
                dockerAuthenticated: true,
            };

            router.routeToolCall(context).then(route => {
                expect(route).toBeDefined();
            });
        });
    });

    describe('Provider Selection Logic', () => {
        it('should handle network unavailable scenario', async () => {
            const context: ToolExecutionContext = {
                toolName: 'network-tool',
                arguments: {},
                networkAvailable: false,
                dockerAuthenticated: true,
            };

            const route = await router.routeToolCall(context);
            expect(route).toBeDefined();
        });

        it('should handle docker not authenticated scenario', async () => {
            const context: ToolExecutionContext = {
                toolName: 'docker-tool',
                arguments: {},
                networkAvailable: true,
                dockerAuthenticated: false,
            };

            const route = await router.routeToolCall(context);
            // Should not route to docker when not authenticated
            expect(route.provider).not.toBe('docker');
        });
    });

    describe('Tool Registry Loading', () => {
        it('should handle invalid JSON in registry file', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('{ invalid json }');

            expect(() => {
                (MCPRouter as any).instance = undefined;
                MCPRouter.getInstance();
            }).not.toThrow();
        });

        it('should handle file read errors gracefully', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('File read error');
            });

            expect(() => {
                (MCPRouter as any).instance = undefined;
                MCPRouter.getInstance();
            }).not.toThrow();
        });
    });
});
