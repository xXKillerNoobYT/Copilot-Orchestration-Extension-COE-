/**
 * Handler for copilot_orchestrator_report_verification_result tool
 * Submits verification findings and triggers quality gates
 * Integrates with Laravel backend VerificationService
 */

import {
  validateInput,
  ValidationSchemas,
  formatAgentSuccess,
  formatAgentError,
  AgentErrors,
} from '../agentValidation.js';
import { MCPHandlerBase } from './MCPHandlerBase';

class ReportVerificationResultHandler extends MCPHandlerBase {
  /**
   * Report verification results to backend
   */
  async execute(args: any) {
    // Validate input
    const validation = validateInput(ValidationSchemas.reportVerificationResult, args);
    if (!validation.valid) {
      return formatAgentError(validation.error);
    }

    const { taskId, verificationType, passed, findings, screenshots } = validation.data;

    return this.executeWithRetry(
      async () => {
        const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:8000';

        // Submit verification result to backend
        const resultData = {
          task_id: taskId,
          verification_type: verificationType,
          passed,
          findings: findings || [],
          screenshots: screenshots || [],
          timestamp: new Date().toISOString(),
          reviewer: 'agent',
        };

        const response = await fetch(`${baseUrl}/api/v1/mcp/reportVerificationResult`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(resultData),
        });

        if (!response.ok) {
          throw new Error(`Failed to submit verification result: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const verificationResult = data.verificationResult || data;

        const warnings: string[] = [];

        // If verification failed, create investigation tasks
        let investigationTasksCreated: number | undefined;
        if (!passed && findings && findings.length > 0) {
          investigationTasksCreated = await this.createInvestigationTasks(taskId, findings, baseUrl);
          if (investigationTasksCreated === undefined) {
            warnings.push('Failed to create investigation tasks for verification findings');
          } else if (investigationTasksCreated < findings.length) {
            warnings.push(`Only ${investigationTasksCreated} of ${findings.length} investigation tasks created successfully`);
          }
        }

        // Update task status based on verification result
        const statusUpdated = await this.updateTaskStatus(taskId, passed, baseUrl);
        if (!statusUpdated) {
          warnings.push('Failed to update task status - task may already be in terminal state or update failed');
        }

        // Determine next workflow step
        const nextAction = passed
          ? 'Task can be marked as complete and merged'
          : 'Task requires additional work based on findings';

        const nextSteps = passed
          ? ['Update task status to done', 'Close related issues', 'Merge pull request']
          : ['Address verification findings', 'Request re-verification', 'Update task priority'];

        const result: any = {
          verificationResult: {
            id: verificationResult.id || `VERIFY-${Date.now()}`,
            taskId,
            verificationType,
            passed,
            findings: findings || [],
            screenshots: screenshots || [],
            timestamp: verificationResult.timestamp || new Date().toISOString(),
            reviewer: 'agent',
            qualityGatePassed: passed,
          },
          message: `Verification ${passed ? 'passed' : 'failed'} for task ${taskId}`,
          nextAction,
          nextSteps,
        };

        // Add warnings if any non-critical operations failed
        if (warnings.length > 0) {
          result.warnings = warnings;
        }

        // Add investigation task count if created
        if (investigationTasksCreated !== undefined) {
          result.investigationTasksCreated = investigationTasksCreated;
        }

        return formatAgentSuccess(result);
      },
      'handleReportVerificationResult',
      args
    );
  }

  /**
   * Create investigation tasks for verification findings
   * Creates tasks in parallel for better performance
   * @returns Number of successfully created tasks, or undefined if all failed
   */
  private async createInvestigationTasks(taskId: string, findings: any[], baseUrl: string): Promise<number | undefined> {
    try {
      // Create all investigation tasks in parallel for better performance
      const createPromises = findings.map(finding => {
        const investigationData = {
          parent_task_id: taskId,
          title: `Investigation: ${finding.description || 'Verification finding'}`,
          description: finding.details || finding.description,
          task_type: 'investigation',
          priority: this.mapSeverityToPriority(finding.severity),
          status: 'pending',
        };

        return fetch(`${baseUrl}/api/v1/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(investigationData),
        }).catch(err => {
          console.warn('[ReportVerificationResult] Failed to create investigation task:', err);
          return null;
        });
      });

      const results = await Promise.all(createPromises);
      const successCount = results.filter(r => r !== null && r.ok).length;
      
      return successCount > 0 ? successCount : undefined;
    } catch (error) {
      console.warn('[ReportVerificationResult] Failed to create investigation tasks:', error);
      return undefined;
    }
  }

  /**
   * Update task status based on verification result
   * Checks current task status to avoid regressing terminal states
   * @returns true if status was updated, false otherwise
   */
  private async updateTaskStatus(taskId: string, passed: boolean, baseUrl: string): Promise<boolean> {
    try {
      // Check current task status to avoid regressing terminal states
      const taskResponse = await fetch(`${baseUrl}/api/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        const currentStatus = taskData?.task?.status?.toLowerCase();

        // Skip update if task is already in a terminal state
        if (currentStatus === 'completed' || currentStatus === 'cancelled') {
          console.warn(
            `[ReportVerificationResult] Skipping status update for task ${taskId} - already in terminal state: ${currentStatus}`
          );
          return false;
        }
      }

      // Update task status
      const statusData = {
        taskId,
        status: passed ? 'completed' : 'blocked',
      };

      const updateResponse = await fetch(`${baseUrl}/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(statusData),
      });

      return updateResponse.ok;
    } catch (error) {
      console.warn('[ReportVerificationResult] Failed to update task status:', error);
      return false;
    }
  }

  /**
   * Map severity to task priority
   */
  private mapSeverityToPriority(severity?: string): string {
    const severityMap: Record<string, string> = {
      'critical': 'critical',
      'major': 'high',
      'high': 'high',
      'minor': 'medium',
      'low': 'low',
    };

    return severityMap[severity?.toLowerCase() || 'medium'] || 'medium';
  }
}

// Create singleton instance
const handler = new ReportVerificationResultHandler();

/**
 * Export handler function for MCP server
 */
export async function handleReportVerificationResult(args: any) {
  return handler.execute(args);
}
