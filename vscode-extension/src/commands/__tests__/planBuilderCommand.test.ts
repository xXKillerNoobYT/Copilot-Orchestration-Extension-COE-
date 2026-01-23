import * as vscode from 'vscode';
import { registerPlanBuilderCommand } from '../planBuilderCommand';

jest.mock('vscode');

describe('planBuilderCommand', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
    } as any;

    (vscode.commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register plan builder command', () => {
      registerPlanBuilderCommand(mockContext);
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'copilot-orchestration.openPlanBuilder',
        expect.any(Function)
      );
    });

    it('should add disposable to context', () => {
      const initialLength = mockContext.subscriptions.length;
      registerPlanBuilderCommand(mockContext);
      expect(mockContext.subscriptions.length).toBeGreaterThan(initialLength);
    });
  });

  describe('Command Execution', () => {
    it('should execute without errors', async () => {
      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      registerPlanBuilderCommand(mockContext);
      if (callbackFn) {
        await expect(callbackFn()).resolves.not.toThrow();
      }
    });
  });
});
