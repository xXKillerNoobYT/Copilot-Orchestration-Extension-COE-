/**
 * Handler for copilot_orchestrator_ask_user_question tool
 * Integrates with VS Code notification API and Answer Team agent
 */

import { MCPHandlerBase } from './MCPHandlerBase';
import * as vscode from 'vscode';

class AskUserQuestionHandler extends MCPHandlerBase {
  /**
   * Ask user a question via VS Code UI and store in database
   */
  async execute(args: any) {
    const { question, context, timeout = 300 } = args;

    if (!question) {
      return this.formatError('Missing required parameter: question');
    }

    return this.executeWithRetry(
      async () => {
        const config = vscode.workspace.getConfiguration('copilot-orchestrator');
        const baseUrl = config.get<string>('mcp.baseUrl', 'http://localhost:8000');

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

        // Broadcast WebSocket event
        await this.broadcastEvent('questions', 'questionAsked', {
          questionId: questionRecord.id,
          question,
          timestamp: new Date().toISOString(),
        });

        // Show VS Code prompt to user with timeout
        const answer = await this.promptUser(question, timeout, context);

        // Update question with answer in backend
        if (answer !== null) {
          await this.submitAnswer(questionRecord.id, answer, baseUrl);
        }

        return this.formatSuccess({
          success: true,
          questionRequest: {
            id: questionRecord.id,
            question,
            context,
            timeout,
            status: answer !== null ? 'answered' : 'timeout',
            answer: answer || undefined,
            createdAt: questionRecord.created_at || new Date().toISOString(),
            expiresAt: questionRecord.expires_at,
            answeredAt: answer !== null ? new Date().toISOString() : undefined,
          },
          message: answer !== null
            ? `Question answered by user: "${answer}"`
            : `Question timeout after ${timeout}s. No response from user.`,
        });
      },
      'handleAskUserQuestion',
      args
    );
  }

  /**
   * Prompt user via VS Code UI
   */
  private async promptUser(question: string, timeoutSeconds: number, context: any): Promise<string | null> {
    try {
      // Determine prompt type based on context
      const isChoice = context?.choices && Array.isArray(context.choices);

      // Create promise for user input
      const inputPromise = isChoice
        ? this.showQuickPick(question, context.choices)
        : this.showInputBox(question, context?.placeholder);

      // Create timeout promise
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutSeconds * 1000);
      });

      // Race between user input and timeout
      const result = await Promise.race([inputPromise, timeoutPromise]);

      return result;
    } catch (error) {
      console.warn('[AskUserQuestion] Failed to prompt user:', error);
      return null;
    }
  }

  /**
   * Show VS Code quick pick for multiple choice questions
   */
  private async showQuickPick(question: string, choices: string[]): Promise<string | null> {
    const result = await vscode.window.showQuickPick(choices, {
      placeHolder: question,
      canPickMany: false,
      ignoreFocusOut: true,
    });

    return result || null;
  }

  /**
   * Show VS Code input box for free text questions
   */
  private async showInputBox(question: string, placeholder?: string): Promise<string | null> {
    const result = await vscode.window.showInputBox({
      prompt: question,
      placeHolder: placeholder || 'Enter your answer...',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Answer cannot be empty';
        }
        return null;
      },
    });

    return result || null;
  }

  /**
   * Submit answer to backend
   */
  private async submitAnswer(questionId: string, answer: string, baseUrl: string): Promise<void> {
    try {
      await fetch(`${baseUrl}/api/v1/questions/${questionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          answer,
          answered_at: new Date().toISOString(),
        }),
      });

      // Broadcast answer event
      await this.broadcastEvent('questions', 'questionAnswered', {
        questionId,
        answer,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[AskUserQuestion] Failed to submit answer:', error);
      // Don't fail if answer submission fails - user already provided answer
    }
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
