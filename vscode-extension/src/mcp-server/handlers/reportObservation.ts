/**
 * Handler for copilot_orchestrator_report_observation tool
 */

import { GitHubIntegration } from '../integrations/githubIntegration.js';
import { TaskManager } from '../integrations/taskManager.js';

// Singleton instances
let githubIntegration: GitHubIntegration | null = null;
let taskManager: TaskManager | null = null;

function getGitHubIntegration(): GitHubIntegration {
  if (!githubIntegration) {
    const owner = process.env.GITHUB_OWNER || 'owner';
    const repo = process.env.GITHUB_REPO || 'repo';
    const token = process.env.GITHUB_TOKEN;

    githubIntegration = new GitHubIntegration({ owner, repo, token });
  }
  return githubIntegration;
}

function getTaskManager(): TaskManager {
  if (!taskManager) {
    taskManager = new TaskManager();
  }
  return taskManager;
}

export async function handleReportObservation(args: any) {
  const { type, message, severity = 'medium', suggestedAction, createTask = false } = args;

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

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            observation,
            message: `Observation recorded${
              createTask && observation.issueUrl
                ? ` and task created: ${observation.issueUrl}`
                : createTask
                ? ' (logged locally)'
                : ''
            }`,
          },
          null,
          2
        ),
      },
    ],
  };
}
