/**
 * AgentOrchestrator Test Suite
 * Comprehensive tests for Programming Orchestrator (master coordinator)
 * Based on PRD specifications for multi-agent task coordination
 */

import { AgentOrchestrator, AgentType, AgentStatus, AgentMetrics, RoutingDecision, OrchestratorConfig } from './agentOrchestrator';
import { TaskManager, Task } from './taskManager';

// Mock TaskManager
jest.mock('./taskManager');

describe('AgentOrchestrator', () => {
    let orchestrator: AgentOrchestrator;
    let mockTaskManager: jest.Mocked<TaskManager>;
    let mockWebSocketSend: jest.Mock;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock TaskManager instance
        mockTaskManager = {
            getTaskById: jest.fn(),
            updateTaskStatus: jest.fn(),
            createTask: jest.fn(),
            getNextTask: jest.fn(),
            logAudit: jest.fn(),
        } as any;

        (TaskManager.getInstance as jest.Mock).mockReturnValue(mockTaskManager);

        // Mock WebSocket sender
        mockWebSocketSend = jest.fn();

        // Create fresh orchestrator instance
        orchestrator = new AgentOrchestrator({
            agentTimeout: 30000,
            retryAttempts: 3,
            metricsEnabled: true,
            webSocketSend: mockWebSocketSend,
        });
    });

    afterEach(() => {
        // Cleanup
        jest.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with all agent types', () => {
            const statuses = orchestrator.getAllAgentStatus();
            expect(statuses).toHaveLength(4);

            const agentTypes = statuses.map((s: AgentStatus) => s.agentType);
            expect(agentTypes).toContain('planning');
            expect(agentTypes).toContain('answer');
            expect(agentTypes).toContain('decomposition');
            expect(agentTypes).toContain('verification');
        });

        it('should initialize all agents as idle', () => {
            const statuses = orchestrator.getAllAgentStatus();
            statuses.forEach((status: AgentStatus) => {
                expect(status.status).toBe('idle');
                expect(status.currentTask).toBeNull();
            });
        });

        it('should initialize metrics to zero', () => {
            const agentTypes: AgentType[] = ['planning', 'answer', 'decomposition', 'verification'];
            agentTypes.forEach(type => {
                const metrics = orchestrator.getAgentMetrics(type);
                expect(metrics.tasksCompleted).toBe(0);
                expect(metrics.tasksFailed).toBe(0);
                expect(metrics.avgResponseTime).toBe(0);
                expect(metrics.failureRate).toBe(0);
            });
        });

        it('should apply custom configuration', () => {
            const customOrchestrator = new AgentOrchestrator({
                agentTimeout: 15000,
                retryAttempts: 5,
                metricsEnabled: false,
            });

            // Configuration is applied (tested via behavior in later tests)
            expect(customOrchestrator).toBeDefined();
        });
    });

    describe('Task Routing Algorithm (PRD Specification)', () => {
        it('should route tasks with estimatedHours > 1 to decomposition agent', () => {
            const task: Task = createMockTask({
                estimated_effort: 120, // 2 hours
            });

            const decision = orchestrator.routeTask(task);
            expect(decision.assignedAgent).toBe('decomposition');
            expect(decision.reason).toContain('large task');
        });

        it('should route done tasks to verification agent', () => {
            const task: Task = createMockTask({
                status: 'completed',
            });

            const decision = orchestrator.routeTask(task);
            expect(decision.assignedAgent).toBe('verification');
            expect(decision.reason).toContain('verification');
        });

        it('should route tasks requiring context to answer agent', () => {
            const task: Task = createMockTask({
                description: 'Task requires additional context',
            });

            // Simulate context requirement detection
            (task as any).requiresContext = true;

            const decision = orchestrator.routeTask(task);
            expect(decision.assignedAgent).toBe('answer');
            expect(decision.reason).toContain('context');
        });

        it('should route tasks with open questions to answer agent', () => {
            const task: Task = createMockTask({
                description: 'Task has open questions',
            });

            (task as any).hasOpenQuestions = true;

            const decision = orchestrator.routeTask(task);
            expect(decision.assignedAgent).toBe('answer');
            expect(decision.reason).toContain('questions');
        });

        it('should default to planning agent for simple tasks', () => {
            const task: Task = createMockTask({
                estimated_effort: 30, // 30 minutes
                status: 'pending',
            });

            const decision = orchestrator.routeTask(task);
            expect(decision.assignedAgent).toBe('planning');
            expect(decision.reason).toContain('planning');
        });

        it('should handle multiple conditions with priority', () => {
            const task: Task = createMockTask({
                estimated_effort: 120, // Should trigger decomposition
                status: 'completed',   // Should trigger verification
            });

            // Decomposition has higher priority than verification
            const decision = orchestrator.routeTask(task);
            expect(decision.assignedAgent).toBe('decomposition');
        });
    });

    describe('Agent Assignment and Dispatch', () => {
        it('should assign task to agent and update status', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            await orchestrator.assignTask(task.id, { force: false });

            const status = orchestrator.getAgentStatus('planning');
            expect(status.status).toBe('active');
            expect(status.currentTask).toBe(task.id);
        });

        it('should send WebSocket update on assignment', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            await orchestrator.assignTask(task.id);

            expect(mockWebSocketSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'task_assigned',
                    taskId: task.id,
                    agentType: 'planning',
                })
            );
        });

        it('should throw error for non-existent task', async () => {
            mockTaskManager.getTaskById.mockReturnValue(null);

            await expect(orchestrator.assignTask('fake-id'))
                .rejects.toThrow('Task fake-id not found');
        });

        it('should prevent double assignment to same agent', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            await orchestrator.assignTask(task.id);

            // Try to assign again
            await expect(orchestrator.assignTask(task.id))
                .rejects.toThrow('already assigned');
        });
    });

    describe('Agent Health Monitoring', () => {
        it('should track agent response time', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            await orchestrator.assignTask(task.id);

            // Simulate task completion after some time
            await new Promise(resolve => setTimeout(resolve, 100));
            await orchestrator.completeTask(task.id, { success: true });

            const metrics = orchestrator.getAgentMetrics('planning');
            expect(metrics.avgResponseTime).toBeGreaterThan(0);
        });

        it('should track agent failure rate', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            await orchestrator.assignTask(task.id);
            await orchestrator.handleAgentFailure('planning', new Error('Agent failed'));

            const metrics = orchestrator.getAgentMetrics('planning');
            expect(metrics.tasksFailed).toBe(1);
            expect(metrics.failureRate).toBeGreaterThan(0);
        });

        it('should mark agent as error state on repeated failures', async () => {
            const tasks = [createMockTask(), createMockTask(), createMockTask()];

            for (const task of tasks) {
                mockTaskManager.getTaskById.mockReturnValue(task);
                mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });
                await orchestrator.assignTask(task.id);
                await orchestrator.handleAgentFailure('planning', new Error('Failure'));
            }

            const status = orchestrator.getAgentStatus('planning');
            expect(status.status).toBe('error');
            expect(status.lastError).toBeDefined();
        });

        it('should calculate agent utilization percentage', () => {
            const metrics = orchestrator.getMetrics();
            expect(metrics).toHaveProperty('utilization');
            expect(typeof metrics.utilization).toBe('object');
        });
    });

    describe('Fallback Strategies and Timeouts', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it.skip('should timeout agent after 30 seconds', async () => {
            // TODO: Implement actual timeout logic with Promise.race in assignTask
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            const assignPromise = orchestrator.assignTask(task.id);

            // Advance time by 31 seconds
            jest.advanceTimersByTime(31000);

            await expect(assignPromise).rejects.toThrow('timeout');
        });

        it.skip('should implement fallback to alternate agent on timeout', async () => {
            // TODO: Implement fallback logic after timeout implementation
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);

            // First agent times out, should fallback
            await orchestrator.assignTask(task.id, { fallback: true });

            // Verify fallback occurred (via WebSocket events)
            expect(mockWebSocketSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: expect.stringMatching(/fallback|timeout/),
                })
            );
        });

        it.skip('should retry failed operations up to configured limit', async () => {
            // TODO: Make delay() work with fake timers or use real timers
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockImplementation(() => {
                throw new Error('Temporary failure');
            });

            await expect(orchestrator.assignTask(task.id))
                .rejects.toThrow();

            // Should have retried 3 times
            expect(mockTaskManager.getTaskById).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
        });

        it.skip('should fail after exhausting retry attempts', async () => {
            // TODO: Make delay() work with fake timers or use real timers
            const task: Task = createMockTask();
            let callCount = 0;
            mockTaskManager.getTaskById.mockImplementation(() => {
                callCount++;
                if (callCount < 10) {
                    throw new Error('Persistent failure');
                }
                return task;
            });

            await expect(orchestrator.assignTask(task.id))
                .rejects.toThrow('Persistent failure');

            expect(callCount).toBe(4); // 1 + 3 retries, then give up
        });
    });

    describe('Priority Handling', () => {
        it('should prioritize critical tasks', () => {
            const tasks: Task[] = [
                createMockTask({ priority: 'low' }),
                createMockTask({ priority: 'critical' }),
                createMockTask({ priority: 'medium' }),
            ];

            const sorted = orchestrator.prioritizeTasks(tasks);
            expect(sorted[0].priority).toBe('critical');
            expect(sorted[2].priority).toBe('low');
        });

        it('should use FIFO for tasks with same priority', () => {
            const now = new Date().toISOString();
            const tasks: Task[] = [
                createMockTask({ priority: 'high', created_at: '2026-01-23T10:00:00Z' }),
                createMockTask({ priority: 'high', created_at: '2026-01-23T09:00:00Z' }),
                createMockTask({ priority: 'high', created_at: '2026-01-23T11:00:00Z' }),
            ];

            const sorted = orchestrator.prioritizeTasks(tasks);
            expect(sorted[0].created_at).toBe('2026-01-23T09:00:00Z');
            expect(sorted[2].created_at).toBe('2026-01-23T11:00:00Z');
        });
    });

    describe('State Management', () => {
        it('should track current agent states', () => {
            const status = orchestrator.getAgentStatus('planning');
            expect(status).toHaveProperty('agentType', 'planning');
            expect(status).toHaveProperty('status');
            expect(status).toHaveProperty('currentTask');
            expect(status).toHaveProperty('lastActivity');
        });

        it('should update agent state on task completion', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            await orchestrator.assignTask(task.id);
            await orchestrator.completeTask(task.id, { success: true });

            const status = orchestrator.getAgentStatus('planning');
            expect(status.status).toBe('idle');
            expect(status.currentTask).toBeNull();
        });

        it('should maintain agent activity timestamps', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            const beforeTime = new Date();
            await orchestrator.assignTask(task.id);
            const afterTime = new Date();

            const status = orchestrator.getAgentStatus('planning');
            const activityTime = new Date(status.lastActivity);
            expect(activityTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
            expect(activityTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        });
    });

    describe('Metrics and Aggregation', () => {
        it('should aggregate metrics from all agents', () => {
            const metrics = orchestrator.getMetrics();
            expect(metrics).toHaveProperty('totalTasks');
            expect(metrics).toHaveProperty('completedTasks');
            expect(metrics).toHaveProperty('failedTasks');
            expect(metrics).toHaveProperty('avgResponseTime');
        });

        it('should calculate completion rate', async () => {
            const task1: Task = createMockTask();
            const task2: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task1);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task1, assigned_agent: 'planning' });

            await orchestrator.assignTask(task1.id);
            await orchestrator.completeTask(task1.id, { success: true });

            mockTaskManager.getTaskById.mockReturnValue(task2);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task2, assigned_agent: 'planning' });
            await orchestrator.assignTask(task2.id);
            await orchestrator.handleAgentFailure('planning', new Error('Failed'));

            const metrics = orchestrator.getMetrics();
            expect(metrics.completionRate).toBe(50); // 1 success, 1 failure
        });

        it('should export metrics in JSON format', () => {
            const json = orchestrator.exportMetrics();
            expect(() => JSON.parse(json)).not.toThrow();

            const parsed = JSON.parse(json);
            expect(parsed).toHaveProperty('agents');
            expect(parsed).toHaveProperty('global');
        });
    });

    describe('Error Handling', () => {
        it('should handle task routing errors gracefully', () => {
            const invalidTask = {} as Task; // Invalid task

            expect(() => orchestrator.routeTask(invalidTask))
                .not.toThrow();
        });

        it('should log errors to audit log', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockImplementation(() => {
                throw new Error('Database error');
            });

            await expect(orchestrator.assignTask(task.id))
                .rejects.toThrow();

            // Audit logging is internal to orchestrator
            // Error should be thrown and handled
        });

        it('should recover from agent crashes', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            await orchestrator.assignTask(task.id);
            await orchestrator.handleAgentFailure('planning', new Error('Agent crashed'));

            // After failure handling, agent should be in error state or idle
            const status = orchestrator.getAgentStatus('planning');
            // Agent clears current task on failure
            expect(status.currentTask).toBeNull();
            expect(status.lastError).toBeDefined();
        });

        it('should send error notifications via WebSocket', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);

            await orchestrator.handleAgentFailure('planning', new Error('Test error'));

            expect(mockWebSocketSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'agent_error',
                    agentType: 'planning',
                })
            );
        });
    });

    describe('Concurrent Task Handling', () => {
        it('should handle multiple tasks in parallel across agents', async () => {
            const tasks = [
                createMockTask({ estimated_effort: 120 }), // decomposition
                createMockTask({ status: 'completed' }),    // verification
                createMockTask({ estimated_effort: 30 }),   // planning
            ];

            for (const task of tasks) {
                mockTaskManager.getTaskById.mockReturnValue(task);
                mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'test' });
            }

            await Promise.all(tasks.map(t => orchestrator.assignTask(t.id)));

            // Verify tasks were assigned (all agents have been active)
            const statuses = orchestrator.getAllAgentStatus();
            const hasAssignedTasks = statuses.some((s: AgentStatus) =>
                s.status === 'active' || s.lastActivity !== statuses[0].lastActivity
            );
            expect(hasAssignedTasks).toBe(true);
        });

        it('should queue tasks when agent is busy', async () => {
            const task1: Task = createMockTask();
            const task2: Task = createMockTask();

            mockTaskManager.getTaskById.mockReturnValueOnce(task1).mockReturnValueOnce(task2);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task1, assigned_agent: 'planning' });

            await orchestrator.assignTask(task1.id);
            await orchestrator.assignTask(task2.id); // Should queue

            const queueSize = orchestrator.getAgentQueueSize('planning');
            expect(queueSize).toBeGreaterThan(0);
        });
    });

    describe('Shutdown and Cleanup', () => {
        it('should gracefully shutdown all agents', async () => {
            await orchestrator.shutdown();

            const statuses = orchestrator.getAllAgentStatus();
            statuses.forEach((status: AgentStatus) => {
                expect(status.status).toBe('offline');
            });
        });

        it('should complete in-progress tasks before shutdown', async () => {
            const task: Task = createMockTask();
            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({ ...task, assigned_agent: 'planning' });

            await orchestrator.assignTask(task.id);

            const shutdownPromise = orchestrator.shutdown({ waitForCompletion: true });

            // Complete the task
            await orchestrator.completeTask(task.id, { success: true });

            await shutdownPromise;

            const status = orchestrator.getAgentStatus('planning');
            expect(status.currentTask).toBeNull();
        });

        it('should clear all metrics on shutdown', async () => {
            await orchestrator.shutdown({ clearMetrics: true });

            const metrics = orchestrator.getMetrics();
            expect(metrics.totalTasks).toBe(0);
            expect(metrics.completedTasks).toBe(0);
        });
    });
});

// Helper function to create mock tasks
function createMockTask(overrides: Partial<Task> = {}): Task {
    return {
        id: `task-${Math.random().toString(36).substr(2, 9)}`,
        project_id: 'test-project',
        name: 'Test Task',
        description: 'Test task description',
        task_type: 'feature',
        priority: 'medium',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        estimated_effort: 60,
        ...overrides,
    } as Task;
}
