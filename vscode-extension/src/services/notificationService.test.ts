/**
 * Tests for Notification Service
 * Covers toast display, decomposition summaries, action handlers
 */

import { NotificationService, DecompositionNotification, NotificationLevel } from './notificationService';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn(),
        })),
        createWebviewPanel: jest.fn(() => ({
            webview: {
                html: '',
                onDidReceiveMessage: jest.fn(),
                postMessage: jest.fn(),
            },
            dispose: jest.fn(),
        })),
    },
    ViewColumn: {
        Beside: 2,
    },
}));

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = NotificationService.getInstance();
    });

    describe('Singleton Pattern', () => {
        it('should return same instance', () => {
            const instance1 = NotificationService.getInstance();
            const instance2 = NotificationService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Decomposition Summary', () => {
        const mockNotification: DecompositionNotification = {
            originalTaskId: 'task-1',
            originalTaskTitle: 'Build User Authentication',
            subtaskCount: 5,
            subtasks: [
                {
                    title: 'Analysis & Plan: User Authentication',
                    estimated_effort: 20,
                    type: 'feature',
                    priority: 'high',
                },
                {
                    title: 'Core Implementation: User Authentication',
                    estimated_effort: 40,
                    type: 'feature',
                    priority: 'high',
                },
                {
                    title: 'Integration & Tests: User Authentication',
                    estimated_effort: 30,
                    type: 'testing',
                    priority: 'medium',
                },
                {
                    title: 'Documentation: User Authentication',
                    estimated_effort: 15,
                    type: 'documentation',
                    priority: 'low',
                },
                {
                    title: 'Review & Polish: User Authentication',
                    estimated_effort: 15,
                    type: 'maintenance',
                    priority: 'medium',
                },
            ],
            impact: {
                timeline_change_minutes: 10,
                parallel_opportunities: [
                    'Testing can run parallel with documentation',
                    'Review can start after core implementation',
                ],
            },
        };

        it('should show decomposition summary with actions', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Accept');

            const result = await service.showDecompositionSummary(mockNotification);

            expect(vscode.window.showInformationMessage).toHaveBeenCalled();
            const call = (vscode.window.showInformationMessage as jest.Mock).mock.calls[0];
            expect(call[0]).toContain('Build User Authentication');
            expect(call[0]).toContain('5 subtasks');
            expect(result).toBe('accept');
        });

        it('should handle accept action', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Accept');

            const result = await service.showDecompositionSummary(mockNotification);

            expect(result).toBe('accept');
        });

        it('should handle reject action', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Reject');

            const result = await service.showDecompositionSummary(mockNotification);

            expect(result).toBe('reject');
        });

        it('should handle edit action', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Edit');

            const result = await service.showDecompositionSummary(mockNotification);

            expect(result).toBe('edit');
        });

        it('should handle dismiss (no action)', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

            const result = await service.showDecompositionSummary(mockNotification);

            expect(result).toBe('dismiss');
        });

        it('should show detailed panel when View Details selected', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('View Details');

            const result = await service.showDecompositionSummary(mockNotification);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'coeDecompositionDetails',
                expect.stringContaining('Build User Authentication'),
                vscode.ViewColumn.Beside,
                expect.any(Object)
            );
            expect(result).toBe('accept'); // Defaults to accept after viewing
        });

        it('should include timeline change in message', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Accept');

            await service.showDecompositionSummary(mockNotification);

            const message = (vscode.window.showInformationMessage as jest.Mock).mock.calls[0][0];
            expect(message).toContain('+10 min');
        });

        it('should handle negative timeline change', async () => {
            const optimizedNotification = {
                ...mockNotification,
                impact: {
                    ...mockNotification.impact,
                    timeline_change_minutes: -15,
                },
            };

            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Accept');

            await service.showDecompositionSummary(optimizedNotification);

            const message = (vscode.window.showInformationMessage as jest.Mock).mock.calls[0][0];
            expect(message).toContain('-15 min');
            expect(message).toContain('optimized');
        });

        it('should handle zero timeline change', async () => {
            const sameNotification = {
                ...mockNotification,
                impact: {
                    ...mockNotification.impact,
                    timeline_change_minutes: 0,
                },
            };

            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Accept');

            await service.showDecompositionSummary(sameNotification);

            const message = (vscode.window.showInformationMessage as jest.Mock).mock.calls[0][0];
            expect(message).toContain('No change');
        });
    });

    describe('Simple Notifications', () => {
        it('should show info notification', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

            await service.showNotification('Test info', 'info');

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test info');
        });

        it('should show warning notification', async () => {
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

            await service.showNotification('Test warning', 'warning');

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Test warning');
        });

        it('should show error notification', async () => {
            (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

            await service.showNotification('Test error', 'error');

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Test error');
        });

        it('should show success notification (uses info)', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

            await service.showNotification('Test success', 'success');

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test success');
        });

        it('should handle notification actions', async () => {
            const mockCallback = jest.fn();
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Action 1');

            await service.showNotification('Test with actions', 'info', [
                { label: 'Action 1', callback: mockCallback },
                { label: 'Action 2', callback: jest.fn() },
            ]);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'Test with actions',
                'Action 1',
                'Action 2'
            );
            expect(mockCallback).toHaveBeenCalled();
        });

        it('should not call callback when dismissed', async () => {
            const mockCallback = jest.fn();
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

            await service.showNotification('Test dismissal', 'info', [
                { label: 'Action', callback: mockCallback },
            ]);

            expect(mockCallback).not.toHaveBeenCalled();
        });
    });

    describe('Output Channel', () => {
        it('should show output channel', () => {
            const mockShow = jest.fn();
            const mockOutputChannel = {
                show: mockShow,
                appendLine: jest.fn(),
                dispose: jest.fn(),
            };
            (service as any).outputChannel = mockOutputChannel;

            service.show();

            expect(mockShow).toHaveBeenCalled();
        });
    });

    describe('Dispose', () => {
        it('should dispose output channel', () => {
            const mockDispose = jest.fn();
            const mockOutputChannel = {
                show: jest.fn(),
                appendLine: jest.fn(),
                dispose: mockDispose,
            };
            (service as any).outputChannel = mockOutputChannel;

            service.dispose();

            expect(mockDispose).toHaveBeenCalled();
        });
    });

    describe('Details Panel HTML', () => {
        it('should generate valid HTML for decomposition details', async () => {
            const mockPanel = {
                webview: {
                    html: '',
                    onDidReceiveMessage: jest.fn(),
                },
                dispose: jest.fn(),
            };
            (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('View Details');

            const notification: DecompositionNotification = {
                originalTaskId: 'task-1',
                originalTaskTitle: 'Test Task',
                subtaskCount: 3,
                subtasks: [
                    { title: 'Subtask 1', estimated_effort: 20, type: 'feature', priority: 'high' },
                    { title: 'Subtask 2', estimated_effort: 30, type: 'testing', priority: 'medium' },
                    { title: 'Subtask 3', estimated_effort: 15, type: 'documentation', priority: 'low' },
                ],
                impact: {
                    timeline_change_minutes: 5,
                    parallel_opportunities: ['Testing can run in parallel'],
                },
            };

            await service.showDecompositionSummary(notification);

            const html = mockPanel.webview.html;
            expect(html).toContain('Test Task');
            expect(html).toContain('3 subtasks');
            expect(html).toContain('Subtask 1');
            expect(html).toContain('Subtask 2');
            expect(html).toContain('Subtask 3');
            expect(html).toContain('Testing can run in parallel');
        });

        it('should handle empty parallel opportunities', async () => {
            const mockPanel = {
                webview: {
                    html: '',
                    onDidReceiveMessage: jest.fn(),
                },
                dispose: jest.fn(),
            };
            (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('View Details');

            const notification: DecompositionNotification = {
                originalTaskId: 'task-1',
                originalTaskTitle: 'Test Task',
                subtaskCount: 2,
                subtasks: [
                    { title: 'Subtask 1', estimated_effort: 20, type: 'feature', priority: 'high' },
                    { title: 'Subtask 2', estimated_effort: 20, type: 'feature', priority: 'high' },
                ],
                impact: {
                    timeline_change_minutes: 0,
                    parallel_opportunities: [],
                },
            };

            await service.showDecompositionSummary(notification);

            const html = mockPanel.webview.html;
            expect(html).not.toContain('Parallel Opportunities');
        });
    });
});
