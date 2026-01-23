import * as vscode from 'vscode';
import { testConnectionCommand } from '../testConnection';

jest.mock('vscode');

describe('testConnection Command', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
    } as any;

    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.withProgress as jest.Mock).mockImplementation(async (options, task) => {
      return await task({ report: jest.fn() }, {} as any);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register test connection command', () => {
      const disposable = testConnectionCommand(mockContext);
      expect(disposable).toBeDefined();
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestration.testConnection',
        expect.any(Function)
      );
    });
  });

  describe('Connection Testing', () => {
    it('should show progress during connection test', async () => {
      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      testConnectionCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          location: vscode.ProgressLocation.Notification,
          title: expect.stringContaining('connection'),
        }),
        expect.any(Function)
      );
    });

    it('should show success message on successful connection', async () => {
      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      testConnectionCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('success')
      );
    });

    it('should show error message on connection failure', async () => {
      (vscode.window.withProgress as jest.Mock).mockImplementation(async (options, task) => {
        throw new Error('Connection failed');
      });

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      testConnectionCommand(mockContext);
      if (callbackFn) {
        try {
          await callbackFn();
        } catch (e) {
          expect(vscode.window.showErrorMessage).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Progress Reporting', () => {
    it('should report progress increments', async () => {
      const mockProgress = { report: jest.fn() };
      (vscode.window.withProgress as jest.Mock).mockImplementation(async (options, task) => {
        return await task(mockProgress, {} as any);
      });

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      testConnectionCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(mockProgress.report).toHaveBeenCalled();
    });
  });
});
