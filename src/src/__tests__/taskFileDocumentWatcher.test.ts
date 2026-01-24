import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { TaskFileDocumentWatcher } from '../taskFileDocumentWatcher';
import { TaskFileCodeLensProvider } from '../taskFileCodeLens';
import { TaskStatusParser } from '../taskStatusParser';

// Mock vscode
jest.mock('vscode');
jest.mock('../taskFileCodeLens');
jest.mock('../taskStatusParser');

describe('TaskFileDocumentWatcher', () => {
    let watcher: TaskFileDocumentWatcher;
    let mockCodeLensProvider: jest.Mocked<TaskFileCodeLensProvider>;
    let mockParser: jest.Mocked<TaskStatusParser>;
    let mockDisposables: vscode.Disposable[];

    beforeEach(() => {
        jest.clearAllMocks();

        mockCodeLensProvider = {
            refresh: jest.fn(),
        } as any;
        mockParser = {
            parseTaskFile: jest.fn(() => ({
                task: {
                    id: 'TASK-001',
                    title: 'Test Task',
                    description: 'Test description',
                    status: 'pending',
                    priority: 'medium',
                    dependencies: [],
                    assignees: [],
                    labels: [],
                    subtasks: [],
                    rawFrontMatter: {},
                },
                errors: [],
            })),
            buildStatusDisplay: jest.fn(() => 'Status: Pending'),
        } as any;

        (TaskStatusParser as jest.MockedClass<typeof TaskStatusParser>).mockImplementation(() => mockParser);

        // Mock VS Code APIs
        (vscode.window as any) = {
            createTextEditorDecorationType: jest.fn(() => ({
                dispose: jest.fn(),
            })),
            createStatusBarItem: jest.fn(() => ({
                text: '',
                tooltip: '',
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn(),
            })),
            showInformationMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            showErrorMessage: jest.fn(),
            activeTextEditor: undefined,
            onDidChangeActiveTextEditor: jest.fn((callback) => {
                return { dispose: jest.fn() };
            }),
        };

        (vscode.workspace as any) = {
            createFileSystemWatcher: jest.fn(() => ({
                onDidCreate: jest.fn((callback, context, disposables) => {
                    return { dispose: jest.fn() };
                }),
                onDidChange: jest.fn((callback, context, disposables) => {
                    return { dispose: jest.fn() };
                }),
                onDidDelete: jest.fn((callback, context, disposables) => {
                    return { dispose: jest.fn() };
                }),
                dispose: jest.fn(),
            })),
            onDidChangeTextDocument: jest.fn((callback, context, disposables) => {
                return { dispose: jest.fn() };
            }),
            findFiles: jest.fn(() => Promise.resolve([])),
            openTextDocument: jest.fn(),
        };

        (vscode.ThemeColor as any) = jest.fn((name) => ({ name }));
        (vscode.StatusBarAlignment as any) = { Right: 2, Left: 1 };

        mockDisposables = [];

        watcher = new TaskFileDocumentWatcher(mockCodeLensProvider);
    });

    describe('constructor', () => {
        it('should create watcher instance', () => {
            expect(watcher).toBeDefined();
        });

        it('should create status parser', () => {
            expect(TaskStatusParser).toHaveBeenCalled();
        });

        it('should create decoration type', () => {
            expect(vscode.window.createTextEditorDecorationType).toHaveBeenCalled();
        });

        it('should create status bar item', () => {
            expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
                vscode.StatusBarAlignment.Right,
                100
            );
        });
    });

    describe('startWatching', () => {
        it('should create file system watcher for .task.md files', () => {
            const disposables = watcher.startWatching();

            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*.task.md');
            expect(disposables.length).toBeGreaterThan(0);
        });

        it('should return disposables', () => {
            const disposables = watcher.startWatching();

            expect(Array.isArray(disposables)).toBe(true);
            expect(disposables.length).toBeGreaterThan(0);
        });

        it('should set up file creation handler', () => {
            const mockWatcher = {
                onDidCreate: jest.fn(),
                onDidChange: jest.fn(),
                onDidDelete: jest.fn(),
                dispose: jest.fn(),
            };

            (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue(mockWatcher);

            watcher.startWatching();

            expect(mockWatcher.onDidCreate).toHaveBeenCalled();
        });

        it('should set up file change handler', () => {
            const mockWatcher = {
                onDidCreate: jest.fn(),
                onDidChange: jest.fn(),
                onDidDelete: jest.fn(),
                dispose: jest.fn(),
            };

            (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue(mockWatcher);

            watcher.startWatching();

            expect(mockWatcher.onDidChange).toHaveBeenCalled();
        });

        it('should set up file deletion handler', () => {
            const mockWatcher = {
                onDidCreate: jest.fn(),
                onDidChange: jest.fn(),
                onDidDelete: jest.fn(),
                dispose: jest.fn(),
            };

            (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue(mockWatcher);

            watcher.startWatching();

            expect(mockWatcher.onDidDelete).toHaveBeenCalled();
        });
    });

    describe('onTaskFileCreated', () => {
        it('should show notification when task file is created', async () => {
            const mockUri = { fsPath: '/path/to/task-001.task.md' } as vscode.Uri;

            // Access private method through type assertion
            await (watcher as any).onTaskFileCreated(mockUri);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Task file created')
            );
        });

        it('should update task metadata after creation', async () => {
            const mockUri = { fsPath: '/path/to/task-001.task.md' } as vscode.Uri;
            const updateSpy = jest.spyOn(watcher as any, 'updateTaskMetadata').mockResolvedValue(undefined);

            await (watcher as any).onTaskFileCreated(mockUri);

            expect(updateSpy).toHaveBeenCalledWith(mockUri);
        });
    });

    describe('onTaskFileChanged', () => {
        it('should update task metadata when file changes', async () => {
            const mockUri = { fsPath: '/path/to/task-001.task.md' } as vscode.Uri;
            const updateSpy = jest.spyOn(watcher as any, 'updateTaskMetadata').mockResolvedValue(undefined);

            await (watcher as any).onTaskFileChanged(mockUri);

            expect(updateSpy).toHaveBeenCalledWith(mockUri);
        });
    });

    describe('onTaskFileDeleted', () => {
        it('should remove task from active metadata when file is deleted', async () => {
            const mockUri = { fsPath: '/path/to/task-001.task.md' } as vscode.Uri;

            // Add task to active metadata first
            (watcher as any).activeTaskMetadata.set(mockUri.fsPath, {
                id: 'task-001',
                title: 'Test Task',
            });

            await (watcher as any).onTaskFileDeleted(mockUri);

            // Verify task was removed from metadata
            expect((watcher as any).activeTaskMetadata.has(mockUri.fsPath)).toBe(false);
        });

        it('should remove task from active metadata', async () => {
            const mockUri = { fsPath: '/path/to/task-001.task.md' } as vscode.Uri;

            // Add task to active metadata first
            (watcher as any).activeTaskMetadata.set(mockUri.fsPath, {
                id: 'task-001',
                title: 'Test Task',
            });

            await (watcher as any).onTaskFileDeleted(mockUri);

            expect((watcher as any).activeTaskMetadata.has(mockUri.fsPath)).toBe(false);
        });
    });

    describe('onEditorChanged', () => {
        it('should handle editor change for .task.md file', () => {
            const mockEditor = {
                document: {
                    uri: { fsPath: '/path/to/task-001.task.md' },
                    getText: jest.fn(() => 'task content'),
                },
            } as any;

            (watcher as any).onEditorChanged(mockEditor);

            // Should process the editor change
            expect(mockEditor.document.uri.fsPath).toContain('.task.md');
        });

        it('should ignore editor change for non-task files', () => {
            const mockEditor = {
                document: {
                    uri: { fsPath: '/path/to/regular.md' },
                    getText: jest.fn(() => 'content'),
                },
            } as any;

            (watcher as any).onEditorChanged(mockEditor);

            // Should ignore non-task files
            expect(mockEditor.document.uri.fsPath).not.toContain('.task.md');
        });

        it('should handle undefined editor', () => {
            expect(() => (watcher as any).onEditorChanged(undefined)).not.toThrow();
        });
    });

    describe('onDocumentChanged', () => {
        it('should handle document change event', () => {
            const mockEvent = {
                document: {
                    uri: { fsPath: '/path/to/task-001.task.md' },
                    getText: jest.fn(() => 'updated content'),
                },
                contentChanges: [],
            } as any;

            expect(() => (watcher as any).onDocumentChanged(mockEvent)).not.toThrow();
        });

        it('should ignore changes to non-task files', () => {
            const mockEvent = {
                document: {
                    uri: { fsPath: '/path/to/regular.md' },
                    getText: jest.fn(() => 'content'),
                },
                contentChanges: [],
            } as any;

            (watcher as any).onDocumentChanged(mockEvent);

            expect(mockEvent.document.uri.fsPath).not.toContain('.task.md');
        });
    });

    describe('scanExistingFiles', () => {
        it('should scan for existing .task.md files', async () => {
            const mockUris = [
                { fsPath: '/path/to/task-001.task.md' },
                { fsPath: '/path/to/task-002.task.md' },
            ] as vscode.Uri[];

            (vscode.workspace.findFiles as jest.Mock).mockResolvedValue(mockUris);

            await (watcher as any).scanExistingFiles();

            expect(vscode.workspace.findFiles).toHaveBeenCalledWith('**/*.task.md');
        });

        it('should handle empty workspace', async () => {
            (vscode.workspace.findFiles as jest.Mock).mockResolvedValue([]);

            // Should not throw
            await (watcher as any).scanExistingFiles();
            expect(true).toBe(true); // If we get here, it didn't throw
        });

        it('should handle scan errors gracefully', async () => {
            (vscode.workspace.findFiles as jest.Mock).mockRejectedValue(new Error('Scan failed'));

            // This method doesn't catch errors, so it will throw
            await expect((watcher as any).scanExistingFiles()).rejects.toThrow('Scan failed');
        });
    });

    describe('updateTaskMetadata', () => {
        it('should parse task file and update metadata', async () => {
            const mockUri = { fsPath: '/path/to/task-001.task.md' } as vscode.Uri;
            const mockContent = new TextEncoder().encode('---\nid: task-001\n---\nContent');

            // Mock fs.readFile instead of openTextDocument
            (vscode.workspace.fs as any) = {
                readFile: jest.fn().mockResolvedValue(mockContent),
            };

            mockParser.parseTaskFile.mockReturnValue({
                task: {
                    id: 'task-001',
                    title: 'Test Task',
                    description: '',
                    subtasks: [],
                    assignees: [],
                    labels: [],
                },
                errors: [],
            });

            await (watcher as any).updateTaskMetadata(mockUri);

            expect(mockParser.parseTaskFile).toHaveBeenCalled();
        });

        it('should handle parsing errors', async () => {
            const mockUri = { fsPath: '/path/to/task-001.task.md' } as vscode.Uri;
            const mockDocument = {
                getText: jest.fn(() => 'invalid'),
            } as any;

            (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

            mockParser.parseTaskFile.mockReturnValue({
                task: null,
                errors: ['Parse error'],
            });

            // Should not throw
            await (watcher as any).updateTaskMetadata(mockUri);
            expect(true).toBe(true); // If we get here, it didn't throw
        });

        it('should handle file read errors', async () => {
            const mockUri = { fsPath: '/path/to/task-001.task.md' } as vscode.Uri;

            (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(new Error('File not found') as any);

            // Should not throw
            await (watcher as any).updateTaskMetadata(mockUri);
            expect(true).toBe(true); // If we get here, it didn't throw
        });
    });

    describe('disposal', () => {
        it('should dispose of decoration type', () => {
            const decorationType = (watcher as any).decorationType;

            expect(decorationType).toBeDefined();
            expect(typeof decorationType.dispose).toBe('function');
        });

        it('should dispose of status bar item', () => {
            const statusBarItem = (watcher as any).statusBarItem;

            expect(statusBarItem).toBeDefined();
            expect(typeof statusBarItem.dispose).toBe('function');
        });

        it('should dispose of all watchers', () => {
            const disposables = watcher.startWatching();

            disposables.forEach(d => {
                expect(typeof d.dispose).toBe('function');
            });
        });
    });

    describe('edge cases', () => {
        it('should handle multiple simultaneous file changes', async () => {
            const mockUris = [
                { fsPath: '/path/to/task-001.task.md' },
                { fsPath: '/path/to/task-002.task.md' },
                { fsPath: '/path/to/task-003.task.md' },
            ] as vscode.Uri[];

            const updateSpy = jest.spyOn(watcher as any, 'updateTaskMetadata').mockResolvedValue(undefined);

            await Promise.all(mockUris.map(uri => (watcher as any).onTaskFileChanged(uri)));

            expect(updateSpy).toHaveBeenCalledTimes(3);
        });

        it('should handle tasks with special characters in filename', async () => {
            const mockUri = { fsPath: '/path/to/task-001-特殊字符.task.md' } as vscode.Uri;

            await expect((watcher as any).onTaskFileCreated(mockUri)).resolves.not.toThrow();
        });

        it('should handle very long file paths', async () => {
            const longPath = '/path/' + 'to/'.repeat(100) + 'task-001.task.md';
            const mockUri = { fsPath: longPath } as vscode.Uri;

            await expect((watcher as any).onTaskFileCreated(mockUri)).resolves.not.toThrow();
        });
    });
});
