/**
 * Agent Orchestrator Service
 * Programming Orchestrator (master coordinator) for multi-agent task coordination
 * Implements PRD specifications for intelligent task routing and agent management
 */

import { TaskManager, Task, UpdateTaskInput, AuditLogEntry } from './taskManager';

// Type definitions
export type AgentType = 'planning' | 'answer' | 'decomposition' | 'verification';
export type AgentStatusType = 'idle' | 'active' | 'error' | 'offline';

export interface AgentStatus {
    agentType: AgentType;
    status: AgentStatusType;
    currentTask: string | null;
    lastActivity: string;
    lastError?: string;
}

export interface AgentMetrics {
    tasksCompleted: number;
    tasksFailed: number;
    avgResponseTime: number;
    failureRate: number;
}

export interface RoutingDecision {
    assignedAgent: AgentType;
    reason: string;
    confidence: number;
}

export interface OrchestratorConfig {
    agentTimeout?: number;
    retryAttempts?: number;
    metricsEnabled?: boolean;
    webSocketSend?: (event: any) => void;
}

export interface AssignOptions {
    force?: boolean;
    fallback?: boolean;
}

export interface TaskResult {
    success: boolean;
    error?: string;
    metrics?: {
        duration?: number;
        [key: string]: any;
    };
}

export interface ShutdownOptions {
    waitForCompletion?: boolean;
    clearMetrics?: boolean;
    timeout?: number;
}

export interface GlobalMetrics {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgResponseTime: number;
    completionRate: number;
    utilization: Record<AgentType, number>;
}

interface AgentState {
    type: AgentType;
    status: AgentStatusType;
    currentTask: string | null;
    lastActivity: Date;
    lastError?: Error;
    metrics: AgentMetrics;
    queue: string[];
    taskStartTimes: Map<string, number>;
    failureCount: number;
}

/**
 * AgentOrchestrator - Master coordinator for multi-agent system
 * Routes tasks, monitors health, implements fallbacks
 */
export class AgentOrchestrator {
    private agents: Map<AgentType, AgentState> = new Map();
    private config: Required<OrchestratorConfig>;
    private taskManager: TaskManager;
    private activeAssignments: Set<string> = new Set();
    private shutdownInProgress: boolean = false;

    constructor(config?: OrchestratorConfig) {
        // Apply configuration with defaults
        this.config = {
            agentTimeout: config?.agentTimeout ?? 30000,
            retryAttempts: config?.retryAttempts ?? 3,
            metricsEnabled: config?.metricsEnabled ?? true,
            webSocketSend: config?.webSocketSend ?? (() => { }),
        };

        // Initialize TaskManager
        this.taskManager = TaskManager.getInstance();

        // Initialize all agent types
        this.initializeAgents();
    }

    /**
     * Initialize all 4 agent types as idle with zero metrics
     */
    private initializeAgents(): void {
        const agentTypes: AgentType[] = ['planning', 'answer', 'decomposition', 'verification'];

        agentTypes.forEach(type => {
            this.agents.set(type, {
                type,
                status: 'idle',
                currentTask: null,
                lastActivity: new Date(),
                metrics: {
                    tasksCompleted: 0,
                    tasksFailed: 0,
                    avgResponseTime: 0,
                    failureRate: 0,
                },
                queue: [],
                taskStartTimes: new Map(),
                failureCount: 0,
            });
        });
    }

    /**
     * Route task based on PRD algorithm
     * Priority:
     * 1. estimatedHours > 1 → decomposition
     * 2. status = 'done' → verification
     * 3. requiresContext → answer
     * 4. hasOpenQuestions → answer
     * 5. default → planning
     */
    routeTask(task: Task): RoutingDecision {
        try {
            // Convert estimated_effort from minutes to hours
            const estimatedHours = (task.estimated_effort || 0) / 60;

            // Priority 1: Large tasks to decomposition
            if (estimatedHours > 1) {
                return {
                    assignedAgent: 'decomposition',
                    reason: 'Task requires decomposition (large task estimated > 1 hour)',
                    confidence: 0.9,
                };
            }

            // Priority 2: Completed tasks to verification
            if (task.status === 'completed' || task.status === 'review') {
                return {
                    assignedAgent: 'verification',
                    reason: 'Task requires verification (completed status)',
                    confidence: 0.95,
                };
            }

            // Priority 3 & 4: Context or questions to answer
            const requiresContext = (task as any).requiresContext === true;
            const hasOpenQuestions = (task as any).hasOpenQuestions === true;

            if (requiresContext) {
                return {
                    assignedAgent: 'answer',
                    reason: 'Task requires additional context',
                    confidence: 0.85,
                };
            }

            if (hasOpenQuestions) {
                return {
                    assignedAgent: 'answer',
                    reason: 'Task has open questions',
                    confidence: 0.85,
                };
            }

            // Default: Planning team
            return {
                assignedAgent: 'planning',
                reason: 'Standard task routed to planning team',
                confidence: 0.8,
            };
        } catch (error) {
            // Graceful fallback on routing errors
            return {
                assignedAgent: 'planning',
                reason: 'Fallback routing due to error',
                confidence: 0.5,
            };
        }
    }

    /**
     * Assign task to appropriate agent
     */
    async assignTask(taskId: string, options: AssignOptions = {}): Promise<void> {
        if (this.shutdownInProgress) {
            throw new Error('Orchestrator is shutting down');
        }

        // Check for double assignment
        if (this.activeAssignments.has(taskId) && !options.force) {
            throw new Error(`Task ${taskId} is already assigned`);
        }

        // Retry wrapper
        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
            try {
                await this.performAssignment(taskId, options);
                return;
            } catch (error) {
                lastError = error as Error;
                if (attempt < this.config.retryAttempts) {
                    await this.delay(Math.pow(2, attempt) * 100); // Exponential backoff
                }
            }
        }

        // All retries failed
        throw lastError || new Error('Assignment failed');
    }

    /**
     * Perform actual task assignment
     */
    private async performAssignment(taskId: string, options: AssignOptions): Promise<void> {
        // Fetch task
        const task = this.taskManager.getTaskById(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Determine routing
        const decision = this.routeTask(task);
        const agentState = this.agents.get(decision.assignedAgent)!;

        // Mark as active assignment
        this.activeAssignments.add(taskId);

        // Update agent state
        if (agentState.status === 'idle') {
            agentState.status = 'active';
            agentState.currentTask = taskId;
            agentState.lastActivity = new Date();
            agentState.taskStartTimes.set(taskId, Date.now());
        } else {
            // Agent is busy, queue the task
            agentState.queue.push(taskId);
        }

        // Update task in database
        try {
            this.taskManager.updateTaskStatus(taskId, 'in_progress', {
                assigned_agent: decision.assignedAgent,
            }, task.version);
        } catch (error) {
            // Log error to audit
            this.logAuditError(taskId, 'assignment_error', error as Error);
            throw error;
        }

        // Send WebSocket update
        this.config.webSocketSend({
            type: 'task_assigned',
            taskId,
            agentType: decision.assignedAgent,
            reason: decision.reason,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Complete task and update metrics
     */
    async completeTask(taskId: string, result: TaskResult): Promise<void> {
        // Find which agent has this task
        let agentState: AgentState | null = null;
        for (const state of this.agents.values()) {
            if (state.currentTask === taskId) {
                agentState = state;
                break;
            }
        }

        if (!agentState) {
            throw new Error(`Task ${taskId} not currently assigned to any agent`);
        }

        // Calculate response time
        const startTime = agentState.taskStartTimes.get(taskId);
        const responseTime = startTime ? Date.now() - startTime : 0;

        // Update metrics
        if (result.success) {
            agentState.metrics.tasksCompleted++;
            agentState.failureCount = 0; // Reset failure counter
        } else {
            agentState.metrics.tasksFailed++;
            agentState.failureCount++;
        }

        // Update average response time
        const totalTasks = agentState.metrics.tasksCompleted + agentState.metrics.tasksFailed;
        const currentAvg = agentState.metrics.avgResponseTime;
        agentState.metrics.avgResponseTime = ((currentAvg * (totalTasks - 1)) + responseTime) / totalTasks;

        // Update failure rate
        agentState.metrics.failureRate = agentState.metrics.tasksFailed / totalTasks;

        // Clear task assignment
        agentState.currentTask = null;
        agentState.taskStartTimes.delete(taskId);
        this.activeAssignments.delete(taskId);

        // Check if agent should move to error state
        if (agentState.failureCount >= 3) {
            agentState.status = 'error';
            agentState.lastError = new Error(result.error || 'Multiple consecutive failures');
        } else if (agentState.queue.length > 0) {
            // Process next task in queue
            const nextTaskId = agentState.queue.shift()!;
            agentState.currentTask = nextTaskId;
            agentState.taskStartTimes.set(nextTaskId, Date.now());
        } else {
            // Return to idle
            agentState.status = 'idle';
        }

        agentState.lastActivity = new Date();

        // Update task status in database
        const task = this.taskManager.getTaskById(taskId);
        if (task) {
            const newStatus = result.success ? 'completed' : 'failed';
            this.taskManager.updateTaskStatus(taskId, newStatus, {
                actual_effort: responseTime / 60000, // Convert ms to minutes
            }, task.version);
        }

        // Send WebSocket update
        this.config.webSocketSend({
            type: 'task_completed',
            taskId,
            agentType: agentState.type,
            success: result.success,
            responseTime,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Handle agent failure
     */
    async handleAgentFailure(agentType: AgentType, error: Error): Promise<void> {
        const agentState = this.agents.get(agentType);
        if (!agentState) {
            throw new Error(`Agent ${agentType} not found`);
        }

        agentState.lastError = error;
        agentState.metrics.tasksFailed++;
        agentState.failureCount++;

        // Update failure rate
        const totalTasks = agentState.metrics.tasksCompleted + agentState.metrics.tasksFailed;
        if (totalTasks > 0) {
            agentState.metrics.failureRate = agentState.metrics.tasksFailed / totalTasks;
        }

        // Mark as error state if multiple failures
        if (agentState.failureCount >= 3) {
            agentState.status = 'error';
        }

        // Clear current task
        if (agentState.currentTask) {
            this.activeAssignments.delete(agentState.currentTask);
            agentState.taskStartTimes.delete(agentState.currentTask);
            agentState.currentTask = null;
        }

        agentState.lastActivity = new Date();

        // Send WebSocket notification
        this.config.webSocketSend({
            type: 'agent_error',
            agentType,
            error: error.message,
            failureCount: agentState.failureCount,
            timestamp: new Date().toISOString(),
        });

        // Log to audit
        this.logAuditError(agentState.currentTask || 'none', 'agent_failure', error);
    }

    /**
     * Get agent status
     */
    getAgentStatus(agentType: AgentType): AgentStatus {
        const state = this.agents.get(agentType);
        if (!state) {
            throw new Error(`Agent ${agentType} not found`);
        }

        return {
            agentType: state.type,
            status: state.status,
            currentTask: state.currentTask,
            lastActivity: state.lastActivity.toISOString(),
            lastError: state.lastError?.message,
        };
    }

    /**
     * Get all agent statuses
     */
    getAllAgentStatus(): AgentStatus[] {
        return Array.from(this.agents.values()).map(state => ({
            agentType: state.type,
            status: state.status,
            currentTask: state.currentTask,
            lastActivity: state.lastActivity.toISOString(),
            lastError: state.lastError?.message,
        }));
    }

    /**
     * Get agent metrics
     */
    getAgentMetrics(agentType: AgentType): AgentMetrics {
        const state = this.agents.get(agentType);
        if (!state) {
            throw new Error(`Agent ${agentType} not found`);
        }

        return { ...state.metrics };
    }

    /**
     * Prioritize tasks
     */
    prioritizeTasks(tasks: Task[]): Task[] {
        const priorityOrder: Record<string, number> = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4,
        };

        return [...tasks].sort((a, b) => {
            // First by priority
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Then by created_at (FIFO)
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    }

    /**
     * Get agent queue size
     */
    getAgentQueueSize(agentType: AgentType): number {
        const state = this.agents.get(agentType);
        return state ? state.queue.length : 0;
    }

    /**
     * Get global metrics
     */
    getMetrics(): GlobalMetrics {
        let totalTasks = 0;
        let completedTasks = 0;
        let failedTasks = 0;
        let totalResponseTime = 0;
        let responseTimeCount = 0;

        const utilization: Record<AgentType, number> = {
            planning: 0,
            answer: 0,
            decomposition: 0,
            verification: 0,
        };

        this.agents.forEach((state, type) => {
            totalTasks += state.metrics.tasksCompleted + state.metrics.tasksFailed;
            completedTasks += state.metrics.tasksCompleted;
            failedTasks += state.metrics.tasksFailed;

            if (state.metrics.avgResponseTime > 0) {
                totalResponseTime += state.metrics.avgResponseTime * (state.metrics.tasksCompleted + state.metrics.tasksFailed);
                responseTimeCount += state.metrics.tasksCompleted + state.metrics.tasksFailed;
            }

            // Calculate utilization (percentage of time agent is active)
            utilization[type] = state.status === 'active' ? 100 : 0;
        });

        const avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
            totalTasks,
            completedTasks,
            failedTasks,
            avgResponseTime,
            completionRate,
            utilization,
        };
    }

    /**
     * Export metrics as JSON
     */
    exportMetrics(): string {
        const agents: Record<string, any> = {};

        this.agents.forEach((state, type) => {
            agents[type] = {
                status: state.status,
                metrics: state.metrics,
                queueSize: state.queue.length,
                lastActivity: state.lastActivity.toISOString(),
            };
        });

        return JSON.stringify({
            agents,
            global: this.getMetrics(),
            timestamp: new Date().toISOString(),
        }, null, 2);
    }

    /**
     * Gracefully shutdown orchestrator
     */
    async shutdown(options: ShutdownOptions = {}): Promise<void> {
        this.shutdownInProgress = true;

        // Wait for in-progress tasks to complete
        if (options.waitForCompletion) {
            const timeout = options.timeout || 30000;
            const startTime = Date.now();

            while (this.activeAssignments.size > 0) {
                if (Date.now() - startTime > timeout) {
                    break; // Timeout exceeded
                }
                await this.delay(100);
            }
        }

        // Mark all agents as offline
        this.agents.forEach(state => {
            state.status = 'offline';
            state.currentTask = null;
            state.queue = [];
            state.taskStartTimes.clear();
        });

        // Clear metrics if requested
        if (options.clearMetrics) {
            this.agents.forEach(state => {
                state.metrics = {
                    tasksCompleted: 0,
                    tasksFailed: 0,
                    avgResponseTime: 0,
                    failureRate: 0,
                };
            });
        }

        // Send shutdown notification
        this.config.webSocketSend({
            type: 'orchestrator_shutdown',
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log audit entry for errors
     */
    private logAuditError(taskId: string, action: string, error: Error): void {
        try {
            const auditEntry: Partial<AuditLogEntry> = {
                task_id: taskId,
                action,
                details: JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                }),
                timestamp: new Date().toISOString(),
            };

            // TaskManager should have logAudit method (add to interface if missing)
            (this.taskManager as any).logAudit?.(auditEntry);
        } catch (auditError) {
            console.error('[AgentOrchestrator] Failed to log audit:', auditError);
        }
    }

    /**
     * Delay helper for retry backoff
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
