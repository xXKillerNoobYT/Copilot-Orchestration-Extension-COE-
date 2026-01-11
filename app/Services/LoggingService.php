<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class LoggingService
{
    private const CONTEXT_KEYS = [
        'user_id',
        'session_id',
        'request_id',
        'ip_address',
        'user_agent',
        'correlation_id',
    ];

    /**
     * Log task-related events
     */
    public function logTaskEvent(
        string $event,
        string $taskId,
        array $data = [],
        string $level = 'info'
    ): void {
        $context = $this->buildContext([
            'event_type' => 'task',
            'event' => $event,
            'task_id' => $taskId,
            'data' => $data,
        ]);

        $this->log($level, "Task Event: {$event}", $context);
    }

    /**
     * Log agent-related events
     */
    public function logAgentEvent(
        string $event,
        string $agentId,
        array $data = [],
        string $level = 'info'
    ): void {
        $context = $this->buildContext([
            'event_type' => 'agent',
            'event' => $event,
            'agent_id' => $agentId,
            'data' => $data,
        ]);

        $this->log($level, "Agent Event: {$event}", $context);
    }

    /**
     * Log GitHub integration events
     */
    public function logGitHubEvent(
        string $event,
        string $action,
        array $data = [],
        string $level = 'info'
    ): void {
        $context = $this->buildContext([
            'event_type' => 'github',
            'event' => $event,
            'action' => $action,
            'data' => $data,
        ]);

        $this->log($level, "GitHub Event: {$event}/{$action}", $context);
    }

    /**
     * Log API requests
     */
    public function logApiRequest(
        string $method,
        string $endpoint,
        int $statusCode,
        float $duration,
        array $metadata = []
    ): void {
        $context = $this->buildContext([
            'event_type' => 'api_request',
            'method' => $method,
            'endpoint' => $endpoint,
            'status_code' => $statusCode,
            'duration_ms' => round($duration * 1000, 2),
            'metadata' => $metadata,
        ]);

        $level = $statusCode >= 500 ? 'error' : ($statusCode >= 400 ? 'warning' : 'info');
        $this->log($level, "API Request: {$method} {$endpoint} - {$statusCode}", $context);
    }

    /**
     * Log performance metrics
     */
    public function logPerformance(
        string $operation,
        float $duration,
        array $metrics = []
    ): void {
        $context = $this->buildContext([
            'event_type' => 'performance',
            'operation' => $operation,
            'duration_ms' => round($duration * 1000, 2),
            'metrics' => $metrics,
        ]);

        $level = $duration > 5.0 ? 'warning' : 'info';
        $this->log($level, "Performance: {$operation}", $context);
    }

    /**
     * Log general events
     */
    public function logEvent(
        string $event,
        array $data = [],
        string $level = 'info'
    ): void {
        $context = $this->buildContext([
            'event_type' => 'general',
            'event' => $event,
            'data' => $data,
        ]);

        $this->log($level, "Event: {$event}", $context);
    }

    /**
     * Log info level message (PSR-3 compatible)
     */
    public function info(string $message, array $context = []): void
    {
        $this->log('info', $message, $this->buildContext($context));
    }

    /**
     * Log warning level message (PSR-3 compatible)
     */
    public function warning(string $message, array $context = []): void
    {
        $this->log('warning', $message, $this->buildContext($context));
    }

    /**
     * Log errors with full context
     */
    public function logError(
        \Throwable $exception,
        array $additionalContext = []
    ): void {
        $context = $this->buildContext([
            'event_type' => 'error',
            'exception_class' => get_class($exception),
            'exception_message' => $exception->getMessage(),
            'exception_code' => $exception->getCode(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $this->formatStackTrace($exception),
            'additional_context' => $additionalContext,
        ]);

        $this->log('error', "Error: {$exception->getMessage()}", $context);
    }

    /**
     * Log security events
     */
    public function logSecurityEvent(
        string $event,
        string $severity,
        array $data = []
    ): void {
        $context = $this->buildContext([
            'event_type' => 'security',
            'event' => $event,
            'severity' => $severity,
            'data' => $data,
        ]);

        $level = $severity === 'critical' ? 'critical' : ($severity === 'high' ? 'error' : 'warning');
        $this->log($level, "Security Event: {$event}", $context);
    }

    /**
     * Log database query performance
     */
    public function logDatabaseQuery(
        string $query,
        float $duration,
        array $bindings = []
    ): void {
        // Only log slow queries (>100ms)
        if ($duration < 0.1) {
            return;
        }

        $context = $this->buildContext([
            'event_type' => 'database_query',
            'query' => $this->sanitizeQuery($query),
            'duration_ms' => round($duration * 1000, 2),
            'bindings_count' => count($bindings),
        ]);

        $level = $duration > 1.0 ? 'warning' : 'info';
        $this->log($level, "Slow Query: {$duration}s", $context);
    }

    /**
     * Log cache operations
     */
    public function logCacheOperation(
        string $operation,
        string $key,
        bool $hit = null,
        float $duration = null
    ): void {
        $context = $this->buildContext([
            'event_type' => 'cache',
            'operation' => $operation,
            'key' => $key,
            'hit' => $hit,
            'duration_ms' => $duration ? round($duration * 1000, 2) : null,
        ]);

        $this->log('debug', "Cache {$operation}: {$key}", $context);
    }

    /**
     * Log workflow state transitions
     */
    public function logWorkflowTransition(
        string $taskId,
        string $fromStatus,
        string $toStatus,
        ?string $userId = null,
        array $metadata = []
    ): void {
        $context = $this->buildContext([
            'event_type' => 'workflow_transition',
            'task_id' => $taskId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'transition_user_id' => $userId,
            'metadata' => $metadata,
        ]);

        $this->log('info', "Workflow Transition: {$fromStatus} → {$toStatus}", $context);
    }

    /**
     * Create structured log entry
     */
    private function log(string $level, string $message, array $context): void
    {
        Log::log($level, $message, $context);
    }

    /**
     * Build comprehensive context for logging
     */
    private function buildContext(array $eventData): array
    {
        $context = [
            'timestamp' => now()->toIso8601String(),
            'environment' => config('app.env'),
            'application' => 'copilot-orchestration-extension',
        ];

        // Add user context if authenticated
        if (Auth::check()) {
            $context['user_id'] = Auth::id();
            $context['user_email'] = Auth::user()->email ?? null;
        }

        // Add request context if available
        if (app()->runningInConsole() === false) {
            $context['request_id'] = Request::header('X-Request-ID') ?? uniqid('req_', true);
            $context['ip_address'] = Request::ip();
            $context['user_agent'] = Request::userAgent();
            $context['method'] = Request::method();
            $context['url'] = Request::fullUrl();
        }

        // Add correlation ID if present
        if (Request::header('X-Correlation-ID')) {
            $context['correlation_id'] = Request::header('X-Correlation-ID');
        }

        // Merge event-specific data
        return array_merge($context, $eventData);
    }

    /**
     * Format exception stack trace for logging
     */
    private function formatStackTrace(\Throwable $exception): array
    {
        return array_map(function ($trace) {
            return [
                'file' => $trace['file'] ?? 'unknown',
                'line' => $trace['line'] ?? 0,
                'function' => $trace['function'] ?? 'unknown',
                'class' => $trace['class'] ?? null,
            ];
        }, array_slice($exception->getTrace(), 0, 10)); // Limit to 10 frames
    }

    /**
     * Sanitize SQL query for logging (remove sensitive data)
     */
    private function sanitizeQuery(string $query): string
    {
        // Remove potential sensitive data patterns
        $query = preg_replace('/\'[^\']*\'/', '?', $query);
        $query = preg_replace('/"[^"]*"/', '?', $query);
        
        return $query;
    }

    /**
     * Create log query builder for searching logs
     */
    public function queryLogs(array $filters = []): array
    {
        // This would integrate with your log storage solution
        // For now, return structure for future implementation
        return [
            'filters' => $filters,
            'timestamp_from' => $filters['from'] ?? null,
            'timestamp_to' => $filters['to'] ?? null,
            'event_type' => $filters['event_type'] ?? null,
            'level' => $filters['level'] ?? null,
            'user_id' => $filters['user_id'] ?? null,
        ];
    }

    /**
     * Get log statistics
     */
    public function getLogStatistics(string $period = '24h'): array
    {
        // This would query your log aggregation system
        // Return structure for future implementation
        return [
            'period' => $period,
            'total_logs' => 0,
            'by_level' => [
                'debug' => 0,
                'info' => 0,
                'warning' => 0,
                'error' => 0,
                'critical' => 0,
            ],
            'by_event_type' => [],
            'error_rate' => 0.0,
        ];
    }
}
