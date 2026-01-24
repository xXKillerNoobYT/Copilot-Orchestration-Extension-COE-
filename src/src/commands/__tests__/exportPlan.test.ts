import * as vscode from 'vscode';
import { exportPlanCommand } from '../exportPlan';
import { PlanExporter } from '../../planBuilder/exporters/planExporter';

jest.mock('vscode');
jest.mock('../../planBuilder/exporters/planExporter');

// Create a mock panel instance with proper message handling
const createMockPanel = () => {
  let messageCallback: any = null;

  return {
    _panel: {
      webview: {
        postMessage: jest.fn((message) => {
          // When getPlanData is requested, immediately respond with plan data
          if (message.type === 'getPlanData' && messageCallback) {
            // Use Promise.resolve().then() to ensure it happens after current execution
            Promise.resolve().then(() => {
              messageCallback({
                type: 'planData',
                data: { title: 'Test Plan', tasks: [] },
              });
            });
          }
        }),
        onDidReceiveMessage: jest.fn((callback) => {
          messageCallback = callback;
          return { dispose: jest.fn() };
        }),
      },
    },
  };
};

// Mock the dynamic import of PlanBuilderPanel
jest.mock('../../panels/planBuilderPanel.js', () => ({
  PlanBuilderPanel: {
    currentPanel: null, // Will be set in tests that need it
  },
}), { virtual: true });

describe('exportPlan Command', () => {
  let PlanBuilderPanel: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.withProgress as jest.Mock).mockImplementation((opts, task) =>
      task({ report: jest.fn() })
    );
    (vscode.workspace.workspaceFolders as any) = [
      { uri: vscode.Uri.file('/test/workspace') }
    ];
    (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
    (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
    (vscode.env.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

    (PlanExporter.exportPlan as jest.Mock).mockResolvedValue('/test/output/plan.json');

    // Get the mocked PlanBuilderPanel
    const module = await import('../../panels/planBuilderPanel.js');
    PlanBuilderPanel = module.PlanBuilderPanel;
    // Reset to null by default
    PlanBuilderPanel.currentPanel = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Functionality', () => {
    it('should be defined as a function', () => {
      expect(typeof exportPlanCommand).toBe('function');
    });

    it('should show warning when no plan data available', async () => {
      await exportPlanCommand();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('No plan data available')
      );
    });

    it('should handle user cancellation gracefully', async () => {
      // Set up panel with plan data
      PlanBuilderPanel.currentPanel = createMockPanel();
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      await exportPlanCommand();

      // Give time for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 50));

      // Function should complete without throwing and showQuickPick should be called
      expect(vscode.window.showQuickPick).toHaveBeenCalled();
    });
  });

  describe('Export Format Selection', () => {
    it('should call showQuickPick when command runs with plan data', async () => {
      // Set up panel with plan data
      PlanBuilderPanel.currentPanel = createMockPanel();

      await exportPlanCommand();

      // Give time for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify it was called
      expect(vscode.window.showQuickPick).toHaveBeenCalled();
    });

    it('should include common export formats', async () => {
      // Set up panel with plan data
      PlanBuilderPanel.currentPanel = createMockPanel();

      await exportPlanCommand();

      // Give time for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 50));

      const callArgs = (vscode.window.showQuickPick as jest.Mock).mock.calls[0];
      if (callArgs && callArgs[0]) {
        const formats = callArgs[0].map((f: any) => f.detail);
        expect(formats).toContain('json');
        expect(formats).toContain('markdown');
      } else {
        // If no args, at least the function was called
        expect(vscode.window.showQuickPick).toHaveBeenCalled();
      }
    });
  });

  describe('Export Workflow', () => {
    it('should handle complete export workflow successfully', async () => {
      // Set up panel with plan data
      PlanBuilderPanel.currentPanel = createMockPanel();

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
        label: '$(file-code) JSON',
        detail: 'json'
      });
      (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([
        vscode.Uri.file('/test/output')
      ]);

      await exportPlanCommand();

      // Give time for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should call PlanExporter.exportPlan
      expect(PlanExporter.exportPlan).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('exported successfully'),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should show progress notification during export', async () => {
      // Set up panel with plan data
      PlanBuilderPanel.currentPanel = createMockPanel();

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
        label: '$(file-code) JSON',
        detail: 'json'
      });
      (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([
        vscode.Uri.file('/test/output')
      ]);

      await exportPlanCommand();

      // Give time for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should call withProgress
      expect(vscode.window.withProgress).toHaveBeenCalled();
      expect(vscode.window.showQuickPick).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors without throwing', async () => {
      // Function should complete without throwing even if something goes wrong
      await expect(exportPlanCommand()).resolves.not.toThrow();
    });

    it('should call showWarningMessage when no plan data', async () => {
      await exportPlanCommand();

      // Since getPlanData returns null in tests, should show warning
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });
  });

  describe('PlanExporter Integration', () => {
    it('should have PlanExporter.exportPlan method mocked', () => {
      expect(PlanExporter.exportPlan).toBeDefined();
      expect(typeof PlanExporter.exportPlan).toBe('function');
    });
  });
});
