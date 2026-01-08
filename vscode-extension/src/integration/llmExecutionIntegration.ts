/**
 * LLM Execution Integration
 * Bridges task execution events with LLM command and response panel
 */

import * as vscode from 'vscode';
import { LLMResponsePanel, ExecutionResult } from '../panels/llmResponsePanel';
import { TaskInteractionAPI } from '../taskInteractionAPI';

export class LLMExecutionIntegration {
  private taskInteractionAPI: TaskInteractionAPI;
  private responsePanel: LLMResponsePanel | undefined;
  private _disposables: vscode.Disposable[] = [];

  constructor(taskInteractionAPI: TaskInteractionAPI, extensionUri: vscode.Uri) {
    this.taskInteractionAPI = taskInteractionAPI;

    // Listen for task interaction events
    this.taskInteractionAPI.onTaskInteraction((event) => {
      if (event.type === 'executeTask') {
        this.handleTaskExecution(event).catch(console.error);
      }
    });
  }

  /**
   * Handle task execution event - wire to executeLLM command
   */
  private async handleTaskExecution(event: any): Promise<void> {
    try {
      const { taskId, taskUri, task } = event;

      // Open/create response panel
      if (!this.responsePanel) {
        this.responsePanel = LLMResponsePanel.createOrShow(
          vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file('')
        );
      } else {
        this.responsePanel._panel.reveal(vscode.ViewColumn.Two);
      }

      // Execute the LLM command
      const startTime = Date.now();
      try {
        // Call the executeLLM command with task context
        await vscode.commands.executeCommand(
          'copilot-orchestrator.executeLLM',
          taskId,
          task.title,
          task.description
        );

        const duration = Date.now() - startTime;

        // Create success result
        const result: ExecutionResult = {
          taskId,
          taskTitle: task.title,
          agentName: 'CopilotDispatcher',
          timestamp: new Date().toISOString(),
          duration,
          success: true,
          message: `Task execution completed successfully in ${(duration / 1000).toFixed(2)}s`,
          response: 'LLM response displayed in editor',
        };

        if (this.responsePanel) {
          this.responsePanel.addResult(result);
        }
      } catch (error) {
        const duration = Date.now() - startTime;

        // Create error result
        const result: ExecutionResult = {
          taskId,
          taskTitle: task.title,
          agentName: 'CopilotDispatcher',
          timestamp: new Date().toISOString(),
          duration,
          success: false,
          message: 'Task execution failed',
          error: error instanceof Error ? error.message : String(error),
        };

        if (this.responsePanel) {
          this.responsePanel.addResult(result);
        }

        vscode.window.showErrorMessage(`Failed to execute task: ${result.error}`);
      }
    } catch (error) {
      console.error('LLM execution integration error:', error);
      vscode.window.showErrorMessage(
        `Execution error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Show the response panel
   */
  public showResponsePanel(extensionUri: vscode.Uri): LLMResponsePanel {
    if (!this.responsePanel) {
      this.responsePanel = LLMResponsePanel.createOrShow(extensionUri);
    } else {
      this.responsePanel._panel.reveal(vscode.ViewColumn.Two);
    }
    return this.responsePanel;
  }

  /**
   * Get the response panel (if exists)
   */
  public getResponsePanel(): LLMResponsePanel | undefined {
    return this.responsePanel;
  }

  /**
   * Clear response history
   */
  public clearHistory(): void {
    if (this.responsePanel) {
      this.responsePanel.clearHistory();
    }
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(): ExecutionResult[] {
    return this.responsePanel ? this.responsePanel.getHistory() : [];
  }

  public dispose(): void {
    this.responsePanel?.dispose();
    this._disposables.forEach((d) => d.dispose());
  }
}
