<?php

namespace App\Services;

use App\Models\Repository;
use App\Repositories\RepositoryRepository;
use Exception;

class RepositoryLifecycleService
{
    private RepositoryRepository $repositoryRepo;
    private BranchingStrategyService $branchingService;
    private LoggingService $loggingService;

    public function __construct(
        RepositoryRepository $repositoryRepo,
        BranchingStrategyService $branchingService,
        LoggingService $loggingService
    ) {
        $this->repositoryRepo = $repositoryRepo;
        $this->branchingService = $branchingService;
        $this->loggingService = $loggingService;
    }

    /**
     * Create a new repository.
     */
    public function createRepository(string $projectId, array $config): Repository
    {
        // Validate required config
        if (!isset($config['name']) || !isset($config['url'])) {
            throw new Exception("Repository name and URL are required");
        }

        // Create repository record
        $repository = $this->repositoryRepo->create([
            'project_id' => $projectId,
            'name' => $config['name'],
            'url' => $config['url'],
            'type' => $config['type'] ?? 'monorepo',
            'status' => 'pending',
            'config' => $config,
        ]);

        $this->loggingService->log('repository_lifecycle', "Repository created: {$config['name']}", [
            'repository_id' => $repository->id,
            'project_id' => $projectId,
        ]);

        return $repository;
    }

    /**
     * Initialize a repository (scaffold structure, create main branch).
     */
    public function initializeRepository(string $repositoryId, array $options = []): void
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        if ($repository->isInitialized()) {
            throw new Exception("Repository is already initialized");
        }

        // Update status to initializing
        $this->repositoryRepo->update($repositoryId, ['status' => 'initializing']);

        try {
            // Create main branch
            $this->repositoryRepo->branchRepo->create([
                'repository_id' => $repositoryId,
                'name' => 'main',
                'type' => 'main',
                'created_at' => now(),
                'last_ci_status' => 'pending',
                'protected' => true,
            ]);

            // Update repository status
            $this->repositoryRepo->update($repositoryId, [
                'status' => 'active',
                'initialized_at' => now(),
                'config' => array_merge($repository->config ?? [], $options),
            ]);

            $this->loggingService->log('repository_lifecycle', "Repository initialized: {$repository->name}", [
                'repository_id' => $repositoryId,
            ]);
        } catch (Exception $e) {
            // Revert status on error
            $this->repositoryRepo->update($repositoryId, ['status' => 'pending']);
            throw $e;
        }
    }

    /**
     * Scaffold directory structure for repository.
     */
    public function scaffoldStructure(string $repositoryId, string $template): void
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        // Templates: 'laravel', 'nodejs', 'monorepo', etc.
        $templates = [
            'laravel' => ['app', 'config', 'database', 'resources', 'routes', 'tests', 'storage'],
            'nodejs' => ['src', 'test', 'dist', 'public'],
            'monorepo' => ['packages', 'shared', 'docs', 'scripts'],
            'typescript' => ['src', 'dist', 'tests', 'types'],
        ];

        if (!isset($templates[$template])) {
            throw new Exception("Unknown template: {$template}");
        }

        // Store template choice in config
        $config = $repository->config ?? [];
        $config['template'] = $template;
        $config['scaffolded_at'] = now()->toIso8601String();

        $this->repositoryRepo->update($repositoryId, ['config' => $config]);

        $this->loggingService->log('repository_lifecycle', "Scaffolded {$template} structure for {$repository->name}", [
            'repository_id' => $repositoryId,
            'template' => $template,
        ]);
    }

    /**
     * Configure environment variables.
     */
    public function configureEnvironment(string $repositoryId, array $envVars): void
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        $config = $repository->config ?? [];
        $config['env_vars'] = $envVars;

        $this->repositoryRepo->update($repositoryId, ['config' => $config]);

        $this->loggingService->log('repository_lifecycle', "Environment configured for {$repository->name}", [
            'repository_id' => $repositoryId,
            'env_count' => count($envVars),
        ]);
    }

    /**
     * Archive a repository.
     */
    public function archiveRepository(string $repositoryId): void
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        $this->repositoryRepo->archive($repositoryId);

        $this->loggingService->log('repository_lifecycle', "Repository archived: {$repository->name}", [
            'repository_id' => $repositoryId,
        ]);
    }

    /**
     * Get repository status.
     */
    public function getRepositoryStatus(string $repositoryId): array
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        $branches = $this->repositoryRepo->branchRepo->getByRepository($repositoryId);
        $activeBranches = $branches->where('type', '!=', 'main')->count();

        return [
            'id' => $repository->id,
            'name' => $repository->name,
            'status' => $repository->status,
            'type' => $repository->type,
            'initialized' => $repository->isInitialized(),
            'archived' => $repository->isArchived(),
            'branches_total' => $branches->count(),
            'branches_active' => $activeBranches,
            'initialized_at' => $repository->initialized_at,
            'created_at' => $repository->created_at,
        ];
    }

    /**
     * Validate repository health.
     */
    public function validateRepositoryHealth(string $repositoryId): array
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        $issues = [];

        // Check: Must be initialized
        if (!$repository->isInitialized()) {
            $issues[] = 'Repository is not initialized';
        }

        // Check: Must have main branch
        $branches = $this->repositoryRepo->branchRepo->getByRepository($repositoryId);
        if (!$branches->where('type', 'main')->count()) {
            $issues[] = 'Repository missing main branch';
        }

        // Check: No stale main branch
        $mainBranch = $branches->where('type', 'main')->first();
        if ($mainBranch && $mainBranch->isStale(90)) {
            $issues[] = 'Main branch is stale (>90 days without commits)';
        }

        // Check: Configuration present
        if (!$repository->config) {
            $issues[] = 'Repository configuration is empty';
        }

        return [
            'repository_id' => $repositoryId,
            'healthy' => count($issues) === 0,
            'issues' => $issues,
        ];
    }

    /**
     * Get all repositories for a project.
     */
    public function getProjectRepositories(string $projectId)
    {
        return $this->repositoryRepo->getByProject($projectId);
    }

    /**
     * Get repository by ID.
     */
    public function getRepository(string $repositoryId): ?Repository
    {
        return $this->repositoryRepo->find($repositoryId);
    }
}
