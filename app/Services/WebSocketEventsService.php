<?php

namespace App\Services;

use App\Models\Task;
use Illuminate\Support\Facades\Log;

/**
 * WebSocket Events Service
 * Manages WebSocket event emission for real-time UI updates
 * 
 * Reference: Code Master notebook, Section 11.8 - WebSocket Event Model
 *
 * Event Types:
 * - task-status: Task progress updates
 * - observation: Discovery logging
 * - verification: Verification task updates
 * - test-failure: Test failure alerts
 * - server-status: Server state changes
 * - audit: KPI and metrics updates
 * 
 * Note: In Laravel, we use the Event::dispatch() with broadcastable events
 * or Laravel Echo with Redis/Pusher for real WebSocket support.
 * For MVP, we log events that would be broadcast.
 */
class WebSocketEventsService
{
    private string $channel = 'mcp-events';

    /**
     * Emit task status update event
     * Reference: Section 11.8 - task-status schema
     */
    public function emitTaskStatus(Task $task, int $progress = 0, string $message = ''): void
    {
        $event = [
            'type' => 'task-status',
            'taskId' => $task->id,
            'title' => $task->name,
            'status' => $task->status,
            'progress' => $progress,
            'message' => $message,
            'timestamp' => now()->toIso8601String(),
        ];

        $this->logEvent($event);
    }

    /**
     * Emit observation logged event
     * Reference: Section 11.8 - observation schema
     */
    public function emitObservation(
        string $taskId,
        string $type,
        string $message,
        string $severity = 'medium',
        bool $newTaskCreated = false,
        ?Task $newTask = null
    ): void {
        $event = [
            'type' => 'observation',
            'taskId' => $taskId,
            'observationType' => $type,
            'message' => $message,
            'severity' => $severity,
            'newTaskCreated' => $newTaskCreated,
            'newTaskId' => $newTask?->id,
            'timestamp' => now()->toIso8601String(),
        ];

        $this->logEvent($event);
    }

    /**
     * Emit verification task event
     * Reference: Section 11.8 - verification schema
     */
    public function emitVerification(
        string $verificationTaskId,
        string $originalTaskId,
        array $checklist = [],
        bool $requiresUserReady = false,
        string $serverStatus = 'idle',
        array $planHighlights = []
    ): void {
        $event = [
            'type' => 'verification',
            'taskId' => $verificationTaskId,
            'originalTaskId' => $originalTaskId,
            'checklist' => $checklist,
            'requiresUserReady' => $requiresUserReady,
            'serverStatus' => $serverStatus,
            'planHighlights' => $planHighlights,
            'timestamp' => now()->toIso8601String(),
        ];

        $this->logEvent($event);
    }

    /**
     * Emit test failure alert
     * Reference: Section 11.8 - test-failure schema
     */
    public function emitTestFailure(
        string $taskId,
        string $testName,
        string $errorMessage,
        ?string $stackTrace = null,
        string $failureType = 'error'
    ): void {
        $event = [
            'type' => 'test-failure',
            'taskId' => $taskId,
            'testName' => $testName,
            'errorMessage' => $errorMessage,
            'stackTrace' => $stackTrace,
            'failureType' => $failureType,
            'severity' => 'critical',
            'timestamp' => now()->toIso8601String(),
        ];

        $this->logEvent($event);
    }

    /**
     * Emit server status change event
     * Reference: Section 11.8 - server-status schema
     */
    public function emitServerStatus(
        string $status,
        array $metrics = [],
        ?string $message = null
    ): void {
        $event = [
            'type' => 'server-status',
            'status' => $status,
            'metrics' => $metrics,
            'message' => $message,
            'timestamp' => now()->toIso8601String(),
        ];

        $this->logEvent($event);
    }

    /**
     * Emit audit dashboard update event
     * Reference: Section 11.8 - audit schema (Section 11.9 - Audit Dashboard)
     */
    public function emitAudit(
        int $total,
        int $completed,
        int $blocked,
        int $verification,
        int $investigation,
        string $planVersion = '1.0.0',
        array $velocity = [],
        array $compliance = []
    ): void {
        $event = [
            'type' => 'audit',
            'counts' => [
                'total' => $total,
                'completed' => $completed,
                'blocked' => $blocked,
                'verification' => $verification,
                'investigation' => $investigation,
            ],
            'planVersion' => $planVersion,
            'velocity' => $velocity,
            'compliance' => $compliance,
            'timestamp' => now()->toIso8601String(),
        ];

        $this->logEvent($event);
    }

    /**
     * Log event to cache/queue for broadcasting
     * In production, would use Laravel Echo with Pusher/Redis
     */
    private function logEvent(array $event): void
    {
        Log::channel('mcp-events')->info('WebSocket event', [
            'channel' => $this->channel,
            'event' => $event,
        ]);

        // TODO: When WebSocket server is fully implemented, dispatch to real-time queue
        // broadcast(new McpEvent($event))->toOthers();
    }

    /**
     * Get default channel name for MCP events
     */
    public function getChannel(): string
    {
        return $this->channel;
    }
}
