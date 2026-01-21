/**
 * Handler for copilot_orchestrator_get_next_task tool
 * Returns the highest-priority task for agent to work on
 */

import {
  validateInput,
  ValidationSchemas,
  formatAgentSuccess,
  formatAgentError,
  AgentErrors,
} from '../agentValidation';
import { getTaskManager } from '../integrations/serviceFactory';

export async function handleGetNextTask(args: any) {
  // Validate input
  const validation = validateInput(ValidationSchemas.getNextTask, args);
  if (!validation.valid) {
    return formatAgentError(validation.error);
  }

  const { filter, priority, agentType } = validation.data;

  try {
    const manager = getTaskManager();
    const task = await manager.getNextTask({ filter, priority, agentType });

    if (!task) {
      return formatAgentError(
        AgentErrors.taskNotFound('No tasks available in queue')
      );
    }

    const queueDepth = await manager.getQueueDepth();

    // Format task for agent consumption
    const formattedTask = {
      taskId: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: agentType || 'agent',
      estimatedEffort: task.estimatedEffort || 'Unknown',
      dependencies: task.dependencies,
      acceptanceCriteria: task.acceptanceCriteria || [],
      context: task.context || {
        relatedFiles: [],
        relatedIssues: [],
        techStack: [],
      },
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
    };

    return formatAgentSuccess({
      task: formattedTask,
      queueDepth,
      message: 'Task retrieved successfully. Start by reviewing the acceptance criteria and context.',
    });
  } catch (error) {
    return formatAgentError(
      AgentErrors.operationFailed(
        'get next task',
        error instanceof Error ? error.message : String(error)
      )
    );
  }
}
