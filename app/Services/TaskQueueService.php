<?php

namespace App\Services;

use App\Models\Task;

/**
 * Task Queue Service
 * Manages task queue operations for MCP integration
 * 
 * TODO: Implement full task queue logic per Code Master Section 11.7
 */
class TaskQueueService
{
    /**
     * Get next ready task from queue
     * Alias for getNextReady for API compatibility
     */
    public function getNextTask(?string $filter = null, ?string $priority = null): ?Task
    {
        return $this->getNextReady($filter, $priority);
    }

    public function getNextReady(?string $filter = null, ?string $priority = null): ?Task
    {
        // TODO: Implement task queue retrieval with filtering
        return Task::where('status', 'pending')->first();
    }

    /**
     * Get queue statistics
     */
    public function getQueueStats(): array
    {
        return [
            'totalTasks' => Task::count(),
            'readyTasks' => Task::where('status', 'pending')->count(),
            'inProgressTasks' => Task::where('status', 'in_progress')->count(),
            'blockedTasks' => Task::where('status', 'blocked')->count(),
            'completedTasks' => Task::where('status', 'completed')->count(),
        ];
    }

    public function countReady(): int
    {
        return Task::where('status', 'pending')->count();
    }

    public function countBlocked(): int
    {
        return Task::where('status', 'blocked')->count();
    }

    public function countVerification(): int
    {
        return Task::where('status', 'review')->count();
    }

    public function countInvestigation(): int
    {
        // Tasks with investigation parent
        return Task::where('task_type', 'investigation')->count();
    }

    public function peekNext(int $count = 2): array
    {
        return Task::where('status', 'pending')->limit($count)->get()->toArray();
    }
}
