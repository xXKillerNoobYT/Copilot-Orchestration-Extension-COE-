import { TaskService, Task } from './services/taskService';
import { GitHubSyncService, TaskData as GitHubTaskData } from './services/githubSyncService';
import { NotificationService, DecompositionNotification } from './services/notificationService';

export interface DecompositionAgentOptions {
    pollIntervalMs?: number;
    effortThresholdMinutes?: number; // >60 minutes triggers decomposition
    projectId?: string; // optional explicit project ID
}

export interface DecompositionSummary {
    originalTaskId: string;
    subtaskCount: number;
    subtasks: Array<{
        title: string;
        estimated_effort: number; // minutes
        dependency?: string; // parent or previous subtask
        type: Task['task_type'];
        priority: Task['priority'];
    }>;
    impact: {
        timeline_change_minutes: number;
        parallel_opportunities: string[];
    };
}

/**
 * DecompositionAgent
 * Monitors tasks and auto-decomposes work items > effortThreshold into 3–5 subtasks.
 * Creates GitHub sub-issues for each subtask (labelled and linked via body content).
 */
export class DecompositionAgent {
    private readonly pollIntervalMs: number;
    private readonly effortThresholdMinutes: number;
    private readonly taskService: TaskService;
    private readonly notificationService: NotificationService;
    private githubSync?: GitHubSyncService;
    private running = false;

    constructor(options?: DecompositionAgentOptions, githubSync?: GitHubSyncService) {
        this.pollIntervalMs = options?.pollIntervalMs ?? 10_000;
        this.effortThresholdMinutes = options?.effortThresholdMinutes ?? 60;
        this.taskService = TaskService.getInstance();
        this.notificationService = NotificationService.getInstance();
        this.githubSync = githubSync;
    }

    initialize(): void {
        // No-op for now; reserved for future hooks
    }

    async monitor(projectId?: string): Promise<void> {
        if (this.running) return;
        this.running = true;

        const pid = projectId || this.taskService.getProjectId();
        // Simple polling loop (stoppable in future)
        try {
            const tasks = await this.taskService.getTasks(pid, { status: 'pending' });
            for (const task of tasks) {
                if (this.shouldDecompose(task)) {
                    const subtasks = this.generateSubtasks(task);
                    const summary = this.buildSummary(task, subtasks);

                    // Notify user with rich UI and capture action
                    const notificationData: DecompositionNotification = {
                        originalTaskId: task.id,
                        originalTaskTitle: task.name,
                        subtaskCount: summary.subtaskCount,
                        subtasks: summary.subtasks,
                        impact: summary.impact,
                    };

                    const userAction = await this.notificationService.showDecompositionSummary(
                        notificationData
                    );

                    console.log('[DecompositionAgent] User action:', userAction);

                    if (userAction === 'accept') {
                        // Create GitHub sub-issues if configured
                        if (this.githubSync) {
                            await this.createGitHubSubIssues(task, subtasks);
                        }
                        console.log('[DecompositionAgent] Decomposition accepted and applied');
                    } else if (userAction === 'reject') {
                        console.log('[DecompositionAgent] Decomposition rejected by user');
                    } else if (userAction === 'edit') {
                        console.log('[DecompositionAgent] Decomposition edit requested (future: open edit UI)');
                    }
                }
            }
        } catch (err) {
            console.error('[DecompositionAgent] monitor error', err);
        } finally {
            this.running = false;
        }
    }

    shouldDecompose(task: Task): boolean {
        const hasFlag = (task.description || '').toLowerCase().includes('needs-decomposition');
        const overThreshold = (task.estimated_effort || 0) > this.effortThresholdMinutes;
        return overThreshold || hasFlag;
    }

    generateSubtasks(parent: Task): Array<Pick<Task, 'name' | 'description' | 'task_type' | 'priority'> & { estimated_effort: number; dependency?: string }> {
        const phases = [
            { title: 'Analysis & Plan', type: 'feature' as const },
            { title: 'Core Implementation', type: 'feature' as const },
            { title: 'Integration & Tests', type: 'testing' as const },
            { title: 'Documentation', type: 'documentation' as const },
            { title: 'Review & Polish', type: 'maintenance' as const },
        ];

        // Choose 3–5 phases based on effort
        const total = Math.min(5, Math.max(3, Math.ceil((parent.estimated_effort || 90) / 60)));
        const chosen = phases.slice(0, total);
        const perSubEffort = Math.max(15, Math.floor((parent.estimated_effort || total * 30) / total));

        return chosen.map((phase, idx) => ({
            name: `${phase.title}: ${parent.name}`,
            description: `${phase.title} for task ${parent.id}. ${parent.description || ''}`.trim(),
            task_type: phase.type,
            priority: parent.priority,
            estimated_effort: perSubEffort,
            dependency: idx > 0 ? chosen[idx - 1].title : undefined,
        }));
    }

    private buildSummary(parent: Task, subtasks: ReturnType<DecompositionAgent['generateSubtasks']>): DecompositionSummary {
        const totalMinutes = subtasks.reduce((sum, s) => sum + s.estimated_effort, 0);
        return {
            originalTaskId: parent.id,
            subtaskCount: subtasks.length,
            subtasks: subtasks.map(s => ({
                title: s.name,
                estimated_effort: s.estimated_effort,
                dependency: s.dependency,
                type: s.task_type,
                priority: s.priority,
            })),
            impact: {
                timeline_change_minutes: totalMinutes - (parent.estimated_effort || totalMinutes),
                parallel_opportunities: ['Testing can run parallel with documentation'],
            },
        };
    }

    private async createGitHubSubIssues(parent: Task, subtasks: ReturnType<DecompositionAgent['generateSubtasks']>): Promise<void> {
        if (!this.githubSync) return;
        for (const s of subtasks) {
            const payload: GitHubTaskData = {
                id: `${parent.id}-sub-${s.name.replace(/\s+/g, '-')}`,
                title: s.name,
                description: `Parent Task ID: ${parent.id}\n\n${s.description}`,
                status: 'pending',
                priority: s.priority,
                labels: ['subtask', 'decomposition'],
                assignees: [],
                updated_at: new Date().toISOString(),
            };
            await this.githubSync.syncTaskToGitHub(payload);
        }
    }
}

export function defaultDecompositionAgent(options?: DecompositionAgentOptions, githubSync?: GitHubSyncService): DecompositionAgent {
    return new DecompositionAgent(options, githubSync);
}
