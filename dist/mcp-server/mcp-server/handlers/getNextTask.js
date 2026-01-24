/**
 * Handler for copilot_orchestrator_get_next_task tool
 * Returns the highest-priority task for agent to work on
 */
import { validateInput, ValidationSchemas, formatAgentSuccess, formatAgentError, AgentErrors, } from '../agentValidation';
import { getTaskManager } from '../integrations/serviceFactory';
export async function handleGetNextTask(args) {
    // Validate input
    const validation = validateInput(ValidationSchemas.getNextTask, args);
    if (!validation.valid) {
        return formatAgentError(validation.error);
    }
    const { filter, priority, agentType } = validation.data;
    try {
        const manager = getTaskManager();
        const task = manager.getNextTask({ filter, priority, agentType });
        if (!task) {
            return formatAgentError(AgentErrors.taskNotFound('No tasks available in queue'));
        }
        const queueDepth = manager.getQueueDepth();
        // Get dependencies for this task
        const dependencies = manager.getDependencies(task.id);
        // Format task for agent consumption matching PRD specification
        const formattedTask = {
            taskId: task.id,
            title: task.name, // Database field is 'name', not 'title'
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            taskType: task.task_type,
            assignedTo: task.assigned_agent || agentType || 'agent',
            estimatedEffort: task.estimated_effort ? `${task.estimated_effort} minutes` : 'Unknown',
            actualEffort: task.actual_effort ? `${task.actual_effort} minutes` : null,
            dependencies: dependencies.map(dep => ({
                id: dep.depends_on_task_id,
                type: dep.dependency_type
            })),
            acceptanceCriteria: [], // TODO: Add acceptance criteria field to database schema
            context: {
                projectId: task.project_id,
                parentTaskId: task.parent_task_id || null,
                githubIssue: task.github_issue_id ? {
                    number: task.github_issue_id,
                    url: task.github_issue_url || ''
                } : null,
                branchName: task.branch_name || null,
                contextBundlePath: task.context_bundle_path || null,
                relatedFiles: [], // TODO: Add context bundle integration
                relatedIssues: [],
                techStack: [],
            },
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            startedAt: task.started_at || null,
            completedAt: task.completed_at || null,
            version: task.version,
        };
        return formatAgentSuccess({
            task: formattedTask,
            queueDepth,
            message: 'Task retrieved successfully. Start by reviewing the acceptance criteria and context.',
        });
    }
    catch (error) {
        return formatAgentError(AgentErrors.operationFailed('get next task', error instanceof Error ? error.message : String(error)));
    }
}
