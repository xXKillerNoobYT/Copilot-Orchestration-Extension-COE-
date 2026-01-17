<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\MetricsEvent;
use App\Models\Task;
use App\Models\TaskExecution;
use Carbon\CarbonInterval;
use Illuminate\Support\Collection;

class MetricsService
{
    /**
     * Default time range in days for metrics analysis.
     * Provides a good balance between recent trends and statistical significance.
     */
    private const DEFAULT_TIME_RANGE_DAYS = 30;

    /**
     * Aggregate task metrics (counts, completion rate, cycle time).
     * 
     * @param string|null $timeRange Optional time range (e.g., '7d', '30d', '90d')
     * @return array Aggregated task metrics including counts, rates, and timestamps
     */
    public function getTaskMetrics(?string $timeRange = null): array
    {
        $query = Task::query();
        
        // Apply time range filter if provided
        if ($timeRange) {
            $days = $this->parseTimeRangeToDays($timeRange);
            $query->where('created_at', '>=', now()->subDays($days));
        }

        $totalTasks = (clone $query)->count();
        $completed = (clone $query)->where('status', 'completed')->count();
        $inProgress = (clone $query)->where('status', 'in_progress')->count();
        $pending = (clone $query)->where('status', 'pending')->count();
        $blocked = (clone $query)->where('status', 'blocked')->count();
        $failed = (clone $query)->where('status', 'failed')->count();

        $completionRate = $totalTasks > 0 ? round(($completed / $totalTasks) * 100, 2) : 0;

        $cycleTimes = (clone $query)
            ->whereNotNull('started_at')
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
            'timeRange' => $timeRange,
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

    /**
     * Record a task completion event.
     * 
     * @param int $taskId
     * @param float $durationSeconds Duration in seconds
     * @param int|null $userId
     * @param int|null $projectId
     * @return MetricsEvent
     */
    public function recordTaskCompletion(
        int $taskId,
        float $durationSeconds,
        ?int $userId = null,
        ?int $projectId = null
    ): MetricsEvent {
        return MetricsEvent::create([
            'event_type' => 'task_completed',
            'metric_name' => 'task_duration_seconds',
            'value' => $durationSeconds,
            'task_id' => $taskId,
            'user_id' => $userId,
            'project_id' => $projectId,
            'recorded_at' => now(),
        ]);
    }

    /**
     * Record a task execution start event.
     * 
     * @param int $taskId
     * @param int|null $agentId
     * @param int|null $userId
     * @param int|null $projectId
     * @return MetricsEvent
     */
    public function recordTaskStart(
        int $taskId,
        ?int $agentId = null,
        ?int $userId = null,
        ?int $projectId = null
    ): MetricsEvent {
        return MetricsEvent::create([
            'event_type' => 'task_started',
            'metric_name' => 'task_start',
            'value' => 1,
            'task_id' => $taskId,
            'agent_id' => $agentId,
            'user_id' => $userId,
            'project_id' => $projectId,
            'recorded_at' => now(),
        ]);
    }

    /**
     * Record an error event (simplified interface matching issue spec).
     * 
     * @param int $taskId
     * @param string|array $error Error message or array with error details
     * @return MetricsEvent
     */
    public function recordError(int $taskId, string|array $error): MetricsEvent
    {
        // Handle both string and array error formats
        if (is_string($error)) {
            $errorMessage = $error;
            $metadata = null;
            $agentId = null;
            $userId = null;
            $projectId = null;
        } else {
            $errorMessage = $error['message'] ?? 'Unknown error';
            // Only store explicit metadata field to avoid recursive structures
            $metadata = $error['metadata'] ?? null;
            $agentId = $error['agent_id'] ?? null;
            $userId = $error['user_id'] ?? null;
            $projectId = $error['project_id'] ?? null;
        }

        return $this->recordErrorEvent(
            $errorMessage,
            $taskId,
            $agentId,
            $userId,
            $projectId,
            $metadata
        );
    }

    /**
     * Record an error event (detailed interface).
     * 
     * @param string $errorMessage
     * @param int|null $taskId
     * @param int|null $agentId
     * @param int|null $userId
     * @param int|null $projectId
     * @param array|null $metadata Additional context (stack_trace, error_code, etc.)
     * @return MetricsEvent
     */
    public function recordErrorEvent(
        string $errorMessage,
        ?int $taskId = null,
        ?int $agentId = null,
        ?int $userId = null,
        ?int $projectId = null,
        ?array $metadata = null
    ): MetricsEvent {
        return MetricsEvent::create([
            'event_type' => 'error_occurred',
            'metric_name' => 'error_count',
            'value' => 1,
            'task_id' => $taskId,
            'agent_id' => $agentId,
            'user_id' => $userId,
            'project_id' => $projectId,
            'context_key' => 'error_message',
            'context_value' => $errorMessage,
            'metadata' => $metadata,
            'recorded_at' => now(),
        ]);
    }

    /**
     * Record an execution time measurement.
     * 
     * @param int $taskId
     * @param float $milliseconds Duration in milliseconds
     * @param int|null $agentId
     * @param int|null $userId
     * @param int|null $projectId
     * @return MetricsEvent
     */
    public function recordExecutionTime(
        int $taskId,
        float $milliseconds,
        ?int $agentId = null,
        ?int $userId = null,
        ?int $projectId = null
    ): MetricsEvent {
        return MetricsEvent::create([
            'event_type' => 'execution_time',
            'metric_name' => 'execution_time_ms',
            'value' => $milliseconds,
            'task_id' => $taskId,
            'agent_id' => $agentId,
            'user_id' => $userId,
            'project_id' => $projectId,
            'recorded_at' => now(),
        ]);
    }

    /**
     * Record an API call event.
     * 
     * @param string $endpoint API endpoint path
     * @param float $responseTimeMs Response time in milliseconds
     * @param int $statusCode HTTP status code
     * @param int|null $userId
     * @param int|null $projectId
     * @return MetricsEvent
     */
    public function recordApiCall(
        string $endpoint,
        float $responseTimeMs,
        int $statusCode,
        ?int $userId = null,
        ?int $projectId = null
    ): MetricsEvent {
        return MetricsEvent::create([
            'event_type' => 'api_call',
            'metric_name' => 'api_response_time_ms',
            'value' => $responseTimeMs,
            'user_id' => $userId,
            'project_id' => $projectId,
            'context_key' => 'endpoint',
            'context_value' => $endpoint,
            'metadata' => ['status_code' => $statusCode],
            'recorded_at' => now(),
        ]);
    }

    /**
     * Record a test execution event.
     * 
     * @param int $totalTests
     * @param int $passedTests
     * @param int $failedTests
     * @param int|null $projectId
     * @param int|null $userId
     * @return MetricsEvent
     */
    public function recordTestExecution(
        int $totalTests,
        int $passedTests,
        int $failedTests,
        ?int $projectId = null,
        ?int $userId = null
    ): MetricsEvent {
        $coverage = $totalTests > 0 ? round(($passedTests / $totalTests) * 100, 2) : 0;

        return MetricsEvent::create([
            'event_type' => 'test_run',
            'metric_name' => 'test_coverage_percent',
            'value' => $coverage,
            'user_id' => $userId,
            'project_id' => $projectId,
            'metadata' => [
                'total_tests' => $totalTests,
                'passed_tests' => $passedTests,
                'failed_tests' => $failedTests,
            ],
            'recorded_at' => now(),
        ]);
    }

    /**
     * Record an agent execution event.
     * 
     * @param int $agentId
     * @param int $taskId
     * @param string $status success|failure
     * @param float|null $durationSeconds
     * @param int|null $projectId
     * @param int|null $userId
     * @return MetricsEvent
     */
    public function recordAgentExecution(
        int $agentId,
        int $taskId,
        string $status = 'success',
        ?float $durationSeconds = null,
        ?int $projectId = null,
        ?int $userId = null
    ): MetricsEvent {
        return MetricsEvent::create([
            'event_type' => 'agent_execution',
            'metric_name' => 'agent_execution_count',
            'value' => 1,
            'agent_id' => $agentId,
            'task_id' => $taskId,
            'user_id' => $userId,
            'project_id' => $projectId,
            'metadata' => [
                'status' => $status,
                'duration_seconds' => $durationSeconds,
            ],
            'recorded_at' => now(),
        ]);
    }

    /**
     * Get metrics for a specific time range.
     * 
     * @param string $metricName
     * @param int $days Number of past days to include (default 30)
     * @return array
     */
    public function getMetricsHistory(string $metricName, int $days = 30): array
    {
        $events = MetricsEvent::byMetricName($metricName)
            ->lastNDays($days)
            ->orderBy('recorded_at')
            ->get();

        return [
            'metric_name' => $metricName,
            'period_days' => $days,
            'event_count' => $events->count(),
            'average_value' => $events->count() > 0 ? round($events->avg('value'), 2) : 0,
            'max_value' => $events->count() > 0 ? $events->max('value') : 0,
            'min_value' => $events->count() > 0 ? $events->min('value') : 0,
            'latest_value' => $events->last()?->value,
            'last_recorded' => $events->last()?->recorded_at?->toIso8601String(),
        ];
    }

    /**
     * Get KPIs dashboard data (15 key performance indicators).
     * 
     * @param int $days
     * @return array
     */
    public function getKpiDashboard(int $days = 30): array
    {
        // Quality KPIs
        $testCoverage = $this->getMetricsHistory('test_coverage_percent', $days);
        $errorRate = MetricsEvent::byEventType('error_occurred')
            ->lastNDays($days)
            ->count();

        // Functionality KPIs
        $taskMetrics = $this->getTaskMetrics();
        $completionRate = $taskMetrics['completionRate'] ?? 0;
        $avgCycleTime = $taskMetrics['averageCycleSeconds'] ?? 0;

        // Agent KPIs
        $agentMetrics = $this->getAgentMetrics();
        $activeAgents = $agentMetrics['counts']['active_agents'] ?? 0;
        $agentUtilization = $agentMetrics['utilization'] ?? 0;

        // Execution KPIs
        $executionTimes = $this->getMetricsHistory('execution_time_ms', $days);
        $apiResponseTimes = $this->getMetricsHistory('api_response_time_ms', $days);

        return [
            'generated_at' => now()->toIso8601String(),
            'period_days' => $days,
            'quality_metrics' => [
                'test_coverage_percent' => $testCoverage['latest_value'] ?? 0,
                'error_count_total' => $errorRate,
                'error_rate' => MetricsEvent::count() > 0
                    ? round(($errorRate / MetricsEvent::lastNDays($days)->count()) * 100, 2)
                    : 0,
            ],
            'functionality_metrics' => [
                'task_completion_rate' => $completionRate,
                'average_task_duration_seconds' => $avgCycleTime,
                'total_tasks_completed' => $taskMetrics['counts']['completed'] ?? 0,
            ],
            'adoption_metrics' => [
                'active_agents' => $activeAgents,
                'total_agents' => $agentMetrics['counts']['total_agents'] ?? 0,
                'agent_utilization' => $agentUtilization,
            ],
            'performance_metrics' => [
                'average_execution_time_ms' => $executionTimes['average_value'] ?? 0,
                'average_api_response_time_ms' => $apiResponseTimes['average_value'] ?? 0,
                'max_execution_time_ms' => $executionTimes['max_value'] ?? 0,
            ],
            'business_metrics' => [
                'task_execution_velocity' => $taskMetrics['counts']['completed'] ?? 0, // tasks/period
                'failed_task_count' => $taskMetrics['counts']['failed'] ?? 0,
                'blocked_task_count' => $taskMetrics['counts']['blocked'] ?? 0,
            ],
        ];
    }

    /**
     * Clean up old metrics events (retention policy).
     * 
     * @param int $retentionDays Keep events newer than this many days
     * @return int Number of records deleted
     */
    public function cleanupOldMetrics(int $retentionDays = 90): int
    {
        return MetricsEvent::where('recorded_at', '<', now()->subDays($retentionDays))
            ->delete();
    }

    /**
     * Parse time range string to number of days.
     * 
     * @param string $timeRange Format: '7d', '30d', '90d', etc.
     * @return int Number of days
     */
    private function parseTimeRangeToDays(string $timeRange): int
    {
        // Match patterns like '7d', '30d', '90d'
        if (preg_match('/^(\d+)d$/', $timeRange, $matches)) {
            return (int) $matches[1];
        }

        // Return default if format not recognized
        return self::DEFAULT_TIME_RANGE_DAYS;
    }
}
