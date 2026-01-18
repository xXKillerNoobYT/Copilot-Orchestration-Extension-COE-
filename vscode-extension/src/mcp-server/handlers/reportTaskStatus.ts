/**
 * Handler for copilot_orchestrator_report_task_status tool
 * Updates task progress and status
 */

import {
  validateInput,
  ValidationSchemas,
  formatAgentSuccess,
  formatAgentError,
  AgentErrors,
} from '../agentValidation.js';
import { TaskManager } from '../integrations/taskManager.js';

// Singleton instance
let taskManager: TaskManager | null = null;

function getTaskManager(): TaskManager {
  if (!taskManager) {
    taskManager = new TaskManager();
  }
  return taskManager;
}

export async function handleReportTaskStatus(args: any) {
  // Validate input
  const validation = validateInput(ValidationSchemas.reportTaskStatus, args);
  if (!validation.valid) {
    return formatAgentError(validation.error);
  }

  const { taskId, status, progress, observations, blockers } = validation.data;

  try {
    const manager = getTaskManager();
    const result = await manager.updateTaskStatus(taskId, status, progress, observations, blockers);

    if (!result.success) {
      return formatAgentError(
        AgentErrors.taskNotFound(result.error || `Task ${taskId}`)
      );
    }

    const statusUpdate = {
      taskId,
      previousStatus: result.task?.status || 'unknown',
      newStatus: status,
      progress: progress ?? 0,
      observations,
      blockers: blockers || [],
      updatedAt: new Date().toISOString(),
      nextSteps:
        status === 'blocked'
          ? ['Resolve blockers before continuing']
          : status === 'done'
          ? ['Request verification', 'Close task']
          : ['Continue implementation'],
    };

    // Add task completion message
    if (status === 'done') {
      statusUpdate.nextSteps.push('Task marked complete, verification requested');
    }

    return formatAgentSuccess({
      statusUpdate,
      message: `Task ${taskId} status updated to ${status}`,
    });
  } catch (error) {
    return formatAgentError(
      AgentErrors.operationFailed(
        'report task status',
        error instanceof Error ? error.message : String(error)
      )
    );
  }
}
