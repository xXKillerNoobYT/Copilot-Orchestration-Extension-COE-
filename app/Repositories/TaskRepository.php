<?php

namespace App\Repositories;

use App\Models\Task;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Task Repository
 * 
 * Handles data access for tasks following the Repository pattern.
 * Provides abstraction layer between business logic and database.
 */
class TaskRepository
{
    /**
     * Find a task by ID with optional caching.
     *
     * @param string $id Task UUID
     * @param bool $useCache Whether to use cache
     * @return Task|null
     */
    public function findById(string $id, bool $useCache = true): ?Task
    {
        if (!$useCache) {
            return Task::with(['dependencies', 'dependents', 'subtasks'])->find($id);
        }

        return Cache::tags(['tasks'])->remember(
            "task:{$id}",
            now()->addMinutes(30),
            fn () => Task::with(['dependencies', 'dependents', 'subtasks'])->find($id)
        );
    }

    /**
     * Find a task with full context (dependencies, subtasks, workflow states).
     *
     * @param string $id Task UUID
     * @return Task|null
     */
    public function findWithContext(string $id): ?Task
    {
        return Cache::tags(['tasks'])->remember(
            "task:context:{$id}",
            now()->addMinutes(15),
            fn () => Task::with([
                'dependencies',
                'dependents',
                'subtasks',
                'workflowStates',
                'project',
                'executions'
            ])->find($id)
        );
    }

    /**
     * Get all tasks for a project.
     *
     * @param string $projectId Project UUID
     * @param array $filters Optional filters (status, priority, type)
     * @return Collection
     */
    public function getByProject(string $projectId, array $filters = []): Collection
    {
        $query = Task::where('project_id', $projectId);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (isset($filters['task_type'])) {
            $query->where('task_type', $filters['task_type']);
        }

        if (isset($filters['assigned_agent'])) {
            $query->where('assigned_agent', $filters['assigned_agent']);
        }

        return $query->with(['dependencies', 'subtasks'])
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'asc')
            ->get();
    }

    /**
     * Get tasks ready to be started (no blocking dependencies).
     *
     * @param string $projectId Project UUID
     * @return Collection
     */
    public function getReadyTasks(string $projectId): Collection
    {
        return Task::where('project_id', $projectId)
            ->where('status', 'pending')
            ->whereDoesntHave('dependencies', function ($query) {
                $query->whereIn('status', ['pending', 'in_progress', 'blocked']);
            })
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'asc')
            ->get();
    }

    /**
     * Get blocked tasks (have uncompleted dependencies).
     *
     * @param string $projectId Project UUID
     * @return Collection
     */
    public function getBlockedTasks(string $projectId): Collection
    {
        return Task::where('project_id', $projectId)
            ->whereIn('status', ['pending', 'blocked'])
            ->whereHas('dependencies', function ($query) {
                $query->whereIn('status', ['pending', 'in_progress', 'blocked']);
            })
            ->with(['dependencies' => function ($query) {
                $query->whereIn('status', ['pending', 'in_progress', 'blocked']);
            }])
            ->get();
    }

    /**
     * Create a new task.
     *
     * @param array $data Task attributes
     * @return Task
     */
    public function create(array $data): Task
    {
        $task = Task::create($data);
        
        // Invalidate project tasks cache
        Cache::tags(['tasks', "project:{$data['project_id']}"])->flush();
        
        return $task->load(['dependencies', 'subtasks']);
    }

    /**
     * Update a task.
     *
     * @param string $id Task UUID
     * @param array $data Updated attributes
     * @return Task
     */
    public function update(string $id, array $data): Task
    {
        $task = $this->findById($id, false);
        $task->update($data);
        
        // Invalidate caches
        Cache::tags(['tasks'])->forget("task:{$id}");
        Cache::tags(['tasks'])->forget("task:context:{$id}");
        Cache::tags(["project:{$task->project_id}"])->flush();
        
        return $task->fresh(['dependencies', 'subtasks']);
    }

    /**
     * Delete a task.
     *
     * @param string $id Task UUID
     * @return bool
     */
    public function delete(string $id): bool
    {
        $task = $this->findById($id, false);
        
        if (!$task) {
            return false;
        }
        
        $projectId = $task->project_id;
        $deleted = $task->delete();
        
        // Invalidate caches
        Cache::tags(['tasks'])->forget("task:{$id}");
        Cache::tags(['tasks'])->forget("task:context:{$id}");
        Cache::tags(["project:{$projectId}"])->flush();
        
        return $deleted;
    }

    /**
     * Get tasks that depend on a given task.
     *
     * @param string $taskId Task UUID
     * @return Collection
     */
    public function getDependentTasks(string $taskId): Collection
    {
        return Task::whereHas('dependencies', function ($query) use ($taskId) {
            $query->where('depends_on_task_id', $taskId);
        })->get();
    }

    /**
     * Get all dependencies for a task (recursive).
     *
     * @param string $taskId Task UUID
     * @param array $visited Track visited tasks to prevent cycles
     * @return Collection
     */
    public function getAllDependencies(string $taskId, array &$visited = []): Collection
    {
        if (in_array($taskId, $visited)) {
            return collect();
        }

        $visited[] = $taskId;
        $task = $this->findById($taskId);
        
        if (!$task) {
            return collect();
        }

        $dependencies = collect();
        
        foreach ($task->dependencies as $dependency) {
            $dependencies->push($dependency);
            $dependencies = $dependencies->merge(
                $this->getAllDependencies($dependency->id, $visited)
            );
        }

        return $dependencies->unique('id');
    }

    /**
     * Update task status with timestamp tracking.
     *
     * @param string $id Task UUID
     * @param string $status New status
     * @return Task
     */
    public function updateStatus(string $id, string $status): Task
    {
        $task = $this->findById($id, false);
        
        $updates = ['status' => $status];
        
        // Track timestamps based on status
        if ($status === 'in_progress' && !$task->started_at) {
            $updates['started_at'] = now();
        } elseif (in_array($status, ['completed', 'failed', 'cancelled']) && !$task->completed_at) {
            $updates['completed_at'] = now();
        }
        
        return $this->update($id, $updates);
    }

    /**
     * Assign an agent to a task.
     *
     * @param string $id Task UUID
     * @param string $agentType Agent type identifier
     * @return Task
     */
    public function assignAgent(string $id, string $agentType): Task
    {
        return $this->update($id, ['assigned_agent' => $agentType]);
    }

    /**
     * Get task execution statistics for a project.
     *
     * @param string $projectId Project UUID
     * @return array
     */
    public function getProjectStatistics(string $projectId): array
    {
        return Cache::tags(["project:{$projectId}"])->remember(
            "project:stats:{$projectId}",
            now()->addMinutes(5),
            function () use ($projectId) {
                $tasks = Task::where('project_id', $projectId);
                
                return [
                    'total' => $tasks->count(),
                    'by_status' => $tasks->get()->groupBy('status')->map->count(),
                    'by_priority' => $tasks->get()->groupBy('priority')->map->count(),
                    'by_type' => $tasks->get()->groupBy('task_type')->map->count(),
                    'estimated_total_effort' => $tasks->sum('estimated_effort'),
                    'actual_total_effort' => $tasks->sum('actual_effort'),
                    'completion_rate' => $this->calculateCompletionRate($projectId),
                ];
            }
        );
    }

    /**
     * Calculate completion rate for a project.
     *
     * @param string $projectId Project UUID
     * @return float
     */
    private function calculateCompletionRate(string $projectId): float
    {
        $total = Task::where('project_id', $projectId)->count();
        
        if ($total === 0) {
            return 0.0;
        }
        
        $completed = Task::where('project_id', $projectId)
            ->where('status', 'completed')
            ->count();
        
        return round(($completed / $total) * 100, 2);
    }

    /**
     * Find the next task requiring planning decomposition.
     * Prioritizes: pending → in_progress planning
     *
     * @return Task|null
     */
    public function findNextPlanningTask(): ?Task
    {
        return Task::where('status', 'pending')
            ->where('task_type', 'feature')
            ->orderByRaw("CASE WHEN priority = 'critical' THEN 1 WHEN priority = 'high' THEN 2 WHEN priority = 'medium' THEN 3 ELSE 4 END")
            ->orderBy('created_at', 'asc')
            ->first();
    }

    /**
     * Find the next task ready for code execution.
     * Looks for tasks in_progress but waiting for agent assignment.
     *
     * @return Task|null
     */
    public function findNextExecutionTask(): ?Task
    {
        return Task::where('status', 'in_progress')
            ->whereNotNull('assigned_agent')
            ->orderByRaw("CASE WHEN priority = 'critical' THEN 1 WHEN priority = 'high' THEN 2 WHEN priority = 'medium' THEN 3 ELSE 4 END")
            ->orderBy('created_at', 'asc')
            ->first();
    }

    /**
     * Find the next task ready to start (pending or in_progress).
     *
     * @return Task|null
     */
    public function findNextReadyTask(): ?Task
    {
        return Task::whereIn('status', ['pending', 'in_progress'])
            ->orderByRaw("CASE WHEN priority = 'critical' THEN 1 WHEN priority = 'high' THEN 2 WHEN priority = 'medium' THEN 3 ELSE 4 END")
            ->orderBy('created_at', 'asc')
            ->first();
    }
}
