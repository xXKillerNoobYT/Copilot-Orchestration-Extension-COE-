import * as vscode from 'vscode';
import * as fs from 'fs';
import { registerMCPConfigCommands } from '../mcpConfigCommands';

jest.mock('vscode');
jest.mock('fs');

describe('MCP Config Commands', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    (vscode.workspace.workspaceFolders as any) = [
      { uri: vscode.Uri.file('/test/workspace') }
    ];
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);
    (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
    (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register all MCP config commands', () => {
      registerMCPConfigCommands(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        expect.stringContaining('mcp'),
        expect.any(Function)
      );
    });

    it('should add all disposables to context', () => {
      const initialLength = mockContext.subscriptions.length;
      registerMCPConfigCommands(mockContext);
      expect(mockContext.subscriptions.length).toBeGreaterThan(initialLength);
    });
  });

  describe('Config File Operations', () => {
    it('should create MCP config file if not exists', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd.includes('openMCPConfig')) {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should open existing MCP config file', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd.includes('openMCPConfig')) {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
    });
  });

  describe('Config Validation', () => {
    it('should validate MCP config structure', async () => {
      const validConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js']
          }
        }
      };

      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(validConfig));

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd.includes('validateMCPConfig')) {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('valid')
      );
    });

    it('should detect invalid MCP config', async () => {
      const invalidConfig = { invalid: 'structure' };

      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidConfig));

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd.includes('validateMCPConfig')) {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe('Server Management', () => {
    it('should add new MCP server', async () => {
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('new-server')
        .mockResolvedValueOnce('node')
        .mockResolvedValueOnce('server.js');

      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ mcpServers: {} }));
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd.includes('addMCPServer')) {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should handle cancellation when adding server', async () => {
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd.includes('addMCPServer')) {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing workspace', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd.includes('openMCPConfig')) {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('workspace')
      );
    });

    it('should handle file system errors', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd.includes('openMCPConfig')) {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });
});
