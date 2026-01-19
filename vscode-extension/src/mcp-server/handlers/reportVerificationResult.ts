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
        const config = require('vscode').workspace.getConfiguration('copilot-orchestrator');
        const baseUrl = config.get<string>('mcp.baseUrl', 'http://localhost:8000');

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

        // If verification failed, create investigation tasks
        if (!passed && findings && findings.length > 0) {
          await this.createInvestigationTasks(taskId, findings, baseUrl);
        }

        // Update task status based on verification result
        await this.updateTaskStatus(taskId, passed, baseUrl);

        // Broadcast WebSocket event for UI updates
        await this.broadcastEvent('verifications', 'verificationCompleted', {
          taskId,
          passed,
          findingsCount: findings?.length || 0,
          timestamp: new Date().toISOString(),
        });

        // Determine next workflow step
        const nextAction = passed
          ? 'Task can be marked as complete and merged'
          : 'Task requires additional work based on findings';

        const nextSteps = passed
          ? ['Update task status to done', 'Close related issues', 'Merge pull request']
          : ['Address verification findings', 'Request re-verification', 'Update task priority'];

        return formatAgentSuccess({
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
        });
      },
      'handleReportVerificationResult',
      args
    );
  }

  /**
   * Create investigation tasks for verification findings
   */
  private async createInvestigationTasks(taskId: string, findings: any[], baseUrl: string): Promise<void> {
    try {
      for (const finding of findings) {
        const investigationData = {
          parent_task_id: taskId,
          title: `Investigation: ${finding.description || 'Verification finding'}`,
          description: finding.details || finding.description,
          task_type: 'investigation',
          priority: this.mapSeverityToPriority(finding.severity),
          status: 'pending',
        };

        await fetch(`${baseUrl}/api/v1/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(investigationData),
        });
      }
    } catch (error) {
      console.warn('[ReportVerificationResult] Failed to create investigation tasks:', error);
      // Don't fail the verification report if investigation creation fails
    }
  }

  /**
   * Update task status based on verification result
   */
  private async updateTaskStatus(taskId: string, passed: boolean, baseUrl: string): Promise<void> {
    try {
      const statusData = {
        taskId,
        status: passed ? 'completed' : 'blocked',
      };

      await fetch(`${baseUrl}/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(statusData),
      });
    } catch (error) {
      console.warn('[ReportVerificationResult] Failed to update task status:', error);
      // Don't fail the verification report if status update fails
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
