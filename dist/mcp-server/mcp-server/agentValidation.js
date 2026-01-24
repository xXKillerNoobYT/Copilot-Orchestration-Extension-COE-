/**
 * Agent Mode Validation and Error Handling
 *
 * Provides input validation and agent-compatible error formatting
 * for GitHub Copilot Agent Mode integration.
 */
import { z } from 'zod';
/**
 * Standard error codes for agent mode
 */
export var AgentErrorCode;
(function (AgentErrorCode) {
    AgentErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    AgentErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    AgentErrorCode["INVALID_FIELD_TYPE"] = "INVALID_FIELD_TYPE";
    AgentErrorCode["INVALID_ENUM_VALUE"] = "INVALID_ENUM_VALUE";
    AgentErrorCode["TASK_NOT_FOUND"] = "TASK_NOT_FOUND";
    AgentErrorCode["OPERATION_FAILED"] = "OPERATION_FAILED";
    AgentErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    AgentErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(AgentErrorCode || (AgentErrorCode = {}));
/**
 * Validation schemas for tool inputs
 */
export const ValidationSchemas = {
    taskId: z.object({
        taskId: z.string().min(1, 'Task ID is required'),
    }),
    listActiveTasks: z.object({
        status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional(),
        priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        assignee: z.string().optional(),
    }),
    getAgentState: z.object({
        agentName: z.string().optional(),
    }),
    reportObservation: z.object({
        type: z.enum(['discovery', 'issue', 'risk', 'optimization']),
        message: z.string().min(1, 'Message is required'),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        suggestedAction: z.string().optional(),
        createTask: z.boolean().optional(),
    }),
    requestVerification: z.object({
        taskId: z.string().min(1, 'Task ID is required'),
        verificationType: z.enum(['visual', 'functional', 'integration']),
        checklist: z.array(z.string()).min(1, 'At least one checklist item is required'),
    }),
    askUserQuestion: z.object({
        question: z.string().min(1, 'Question is required'),
        context: z.any().optional(),
        timeout: z.number().positive().optional(),
    }),
    getWorkspaceConfig: z.object({
        includeAgentProfiles: z.boolean().optional(),
    }),
    // New agent mode tool schemas
    getNextTask: z.object({
        filter: z.enum(['ready', 'blocked', 'all']).optional(),
        priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        agentType: z.string().optional(),
    }),
    reportTaskStatus: z.object({
        taskId: z.string().min(1, 'Task ID is required'),
        status: z.enum(['pending', 'approved', 'in_progress', 'testing', 'review', 'completed', 'failed', 'blocked', 'cancelled']),
        progress: z.number().min(0).max(1).optional(),
        observations: z.string().optional(),
        blockers: z.array(z.string()).optional(),
        actualHours: z.number().min(0).optional(),
    }),
    getContextBundle: z.object({
        taskId: z.string().min(1, 'Task ID is required'),
        includeFiles: z.boolean().optional(),
        includeDocs: z.boolean().optional(),
    }),
    reportTestFailure: z.object({
        taskId: z.string().min(1, 'Task ID is required'),
        testName: z.string().min(1, 'Test name is required'),
        errorMessage: z.string().min(1, 'Error message is required'),
        stackTrace: z.string().optional(),
        suggestedFix: z.string().optional(),
    }),
    reportVerificationResult: z.object({
        taskId: z.string().min(1, 'Task ID is required'),
        verificationType: z.enum(['visual', 'functional', 'integration']),
        passed: z.boolean(),
        findings: z.array(z.string()),
        screenshots: z.array(z.string()).optional(),
    }),
};
/**
 * Validate tool input against schema
 */
export function validateInput(schema, input) {
    try {
        const data = schema.parse(input);
        return { valid: true, data };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues;
            const firstError = issues[0];
            const pathString = firstError?.path && Array.isArray(firstError.path)
                ? firstError.path.join('.')
                : 'input';
            return {
                valid: false,
                error: {
                    code: AgentErrorCode.INVALID_INPUT,
                    message: firstError?.message || 'Invalid input',
                    details: issues,
                    suggestion: `Please check the ${pathString} field and ensure it meets the requirements.`,
                },
            };
        }
        return {
            valid: false,
            error: {
                code: AgentErrorCode.INTERNAL_ERROR,
                message: error instanceof Error ? error.message : 'Unknown validation error',
            },
        };
    }
}
/**
 * Format error for agent consumption
 */
export function formatAgentError(error) {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        suggestion: error.suggestion,
                    },
                }, null, 2),
            },
        ],
        isError: true,
    };
}
/**
 * Format success response for agent
 */
export function formatAgentSuccess(data) {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    data,
                }, null, 2),
            },
        ],
    };
}
/**
 * Create standard error responses
 */
export const AgentErrors = {
    taskNotFound: (taskId) => ({
        code: AgentErrorCode.TASK_NOT_FOUND,
        message: `Task with ID '${taskId}' not found`,
        suggestion: 'Use list_active_tasks to see available tasks, or check if the task ID is correct.',
    }),
    operationFailed: (operation, reason) => ({
        code: AgentErrorCode.OPERATION_FAILED,
        message: `Failed to ${operation}: ${reason}`,
        suggestion: 'Check the logs for more details and try again.',
    }),
    unauthorized: () => ({
        code: AgentErrorCode.UNAUTHORIZED,
        message: 'Unauthorized to perform this operation',
        suggestion: 'Ensure the MCP server is properly configured with valid credentials.',
    }),
    internalError: (message) => ({
        code: AgentErrorCode.INTERNAL_ERROR,
        message: `Internal error: ${message}`,
        suggestion: 'This is an unexpected error. Please report this to the extension developers.',
    }),
};
