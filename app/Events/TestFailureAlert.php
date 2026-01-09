<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Test Failure Alert Event
 * Broadcasts critical alerts when tests fail
 * Reference: Code Master Section 11.8 - Event Schemas
 */
class TestFailureAlert implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Task $task,
        public Task $investigationTask
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('mcp-events'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'test-failure-alert';
    }
}
