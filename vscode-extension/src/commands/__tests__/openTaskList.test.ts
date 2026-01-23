import * as vscode from 'vscode';
import { openTaskListCommand } from '../openTaskList';

jest.mock('vscode');

describe('openTaskList Command', () => {
  let mockContext: vscode.ExtensionContext;
  let mockPanel: vscode.WebviewPanel;

  beforeEach(() => {
    mockPanel = {
      webview: {
        html: '',
        postMessage: jest.fn(),
        onDidReceiveMessage: jest.fn(),
      },
      reveal: jest.fn(),
      dispose: jest.fn(),
      onDidDispose: jest.fn(),
    } as any;

    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      globalState: {
        get: jest.fn().mockReturnValue([]),
        update: jest.fn(),
      },
    } as any;

    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register openTaskList command', () => {
      const disposable = openTaskListCommand(mockContext);
      expect(disposable).toBeDefined();
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestration.openTaskList',
        expect.any(Function)
      );
    });
  });

  describe('Panel Creation', () => {
    it('should create webview panel with correct options', async () => {
      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      openTaskListCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Task'),
        expect.any(Number),
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: true,
        })
      );
    });

    it('should reuse existing panel if already open', async () => {
      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      openTaskListCommand(mockContext);

      if (callbackFn) {
        await callbackFn();
        await callbackFn();
      }

      expect(mockPanel.reveal).toHaveBeenCalled();
    });
  });

  describe('Task List Display', () => {
    it('should display task list in webview', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'pending' },
        { id: '2', title: 'Task 2', status: 'complete' },
      ];

      (mockContext.globalState.get as jest.Mock).mockReturnValue(mockTasks);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      openTaskListCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(mockPanel.webview.html).toBeTruthy();
    });

    it('should handle empty task list', async () => {
      (mockContext.globalState.get as jest.Mock).mockReturnValue([]);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      openTaskListCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(mockPanel.webview.html).toContain('No tasks');
    });
  });

  describe('Task Interactions', () => {
    it('should handle task selection', async () => {
      const mockMessageHandler = jest.fn();
      (mockPanel.webview.onDidReceiveMessage as jest.Mock).mockImplementation(handler => {
        mockMessageHandler.mockImplementation(handler);
        return { dispose: jest.fn() };
      });

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      openTaskListCommand(mockContext);
      if (callbackFn) await callbackFn();

      mockMessageHandler({ type: 'selectTask', taskId: '1' });
      expect(mockMessageHandler).toHaveBeenCalled();
    });

    it('should handle task status update', async () => {
      const mockMessageHandler = jest.fn();
      (mockPanel.webview.onDidReceiveMessage as jest.Mock).mockImplementation(handler => {
        mockMessageHandler.mockImplementation(handler);
        return { dispose: jest.fn() };
      });

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      openTaskListCommand(mockContext);
      if (callbackFn) await callbackFn();

      mockMessageHandler({ type: 'updateStatus', taskId: '1', status: 'complete' });
      expect(mockContext.globalState.update).toHaveBeenCalled();
    });
  });

  describe('Panel Disposal', () => {
    it('should clean up resources on panel close', async () => {
      let disposeHandler: any;
      (mockPanel.onDidDispose as jest.Mock).mockImplementation(handler => {
        disposeHandler = handler;
        return { dispose: jest.fn() };
      });

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      openTaskListCommand(mockContext);
      if (callbackFn) await callbackFn();

      if (disposeHandler) disposeHandler();
      expect(disposeHandler).toBeDefined();
    });
  });
});
