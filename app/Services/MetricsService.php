<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Task;
use App\Models\TaskExecution;
use Carbon\CarbonInterval;
use Illuminate\Support\Collection;

class MetricsService
{
    /**
     * Aggregate task metrics (counts, completion rate, cycle time).
     */
    public function getTaskMetrics(): array
    {
        $totalTasks = Task::count();
        $completed = Task::where('status', 'completed')->count();
        $inProgress = Task::where('status', 'in_progress')->count();
        $pending = Task::where('status', 'pending')->count();
        $blocked = Task::where('status', 'blocked')->count();
        $failed = Task::where('status', 'failed')->count();

        $completionRate = $totalTasks > 0 ? round(($completed / $totalTasks) * 100, 2) : 0;

        $cycleTimes = Task::whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->get()
            ->map(function (Task $task) {
                return $task->completed_at->diffInSeconds($task->started_at);
            });

        $avgCycleSeconds = $cycleTimes->count() > 0 ? (int) round($cycleTimes->avg()) : 0;
        $avgCycleHuman = $avgCycleSeconds > 0
            ? CarbonInterval::seconds($avgCycleSeconds)->cascade()->forHumans()
            : 'n/a';

        return [
            'counts' => [
                'total' => $totalTasks,
                'completed' => $completed,
                'in_progress' => $inProgress,
                'pending' => $pending,
                'blocked' => $blocked,
                'failed' => $failed,
            ],
            'completionRate' => $completionRate,
            'averageCycleSeconds' => $avgCycleSeconds,
            'averageCycleDisplay' => $avgCycleHuman,
            'lastUpdated' => now()->toIso8601String(),
        ];
    }

    /**
     * Aggregate agent utilization and throughput metrics.
     */
    public function getAgentMetrics(): array
    {
        $totalAgents = Agent::count();
        $activeAgents = Agent::where('is_active', true)->count();

        // Throughput by agent from task executions
        $executionsByAgent = TaskExecution::selectRaw('agent_id, COUNT(*) as executions')
            ->groupBy('agent_id')
            ->get();

        $totalExecutions = $executionsByAgent->sum('executions');
        $avgExecutionsPerAgent = $executionsByAgent->count() > 0
            ? round($totalExecutions / $executionsByAgent->count(), 2)
            : 0;

        $busiest = $this->formatTopAgent($executionsByAgent);

        // Running tasks per agent (simple utilization proxy)
        $runningExecutions = TaskExecution::running()->count();
        $utilization = $activeAgents > 0
            ? round(($runningExecutions / $activeAgents), 2)
            : 0;

        return [
            'counts' => [
                'total_agents' => $totalAgents,
                'active_agents' => $activeAgents,
                'total_executions' => $totalExecutions,
            ],
            'avgExecutionsPerAgent' => $avgExecutionsPerAgent,
            'currentRunningExecutions' => $runningExecutions,
            'utilization' => $utilization,
            'busiestAgent' => $busiest,
            'lastUpdated' => now()->toIso8601String(),
        ];
    }

    /**
     * Aggregate failure metrics for executions.
     */
    public function getErrorMetrics(int $limit = 10): array
    {
        $totalExecutions = TaskExecution::count();
        $failedExecutions = TaskExecution::failed()->count();
        $failureRate = $totalExecutions > 0
            ? round(($failedExecutions / $totalExecutions) * 100, 2)
            : 0;

        $recentErrors = TaskExecution::failed()
            ->latest('completed_at')
            ->take($limit)
            ->get()
            ->map(function (TaskExecution $execution) {
                return [
                    'task_id' => $execution->task_id,
                    'agent_id' => $execution->agent_id,
                    'message' => $execution->error_message,
                    'completed_at' => optional($execution->completed_at)->toIso8601String(),
                ];
            });

        return [
            'failures' => [
                'total_executions' => $totalExecutions,
                'failed_executions' => $failedExecutions,
                'failure_rate' => $failureRate,
            ],
            'recent_errors' => $recentErrors,
            'lastUpdated' => now()->toIso8601String(),
        ];
    }

    private function formatTopAgent(Collection $executionsByAgent): ?array
    {
        if ($executionsByAgent->isEmpty()) {
            return null;
        }

        $top = $executionsByAgent->sortByDesc('executions')->first();
        if (!$top || !$top->agent_id) {
            return null;
        }

        $agent = Agent::find($top->agent_id);

        return [
            'agent_id' => $top->agent_id,
            'name' => $agent?->name,
            'executions' => $top->executions,
        ];
    }
}
