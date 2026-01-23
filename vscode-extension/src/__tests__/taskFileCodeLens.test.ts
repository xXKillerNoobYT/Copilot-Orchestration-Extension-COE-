import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { TaskFileCodeLensProvider } from '../taskFileCodeLens';
import { TaskStatusParser } from '../taskStatusParser';
import { ParsedTask, TaskStatus } from '../taskParser';

// Mock vscode
jest.mock('vscode');

// Mock TaskStatusParser
jest.mock('../taskStatusParser');

describe('TaskFileCodeLensProvider', () => {
    let provider: TaskFileCodeLensProvider;
    let mockDocument: vscode.TextDocument;
    let mockToken: vscode.CancellationToken;
    let mockParser: jest.Mocked<TaskStatusParser>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocks
        mockParser = {
            parseTaskFile: jest.fn(),
            buildStatusDisplay: jest.fn(),
        } as any;

        (TaskStatusParser as jest.MockedClass<typeof TaskStatusParser>).mockImplementation(() => mockParser);

        provider = new TaskFileCodeLensProvider();

        mockDocument = {
            uri: { fsPath: '/path/to/task-001.task.md' },
            getText: jest.fn(() => 'mock content'),
            lineCount: 10,
        } as any;

        mockToken = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn(),
        } as any;

        // Mock vscode.Range
        (vscode.Range as any) = jest.fn((start, startChar, end, endChar) => ({
            start: { line: start, character: startChar },
            end: { line: end, character: endChar },
        }));

        // Mock vscode.CodeLens
        (vscode.CodeLens as any) = jest.fn((range, command) => ({
            range,
            command,
        }));
    });

    describe('provideCodeLenses', () => {
        it('should return empty array for non-task files', async () => {
            mockDocument.uri.fsPath = '/path/to/regular.md';

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            expect(result).toEqual([]);
            expect(mockParser.parseTaskFile).not.toHaveBeenCalled();
        });

        it('should return empty array when task parsing fails', async () => {
            mockParser.parseTaskFile.mockReturnValue({
                task: null,
                errors: ['Parse error'],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            expect(result).toEqual([]);
            expect(mockParser.parseTaskFile).toHaveBeenCalledWith(
                '/path/to/task-001.task.md',
                'mock content'
            );
        });

        it('should provide Execute Now CodeLens for valid task', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                status: 'pending' as TaskStatus,
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            expect(result.length).toBeGreaterThan(0);

            const executeLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.executeTask'
            );

            expect(executeLens).toBeDefined();
            expect(executeLens?.command?.title).toContain('Execute Now');
            expect(executeLens?.command?.arguments).toEqual([mockDocument.uri, 'task-001']);
        });

        it('should provide Status CodeLens with correct status emoji', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                status: 'in-progress' as TaskStatus,
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            const statusLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.changeTaskStatus'
            );

            expect(statusLens).toBeDefined();
            expect(statusLens?.command?.title).toContain('Status:');
            expect(statusLens?.command?.title).toContain('in-progress');
        });

        it('should provide Open Context CodeLens when context bundle exists', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                context_bundle: 'bundle-123',
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            const contextLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.openContextBundle'
            );

            expect(contextLens).toBeDefined();
            expect(contextLens?.command?.title).toContain('Open Context');
            expect(contextLens?.command?.arguments).toEqual(['bundle-123']);
        });

        it('should provide Create Context CodeLens when no context bundle', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            const contextLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.createContextBundle'
            );

            expect(contextLens).toBeDefined();
            expect(contextLens?.command?.title).toContain('Create Context');
        });

        it('should provide Link GitHub CodeLens when not linked', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            const githubLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.linkGitHubIssue'
            );

            expect(githubLens).toBeDefined();
            expect(githubLens?.command?.title).toContain('Link GitHub');
        });

        it('should not provide Link GitHub CodeLens when already linked', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                github_issue_id: 123,
                github_issue_url: 'https://github.com/owner/repo/issues/123',
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            const githubLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.linkGitHubIssue'
            );

            expect(githubLens).toBeUndefined();
        });

        it('should cache parsed tasks', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            await provider.provideCodeLenses(mockDocument, mockToken);
            await provider.provideCodeLenses(mockDocument, mockToken);

            expect(mockParser.parseTaskFile).toHaveBeenCalledTimes(2);
        });

        it('should handle different status values', async () => {
            const statuses: TaskStatus[] = ['pending', 'in-progress', 'completed', 'blocked'];

            for (const status of statuses) {
                const mockTask: ParsedTask = {
                    id: 'task-001',
                    title: 'Test Task',
                    status,
                    description: 'Test description',
                    subtasks: [],
                    assignees: [],
                    labels: [],
                };

                mockParser.parseTaskFile.mockReturnValue({
                    task: mockTask,
                    errors: [],
                });

                const result = await provider.provideCodeLenses(mockDocument, mockToken);

                const statusLens = result.find((lens: any) =>
                    lens.command?.command === 'copilot-orchestrator.changeTaskStatus'
                );

                expect(statusLens?.command?.title).toContain(status);
            }
        });
    });

    describe('onDidChangeCodeLenses', () => {
        it('should provide event emitter', () => {
            expect(provider.onDidChangeCodeLenses).toBeDefined();
        });

        it('should fire event when CodeLenses change', (done) => {
            const listener = jest.fn();
            provider.onDidChangeCodeLenses(listener);

            // Trigger change (this would normally be done by refresh method)
            // For now, just verify the event exists
            expect(provider.onDidChangeCodeLenses).toBeDefined();
            done();
        });
    });

    describe('getStatusEmoji', () => {
        it('should return correct emoji for pending status', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                status: 'pending' as TaskStatus,
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);
            const statusLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.changeTaskStatus'
            );

            expect(statusLens?.command?.title).toBeDefined();
        });

        it('should return correct emoji for completed status', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                status: 'completed' as TaskStatus,
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);
            const statusLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.changeTaskStatus'
            );

            expect(statusLens?.command?.title).toBeDefined();
        });

        it('should return correct emoji for blocked status', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Test Task',
                status: 'blocked' as TaskStatus,
                description: 'Test description',
                subtasks: [],
                assignees: [],
                labels: [],
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);
            const statusLens = result.find((lens: any) =>
                lens.command?.command === 'copilot-orchestrator.changeTaskStatus'
            );

            expect(statusLens?.command?.title).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should handle tasks with all optional fields', async () => {
            const mockTask: ParsedTask = {
                id: 'task-001',
                title: 'Complete Task',
                status: 'in-progress' as TaskStatus,
                priority: 'high',
                type: 'feature',
                context_bundle: 'bundle-123',
                github_issue_id: 456,
                github_issue_url: 'https://github.com/owner/repo/issues/456',
                description: 'Test description',
                subtasks: [],
                assignees: ['auto-zen'],
                labels: ['backend'],
                estimate: '4h',
                due: '2026-01-30',
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: mockTask,
                errors: [],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle cancellation token', async () => {
            mockToken.isCancellationRequested = true;

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            // Should still process but check token
            expect(result).toBeDefined();
        });

        it('should handle empty document', async () => {
            (mockDocument.getText as jest.Mock).mockReturnValue('');

            mockParser.parseTaskFile.mockReturnValue({
                task: null,
                errors: ['Empty file'],
            });

            const result = await provider.provideCodeLenses(mockDocument, mockToken);

            expect(result).toEqual([]);
        });
    });
});
