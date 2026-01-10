<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class PerformanceMonitoringService
{
    public function __construct(
        private MetricsCollectionService $metrics,
        private LoggingService $logging
    ) {}

    /**
     * Monitor and record operation performance
     */
    public function monitorOperation(string $operation, callable $callback): mixed
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage(true);
        
        try {
            $result = $callback();
            $success = true;
            return $result;
        } catch (\Throwable $e) {
            $success = false;
            throw $e;
        } finally {
            $duration = microtime(true) - $startTime;
            $memoryUsed = memory_get_usage(true) - $startMemory;
            
            $this->recordOperationMetrics($operation, $duration, $memoryUsed, $success ?? false);
        }
    }

    /**
     * Get system performance metrics
     */
    public function getSystemMetrics(): array
    {
        return [
            'cpu' => $this->getCpuMetrics(),
            'memory' => $this->getMemoryMetrics(),
            'database' => $this->getDatabaseMetrics(),
            'cache' => $this->getCacheMetrics(),
            'application' => $this->getApplicationMetrics(),
        ];
    }

    /**
     * Get CPU usage metrics
     */
    public function getCpuMetrics(): array
    {
        $load = sys_getloadavg();
        
        return [
            'load_average' => [
                '1min' => round($load[0], 2),
                '5min' => round($load[1], 2),
                '15min' => round($load[2], 2),
            ],
            'cores' => $this->getCpuCores(),
        ];
    }

    /**
     * Get memory usage metrics
     */
    public function getMemoryMetrics(): array
    {
        $memoryLimit = $this->convertToBytes(ini_get('memory_limit'));
        $memoryUsage = memory_get_usage(true);
        $memoryPeak = memory_get_peak_usage(true);
        
        return [
            'limit_bytes' => $memoryLimit,
            'limit_human' => $this->formatBytes($memoryLimit),
            'current_bytes' => $memoryUsage,
            'current_human' => $this->formatBytes($memoryUsage),
            'current_percentage' => $memoryLimit > 0 ? round(($memoryUsage / $memoryLimit) * 100, 2) : 0,
            'peak_bytes' => $memoryPeak,
            'peak_human' => $this->formatBytes($memoryPeak),
            'peak_percentage' => $memoryLimit > 0 ? round(($memoryPeak / $memoryLimit) * 100, 2) : 0,
        ];
    }

    /**
     * Get database performance metrics
     */
    public function getDatabaseMetrics(): array
    {
        $connectionName = config('database.default');
        $connection = DB::connection($connectionName);
        
        // Get query log if enabled
        $queryLog = DB::getQueryLog();
        
        $totalQueries = count($queryLog);
        $totalTime = array_sum(array_column($queryLog, 'time'));
        $slowQueries = array_filter($queryLog, fn($q) => $q['time'] > 100);
        
        return [
            'connection' => $connectionName,
            'driver' => $connection->getDriverName(),
            'total_queries' => $totalQueries,
            'total_time_ms' => round($totalTime, 2),
            'average_time_ms' => $totalQueries > 0 ? round($totalTime / $totalQueries, 2) : 0,
            'slow_queries_count' => count($slowQueries),
            'slow_queries_threshold_ms' => 100,
        ];
    }

    /**
     * Get cache performance metrics
     */
    public function getCacheMetrics(): array
    {
        $driver = config('cache.default');
        
        return [
            'driver' => $driver,
            'hit_rate' => $this->metrics->getMetric('counter', 'cache.hits') ?? 0,
            'miss_rate' => $this->metrics->getMetric('counter', 'cache.misses') ?? 0,
            'total_operations' => $this->metrics->getMetric('counter', 'cache.operations.total') ?? 0,
        ];
    }

    /**
     * Get application-specific metrics
     */
    public function getApplicationMetrics(): array
    {
        return [
            'environment' => config('app.env'),
            'debug_mode' => config('app.debug'),
            'php_version' => phpversion(),
            'laravel_version' => app()->version(),
            'uptime_seconds' => $this->getUptime(),
        ];
    }

    /**
     * Monitor database query performance
     */
    public function monitorDatabaseQuery(string $query, callable $callback): mixed
    {
        $startTime = microtime(true);
        
        try {
            $result = $callback();
            $rows = is_countable($result) ? count($result) : 0;
        } catch (\Throwable $e) {
            $rows = 0;
            throw $e;
        } finally {
            $duration = microtime(true) - $startTime;
            
            $this->metrics->recordDatabaseMetrics($query, $duration, $rows ?? 0);
            $this->logging->logDatabaseQuery($query, $duration);
        }
        
        return $result ?? null;
    }

    /**
     * Monitor cache operations
     */
    public function monitorCacheOperation(string $operation, string $key, callable $callback): mixed
    {
        $startTime = microtime(true);
        
        try {
            $result = $callback();
            $hit = $operation === 'get' ? $result !== null : null;
        } catch (\Throwable $e) {
            $hit = false;
            throw $e;
        } finally {
            $duration = microtime(true) - $startTime;
            
            $this->metrics->recordCacheMetrics($operation, $hit ?? null);
            $this->logging->logCacheOperation($operation, $key, $hit ?? null, $duration);
        }
        
        return $result ?? null;
    }

    /**
     * Get performance alerts
     */
    public function getPerformanceAlerts(): array
    {
        $alerts = [];
        
        // Check memory usage
        $memory = $this->getMemoryMetrics();
        if ($memory['current_percentage'] > 90) {
            $alerts[] = [
                'severity' => 'critical',
                'category' => 'memory',
                'message' => "Memory usage at {$memory['current_percentage']}%",
                'threshold' => '90%',
                'current' => $memory['current_human'],
            ];
        } elseif ($memory['current_percentage'] > 75) {
            $alerts[] = [
                'severity' => 'warning',
                'category' => 'memory',
                'message' => "Memory usage at {$memory['current_percentage']}%",
                'threshold' => '75%',
                'current' => $memory['current_human'],
            ];
        }
        
        // Check CPU load
        $cpu = $this->getCpuMetrics();
        $cores = $cpu['cores'];
        if ($cpu['load_average']['1min'] > $cores * 0.9) {
            $alerts[] = [
                'severity' => 'critical',
                'category' => 'cpu',
                'message' => "High CPU load: {$cpu['load_average']['1min']}",
                'threshold' => $cores * 0.9,
                'current' => $cpu['load_average']['1min'],
            ];
        }
        
        // Check slow queries
        $db = $this->getDatabaseMetrics();
        if ($db['slow_queries_count'] > 10) {
            $alerts[] = [
                'severity' => 'warning',
                'category' => 'database',
                'message' => "{$db['slow_queries_count']} slow queries detected",
                'threshold' => 10,
                'current' => $db['slow_queries_count'],
            ];
        }
        
        return $alerts;
    }

    /**
     * Get performance trends
     */
    public function getPerformanceTrends(string $period = '1h'): array
    {
        // This would query historical metrics
        // Simplified implementation
        return [
            'period' => $period,
            'api_response_times' => [],
            'database_query_times' => [],
            'memory_usage' => [],
            'cpu_load' => [],
        ];
    }

    /**
     * Generate performance report
     */
    public function generatePerformanceReport(): array
    {
        $metrics = $this->getSystemMetrics();
        $alerts = $this->getPerformanceAlerts();
        
        return [
            'timestamp' => now()->toIso8601String(),
            'metrics' => $metrics,
            'alerts' => $alerts,
            'health_status' => $this->calculateHealthStatus($alerts),
            'recommendations' => $this->generateRecommendations($metrics, $alerts),
        ];
    }

    /**
     * Record operation metrics
     */
    private function recordOperationMetrics(
        string $operation,
        float $duration,
        int $memoryUsed,
        bool $success
    ): void {
        $this->metrics->recordTiming("operations.{$operation}.duration", $duration);
        $this->metrics->recordGauge("operations.{$operation}.memory", $memoryUsed);
        $this->metrics->incrementCounter("operations.{$operation}." . ($success ? 'success' : 'failure'));
        
        $this->logging->logPerformance($operation, $duration, [
            'memory_bytes' => $memoryUsed,
            'memory_human' => $this->formatBytes($memoryUsed),
            'success' => $success,
        ]);
    }

    /**
     * Get number of CPU cores
     */
    private function getCpuCores(): int
    {
        if (stripos(PHP_OS, 'WIN') === 0) {
            $process = @popen('wmic cpu get NumberOfCores', 'rb');
            if ($process) {
                fgets($process);
                $cores = (int)fgets($process);
                pclose($process);
                return $cores > 0 ? $cores : 1;
            }
        } else {
            $cores = (int)shell_exec('nproc') ?: (int)shell_exec('sysctl -n hw.ncpu');
            return $cores > 0 ? $cores : 1;
        }
        
        return 1;
    }

    /**
     * Get application uptime
     */
    private function getUptime(): int
    {
        // This would track actual application start time
        // Simplified implementation
        return 0;
    }

    /**
     * Convert memory string to bytes
     */
    private function convertToBytes(string $value): int
    {
        $value = trim($value);
        $last = strtolower($value[strlen($value)-1] ?? '');
        $value = (int)$value;
        
        return match($last) {
            'g' => $value * 1024 * 1024 * 1024,
            'm' => $value * 1024 * 1024,
            'k' => $value * 1024,
            default => $value,
        };
    }

    /**
     * Format bytes to human readable
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }

    /**
     * Calculate overall health status
     */
    private function calculateHealthStatus(array $alerts): string
    {
        if (empty($alerts)) {
            return 'healthy';
        }
        
        $criticalCount = count(array_filter($alerts, fn($a) => $a['severity'] === 'critical'));
        
        if ($criticalCount > 0) {
            return 'critical';
        }
        
        return 'degraded';
    }

    /**
     * Generate performance recommendations
     */
    private function generateRecommendations(array $metrics, array $alerts): array
    {
        $recommendations = [];
        
        foreach ($alerts as $alert) {
            switch ($alert['category']) {
                case 'memory':
                    $recommendations[] = [
                        'category' => 'memory',
                        'priority' => $alert['severity'] === 'critical' ? 'high' : 'medium',
                        'message' => 'Consider increasing PHP memory_limit or optimizing memory usage',
                        'actions' => [
                            'Review memory-intensive operations',
                            'Enable opcode caching (OPcache)',
                            'Optimize database queries to reduce result sets',
                        ],
                    ];
                    break;
                    
                case 'cpu':
                    $recommendations[] = [
                        'category' => 'cpu',
                        'priority' => 'high',
                        'message' => 'High CPU load detected',
                        'actions' => [
                            'Review CPU-intensive operations',
                            'Consider scaling horizontally',
                            'Optimize algorithms and queries',
                        ],
                    ];
                    break;
                    
                case 'database':
                    $recommendations[] = [
                        'category' => 'database',
                        'priority' => 'medium',
                        'message' => 'Slow queries detected',
                        'actions' => [
                            'Add database indexes',
                            'Review and optimize slow queries',
                            'Consider query result caching',
                        ],
                    ];
                    break;
            }
        }
        
        return $recommendations;
    }
}
