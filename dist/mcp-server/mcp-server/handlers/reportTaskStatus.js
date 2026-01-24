/**
 * Handler for copilot_orchestrator_report_task_status tool
 * Updates task progress and status
 */
import { validateInput, ValidationSchemas, formatAgentSuccess, formatAgentError, AgentErrors, } from '../agentValidation.js';
import { getTaskManager } from '../integrations/serviceFactory.js';
export async function handleReportTaskStatus(args) {
    // Validate input
    const validation = validateInput(ValidationSchemas.reportTaskStatus, args);
    if (!validation.valid) {
        return formatAgentError(validation.error);
    }
    const { taskId, status, progress, observations, blockers, actualHours } = validation.data;
    try {
        const manager = getTaskManager();
        // Get current task to retrieve version for optimistic locking
        const currentTask = manager.getTaskById(taskId);
        if (!currentTask) {
            return formatAgentError(AgentErrors.taskNotFound(`Task ${taskId} not found`));
        }
        const previousStatus = currentTask.status;
        // Build update details
        const updateDetails = {};
        if (actualHours !== undefined) {
            updateDetails.actual_effort = actualHours * 60; // Convert hours to minutes
        }
        // Update task status with optimistic locking
        const updatedTask = manager.updateTaskStatus(taskId, status, updateDetails, currentTask.version);
        // Log observations if provided
        if (observations) {
            manager.logAuditEntry({
                task_id: taskId,
                action: 'observation_logged',
                details: JSON.stringify({ observations }),
            });
        }
        // Log blockers if provided
        if (blockers && blockers.length > 0) {
            manager.logAuditEntry({
                task_id: taskId,
                action: 'blockers_reported',
                details: JSON.stringify({ blockers }),
            });
        }
        const statusUpdate = {
            taskId,
            previousStatus,
            newStatus: status,
            progress: progress ?? 0,
            observations,
            blockers: blockers || [],
            updatedAt: updatedTask.updated_at,
            version: updatedTask.version,
            nextSteps: status === 'blocked'
                ? ['Resolve blockers before continuing']
                : status === 'completed'
                    ? ['Request verification', 'Close task']
                    : status === 'in_progress'
                        ? ['Continue implementation']
                        : ['Update progress as needed'],
        };
        // Add task completion message
        if (status === 'completed') {
            statusUpdate.nextSteps.push('Task marked complete, verification requested');
        }
        // TODO: Trigger WebSocket event broadcast here
        // This will be implemented in the WebSocket broadcasting task
        return formatAgentSuccess({
            statusUpdate,
            message: `Task ${taskId} status updated from ${previousStatus} to ${status}`,
        });
    }
    catch (error) {
        // Handle optimistic locking conflicts
        if (error instanceof Error && error.message.includes('version mismatch')) {
            return formatAgentError(AgentErrors.operationFailed('report task status', 'Concurrent modification detected. Please retry with the latest task version.'));
        }
        return formatAgentError(AgentErrors.operationFailed('report task status', error instanceof Error ? error.message : String(error)));
    }
}
