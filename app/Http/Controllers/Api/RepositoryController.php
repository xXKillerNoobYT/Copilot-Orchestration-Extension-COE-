<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RepositoryLifecycleService;
use App\Services\BranchingStrategyService;
use App\Services\BranchIsolationService;
use App\Repositories\RepositoryRepository;
use App\Repositories\RepositoryBranchRepository;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RepositoryController extends Controller
{
    private RepositoryLifecycleService $lifecycleService;
    private BranchingStrategyService $branchingService;
    private BranchIsolationService $isolationService;
    private RepositoryRepository $repositoryRepo;
    private RepositoryBranchRepository $branchRepo;

    public function __construct(
        RepositoryLifecycleService $lifecycleService,
        BranchingStrategyService $branchingService,
        BranchIsolationService $isolationService,
        RepositoryRepository $repositoryRepo,
        RepositoryBranchRepository $branchRepo
    ) {
        $this->lifecycleService = $lifecycleService;
        $this->branchingService = $branchingService;
        $this->isolationService = $isolationService;
        $this->repositoryRepo = $repositoryRepo;
        $this->branchRepo = $branchRepo;
    }

    /**
     * Create a new repository.
     * POST /api/v1/projects/{projectId}/repositories
     */
    public function createRepository(Request $request, string $projectId): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'url' => 'required|url',
            'type' => 'nullable|in:monorepo,polyrepo',
            'config' => 'nullable|array',
        ]);

        $repository = $this->lifecycleService->createRepository($projectId, $validated);

        return response()->json($repository, 201);
    }

    /**
     * Get all repositories for a project.
     * GET /api/v1/projects/{projectId}/repositories
     */
    public function listRepositories(string $projectId): JsonResponse
    {
        $repositories = $this->lifecycleService->getProjectRepositories($projectId);

        return response()->json($repositories);
    }

    /**
     * Get repository details.
     * GET /api/v1/repositories/{repositoryId}
     */
    public function getRepository(string $repositoryId): JsonResponse
    {
        $repository = $this->lifecycleService->getRepository($repositoryId);

        if (!$repository) {
            return response()->json(['error' => 'Repository not found'], 404);
        }

        return response()->json($repository);
    }

    /**
     * Update repository configuration.
     * PATCH /api/v1/repositories/{repositoryId}
     */
    public function updateRepository(Request $request, string $repositoryId): JsonResponse
    {
        $validated = $request->validate([
            'config' => 'nullable|array',
            'status' => 'nullable|in:pending,initializing,active,archived',
        ]);

        try {
            $repository = $this->repositoryRepo->update($repositoryId, $validated);
            return response()->json($repository);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Initialize a repository (scaffold structure).
     * POST /api/v1/repositories/{repositoryId}/initialize
     */
    public function initializeRepository(Request $request, string $repositoryId): JsonResponse
    {
        $validated = $request->validate([
            'template' => 'nullable|string',
            'env_vars' => 'nullable|array',
        ]);

        try {
            $this->lifecycleService->initializeRepository($repositoryId, $validated);

            $status = $this->lifecycleService->getRepositoryStatus($repositoryId);
            return response()->json($status);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Get repository health status.
     * GET /api/v1/repositories/{repositoryId}/health
     */
    public function getRepositoryHealth(string $repositoryId): JsonResponse
    {
        try {
            $health = $this->lifecycleService->validateRepositoryHealth($repositoryId);
            return response()->json($health);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Archive a repository.
     * DELETE /api/v1/repositories/{repositoryId}
     */
    public function archiveRepository(string $repositoryId): JsonResponse
    {
        try {
            $this->lifecycleService->archiveRepository($repositoryId);
            return response()->json(['message' => 'Repository archived']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Get project repository status summary.
     * GET /api/v1/projects/{projectId}/repo-status
     */
    public function getProjectRepositoryStatus(string $projectId): JsonResponse
    {
        $repositories = $this->lifecycleService->getProjectRepositories($projectId);

        $statuses = $repositories->map(function ($repo) {
            return $this->lifecycleService->getRepositoryStatus($repo->id);
        });

        return response()->json([
            'project_id' => $projectId,
            'total_repositories' => $repositories->count(),
            'repositories' => $statuses,
        ]);
    }

    /**
     * Create a branch.
     * POST /api/v1/repositories/{repositoryId}/branches
     */
    public function createBranch(Request $request, string $repositoryId): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:feature,hotfix,release',
            'task_id' => 'nullable|string',
            'issue_id' => 'nullable|string',
            'version' => 'nullable|string',
        ]);

        try {
            $branch = match ($validated['type']) {
                'feature' => $this->branchingService->createFeatureBranch($repositoryId, $validated['task_id']),
                'hotfix' => $this->branchingService->createHotfixBranch($repositoryId, $validated['issue_id']),
                'release' => $this->branchingService->createReleaseBranch($repositoryId, $validated['version']),
            };

            return response()->json($branch, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Get all branches for a repository.
     * GET /api/v1/repositories/{repositoryId}/branches
     */
    public function listBranches(Request $request, string $repositoryId): JsonResponse
    {
        $type = $request->query('type');
        $branches = $this->branchingService->getRepositoryBranches($repositoryId, $type);

        return response()->json($branches);
    }

    /**
     * Get active branches.
     * GET /api/v1/repositories/{repositoryId}/branches/active
     */
    public function getActiveBranches(string $repositoryId): JsonResponse
    {
        $branches = $this->branchingService->getActiveBranches($repositoryId);

        return response()->json($branches);
    }

    /**
     * Get stale branches.
     * GET /api/v1/repositories/{repositoryId}/branches/stale
     */
    public function getStaleBranches(Request $request, string $repositoryId): JsonResponse
    {
        $daysThreshold = $request->query('days', 30);
        $staleBranches = $this->branchRepo->getStale($repositoryId, $daysThreshold);

        return response()->json([
            'repository_id' => $repositoryId,
            'days_threshold' => $daysThreshold,
            'stale_branches' => $staleBranches,
        ]);
    }

    /**
     * Get branch details.
     * GET /api/v1/branches/{branchId}
     */
    public function getBranch(string $branchId): JsonResponse
    {
        $branch = $this->branchRepo->find($branchId);

        if (!$branch) {
            return response()->json(['error' => 'Branch not found'], 404);
        }

        return response()->json($branch);
    }

    /**
     * Update branch.
     * PATCH /api/v1/branches/{branchId}
     */
    public function updateBranch(Request $request, string $branchId): JsonResponse
    {
        $validated = $request->validate([
            'protected' => 'nullable|boolean',
            'last_ci_status' => 'nullable|in:pending,success,failure',
        ]);

        try {
            $branch = $this->branchRepo->update($branchId, $validated);
            return response()->json($branch);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Delete branch.
     * DELETE /api/v1/branches/{branchId}
     */
    public function deleteBranch(string $branchId): JsonResponse
    {
        try {
            $this->branchRepo->delete($branchId);
            return response()->json(['message' => 'Branch deleted']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Protect a branch.
     * POST /api/v1/branches/{branchId}/protect
     */
    public function protectBranch(string $branchId): JsonResponse
    {
        try {
            $branch = $this->branchingService->protectBranch($branchId);
            return response()->json($branch);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Validate merge ready.
     * POST /api/v1/branches/{branchId}/validate-merge
     */
    public function validateMerge(string $branchId): JsonResponse
    {
        try {
            $results = $this->isolationService->validateMergeReady($branchId);
            return response()->json([
                'branch_id' => $branchId,
                'merge_ready' => count(array_filter($results, fn($r) => !$r['passed'])) === 0,
                'validation_results' => $results,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Run merge gates.
     * POST /api/v1/branches/{branchId}/merge-gates
     */
    public function runMergeGates(string $branchId): JsonResponse
    {
        try {
            $results = $this->isolationService->runMergeGates($branchId);
            return response()->json($results);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Get merge status.
     * GET /api/v1/branches/{branchId}/merge-status
     */
    public function getMergeStatus(string $branchId): JsonResponse
    {
        try {
            $branch = $this->branchRepo->find($branchId);
            if (!$branch) {
                return response()->json(['error' => 'Branch not found'], 404);
            }

            $results = $this->isolationService->runMergeGates($branchId);

            return response()->json([
                'branch_id' => $branchId,
                'branch_name' => $branch->name,
                'merge_ready' => $results['merge_ready'],
                'gates' => $results['gates'],
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Authorize merge.
     * POST /api/v1/branches/{branchId}/authorize-merge
     */
    public function authorizeMerge(Request $request, string $branchId): JsonResponse
    {
        $userId = $request->user()?->id;

        try {
            $this->isolationService->authorizeMerge($branchId, $userId);
            return response()->json(['message' => 'Merge authorized']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Reject merge.
     * POST /api/v1/branches/{branchId}/reject-merge
     */
    public function rejectMerge(Request $request, string $branchId): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        try {
            $this->isolationService->rejectMerge($branchId, $validated['reason']);
            return response()->json(['message' => 'Merge rejected']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Validate branching strategy.
     * POST /api/v1/repositories/{repositoryId}/branches/strategy
     */
    public function validateStrategy(string $repositoryId): JsonResponse
    {
        try {
            $issues = $this->branchingService->validateStrategy($repositoryId);
            return response()->json([
                'repository_id' => $repositoryId,
                'valid' => count($issues) === 0,
                'issues' => $issues,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }
}
