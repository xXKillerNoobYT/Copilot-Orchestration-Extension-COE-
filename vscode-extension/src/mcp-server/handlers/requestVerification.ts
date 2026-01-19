/**
 * Handler for copilot_orchestrator_request_verification tool
 * Integrates with VerificationService and launches Visual Verification Panel
 */

import { MCPHandlerBase } from './MCPHandlerBase';
import * as vscode from 'vscode';

class RequestVerificationHandler extends MCPHandlerBase {
  /**
   * Create verification request and launch verification panel
   */
  async execute(args: any) {
    const { taskId, verificationType, checklist } = args;

    if (!taskId) {
      return this.formatError('Missing required parameter: taskId');
    }

    return this.executeWithRetry(
      async () => {
        const config = vscode.workspace.getConfiguration('copilot-orchestrator');
        const baseUrl = config.get<string>('mcp.baseUrl', 'http://localhost:8000');
        
        // Create verification request in backend
        const requestData = {
          task_id: taskId,
          verification_type: verificationType || 'visual',
          checklist: checklist || [],
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        };

        const response = await fetch(`${baseUrl}/api/v1/verifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error(`Failed to create verification request: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const verification = data.verification || data;

        // Launch Visual Verification Panel in VS Code
        await this.launchVerificationPanel(taskId, verification);

        // Broadcast WebSocket event to notify UI
        await this.broadcastEvent('verifications', 'verificationRequested', {
          taskId,
          verificationId: verification.id,
          type: verificationType,
          timestamp: new Date().toISOString(),
        });

        // Send VS Code notification
        vscode.window.showInformationMessage(
          `Verification requested for task ${taskId}. Please review in the Verification panel.`,
          'Open Panel'
        ).then(selection => {
          if (selection === 'Open Panel') {
            vscode.commands.executeCommand('copilotOrchestrator.showVerificationPanel', taskId);
          }
        });

        return this.formatSuccess({
          success: true,
          verificationRequest: {
            id: verification.id,
            taskId,
            type: verificationType,
            checklist,
            status: 'pending',
            createdAt: verification.created_at || new Date().toISOString(),
            expiresAt: verification.expires_at,
          },
          message: `Verification request created for task ${taskId}. User will be notified.`,
        });
      },
      'handleRequestVerification',
      args
    );
  }

  /**
   * Launch Visual Verification Panel WebView
   */
  private async launchVerificationPanel(taskId: string, verification: any): Promise<void> {
    try {
      // Execute VS Code command to show verification panel
      await vscode.commands.executeCommand('copilotOrchestrator.showVerificationPanel', {
        taskId,
        verificationId: verification.id,
        verificationType: verification.verification_type,
        checklist: verification.checklist,
      });
    } catch (error) {
      console.warn('[RequestVerification] Failed to launch verification panel:', error);
      // Don't fail the request if panel launch fails
    }
  }
}

// Create singleton instance
const handler = new RequestVerificationHandler();

/**
 * Export handler function for MCP server
 */
export async function handleRequestVerification(args: any) {
  return handler.execute(args);
}
