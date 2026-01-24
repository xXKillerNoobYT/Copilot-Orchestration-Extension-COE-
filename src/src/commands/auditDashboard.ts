/**
 * Audit Dashboard Command
 * 
 * Opens the audit dashboard panel showing drift metrics and compliance status.
 */

import * as vscode from 'vscode';
import { AuditDashboardPanel } from '../panels/auditDashboardPanel';

export function registerAuditDashboardCommand(context: vscode.ExtensionContext, extensionUri: vscode.Uri): void {
  const disposable = vscode.commands.registerCommand(
    'copilot-orchestrator.showAuditDashboard',
    async () => {
      const panel = AuditDashboardPanel.createOrShow(extensionUri);
      try {
        await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
      } catch (error) {
        // Silently handle focus command errors - panel still opens successfully
        console.debug('Failed to focus auxiliary bar:', error);
      }
    }
  );

  context.subscriptions.push(disposable);
}
