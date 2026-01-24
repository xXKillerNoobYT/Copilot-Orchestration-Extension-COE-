/**
 * Plan Persistence Service
 * Orchestrates plan save/load operations between UI and MCP backend
 */

import * as vscode from 'vscode';
import { MCPClient } from '../services/mcpClient';
import { showErrorMessage, logError } from '../utils/errorHandler';

export interface SavedPlan {
  id: number;
  name: string;
  description?: string;
  wizard_state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface PlanListItem {
  id: number;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save current wizard state as a plan
 */
export async function savePlan(
  wizardState: Record<string, unknown>,
  planName?: string
): Promise<SavedPlan | null> {
  try {
    const name = planName || await promptForPlanName();
    if (!name) {
      return null; // User cancelled
    }

    const mcpClient = MCPClient.getInstance();
    const response = await mcpClient.savePlan({
      name,
      description: `Plan created on ${new Date().toLocaleString()}`,
      wizard_state: wizardState,
      metadata: {
        createdBy: 'plan-builder',
        version: '1.0',
      },
      status: 'draft',
    });

    if (response.success) {
      vscode.window.showInformationMessage(`✓ Plan "${name}" saved successfully`);
      return response.plan;
    } else {
      throw new Error(response.message || 'Failed to save plan');
    }
  } catch (error) {
    logError(error, 'savePlan');
    showErrorMessage(error, 'Failed to save plan');
    return null;
  }
}

/**
 * Load a saved plan by ID
 */
export async function loadPlan(planId: number): Promise<SavedPlan | null> {
  try {
    const mcpClient = MCPClient.getInstance();
    const response = await mcpClient.loadPlan(planId);

    if (response.success) {
      vscode.window.showInformationMessage(`✓ Plan "${response.plan.name}" loaded successfully`);
      return response.plan;
    } else {
      throw new Error(response.message || 'Failed to load plan');
    }
  } catch (error) {
    logError(error, 'loadPlan', { planId });
    showErrorMessage(error, 'Failed to load plan');
    return null;
  }
}

/**
 * List all available plans
 */
export async function listPlans(status?: string): Promise<PlanListItem[]> {
  try {
    const mcpClient = MCPClient.getInstance();
    const response = await mcpClient.listPlans(status);

    if (response.success) {
      return response.plans;
    } else {
      throw new Error(response.message || 'Failed to list plans');
    }
  } catch (error) {
    logError(error, 'listPlans');
    showErrorMessage(error, 'Failed to load plan list');
    return [];
  }
}

/**
 * Prompt user to select a plan from the list
 */
export async function selectPlanFromList(): Promise<SavedPlan | null> {
  try {
    const plans = await listPlans();
    
    if (plans.length === 0) {
      vscode.window.showInformationMessage('No saved plans found');
      return null;
    }

    const items = plans.map(plan => ({
      label: plan.name,
      description: plan.description || '',
      detail: `Status: ${plan.status} | Last updated: ${new Date(plan.updated_at).toLocaleString()}`,
      planId: plan.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a plan to load',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return null; // User cancelled
    }

    return loadPlan(selected.planId);
  } catch (error) {
    logError(error, 'selectPlanFromList');
    showErrorMessage(error, 'Failed to select plan');
    return null;
  }
}

/**
 * Prompt user for plan name
 */
async function promptForPlanName(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: 'Enter a name for this plan',
    placeHolder: 'My Project Plan',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Plan name cannot be empty';
      }
      if (value.length > 255) {
        return 'Plan name is too long (max 255 characters)';
      }
      return null;
    },
  });
}

/**
 * Delete a saved plan
 */
export async function deletePlan(planId: number): Promise<boolean> {
  try {
    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to delete this plan?',
      { modal: true },
      'Delete'
    );

    if (confirm !== 'Delete') {
      return false;
    }

    // Note: Backend endpoint for delete not yet implemented
    // This is a placeholder for future implementation
    vscode.window.showWarningMessage('Plan deletion not yet implemented');
    return false;
  } catch (error) {
    logError(error, 'deletePlan', { planId });
    showErrorMessage(error, 'Failed to delete plan');
    return false;
  }
}

/**
 * Export plan to JSON file
 */
export async function exportPlanToFile(plan: SavedPlan): Promise<void> {
  try {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${plan.name.replace(/\s+/g, '-')}.json`),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*'],
      },
    });

    if (!uri) {
      return; // User cancelled
    }

    const content = JSON.stringify(plan, null, 2);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    
    vscode.window.showInformationMessage(`✓ Plan exported to ${uri.fsPath}`);
  } catch (error) {
    logError(error, 'exportPlanToFile');
    showErrorMessage(error, 'Failed to export plan');
  }
}
