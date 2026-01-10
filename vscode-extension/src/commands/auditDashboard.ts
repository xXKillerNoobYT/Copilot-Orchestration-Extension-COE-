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
    () => {
      const panel = AuditDashboardPanel.createOrShow(extensionUri);
      vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
    }
  );

  context.subscriptions.push(disposable);
}
