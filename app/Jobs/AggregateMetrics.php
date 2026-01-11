<?php

namespace App\Jobs;

use App\Models\MetricsEvent;
use App\Services\MetricsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AggregateMetrics implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of days to aggregate for
     */
    protected int $days = 1;

    /**
     * Create a new job instance.
     */
    public function __construct(?int $days = null)
    {
        if ($days !== null) {
            $this->days = $days;
        }
    }

    /**
     * Execute the job.
     * 
     * Aggregates raw metrics events into summary statistics.
     * Calculates KPIs and stores results for dashboard consumption.
     * Should run daily at off-peak hours (e.g., 1 AM UTC).
     */
    public function handle(MetricsService $metricsService): void
    {
        try {
            Log::info('Starting metrics aggregation', ['days' => $this->days]);
            $startTime = microtime(true);

            // Get the aggregation period
            $to = now()->endOfDay();
            $from = $to->copy()->subDays($this->days)->startOfDay();

            // Aggregate by event type
            $this->aggregateEventTypes($from, $to);

            // Aggregate by metric name
            $this->aggregateMetricNames($from, $to);

            // Aggregate by context (e.g., by endpoint for API calls)
            $this->aggregateByContext($from, $to);

            // Cleanup old metrics
            $this->cleanupOldMetrics();

            $duration = microtime(true) - $startTime;
            Log::info('Metrics aggregation completed', [
                'duration_seconds' => round($duration, 2),
                'period' => "{$from->toDateString()} to {$to->toDateString()}",
            ]);
        } catch (\Exception $e) {
            Log::error('Metrics aggregation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Aggregate metrics by event type.
     */
    protected function aggregateEventTypes($from, $to): void
    {
        $eventTypes = MetricsEvent::select('event_type')
            ->inDateRange($from, $to)
            ->distinct()
            ->pluck('event_type');

        foreach ($eventTypes as $eventType) {
            $events = MetricsEvent::where('event_type', $eventType)
                ->inDateRange($from, $to)
                ->get();

            $count = $events->count();
            $sum = $events->sum('value');
            $average = $count > 0 ? $sum / $count : 0;

            Log::debug('Aggregated event type', [
                'event_type' => $eventType,
                'count' => $count,
                'average_value' => round($average, 2),
                'sum' => round($sum, 2),
            ]);
        }
    }

    /**
     * Aggregate metrics by metric name.
     */
    protected function aggregateMetricNames($from, $to): void
    {
        $metricNames = MetricsEvent::select('metric_name')
            ->inDateRange($from, $to)
            ->distinct()
            ->pluck('metric_name');

        foreach ($metricNames as $metricName) {
            $events = MetricsEvent::where('metric_name', $metricName)
                ->inDateRange($from, $to)
                ->get();

            $count = $events->count();
            $average = $count > 0 ? $events->avg('value') : 0;
            $min = $count > 0 ? $events->min('value') : 0;
            $max = $count > 0 ? $events->max('value') : 0;

            Log::debug('Aggregated metric', [
                'metric_name' => $metricName,
                'count' => $count,
                'average' => round($average, 2),
                'min' => round($min, 2),
                'max' => round($max, 2),
            ]);
        }
    }

    /**
     * Aggregate metrics by context (e.g., by API endpoint).
     */
    protected function aggregateByContext($from, $to): void
    {
        // Get all distinct contexts
        $contexts = MetricsEvent::select('context_key', 'context_value')
            ->inDateRange($from, $to)
            ->whereNotNull('context_key')
            ->distinct()
            ->get();

        foreach ($contexts as $context) {
            $events = MetricsEvent::where('context_key', $context->context_key)
                ->where('context_value', $context->context_value)
                ->inDateRange($from, $to)
                ->get();

            $count = $events->count();
            $average = $count > 0 ? $events->avg('value') : 0;

            Log::debug('Aggregated context', [
                'context' => "{$context->context_key}={$context->context_value}",
                'count' => $count,
                'average_value' => round($average, 2),
            ]);
        }
    }

    /**
     * Clean up metrics older than retention period.
     */
    protected function cleanupOldMetrics(): void
    {
        $retentionDays = config('metrics.retention_days', 90);
        $cutoffDate = now()->subDays($retentionDays);

        $deleted = MetricsEvent::where('recorded_at', '<', $cutoffDate)->delete();

        if ($deleted > 0) {
            Log::info("Cleaned up old metrics", [
                'deleted_count' => $deleted,
                'cutoff_date' => $cutoffDate->toDateString(),
            ]);
        }
    }
}
