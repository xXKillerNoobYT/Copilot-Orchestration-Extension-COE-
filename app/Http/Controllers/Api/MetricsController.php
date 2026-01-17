<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MetricsService;
use Illuminate\Http\JsonResponse;

class MetricsController extends Controller
{
    public function __construct(private readonly MetricsService $metricsService)
    {
    }

    public function tasks(): JsonResponse
    {
        $validated = request()->validate([
            'range' => ['sometimes', 'string', 'regex:/^\d+[hdwm]$/'],
        ]);

        $range = $validated['range'] ?? '7d';
        return response()->json($this->metricsService->getTaskMetrics($range));
    }

    public function agents(): JsonResponse
    {
        return response()->json($this->metricsService->getAgentMetrics());
    }

    public function errors(): JsonResponse
    {
        $validated = request()->validate([
            'severity' => 'nullable|string|in:critical,high,medium,low',
            'limit'    => 'nullable|integer|min:1|max:1000',
        ]);

        $severity = $validated['severity'] ?? null;
        $limit = $validated['limit'] ?? 10;

        return response()->json($this->metricsService->getErrorMetrics($limit, $severity));
    }

    /**
     * Get KPI dashboard data with all 15 key performance indicators.
     * 
     * @return JsonResponse
     */
    public function dashboard(): JsonResponse
    {
        $days = request()->query('days', 30);
        return response()->json($this->metricsService->getKpiDashboard($days));
    }

    /**
     * Get metrics history for a specific metric name.
     * 
     * @return JsonResponse
     */
    public function history(): JsonResponse
    {
        $metricName = request()->query('metric', 'test_coverage_percent');
        $days = request()->query('days', 30);
        return response()->json($this->metricsService->getMetricsHistory($metricName, $days));
    }

    /**
     * Manually trigger metrics aggregation (admin only).
     * 
     * @return JsonResponse
     */
    public function aggregate(): JsonResponse
    {
        $days = request()->query('days', 1);
        
        \App\Jobs\AggregateMetrics::dispatch($days);
        
        return response()->json([
            'message' => 'Metrics aggregation job dispatched',
            'days' => $days,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Get current system health metrics.
     * 
     * @return JsonResponse
     */
    public function health(): JsonResponse
    {
        $taskMetrics = $this->metricsService->getTaskMetrics();
        $agentMetrics = $this->metricsService->getAgentMetrics();
        $errorMetrics = $this->metricsService->getErrorMetrics();

        $health = [
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'tasks' => [
                'total' => $taskMetrics['counts']['total'],
                'completed' => $taskMetrics['counts']['completed'],
                'completion_rate' => $taskMetrics['completionRate'],
                'blocked' => $taskMetrics['counts']['blocked'],
                'failed' => $taskMetrics['counts']['failed'],
            ],
            'agents' => [
                'total' => $agentMetrics['counts']['total_agents'],
                'active' => $agentMetrics['counts']['active_agents'],
                'utilization' => $agentMetrics['utilization'],
            ],
            'errors' => [
                'total' => $errorMetrics['failures']['total_executions'],
                'failed' => $errorMetrics['failures']['failed_executions'],
                'failure_rate' => $errorMetrics['failures']['failure_rate'],
            ],
        ];

        // Determine health status
        if ($errorMetrics['failures']['failure_rate'] > 10) {
            $health['status'] = 'warning';
        } elseif ($errorMetrics['failures']['failure_rate'] > 25) {
            $health['status'] = 'critical';
        }

        if ($agentMetrics['counts']['active_agents'] === 0) {
            $health['status'] = 'critical';
        }

        return response()->json($health);
    }
}
