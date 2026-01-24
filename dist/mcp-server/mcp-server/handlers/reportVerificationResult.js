/**
 * Handler for copilot_orchestrator_report_verification_result tool
 * Submits verification findings and triggers quality gates
 * Integrates with Laravel backend VerificationService
 */
import { validateInput, ValidationSchemas, formatAgentSuccess, formatAgentError, AgentErrors, } from '../agentValidation';
import { MCPHandlerBase } from './MCPHandlerBase';
class ReportVerificationResultHandler extends MCPHandlerBase {
    /**
     * Report verification results to backend
     */
    async execute(args) {
        // Validate input
        const validation = validateInput(ValidationSchemas.reportVerificationResult, args);
        if (!validation.valid) {
            return formatAgentError(validation.error);
        }
        const { taskId, verificationType, passed, findings, screenshots } = validation.data;
        try {
            return await this.executeWithRetry(async () => {
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
                const warnings = [];
                // If verification failed, create investigation tasks
                let investigationTasksCreated;
                if (!passed && findings && findings.length > 0) {
                    investigationTasksCreated = await this.createInvestigationTasks(taskId, findings, baseUrl);
                    if (investigationTasksCreated === undefined) {
                        warnings.push('Failed to create investigation tasks for verification findings');
                    }
                    else if (investigationTasksCreated < findings.length) {
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
                const result = {
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
                return formatAgentSuccess(this.formatSuccess(result));
            }, 'handleReportVerificationResult', args);
        }
        catch (error) {
            return formatAgentError(AgentErrors.operationFailed('report verification result', error instanceof Error ? error.message : String(error)));
        }
    }
    /**
     * Create investigation tasks for verification findings
     * Creates tasks in parallel for better performance, with retry logic for reliability
     * @returns Number of successfully created tasks, or undefined if all failed
     */
    async createInvestigationTasks(taskId, findings, baseUrl) {
        try {
            // Create all investigation tasks in parallel for better performance
            const createPromises = findings.map(finding => this.createSingleInvestigationTask(taskId, finding, baseUrl));
            const results = await Promise.all(createPromises);
            const successCount = results.filter(r => r === true).length;
            return successCount > 0 ? successCount : undefined;
        }
        catch (error) {
            console.warn('[ReportVerificationResult] Failed to create investigation tasks:', error);
            return undefined;
        }
    }
    /**
     * Create a single investigation task with retry logic
     */
    async createSingleInvestigationTask(taskId, finding, baseUrl) {
        try {
            const investigationData = {
                parent_task_id: taskId,
                title: `Investigation: ${finding.description || 'Verification finding'}`,
                description: finding.details || finding.description,
                task_type: 'investigation',
                priority: this.mapSeverityToPriority(finding.severity),
                status: 'pending',
            };
            // Use retry mechanism for reliability
            await this.executeWithRetry(async () => {
                const response = await fetch(`${baseUrl}/api/v1/tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(investigationData),
                });
                if (!response.ok) {
                    throw new Error(`Failed to create investigation task: ${response.status}`);
                }
                return response;
            }, 'createInvestigationTask', { taskId, finding: finding.description });
            return true;
        }
        catch (error) {
            console.warn('[ReportVerificationResult] Failed to create investigation task:', error);
            return false;
        }
    }
    /**
     * Update task status based on verification result
     * Checks current task status to avoid regressing terminal states
     * Uses retry mechanism for reliability
     * @returns true if status was updated, false otherwise
     */
    async updateTaskStatus(taskId, passed, baseUrl) {
        try {
            // Check current task status to avoid regressing terminal states (with retry)
            const currentStatus = await this.executeWithRetry(async () => {
                const taskResponse = await fetch(`${baseUrl}/api/v1/tasks/${taskId}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                if (!taskResponse.ok && taskResponse.status !== 404) {
                    throw new Error(`Failed to fetch task status: ${taskResponse.status}`);
                }
                if (taskResponse.ok) {
                    const taskData = await taskResponse.json();
                    return taskData?.task?.status?.toLowerCase();
                }
                return undefined;
            }, 'checkTaskStatus', { taskId });
            // Skip update if task is already in a terminal state
            if (currentStatus === 'completed' || currentStatus === 'cancelled') {
                console.warn(`[ReportVerificationResult] Skipping status update for task ${taskId} - already in terminal state: ${currentStatus}`);
                return false;
            }
            // Update task status (with retry)
            const statusData = {
                taskId,
                status: passed ? 'completed' : 'blocked',
            };
            await this.executeWithRetry(async () => {
                const updateResponse = await fetch(`${baseUrl}/api/v1/tasks/${taskId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(statusData),
                });
                if (!updateResponse.ok) {
                    throw new Error(`Failed to update task status: ${updateResponse.status}`);
                }
                return updateResponse;
            }, 'updateTaskStatus', { taskId, status: statusData.status });
            return true;
        }
        catch (error) {
            console.warn('[ReportVerificationResult] Failed to update task status:', error);
            return false;
        }
    }
    /**
     * Map severity to task priority
     */
    mapSeverityToPriority(severity) {
        const severityMap = {
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
export async function handleReportVerificationResult(args) {
    return handler.execute(args);
}
