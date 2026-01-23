import * as vscode from 'vscode';
import { registerPlanBuilderCommand, getPlanBuilderCommandContribution } from '../planBuilderCommand';
import { PlanBuilderPanel } from '../../panels/planBuilderPanel';

jest.mock('vscode');
jest.mock('../../panels/planBuilderPanel', () => ({
  PlanBuilderPanel: {
    createOrShow: jest.fn(),
  },
}));

describe('planBuilderCommand', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      extensionPath: '/test/extension',
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
        'copilot-orchestrator.startPlanBuilder',
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
    it('should execute without errors and call PlanBuilderPanel', async () => {
      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      registerPlanBuilderCommand(mockContext);

      if (callbackFn) {
        await callbackFn();
        expect(PlanBuilderPanel.createOrShow).toHaveBeenCalledWith(mockContext.extensionUri);
      }
    });

    it('should handle panel creation', () => {
      let callbackFn: any;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, callback) => {
        callbackFn = callback;
        return { dispose: jest.fn() };
      });

      registerPlanBuilderCommand(mockContext);

      if (callbackFn) {
        callbackFn();
        expect(PlanBuilderPanel.createOrShow).toHaveBeenCalled();
      }
    });
  });

  describe('Command Contribution', () => {
    it('should return valid command contribution', () => {
      const contribution = getPlanBuilderCommandContribution();

      expect(contribution).toBeDefined();
      expect(contribution).toHaveProperty('command', 'copilot-orchestrator.startPlanBuilder');
      expect(contribution).toHaveProperty('title');
      expect(contribution).toHaveProperty('category');
    });

    it('should include proper command metadata', () => {
      const contribution = getPlanBuilderCommandContribution() as any;

      expect(contribution.command).toBe('copilot-orchestrator.startPlanBuilder');
      expect(contribution.title).toContain('Plan Builder');
      expect(contribution.category).toBe('Copilot Orchestrator');
    });
  });
});
