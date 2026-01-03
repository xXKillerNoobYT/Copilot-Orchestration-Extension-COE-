<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskDependency;
use App\Repositories\TaskRepository;
use App\Exceptions\CircularDependencyException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Dependency Graph Service
 * 
 * Manages task dependencies and detects circular dependencies.
 * Provides graph traversal and analysis capabilities.
 */
class DependencyGraphService
{
    public function __construct(
        private TaskRepository $taskRepository
    ) {}

    /**
     * Create a dependency relationship between tasks.
     *
     * @param string $taskId Task that has the dependency
     * @param string $dependsOnTaskId Task that is depended upon
     * @param string $dependencyType Type of dependency
     * @return TaskDependency
     * @throws CircularDependencyException
     */
    public function createDependency(
        string $taskId,
        string $dependsOnTaskId,
        string $dependencyType = 'requires'
    ): TaskDependency {
        // Prevent self-dependency
        if ($taskId === $dependsOnTaskId) {
            throw new CircularDependencyException(
                "Task cannot depend on itself"
            );
        }
        
        // Check for circular dependency
        if ($this->wouldCreateCycle($taskId, $dependsOnTaskId)) {
            throw new CircularDependencyException(
                "Creating this dependency would create a circular dependency"
            );
        }
        
        // Create the dependency
        $dependency = TaskDependency::create([
            'task_id' => $taskId,
            'depends_on_task_id' => $dependsOnTaskId,
            'dependency_type' => $dependencyType,
        ]);
        
        // Invalidate dependency graph cache
        $this->invalidateDependencyCache($taskId);
        
        Log::info('Task dependency created', [
            'task_id' => $taskId,
            'depends_on' => $dependsOnTaskId,
            'type' => $dependencyType,
        ]);
        
        return $dependency;
    }

    /**
     * Remove a dependency relationship.
     *
     * @param string $taskId Task UUID
     * @param string $dependsOnTaskId Dependency task UUID
     * @return bool
     */
    public function removeDependency(string $taskId, string $dependsOnTaskId): bool
    {
        $deleted = TaskDependency::where('task_id', $taskId)
            ->where('depends_on_task_id', $dependsOnTaskId)
            ->delete();
        
        if ($deleted) {
            $this->invalidateDependencyCache($taskId);
            
            Log::info('Task dependency removed', [
                'task_id' => $taskId,
                'depends_on' => $dependsOnTaskId,
            ]);
        }
        
        return $deleted > 0;
    }

    /**
     * Check if creating a dependency would create a circular dependency.
     *
     * @param string $taskId Task that would have the dependency
     * @param string $dependsOnTaskId Task that would be depended upon
     * @return bool
     */
    public function wouldCreateCycle(string $taskId, string $dependsOnTaskId): bool
    {
        // If dependsOnTask already depends on task (directly or indirectly),
        // adding task -> dependsOnTask would create a cycle
        return $this->hasPath($dependsOnTaskId, $taskId);
    }

    /**
     * Check if there's a dependency path from sourceTask to targetTask.
     *
     * @param string $sourceTaskId Source task UUID
     * @param string $targetTaskId Target task UUID
     * @param array $visited Track visited nodes
     * @return bool
     */
    private function hasPath(string $sourceTaskId, string $targetTaskId, array &$visited = []): bool
    {
        if ($sourceTaskId === $targetTaskId) {
            return true;
        }
        
        if (in_array($sourceTaskId, $visited)) {
            return false;
        }
        
        $visited[] = $sourceTaskId;
        
        // Get all tasks that sourceTask depends on
        $dependencies = TaskDependency::where('task_id', $sourceTaskId)
            ->pluck('depends_on_task_id');
        
        foreach ($dependencies as $dependencyId) {
            if ($this->hasPath($dependencyId, $targetTaskId, $visited)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get the full dependency tree for a task.
     *
     * @param string $taskId Task UUID
     * @param bool $includeIndirect Include indirect dependencies
     * @return Collection
     */
    public function getDependencyTree(string $taskId, bool $includeIndirect = true): Collection
    {
        $cacheKey = "dependency:tree:{$taskId}:" . ($includeIndirect ? 'full' : 'direct');
        
        return Cache::tags(['dependencies'])->remember(
            $cacheKey,
            now()->addMinutes(15),
            function () use ($taskId, $includeIndirect) {
                if ($includeIndirect) {
                    return $this->getIndirectDependencies($taskId);
                }
                
                return Task::whereHas('dependents', function ($query) use ($taskId) {
                    $query->where('task_id', $taskId);
                })->get();
            }
        );
    }

    /**
     * Get all indirect (transitive) dependencies for a task.
     *
     * @param string $taskId Task UUID
     * @param array $visited Track visited nodes
     * @return Collection
     */
    private function getIndirectDependencies(string $taskId, array &$visited = []): Collection
    {
        if (in_array($taskId, $visited)) {
            return collect();
        }
        
        $visited[] = $taskId;
        $dependencies = collect();
        
        // Get direct dependencies
        $directDeps = TaskDependency::where('task_id', $taskId)
            ->with('dependsOnTask')
            ->get();
        
        foreach ($directDeps as $dep) {
            if ($dep->dependsOnTask) {
                $dependencies->push($dep->dependsOnTask);
                
                // Recursively get dependencies of dependencies
                $indirectDeps = $this->getIndirectDependencies($dep->depends_on_task_id, $visited);
                $dependencies = $dependencies->merge($indirectDeps);
            }
        }
        
        return $dependencies->unique('id');
    }

    /**
     * Get tasks that are ready to be executed (no pending dependencies).
     *
     * @param string $projectId Project UUID
     * @return Collection
     */
    public function getExecutableTasks(string $projectId): Collection
    {
        return $this->taskRepository->getReadyTasks($projectId);
    }

    /**
     * Get tasks that are blocked by dependencies.
     *
     * @param string $projectId Project UUID
     * @return Collection
     */
    public function getBlockedTasks(string $projectId): Collection
    {
        return $this->taskRepository->getBlockedTasks($projectId);
    }

    /**
     * Calculate the critical path for a project.
     * The critical path is the longest sequence of dependent tasks.
     *
     * @param string $projectId Project UUID
     * @return array
     */
    public function calculateCriticalPath(string $projectId): array
    {
        $tasks = $this->taskRepository->getByProject($projectId);
        $criticalPath = [];
        $maxDuration = 0;
        
        foreach ($tasks as $task) {
            $path = $this->getLongestPath($task);
            $duration = $this->calculatePathDuration($path);
            
            if ($duration > $maxDuration) {
                $maxDuration = $duration;
                $criticalPath = $path;
            }
        }
        
        return [
            'path' => $criticalPath,
            'total_duration' => $maxDuration,
            'tasks_count' => count($criticalPath),
        ];
    }

    /**
     * Get the longest dependency path for a task.
     *
     * @param Task $task
     * @return array
     */
    private function getLongestPath(Task $task): array
    {
        if ($task->dependencies->isEmpty()) {
            return [$task];
        }
        
        $longestPath = [];
        $maxLength = 0;
        
        foreach ($task->dependencies as $dependency) {
            $path = $this->getLongestPath($dependency);
            $length = count($path);
            
            if ($length > $maxLength) {
                $maxLength = $length;
                $longestPath = $path;
            }
        }
        
        array_unshift($longestPath, $task);
        return $longestPath;
    }

    /**
     * Calculate total duration of a task path.
     *
     * @param array $path Array of Task objects
     * @return int Total duration in minutes
     */
    private function calculatePathDuration(array $path): int
    {
        return array_reduce($path, function ($total, $task) {
            return $total + ($task->estimated_effort ?? 0);
        }, 0);
    }

    /**
     * Validate entire dependency graph for a project.
     *
     * @param string $projectId Project UUID
     * @return array Validation results
     */
    public function validateGraph(string $projectId): array
    {
        $tasks = $this->taskRepository->getByProject($projectId);
        $issues = [];
        
        foreach ($tasks as $task) {
            // Check for circular dependencies
            $visited = [];
            if ($this->hasCircularDependency($task->id, $visited)) {
                $issues[] = [
                    'task_id' => $task->id,
                    'type' => 'circular_dependency',
                    'message' => 'Task is part of a circular dependency',
                ];
            }
            
            // Check for missing dependencies
            foreach ($task->dependencies as $dependency) {
                if (!$dependency->exists) {
                    $issues[] = [
                        'task_id' => $task->id,
                        'type' => 'missing_dependency',
                        'message' => "Dependency task not found: {$dependency->id}",
                    ];
                }
            }
        }
        
        return [
            'valid' => empty($issues),
            'issues_count' => count($issues),
            'issues' => $issues,
        ];
    }

    /**
     * Check if a task is part of a circular dependency.
     *
     * @param string $taskId Task UUID
     * @param array $visited Track visited nodes
     * @return bool
     */
    private function hasCircularDependency(string $taskId, array &$visited = []): bool
    {
        if (in_array($taskId, $visited)) {
            return true;
        }
        
        $visited[] = $taskId;
        
        $dependencies = TaskDependency::where('task_id', $taskId)
            ->pluck('depends_on_task_id');
        
        foreach ($dependencies as $dependencyId) {
            if ($this->hasCircularDependency($dependencyId, $visited)) {
                return true;
            }
        }
        
        array_pop($visited);
        return false;
    }

    /**
     * Invalidate dependency-related caches.
     *
     * @param string $taskId Task UUID
     */
    private function invalidateDependencyCache(string $taskId): void
    {
        Cache::tags(['dependencies'])->forget("dependency:tree:{$taskId}:full");
        Cache::tags(['dependencies'])->forget("dependency:tree:{$taskId}:direct");
        Cache::tags(['tasks'])->forget("task:{$taskId}");
        Cache::tags(['tasks'])->forget("task:context:{$taskId}");
    }
}
