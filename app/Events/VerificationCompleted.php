<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Verification Completed Event
 * Broadcasts when verification workflow completes
 * Reference: Code Master Section 11.8 - Event Schemas
 */
class VerificationCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public array $result
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('mcp-events'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'verification-completed';
    }
}
