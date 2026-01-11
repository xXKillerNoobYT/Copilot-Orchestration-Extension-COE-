<?php

namespace App\Listeners;

use App\Events\TaskStatusUpdated;
use App\Services\MetricsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class RecordTaskMetrics implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct(private MetricsService $metricsService)
    {
    }

    /**
     * Handle the event.
     * 
     * Records metrics for task status transitions:
     * - Task completion: duration calculation
     * - Task started: beginning of execution
     * - Task failed: error recording
     */
    public function handle(TaskStatusUpdated $event): void
    {
        $task = $event->task;
        $oldStatus = $event->context['old_status'] ?? null;
        $newStatus = $task->status;

        try {
            switch ($newStatus) {
                case 'in_progress':
                    if ($oldStatus !== 'in_progress') {
                        $this->metricsService->recordTaskStart(
                            $task->id,
                            $task->assigned_agent ? intval($task->assigned_agent) : null,
                            auth()->id(),
                            $task->project_id
                        );
                    }
                    break;

                case 'completed':
                    if ($task->started_at && $task->completed_at) {
                        $durationSeconds = $task->completed_at->diffInSeconds($task->started_at);
                        $this->metricsService->recordTaskCompletion(
                            $task->id,
                            (float) $durationSeconds,
                            auth()->id(),
                            $task->project_id
                        );
                    }
                    break;

                case 'failed':
                    $errorMessage = $task->description ?? 'Task failed without error message';
                    $this->metricsService->recordErrorEvent(
                        $errorMessage,
                        $task->id,
                        $task->assigned_agent ? intval($task->assigned_agent) : null,
                        auth()->id(),
                        $task->project_id
                    );
                    break;

                case 'blocked':
                    // Record blocking event
                    $this->metricsService->recordErrorEvent(
                        "Task blocked: {$task->description}",
                        $task->id,
                        $task->assigned_agent ? intval($task->assigned_agent) : null,
                        auth()->id(),
                        $task->project_id,
                        ['type' => 'blocked_task']
                    );
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Failed to record task metrics', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);
            // Don't re-throw - metrics failure shouldn't break task updates
        }
    }
}
