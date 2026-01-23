import * as vscode from 'vscode';
import * as fs from 'fs';
import { exportPlanCommand } from '../exportPlan';

jest.mock('vscode');
jest.mock('fs');

describe('exportPlan Command', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      workspaceState: {
        get: jest.fn().mockReturnValue(null),
        update: jest.fn(),
      },
    } as any;

    (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register export command', () => {
      const disposable = exportPlanCommand(mockContext);
      expect(disposable).toBeDefined();
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestration.exportPlan',
        expect.any(Function)
      );
    });
  });

  describe('Export Format Selection', () => {
    it('should show format selection quick pick', async () => {
      (vscode.commands.registerCommand as jest.Mock).mockImplementation(async (cmd, callback) => {
        await callback();
        return { dispose: jest.fn() };
      });

      exportPlanCommand(mockContext);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(vscode.window.showQuickPick).toHaveBeenCalled();
    });

    it('should support JSON export format', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'JSON' });
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(vscode.Uri.file('/test/plan.json'));

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      exportPlanCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showSaveDialog).toHaveBeenCalled();
    });

    it('should support Markdown export format', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'Markdown' });
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(vscode.Uri.file('/test/plan.md'));

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      exportPlanCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showSaveDialog).toHaveBeenCalled();
    });
  });

  describe('File Operations', () => {
    it('should write export file successfully', async () => {
      const mockPlan = { tasks: [], metadata: {} };
      (mockContext.workspaceState.get as jest.Mock).mockReturnValue(mockPlan);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'JSON' });
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(vscode.Uri.file('/test/plan.json'));
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      exportPlanCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should handle write errors', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'JSON' });
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(vscode.Uri.file('/test/plan.json'));
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      exportPlanCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe('Cancellation Handling', () => {
    it('should handle cancelled format selection', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      exportPlanCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(vscode.window.showSaveDialog).not.toHaveBeenCalled();
    });

    it('should handle cancelled save dialog', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'JSON' });
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(undefined);

      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      exportPlanCommand(mockContext);
      if (callbackFn) await callbackFn();

      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });
  });
});
