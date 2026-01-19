/**
 * Handler for copilot_orchestrator_ask_user_question tool
 * Creates question in backend database for VS Code extension to handle
 * Note: User interaction happens via VS Code extension, not directly in MCP server
 */

import { MCPHandlerBase } from './MCPHandlerBase';

class AskUserQuestionHandler extends MCPHandlerBase {
  /**
   * Create question request in backend database
   */
  async execute(args: any) {
    const { question, context, timeout = 300 } = args;

    if (!question) {
      return this.formatError('Missing required parameter: question');
    }

    return this.executeWithRetry(
      async () => {
        const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:8000';

        // Create question in backend database
        const questionData = {
          question,
          context: context || {},
          timeout,
          status: 'pending',
          asked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + timeout * 1000).toISOString(),
        };

        const response = await fetch(`${baseUrl}/api/v1/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(questionData),
        });

        if (!response.ok) {
          throw new Error(`Failed to create question: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const questionRecord = data.question || data;

        return this.formatSuccess({
          success: true,
          questionRequest: {
            id: questionRecord.id,
            question,
            context,
            timeout,
            status: 'pending',
            createdAt: questionRecord.created_at || new Date().toISOString(),
            expiresAt: questionRecord.expires_at,
          },
          message: `Question submitted to user. Timeout: ${timeout}s. Response will be available via WebSocket event or polling.`,
          note: 'VS Code extension will receive WebSocket notification and prompt the user. Check question status via backend API.',
        });
      },
      'handleAskUserQuestion',
      args
    );
  }
}

// Create singleton instance
const handler = new AskUserQuestionHandler();

/**
 * Export handler function for MCP server
 */
export async function handleAskUserQuestion(args: any) {
  return handler.execute(args);
}
