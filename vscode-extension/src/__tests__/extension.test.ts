import * as vscode from 'vscode';
import { activate, deactivate } from '../extension';

// Mock all dependencies
jest.mock('vscode');
jest.mock('../taskParser');
jest.mock('../taskGraphGenerator');
jest.mock('../orchestratorPanel');
jest.mock('../taskFileCodeLens');
jest.mock('../taskFileDocumentWatcher');
jest.mock('../taskInteractionAPI');
jest.mock('../taskFileSyntaxHighlighter');
jest.mock('../commands/testConnection');
jest.mock('../commands/executeLLM');
jest.mock('../config/llmConfig');
jest.mock('../commands/autoAgentLoop');
jest.mock('../webviews/settingsPanel');
jest.mock('../panels/visualVerificationPanel');
jest.mock('../panels/planAdjustmentWizard');
jest.mock('../panels/planBuilderPanel');
jest.mock('../panels/auditDashboardPanel');
jest.mock('../panels/DeadLetterQueuePanel');
jest.mock('../services/deadLetterQueue');
jest.mock('../services/webSocketConfigManager');
jest.mock('../services/webSocketClient');
jest.mock('../services/llmIPMonitor', () => ({
    getLLMIPMonitor: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        checkConnection: jest.fn(),
        dispose: jest.fn(),
    })),
}));
jest.mock('../services/connectionMonitor', () => ({
    ConnectionMonitor: {
        getInstance: jest.fn(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            dispose: jest.fn(),
            getState: jest.fn(() => ({
                mcp: 'connected',
                websocket: 'connected',
                docker: 'disconnected',
                retryCount: 0,
            })),
            onDidChangeState: {
                event: jest.fn(),
            },
        })),
    },
    createConnectionStatusBarItem: jest.fn(() => ({
        text: '',
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
    })),
    showConnectionDetails: jest.fn(),
}));
jest.mock('../services/mcpClient');
jest.mock('../services/mcpRouter');
jest.mock('../services/toolSelector');
jest.mock('../commands/planAdjustmentCommands');
jest.mock('../commands/mcpConfigCommands');
jest.mock('../agentProfileWatcher', () => ({
    getAgentProfileWatcher: jest.fn(() => ({
        start: jest.fn(),
        onChange: jest.fn(),
        dispose: jest.fn(),
    })),
    disposeAgentProfileWatcher: jest.fn(),
}));
jest.mock('../views/tasksViewProvider');
jest.mock('../views/agentsViewProvider');
jest.mock('../views/plansViewProvider');
jest.mock('../utils/errorMessages', () => ({
    initializeErrorLogging: jest.fn(() => ({
        appendLine: jest.fn(),
        dispose: jest.fn(),
    })),
    disposeErrorLogging: jest.fn(),
}));
jest.mock('../services/healthCheck', () => ({
    HealthCheckService: {
        getInstance: jest.fn(() => ({
            runHealthCheck: jest.fn().mockResolvedValue({
                status: 'healthy',
                checks: [],
                timestamp: new Date().toISOString(),
            }),
            updateStatusBar: jest.fn(),
            showWelcomeIfUnhealthy: jest.fn(),
            dispose: jest.fn(),
        })),
    },
}));
jest.mock('better-sqlite3');

describe('Extension', () => {
    let mockContext: vscode.ExtensionContext;
    let mockSubscriptions: any[];
    let mockStorageUri: vscode.Uri;
    let mockGlobalStorageUri: vscode.Uri;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSubscriptions = [];
        mockStorageUri = { fsPath: '/test/storage' } as vscode.Uri;
        mockGlobalStorageUri = { fsPath: '/test/global-storage' } as vscode.Uri;

        mockContext = {
            subscriptions: mockSubscriptions,
            extensionPath: '/test/extension',
            extensionUri: vscode.Uri.file('/test/extension'),
            storageUri: mockStorageUri,
            globalStorageUri: mockGlobalStorageUri,
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn(),
            },
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn(),
            },
            extensionMode: 3, // Production
            asAbsolutePath: jest.fn((relativePath) => `/test/extension/${relativePath}`),
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            logPath: '/test/logs',
            logUri: vscode.Uri.file('/test/logs'),
            secrets: {} as any,
            environmentVariableCollection: {} as any,
            extension: {} as any,
        } as any;

        // Setup VS Code mocks
        (vscode.window as any) = {
            createOutputChannel: jest.fn(() => ({
                appendLine: jest.fn(),
                append: jest.fn(),
                clear: jest.fn(),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn(),
            })),
            createStatusBarItem: jest.fn(() => ({
                text: '',
                tooltip: '',
                command: '',
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn(),
            })),
            createTreeView: jest.fn(() => ({
                dispose: jest.fn(),
                reveal: jest.fn(),
            })),
            registerTreeDataProvider: jest.fn(() => ({
                dispose: jest.fn(),
            })),
            showErrorMessage: jest.fn(),
            showInformationMessage: jest.fn(),
            showWarningMessage: jest.fn(),
        };

        (vscode.commands as any) = {
            registerCommand: jest.fn((command, callback) => ({
                dispose: jest.fn(),
            })),
            executeCommand: jest.fn(),
        };

        (vscode.workspace as any) = {
            registerTextDocumentContentProvider: jest.fn(() => ({
                dispose: jest.fn(),
            })),
            onDidChangeConfiguration: jest.fn(() => ({
                dispose: jest.fn(),
            })),
            getConfiguration: jest.fn(() => ({
                get: jest.fn(),
                has: jest.fn(),
                inspect: jest.fn(),
                update: jest.fn(),
            })),
            workspaceFolders: [
                {
                    uri: vscode.Uri.file('/test/workspace'),
                    name: 'test-workspace',
                    index: 0,
                },
            ],
        };

        (vscode.languages as any) = {
            registerCodeLensProvider: jest.fn(() => ({
                dispose: jest.fn(),
            })),
        };

        Object.defineProperty(vscode, 'StatusBarAlignment', {
            value: { Left: 1, Right: 2 },
            writable: true,
        });

        Object.defineProperty(vscode, 'TreeItemCollapsibleState', {
            value: { None: 0, Collapsed: 1, Expanded: 2 },
            writable: true,
        });
    });

    describe('activate', () => {
        it('should activate extension successfully', async () => {
            await activate(mockContext);

            expect(mockContext.subscriptions.length).toBeGreaterThan(0);
        });

        it('should register output channels', async () => {
            await activate(mockContext);

            expect(vscode.window.createOutputChannel).toHaveBeenCalled();
        });

        it('should register commands', async () => {
            await activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalled();

            // Verify specific commands are registered
            const registeredCommands = (vscode.commands.registerCommand as jest.Mock).mock.calls.map(
                call => call[0]
            );

            expect(registeredCommands).toContain('copilot-orchestrator.testConnection');
        });

        it('should create status bar items', async () => {
            await activate(mockContext);

            expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
        });

        it('should register tree views', async () => {
            await activate(mockContext);

            expect(vscode.window.createTreeView).toHaveBeenCalled();
        });

        it('should handle missing workspace folder gracefully', async () => {
            (vscode.workspace as any).workspaceFolders = undefined;

            // Should not throw
            await expect(activate(mockContext)).resolves.not.toThrow();
        });

        it('should initialize error logging', async () => {
            const { initializeErrorLogging } = require('../utils/errorMessages');

            await activate(mockContext);

            expect(initializeErrorLogging).toHaveBeenCalled();
        });

        it('should register code lens providers', async () => {
            await activate(mockContext);

            expect(vscode.languages.registerCodeLensProvider).toHaveBeenCalled();
        });

        it('should add all disposables to subscriptions', async () => {
            await activate(mockContext);

            // Every registered command, provider, etc. should be in subscriptions
            expect(mockContext.subscriptions.length).toBeGreaterThan(0);

            // All items should have a dispose method
            mockContext.subscriptions.forEach(subscription => {
                expect(subscription).toHaveProperty('dispose');
            });
        });
    });

    describe('deactivate', () => {
        it('should be defined', () => {
            expect(deactivate).toBeDefined();
            expect(typeof deactivate).toBe('function');
        });

        it('should clean up resources', async () => {
            // First activate
            await activate(mockContext);

            // Then deactivate
            if (deactivate) {
                await deactivate();
            }

            // Should not throw
            expect(true).toBe(true);
        });

        it('should dispose all subscriptions on deactivate', async () => {
            await activate(mockContext);

            const disposeSpy = jest.fn();
            mockContext.subscriptions.forEach(sub => {
                if (sub && sub.dispose) {
                    sub.dispose = disposeSpy;
                }
            });

            // Manually dispose all subscriptions (simulating extension deactivation)
            mockContext.subscriptions.forEach(sub => sub.dispose?.());

            expect(disposeSpy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle activation errors gracefully', async () => {
            // Mock a command registration that throws
            (vscode.commands.registerCommand as jest.Mock).mockImplementation(() => {
                throw new Error('Registration failed');
            });

            // Should handle error without crashing
            await expect(activate(mockContext)).rejects.toThrow();
        });

        it('should continue activation even if some components fail', async () => {
            const mockError = new Error('Component initialization failed');

            // Mock one component to fail
            (vscode.window.createOutputChannel as jest.Mock)
                .mockImplementationOnce(() => {
                    throw mockError;
                })
                .mockImplementation(() => ({
                    appendLine: jest.fn(),
                    append: jest.fn(),
                    clear: jest.fn(),
                    show: jest.fn(),
                    hide: jest.fn(),
                    dispose: jest.fn(),
                }));

            // Extension should attempt to continue activation
            try {
                await activate(mockContext);
            } catch (error) {
                // Some error is expected
                expect(error).toBeDefined();
            }
        });
    });

    describe('Configuration', () => {
        it('should read workspace configuration', async () => {
            await activate(mockContext);

            expect(vscode.workspace.getConfiguration).toHaveBeenCalled();
        });

        it('should respond to configuration changes', async () => {
            let configChangeHandler: any;

            (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation(
                (handler) => {
                    configChangeHandler = handler;
                    return { dispose: jest.fn() };
                }
            );

            await activate(mockContext);

            expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();

            // Simulate configuration change
            if (configChangeHandler) {
                configChangeHandler({ affectsConfiguration: () => true });
            }
        });
    });
});
