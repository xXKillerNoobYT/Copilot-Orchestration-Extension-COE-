/**
 * Handler for copilot_orchestrator_list_active_tasks tool
 * Integrates with Laravel backend TaskRepository to fetch filtered task list
 */

import { MCPHandlerBase } from './MCPHandlerBase';

class ListActiveTasksHandler extends MCPHandlerBase {
  /**
   * Fetch filtered list of tasks from backend
   */
  async execute(args: any) {
    const { status, priority, assignee, projectId } = args || {};

    return this.executeWithRetry(
      async () => {
        // Fetch tasks from Laravel backend
        const config = require('vscode').workspace.getConfiguration('copilot-orchestrator');
        const baseUrl = config.get<string>('mcp.baseUrl', 'http://localhost:8000');
        
        // Build query parameters for filtering
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (assignee) params.append('assigned_agent', assignee);
        
        // Use project ID if provided, otherwise get default from workspace
        const effectiveProjectId = projectId || config.get<string>('project.id', 'default');
        
        const url = `${baseUrl}/api/v1/projects/${effectiveProjectId}/tasks?${params.toString()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tasks = data.tasks || data.data || [];

        // Transform tasks to expected format
        const transformedTasks = tasks.map((task: any) => ({
          taskId: task.id,
          status: task.status,
          title: task.title,
          description: task.description,
          assignee: task.assigned_agent || task.assignee,
          priority: task.priority,
          progress: task.progress_percent ? task.progress_percent / 100 : 0,
          linkedIssue: task.github_issue_id,
          estimatedHours: task.estimated_hours,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
        }));

        // Broadcast WebSocket event for UI updates
        await this.broadcastEvent('tasks', 'taskListQueried', {
          filters: { status, priority, assignee },
          count: transformedTasks.length,
          timestamp: new Date().toISOString(),
        });

        return this.formatSuccess({
          tasks: transformedTasks,
          total: transformedTasks.length,
          filters: { status, priority, assignee },
          projectId: effectiveProjectId,
        });
      },
      'handleListActiveTasks',
      args
    );
  }
}

// Create singleton instance
const handler = new ListActiveTasksHandler();

/**
 * Export handler function for MCP server
 */
export async function handleListActiveTasks(args: any) {
  return handler.execute(args);
}
