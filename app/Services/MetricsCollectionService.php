<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MetricsCollectionService
{
    private const METRICS_PREFIX = 'metrics:';
    private const METRICS_TTL = 3600; // 1 hour

    /**
     * Record a counter metric (increment)
     */
    public function incrementCounter(string $metric, int $value = 1, array $tags = []): void
    {
        $key = $this->buildMetricKey('counter', $metric, $tags);
        Cache::increment($key, $value);
        Cache::expire($key, self::METRICS_TTL);
    }

    /**
     * Record a gauge metric (current value)
     */
    public function recordGauge(string $metric, float $value, array $tags = []): void
    {
        $key = $this->buildMetricKey('gauge', $metric, $tags);
        Cache::put($key, $value, self::METRICS_TTL);
    }

    /**
     * Record a histogram metric (distribution of values)
     */
    public function recordHistogram(string $metric, float $value, array $tags = []): void
    {
        $key = $this->buildMetricKey('histogram', $metric, $tags);
        
        $data = Cache::get($key, [
            'count' => 0,
            'sum' => 0,
            'min' => PHP_FLOAT_MAX,
            'max' => PHP_FLOAT_MIN,
            'values' => [],
        ]);

        $data['count']++;
        $data['sum'] += $value;
        $data['min'] = min($data['min'], $value);
        $data['max'] = max($data['max'], $value);
        $data['values'][] = $value;

        // Keep only last 1000 values
        if (count($data['values']) > 1000) {
            $data['values'] = array_slice($data['values'], -1000);
        }

        Cache::put($key, $data, self::METRICS_TTL);
    }

    /**
     * Record timing metric
     */
    public function recordTiming(string $metric, float $duration, array $tags = []): void
    {
        $this->recordHistogram($metric, $duration * 1000, $tags); // Convert to milliseconds
    }

    /**
     * Record task metrics
     */
    public function recordTaskMetrics(string $taskId, array $metrics): void
    {
        $this->incrementCounter('tasks.total');
        $this->incrementCounter('tasks.by_status', 1, ['status' => $metrics['status'] ?? 'unknown']);
        $this->incrementCounter('tasks.by_type', 1, ['type' => $metrics['type'] ?? 'unknown']);
        $this->incrementCounter('tasks.by_priority', 1, ['priority' => $metrics['priority'] ?? 'unknown']);

        if (isset($metrics['duration'])) {
            $this->recordTiming('tasks.duration', $metrics['duration'], [
                'status' => $metrics['status'] ?? 'unknown',
            ]);
        }

        if (isset($metrics['dependencies_count'])) {
            $this->recordGauge('tasks.dependencies', $metrics['dependencies_count']);
        }
    }

    /**
     * Record agent metrics
     */
    public function recordAgentMetrics(string $agentId, array $metrics): void
    {
        $this->incrementCounter('agents.total');
        $this->incrementCounter('agents.by_type', 1, ['type' => $metrics['type'] ?? 'unknown']);
        
        if (isset($metrics['workload'])) {
            $this->recordGauge('agents.workload', $metrics['workload'], [
                'agent_id' => $agentId,
                'type' => $metrics['type'] ?? 'unknown',
            ]);
        }

        if (isset($metrics['tasks_completed'])) {
            $this->recordGauge('agents.tasks_completed', $metrics['tasks_completed'], [
                'agent_id' => $agentId,
            ]);
        }

        if (isset($metrics['average_task_time'])) {
            $this->recordGauge('agents.average_task_time', $metrics['average_task_time'], [
                'agent_id' => $agentId,
            ]);
        }
    }

    /**
     * Record GitHub sync metrics
     */
    public function recordGitHubMetrics(string $operation, array $metrics): void
    {
        $this->incrementCounter('github.operations.total');
        $this->incrementCounter('github.operations.by_type', 1, ['operation' => $operation]);

        if (isset($metrics['duration'])) {
            $this->recordTiming('github.operation_duration', $metrics['duration'], [
                'operation' => $operation,
            ]);
        }

        if (isset($metrics['success'])) {
            $this->incrementCounter('github.operations.' . ($metrics['success'] ? 'success' : 'failure'));
        }

        if (isset($metrics['api_calls'])) {
            $this->incrementCounter('github.api_calls', $metrics['api_calls']);
        }

        if (isset($metrics['cache_hits'])) {
            $this->incrementCounter('github.cache_hits', $metrics['cache_hits']);
        }
    }

    /**
     * Record API endpoint metrics
     */
    public function recordApiMetrics(
        string $method,
        string $endpoint,
        int $statusCode,
        float $duration
    ): void {
        $this->incrementCounter('api.requests.total');
        $this->incrementCounter('api.requests.by_method', 1, ['method' => $method]);
        $this->incrementCounter('api.requests.by_endpoint', 1, ['endpoint' => $endpoint]);
        $this->incrementCounter('api.requests.by_status', 1, [
            'status_code' => (string)$statusCode,
            'status_class' => $this->getStatusClass($statusCode),
        ]);

        $this->recordTiming('api.request_duration', $duration, [
            'method' => $method,
            'endpoint' => $endpoint,
        ]);

        // Track error rates
        if ($statusCode >= 400) {
            $this->incrementCounter('api.errors.total');
            if ($statusCode >= 500) {
                $this->incrementCounter('api.errors.server');
            } else {
                $this->incrementCounter('api.errors.client');
            }
        }
    }

    /**
     * Record database query metrics
     */
    public function recordDatabaseMetrics(string $query, float $duration, int $rows = 0): void
    {
        $this->incrementCounter('database.queries.total');
        $this->recordTiming('database.query_duration', $duration);

        if ($duration > 0.1) { // Slow query threshold: 100ms
            $this->incrementCounter('database.queries.slow');
        }

        if ($rows > 0) {
            $this->recordGauge('database.query_rows', $rows);
        }
    }

    /**
     * Record cache metrics
     */
    public function recordCacheMetrics(string $operation, bool $hit = null): void
    {
        $this->incrementCounter('cache.operations.total');
        $this->incrementCounter('cache.operations.by_type', 1, ['operation' => $operation]);

        if ($hit !== null) {
            $this->incrementCounter('cache.' . ($hit ? 'hits' : 'misses'));
        }
    }

    /**
     * Get current metric value
     */
    public function getMetric(string $type, string $metric, array $tags = []): mixed
    {
        $key = $this->buildMetricKey($type, $metric, $tags);
        return Cache::get($key);
    }

    /**
     * Get all metrics for a prefix
     */
    public function getMetricsByPrefix(string $prefix): array
    {
        $pattern = self::METRICS_PREFIX . $prefix . '*';
        $keys = $this->getCacheKeys($pattern);
        
        $metrics = [];
        foreach ($keys as $key) {
            $metrics[$key] = Cache::get($key);
        }
        
        return $metrics;
    }

    /**
     * Get system health metrics
     */
    public function getSystemHealthMetrics(): array
    {
        return [
            'api' => [
                'total_requests' => $this->getMetric('counter', 'api.requests.total') ?? 0,
                'error_rate' => $this->calculateErrorRate(),
                'average_response_time' => $this->calculateAverageResponseTime(),
            ],
            'tasks' => [
                'total' => $this->getMetric('counter', 'tasks.total') ?? 0,
                'by_status' => $this->getTasksByStatus(),
            ],
            'agents' => [
                'total' => $this->getMetric('counter', 'agents.total') ?? 0,
                'average_workload' => $this->calculateAverageAgentWorkload(),
            ],
            'database' => [
                'total_queries' => $this->getMetric('counter', 'database.queries.total') ?? 0,
                'slow_queries' => $this->getMetric('counter', 'database.queries.slow') ?? 0,
            ],
            'cache' => [
                'total_operations' => $this->getMetric('counter', 'cache.operations.total') ?? 0,
                'hit_rate' => $this->calculateCacheHitRate(),
            ],
            'github' => [
                'total_operations' => $this->getMetric('counter', 'github.operations.total') ?? 0,
                'success_rate' => $this->calculateGitHubSuccessRate(),
            ],
        ];
    }

    /**
     * Reset metrics
     */
    public function resetMetrics(string $prefix = ''): void
    {
        $pattern = self::METRICS_PREFIX . ($prefix ?: '*');
        $keys = $this->getCacheKeys($pattern);
        
        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }

    /**
     * Build metric cache key
     */
    private function buildMetricKey(string $type, string $metric, array $tags = []): string
    {
        $key = self::METRICS_PREFIX . "{$type}:{$metric}";
        
        if (!empty($tags)) {
            ksort($tags);
            $tagString = implode(',', array_map(
                fn($k, $v) => "{$k}={$v}",
                array_keys($tags),
                $tags
            ));
            $key .= ":{$tagString}";
        }
        
        return $key;
    }

    /**
     * Get HTTP status class (2xx, 3xx, 4xx, 5xx)
     */
    private function getStatusClass(int $statusCode): string
    {
        return substr((string)$statusCode, 0, 1) . 'xx';
    }

    /**
     * Calculate API error rate
     */
    private function calculateErrorRate(): float
    {
        $total = $this->getMetric('counter', 'api.requests.total') ?? 0;
        $errors = $this->getMetric('counter', 'api.errors.total') ?? 0;
        
        return $total > 0 ? round(($errors / $total) * 100, 2) : 0.0;
    }

    /**
     * Calculate average API response time
     */
    private function calculateAverageResponseTime(): float
    {
        $histogram = $this->getMetric('histogram', 'api.request_duration') ?? null;
        
        if (!$histogram || $histogram['count'] === 0) {
            return 0.0;
        }
        
        return round($histogram['sum'] / $histogram['count'], 2);
    }

    /**
     * Get tasks by status
     */
    private function getTasksByStatus(): array
    {
        $statuses = ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'];
        $result = [];
        
        foreach ($statuses as $status) {
            $result[$status] = $this->getMetric('counter', 'tasks.by_status', ['status' => $status]) ?? 0;
        }
        
        return $result;
    }

    /**
     * Calculate average agent workload
     */
    private function calculateAverageAgentWorkload(): float
    {
        // This would aggregate workload across all agents
        // Simplified implementation
        return 0.0;
    }

    /**
     * Calculate cache hit rate
     */
    private function calculateCacheHitRate(): float
    {
        $hits = $this->getMetric('counter', 'cache.hits') ?? 0;
        $misses = $this->getMetric('counter', 'cache.misses') ?? 0;
        $total = $hits + $misses;
        
        return $total > 0 ? round(($hits / $total) * 100, 2) : 0.0;
    }

    /**
     * Calculate GitHub operation success rate
     */
    private function calculateGitHubSuccessRate(): float
    {
        $success = $this->getMetric('counter', 'github.operations.success') ?? 0;
        $failure = $this->getMetric('counter', 'github.operations.failure') ?? 0;
        $total = $success + $failure;
        
        return $total > 0 ? round(($success / $total) * 100, 2) : 0.0;
    }

    /**
     * Get cache keys matching pattern
     */
    private function getCacheKeys(string $pattern): array
    {
        // This is a simplified version - actual implementation depends on cache driver
        // For Redis, you would use SCAN command
        // For file cache, you would scan directory
        return [];
    }
}
