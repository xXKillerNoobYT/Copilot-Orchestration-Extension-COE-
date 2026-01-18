/**
 * Handler for copilot_orchestrator_report_test_failure tool
 * Reports test failures and creates investigation tasks if needed
 */

import {
  validateInput,
  ValidationSchemas,
  formatAgentSuccess,
  formatAgentError,
  AgentErrors,
} from '../agentValidation.js';
import { GitHubIntegration } from '../integrations/githubIntegration.js';
import { TaskManager } from '../integrations/taskManager.js';

// Singleton instances
let githubIntegration: GitHubIntegration | null = null;
let taskManager: TaskManager | null = null;

function getGitHubIntegration(): GitHubIntegration {
  if (!githubIntegration) {
    // Try to get GitHub config from environment or use defaults
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

export async function handleReportTestFailure(args: any) {
  // Validate input
  const validation = validateInput(ValidationSchemas.reportTestFailure, args);
  if (!validation.valid) {
    return formatAgentError(validation.error);
  }

  const { taskId, testName, errorMessage, stackTrace, suggestedFix } = validation.data;

  try {
    const failureReport = {
      id: `FAILURE-${Date.now()}`,
      taskId,
      testName,
      errorMessage,
      stackTrace,
      suggestedFix,
      timestamp: new Date().toISOString(),
      severity: 'high',
      investigationCreated: false,
      issueUrl: undefined as string | undefined,
    };

    // Create investigation task if no suggested fix
    if (!suggestedFix) {
      const github = getGitHubIntegration();
      
      if (github.isAvailable()) {
        const result = await github.createTestFailureIssue({
          taskId,
          testName,
          errorMessage,
          stackTrace,
        });

        if (result.success && result.issue) {
          failureReport.investigationCreated = true;
          failureReport.issueUrl = result.issue.html_url;
        }
      } else {
        // Log locally if GitHub is not available
        const manager = getTaskManager();
        await manager.logActivity({
          type: 'test_failure',
          taskId,
          testName,
          errorMessage,
          stackTrace,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return formatAgentSuccess({
      failureReport,
      message: `Test failure reported for task ${taskId}`,
      nextSteps: suggestedFix
        ? ['Apply suggested fix', 'Re-run tests']
        : failureReport.investigationCreated
        ? [`Investigation task created: ${failureReport.issueUrl}`, 'Debug the issue', 'Update task status']
        : ['Investigation logged', 'Debug the issue', 'Update task status'],
    });
  } catch (error) {
    return formatAgentError(
      AgentErrors.operationFailed(
        'report test failure',
        error instanceof Error ? error.message : String(error)
      )
    );
  }
}
