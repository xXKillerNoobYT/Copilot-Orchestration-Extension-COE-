<?php

namespace App\Services;

use App\Models\Task;
use App\Models\WorkflowState;
use App\Repositories\WorkflowStateRepository;
use Illuminate\Support\Facades\Log;

/**
 * Workflow State Service
 * 
 * Manages workflow state transitions and validation.
 * Implements state machine logic for task lifecycle.
 */
class WorkflowStateService
{
    /**
     * Valid workflow state transitions.
     * Maps current status to allowed next statuses.
     */
    private const ALLOWED_TRANSITIONS = [
        'pending' => ['approved', 'in_progress', 'cancelled'],
        'approved' => ['in_progress', 'cancelled'],
        'in_progress' => ['testing', 'review', 'completed', 'failed', 'blocked'],
        'testing' => ['review', 'in_progress', 'completed', 'failed'],
        'review' => ['in_progress', 'completed', 'failed'],
        'completed' => [], // Terminal state
        'failed' => ['in_progress', 'cancelled'],
        'blocked' => ['in_progress', 'cancelled'],
        'cancelled' => [], // Terminal state
    ];

    /**
     * Workflow types mapped to task types.
     */
    private const TASK_TYPE_TO_WORKFLOW = [
        'feature' => 'development',
        'bug' => 'development',
        'refactor' => 'development',
        'architecture' => 'planning',
        'testing' => 'testing',
        'documentation' => 'development',
        'maintenance' => 'maintenance',
    ];

    public function __construct(
        private WorkflowStateRepository $workflowStateRepository
    ) {}

    /**
     * Validate if a status transition is allowed.
     *
     * @param string $currentStatus Current task status
     * @param string $newStatus Proposed new status
     * @return bool
     */
    public function validateTransition(string $currentStatus, string $newStatus): bool
    {
        // Allow staying in the same status
        if ($currentStatus === $newStatus) {
            return true;
        }
        
        // Check if transition is in allowed transitions
        $allowedNextStates = self::ALLOWED_TRANSITIONS[$currentStatus] ?? [];
        return in_array($newStatus, $allowedNextStates);
    }

    /**
     * Get allowed next states for a given status.
     *
     * @param string $currentStatus Current task status
     * @return array
     */
    public function getAllowedTransitions(string $currentStatus): array
    {
        return self::ALLOWED_TRANSITIONS[$currentStatus] ?? [];
    }

    /**
     * Initialize workflow state for a new task.
     *
     * @param Task $task
     * @return WorkflowState
     */
    public function initializeState(Task $task): WorkflowState
    {
        $workflowType = $this->determineWorkflowType($task);
        
        $state = $this->workflowStateRepository->create([
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'workflow_type' => $workflowType,
            'state' => $task->status,
            'previous_state' => null,
            'metadata' => [
                'task_type' => $task->task_type,
                'priority' => $task->priority,
                'created_by' => 'system',
            ],
        ]);
        
        Log::info('Workflow state initialized', [
            'task_id' => $task->id,
            'workflow_type' => $workflowType,
            'initial_state' => $task->status,
        ]);
        
        return $state;
    }

    /**
     * Record a state transition.
     *
     * @param Task $task
     * @param string $oldStatus Previous status
     * @param string $newStatus New status
     * @param array $metadata Additional metadata
     * @return WorkflowState
     */
    public function recordTransition(
        Task $task,
        string $oldStatus,
        string $newStatus,
        array $metadata = []
    ): WorkflowState {
        $workflowType = $this->determineWorkflowType($task);
        
        $state = $this->workflowStateRepository->create([
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'workflow_type' => $workflowType,
            'state' => $newStatus,
            'previous_state' => $oldStatus,
            'metadata' => array_merge([
                'task_type' => $task->task_type,
                'priority' => $task->priority,
                'transition_by' => $metadata['user_id'] ?? 'system',
                'reason' => $metadata['reason'] ?? null,
            ], $metadata),
        ]);
        
        Log::info('Workflow state transition recorded', [
            'task_id' => $task->id,
            'workflow_type' => $workflowType,
            'old_state' => $oldStatus,
            'new_state' => $newStatus,
        ]);
        
        return $state;
    }

    /**
     * Get workflow history for a task.
     *
     * @param string $taskId Task UUID
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getTaskHistory(string $taskId): \Illuminate\Database\Eloquent\Collection
    {
        return $this->workflowStateRepository->getTaskHistory($taskId);
    }

    /**
     * Get current workflow state for a task.
     *
     * @param string $taskId Task UUID
     * @return WorkflowState|null
     */
    public function getCurrentState(string $taskId): ?WorkflowState
    {
        return $this->workflowStateRepository->getCurrentState($taskId);
    }

    /**
     * Check if a task is in a terminal state.
     *
     * @param string $status Task status
     * @return bool
     */
    public function isTerminalState(string $status): bool
    {
        return empty(self::ALLOWED_TRANSITIONS[$status]);
    }

    /**
     * Determine workflow type based on task type.
     *
     * @param Task $task
     * @return string
     */
    private function determineWorkflowType(Task $task): string
    {
        return self::TASK_TYPE_TO_WORKFLOW[$task->task_type] ?? 'development';
    }

    /**
     * Get workflow statistics for a project.
     *
     * @param string $projectId Project UUID
     * @return array
     */
    public function getWorkflowStatistics(string $projectId): array
    {
        $states = $this->workflowStateRepository->getRecentTransitions($projectId, 100);
        
        $statistics = [
            'total_transitions' => $states->count(),
            'by_workflow_type' => $states->groupBy('workflow_type')->map->count(),
            'by_state' => $states->groupBy('state')->map->count(),
            'recent_transitions' => $states->take(10)->map(function ($state) {
                return [
                    'task_id' => $state->task_id,
                    'workflow_type' => $state->workflow_type,
                    'state' => $state->state,
                    'previous_state' => $state->previous_state,
                    'transitioned_at' => $state->transitioned_at,
                ];
            }),
        ];
        
        return $statistics;
    }

    /**
     * Validate workflow configuration for a task type.
     *
     * @param string $taskType Task type
     * @return bool
     */
    public function validateWorkflowConfiguration(string $taskType): bool
    {
        return isset(self::TASK_TYPE_TO_WORKFLOW[$taskType]);
    }
}
