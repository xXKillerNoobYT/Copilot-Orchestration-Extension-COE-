<?php

namespace App\Repositories;

use App\Models\Repository;
use App\Models\RepositoryBranch;
use Illuminate\Database\Eloquent\Collection;

class RepositoryRepository
{
    /**
     * Create a new repository.
     */
    public function create(array $data): Repository
    {
        return Repository::create($data);
    }

    /**
     * Get a repository by ID.
     */
    public function find(string $id): ?Repository
    {
        return Repository::find($id);
    }

    /**
     * Get all repositories for a project.
     */
    public function getByProject(string $projectId): Collection
    {
        return Repository::where('project_id', $projectId)->get();
    }

    /**
     * Get active repositories.
     */
    public function getActive(): Collection
    {
        return Repository::where('status', 'active')->get();
    }

    /**
     * Update a repository.
     */
    public function update(string $id, array $data): Repository
    {
        $repository = $this->find($id);
        if (!$repository) {
            throw new \Exception("Repository {$id} not found");
        }

        $repository->update($data);
        return $repository;
    }

    /**
     * Delete/archive a repository.
     */
    public function archive(string $id): void
    {
        $this->update($id, ['status' => 'archived']);
    }

    /**
     * Get repositories by status.
     */
    public function getByStatus(string $status): Collection
    {
        return Repository::where('status', $status)->get();
    }
}

class RepositoryBranchRepository
{
    /**
     * Create a new branch.
     */
    public function create(array $data): RepositoryBranch
    {
        return RepositoryBranch::create($data);
    }

    /**
     * Get a branch by ID.
     */
    public function find(string $id): ?RepositoryBranch
    {
        return RepositoryBranch::find($id);
    }

    /**
     * Get all branches for a repository.
     */
    public function getByRepository(string $repositoryId, ?string $type = null): Collection
    {
        $query = RepositoryBranch::where('repository_id', $repositoryId);
        
        if ($type) {
            $query->where('type', $type);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Get active branches (non-main).
     */
    public function getActive(string $repositoryId): Collection
    {
        return RepositoryBranch::where('repository_id', $repositoryId)
            ->where('type', '!=', 'main')
            ->where('type', '!=', 'release')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get stale branches.
     */
    public function getStale(string $repositoryId, int $daysThreshold = 30): Collection
    {
        $cutoffDate = now()->subDays($daysThreshold);

        return RepositoryBranch::where('repository_id', $repositoryId)
            ->where(function ($query) use ($cutoffDate) {
                $query->whereNull('last_commit_at')
                    ->orWhere('last_commit_at', '<', $cutoffDate);
            })
            ->where('type', '!=', 'main')
            ->where('type', '!=', 'release')
            ->get();
    }

    /**
     * Get branch by name.
     */
    public function findByName(string $repositoryId, string $name): ?RepositoryBranch
    {
        return RepositoryBranch::where('repository_id', $repositoryId)
            ->where('name', $name)
            ->first();
    }

    /**
     * Update a branch.
     */
    public function update(string $id, array $data): RepositoryBranch
    {
        $branch = $this->find($id);
        if (!$branch) {
            throw new \Exception("Branch {$id} not found");
        }

        $branch->update($data);
        return $branch;
    }

    /**
     * Delete a branch.
     */
    public function delete(string $id): void
    {
        $branch = $this->find($id);
        if ($branch) {
            $branch->delete();
        }
    }

    /**
     * Get branches by task ID.
     */
    public function getByTask(string $taskId): Collection
    {
        return RepositoryBranch::where('task_id', $taskId)->get();
    }
}
