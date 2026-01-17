/**
 * Plan Adjustment Commands
 * 
 * VS Code commands for the Plan Adjustment Workflow (EPIC-008):
 * - Detect plan drift on demand
 * - Open plan adjustment wizard
 * - Show plan diff viewer
 * - Apply plan adjustments with one-click
 */

import * as vscode from 'vscode';
import { getPlanAdjustmentService } from '../services/planAdjustmentService';
import { PlanAdjustmentWizard } from '../panels/planAdjustmentWizard';
import { getPlanPersistenceService } from '../services/planPersistence';

/**
 * Command: Detect Plan Drift
 * Analyzes a plan file for drift between planned and actual execution
 */
export function registerDetectPlanDriftCommand(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'copilot-orchestrator.detectPlanDrift',
    async () => {
      try {
        // List available plans
        const persistenceService = getPlanPersistenceService();
        const plans = await persistenceService.listPlans();

        if (plans.length === 0) {
          vscode.window.showWarningMessage('No plans found in workspace');
          return;
        }

        // Let user select a plan
        const selectedPlan = await vscode.window.showQuickPick(
          plans.map(p => ({
            label: p.filename,
            description: `Version ${p.version}`,
            detail: `Updated: ${new Date(p.updated_at).toLocaleDateString()}`,
            filename: p.filename,
          })),
          {
            placeHolder: 'Select a plan to analyze for drift',
          }
        );

        if (!selectedPlan) {
          return;
        }

        // Show progress
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing plan drift...',
            cancellable: false,
          },
          async (progress) => {
            progress.report({ increment: 0, message: 'Loading plan...' });

            const service = getPlanAdjustmentService();
            
            progress.report({ increment: 30, message: 'Fetching execution data...' });
            
            const result = await service.adjustPlan(selectedPlan.filename, {
              autoApply: false,
              notifyUser: false,
            });

            progress.report({ increment: 70, message: 'Analyzing drift...' });

            if (!result.success) {
              vscode.window.showErrorMessage(`Drift detection failed: ${result.error}`);
              return;
            }

            // Show results
            const driftMetrics = result.driftAnalysis.metrics;
            const severity = driftMetrics.driftSeverity;
            const score = driftMetrics.overallDriftScore.toFixed(1);

            if (!result.driftAnalysis.hasDrift) {
              vscode.window.showInformationMessage(
                `✅ No significant drift detected (${score}% drift score)`
              );
              return;
            }

            // Show drift details
            const message = `Plan drift detected: ${severity} severity (${score}% score)\n` +
              `Scope drift: ${driftMetrics.scopeDrift.driftPercentage.toFixed(1)}%\n` +
              `Timeline: ${driftMetrics.timelineDrift.daysBehindSchedule} days behind\n` +
              `${result.suggestions.length} adjustment suggestions available`;

            const action = await vscode.window.showWarningMessage(
              message,
              'View Suggestions',
              'Open Diff',
              'Dismiss'
            );

            if (action === 'View Suggestions') {
              vscode.commands.executeCommand('copilot-orchestrator.openPlanAdjustmentWizard');
            } else if (action === 'Open Diff') {
              vscode.commands.executeCommand('copilot-orchestrator.showPlanDiff');
            }
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to detect drift: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Command: Show Plan Diff Viewer
 * Opens a side-by-side diff view of plan vs actual execution
 */
export function registerShowPlanDiffCommand(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'copilot-orchestrator.showPlanDiff',
    async () => {
      try {
        // List available plans
        const persistenceService = getPlanPersistenceService();
        const plans = await persistenceService.listPlans();

        if (plans.length === 0) {
          vscode.window.showWarningMessage('No plans found in workspace');
          return;
        }

        // Let user select a plan
        const selectedPlan = await vscode.window.showQuickPick(
          plans.map(p => ({
            label: p.filename,
            description: `Version ${p.version}`,
            filename: p.filename,
          })),
          {
            placeHolder: 'Select a plan to view diff',
          }
        );

        if (!selectedPlan) {
          return;
        }

        const service = getPlanAdjustmentService();
        const result = await service.adjustPlan(selectedPlan.filename, { autoApply: false });

        if (!result.success) {
          vscode.window.showErrorMessage(`Failed to generate diff: ${result.error}`);
          return;
        }

        // Show diff in webview
        // For now, show a notification (actual implementation would use PlanDiffViewer.vue)
        vscode.window.showInformationMessage(
          `Drift Score: ${result.driftAnalysis.metrics.overallDriftScore.toFixed(1)}%\n` +
          `Suggestions: ${result.suggestions.length}`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to show diff: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Command: Apply Plan Adjustment
 * One-click application of selected adjustment with version bumping
 */
export function registerApplyPlanAdjustmentCommand(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'copilot-orchestrator.applyPlanAdjustment',
    async () => {
      try {
        // List available plans
        const persistenceService = getPlanPersistenceService();
        const plans = await persistenceService.listPlans();

        if (plans.length === 0) {
          vscode.window.showWarningMessage('No plans found in workspace');
          return;
        }

        // Let user select a plan
        const selectedPlan = await vscode.window.showQuickPick(
          plans.map(p => ({
            label: p.filename,
            description: `Version ${p.version}`,
            filename: p.filename,
          })),
          {
            placeHolder: 'Select a plan to adjust',
          }
        );

        if (!selectedPlan) {
          return;
        }

        const service = getPlanAdjustmentService();
        const result = await service.adjustPlan(selectedPlan.filename, { autoApply: false });

        if (!result.success) {
          vscode.window.showErrorMessage(`Failed to analyze plan: ${result.error}`);
          return;
        }

        if (result.suggestions.length === 0) {
          vscode.window.showInformationMessage('No adjustments needed - plan is up to date');
          return;
        }

        // Let user select which suggestions to apply
        const selectedSuggestions = await vscode.window.showQuickPick(
          result.suggestions.map(s => ({
            label: s.title,
            description: `${s.impact} impact`,
            detail: s.description,
            picked: true, // Auto-select by default
            suggestion: s,
          })),
          {
            placeHolder: 'Select adjustments to apply',
            canPickMany: true,
          }
        );

        if (!selectedSuggestions || selectedSuggestions.length === 0) {
          return;
        }

        // Confirm before applying
        const confirmation = await vscode.window.showWarningMessage(
          `Apply ${selectedSuggestions.length} adjustment(s)? This will update the plan and bump the version.`,
          { modal: true },
          'Apply',
          'Cancel'
        );

        if (confirmation !== 'Apply') {
          return;
        }

        // Apply each suggestion
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Applying plan adjustments...',
            cancellable: false,
          },
          async (progress) => {
            let successCount = 0;

            for (let i = 0; i < selectedSuggestions.length; i++) {
              const { suggestion } = selectedSuggestions[i];
              progress.report({
                increment: (100 / selectedSuggestions.length),
                message: `Applying: ${suggestion.title}`,
              });

              const applyResult = await service.applyAdjustment(
                selectedPlan.filename,
                suggestion,
                {
                  createBackup: true,
                  notifyUser: false,
                }
              );

              if (applyResult.success) {
                successCount++;
              }
            }

            vscode.window.showInformationMessage(
              `✅ Applied ${successCount}/${selectedSuggestions.length} adjustments successfully`
            );
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to apply adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Register all plan adjustment commands
 */
export function registerPlanAdjustmentCommands(context: vscode.ExtensionContext): void {
  registerDetectPlanDriftCommand(context);
  registerShowPlanDiffCommand(context);
  registerApplyPlanAdjustmentCommand(context);
}
