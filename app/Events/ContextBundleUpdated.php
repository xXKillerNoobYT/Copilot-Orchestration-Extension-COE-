<?php

namespace App\Events;

use App\Models\ContextBundle;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContextBundleUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ContextBundle $bundle
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('context-bundles');
    }

    public function broadcastWith(): array
    {
        return [
            'bundle_id' => $this->bundle->id,
            'task_id' => $this->bundle->task_id,
            'bundle_type' => $this->bundle->bundle_type,
            'version' => $this->bundle->version,
            'updated_at' => $this->bundle->updated_at,
        ];
    }
}
