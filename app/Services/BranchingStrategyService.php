<?php

namespace App\Services;

use App\Models\Repository;
use App\Models\RepositoryBranch;
use App\Repositories\RepositoryRepository;
use App\Repositories\RepositoryBranchRepository;
use Illuminate\Support\Str;
use Exception;

class BranchingStrategyService
{
    private RepositoryRepository $repositoryRepo;
    private RepositoryBranchRepository $branchRepo;
    private LoggingService $loggingService;

    public function __construct(
        RepositoryRepository $repositoryRepo,
        RepositoryBranchRepository $branchRepo,
        LoggingService $loggingService
    ) {
        $this->repositoryRepo = $repositoryRepo;
        $this->branchRepo = $branchRepo;
        $this->loggingService = $loggingService;
    }

    /**
     * Create a feature branch for a task.
     */
    public function createFeatureBranch(string $repositoryId, string $taskId): RepositoryBranch
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        // Generate branch name: feature/task-{taskId}
        $branchName = "feature/task-{$taskId}";

        // Check if branch already exists
        if ($this->branchRepo->findByName($repositoryId, $branchName)) {
            throw new Exception("Branch {$branchName} already exists");
        }

        // Validate branch name format
        $this->validateBranchName($branchName, 'feature');

        // Create branch record
        $branch = $this->branchRepo->create([
            'repository_id' => $repositoryId,
            'name' => $branchName,
            'type' => 'feature',
            'task_id' => $taskId,
            'created_at' => now(),
            'last_ci_status' => 'pending',
        ]);

        $this->loggingService->log('branching_strategy', "Feature branch created: {$branchName}", [
            'repository_id' => $repositoryId,
            'task_id' => $taskId,
            'branch_id' => $branch->id,
        ]);

        return $branch;
    }

    /**
     * Create a hotfix branch.
     */
    public function createHotfixBranch(string $repositoryId, string $issueId): RepositoryBranch
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        // Generate branch name: hotfix/{issueId}
        $branchName = "hotfix/{$issueId}";

        // Check if branch already exists
        if ($this->branchRepo->findByName($repositoryId, $branchName)) {
            throw new Exception("Branch {$branchName} already exists");
        }

        // Validate branch name
        $this->validateBranchName($branchName, 'hotfix');

        // Create branch record
        $branch = $this->branchRepo->create([
            'repository_id' => $repositoryId,
            'name' => $branchName,
            'type' => 'hotfix',
            'created_at' => now(),
            'last_ci_status' => 'pending',
            'protected' => true,
        ]);

        $this->loggingService->log('branching_strategy', "Hotfix branch created: {$branchName}", [
            'repository_id' => $repositoryId,
            'issue_id' => $issueId,
            'branch_id' => $branch->id,
        ]);

        return $branch;
    }

    /**
     * Create a release branch.
     */
    public function createReleaseBranch(string $repositoryId, string $version): RepositoryBranch
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        // Generate branch name: release/{version}
        $branchName = "release/{$version}";

        // Check if branch already exists
        if ($this->branchRepo->findByName($repositoryId, $branchName)) {
            throw new Exception("Branch {$branchName} already exists");
        }

        // Validate branch name
        $this->validateBranchName($branchName, 'release');

        // Create branch record
        $branch = $this->branchRepo->create([
            'repository_id' => $repositoryId,
            'name' => $branchName,
            'type' => 'release',
            'created_at' => now(),
            'last_ci_status' => 'pending',
            'protected' => true,
        ]);

        $this->loggingService->log('branching_strategy', "Release branch created: {$branchName}", [
            'repository_id' => $repositoryId,
            'version' => $version,
            'branch_id' => $branch->id,
        ]);

        return $branch;
    }

    /**
     * Validate branch name format.
     */
    public function validateBranchName(string $name, string $type): array
    {
        $errors = [];

        // Allow lowercase, numbers, hyphens, forward slashes
        if (!preg_match('/^[a-z0-9\/-]+$/', $name)) {
            $errors[] = "Branch name must contain only lowercase letters, numbers, hyphens, and forward slashes";
        }

        // Check type-specific patterns
        switch ($type) {
            case 'feature':
                if (!preg_match('/^feature\//', $name)) {
                    $errors[] = "Feature branches must start with 'feature/'";
                }
                break;
            case 'hotfix':
                if (!preg_match('/^hotfix\//', $name)) {
                    $errors[] = "Hotfix branches must start with 'hotfix/'";
                }
                break;
            case 'release':
                if (!preg_match('/^release\//', $name)) {
                    $errors[] = "Release branches must start with 'release/'";
                }
                break;
        }

        return $errors;
    }

    /**
     * Get all branches for a repository.
     */
    public function getRepositoryBranches(string $repositoryId, ?string $type = null)
    {
        return $this->branchRepo->getByRepository($repositoryId, $type);
    }

    /**
     * Get active branches (non-main/release).
     */
    public function getActiveBranches(string $repositoryId)
    {
        return $this->branchRepo->getActive($repositoryId);
    }

    /**
     * Validate branching strategy for a repository.
     */
    public function validateStrategy(string $repositoryId): array
    {
        $issues = [];
        $branches = $this->branchRepo->getByRepository($repositoryId);

        // Rule: Must have a main branch
        if (!$branches->where('type', 'main')->count()) {
            $issues[] = "Repository must have a main branch";
        }

        // Rule: No stale main branch
        $mainBranch = $branches->where('type', 'main')->first();
        if ($mainBranch && $mainBranch->isStale(90)) {
            $issues[] = "Main branch is stale (no commits in 90 days)";
        }

        // Rule: Feature branches should have linked tasks
        $unlinkedFeatures = $branches
            ->where('type', 'feature')
            ->filter(function ($b) {
                return !$b->task_id;
            });

        if ($unlinkedFeatures->count() > 0) {
            $issues[] = "Found " . $unlinkedFeatures->count() . " feature branches without linked tasks";
        }

        return $issues;
    }

    /**
     * Get branches for a specific task.
     */
    public function getTaskBranches(string $taskId)
    {
        return $this->branchRepo->getByTask($taskId);
    }

    /**
     * Protect a branch.
     */
    public function protectBranch(string $branchId): RepositoryBranch
    {
        return $this->branchRepo->update($branchId, ['protected' => true]);
    }

    /**
     * Unprotect a branch.
     */
    public function unprotectBranch(string $branchId): RepositoryBranch
    {
        return $this->branchRepo->update($branchId, ['protected' => false]);
    }
}
