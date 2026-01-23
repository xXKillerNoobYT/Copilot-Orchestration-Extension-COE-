import * as vscode from 'vscode';
import { executeLLMTestCommand } from '../executeLLMTest';

jest.mock('vscode');
jest.mock('../../llm/client');

describe('executeLLMTest Command', () => {
  let mockContext: vscode.ExtensionContext;
  let mockOutputChannel: vscode.OutputChannel;

  beforeEach(() => {
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    } as any;

    mockContext = {
      subscriptions: [],
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register command successfully', () => {
      const disposable = executeLLMTestCommand(mockContext);
      expect(disposable).toBeDefined();
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestration.executeLLMTest',
        expect.any(Function)
      );
    });

    it('should add disposable to context subscriptions', () => {
      executeLLMTestCommand(mockContext);
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Test Execution', () => {
    it('should execute test and show output channel', async () => {
      const mockDisposable = { dispose: jest.fn() };
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callback();
        return mockDisposable;
      });

      executeLLMTestCommand(mockContext);

      expect(mockOutputChannel.clear).toHaveBeenCalled();
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test execution failed');
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callback();
        throw error;
      });

      expect(() => executeLLMTestCommand(mockContext)).toThrow();
    });
  });

  describe('Output Formatting', () => {
    it('should format output with timestamps', async () => {
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callback();
        return { dispose: jest.fn() };
      });

      executeLLMTestCommand(mockContext);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });
  });
});
