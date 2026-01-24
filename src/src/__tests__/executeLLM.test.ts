import * as vscode from 'vscode';
import { executeLlmCommand, executeLlmCommandStreaming } from '../commands/executeLLM';
import { CopilotDispatcher } from '../copilotDispatcher';
import { createOpenAIClient } from '../llm/openaiClient';
import { readLlmConfig } from '../config/llmConfig';

// Mock dependencies
jest.mock('vscode');
jest.mock('../copilotDispatcher');
jest.mock('../llm/openaiClient');
jest.mock('../config/llmConfig');
jest.mock('../ui/streamingOutputChannel.js');
jest.mock('../services/streamingClient.js');

describe('executeLLM Command', () => {
    let mockShowQuickPick: jest.Mock;
    let mockShowInputBox: jest.Mock;
    let mockShowErrorMessage: jest.Mock;
    let mockShowInformationMessage: jest.Mock;
    let mockWithProgress: jest.Mock;
    let mockOpenTextDocument: jest.Mock;
    let mockShowTextDocument: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup VS Code mocks
        mockShowQuickPick = jest.fn();
        mockShowInputBox = jest.fn();
        mockShowErrorMessage = jest.fn();
        mockShowInformationMessage = jest.fn();
        mockWithProgress = jest.fn();
        mockOpenTextDocument = jest.fn();
        mockShowTextDocument = jest.fn();

        (vscode.window as any) = {
            showQuickPick: mockShowQuickPick,
            showInputBox: mockShowInputBox,
            showErrorMessage: mockShowErrorMessage,
            showInformationMessage: mockShowInformationMessage,
            withProgress: mockWithProgress,
            showTextDocument: mockShowTextDocument,
            createOutputChannel: jest.fn(() => ({
                appendLine: jest.fn(),
                append: jest.fn(),
                clear: jest.fn(),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn(),
            })),
        };

        (vscode.workspace as any) = {
            openTextDocument: mockOpenTextDocument,
        };

        Object.defineProperty(vscode, 'ViewColumn', {
            value: { Two: 2 },
            writable: true,
        });

        Object.defineProperty(vscode, 'ProgressLocation', {
            value: { Notification: 15 },
            writable: true,
        });
    });

    describe('executeLlmCommand', () => {
        it('should cancel when user dismisses quick pick', async () => {
            mockShowQuickPick.mockResolvedValue(undefined);

            await executeLlmCommand();

            expect(mockShowQuickPick).toHaveBeenCalledWith(
                ['Select Task', 'Cancel'],
                { placeHolder: 'Choose an option to execute LLM task' }
            );
            expect(mockShowInputBox).not.toHaveBeenCalled();
        });

        it('should cancel when user selects Cancel option', async () => {
            mockShowQuickPick.mockResolvedValue('Cancel');

            await executeLlmCommand();

            expect(mockShowInputBox).not.toHaveBeenCalled();
        });

        it('should return when no task ID is entered', async () => {
            mockShowQuickPick.mockResolvedValue('Select Task');
            mockShowInputBox.mockResolvedValueOnce(undefined);

            await executeLlmCommand();

            expect(mockShowInputBox).toHaveBeenCalledTimes(1);
            expect(mockShowInputBox).toHaveBeenCalledWith({
                prompt: 'Enter task ID (e.g., TASK-mk530r89-86665)',
                placeHolder: 'TASK-...',
                ignoreFocusOut: true,
            });
        });

        it('should return when no agent name is entered', async () => {
            mockShowQuickPick.mockResolvedValue('Select Task');
            mockShowInputBox
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce(undefined);

            await executeLlmCommand();

            expect(mockShowInputBox).toHaveBeenCalledTimes(2);
        });

        it('should show error when LLM is not configured', async () => {
            mockShowQuickPick.mockResolvedValue('Select Task');
            mockShowInputBox
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            (readLlmConfig as jest.Mock).mockReturnValue({
                isConfigured: false,
                issues: ['Missing API key', 'Invalid endpoint'],
                config: {},
            });

            await executeLlmCommand();

            expect(mockShowErrorMessage).toHaveBeenCalledWith(
                'LLM configuration is incomplete: Missing API key; Invalid endpoint'
            );
        });

        it('should execute LLM task successfully', async () => {
            mockShowQuickPick.mockResolvedValue('Select Task');
            mockShowInputBox
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            const mockConfig = {
                isConfigured: true,
                issues: [],
                config: {
                    provider: 'openai',
                    apiKey: 'test-key',
                    endpoint: 'https://api.openai.com/v1',
                    temperature: 0.7,
                    timeoutMs: 30000,
                },
            };

            (readLlmConfig as jest.Mock).mockReturnValue(mockConfig);

            const mockPayload = {
                taskId: 'TASK-123',
                agent: {
                    name: 'coder',
                    role: 'developer',
                    instructions: 'Write clean code',
                },
                task: {
                    id: 'TASK-123',
                    title: 'Test Task',
                    description: 'Test description',
                    priority: 'high',
                    status: 'pending',
                    dependencies: [],
                    assignees: [],
                    labels: [],
                    subtasks: [],
                    rawFrontMatter: {},
                },
                context: { files: [] },
                memory: [],
                messages: [
                    { role: 'system', content: 'You are a helpful assistant' },
                    { role: 'user', content: 'Complete this task' },
                ],
            };

            const mockDispatcher = {
                composePrompt: jest.fn().mockResolvedValue(mockPayload),
            };

            (CopilotDispatcher as jest.Mock).mockImplementation(() => mockDispatcher);

            const mockClient = {
                sendChat: jest.fn().mockResolvedValue({
                    choices: [
                        {
                            message: {
                                content: 'Task completed successfully',
                            },
                        },
                    ],
                }),
            };

            (createOpenAIClient as jest.Mock).mockReturnValue(mockClient);

            mockWithProgress.mockImplementation(async (options, callback) => {
                const progress = { report: jest.fn() };
                return callback(progress);
            });

            mockOpenTextDocument.mockResolvedValue({});

            await executeLlmCommand();

            expect(mockDispatcher.composePrompt).toHaveBeenCalledWith('TASK-123', {
                agentName: 'coder',
                extraInstructions: 'Generate a detailed analysis and implementation plan.',
            });

            expect(mockClient.sendChat).toHaveBeenCalledWith(mockPayload.messages, {
                temperature: 0.7,
                timeoutMs: 30000,
            });

            expect(mockOpenTextDocument).toHaveBeenCalled();
        });

        it('should handle LLM execution errors', async () => {
            mockShowQuickPick.mockResolvedValue('Select Task');
            mockShowInputBox
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            (readLlmConfig as jest.Mock).mockReturnValue({
                isConfigured: true,
                issues: [],
                config: {},
            });

            const mockDispatcher = {
                composePrompt: jest.fn().mockRejectedValue(new Error('Task not found')),
            };

            (CopilotDispatcher as jest.Mock).mockImplementation(() => mockDispatcher);

            mockWithProgress.mockImplementation(async (options, callback) => {
                const progress = { report: jest.fn() };
                return callback(progress);
            });

            await executeLlmCommand();

            expect(mockShowErrorMessage).toHaveBeenCalledWith(
                'Task execution failed: Task not found'
            );
        });
    });

    describe('executeLlmCommandStreaming', () => {
        it('should be defined', () => {
            expect(executeLlmCommandStreaming).toBeDefined();
        });

        it('should handle streaming responses', async () => {
            // Setup mocks BEFORE calling the function
            const mockOutputChannel = {
                startStream: jest.fn(),
                appendChunk: jest.fn(),
                updateProgress: jest.fn(),
                endStream: jest.fn(),
                showError: jest.fn(),
            };

            const mockStreamingClient = {
                streamChat: jest.fn().mockImplementation(async (messages, callbacks, options) => {
                    // Simulate streaming chunks
                    if (callbacks.onChunk) {
                        callbacks.onChunk({ type: 'text', content: 'Chunk 1' });
                        callbacks.onChunk({ type: 'text', content: 'Chunk 2' });
                        callbacks.onChunk({ type: 'progress', progress: 50 });
                        callbacks.onChunk({ type: 'text', content: 'Chunk 3' });
                        callbacks.onChunk({ type: 'done' });
                    }
                    if (callbacks.onComplete) {
                        callbacks.onComplete({ success: true });
                    }
                }),
            };

            // Import and setup mocks BEFORE the test runs
            const { getStreamingOutputChannel } = await import('../ui/streamingOutputChannel.js');
            const { createStreamingClient } = await import('../services/streamingClient.js');

            (getStreamingOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
            (createStreamingClient as jest.Mock).mockReturnValue(mockStreamingClient);

            mockShowInputBox
                .mockResolvedValueOnce('TASK-456')
                .mockResolvedValueOnce('planner');

            const mockConfig = {
                isConfigured: true,
                issues: [],
                config: {
                    provider: 'openai',
                    apiKey: 'test-key',
                    endpoint: 'https://api.openai.com/v1',
                    temperature: 0.7,
                    timeoutMs: 30000,
                },
            };

            (readLlmConfig as jest.Mock).mockReturnValue(mockConfig);

            const mockPayload = {
                taskId: 'TASK-456',
                agent: { name: 'planner', role: 'planner' },
                task: {
                    id: 'TASK-456',
                    title: 'Plan Task',
                    description: 'Planning task',
                    dependencies: [],
                    assignees: [],
                    labels: [],
                    subtasks: [],
                    rawFrontMatter: {},
                },
                context: { files: [] },
                memory: [],
                messages: [
                    { role: 'system', content: 'You are a planner' },
                    { role: 'user', content: 'Plan this task' },
                ],
            };

            const mockDispatcher = {
                composePrompt: jest.fn().mockResolvedValue(mockPayload),
            };

            (CopilotDispatcher as jest.Mock).mockImplementation(() => mockDispatcher);

            // Setup withProgress to properly call the callback with cancellation support
            mockWithProgress.mockImplementation((options, callback) => {
                const progress = { report: jest.fn() };
                const cancellationToken = {
                    isCancellationRequested: false,
                    onCancellationRequested: jest.fn()
                };
                return callback(progress, cancellationToken);
            });

            await executeLlmCommandStreaming();

            expect(mockDispatcher.composePrompt).toHaveBeenCalled();
            expect(mockStreamingClient.streamChat).toHaveBeenCalled();
            expect(mockOutputChannel.startStream).toHaveBeenCalledWith('TASK-456', 'planner');
            expect(mockOutputChannel.endStream).toHaveBeenCalled();
        });
    });
});
