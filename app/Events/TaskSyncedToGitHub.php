<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskSyncedToGitHub implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Task $task,
        public array $githubResponse,
        public bool $isNewIssue
    ) {}

    /**
     * Get the channels the event should broadcast on
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tasks.' . $this->task->id),
            new PrivateChannel('projects.' . $this->task->project_id),
        ];
    }

    /**
     * Get the data to broadcast
     */
    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'task_status' => $this->task->status,
            'github_issue_number' => $this->githubResponse['number'] ?? null,
            'github_issue_url' => $this->githubResponse['html_url'] ?? null,
            'is_new_issue' => $this->isNewIssue,
            'synced_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get the event name
     */
    public function broadcastAs(): string
    {
        return 'task.synced.to.github';
    }
}
