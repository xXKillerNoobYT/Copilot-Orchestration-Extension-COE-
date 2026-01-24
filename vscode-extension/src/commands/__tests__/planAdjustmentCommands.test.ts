/**
 * Tests for planAdjustmentCommands
 * Verifies plan drift detection, diff viewing, and adjustment application
 */

import * as vscode from 'vscode';
import {
    registerDetectPlanDriftCommand,
    registerShowPlanDiffCommand,
    registerApplyPlanAdjustmentCommand,
    registerPlanAdjustmentCommands,
} from '../planAdjustmentCommands';
import { getPlanAdjustmentService } from '../../services/planAdjustmentService';
import { getPlanPersistenceService } from '../../services/planPersistence';

// Mock vscode with all required properties
jest.mock('vscode', () => ({
    Uri: {
        file: jest.fn((path) => ({ fsPath: path, path, scheme: 'file' })),
    },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ExtensionMode: { Development: 1, Production: 2, Test: 3 },
    ProgressLocation: { Notification: 15 },
    window: {},
    workspace: {},
    commands: {},
}), { virtual: true });

jest.mock('../../services/planAdjustmentService');
jest.mock('../../services/planPersistence');

describe('planAdjustmentCommands', () => {
    let mockContext: vscode.ExtensionContext;
    let mockPlanAdjustmentService: any;
    let mockPlanPersistenceService: any;
    let mockPlans: any[];
    let mockDriftResult: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();

        // Mock extension context
        mockContext = {
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path',
            subscriptions: [],
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn(() => []),
                setKeysForSync: jest.fn(),
            },
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn(() => []),
            },
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
                delete: jest.fn(),
                onDidChange: jest.fn(),
            },
            extensionMode: vscode.ExtensionMode.Development,
            storageUri: vscode.Uri.file('/mock/storage'),
            globalStorageUri: vscode.Uri.file('/mock/global-storage'),
            logUri: vscode.Uri.file('/mock/log'),
            storagePath: '/mock/storage',
            globalStoragePath: '/mock/global-storage',
            logPath: '/mock/log',
            asAbsolutePath: jest.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
            environmentVariableCollection: {} as any,
            extension: {} as any,
            languageModelAccessInformation: {} as any,
        } as vscode.ExtensionContext;

        // Mock plans list
        mockPlans = [
            {
                filename: 'project-plan-v1.json',
                version: 1,
                updated_at: '2026-01-20T10:00:00Z',
            },
            {
                filename: 'project-plan-v2.json',
                version: 2,
                updated_at: '2026-01-22T14:30:00Z',
            },
        ];

        // Mock drift detection result
        mockDriftResult = {
            success: true,
            driftAnalysis: {
                hasDrift: true,
                metrics: {
                    driftSeverity: 'moderate',
                    overallDriftScore: 45.5,
                    scopeDrift: {
                        driftPercentage: 30.2,
                    },
                    timelineDrift: {
                        daysBehindSchedule: 5,
                    },
                },
            },
            suggestions: [
                {
                    title: 'Update deadline for Feature X',
                    description: 'Extend deadline by 5 days',
                    impact: 'high',
                    type: 'timeline',
                },
                {
                    title: 'Remove completed tasks',
                    description: 'Clean up finished items',
                    impact: 'low',
                    type: 'cleanup',
                },
            ],
        };

        // Mock services
        mockPlanPersistenceService = {
            listPlans: jest.fn().mockResolvedValue(mockPlans),
            loadPlan: jest.fn().mockResolvedValue({ id: 'plan-1' }),
            savePlan: jest.fn().mockResolvedValue(true),
        };

        mockPlanAdjustmentService = {
            adjustPlan: jest.fn().mockResolvedValue(mockDriftResult),
            applyAdjustment: jest.fn().mockResolvedValue({ success: true }),
        };

        (getPlanPersistenceService as jest.Mock).mockReturnValue(mockPlanPersistenceService);
        (getPlanAdjustmentService as jest.Mock).mockReturnValue(mockPlanAdjustmentService);

        // Mock vscode.window methods
        (vscode.window.showQuickPick as jest.Mock) = jest.fn();
        (vscode.window.showInformationMessage as jest.Mock) = jest.fn();
        (vscode.window.showWarningMessage as jest.Mock) = jest.fn();
        (vscode.window.showErrorMessage as jest.Mock) = jest.fn();
        (vscode.window.withProgress as jest.Mock) = jest.fn((options, task) => 
            task({ report: jest.fn() }, { isCancellationRequested: false, onCancellationRequested: jest.fn() })
        );

        // Mock vscode.commands
        (vscode.commands.registerCommand as jest.Mock) = jest.fn((command, callback) => ({
            dispose: jest.fn(),
        }));
        (vscode.commands.executeCommand as jest.Mock) = jest.fn();
    });

    describe('registerDetectPlanDriftCommand', () => {
        it('should register the command', () => {
            registerDetectPlanDriftCommand(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.detectPlanDrift',
                expect.any(Function)
            );
            expect(mockContext.subscriptions.length).toBeGreaterThan(0);
        });

        it('should show warning when no plans are available', async () => {
            mockPlanPersistenceService.listPlans.mockResolvedValue([]);
            registerDetectPlanDriftCommand(mockContext);

            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No plans found in workspace');
            expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
        });

        it('should show plan selection when plans are available', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: 'project-plan-v1.json',
                filename: 'project-plan-v1.json',
            });

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        label: 'project-plan-v1.json',
                        description: 'Version 1',
                    }),
                ]),
                expect.objectContaining({
                    placeHolder: 'Select a plan to analyze for drift',
                })
            );
        });

        it('should cancel when user cancels plan selection', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(mockPlanAdjustmentService.adjustPlan).not.toHaveBeenCalled();
        });

        it('should analyze drift for selected plan', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v1.json',
            });

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(mockPlanAdjustmentService.adjustPlan).toHaveBeenCalledWith(
                'project-plan-v1.json',
                {
                    autoApply: false,
                    notifyUser: false,
                }
            );
        });

        it('should show informational message when no drift is detected', async () => {
            mockDriftResult.driftAnalysis.hasDrift = false;
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v1.json',
            });

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('No significant drift detected')
            );
        });

        it('should show warning with drift details when drift is detected', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v1.json',
            });
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('View Suggestions');

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('Plan drift detected'),
                'View Suggestions',
                'Open Diff',
                'Dismiss'
            );
        });

        it('should execute wizard command when View Suggestions is selected', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v1.json',
            });
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('View Suggestions');

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.openPlanAdjustmentWizard'
            );
        });

        it('should execute diff command when Open Diff is selected', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v1.json',
            });
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Open Diff');

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.showPlanDiff'
            );
        });

        it('should handle service errors', async () => {
            mockPlanAdjustmentService.adjustPlan.mockResolvedValue({
                success: false,
                error: 'Failed to fetch execution data',
            });
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v1.json',
            });

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Failed to fetch execution data')
            );
        });

        it('should handle exceptions', async () => {
            mockPlanPersistenceService.listPlans.mockRejectedValue(new Error('Database error'));

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Database error')
            );
        });

        it('should show progress during drift analysis', async () => {
            const reportMock = jest.fn();
            (vscode.window.withProgress as jest.Mock) = jest.fn((options, task) => {
                expect(options.title).toContain('Analyzing plan drift');
                return task({ report: reportMock }, { isCancellationRequested: false, onCancellationRequested: jest.fn() });
            });
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v1.json',
            });

            registerDetectPlanDriftCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Loading plan'),
            }));
        });
    });

    describe('registerShowPlanDiffCommand', () => {
        it('should register the command', () => {
            registerShowPlanDiffCommand(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.showPlanDiff',
                expect.any(Function)
            );
        });

        it('should show warning when no plans are available', async () => {
            mockPlanPersistenceService.listPlans.mockResolvedValue([]);
            registerShowPlanDiffCommand(mockContext);

            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No plans found in workspace');
        });

        it('should generate diff for selected plan', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v2.json',
            });

            registerShowPlanDiffCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(mockPlanAdjustmentService.adjustPlan).toHaveBeenCalledWith(
                'project-plan-v2.json',
                { autoApply: false }
            );
        });

        it('should show diff information', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v2.json',
            });

            registerShowPlanDiffCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Drift Score: 45.5%')
            );
        });

        it('should handle errors', async () => {
            mockPlanAdjustmentService.adjustPlan.mockResolvedValue({
                success: false,
                error: 'Invalid plan format',
            });
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v2.json',
            });

            registerShowPlanDiffCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Invalid plan format')
            );
        });
    });

    describe('registerApplyPlanAdjustmentCommand', () => {
        it('should register the command', () => {
            registerApplyPlanAdjustmentCommand(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.applyPlanAdjustment',
                expect.any(Function)
            );
        });

        it('should show warning when no plans are available', async () => {
            mockPlanPersistenceService.listPlans.mockResolvedValue([]);
            registerApplyPlanAdjustmentCommand(mockContext);

            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No plans found in workspace');
        });

        it('should show message when no adjustments are needed', async () => {
            mockDriftResult.suggestions = [];
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                filename: 'project-plan-v1.json',
            });

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'No adjustments needed - plan is up to date'
            );
        });

        it('should show suggestions for selection', async () => {
            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ filename: 'project-plan-v1.json' }) // Plan selection
                .mockResolvedValueOnce([ // Suggestion selection
                    {
                        label: 'Update deadline for Feature X',
                        suggestion: mockDriftResult.suggestions[0],
                    },
                ]);

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        label: 'Update deadline for Feature X',
                        description: 'high impact',
                        picked: true,
                    }),
                ]),
                expect.objectContaining({
                    placeHolder: 'Select adjustments to apply',
                    canPickMany: true,
                })
            );
        });

        it('should cancel when no suggestions are selected', async () => {
            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ filename: 'project-plan-v1.json' })
                .mockResolvedValueOnce([]);

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
            expect(mockPlanAdjustmentService.applyAdjustment).not.toHaveBeenCalled();
        });

        it('should request confirmation before applying', async () => {
            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ filename: 'project-plan-v1.json' })
                .mockResolvedValueOnce([
                    { suggestion: mockDriftResult.suggestions[0] },
                ]);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Apply');

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('Apply 1 adjustment(s)?'),
                { modal: true },
                'Apply',
                'Cancel'
            );
        });

        it('should cancel when user cancels confirmation', async () => {
            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ filename: 'project-plan-v1.json' })
                .mockResolvedValueOnce([
                    { suggestion: mockDriftResult.suggestions[0] },
                ]);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Cancel');

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(mockPlanAdjustmentService.applyAdjustment).not.toHaveBeenCalled();
        });

        it('should apply selected adjustments', async () => {
            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ filename: 'project-plan-v1.json' })
                .mockResolvedValueOnce([
                    { suggestion: mockDriftResult.suggestions[0] },
                    { suggestion: mockDriftResult.suggestions[1] },
                ]);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Apply');

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(mockPlanAdjustmentService.applyAdjustment).toHaveBeenCalledTimes(2);
            expect(mockPlanAdjustmentService.applyAdjustment).toHaveBeenCalledWith(
                'project-plan-v1.json',
                mockDriftResult.suggestions[0],
                {
                    createBackup: true,
                    notifyUser: false,
                }
            );
        });

        it('should show success message with count', async () => {
            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ filename: 'project-plan-v1.json' })
                .mockResolvedValueOnce([
                    { suggestion: mockDriftResult.suggestions[0] },
                ]);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Apply');

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('✅ Applied 1/1 adjustments successfully')
            );
        });

        it('should handle partial application failures', async () => {
            mockPlanAdjustmentService.applyAdjustment
                .mockResolvedValueOnce({ success: true })
                .mockResolvedValueOnce({ success: false, error: 'Failed to apply' });

            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ filename: 'project-plan-v1.json' })
                .mockResolvedValueOnce([
                    { suggestion: mockDriftResult.suggestions[0] },
                    { suggestion: mockDriftResult.suggestions[1] },
                ]);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Apply');

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('✅ Applied 1/2 adjustments successfully')
            );
        });

        it('should show progress during application', async () => {
            const reportMock = jest.fn();
            (vscode.window.withProgress as jest.Mock) = jest.fn((options, task) => {
                if (options.title && options.title.includes('Applying')) {
                    return task({ report: reportMock }, { isCancellationRequested: false, onCancellationRequested: jest.fn() });
                }
                return task({ report: jest.fn() }, { isCancellationRequested: false, onCancellationRequested: jest.fn() });
            });

            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ filename: 'project-plan-v1.json' })
                .mockResolvedValueOnce([
                    { suggestion: mockDriftResult.suggestions[0] },
                ]);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Apply');

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(reportMock).toHaveBeenCalled();
        });

        it('should handle exceptions', async () => {
            mockPlanPersistenceService.listPlans.mockRejectedValue(new Error('File system error'));

            registerApplyPlanAdjustmentCommand(mockContext);
            const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
            await commandHandler();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('File system error')
            );
        });
    });

    describe('registerPlanAdjustmentCommands', () => {
        it('should register all plan adjustment commands', () => {
            registerPlanAdjustmentCommands(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.detectPlanDrift',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.showPlanDiff',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.applyPlanAdjustment',
                expect.any(Function)
            );

            expect(mockContext.subscriptions.length).toBe(3);
        });
    });
});
