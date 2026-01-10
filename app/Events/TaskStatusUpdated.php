<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Task Status Updated Event
 * Broadcasts when a task status changes
 * Reference: Code Master Section 11.8 - Event Schemas
 */
class TaskStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Task $task,
        public array $context = []
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('mcp-events'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'task-status-updated';
    }
}
