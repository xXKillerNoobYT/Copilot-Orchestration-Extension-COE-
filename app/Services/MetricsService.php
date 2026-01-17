<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\MetricsEvent;
use App\Models\Task;
use App\Models\TaskExecution;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Support\Collection;

class MetricsService
{
    /**
     * Aggregate task metrics (counts, completion rate, cycle time).
     * 
     * @param string $range Time range filter (e.g., '7d', '30d', '24h'). Default '7d'
     */
    public function getTaskMetrics(string $range = '7d'): array
    {
        $cutoffDate = $this->parseTimeRange($range);
        
        // Use single query with groupBy for better performance
        $statusCounts = Task::where('created_at', '>=', $cutoffDate)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $totalTasks = $statusCounts->sum();
        $completed = $statusCounts->get('completed', 0);
        $inProgress = $statusCounts->get('in_progress', 0);
        $pending = $statusCounts->get('pending', 0);
        $blocked = $statusCounts->get('blocked', 0);
        $failed = $statusCounts->get('failed', 0);

        $completionRate = $totalTasks > 0 ? round(($completed / $totalTasks) * 100, 2) : 0;

        $cycleTimes = Task::whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->where('created_at', '>=', $cutoffDate)
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
            'timeRange' => $range,
            'startDate' => $cutoffDate->toIso8601String(),
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
     * 
     * @param int $limit Maximum number of recent errors to return
     * @param string|null $severity Filter by severity level (critical, high, medium, low)
     */
    public function getErrorMetrics(int $limit = 10, ?string $severity = null): array
    {
        $totalExecutions = TaskExecution::count();
        $failedExecutions = TaskExecution::failed()->count();
        $failureRate = $totalExecutions > 0
            ? round(($failedExecutions / $totalExecutions) * 100, 2)
            : 0;

        $errorQuery = TaskExecution::failed()
            ->latest('completed_at');
        
        // Apply severity filter if provided using proper parameter binding
        // Note: This currently infers severity from the error_message content
        // If there's a dedicated severity (or structured metadata) column, update this logic
        if ($severity) {
            // Validate severity input against allowed values
            $validSeverities = ['critical', 'high', 'medium', 'low'];
            $sanitizedSeverity = strtolower(trim($severity));
            
            if (in_array($sanitizedSeverity, $validSeverities)) {
                // Use parameter binding and let SQL apply the wildcard pattern
                $errorQuery->whereRaw("error_message LIKE CONCAT('%', ?, '%')", [$sanitizedSeverity]);
            }
        }
        
        $recentErrors = $errorQuery
            ->take($limit)
            ->get()
            ->map(function (TaskExecution $execution) {
                return [
                    'task_id' => $execution->task_id,
                    'agent_id' => $execution->agent_id,
                    'message' => $execution->error_message,
                    'severity' => $this->extractSeverity($execution->error_message),
                    'completed_at' => optional($execution->completed_at)->toIso8601String(),
                ];
            });

        $result = [
            'failures' => [
                'total_executions' => $totalExecutions,
                'failed_executions' => $failedExecutions,
                'failure_rate' => $failureRate,
            ],
            'recent_errors' => $recentErrors,
            'lastUpdated' => now()->toIso8601String(),
        ];
        
        if ($severity) {
            $result['filtered_by_severity'] = $severity;
        }
        
        return $result;
    }
    
    /**
     * Extract severity from error message.
     * 
     * @param string|null $message
     * @return string
     */
    private function extractSeverity(?string $message): string
    {
        if (!$message) {
            return 'medium';
        }
        
        $normalized = strtolower(trim($message));

        // Match explicit severity indicators like:
        // - "critical: disk failure"
        // - "[high] CPU usage"
        // - "severity: low"
        if ($this->matchesSeverity($normalized, ['critical', 'fatal'])) {
            return 'critical';
        }

        if ($this->matchesSeverity($normalized, ['high', 'severe'])) {
            return 'high';
        }

        if ($this->matchesSeverity($normalized, ['low', 'minor'])) {
            return 'low';
        }

        return 'medium';
    }

    /**
     * Check if the message contains any of the given severity keywords
     * in a structured way (e.g., at the start, in brackets, or in a "severity:" clause).
     *
     * @param string $message
     * @param array<string> $keywords
     * @return bool
     */
    private function matchesSeverity(string $message, array $keywords): bool
    {
        foreach ($keywords as $keyword) {
            $escaped = preg_quote($keyword, '/');

            // Combine all patterns with alternation for better performance
            $combinedPattern = '/(?:' .
                // 1. Keyword at the very start, followed by a common delimiter or whitespace
                '^' . $escaped . '\b[\s:\-\\\]]' . '|' .
                // 2. Keyword inside square brackets, e.g. "[critical]"
                '\[' . $escaped . '\]' . '|' .
                // 3. In a severity label, e.g. "severity: critical"
                '\bseverity\s*[:=\-]\s*' . $escaped . '\b' .
                ')/i';

            if (preg_match($combinedPattern, $message) === 1) {
                return true;
            }
        }

        return false;
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
     * Record an error event.
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
     * Parse time range string to Carbon date.
     * 
     * @param string $range Time range (e.g., '7d', '30d', '24h', '1w')
     * @return \Carbon\Carbon
     */
    private function parseTimeRange(string $range): Carbon
    {
        // Extract numeric value and unit
        preg_match('/^(\d+)([hdwm])$/', $range, $matches);
        
        // Check for 3 matches: full match + 2 capture groups (value and unit)
        if (count($matches) !== 3) {
            // Default to 7 days if invalid format
            return now()->subDays(7);
        }
        
        $value = (int)$matches[1];
        $unit = $matches[2];
        
        return match($unit) {
            'h' => now()->subHours($value),
            'd' => now()->subDays($value),
            'w' => now()->subWeeks($value),
            'm' => now()->subMonths($value),
            default => now()->subDays(7),
        };
    }
}
