<?php

namespace App\Repositories;

use App\Models\Agent;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Agent Repository
 * 
 * Handles data access for agents.
 */
class AgentRepository
{
    /**
     * Find an agent by ID with optional caching.
     *
     * @param string $id Agent UUID
     * @param bool $useCache Whether to use cache
     * @return Agent|null
     */
    public function findById(string $id, bool $useCache = true): ?Agent
    {
        if (!$useCache) {
            return Agent::find($id);
        }

        return Cache::tags(['agents'])->remember(
            "agent:{$id}",
            now()->addHours(1),
            fn () => Agent::find($id)
        );
    }

    /**
     * Find an agent by name.
     *
     * @param string $name Agent name
     * @return Agent|null
     */
    public function findByName(string $name): ?Agent
    {
        return Cache::tags(['agents'])->remember(
            "agent:name:{$name}",
            now()->addHours(1),
            fn () => Agent::where('name', $name)->first()
        );
    }

    /**
     * Get all active agents.
     *
     * @return Collection
     */
    public function getActive(): Collection
    {
        return Cache::tags(['agents'])->remember(
            'agents:active',
            now()->addMinutes(30),
            fn () => Agent::active()->get()
        );
    }

    /**
     * Get agents by type.
     *
     * @param string $type Agent type
     * @param bool $activeOnly Only return active agents
     * @return Collection
     */
    public function getByType(string $type, bool $activeOnly = true): Collection
    {
        $cacheKey = "agents:type:{$type}:" . ($activeOnly ? 'active' : 'all');
        
        return Cache::tags(['agents'])->remember(
            $cacheKey,
            now()->addMinutes(30),
            function () use ($type, $activeOnly) {
                $query = Agent::ofType($type);
                
                if ($activeOnly) {
                    $query->active();
                }
                
                return $query->get();
            }
        );
    }

    /**
     * Get agents with specific capabilities.
     *
     * @param array $capabilities Required capabilities
     * @param bool $requireAll Whether all capabilities are required or just one
     * @return Collection
     */
    public function getByCapabilities(array $capabilities, bool $requireAll = false): Collection
    {
        $agents = $this->getActive();
        
        return $agents->filter(function ($agent) use ($capabilities, $requireAll) {
            if (!$agent->capabilities) {
                return false;
            }
            
            $agentCapabilities = $agent->capabilities;
            
            if ($requireAll) {
                // Agent must have all required capabilities
                return count(array_intersect($capabilities, $agentCapabilities)) === count($capabilities);
            } else {
                // Agent must have at least one required capability
                return count(array_intersect($capabilities, $agentCapabilities)) > 0;
            }
        });
    }

    /**
     * Create a new agent.
     *
     * @param array $data Agent attributes
     * @return Agent
     */
    public function create(array $data): Agent
    {
        $agent = Agent::create($data);
        
        // Invalidate cache
        Cache::tags(['agents'])->flush();
        
        return $agent;
    }

    /**
     * Update an agent.
     *
     * @param string $id Agent UUID
     * @param array $data Updated attributes
     * @return Agent
     */
    public function update(string $id, array $data): Agent
    {
        $agent = $this->findById($id, false);
        $agent->update($data);
        
        // Invalidate caches
        Cache::tags(['agents'])->forget("agent:{$id}");
        Cache::tags(['agents'])->forget("agent:name:{$agent->name}");
        Cache::tags(['agents'])->flush();
        
        return $agent->fresh();
    }

    /**
     * Delete an agent.
     *
     * @param string $id Agent UUID
     * @return bool
     */
    public function delete(string $id): bool
    {
        $agent = $this->findById($id, false);
        
        if (!$agent) {
            return false;
        }
        
        $deleted = $agent->delete();
        
        // Invalidate caches
        Cache::tags(['agents'])->forget("agent:{$id}");
        Cache::tags(['agents'])->flush();
        
        return $deleted;
    }

    /**
     * Get agent workload (number of active task assignments).
     *
     * @param string $agentId Agent UUID
     * @return int
     */
    public function getWorkload(string $agentId): int
    {
        return Cache::tags(['agents', 'tasks'])->remember(
            "agent:workload:{$agentId}",
            now()->addMinutes(5),
            function () use ($agentId) {
                $agent = $this->findById($agentId);
                
                if (!$agent) {
                    return 0;
                }
                
                return \App\Models\Task::where('assigned_agent', $agent->type)
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->count();
            }
        );
    }

    /**
     * Get agents sorted by workload (ascending).
     *
     * @param string $type Agent type filter
     * @return Collection
     */
    public function getByWorkload(string $type): Collection
    {
        $agents = $this->getByType($type);
        
        return $agents->sortBy(function ($agent) {
            return $this->getWorkload($agent->id);
        })->values();
    }

    /**
     * Get agent statistics.
     *
     * @param string $agentId Agent UUID
     * @return array
     */
    public function getStatistics(string $agentId): array
    {
        return Cache::tags(['agents'])->remember(
            "agent:stats:{$agentId}",
            now()->addMinutes(10),
            function () use ($agentId) {
                $agent = $this->findById($agentId);
                
                if (!$agent) {
                    return [];
                }
                
                $tasks = \App\Models\Task::where('assigned_agent', $agent->type)->get();
                
                return [
                    'total_tasks' => $tasks->count(),
                    'active_tasks' => $tasks->whereIn('status', ['pending', 'in_progress'])->count(),
                    'completed_tasks' => $tasks->where('status', 'completed')->count(),
                    'failed_tasks' => $tasks->where('status', 'failed')->count(),
                    'success_rate' => $this->calculateSuccessRate($tasks),
                    'average_completion_time' => $this->calculateAverageCompletionTime($tasks),
                ];
            }
        );
    }

    /**
     * Calculate success rate for agent's tasks.
     *
     * @param Collection $tasks
     * @return float
     */
    private function calculateSuccessRate(Collection $tasks): float
    {
        $completed = $tasks->whereIn('status', ['completed', 'failed']);
        
        if ($completed->isEmpty()) {
            return 0.0;
        }
        
        $successful = $completed->where('status', 'completed')->count();
        return round(($successful / $completed->count()) * 100, 2);
    }

    /**
     * Calculate average completion time in minutes.
     *
     * @param Collection $tasks
     * @return int
     */
    private function calculateAverageCompletionTime(Collection $tasks): int
    {
        $completedTasks = $tasks->where('status', 'completed')
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at');
        
        if ($completedTasks->isEmpty()) {
            return 0;
        }
        
        $totalTime = $completedTasks->sum(function ($task) {
            return $task->started_at->diffInMinutes($task->completed_at);
        });
        
        return (int) round($totalTime / $completedTasks->count());
    }
}
