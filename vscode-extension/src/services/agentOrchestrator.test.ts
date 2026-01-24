/**
 * Tests for Agent Orchestrator Service
 * Tests the Programming Orchestrator (master coordinator) for multi-agent coordination
 * 
 * Based on PRD specifications:
 * - Routes tasks to appropriate agent based on task type and status
 * - Monitors agent health and performance metrics
 * - Implements fallback strategies when agents fail (30-second timeout)
 * - Aggregates metrics for dashboard display
 */

import { AgentOrchestrator, AgentType, AgentStatus, AgentMetrics, RoutingDecision, OrchestratorConfig } from './agentOrchestrator';
import { TaskManager, Task } from './taskManager';

// Mock dependencies
jest.mock('./taskManager');

describe('AgentOrchestrator', () => {
    let orchestrator: AgentOrchestrator;
    let mockTaskManager: jest.Mocked<TaskManager>;
    let mockWebSocketSend: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock TaskManager
        mockTaskManager = {
            getTaskById: jest.fn(),
            updateTaskStatus: jest.fn(),
            getAllTasks: jest.fn(),
            getNextTask: jest.fn(),
            logAuditEntry: jest.fn(),
        } as any;

        (TaskManager.getInstance as jest.Mock).mockReturnValue(mockTaskManager);

        // Mock WebSocket sender
        mockWebSocketSend = jest.fn();

        const config: OrchestratorConfig = {
            agentTimeout: 30000, // 30 seconds as per PRD
            retryAttempts: 3,
            metricsEnabled: true,
            webSocketSend: mockWebSocketSend
        };

        orchestrator = new AgentOrchestrator(config);
    });

    afterEach(() => {
        if (orchestrator) {
            orchestrator.shutdown();
        }
    });

    describe('Initialization', () => {
        it('should initialize with all agent types', () => {
            const status = orchestrator.getAllAgentStatus();

            expect(status).toHaveLength(4);
            expect(status.map(s => s.agentType)).toContain('planning');
            expect(status.map(s => s.agentType)).toContain('answer');
            expect(status.map(s => s.agentType)).toContain('decomposition');
            expect(status.map(s => s.agentType)).toContain('verification');
        });

        it('should initialize all agents as idle', () => {
            const status = orchestrator.getAllAgentStatus();

            expect(status.every(s => s.status === 'idle')).toBe(true);
            expect(status.every(s => s.currentTask === null)).toBe(true);
        });

        it('should initialize metrics to zero', () => {
            const metrics = orchestrator.getMetrics();

            expect(metrics.tasksCompleted).toBe(0);
            expect(metrics.tasksFailed).toBe(0);
            expect(metrics.avgResponseTime).toBe(0);
            expect(metrics.agentUtilization).toBe(0);
        });

        it('should apply custom configuration', () => {
            const customConfig: OrchestratorConfig = {
                agentTimeout: 60000,
                retryAttempts: 5,
                metricsEnabled: false
            };

            const customOrchestrator = new AgentOrchestrator(customConfig);

            expect(customOrchestrator).toBeDefined();
            customOrchestrator.shutdown();
        });
    });

    describe('Task Routing Algorithm (PRD Specification)', () => {
        it('should route tasks with estimatedHours > 1 to Task Decomposition', () => {
            const task: Task = {
                id: 'task-1',
                name: 'Complex Feature',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                estimatedHours: 2.5,
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            const decision = orchestrator.routeTask(task);

            expect(decision.assignedAgent).toBe('decomposition');
            expect(decision.reason).toContain('estimatedHours > 1');
            expect(decision.confidence).toBeGreaterThan(0.9);
        });

        it('should route tasks with status=done to Verification', () => {
            const task: Task = {
                id: 'task-2',
                name: 'Completed Task',
                task_type: 'feature',
                status: 'done',
                priority: 'medium',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            const decision = orchestrator.routeTask(task);

            expect(decision.assignedAgent).toBe('verification');
            expect(decision.reason).toContain('status = done');
            expect(decision.confidence).toBe(1.0);
        });

        it('should route tasks with requiresContext to Answer Team', () => {
            const task: Task = {
                id: 'task-3',
                name: 'Research Task',
                task_type: 'research',
                status: 'pending',
                priority: 'low',
                requiresContext: true,
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            const decision = orchestrator.routeTask(task);

            expect(decision.assignedAgent).toBe('answer');
            expect(decision.reason).toContain('requiresContext');
        });

        it('should route tasks with hasOpenQuestions to Answer Team', () => {
            const task: Task = {
                id: 'task-4',
                name: 'Task with Questions',
                task_type: 'feature',
                status: 'blocked',
                priority: 'high',
                hasOpenQuestions: true,
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            const decision = orchestrator.routeTask(task);

            expect(decision.assignedAgent).toBe('answer');
            expect(decision.reason).toContain('hasOpenQuestions');
        });

        it('should route default tasks to Planning Team', () => {
            const task: Task = {
                id: 'task-5',
                name: 'Standard Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'medium',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            const decision = orchestrator.routeTask(task);

            expect(decision.assignedAgent).toBe('planning');
            expect(decision.reason).toContain('default routing');
        });

        it('should handle multiple routing conditions correctly', () => {
            // Task meets multiple conditions: estimatedHours > 1 AND done
            // Should prioritize status=done (verification) over decomposition
            const task: Task = {
                id: 'task-6',
                name: 'Complex Completed Task',
                task_type: 'feature',
                status: 'done',
                priority: 'high',
                estimatedHours: 3,
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            const decision = orchestrator.routeTask(task);

            // Verification should take precedence for done tasks
            expect(decision.assignedAgent).toBe('verification');
        });
    });

    describe('Agent Assignment and Dispatch', () => {
        it('should assign task to agent and update agent status', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Test Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                assigned_agent: 'planning',
                version: 2
            });

            await orchestrator.assignTask('task-1');

            const agentStatus = orchestrator.getAgentStatus('planning');

            expect(agentStatus.status).toBe('active');
            expect(agentStatus.currentTask).toBe('task-1');
            expect(mockTaskManager.updateTaskStatus).toHaveBeenCalledWith(
                'task-1',
                'in_progress',
                expect.objectContaining({ assigned_agent: 'planning' }),
                1
            );
        });

        it('should send WebSocket update on task assignment', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Test Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            await orchestrator.assignTask('task-1');

            expect(mockWebSocketSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: 'taskAssigned',
                    taskId: 'task-1',
                    agentType: expect.any(String)
                })
            );
        });

        it('should throw error when assigning non-existent task', async () => {
            mockTaskManager.getTaskById.mockReturnValue(null);

            await expect(orchestrator.assignTask('non-existent'))
                .rejects.toThrow('Task non-existent not found');
        });

        it('should prevent double assignment to same agent', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Test Task',
                task_type: 'feature',
                status: 'in_progress',
                assigned_agent: 'planning',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);

            await expect(orchestrator.assignTask('task-1'))
                .rejects.toThrow('Task task-1 is already assigned to planning');
        });
    });

    describe('Agent Health Monitoring', () => {
        it('should track agent response time', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Test Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            const startTime = Date.now();
            await orchestrator.assignTask('task-1');

            // Simulate task completion
            await new Promise(resolve => setTimeout(resolve, 100));
            await orchestrator.completeTask('task-1', { success: true });

            const metrics = orchestrator.getAgentMetrics('planning');
            expect(metrics.avgResponseTime).toBeGreaterThan(0);
            expect(metrics.tasksCompleted).toBe(1);
        });

        it('should track agent failure rate', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Test Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            await orchestrator.assignTask('task-1');
            await orchestrator.completeTask('task-1', { success: false, error: 'Agent error' });

            const metrics = orchestrator.getAgentMetrics('planning');
            expect(metrics.failureRate).toBeGreaterThan(0);
            expect(metrics.tasksFailed).toBe(1);
        });

        it('should mark agent as error state on repeated failures', async () => {
            const task1: Task = {
                id: 'task-1',
                name: 'Test Task 1',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            const task2: Task = { ...task1, id: 'task-2', name: 'Test Task 2' };
            const task3: Task = { ...task1, id: 'task-3', name: 'Test Task 3' };

            mockTaskManager.getTaskById
                .mockReturnValueOnce(task1)
                .mockReturnValueOnce(task2)
                .mockReturnValueOnce(task3);

            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task1,
                status: 'in_progress',
                version: 2
            });

            // Simulate 3 consecutive failures
            for (const taskId of ['task-1', 'task-2', 'task-3']) {
                await orchestrator.assignTask(taskId);
                await orchestrator.completeTask(taskId, { success: false, error: 'Failure' });
            }

            const agentStatus = orchestrator.getAgentStatus('planning');
            expect(agentStatus.status).toBe('error');
            expect(agentStatus.lastError).toBeDefined();
        });

        it('should calculate agent utilization percentage', () => {
            const metrics = orchestrator.getMetrics();

            // Initially 0% utilization (all idle)
            expect(metrics.agentUtilization).toBe(0);
        });
    });

    describe('Fallback Strategies and Timeouts', () => {
        it('should timeout agent after 30 seconds (PRD requirement)', async () => {
            jest.useFakeTimers();

            const task: Task = {
                id: 'task-1',
                name: 'Long Running Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            const assignPromise = orchestrator.assignTask('task-1', { waitForCompletion: true });

            // Fast-forward 30 seconds
            jest.advanceTimersByTime(30000);

            await expect(assignPromise).rejects.toThrow('Agent timeout after 30000ms');

            jest.useRealTimers();
        });

        it('should implement fallback to alternate agent on timeout', async () => {
            jest.useFakeTimers();

            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            const assignPromise = orchestrator.assignTask('task-1', {
                waitForCompletion: true,
                enableFallback: true
            });

            // Trigger timeout
            jest.advanceTimersByTime(30000);

            await assignPromise;

            // Should have attempted fallback
            expect(mockTaskManager.logAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'agent_fallback',
                    task_id: 'task-1'
                })
            );

            jest.useRealTimers();
        });

        it('should retry failed agent operations up to configured limit', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus
                .mockImplementationOnce(() => { throw new Error('Temporary failure'); })
                .mockImplementationOnce(() => { throw new Error('Temporary failure'); })
                .mockReturnValue({ ...task, status: 'in_progress', version: 2 });

            await orchestrator.assignTask('task-1', { retryOnFailure: true });

            // Should have retried and succeeded on 3rd attempt
            expect(mockTaskManager.updateTaskStatus).toHaveBeenCalledTimes(3);
        });

        it('should fail after exhausting retry attempts', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockImplementation(() => {
                throw new Error('Persistent failure');
            });

            await expect(orchestrator.assignTask('task-1', { retryOnFailure: true }))
                .rejects.toThrow('Failed after 3 retry attempts');
        });
    });

    describe('Priority Handling', () => {
        it('should prioritize critical tasks', () => {
            const tasks: Task[] = [
                {
                    id: 'task-1',
                    name: 'Low Priority',
                    task_type: 'feature',
                    status: 'pending',
                    priority: 'low',
                    project_id: 'proj-1',
                    created_at: '2026-01-20T10:00:00Z',
                    updated_at: '2026-01-20T10:00:00Z',
                    version: 1
                },
                {
                    id: 'task-2',
                    name: 'Critical Priority',
                    task_type: 'bug',
                    status: 'pending',
                    priority: 'critical',
                    project_id: 'proj-1',
                    created_at: '2026-01-20T11:00:00Z',
                    updated_at: '2026-01-20T11:00:00Z',
                    version: 1
                },
                {
                    id: 'task-3',
                    name: 'High Priority',
                    task_type: 'feature',
                    status: 'pending',
                    priority: 'high',
                    project_id: 'proj-1',
                    created_at: '2026-01-20T09:00:00Z',
                    updated_at: '2026-01-20T09:00:00Z',
                    version: 1
                }
            ];

            const sorted = orchestrator.prioritizeTasks(tasks);

            expect(sorted[0].id).toBe('task-2'); // Critical
            expect(sorted[1].id).toBe('task-3'); // High
            expect(sorted[2].id).toBe('task-1'); // Low
        });

        it('should use FIFO for tasks with same priority', () => {
            const tasks: Task[] = [
                {
                    id: 'task-1',
                    name: 'First',
                    task_type: 'feature',
                    status: 'pending',
                    priority: 'medium',
                    project_id: 'proj-1',
                    created_at: '2026-01-20T10:00:00Z',
                    updated_at: '2026-01-20T10:00:00Z',
                    version: 1
                },
                {
                    id: 'task-2',
                    name: 'Second',
                    task_type: 'feature',
                    status: 'pending',
                    priority: 'medium',
                    project_id: 'proj-1',
                    created_at: '2026-01-20T11:00:00Z',
                    updated_at: '2026-01-20T11:00:00Z',
                    version: 1
                }
            ];

            const sorted = orchestrator.prioritizeTasks(tasks);

            expect(sorted[0].id).toBe('task-1'); // Earlier created_at
            expect(sorted[1].id).toBe('task-2');
        });
    });

    describe('State Management', () => {
        it('should track current agent states', () => {
            const states = orchestrator.getAllAgentStatus();

            expect(states).toHaveLength(4);
            states.forEach(state => {
                expect(state).toHaveProperty('agentType');
                expect(state).toHaveProperty('status');
                expect(state).toHaveProperty('currentTask');
                expect(state).toHaveProperty('lastActivity');
            });
        });

        it('should update agent state on task completion', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            await orchestrator.assignTask('task-1');

            let status = orchestrator.getAgentStatus('planning');
            expect(status.status).toBe('active');

            await orchestrator.completeTask('task-1', { success: true });

            status = orchestrator.getAgentStatus('planning');
            expect(status.status).toBe('idle');
            expect(status.currentTask).toBeNull();
        });

        it('should maintain agent activity timestamps', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            const beforeTime = Date.now();
            await orchestrator.assignTask('task-1');
            const afterTime = Date.now();

            const status = orchestrator.getAgentStatus('planning');
            const activityTime = new Date(status.lastActivity).getTime();

            expect(activityTime).toBeGreaterThanOrEqual(beforeTime);
            expect(activityTime).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('Metrics and Aggregation', () => {
        it('should aggregate metrics from all agents', async () => {
            // Create and complete tasks for multiple agents
            const tasks: Task[] = [
                {
                    id: 'task-1',
                    name: 'Planning Task',
                    task_type: 'feature',
                    status: 'pending',
                    priority: 'high',
                    project_id: 'proj-1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    version: 1
                },
                {
                    id: 'task-2',
                    name: 'Verification Task',
                    task_type: 'feature',
                    status: 'done',
                    priority: 'high',
                    project_id: 'proj-1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    version: 1
                }
            ];

            mockTaskManager.getTaskById
                .mockReturnValueOnce(tasks[0])
                .mockReturnValueOnce(tasks[1]);

            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...tasks[0],
                status: 'in_progress',
                version: 2
            });

            await orchestrator.assignTask('task-1');
            await orchestrator.assignTask('task-2');

            await orchestrator.completeTask('task-1', { success: true });
            await orchestrator.completeTask('task-2', { success: true });

            const metrics = orchestrator.getMetrics();

            expect(metrics.tasksCompleted).toBe(2);
            expect(metrics.tasksFailed).toBe(0);
        });

        it('should calculate completion rate', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            // Complete 3 tasks successfully, 1 failure
            for (let i = 1; i <= 4; i++) {
                await orchestrator.assignTask(`task-${i}`);
                await orchestrator.completeTask(`task-${i}`, {
                    success: i <= 3
                });
            }

            const metrics = orchestrator.getMetrics();

            expect(metrics.completionRate).toBeCloseTo(0.75, 2); // 75%
        });

        it('should export metrics in JSON format', () => {
            const json = orchestrator.exportMetrics();

            expect(json).toContain('tasksCompleted');
            expect(json).toContain('avgResponseTime');
            expect(json).toContain('agentUtilization');
            expect(() => JSON.parse(json)).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle task routing errors gracefully', () => {
            const invalidTask: any = {
                id: 'task-1',
                // Missing required fields
            };

            expect(() => orchestrator.routeTask(invalidTask))
                .toThrow();
        });

        it('should log errors to audit log', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockImplementation(() => {
                throw new Error('Database error');
            });

            await expect(orchestrator.assignTask('task-1'))
                .rejects.toThrow('Database error');

            expect(mockTaskManager.logAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'agent_error',
                    task_id: 'task-1'
                })
            );
        });

        it('should recover from agent crashes', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            await orchestrator.assignTask('task-1');

            // Simulate crash
            await orchestrator.handleAgentFailure('planning', new Error('Agent crashed'));

            const status = orchestrator.getAgentStatus('planning');
            expect(status.status).toBe('error');
            expect(status.currentTask).toBeNull();
        });

        it('should send error notifications via WebSocket', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            await orchestrator.assignTask('task-1');
            await orchestrator.completeTask('task-1', {
                success: false,
                error: 'Task failed'
            });

            expect(mockWebSocketSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: 'agentError',
                    agentType: 'planning',
                    error: expect.any(String)
                })
            );
        });
    });

    describe('Concurrent Task Handling', () => {
        it('should handle multiple tasks in parallel across agents', async () => {
            const tasks: Task[] = [
                {
                    id: 'task-1',
                    name: 'Planning Task',
                    task_type: 'feature',
                    status: 'pending',
                    priority: 'high',
                    project_id: 'proj-1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    version: 1
                },
                {
                    id: 'task-2',
                    name: 'Decomposition Task',
                    task_type: 'feature',
                    status: 'pending',
                    priority: 'high',
                    estimatedHours: 2,
                    project_id: 'proj-1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    version: 1
                },
                {
                    id: 'task-3',
                    name: 'Answer Task',
                    task_type: 'feature',
                    status: 'pending',
                    priority: 'high',
                    requiresContext: true,
                    project_id: 'proj-1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    version: 1
                }
            ];

            mockTaskManager.getTaskById
                .mockReturnValueOnce(tasks[0])
                .mockReturnValueOnce(tasks[1])
                .mockReturnValueOnce(tasks[2]);

            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...tasks[0],
                status: 'in_progress',
                version: 2
            });

            await Promise.all([
                orchestrator.assignTask('task-1'),
                orchestrator.assignTask('task-2'),
                orchestrator.assignTask('task-3')
            ]);

            // All three different agents should be active
            expect(orchestrator.getAgentStatus('planning').status).toBe('active');
            expect(orchestrator.getAgentStatus('decomposition').status).toBe('active');
            expect(orchestrator.getAgentStatus('answer').status).toBe('active');
        });

        it('should queue tasks when agent is busy', async () => {
            const task1: Task = {
                id: 'task-1',
                name: 'First Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            const task2: Task = {
                id: 'task-2',
                name: 'Second Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById
                .mockReturnValueOnce(task1)
                .mockReturnValueOnce(task2);

            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task1,
                status: 'in_progress',
                version: 2
            });

            await orchestrator.assignTask('task-1');

            // Both route to same agent (planning), should queue second
            await orchestrator.assignTask('task-2', { queueIfBusy: true });

            const queueSize = orchestrator.getAgentQueueSize('planning');
            expect(queueSize).toBeGreaterThan(0);
        });
    });

    describe('Shutdown and Cleanup', () => {
        it('should gracefully shutdown all agents', () => {
            orchestrator.shutdown();

            const status = orchestrator.getAllAgentStatus();
            status.forEach(s => {
                expect(s.status).toBe('offline');
            });
        });

        it('should complete in-progress tasks before shutdown', async () => {
            const task: Task = {
                id: 'task-1',
                name: 'Task',
                task_type: 'feature',
                status: 'pending',
                priority: 'high',
                project_id: 'proj-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1
            };

            mockTaskManager.getTaskById.mockReturnValue(task);
            mockTaskManager.updateTaskStatus.mockReturnValue({
                ...task,
                status: 'in_progress',
                version: 2
            });

            await orchestrator.assignTask('task-1');

            const shutdownPromise = orchestrator.shutdown({ graceful: true });

            await orchestrator.completeTask('task-1', { success: true });

            await shutdownPromise;

            expect(orchestrator.getAgentStatus('planning').currentTask).toBeNull();
        });

        it('should clear all metrics on shutdown', () => {
            orchestrator.shutdown();

            const metrics = orchestrator.getMetrics();
            expect(metrics.tasksCompleted).toBe(0);
            expect(metrics.tasksFailed).toBe(0);
        });
    });
});
