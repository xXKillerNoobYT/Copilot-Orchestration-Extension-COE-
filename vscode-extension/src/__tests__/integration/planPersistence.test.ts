/**
 * Integration Tests for Plan Persistence
 * Tests the full flow: wizard state → MCP save → MCP load → wizard state
 */

import { MCPClient } from '../../services/mcpClient';
import { savePlan, loadPlan, listPlans } from '../../planBuilder/planPersistence';

// Mock VS Code API
jest.mock('vscode', () => ({
  window: {
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    openTextDocument: jest.fn(),
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path })),
  },
}));

// Mock MCP Client
jest.mock('../../services/mcpClient');

describe('Plan Persistence Integration Tests', () => {
  let mockMcpClient: jest.Mocked<MCPClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockMcpClient = {
      savePlan: jest.fn(),
      loadPlan: jest.fn(),
      listPlans: jest.fn(),
    } as any;

    (MCPClient.getInstance as jest.Mock).mockReturnValue(mockMcpClient);
  });

  describe('savePlan', () => {
    it('should save wizard state to MCP successfully', async () => {
      const wizardState = {
        project_name: 'Test Project',
        project_category: 'web_app',
        project_scale: 'medium',
      };

      const savedPlan = {
        id: 1,
        name: 'Test Project Plan',
        wizard_state: wizardState,
        status: 'draft',
        created_at: '2026-01-10T00:00:00.000Z',
        updated_at: '2026-01-10T00:00:00.000Z',
      };

      mockMcpClient.savePlan.mockResolvedValue({
        success: true,
        plan: savedPlan,
      });

      const vscode = require('vscode');
      vscode.window.showInputBox.mockResolvedValue('Test Project Plan');

      const result = await savePlan(wizardState);

      expect(result).toEqual(savedPlan);
      expect(mockMcpClient.savePlan).toHaveBeenCalledWith({
        name: 'Test Project Plan',
        description: expect.stringContaining('Plan created on'),
        wizard_state: wizardState,
        metadata: {
          createdBy: 'plan-builder',
          version: '1.0',
        },
        status: 'draft',
      });
    });

    it('should handle save errors gracefully', async () => {
      mockMcpClient.savePlan.mockRejectedValue(new Error('Network error'));

      const vscode = require('vscode');
      vscode.window.showInputBox.mockResolvedValue('Test Plan');

      const result = await savePlan({ project_name: 'Test' });

      expect(result).toBeNull();
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('should return null if user cancels name prompt', async () => {
      const vscode = require('vscode');
      vscode.window.showInputBox.mockResolvedValue(undefined);

      const result = await savePlan({ project_name: 'Test' });

      expect(result).toBeNull();
      expect(mockMcpClient.savePlan).not.toHaveBeenCalled();
    });
  });

  describe('loadPlan', () => {
    it('should load plan from MCP successfully', async () => {
      const plan = {
        id: 1,
        name: 'Existing Plan',
        wizard_state: {
          project_name: 'Existing Project',
          project_scale: 'large',
        },
        status: 'active',
        created_at: '2026-01-10T00:00:00.000Z',
        updated_at: '2026-01-10T00:00:00.000Z',
      };

      mockMcpClient.loadPlan.mockResolvedValue({
        success: true,
        plan,
      });

      const result = await loadPlan(1);

      expect(result).toEqual(plan);
      expect(mockMcpClient.loadPlan).toHaveBeenCalledWith(1);
    });

    it('should handle load errors gracefully', async () => {
      mockMcpClient.loadPlan.mockRejectedValue(new Error('Plan not found'));

      const result = await loadPlan(999);

      expect(result).toBeNull();
    });
  });

  describe('listPlans', () => {
    it('should list all plans successfully', async () => {
      const plans = [
        { id: 1, name: 'Plan 1', status: 'draft', created_at: '2026-01-10', updated_at: '2026-01-10' },
        { id: 2, name: 'Plan 2', status: 'active', created_at: '2026-01-10', updated_at: '2026-01-10' },
      ];

      mockMcpClient.listPlans.mockResolvedValue({
        success: true,
        plans,
        count: 2,
      });

      const result = await listPlans();

      expect(result).toEqual(plans);
      expect(mockMcpClient.listPlans).toHaveBeenCalledWith(undefined);
    });

    it('should filter plans by status', async () => {
      const activePlans = [
        { id: 2, name: 'Plan 2', status: 'active', created_at: '2026-01-10', updated_at: '2026-01-10' },
      ];

      mockMcpClient.listPlans.mockResolvedValue({
        success: true,
        plans: activePlans,
        count: 1,
      });

      const result = await listPlans('active');

      expect(result).toEqual(activePlans);
      expect(mockMcpClient.listPlans).toHaveBeenCalledWith('active');
    });

    it('should return empty array on error', async () => {
      mockMcpClient.listPlans.mockRejectedValue(new Error('Server error'));

      const result = await listPlans();

      expect(result).toEqual([]);
    });
  });

  describe('Full Save/Load Cycle', () => {
    it('should persist and restore wizard state correctly', async () => {
      const originalWizardState = {
        project_name: 'Integration Test Project',
        project_category: 'web_app',
        project_scale: 'medium',
        project_theme_primary_color: '#0066cc',
        project_integrations: ['auth', 'database'],
      };

      const savedPlan = {
        id: 42,
        name: 'Integration Test Plan',
        wizard_state: originalWizardState,
        status: 'draft' as const,
        created_at: '2026-01-10T00:00:00.000Z',
        updated_at: '2026-01-10T00:00:00.000Z',
      };

      // Mock save
      mockMcpClient.savePlan.mockResolvedValue({
        success: true,
        plan: savedPlan,
      });

      // Mock load
      mockMcpClient.loadPlan.mockResolvedValue({
        success: true,
        plan: savedPlan,
      });

      const vscode = require('vscode');
      vscode.window.showInputBox.mockResolvedValue('Integration Test Plan');

      // Save
      const saved = await savePlan(originalWizardState);
      expect(saved).toBeTruthy();
      expect(saved?.id).toBe(42);

      // Load
      const loaded = await loadPlan(42);
      expect(loaded).toBeTruthy();
      expect(loaded?.wizard_state).toEqual(originalWizardState);

      // Verify wizard state matches
      expect(loaded?.wizard_state.project_name).toBe(originalWizardState.project_name);
      expect(loaded?.wizard_state.project_integrations).toEqual(originalWizardState.project_integrations);
    });
  });
});
