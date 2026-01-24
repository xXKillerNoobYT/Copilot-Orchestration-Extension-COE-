/**
 * Handler for copilot_orchestrator_get_context_bundle tool
 * Provides task-specific context optimized for agent consumption
 */
import { validateInput, ValidationSchemas, formatAgentSuccess, formatAgentError, AgentErrors, } from '../agentValidation.js';
import { getTaskManager } from '../integrations/serviceFactory.js';
import { ContextRetrieval } from '../integrations/contextRetrieval.js';
// Singleton instance for context retrieval
let contextRetrieval = null;
function getContextRetrieval() {
    if (!contextRetrieval) {
        contextRetrieval = new ContextRetrieval();
    }
    return contextRetrieval;
}
export async function handleGetContextBundle(args) {
    // Validate input
    const validation = validateInput(ValidationSchemas.getContextBundle, args);
    if (!validation.valid) {
        return formatAgentError(validation.error);
    }
    const { taskId, includeFiles = true, includeDocs = true } = validation.data;
    try {
        const manager = getTaskManager();
        const task = manager.getTaskById(taskId);
        if (!task) {
            return formatAgentError(AgentErrors.taskNotFound(taskId));
        }
        // Adapt our Task type to TaskWithContext for compatibility
        const taskWithContext = {
            ...task,
            title: task.name, // Map 'name' to 'title' for legacy compatibility
            dependencies: manager.getDependencies(task.id).map(d => d.depends_on_task_id),
        };
        const retrieval = getContextRetrieval();
        const contextBundle = await retrieval.getContextBundle(taskWithContext, {
            includeFiles,
            includeDocs,
        });
        return formatAgentSuccess({
            context: contextBundle,
            message: 'Context bundle retrieved successfully',
        });
    }
    catch (error) {
        return formatAgentError(AgentErrors.operationFailed('get context bundle', error instanceof Error ? error.message : String(error)));
    }
}
