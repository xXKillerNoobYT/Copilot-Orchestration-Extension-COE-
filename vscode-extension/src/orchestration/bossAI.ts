/**
 * F036: Boss AI Team - Basic Coordination
 *
 * Top-level supervisor AI for multi-agent coordination, task routing,
 * and conflict resolution.
 *
 * Acceptance Criteria:
 * - Routes tasks to appropriate agent teams
 * - Monitors team status and metrics
 * - Detects basic conflicts (plan vs. execution drift)
 * - Aggregates metrics for dashboard
 * - Handles team status changes
 */

import { AgentTeam, routeTask, Task } from '../routing/taskRouter';

/** Optional hooks to integrate external agents */
export interface BossAIHooks {
    onDecomposition?: (task: Task) => Promise<void> | void;
}

/**
 * Team status tracked by Boss AI
 */
export enum TeamStatus {
    Idle = 'Idle',
    Active = 'Active',
    Error = 'Error',
}

/**
 * Agent team state
 */
export interface AgentTeamState {
    team: AgentTeam;
    status: TeamStatus;
    currentTask: Task | null;
    tasksCompleted: number;
    avgResponseTimeMs: number;
    failureRate: number; // 0-1 scale
    lastActivity: Date;
}

/**
 * Coordination settings
 */
export interface CoordinationSettings {
    autoDecompose: boolean; // automatically decompose complex tasks
    requireVisualVerification: boolean; // mandate visual checks for UI tasks
    multiTeamHandoff: boolean; // enable automatic handoffs between teams
    parallelExecution: boolean; // allow simultaneous task execution
    maxRetries: number; // default 3
    timeout: number; // milliseconds, default 30000
}

/**
 * Metrics aggregated by Boss AI
 */
export interface SystemMetrics {
    tasksCreated: number;
    tasksCompleted: number;
    tasksVerified: number;
    agentUtilization: number; // percentage 0-100
    completionRate: number; // percentage 0-100
    timestamp: Date;
}

/**
 * Boss AI Coordinator - manages multi-agent orchestration
 */
export class BossAICoordinator {
    private teamStates: Map<AgentTeam, AgentTeamState> = new Map();
    private settings: CoordinationSettings;
    private metrics: SystemMetrics;
    private hooks?: BossAIHooks;

    constructor(settings?: Partial<CoordinationSettings>, hooks?: BossAIHooks) {
        this.settings = {
            autoDecompose: true,
            requireVisualVerification: true,
            multiTeamHandoff: true,
            parallelExecution: false,
            maxRetries: 3,
            timeout: 30000,
            ...settings,
        };
        this.hooks = hooks;

        this.metrics = {
            tasksCreated: 0,
            tasksCompleted: 0,
            tasksVerified: 0,
            agentUtilization: 0,
            completionRate: 0,
            timestamp: new Date(),
        };

        // Initialize team states
        Object.values(AgentTeam).forEach((team) => {
            this.teamStates.set(team as AgentTeam, {
                team: team as AgentTeam,
                status: TeamStatus.Idle,
                currentTask: null,
                tasksCompleted: 0,
                avgResponseTimeMs: 0,
                failureRate: 0,
                lastActivity: new Date(),
            });
        });
    }

    /**
     * Route a task to the appropriate agent team using routing algorithm
     */
    routeTaskToTeam(task: Task): AgentTeam {
        const team = routeTask(task);

        // Update metrics
        this.metrics.tasksCreated++;
        this.updateMetricsTimestamp();

        // Auto-trigger decomposition when configured
        if (team === AgentTeam.Decomposition && this.settings.autoDecompose && this.hooks?.onDecomposition) {
            // Fire-and-forget to avoid blocking routing
            Promise.resolve(this.hooks.onDecomposition(task)).catch(err => {
                console.warn('[BossAICoordinator] onDecomposition hook error:', err);
            });
        }

        return team;
    }

    /**
     * Assign a task to a specific team and update team state
     */
    assignTask(team: AgentTeam, task: Task): void {
        const teamState = this.teamStates.get(team);
        if (!teamState) {
            throw new Error(`Team ${team} not found`);
        }

        teamState.currentTask = task;
        teamState.status = TeamStatus.Active;
        teamState.lastActivity = new Date();

        this.teamStates.set(team, teamState);
        this.updateMetrics(); // Update utilization when team becomes active
    }

    /**
     * Mark task as completed by a team
     */
    completeTask(team: AgentTeam, success: boolean, responseTimeMs: number): void {
        const teamState = this.teamStates.get(team);
        if (!teamState) {
            throw new Error(`Team ${team} not found`);
        }

        if (success) {
            teamState.tasksCompleted++;
            this.metrics.tasksCompleted++;

            // Update metrics for verification tracking
            if (team === AgentTeam.Verification) {
                this.metrics.tasksVerified++;
            }
        }

        // Update average response time (running average)
        const totalTasks = teamState.tasksCompleted;
        if (totalTasks > 0) {
            teamState.avgResponseTimeMs =
                (teamState.avgResponseTimeMs * (totalTasks - 1) + responseTimeMs) / totalTasks;
        }

        // Update failure rate (last 10 tasks weighted)
        if (!success) {
            teamState.failureRate = Math.min(teamState.failureRate + 0.1, 1);
        } else {
            teamState.failureRate = Math.max(teamState.failureRate - 0.05, 0);
        }

        teamState.currentTask = null;
        teamState.status = TeamStatus.Idle;
        teamState.lastActivity = new Date();

        this.teamStates.set(team, teamState);
        this.updateMetrics();
    }

    /**
     * Handle team errors and implement fallback strategy
     */
    handleTeamError(team: AgentTeam, error: Error): void {
        const teamState = this.teamStates.get(team);
        if (!teamState) {
            throw new Error(`Team ${team} not found`);
        }

        teamState.status = TeamStatus.Error;
        teamState.failureRate = Math.min(teamState.failureRate + 0.2, 1);
        teamState.lastActivity = new Date();

        this.teamStates.set(team, teamState);

        // Fallback strategy: if failure rate > 0.5, mark team as unavailable
        if (teamState.failureRate > 0.5) {
            console.warn(`Team ${team} has high failure rate (${teamState.failureRate.toFixed(2)})`);
        }
    }

    /**
     * Detect plan vs execution drift
     */
    detectDrift(planVersion: string, executionVersion: string): number {
        // Basic drift detection: compare version strings
        // Returns 0-1 scale: 0=perfect alignment, 1=complete drift
        if (planVersion === executionVersion) {
            return 0;
        }

        // Simple heuristic: different versions = 0.2 drift
        return 0.2;
    }

    /**
     * Get current team state
     */
    getTeamState(team: AgentTeam): AgentTeamState | undefined {
        return this.teamStates.get(team);
    }

    /**
     * Get all team states
     */
    getAllTeamStates(): AgentTeamState[] {
        return Array.from(this.teamStates.values());
    }

    /**
     * Get current system metrics
     */
    getMetrics(): SystemMetrics {
        return { ...this.metrics };
    }

    /**
     * Get coordination settings
     */
    getSettings(): CoordinationSettings {
        return { ...this.settings };
    }

    /**
     * Update coordination settings
     */
    updateSettings(settings: Partial<CoordinationSettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * Register integration hooks (e.g., DecompositionAgent)
     */
    setHooks(hooks: BossAIHooks): void {
        this.hooks = hooks;
    }

    /**
     * Update aggregated metrics
     */
    private updateMetrics(): void {
        // Calculate agent utilization (percentage of teams that are active)
        const activeTeams = Array.from(this.teamStates.values()).filter(
            (s) => s.status === TeamStatus.Active
        ).length;
        this.metrics.agentUtilization = (activeTeams / this.teamStates.size) * 100;

        // Calculate completion rate (tasks completed / tasks created)
        if (this.metrics.tasksCreated > 0) {
            this.metrics.completionRate = (this.metrics.tasksCompleted / this.metrics.tasksCreated) * 100;
        }

        this.updateMetricsTimestamp();
    }

    private updateMetricsTimestamp(): void {
        this.metrics.timestamp = new Date();
    }

    /**
     * Monitor team health and return status report
     */
    monitorHealth(): { healthy: boolean; issues: string[] } {
        const issues: string[] = [];

        for (const [team, state] of this.teamStates.entries()) {
            if (state.status === TeamStatus.Error) {
                issues.push(`Team ${team} is in error state`);
            }
            if (state.failureRate > 0.5) {
                issues.push(`Team ${team} has high failure rate: ${(state.failureRate * 100).toFixed(1)}%`);
            }
            // Check for stale tasks (active for >5 minutes)
            if (state.currentTask && state.status === TeamStatus.Active) {
                const ageMs = Date.now() - state.lastActivity.getTime();
                if (ageMs > 5 * 60 * 1000) {
                    issues.push(`Team ${team} has stale task (${Math.floor(ageMs / 60000)} minutes old)`);
                }
            }
        }

        return {
            healthy: issues.length === 0,
            issues,
        };
    }
}
