/**
 * Unit Tests for Audit Dashboard Command
 * 
 * Coverage:
 * - Dashboard panel creation
 * - Panel display
 * - Focus management
 * - Error handling
 */

import * as vscode from 'vscode';
import { registerAuditDashboardCommand } from '../auditDashboard';
import { AuditDashboardPanel } from '../../panels/auditDashboardPanel';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../panels/auditDashboardPanel');

describe('registerAuditDashboardCommand', () => {
    let mockContext: vscode.ExtensionContext;
    let mockExtensionUri: vscode.Uri;
    let commandHandler: Function;

    beforeEach(() => {
        // Create mock extension URI
        mockExtensionUri = {
            scheme: 'file',
            authority: '',
            path: '/test/extension',
            query: '',
            fragment: '',
            fsPath: '/test/extension',
            with: jest.fn(),
            toJSON: jest.fn()
        } as any;

        // Create mock context
        mockContext = {
            extensionUri: mockExtensionUri,
            subscriptions: [],
            extensionPath: '/test/extension',
            globalState: {} as any,
            workspaceState: {} as any,
            secrets: {} as any,
            asAbsolutePath: jest.fn(),
            storagePath: '/test/storage',
            globalStoragePath: '/test/global',
            logPath: '/test/log',
            extensionMode: 3
        } as any;

        // Capture command handler
        (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
            if (name === 'copilot-orchestrator.showAuditDashboard') {
                commandHandler = handler;
            }
            return { dispose: jest.fn() };
        });

        // Mock executeCommand
        (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

        jest.clearAllMocks();
    });

    describe('Registration', () => {
        it('should register audit dashboard command', () => {
            // Act
            registerAuditDashboardCommand(mockContext, mockExtensionUri);

            // Assert
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.showAuditDashboard',
                expect.any(Function)
            );
        });

        it('should add command to context subscriptions', () => {
            // Arrange
            const mockDisposable = { dispose: jest.fn() };
            (vscode.commands.registerCommand as jest.Mock).mockReturnValue(mockDisposable);

            // Act
            registerAuditDashboardCommand(mockContext, mockExtensionUri);

            // Assert
            expect(mockContext.subscriptions).toContain(mockDisposable);
        });
    });

    describe('Command Execution', () => {
        beforeEach(() => {
            registerAuditDashboardCommand(mockContext, mockExtensionUri);
        });

        it('should create audit dashboard panel when executed', () => {
            // Arrange
            const mockPanel = {
                webview: { html: '<html>Dashboard</html>', postMessage: jest.fn() },
                reveal: jest.fn(),
                dispose: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);

            // Act
            commandHandler();

            // Assert
            expect(AuditDashboardPanel.createOrShow).toHaveBeenCalledWith(mockExtensionUri);
        });

        it('should focus auxiliary bar after panel creation', () => {
            // Arrange
            const mockPanel = {
                webview: { html: '', postMessage: jest.fn() },
                reveal: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);

            // Act
            commandHandler();

            // Assert
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'workbench.action.focusAuxiliaryBar'
            );
        });

        it('should execute focus command after panel is created', () => {
            // Arrange
            const mockPanel = {
                webview: { html: '', postMessage: jest.fn() },
                reveal: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);
            const executeCommandSpy = vscode.commands.executeCommand as jest.Mock;

            // Act
            commandHandler();

            // Assert
            const createCall = (AuditDashboardPanel.createOrShow as jest.Mock).mock.invocationCallOrder[0];
            const focusCall = executeCommandSpy.mock.invocationCallOrder[0];

            expect(createCall).toBeLessThan(focusCall);
        });

        it('should reuse existing panel if already open', () => {
            // Arrange
            const mockPanel = {
                webview: { html: '', postMessage: jest.fn() },
                reveal: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);

            // Act - execute twice
            commandHandler();
            commandHandler();

            // Assert - createOrShow handles singleton, should be called twice
            expect(AuditDashboardPanel.createOrShow).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            registerAuditDashboardCommand(mockContext, mockExtensionUri);
        });

        it('should handle panel creation errors', async () => {
            // Arrange
            const error = new Error('Failed to create panel');
            (AuditDashboardPanel.createOrShow as jest.Mock).mockImplementation(() => {
                throw error;
            });

            // Act & Assert
            await expect(commandHandler()).rejects.toThrow('Failed to create panel');
        });

        it('should handle focus command errors gracefully', async () => {
            // Arrange
            const mockPanel = {
                webview: { html: '', postMessage: jest.fn() },
                reveal: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);
            (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(
                new Error('Focus failed')
            );

            // Act - should not throw even if focus command fails
            await expect(commandHandler()).resolves.toBeUndefined();

            // Assert
            expect(AuditDashboardPanel.createOrShow).toHaveBeenCalled();
        });

        it('should handle undefined extension URI', () => {
            // Arrange
            const mockPanel = {
                webview: { html: '', postMessage: jest.fn() },
                reveal: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);

            // Re-register with undefined URI
            jest.clearAllMocks();
            registerAuditDashboardCommand(mockContext, undefined as any);

            // Get new command handler
            const newHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];

            // Act
            newHandler();

            // Assert
            expect(AuditDashboardPanel.createOrShow).toHaveBeenCalledWith(undefined);
        });
    });

    describe('Integration', () => {
        beforeEach(() => {
            registerAuditDashboardCommand(mockContext, mockExtensionUri);
        });

        it('should complete asynchronously', async () => {
            // Arrange
            const mockPanel = {
                webview: { html: '', postMessage: jest.fn() },
                reveal: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);

            // Act
            const result = commandHandler();

            // Assert - returns a promise that resolves
            expect(result).toBeInstanceOf(Promise);
            await expect(result).resolves.toBeUndefined();
        });

        it('should work with multiple registrations', () => {
            // Arrange
            const context2 = { ...mockContext, subscriptions: [] };

            // Act
            registerAuditDashboardCommand(context2, mockExtensionUri);

            // Assert
            expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(2);
            expect(context2.subscriptions.length).toBeGreaterThan(0);
        });
    });

    describe('Performance', () => {
        beforeEach(() => {
            registerAuditDashboardCommand(mockContext, mockExtensionUri);
        });

        it('should execute quickly', () => {
            // Arrange
            const mockPanel = {
                webview: { html: '', postMessage: jest.fn() },
                reveal: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);

            const startTime = Date.now();

            // Act
            commandHandler();
            const duration = Date.now() - startTime;

            // Assert - should be very fast (<10ms)
            expect(duration).toBeLessThan(10);
        });

        it('should handle rapid successive calls', () => {
            // Arrange
            const mockPanel = {
                webview: { html: '', postMessage: jest.fn() },
                reveal: jest.fn()
            };

            (AuditDashboardPanel.createOrShow as jest.Mock).mockReturnValue(mockPanel);

            // Act - call 100 times rapidly
            for (let i = 0; i < 100; i++) {
                commandHandler();
            }

            // Assert - all calls should complete
            expect(AuditDashboardPanel.createOrShow).toHaveBeenCalledTimes(100);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null context', () => {
            // Arrange
            const nullContext = null as any;

            // Act & Assert
            expect(() => {
                registerAuditDashboardCommand(nullContext, mockExtensionUri);
            }).toThrow();
        });

        it('should handle context without subscriptions array', () => {
            // Arrange
            const invalidContext = {
                ...mockContext,
                subscriptions: null as any
            };

            // Act & Assert
            expect(() => {
                registerAuditDashboardCommand(invalidContext, mockExtensionUri);
            }).toThrow();
        });
    });
});
