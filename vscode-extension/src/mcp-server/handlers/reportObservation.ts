/**
 * Handler for copilot_orchestrator_report_observation tool
 */

import {
  validateInput,
  ValidationSchemas,
  formatAgentSuccess,
  formatAgentError,
  AgentErrors,
} from '../agentValidation';
import { getGitHubIntegration, getTaskManager } from '../integrations/serviceFactory';

export async function handleReportObservation(args: any) {
  // Validate input
  const validation = validateInput(ValidationSchemas.reportObservation, args);
  if (!validation.valid) {
    return formatAgentError(validation.error);
  }

  const { type, message, severity = 'medium', suggestedAction, createTask = false } = validation.data;

  const observation = {
    id: `OBS-${Date.now()}`,
    type,
    message,
    severity,
    suggestedAction,
    createTask,
    timestamp: new Date().toISOString(),
    status: 'recorded',
    issueUrl: undefined as string | undefined,
  };

  // Create GitHub issue if requested
  if (createTask) {
    const github = getGitHubIntegration();

    if (github.isAvailable()) {
      const result = await github.createObservationIssue({
        type,
        message,
        severity,
        suggestedAction,
      });

      if (result.success && result.issue) {
        observation.status = 'task-created';
        observation.issueUrl = result.issue.html_url;
      } else {
        observation.status = 'task-creation-failed';
      }
    } else {
      // Log observation locally if GitHub is not available
      const manager = getTaskManager();
      await manager.logActivity({
        type: 'observation',
        observationType: type,
        message,
        severity,
        suggestedAction,
        timestamp: new Date().toISOString(),
      });
      observation.status = 'logged-locally';
    }
  }

  return formatAgentSuccess({
    observation,
    message: `Observation recorded${
      createTask && observation.issueUrl
        ? ` and task created: ${observation.issueUrl}`
        : createTask
        ? ' (logged locally)'
        : ''
    }`,
  });
}
