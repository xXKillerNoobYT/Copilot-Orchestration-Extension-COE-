import * as vscode from 'vscode';
import { AutoAgentLoopCommand } from '../commands/autoAgentLoop';
import { AgentLoopService, AgentLoopStatus } from '../services/agentLoopService';

jest.mock('vscode');
jest.mock('../services/agentLoopService');

describe('AutoAgentLoop Command', () => {
    let mockContext: vscode.ExtensionContext;
    let mockStatusBarItem: any;
    let mockOutputChannel: any;
    let mockConfig: any;
    let autoAgentLoop: AutoAgentLoopCommand;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock status bar item
        mockStatusBarItem = {
            text: '',
            tooltip: '',
            command: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        };

        // Setup mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        };

        // Setup mock configuration
        mockConfig = {
            get: jest.fn((key: string, defaultValue?: any) => {
                if (key === 'backendUrl') return 'http://localhost:8000';
                return defaultValue;
            }),
        };

        // Setup VS Code mocks
        (vscode.window as any) = {
            createStatusBarItem: jest.fn(() => mockStatusBarItem),
            createOutputChannel: jest.fn(() => mockOutputChannel),
            showInputBox: jest.fn(),
            showQuickPick: jest.fn(),
            showInformationMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            showErrorMessage: jest.fn(),
            withProgress: jest.fn(),
        };

        (vscode.workspace as any) = {
            getConfiguration: jest.fn(() => mockConfig),
        };

        (vscode.commands as any) = {
            registerCommand: jest.fn((command, callback) => ({
                dispose: jest.fn(),
            })),
        };

        Object.defineProperty(vscode, 'StatusBarAlignment', {
            value: { Left: 1, Right: 2 },
            writable: true,
        });

        mockContext = {
            subscriptions: [],
            extensionPath: '/test',
            extensionUri: vscode.Uri.file('/test'),
        } as any;
    });

    describe('Initialization', () => {
        it('should create status bar item on construction', () => {
            autoAgentLoop = new AutoAgentLoopCommand(mockContext);

            expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
                vscode.StatusBarAlignment.Left,
                80
            );
            expect(mockStatusBarItem.show).toHaveBeenCalled();
        });

        it('should create output channel', () => {
            autoAgentLoop = new AutoAgentLoopCommand(mockContext);

            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Agent Loop');
        });

        it('should register commands', () => {
            autoAgentLoop = new AutoAgentLoopCommand(mockContext);

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
            autoAgentLoop = new AutoAgentLoopCommand(mockContext);

            expect(mockContext.subscriptions.length).toBeGreaterThan(0);
            expect(mockContext.subscriptions).toContain(mockStatusBarItem);
            expect(mockContext.subscriptions).toContain(mockOutputChannel);
        });

        it('should read backend URL from configuration', () => {
            autoAgentLoop = new AutoAgentLoopCommand(mockContext);

            expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('copilot-orchestrator');
            expect(mockConfig.get).toHaveBeenCalledWith('backendUrl');
        });

        it('should use default backend URL if not configured', () => {
            mockConfig.get.mockReturnValue(undefined);

            autoAgentLoop = new AutoAgentLoopCommand(mockContext);

            expect(AgentLoopService).toHaveBeenCalledWith(
                expect.objectContaining({ baseUrl: 'http://localhost:8000' })
            );
        });
    });

    describe('startAutoLoop', () => {
        let mockAgentLoopService: any;

        beforeEach(() => {
            mockAgentLoopService = {
                startLoop: jest.fn().mockResolvedValue({ success: true }),
                stopLoop: jest.fn().mockResolvedValue({ success: true }),
                getStatus: jest.fn().mockResolvedValue({
                    running: false,
                    current_cycle: 0,
                    max_cycles: 0,
                    total_tasks_executed: 0,
                }),
                executeCycle: jest.fn().mockResolvedValue({
                    success: true,
                    tasks_executed: 5,
                }),
            };

            (AgentLoopService as jest.Mock).mockImplementation(() => mockAgentLoopService);

            autoAgentLoop = new AutoAgentLoopCommand(mockContext);
        });

        it('should start loop with user-specified max cycles', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('10');

            const startCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.startAutoLoop')?.[1];

            await startCommand();

            expect(vscode.window.showInputBox).toHaveBeenCalled();
            expect(mockAgentLoopService.startLoop).toHaveBeenCalledWith(10);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Starting agent switching loop')
            );
        });

        it('should handle infinite loop (max cycles = 0)', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('0');

            const startCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.startAutoLoop')?.[1];

            await startCommand();

            expect(mockAgentLoopService.startLoop).toHaveBeenCalledWith(0);
        });

        it('should cancel when user dismisses input', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

            const startCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.startAutoLoop')?.[1];

            await startCommand();

            expect(mockAgentLoopService.startLoop).not.toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('CANCELLED')
            );
        });

        it('should validate max cycles input', async () => {
            let validator: any;
            (vscode.window.showInputBox as jest.Mock).mockImplementation((options) => {
                validator = options.validateInput;
                return Promise.resolve('5');
            });

            const startCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.startAutoLoop')?.[1];

            await startCommand();

            expect(validator).toBeDefined();
            expect(validator('10')).toBeNull();
            expect(validator('abc')).toBeTruthy();
            expect(validator('-5')).toBeTruthy();
        });

        it('should show warning if loop already running', async () => {
            mockAgentLoopService.getStatus.mockResolvedValue({
                running: true,
                current_cycle: 5,
            });

            // Start loop once
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('10');
            const startCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.startAutoLoop')?.[1];

            await startCommand();

            // Try to start again
            await startCommand();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('already running')
            );
        });

        it('should handle start loop errors', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('10');
            mockAgentLoopService.startLoop.mockRejectedValue(new Error('Backend unavailable'));

            const startCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.startAutoLoop')?.[1];

            await startCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Backend unavailable')
            );
        });

        it('should update status bar when starting', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('5');

            const startCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.startAutoLoop')?.[1];

            await startCommand();

            expect(mockStatusBarItem.text).toContain('Agent Loop');
        });
    });

    describe('stopAutoLoop', () => {
        let mockAgentLoopService: any;

        beforeEach(() => {
            mockAgentLoopService = {
                startLoop: jest.fn().mockResolvedValue({ success: true }),
                stopLoop: jest.fn().mockResolvedValue({ success: true }),
                getStatus: jest.fn().mockResolvedValue({
                    running: true,
                    current_cycle: 5,
                }),
            };

            (AgentLoopService as jest.Mock).mockImplementation(() => mockAgentLoopService);

            autoAgentLoop = new AutoAgentLoopCommand(mockContext);
        });

        it('should stop running loop', async () => {
            const stopCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.stopAutoLoop')?.[1];

            await stopCommand();

            expect(mockAgentLoopService.stopLoop).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Stopping')
            );
        });

        it('should update status bar when stopped', async () => {
            const stopCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.stopAutoLoop')?.[1];

            await stopCommand();

            expect(mockStatusBarItem.text).toContain('Idle');
        });

        it('should handle stop errors', async () => {
            mockAgentLoopService.stopLoop.mockRejectedValue(new Error('Cannot stop loop'));

            const stopCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.stopAutoLoop')?.[1];

            await stopCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalled();
        });
    });

    describe('showStatus', () => {
        let mockAgentLoopService: any;

        beforeEach(() => {
            mockAgentLoopService = {
                getStatus: jest.fn().mockResolvedValue({
                    running: true,
                    current_cycle: 10,
                    max_cycles: 50,
                    total_tasks_executed: 125,
                    current_agent: 'coder',
                }),
            };

            (AgentLoopService as jest.Mock).mockImplementation(() => mockAgentLoopService);

            autoAgentLoop = new AutoAgentLoopCommand(mockContext);
        });

        it('should display loop status', async () => {
            const statusCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.autoLoopStatus')?.[1];

            await statusCommand();

            expect(mockAgentLoopService.getStatus).toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('RUNNING')
            );
        });

        it('should show idle status when not running', async () => {
            mockAgentLoopService.getStatus.mockResolvedValue({ running: false });

            const statusCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.autoLoopStatus')?.[1];

            await statusCommand();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('IDLE')
            );
        });
    });

    describe('executeSingleCycle', () => {
        let mockAgentLoopService: any;

        beforeEach(() => {
            mockAgentLoopService = {
                executeCycle: jest.fn().mockResolvedValue({
                    success: true,
                    tasks_executed: 8,
                    agent_name: 'tester',
                }),
            };

            (AgentLoopService as jest.Mock).mockImplementation(() => mockAgentLoopService);

            autoAgentLoop = new AutoAgentLoopCommand(mockContext);
        });

        it('should execute a single cycle', async () => {
            const cycleCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.executeSingleCycle')?.[1];

            await cycleCommand();

            expect(mockAgentLoopService.executeCycle).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[INFO] Executing single agent cycle')
            );
        });

        it('should show results after cycle execution', async () => {
            const cycleCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.executeSingleCycle')?.[1];

            await cycleCommand();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('completed'),
                expect.anything()
            );
        });

        it('should handle cycle execution errors', async () => {
            mockAgentLoopService.executeCycle.mockRejectedValue(new Error('Execution failed'));

            const cycleCommand = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .find(call => call[0] === 'copilot-orchestrator.executeSingleCycle')?.[1];

            await cycleCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalled();
        });
    });
});
