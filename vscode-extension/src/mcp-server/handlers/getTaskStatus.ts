/**
 * Handler for copilot_orchestrator_get_task_status tool
 * Integrates with Laravel backend TaskRepository to fetch real task data
 */

import { MCPHandlerBase } from './MCPHandlerBase';

class GetTaskStatusHandler extends MCPHandlerBase {
  /**
   * Fetch task status from backend
   */
  async execute(args: any) {
    const { taskId } = args;

    if (!taskId) {
      return this.formatError('Missing required parameter: taskId');
    }

    return this.executeWithRetry(
      async () => {
        // Get backend URL from environment or use default
        const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:8000';
        
        const response = await fetch(`${baseUrl}/api/v1/tasks/${taskId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Task ${taskId} not found`);
          }
          throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const task = data.task || data;

        // Transform backend response to expected format
        const taskStatus = {
          taskId: task.id || taskId,
          status: task.status,
          title: task.title,
          description: task.description,
          assignee: task.assigned_agent || task.assignee,
          priority: task.priority,
          progress: task.progress_percent ? task.progress_percent / 100 : 0,
          blockers: task.blockers || [],
          dependencies: task.dependencies || [],
          lastUpdate: task.updated_at || new Date().toISOString(),
          estimatedCompletion: task.estimated_completion,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          linkedIssue: task.github_issue_id ? {
            number: task.github_issue_id,
            url: task.github_issue_url || `https://github.com/owner/repo/issues/${task.github_issue_id}`
          } : null,
          version: task.version, // For optimistic locking
        };

        return this.formatSuccess(taskStatus);
      },
      'handleGetTaskStatus',
      args
    );
  }
}

// Create singleton instance
const handler = new GetTaskStatusHandler();

/**
 * Export handler function for MCP server
 */
export async function handleGetTaskStatus(args: any) {
  return handler.execute(args);
}
