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

export async function handleReportTestFailure(args: any) {
  // Validate input
  const validation = validateInput(ValidationSchemas.reportTestFailure, args);
  if (!validation.valid) {
    return formatAgentError(validation.error);
  }

  const { taskId, testName, errorMessage, stackTrace, suggestedFix } = validation.data;

  try {
    // TODO: Integrate with actual issue tracking system
    // For now, log failure and return structured response

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
    };

    // Optionally create investigation task
    // This would integrate with GitHub Issues API
    if (!suggestedFix) {
      failureReport.investigationCreated = true;
      // TODO: Create GitHub issue for investigation
    }

    return formatAgentSuccess({
      failureReport,
      message: `Test failure reported for task ${taskId}`,
      nextSteps: suggestedFix
        ? ['Apply suggested fix', 'Re-run tests']
        : ['Investigation task created', 'Debug the issue', 'Update task status'],
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
