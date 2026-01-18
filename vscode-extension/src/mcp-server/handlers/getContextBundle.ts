/**
 * Handler for copilot_orchestrator_get_context_bundle tool
 * Provides task-specific context optimized for agent consumption
 */

import {
  validateInput,
  ValidationSchemas,
  formatAgentSuccess,
  formatAgentError,
  AgentErrors,
} from '../agentValidation.js';
import { TaskManager } from '../integrations/taskManager.js';
import { ContextRetrieval } from '../integrations/contextRetrieval.js';

// Singleton instances
let taskManager: TaskManager | null = null;
let contextRetrieval: ContextRetrieval | null = null;

function getTaskManager(): TaskManager {
  if (!taskManager) {
    taskManager = new TaskManager();
  }
  return taskManager;
}

function getContextRetrieval(): ContextRetrieval {
  if (!contextRetrieval) {
    contextRetrieval = new ContextRetrieval();
  }
  return contextRetrieval;
}

export async function handleGetContextBundle(args: any) {
  // Validate input
  const validation = validateInput(ValidationSchemas.getContextBundle, args);
  if (!validation.valid) {
    return formatAgentError(validation.error);
  }

  const { taskId, includeFiles = true, includeDocs = true } = validation.data;

  try {
    const manager = getTaskManager();
    const task = await manager.getTaskById(taskId);

    if (!task) {
      return formatAgentError(AgentErrors.taskNotFound(taskId));
    }

    const retrieval = getContextRetrieval();
    const contextBundle = await retrieval.getContextBundle(task, {
      includeFiles,
      includeDocs,
    });

    return formatAgentSuccess({
      context: contextBundle,
      message: 'Context bundle retrieved successfully',
    });
  } catch (error) {
    return formatAgentError(
      AgentErrors.operationFailed(
        'get context bundle',
        error instanceof Error ? error.message : String(error)
      )
    );
  }
}
