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

export async function handleGetContextBundle(args: any) {
  // Validate input
  const validation = validateInput(ValidationSchemas.getContextBundle, args);
  if (!validation.valid) {
    return formatAgentError(validation.error);
  }

  const { taskId, includeFiles = true, includeDocs = true } = validation.data;

  try {
    // TODO: Integrate with actual workspace and documentation system
    // For now, return mock context bundle structure

    const contextBundle = {
      taskId,
      task: {
        title: 'Task title from task manager',
        description: 'Detailed task description',
        acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
      },
      relevantFiles: includeFiles
        ? [
            {
              path: 'src/example.ts',
              summary: 'Main implementation file',
              lastModified: new Date().toISOString(),
            },
            {
              path: 'tests/example.test.ts',
              summary: 'Test file for the implementation',
              lastModified: new Date().toISOString(),
            },
          ]
        : [],
      documentation: includeDocs
        ? [
            {
              title: 'Architecture Overview',
              path: 'docs/ARCHITECTURE.md',
              relevance: 'high',
              summary: 'System architecture and design patterns',
            },
            {
              title: 'Coding Standards',
              path: 'docs/CODING-STANDARDS.md',
              relevance: 'medium',
              summary: 'Code style and conventions',
            },
          ]
        : [],
      dependencies: [
        {
          name: 'typescript',
          version: '5.0.0',
          purpose: 'Primary language',
        },
      ],
      relatedTasks: [
        {
          taskId: 'TASK-002',
          title: 'Related task',
          relationship: 'depends-on',
        },
      ],
      agentGuidance: {
        recommendedApproach: 'Start with writing tests, then implement the feature',
        commonPitfalls: ['Avoid hardcoding values', 'Ensure proper error handling'],
        bestPractices: ['Follow existing code patterns', 'Add inline documentation'],
      },
    };

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
