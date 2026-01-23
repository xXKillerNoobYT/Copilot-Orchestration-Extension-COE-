import * as vscode from 'vscode';
import { registerOpenTaskListCommand, openTaskList } from '../openTaskList';

jest.mock('vscode');
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  readdir: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

import * as fs from 'fs/promises';

describe('openTaskList Command', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      extensionPath: '/test/extension',
      globalState: {
        get: jest.fn().mockReturnValue([]),
        update: jest.fn(),
      },
    } as any;

    (vscode.workspace.workspaceFolders as any) = [
      { uri: vscode.Uri.file('/test/workspace') }
    ];
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
    (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });
    
    // Mock fs.promises methods with default implementations
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register openTaskList command', () => {
      registerOpenTaskListCommand(mockContext);
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestrator.openTaskList',
        expect.any(Function)
      );
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Task File Operations', () => {
    it('should open tasks.json when it exists', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      await openTaskList();

      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });

    it('should open first task markdown file when tasks.json does not exist', async () => {
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // _ZENTASKS exists
        .mockRejectedValueOnce(new Error('ENOENT')); // tasks.json doesn't exist
      (fs.readdir as jest.Mock).mockResolvedValue(['TASK-001.md', 'TASK-002.md'] as any);

      await openTaskList();

      expect(fs.readdir).toHaveBeenCalled();
      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
    });
  });

  describe('Folder Creation', () => {
    it('should create _ZENTASKS folder when it does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');

      await openTaskList();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Task folder not found'),
        'Create Folder',
        'Cancel'
      );
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should show message when no task files found', async () => {
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // _ZENTASKS exists
        .mockRejectedValueOnce(new Error('ENOENT')); // tasks.json doesn't exist
      (fs.readdir as jest.Mock).mockResolvedValue([] as any);

      await openTaskList();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('No task files found')
      );
    });
  });

  describe('Error Handling', () => {
    it('should show warning when no workspace folder is open', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      await openTaskList();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No workspace folder open');
    });

    it('should handle cancellation of folder creation', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Cancel');

      await openTaskList();

      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it('should handle errors during folder creation', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await openTaskList();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create task folder')
      );
    });
  });

  describe('Task File Filtering', () => {
    it('should only open markdown files starting with TASK-', async () => {
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // _ZENTASKS exists
        .mockRejectedValueOnce(new Error('ENOENT')); // tasks.json doesn't exist
      (fs.readdir as jest.Mock).mockResolvedValue([
        'README.md',
        'TASK-001.md',
        'notes.txt',
        'TASK-002.md'
      ] as any);

      await openTaskList();

      // Should open the first TASK-*.md file
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          fsPath: expect.stringContaining('TASK-001.md')
        })
      );
    });
  });
});
