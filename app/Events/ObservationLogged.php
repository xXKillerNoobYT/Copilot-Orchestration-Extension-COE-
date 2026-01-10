<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Observation Logged Event
 * Broadcasts when an observation is recorded
 * Reference: Code Master Section 11.8 - Event Schemas
 */
class ObservationLogged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public object $observation,
        public $newTask = null
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('mcp-events'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'observation-logged';
    }
}
