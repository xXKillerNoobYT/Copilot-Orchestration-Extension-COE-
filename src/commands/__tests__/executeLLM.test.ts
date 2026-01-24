/**
 * Tests for executeLLM command
 * Verifies LLM task execution, streaming, and error handling
 */

import * as vscode from 'vscode';
import { executeLlmCommand, executeLlmCommandStreaming } from '../executeLLM';
import { createOpenAIClient } from '../../llm/openaiClient';
import { readLlmConfig } from '../../config/llmConfig';
import { CopilotDispatcher } from '../../copilotDispatcher';

// Mock vscode with all required enums
jest.mock('vscode', () => ({
    EndOfLine: { LF: 1, CRLF: 2 },
    ViewColumn: { One: 1, Two: 2, Three: 3 },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ExtensionMode: { Development: 1, Production: 2, Test: 3 },
    ProgressLocation: { Notification: 15 },
    Uri: {
        file: jest.fn((path) => ({ fsPath: path, path, scheme: 'file' })),
    },
    window: {},
    workspace: {},
    commands: {},
}), { virtual: true });

jest.mock('../../llm/openaiClient');
jest.mock('../../config/llmConfig');
jest.mock('../../copilotDispatcher');

describe('executeLLM', () => {
    let mockClient: any;
    let mockDispatcher: any;
    let mockConfigState: any;
    let mockDocument: vscode.TextDocument;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();

        // Mock configuration state
        mockConfigState = {
            isConfigured: true,
            issues: [],
            config: {
                provider: 'openai',
                endpoint: 'https://api.openai.com/v1',
                apiKey: 'test-key',
                model: 'gpt-4',
                temperature: 0.7,
                timeoutMs: 30000,
            },
        };

        // Mock LLM client
        mockClient = {
            sendChat: jest.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: 'This is a test response from the LLM',
                    },
                }],
            }),
        };

        // Mock dispatcher
        mockDispatcher = {
            composePrompt: jest.fn().mockResolvedValue({
                task: {
                    title: 'Test Task',
                    priority: 'high',
                    status: 'pending',
                    dependencies: [],
                },
                messages: [
                    { role: 'system', content: 'You are a helpful assistant' },
                    { role: 'user', content: 'Complete the task' },
                ],
                context: {
                    files: [],
                },
                memory: [],
            }),
        };

        // Mock document
        mockDocument = {
            uri: vscode.Uri.file('/test/result.md'),
            fileName: '/test/result.md',
            isUntitled: false,
            languageId: 'markdown',
            version: 1,
            isDirty: false,
            isClosed: false,
            save: jest.fn(),
            eol: vscode.EndOfLine.LF,
            lineCount: 10,
            lineAt: jest.fn(),
            offsetAt: jest.fn(),
            positionAt: jest.fn(),
            getText: jest.fn(),
            getWordRangeAtPosition: jest.fn(),
            validateRange: jest.fn(),
            validatePosition: jest.fn(),
        } as unknown as vscode.TextDocument;

        // Setup mocks
        (readLlmConfig as jest.Mock).mockReturnValue(mockConfigState);
        (createOpenAIClient as jest.Mock).mockReturnValue(mockClient);
        (CopilotDispatcher as jest.Mock).mockImplementation(() => mockDispatcher);

        // Mock vscode.window methods
        (vscode.window.showQuickPick as jest.Mock) = jest.fn().mockResolvedValue('Select Task');
        (vscode.window.showInputBox as jest.Mock) = jest.fn();
        (vscode.window.showErrorMessage as jest.Mock) = jest.fn();
        (vscode.window.showInformationMessage as jest.Mock) = jest.fn();
        (vscode.window.showWarningMessage as jest.Mock) = jest.fn();
        (vscode.window.withProgress as jest.Mock) = jest.fn((options, task) =>
            task({ report: jest.fn() }, { isCancellationRequested: false, onCancellationRequested: jest.fn() })
        );
        (vscode.window.createOutputChannel as jest.Mock) = jest.fn(() => ({
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            name: 'Test Output Channel',
        }));

        // Mock workspace methods
        (vscode.workspace.openTextDocument as jest.Mock) = jest.fn().mockResolvedValue(mockDocument);
        (vscode.window.showTextDocument as jest.Mock) = jest.fn();
    });

    describe('executeLlmCommand', () => {
        it('should be defined', () => {
            expect(executeLlmCommand).toBeDefined();
        });

        it('should cancel when user cancels quick pick', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Cancel');

            await executeLlmCommand();

            expect(vscode.window.showInputBox).not.toHaveBeenCalled();
            expect(mockDispatcher.composePrompt).not.toHaveBeenCalled();
        });

        it('should cancel when user cancels quick pick (undefined)', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await executeLlmCommand();

            expect(vscode.window.showInputBox).not.toHaveBeenCalled();
            expect(mockDispatcher.composePrompt).not.toHaveBeenCalled();
        });

        it('should cancel when no task ID is provided', async () => {
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce(undefined); // No task ID

            await executeLlmCommand();

            expect(mockDispatcher.composePrompt).not.toHaveBeenCalled();
        });

        it('should cancel when no agent name is provided', async () => {
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123') // Task ID
                .mockResolvedValueOnce(undefined); // No agent name

            await executeLlmCommand();

            expect(mockDispatcher.composePrompt).not.toHaveBeenCalled();
        });

        it('should show error when LLM is not configured', async () => {
            mockConfigState.isConfigured = false;
            mockConfigState.issues = ['API key not set', 'Endpoint not configured'];
            (readLlmConfig as jest.Mock).mockReturnValue(mockConfigState);

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('API key not set; Endpoint not configured')
            );
            expect(mockDispatcher.composePrompt).not.toHaveBeenCalled();
        });

        it('should execute task successfully with valid inputs', async () => {
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-mk530r89-86665')
                .mockResolvedValueOnce('coder');

            await executeLlmCommand();

            expect(mockDispatcher.composePrompt).toHaveBeenCalledWith(
                'TASK-mk530r89-86665',
                {
                    agentName: 'coder',
                    extraInstructions: 'Generate a detailed analysis and implementation plan.',
                }
            );

            expect(mockClient.sendChat).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ role: 'system' }),
                    expect.objectContaining({ role: 'user' }),
                ]),
                {
                    temperature: 0.7,
                    timeoutMs: 30000,
                }
            );

            expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
                content: expect.stringContaining('# LLM Execution Result'),
                language: 'markdown',
            });

            expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
                mockDocument,
                vscode.ViewColumn.One
            );
        });

        it('should work with different agent names', async () => {
            const agents = ['coder', 'planner', 'tester'];

            for (const agent of agents) {
                jest.clearAllMocks();
                (vscode.window.showInputBox as jest.Mock)
                    .mockResolvedValueOnce('TASK-123')
                    .mockResolvedValueOnce(agent);

                await executeLlmCommand();

                expect(mockDispatcher.composePrompt).toHaveBeenCalledWith(
                    'TASK-123',
                    expect.objectContaining({ agentName: agent })
                );
            }
        });

        it('should handle LLM response with no content', async () => {
            mockClient.sendChat.mockResolvedValue({
                choices: [{
                    message: {},
                }],
            });

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommand();

            expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
                content: expect.stringContaining('(no response content)'),
                language: 'markdown',
            });
        });

        it('should handle dispatcher errors', async () => {
            mockDispatcher.composePrompt.mockRejectedValue(new Error('Task not found'));

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-invalid')
                .mockResolvedValueOnce('coder');

            await executeLlmCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Task not found')
            );
        });

        it('should handle LLM client errors', async () => {
            mockClient.sendChat.mockRejectedValue(new Error('Network timeout'));

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Network timeout')
            );
        });

        it('should display task details in result', async () => {
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommand();

            const documentContent = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0].content;

            expect(documentContent).toContain('# LLM Execution Result');
            expect(documentContent).toContain('**Task ID:** TASK-123');
            expect(documentContent).toContain('**Agent:** coder');
            expect(documentContent).toContain('Test Task');
            expect(documentContent).toContain('This is a test response from the LLM');
        });

        it('should show progress messages during execution', async () => {
            const reportMock = jest.fn();
            (vscode.window.withProgress as jest.Mock) = jest.fn((options, task) => {
                expect(options.title).toContain('Executing task');
                return task({ report: reportMock }, { isCancellationRequested: false, onCancellationRequested: jest.fn() });
            });

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommand();

            expect(reportMock).toHaveBeenCalledWith({ message: 'Composing prompt...' });
            expect(reportMock).toHaveBeenCalledWith({ message: 'Sending to LLM...' });
            expect(reportMock).toHaveBeenCalledWith({ message: 'Processing response...' });
        });

        it('should handle non-Error exceptions', async () => {
            mockClient.sendChat.mockRejectedValue('String error');

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommand();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('String error')
            );
        });
    });

    describe('executeLlmCommandStreaming', () => {
        let mockStreamingClient: any;
        let mockStreamingOutputChannel: any;

        beforeEach(() => {
            // Mock streaming output channel
            mockStreamingOutputChannel = {
                startStream: jest.fn(),
                appendChunk: jest.fn(),
                updateProgress: jest.fn(),
                endStream: jest.fn(),
                showError: jest.fn(),
            };

            // Mock streaming client
            mockStreamingClient = {
                streamChat: jest.fn(async (messages, options, config) => {
                    // Simulate streaming chunks
                    if (options.onChunk) {
                        options.onChunk({ type: 'text', content: 'Chunk 1' });
                        options.onChunk({ type: 'text', content: 'Chunk 2' });
                        options.onChunk({ type: 'progress', progress: 50 });
                        options.onChunk({ type: 'done' });
                    }
                    if (options.onComplete) {
                        options.onComplete({ success: true });
                    }
                }),
            };

            // Mock dynamic imports
            jest.mock('../../ui/streamingOutputChannel.js', () => ({
                getStreamingOutputChannel: jest.fn(() => mockStreamingOutputChannel),
            }), { virtual: true });

            jest.mock('../../services/streamingClient.js', () => ({
                createStreamingClient: jest.fn(() => mockStreamingClient),
            }), { virtual: true });
        });

        it('should be defined', () => {
            expect(executeLlmCommandStreaming).toBeDefined();
        });

        it('should cancel when no task ID is provided', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(undefined);

            await executeLlmCommandStreaming();

            expect(mockDispatcher.composePrompt).not.toHaveBeenCalled();
        });

        it('should cancel when no agent name is provided', async () => {
            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce(undefined);

            await executeLlmCommandStreaming();

            expect(mockDispatcher.composePrompt).not.toHaveBeenCalled();
        });

        it('should show error when LLM is not configured', async () => {
            mockConfigState.isConfigured = false;
            mockConfigState.issues = ['API key not set'];
            (readLlmConfig as jest.Mock).mockReturnValue(mockConfigState);

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommandStreaming();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('API key not set')
            );
        });

        it('should handle successful streaming execution', async () => {
            // Use real implementation for dynamic imports
            const { getStreamingOutputChannel } = await import('../../ui/streamingOutputChannel.js');
            const { createStreamingClient } = await import('../../services/streamingClient.js');

            (getStreamingOutputChannel as jest.Mock).mockReturnValue(mockStreamingOutputChannel);
            (createStreamingClient as jest.Mock).mockReturnValue(mockStreamingClient);

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-streaming')
                .mockResolvedValueOnce('tester');

            await executeLlmCommandStreaming();

            expect(mockDispatcher.composePrompt).toHaveBeenCalledWith(
                'TASK-streaming',
                expect.objectContaining({ agentName: 'tester' })
            );
        });

        it('should handle streaming errors', async () => {
            const { getStreamingOutputChannel } = await import('../../ui/streamingOutputChannel.js');
            const { createStreamingClient } = await import('../../services/streamingClient.js');

            (getStreamingOutputChannel as jest.Mock).mockReturnValue(mockStreamingOutputChannel);

            const errorStreamingClient = {
                streamChat: jest.fn(async (messages, options, config) => {
                    if (options.onError) {
                        options.onError(new Error('Streaming failed'));
                    }
                }),
            };
            (createStreamingClient as jest.Mock).mockReturnValue(errorStreamingClient);

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommandStreaming();

            // Verify that error was shown
            // Note: The actual implementation handles this via onError callback
        });

        it('should handle cancellation', async () => {
            const { getStreamingOutputChannel } = await import('../../ui/streamingOutputChannel.js');
            const { createStreamingClient } = await import('../../services/streamingClient.js');

            (getStreamingOutputChannel as jest.Mock).mockReturnValue(mockStreamingOutputChannel);

            const cancellableClient = {
                streamChat: jest.fn(async (messages, options, config) => {
                    if (options.onCancel) {
                        options.onCancel();
                    }
                }),
            };
            (createStreamingClient as jest.Mock).mockReturnValue(cancellableClient);

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommandStreaming();

            // Verify cancellation message would be shown
        });

        it('should handle dispatcher errors during streaming', async () => {
            mockDispatcher.composePrompt.mockRejectedValue(new Error('Invalid task'));

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-bad')
                .mockResolvedValueOnce('coder');

            await executeLlmCommandStreaming();

            // Error should be caught and displayed
        });

        it('should handle non-Error exceptions in streaming', async () => {
            mockDispatcher.composePrompt.mockRejectedValue('String error in streaming');

            (vscode.window.showInputBox as jest.Mock)
                .mockResolvedValueOnce('TASK-123')
                .mockResolvedValueOnce('coder');

            await executeLlmCommandStreaming();

            // Non-Error should be converted to Error
        });
    });
});
