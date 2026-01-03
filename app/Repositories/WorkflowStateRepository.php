<?php

namespace App\Repositories;

use App\Models\WorkflowState;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Workflow State Repository
 * 
 * Manages workflow state transitions and history.
 */
class WorkflowStateRepository
{
    /**
     * Create a new workflow state transition.
     *
     * @param array $data Workflow state attributes
     * @return WorkflowState
     */
    public function create(array $data): WorkflowState
    {
        $state = WorkflowState::create(array_merge($data, [
            'transitioned_at' => now(),
        ]));
        
        // Invalidate task workflow cache
        if (isset($data['task_id'])) {
            Cache::tags(['workflow'])->forget("task:workflow:{$data['task_id']}");
        }
        
        return $state;
    }

    /**
     * Get workflow history for a task.
     *
     * @param string $taskId Task UUID
     * @return Collection
     */
    public function getTaskHistory(string $taskId): Collection
    {
        return Cache::tags(['workflow'])->remember(
            "task:workflow:{$taskId}",
            now()->addMinutes(15),
            fn () => WorkflowState::where('task_id', $taskId)
                ->orderBy('transitioned_at', 'desc')
                ->get()
        );
    }

    /**
     * Get current workflow state for a task.
     *
     * @param string $taskId Task UUID
     * @return WorkflowState|null
     */
    public function getCurrentState(string $taskId): ?WorkflowState
    {
        return WorkflowState::where('task_id', $taskId)
            ->orderBy('transitioned_at', 'desc')
            ->first();
    }

    /**
     * Get workflow states by type for a project.
     *
     * @param string $projectId Project UUID
     * @param string $workflowType Workflow type
     * @return Collection
     */
    public function getByWorkflowType(string $projectId, string $workflowType): Collection
    {
        return WorkflowState::where('project_id', $projectId)
            ->where('workflow_type', $workflowType)
            ->orderBy('transitioned_at', 'desc')
            ->get();
    }

    /**
     * Get recent workflow transitions for a project.
     *
     * @param string $projectId Project UUID
     * @param int $limit Number of recent transitions
     * @return Collection
     */
    public function getRecentTransitions(string $projectId, int $limit = 50): Collection
    {
        return WorkflowState::where('project_id', $projectId)
            ->with('task')
            ->orderBy('transitioned_at', 'desc')
            ->limit($limit)
            ->get();
    }
}
