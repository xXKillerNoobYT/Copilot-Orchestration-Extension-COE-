import * as vscode from 'vscode';
import { PlanBuilderPanel } from '../panels/planBuilderPanel';

/**
 * Register the Plan Builder command
 */
export function registerPlanBuilderCommand(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'copilot-orchestrator.startPlanBuilder',
    () => {
      PlanBuilderPanel.createOrShow(context.extensionUri);
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Add Plan Builder to command palette
 */
export function getPlanBuilderCommandContribution(): object {
  return {
    command: 'copilot-orchestrator.startPlanBuilder',
    title: 'Copilot Orchestrator: Start Interactive Plan Builder',
    category: 'Copilot Orchestrator',
    icon: '$(lightbulb)'
  };
}
