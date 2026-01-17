<?php

namespace App\Http\Controllers\Api;

use App\Services\LoggingService;
use App\Services\MetricsCollectionService;
use App\Services\PerformanceMonitoringService;
use App\Services\AuditTrailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonitoringController
{
    public function __construct(
        private LoggingService $logging,
        private MetricsCollectionService $metrics,
        private PerformanceMonitoringService $performance,
        private AuditTrailService $audit
    ) {}

    /**
     * Get system health status
     * 
     * GET /monitoring/health
     */
    public function health(): JsonResponse
    {
        $metrics = $this->metrics->getSystemHealthMetrics();
        $systemMetrics = $this->performance->getSystemMetrics();
        $alerts = $this->performance->getPerformanceAlerts();
        
        $status = empty($alerts) ? 'healthy' : 
            (count(array_filter($alerts, fn($a) => $a['severity'] === 'critical')) > 0 ? 'critical' : 'degraded');
        
        return response()->json([
            'success' => true,
            'data' => [
                'status' => $status,
                'timestamp' => now()->toIso8601String(),
                'metrics' => $metrics,
                'system' => $systemMetrics,
                'alerts' => $alerts,
            ],
        ]);
    }

    /**
     * Get system metrics
     * 
     * GET /monitoring/metrics
     */
    public function systemMetrics(): JsonResponse
    {
        $metrics = $this->performance->getSystemMetrics();
        
        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * Get application metrics
     * 
     * GET /monitoring/metrics/application
     */
    public function applicationMetrics(): JsonResponse
    {
        $metrics = $this->metrics->getSystemHealthMetrics();
        
        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * Get performance report
     * 
     * GET /monitoring/performance
     */
    public function performanceReport(): JsonResponse
    {
        $report = $this->performance->generatePerformanceReport();
        
        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get performance alerts
     * 
     * GET /monitoring/alerts
     */
    public function alerts(): JsonResponse
    {
        $alerts = $this->performance->getPerformanceAlerts();
        
        return response()->json([
            'success' => true,
            'data' => $alerts,
            'count' => count($alerts),
        ]);
    }

    /**
     * Get performance trends
     * 
     * GET /monitoring/trends
     */
    public function trends(Request $request): JsonResponse
    {
        $period = $request->input('period', '1h');
        $trends = $this->performance->getPerformanceTrends($period);
        
        return response()->json([
            'success' => true,
            'data' => $trends,
        ]);
    }

    /**
     * Get audit trail
     * 
     * GET /monitoring/audit
     */
    public function auditTrail(Request $request): JsonResponse
    {
        $filters = [
            'entity_type' => $request->input('entity_type'),
            'action' => $request->input('action'),
            'user_id' => $request->input('user_id'),
            'from_date' => $request->input('from_date'),
            'to_date' => $request->input('to_date'),
            'per_page' => $request->input('per_page', 50),
        ];
        
        $audits = $this->audit->searchAudits(array_filter($filters));
        
        return response()->json([
            'success' => true,
            'data' => $audits,
        ]);
    }

    /**
     * Get audit trail for specific entity
     * 
     * GET /monitoring/audit/{entityType}/{entityId}
     */
    public function entityAuditTrail(string $entityType, string $entityId, Request $request): JsonResponse
    {
        $filters = [
            'action' => $request->input('action'),
            'user_id' => $request->input('user_id'),
            'from_date' => $request->input('from_date'),
            'to_date' => $request->input('to_date'),
            'limit' => $request->input('limit', 100),
        ];
        
        $trail = $this->audit->getAuditTrail($entityType, $entityId, array_filter($filters));
        
        return response()->json([
            'success' => true,
            'data' => $trail,
            'count' => count($trail),
        ]);
    }

    /**
     * Get audit statistics
     * 
     * GET /monitoring/audit/statistics
     */
    public function auditStatistics(Request $request): JsonResponse
    {
        $period = $request->input('period', '24h');
        $stats = $this->audit->getAuditStatistics($period);
        
        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Export audit logs
     * 
     * GET /monitoring/audit/export
     */
    public function exportAudit(Request $request): mixed
    {
        $filters = [
            'entity_type' => $request->input('entity_type'),
            'action' => $request->input('action'),
            'user_id' => $request->input('user_id'),
            'from_date' => $request->input('from_date'),
            'to_date' => $request->input('to_date'),
            'per_page' => 10000, // Large limit for export
        ];
        
        $format = $request->input('format', 'json');
        $content = $this->audit->exportAudits(array_filter($filters), $format);
        
        $filename = "audit-export-" . now()->format('Y-m-d-His') . ".{$format}";
        
        return response($content)
            ->header('Content-Type', $format === 'csv' ? 'text/csv' : 'application/json')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    /**
     * Get log statistics
     * 
     * GET /monitoring/logs/statistics
     */
    public function logStatistics(Request $request): JsonResponse
    {
        $period = $request->input('period', '24h');
        $stats = $this->logging->getLogStatistics($period);
        
        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get specific metric
     * 
     * GET /monitoring/metrics/{type}/{name}
     */
    public function getMetric(string $type, string $name, Request $request): JsonResponse
    {
        $tags = $request->input('tags', []);
        $value = $this->metrics->getMetric($type, $name, $tags);
        
        return response()->json([
            'success' => true,
            'data' => [
                'type' => $type,
                'name' => $name,
                'tags' => $tags,
                'value' => $value,
            ],
        ]);
    }

    /**
     * Get metrics by prefix
     * 
     * GET /monitoring/metrics/prefix/{prefix}
     */
    public function getMetricsByPrefix(string $prefix): JsonResponse
    {
        $metrics = $this->metrics->getMetricsByPrefix($prefix);
        
        return response()->json([
            'success' => true,
            'data' => $metrics,
            'count' => count($metrics),
        ]);
    }

    /**
     * Reset metrics
     * 
     * POST /monitoring/metrics/reset
     */
    public function resetMetrics(Request $request): JsonResponse
    {
        $prefix = $request->input('prefix', '');
        $this->metrics->resetMetrics($prefix);
        
        return response()->json([
            'success' => true,
            'message' => 'Metrics reset successfully',
        ]);
    }

    /**
     * Get task executions
     * 
     * GET /monitoring/executions
     */
    public function executions(Request $request): JsonResponse
    {
        $limit = $request->input('limit', 50);
        
        $executions = \App\Models\TaskExecution::with(['task', 'agent'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $executions,
            'count' => $executions->count(),
        ]);
    }

    /**
     * Dashboard data
     * 
     * GET /monitoring/dashboard
     */
    public function dashboard(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'health' => $this->getHealthSummary(),
                'metrics' => $this->metrics->getSystemHealthMetrics(),
                'performance' => $this->performance->getSystemMetrics(),
                'alerts' => $this->performance->getPerformanceAlerts(),
                'recent_audits' => $this->audit->getRecentAudits(10),
            ],
        ]);
    }

    /**
     * Get health summary
     */
    private function getHealthSummary(): array
    {
        $alerts = $this->performance->getPerformanceAlerts();
        $criticalCount = count(array_filter($alerts, fn($a) => $a['severity'] === 'critical'));
        $warningCount = count(array_filter($alerts, fn($a) => $a['severity'] === 'warning'));
        
        $status = match(true) {
            $criticalCount > 0 => 'critical',
            $warningCount > 0 => 'degraded',
            default => 'healthy',
        };
        
        return [
            'status' => $status,
            'critical_alerts' => $criticalCount,
            'warning_alerts' => $warningCount,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
