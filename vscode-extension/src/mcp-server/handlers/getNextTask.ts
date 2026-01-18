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
} from '../agentValidation.js';

export async function handleGetNextTask(args: any) {
  // Validate input
  const validation = validateInput(ValidationSchemas.getNextTask, args);
  if (!validation.valid) {
    return formatAgentError(validation.error);
  }

  const { filter, priority, agentType } = validation.data;

  try {
    // TODO: Integrate with actual task management system
    // For now, return mock data showing the structure agents will receive

    const nextTask = {
      taskId: 'TASK-001',
      title: 'Implement authentication middleware',
      description: 'Add JWT-based authentication middleware to protect API endpoints',
      status: 'pending',
      priority: priority || 'high',
      assignedTo: agentType || 'code-master',
      estimatedEffort: '2 hours',
      dependencies: [],
      acceptanceCriteria: [
        'JWT validation middleware implemented',
        'Protected routes configured',
        'Unit tests written',
        'Integration tests passing',
      ],
      context: {
        relatedFiles: [
          'src/middleware/auth.ts',
          'src/routes/api.ts',
          'tests/auth.test.ts',
        ],
        relatedIssues: [
          {
            number: 42,
            url: 'https://github.com/owner/repo/issues/42',
            title: 'Authentication requirements',
          },
        ],
        techStack: ['TypeScript', 'Express', 'JWT'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return formatAgentSuccess({
      task: nextTask,
      queueDepth: 5,
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
