/**
 * Tests for Open Task List Command
 * Tests task list file access and folder creation
 */

import { openTaskList, registerOpenTaskListCommand } from './openTaskList';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock modules
jest.mock('vscode');
jest.mock('fs/promises');
jest.mock('path');

describe('openTaskList', () => {
  let mockWorkspaceFolder: any;
  const mockWorkspacePath = '/test/workspace';
  const mockZenTasksDir = '/test/workspace/_ZENTASKS';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock workspace folder
    mockWorkspaceFolder = {
      uri: {
        fsPath: mockWorkspacePath
      }
    };

    (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

    // Mock vscode window methods
    (vscode.window.showWarningMessage as jest.Mock) = jest.fn();
    (vscode.window.showInformationMessage as jest.Mock) = jest.fn();
    (vscode.window.showErrorMessage as jest.Mock) = jest.fn();
    (vscode.workspace.openTextDocument as jest.Mock) = jest.fn().mockResolvedValue({});
    (vscode.window.showTextDocument as jest.Mock) = jest.fn();
    (vscode.Uri.file as jest.Mock) = jest.fn((filePath) => ({ fsPath: filePath }));
  });

  describe('Workspace Validation', () => {
    it('should show warning if no workspace folder is open', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      await openTaskList();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No workspace folder open');
    });

    it('should show warning if workspace folders array is empty', async () => {
      (vscode.workspace as any).workspaceFolders = [];

      await openTaskList();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No workspace folder open');
    });
  });

  describe('Opening tasks.json', () => {
    it('should open tasks.json if it exists', async () => {
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // _ZENTASKS exists
        .mockResolvedValueOnce(undefined); // tasks.json exists

      await openTaskList();

      expect(fs.access).toHaveBeenCalledWith(mockZenTasksDir);
      expect(fs.access).toHaveBeenCalledWith(`${mockZenTasksDir}/tasks.json`);
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: `${mockZenTasksDir}/tasks.json` })
      );
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });

    it('should open first .md file if tasks.json does not exist', async () => {
      const mockFiles = ['TASK-001-feature.md', 'TASK-002-bugfix.md', 'README.md'];

      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // _ZENTASKS exists
        .mockRejectedValueOnce(new Error('Not found')); // tasks.json doesn't exist

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

      await openTaskList();

      expect(fs.readdir).toHaveBeenCalledWith(mockZenTasksDir);
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: `${mockZenTasksDir}/TASK-001-feature.md` })
      );
    });

    it('should only open files that start with TASK- and end with .md', async () => {
      const mockFiles = [
        'README.md',
        'notes.md',
        'TASK-001-feature.md',
        'task-lowercase.md',
        'TASK-002.txt'
      ];

      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // _ZENTASKS exists
        .mockRejectedValueOnce(new Error('Not found')); // tasks.json doesn't exist

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

      await openTaskList();

      // Should only find TASK-001-feature.md
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: `${mockZenTasksDir}/TASK-001-feature.md` })
      );
    });

    it('should show message if no task files found', async () => {
      const mockFiles = ['README.md', 'notes.txt'];

      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // _ZENTASKS exists
        .mockRejectedValueOnce(new Error('Not found')); // tasks.json doesn't exist

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

      await openTaskList();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'No task files found in _ZENTASKS folder'
      );
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });
  });

  describe('Folder Creation', () => {
    it('should prompt to create folder if _ZENTASKS does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await openTaskList();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Task folder not found. Create it?',
        'Create Folder',
        'Cancel'
      );
    });

    it('should create _ZENTASKS folder when user confirms', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await openTaskList();

      expect(fs.mkdir).toHaveBeenCalledWith(mockZenTasksDir, { recursive: true });
    });

    it('should create empty tasks.json in new folder', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await openTaskList();

      const expectedContent = JSON.stringify({
        version: '1.0',
        tasks: [],
        metadata: {
          createdAt: expect.any(String),
          description: 'Zen Tasks workflow task list'
        }
      }, null, 2);

      expect(fs.writeFile).toHaveBeenCalledWith(
        `${mockZenTasksDir}/tasks.json`,
        expect.stringContaining('"version": "1.0"'),
        'utf-8'
      );
    });

    it('should open tasks.json after creating folder', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await openTaskList();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        '✓ Created _ZENTASKS folder'
      );
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: `${mockZenTasksDir}/tasks.json` })
      );
    });

    it('should not create folder if user cancels', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Cancel');

      await openTaskList();

      expect(fs.mkdir).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should not create folder if user dismisses dialog', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      await openTaskList();

      expect(fs.mkdir).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors when creating folder', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await openTaskList();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create task folder')
      );
    });

    it('should handle file system errors when writing tasks.json', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

      await openTaskList();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create task folder')
      );
    });

    it('should handle errors when reading directory', async () => {
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // _ZENTASKS exists
        .mockRejectedValueOnce(new Error('Not found')); // tasks.json doesn't exist

      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Cannot read directory'));

      await expect(openTaskList()).rejects.toThrow();
    });

    it('should handle errors when opening document', async () => {
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(
        new Error('Cannot open document')
      );

      await expect(openTaskList()).rejects.toThrow();
    });
  });

  describe('File Opening Logic', () => {
    it('should use vscode.Uri.file to create file URI', async () => {
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await openTaskList();

      expect(vscode.Uri.file).toHaveBeenCalledWith(`${mockZenTasksDir}/tasks.json`);
    });

    it('should open document in editor', async () => {
      const mockDoc = { uri: 'mock-uri' };

      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDoc);

      await openTaskList();

      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe('Task File Filtering', () => {
    it('should correctly filter task files from mixed directory', async () => {
      const mockFiles = [
        'TASK-001-login.md',
        'TASK-002-logout.md',
        'task-not-uppercase.md',
        'README.md',
        'notes.txt',
        '.gitignore',
        'TASK-003-bugfix.md'
      ];

      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Not found'));

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

      await openTaskList();

      // Should open first matching file: TASK-001-login.md
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: `${mockZenTasksDir}/TASK-001-login.md` })
      );
    });

    it('should handle empty directory', async () => {
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Not found'));

      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await openTaskList();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'No task files found in _ZENTASKS folder'
      );
    });
  });

  describe('Created File Content', () => {
    it('should create valid JSON structure', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await openTaskList();

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall[1];

      // Should be valid JSON
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty('version', '1.0');
      expect(parsed).toHaveProperty('tasks');
      expect(parsed.tasks).toEqual([]);
      expect(parsed).toHaveProperty('metadata');
      expect(parsed.metadata).toHaveProperty('createdAt');
      expect(parsed.metadata).toHaveProperty('description');
    });

    it('should include ISO timestamp in created file', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Create Folder');
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await openTaskList();

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      const parsed = JSON.parse(content);

      const timestamp = parsed.metadata.createdAt;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

describe('registerOpenTaskListCommand', () => {
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      subscriptions: []
    };

    (vscode.commands.registerCommand as jest.Mock) = jest.fn((name, handler) => ({
      dispose: jest.fn()
    }));
  });

  it('should register command with correct name', () => {
    registerOpenTaskListCommand(mockContext);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'copilot-orchestrator.openTaskList',
      expect.any(Function)
    );
  });

  it('should add command to context subscriptions', () => {
    registerOpenTaskListCommand(mockContext);

    expect(mockContext.subscriptions.length).toBe(1);
  });

  it('should register command that can be disposed', () => {
    registerOpenTaskListCommand(mockContext);

    const command = mockContext.subscriptions[0];
    expect(command).toHaveProperty('dispose');
    expect(typeof command.dispose).toBe('function');
  });
});
