<?php

namespace App\Repositories;

use App\Models\TaskPlan;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class TaskPlanRepository
{
    private const CACHE_PREFIX = 'task_plan';
    private const CACHE_TTL = 3600; // 1 hour

    /**
     * Create a new task plan
     */
    public function create(array $data): TaskPlan
    {
        $plan = TaskPlan::create($data);
        
        // Cache the plan
        Cache::put(
            self::CACHE_PREFIX . ":{$plan->id}",
            $plan,
            self::CACHE_TTL
        );

        return $plan;
    }

    /**
     * Update a task plan
     */
    public function update(string $planId, array $data): TaskPlan
    {
        $plan = $this->find($planId);
        
        if (!$plan) {
            throw new \RuntimeException("Plan not found: {$planId}");
        }

        $plan->update($data);
        
        // Invalidate cache
        Cache::forget(self::CACHE_PREFIX . ":{$planId}");
        
        return $plan->fresh();
    }

    /**
     * Find a task plan by ID
     */
    public function find(string $planId): ?TaskPlan
    {
        return Cache::remember(
            self::CACHE_PREFIX . ":{$planId}",
            self::CACHE_TTL,
            fn() => TaskPlan::find($planId)
        );
    }

    /**
     * Find plans for a project with optional filters
     */
    public function findForProject(string $projectId, array $filters = []): Collection
    {
        $query = TaskPlan::where('project_id', $projectId);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['complexity'])) {
            $query->where('complexity', $filters['complexity']);
        }

        if (isset($filters['created_by'])) {
            $query->where('created_by_user_id', $filters['created_by']);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Delete a task plan
     */
    public function delete(string $planId): bool
    {
        $plan = $this->find($planId);
        
        if (!$plan) {
            return false;
        }

        // Invalidate cache
        Cache::forget(self::CACHE_PREFIX . ":{$planId}");
        
        return $plan->delete();
    }

    /**
     * Get plans pending approval
     */
    public function getPendingPlans(?string $userId = null): Collection
    {
        $query = TaskPlan::where('status', 'pending_approval');

        if ($userId) {
            $query->where('created_by_user_id', $userId);
        }

        return $query->orderBy('created_at', 'asc')->get();
    }

    /**
     * Get recently created plans
     */
    public function getRecentPlans(int $limit = 10): Collection
    {
        return TaskPlan::orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Count plans by status
     */
    public function countByStatus(string $projectId): array
    {
        return TaskPlan::where('project_id', $projectId)
            ->groupBy('status')
            ->selectRaw('status, count(*) as count')
            ->pluck('count', 'status')
            ->toArray();
    }
}
