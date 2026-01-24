/**
 * Tests for autoAgentLoop command
 * Verifies agent loop management, status monitoring, and error handling
 */

import * as vscode from 'vscode';
import { AutoAgentLoopCommand } from '../autoAgentLoop';
import { AgentLoopService } from '../../services/agentLoopService';

jest.mock('vscode');
jest.mock('../../services/agentLoopService');

describe('AutoAgentLoopCommand', () => {
    let mockContext: vscode.ExtensionContext;
    let mockOutputChannel: vscode.OutputChannel;
    let mockStatusBarItem: vscode.StatusBarItem;
    let mockAgentLoopService: jest.Mocked<AgentLoopService>;
    let autoAgentLoopCommand: AutoAgentLoopCommand;

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
        } as vscode.ExtensionContext;

        // Mock output channel
        mockOutputChannel = {
            append: jest.fn(),
            appendLine: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            name: 'Agent Loop',
            replace: jest.fn(),
        } as unknown as vscode.OutputChannel;

        // Mock status bar item
        mockStatusBarItem = {
            text: '',
            tooltip: '',
            command: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            alignment: vscode.StatusBarAlignment.Left,
            priority: 80,
        } as unknown as vscode.StatusBarItem;

        // Mock vscode.window methods
        (vscode.window.createOutputChannel as jest.Mock) = jest.fn().mockReturnValue(mockOutputChannel);
        (vscode.window.createStatusBarItem as jest.Mock) = jest.fn().mockReturnValue(mockStatusBarItem);
        (vscode.window.showInformationMessage as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        (vscode.window.showWarningMessage as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        (vscode.window.showErrorMessage as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        (vscode.window.showInputBox as jest.Mock) = jest.fn().mockResolvedValue('0');
        (vscode.window.withProgress as jest.Mock) = jest.fn((options, task) => task({ report: jest.fn() }, { isCancellationRequested: false, onCancellationRequested: jest.fn() }));

        // Mock workspace configuration
        const mockConfig = {
            get: jest.fn((key: string) => {
                if (key === 'backendUrl') return 'http://localhost:8000';
                return undefined;
            }),
            has: jest.fn(() => true),
            inspect: jest.fn(),
            update: jest.fn(),
        };
        (vscode.workspace.getConfiguration as jest.Mock) = jest.fn().mockReturnValue(mockConfig);

        // Mock commands
        (vscode.commands.registerCommand as jest.Mock) = jest.fn((command, callback) => {
            return { dispose: jest.fn() };
        });

        // Mock AgentLoopService
        mockAgentLoopService = {
            startLoop: jest.fn().mockResolvedValue({ running: true }),
            stopLoop: jest.fn().mockResolvedValue(undefined),
            getStatus: jest.fn().mockResolvedValue({
                running: false,
                state: 'idle',
                current_task_id: undefined,
                cycles_executed: 0,
                successes: 0,
                errors: 0,
                avg_cycle_time: 0,
            }),
            executeCycle: jest.fn().mockResolvedValue({
                state: 'completed',
                task_id: 'TASK-123',
                message: 'Cycle completed successfully',
            }),
        } as any;

        (AgentLoopService as jest.Mock) = jest.fn().mockImplementation(() => mockAgentLoopService);
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('Constructor', () => {
        it('should create output channel and status bar item', () => {
            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);

            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Agent Loop');
            expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
                vscode.StatusBarAlignment.Left,
                80
            );
            expect(mockStatusBarItem.show).toHaveBeenCalled();
        });

        it('should register all commands', () => {
            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.startAutoLoop',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.stopAutoLoop',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.autoLoopStatus',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'copilot-orchestrator.executeSingleCycle',
                expect.any(Function)
            );
        });

        it('should add disposables to context subscriptions', () => {
            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);

            expect(mockContext.subscriptions.length).toBeGreaterThan(0);
        });

        it('should initialize with custom backend URL from config', () => {
            const customConfig = {
                get: jest.fn((key: string) => {
                    if (key === 'backendUrl') return 'http://custom:9000';
                    return undefined;
                }),
                has: jest.fn(() => true),
                inspect: jest.fn(),
                update: jest.fn(),
            };
            (vscode.workspace.getConfiguration as jest.Mock) = jest.fn().mockReturnValue(customConfig);

            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);

            expect(AgentLoopService).toHaveBeenCalledWith({ baseUrl: 'http://custom:9000' });
        });
    });

    describe('startAutoLoop', () => {
        let startCommand: any;

        beforeEach(() => {
            jest.clearAllMocks();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((command, callback) => {
                if (command === 'copilot-orchestrator.startAutoLoop') {
                    startCommand = callback;
                }
                return { dispose: jest.fn() };
            });
            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);
        });

        it('should start loop with user-specified max cycles', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('5');

            await startCommand();

            expect(mockAgentLoopService.startLoop).toHaveBeenCalledWith(5);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Agent Loop started')
            );
        });

        it('should handle infinite cycles (0)', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');

            await startCommand();

            expect(mockAgentLoopService.startLoop).toHaveBeenCalledWith(0);
        });

        it('should show warning if loop is already running', async () => {
            // Start loop first
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');
            await startCommand();

            jest.clearAllMocks();

            // Try to start again
            await startCommand();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                'Agent Loop is already running'
            );
            expect(mockAgentLoopService.startLoop).not.toHaveBeenCalled();
        });

        it('should handle user cancellation', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

            await startCommand();

            expect(mockAgentLoopService.startLoop).not.toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('User cancelled')
            );
        });

        it('should validate max cycles input', async () => {
            const validateFn = jest.fn();
            (vscode.window.showInputBox as jest.Mock).mockImplementation(async (options) => {
                validateFn(options.validateInput);
                return '0';
            });

            await startCommand();

            expect(validateFn).toHaveBeenCalled();
            const validator = validateFn.mock.calls[0][0];
            expect(validator('-1')).toBe('Please enter a valid number');
            expect(validator('abc')).toBe('Please enter a valid number');
            expect(validator('5')).toBeNull();
        });

        it('should handle service errors', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');
            mockAgentLoopService.startLoop.mockRejectedValue(new Error('Connection failed'));

            await startCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Connection failed')
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[ERROR]')
            );
        });

        it('should show information message with action options', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('View Status');

            await startCommand();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Agent Loop started'),
                'View Status',
                'Stop Loop'
            );
        });
    });

    describe('stopAutoLoop', () => {
        let startCommand: any;
        let stopCommand: any;

        beforeEach(() => {
            jest.clearAllMocks();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((command, callback) => {
                if (command === 'copilot-orchestrator.startAutoLoop') {
                    startCommand = callback;
                } else if (command === 'copilot-orchestrator.stopAutoLoop') {
                    stopCommand = callback;
                }
                return { dispose: jest.fn() };
            });
            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);
            jest.clearAllMocks();
        });

        it('should show warning if loop is not running', async () => {
            await stopCommand();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                'Agent Loop is not running'
            );
            expect(mockAgentLoopService.stopLoop).not.toHaveBeenCalled();
        });

        it('should stop running loop successfully', async () => {
            // Start loop first
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');
            await startCommand();

            jest.clearAllMocks();

            // Stop loop
            await stopCommand();

            expect(mockAgentLoopService.stopLoop).toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Agent Loop stopped');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[SUCCESS]')
            );
        });

        it('should handle service errors during stop', async () => {
            // Start loop first
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');
            await startCommand();

            jest.clearAllMocks();
            mockAgentLoopService.stopLoop.mockRejectedValue(new Error('Stop failed'));

            // Stop loop
            await stopCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Stop failed')
            );
        });
    });

    describe('showStatus', () => {
        let statusCommand: any;

        beforeEach(() => {
            jest.clearAllMocks();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((command, callback) => {
                if (command === 'copilot-orchestrator.autoLoopStatus') {
                    statusCommand = callback;
                }
                return { dispose: jest.fn() };
            });
            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);
            jest.clearAllMocks();
        });

        it('should display loop status', async () => {
            mockAgentLoopService.getStatus.mockResolvedValue({
                running: true,
                state: 'executing',
                current_task_id: 'TASK-123',
                cycles_executed: 5,
                successes: 4,
                errors: 1,
                avg_cycle_time: 12.5,
            });

            await statusCommand();

            expect(mockAgentLoopService.getStatus).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Current Status')
            );
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('RUNNING')
            );
        });

        it('should handle idle state', async () => {
            mockAgentLoopService.getStatus.mockResolvedValue({
                running: false,
                state: 'idle',
                current_task_id: undefined,
                cycles_executed: 0,
                successes: 0,
                errors: 0,
                avg_cycle_time: 0,
            });

            await statusCommand();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('IDLE')
            );
        });

        it('should handle service errors', async () => {
            mockAgentLoopService.getStatus.mockRejectedValue(new Error('Network error'));

            await statusCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Network error')
            );
        });
    });

    describe('executeSingleCycle', () => {
        let cycleCommand: any;

        beforeEach(() => {
            jest.clearAllMocks();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((command, callback) => {
                if (command === 'copilot-orchestrator.executeSingleCycle') {
                    cycleCommand = callback;
                }
                return { dispose: jest.fn() };
            });
            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);
            jest.clearAllMocks();
        });

        it('should execute a single cycle successfully', async () => {
            await cycleCommand();

            expect(mockAgentLoopService.executeCycle).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[SUCCESS]')
            );
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('completed'),
                'View Details'
            );
        });

        it('should handle cycle execution errors', async () => {
            mockAgentLoopService.executeCycle.mockRejectedValue(new Error('Execution failed'));

            await cycleCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Execution failed')
            );
        });

        it('should show output channel when View Details is clicked', async () => {
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('View Details');

            await cycleCommand();

            expect(mockOutputChannel.show).toHaveBeenCalled();
        });
    });

    describe('Status Polling', () => {
        let startCommand: any;

        beforeEach(() => {
            jest.useFakeTimers();
            jest.clearAllMocks();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((command, callback) => {
                if (command === 'copilot-orchestrator.startAutoLoop') {
                    startCommand = callback;
                }
                return { dispose: jest.fn() };
            });
            autoAgentLoopCommand = new AutoAgentLoopCommand(mockContext);
            jest.clearAllMocks();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should poll status every 5 seconds when loop is running', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');

            await startCommand();

            jest.clearAllMocks();

            // Fast-forward 5 seconds
            jest.advanceTimersByTime(5000);

            expect(mockAgentLoopService.getStatus).toHaveBeenCalled();
        });

        it('should stop polling when loop completes', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');

            await startCommand();

            jest.clearAllMocks();

            // Simulate loop completion
            mockAgentLoopService.getStatus.mockResolvedValue({
                running: false,
                state: 'completed',
                current_task_id: undefined,
                cycles_executed: 10,
                successes: 10,
                errors: 0,
                avg_cycle_time: 15,
            });

            jest.advanceTimersByTime(5000);
            await Promise.resolve(); // Allow promises to resolve

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('completed'),
                'View Stats',
                'View Output'
            );
        });
    });
});
