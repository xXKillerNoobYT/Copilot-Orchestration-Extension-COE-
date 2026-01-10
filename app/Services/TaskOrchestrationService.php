<?php

namespace App\Services;

use App\Models\Task;
use App\Repositories\TaskRepository;
use App\Events\TaskCreated;
use App\Events\TaskStatusChanged;
use App\Exceptions\TaskValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Task Orchestration Service
 * 
 * Handles core task management operations following SOLID principles.
 * Coordinates between repositories, validation, and event dispatching.
 */
class TaskOrchestrationService
{
    public function __construct(
        private TaskRepository $taskRepository,
        private DependencyGraphService $dependencyService,
        private WorkflowStateService $workflowService
    ) {}

    /**
     * Create a new task with validation and dependency checking.
     *
     * @param array $data Task data
     * @return Task
     * @throws TaskValidationException
     */
    public function createTask(array $data): Task
    {
        // Validate task data
        $this->validateTaskData($data);
        
        // Generate UUID if not provided
        if (!isset($data['id'])) {
            $data['id'] = (string) Str::uuid();
        }
        
        // Validate dependencies exist if provided
        if (isset($data['dependencies']) && !empty($data['dependencies'])) {
            $this->validateDependencies($data['dependencies']);
        }
        
        DB::beginTransaction();
        
        try {
            // Create the task
            $task = $this->taskRepository->create($data);
            
            // Create dependencies if provided
            if (isset($data['dependencies']) && !empty($data['dependencies'])) {
                foreach ($data['dependencies'] as $dependencyId) {
                    $this->dependencyService->createDependency(
                        $task->id,
                        $dependencyId,
                        $data['dependency_type'] ?? 'requires'
                    );
                }
            }
            
            // Initialize workflow state
            $this->workflowService->initializeState($task);
            
            DB::commit();
            
            // Dispatch event
            event(new TaskCreated($task));
            
            Log::info('Task created', [
                'task_id' => $task->id,
                'project_id' => $task->project_id,
                'type' => $task->task_type,
            ]);
            
            return $task->fresh(['dependencies', 'subtasks']);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Task creation failed', [
                'error' => $e->getMessage(),
                'data' => $data,
            ]);
            
            throw new TaskValidationException(
                'Failed to create task: ' . $e->getMessage()
            );
        }
    }

    /**
     * Update task status with workflow validation.
     *
     * @param string $taskId Task UUID
     * @param string $newStatus New status
     * @param array $metadata Optional metadata for the transition
     * @return Task
     * @throws TaskValidationException
     */
    public function updateTaskStatus(string $taskId, string $newStatus, array $metadata = []): Task
    {
        $task = $this->taskRepository->findById($taskId, false);
        
        if (!$task) {
            throw new TaskValidationException("Task not found: {$taskId}");
        }
        
        // Validate status transition
        if (!$this->workflowService->validateTransition($task->status, $newStatus)) {
            throw new TaskValidationException(
                "Invalid status transition from {$task->status} to {$newStatus}"
            );
        }
        
        // Check if task can be started (dependencies completed)
        if ($newStatus === 'in_progress' && !$this->canStartTask($task)) {
            throw new TaskValidationException(
                "Task has uncompleted dependencies and cannot be started"
            );
        }
        
        DB::beginTransaction();
        
        try {
            $oldStatus = $task->status;
            
            // Update task status
            $task = $this->taskRepository->updateStatus($taskId, $newStatus);
            
            // Record workflow transition
            $this->workflowService->recordTransition(
                $task,
                $oldStatus,
                $newStatus,
                $metadata
            );
            
            // Unblock dependent tasks if completed
            if ($newStatus === 'completed') {
                $this->unblockDependentTasks($taskId);
            }
            
            DB::commit();
            
            // Dispatch event
            event(new TaskStatusChanged($task, $oldStatus, $newStatus));
            
            Log::info('Task status updated', [
                'task_id' => $taskId,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ]);
            
            return $task;
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Task status update failed', [
                'task_id' => $taskId,
                'new_status' => $newStatus,
                'error' => $e->getMessage(),
            ]);
            
            throw new TaskValidationException(
                'Failed to update task status: ' . $e->getMessage()
            );
        }
    }

    /**
     * Get task with full context (dependencies, workflow, execution history).
     *
     * @param string $taskId Task UUID
     * @return Task|null
     */
    public function getTaskWithContext(string $taskId): ?Task
    {
        return $this->taskRepository->findWithContext($taskId);
    }

    /**
     * Get all tasks for a project with optional filters.
     *
     * @param string $projectId Project UUID
     * @param array $filters Optional filters
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getTasksByProject(string $projectId, array $filters = []): \Illuminate\Database\Eloquent\Collection
    {
        return $this->taskRepository->getByProject($projectId, $filters);
    }

    /**
     * Assign an agent to a task based on capabilities.
     *
     * @param string $taskId Task UUID
     * @param string|null $preferredAgent Preferred agent type
     * @return Task
     * @throws TaskValidationException
     */
    public function assignAgent(string $taskId, ?string $preferredAgent = null): Task
    {
        $task = $this->taskRepository->findById($taskId, false);
        
        if (!$task) {
            throw new TaskValidationException("Task not found: {$taskId}");
        }
        
        // If preferred agent provided, use it; otherwise, auto-select based on task type
        $agentType = $preferredAgent ?? $this->selectAgentForTask($task);
        
        $updatedTask = $this->taskRepository->assignAgent($taskId, $agentType);
        
        Log::info('Agent assigned to task', [
            'task_id' => $taskId,
            'agent_type' => $agentType,
            'task_type' => $task->task_type,
        ]);
        
        return $updatedTask;
    }

    /**
     * Unblock tasks that were waiting for this task to complete.
     *
     * @param string $completedTaskId Completed task UUID
     * @return int Number of tasks unblocked
     */
    public function unblockDependentTasks(string $completedTaskId): int
    {
        $dependentTasks = $this->taskRepository->getDependentTasks($completedTaskId);
        $unblocked = 0;
        
        foreach ($dependentTasks as $task) {
            // Check if all dependencies are now completed
            if ($this->canStartTask($task)) {
                if ($task->status === 'blocked') {
                    $this->updateTaskStatus($task->id, 'pending');
                    $unblocked++;
                }
            }
        }
        
        Log::info('Dependent tasks checked for unblocking', [
            'completed_task_id' => $completedTaskId,
            'unblocked_count' => $unblocked,
        ]);
        
        return $unblocked;
    }

    /**
     * Check if a task can be started (all dependencies completed).
     *
     * @param Task $task
     * @return bool
     */
    private function canStartTask(Task $task): bool
    {
        if ($task->dependencies->isEmpty()) {
            return true;
        }
        
        foreach ($task->dependencies as $dependency) {
            if ($dependency->status !== 'completed') {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Validate task data before creation.
     *
     * @param array $data Task data
     * @throws TaskValidationException
     */
    private function validateTaskData(array $data): void
    {
        $required = ['project_id', 'name', 'task_type'];
        
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new TaskValidationException("Required field missing: {$field}");
            }
        }
        
        // Validate enums
        $validTaskTypes = ['feature', 'bug', 'refactor', 'maintenance', 'architecture', 'testing', 'documentation'];
        if (!in_array($data['task_type'], $validTaskTypes)) {
            throw new TaskValidationException(
                "Invalid task_type. Must be one of: " . implode(', ', $validTaskTypes)
            );
        }
        
        if (isset($data['priority'])) {
            $validPriorities = ['critical', 'high', 'medium', 'low'];
            if (!in_array($data['priority'], $validPriorities)) {
                throw new TaskValidationException(
                    "Invalid priority. Must be one of: " . implode(', ', $validPriorities)
                );
            }
        }
        
        if (isset($data['status'])) {
            $validStatuses = ['pending', 'approved', 'in_progress', 'testing', 'review', 'completed', 'failed', 'blocked', 'cancelled'];
            if (!in_array($data['status'], $validStatuses)) {
                throw new TaskValidationException(
                    "Invalid status. Must be one of: " . implode(', ', $validStatuses)
                );
            }
        }
    }

    /**
     * Validate that all dependency task IDs exist.
     *
     * @param array $dependencies Array of task UUIDs
     * @throws TaskValidationException
     */
    private function validateDependencies(array $dependencies): void
    {
        foreach ($dependencies as $dependencyId) {
            $task = $this->taskRepository->findById($dependencyId, false);
            if (!$task) {
                throw new TaskValidationException(
                    "Dependency task not found: {$dependencyId}"
                );
            }
        }
    }

    /**
     * Select appropriate agent type based on task type.
     *
     * @param Task $task
     * @return string
     */
    private function selectAgentForTask(Task $task): string
    {
        return match ($task->task_type) {
            'feature' => 'coder',
            'bug' => 'coder',
            'refactor' => 'coder',
            'architecture' => 'architect',
            'testing' => 'tester',
            'documentation' => 'documentation',
            'maintenance' => 'maintenance',
            default => 'planner',
        };
    }
}
