/**
 * Handler for copilot_orchestrator_request_verification tool
 * Integrates with VerificationService to create verification requests
 * Note: VS Code UI integration happens on the extension side, not in MCP server
 */

import { MCPHandlerBase } from './MCPHandlerBase';

class RequestVerificationHandler extends MCPHandlerBase {
  /**
   * Create verification request in backend
   */
  async execute(args: any) {
    const { taskId, verificationType, checklist } = args;

    if (!taskId) {
      return this.formatError('Missing required parameter: taskId');
    }

    try {
      return await this.executeWithRetry(
        async () => {
          const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:8000';

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
            message: `Verification request created for task ${taskId}. User will be notified via WebSocket event.`,
            note: 'VS Code extension will receive WebSocket notification and launch verification panel.',
          });
        },
        'handleRequestVerification',
        args
      );
    } catch (error) {
      return this.formatError(error as Error);
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

