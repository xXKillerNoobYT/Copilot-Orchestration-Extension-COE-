import * as vscode from 'vscode';
import * as fs from 'fs';
import { registerMCPConfigCommands } from '../mcpConfigCommands';

jest.mock('vscode');
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('MCP Config Commands', () => {
  let mockContext: vscode.ExtensionContext;
  const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

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
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
    (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});
    (vscode.window.createTerminal as jest.Mock).mockReturnValue({
      show: jest.fn(),
      sendText: jest.fn(),
      dispose: jest.fn(),
    });
    (vscode.env.clipboard.writeText as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue({
      extensionPath: '/test/extension',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register all MCP config commands', () => {
      registerMCPConfigCommands(mockContext);

      // Verify specific command registrations
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestrator.copyMCPServerPath',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestrator.generateMCPConfig',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestrator.testMCPServer',
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
    it('should copy MCP server path to clipboard', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (vscode.env.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd === 'copilot-orchestrator.copyMCPServerPath') {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.env.clipboard.writeText).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should generate MCP config and copy to clipboard', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (vscode.env.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd === 'copilot-orchestrator.generateMCPConfig') {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.env.clipboard.writeText).toHaveBeenCalled();
      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
    });
  });

  describe('Server Testing', () => {
    it('should create terminal to test MCP server', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const mockTerminal = {
        show: jest.fn(),
        sendText: jest.fn(),
        dispose: jest.fn(),
      };
      (vscode.window.createTerminal as jest.Mock).mockReturnValue(mockTerminal);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd === 'copilot-orchestrator.testMCPServer') {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.createTerminal).toHaveBeenCalledWith('MCP Server Test');
      expect(mockTerminal.show).toHaveBeenCalled();
      expect(mockTerminal.sendText).toHaveBeenCalled();
    });

    it('should show error if extension not found', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd === 'copilot-orchestrator.testMCPServer') {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Extension not found');
    });
  });

  describe('Extension Detection', () => {
    it('should handle missing extension', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd === 'copilot-orchestrator.copyMCPServerPath') {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Extension not found');
    });

    it('should handle missing MCP server binary', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd === 'copilot-orchestrator.copyMCPServerPath') {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during copy operation', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (vscode.env.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd === 'copilot-orchestrator.copyMCPServerPath') {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to copy path')
      );
    });

    it('should handle errors during config generation', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (vscode.env.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        if (cmd === 'copilot-orchestrator.generateMCPConfig') {
          callbackFn = callback;
        }
        return { dispose: jest.fn() };
      });

      registerMCPConfigCommands(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate config')
      );
    });
  });
});
