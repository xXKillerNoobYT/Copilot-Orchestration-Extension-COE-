<?php

namespace Tests\Feature;

use App\Models\Repository;
use App\Models\RepositoryHealthCheck;
use App\Services\RepositoryHealthService;
use App\Repositories\RepositoryRepository;
use App\Services\LoggingService;
use App\Services\TaskOrchestrationService;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class Phase10aHealthMonitoringTest extends TestCase
{
    use RefreshDatabase;

    private RepositoryHealthService $healthService;
    private RepositoryRepository $repositoryRepo;
    private LoggingService $loggingService;
    private TaskOrchestrationService $taskService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repositoryRepo = app(RepositoryRepository::class);
        $this->loggingService = app(LoggingService::class);
        $this->taskService = app(TaskOrchestrationService::class);

        $this->healthService = new RepositoryHealthService(
            $this->repositoryRepo,
            $this->loggingService,
            $this->taskService
        );
    }

    /**
     * Test: Check repository health.
     */
    public function test_check_repository_health()
    {
        // Create a repository
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        // Check health
        $healthCheck = $this->healthService->checkRepositoryHealth($repository->id);

        // Assert
        $this->assertNotNull($healthCheck->id);
        $this->assertEquals($repository->id, $healthCheck->repository_id);
        $this->assertGreaterThanOrEqual(0, $healthCheck->health_score);
        $this->assertLessThanOrEqual(100, $healthCheck->health_score);
        $this->assertIn($healthCheck->health_status, ['excellent', 'good', 'fair', 'poor', 'critical']);
    }

    /**
     * Test: Health score calculation.
     */
    public function test_health_score_calculation()
    {
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        $healthCheck = $this->healthService->checkRepositoryHealth($repository->id);

        // Score should be between 0-100
        $this->assertGreaterThanOrEqual(0, $healthCheck->health_score);
        $this->assertLessThanOrEqual(100, $healthCheck->health_score);
    }

    /**
     * Test: Health status mapping.
     */
    public function test_health_status_mapping()
    {
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        $healthCheck = $this->healthService->checkRepositoryHealth($repository->id);

        // Status should be one of the enum values
        $validStatuses = ['excellent', 'good', 'fair', 'poor', 'critical'];
        $this->assertContains($healthCheck->health_status, $validStatuses);
    }

    /**
     * Test: Get latest health check.
     */
    public function test_get_latest_health_check()
    {
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        // Check health twice
        $healthCheck1 = $this->healthService->checkRepositoryHealth($repository->id);
        sleep(1);
        $healthCheck2 = $this->healthService->checkRepositoryHealth($repository->id);

        // Get latest
        $latest = $this->healthService->getLatestHealthCheck($repository->id);

        // Should be the second check
        $this->assertEquals($healthCheck2->id, $latest->id);
    }

    /**
     * Test: Get health history.
     */
    public function test_get_health_history()
    {
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        // Create 3 health checks
        $this->healthService->checkRepositoryHealth($repository->id);
        $this->healthService->checkRepositoryHealth($repository->id);
        $this->healthService->checkRepositoryHealth($repository->id);

        // Get history
        $history = $this->healthService->getHealthHistory($repository->id);

        // Should have 3 records
        $this->assertGreaterThanOrEqual(3, $history->count());
    }

    /**
     * Test: Critical health detection.
     */
    public function test_critical_health_detection()
    {
        // Create repository and force critical health
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        // Manually create critical health check
        RepositoryHealthCheck::create([
            'repository_id' => $repository->id,
            'health_score' => 20,
            'health_status' => 'critical',
            'test_coverage' => 10,
            'ci_success_rate' => 30,
            'dependency_vulnerabilities' => 5,
            'outdated_dependencies' => 15,
            'days_since_last_commit' => 60,
            'checked_at' => now(),
        ]);

        // Get critical repositories
        $critical = $this->healthService->getCriticalRepositories();

        // Should find this repository
        $ids = $critical->pluck('repository_id')->toArray();
        $this->assertContains($repository->id, $ids);
    }

    /**
     * Test: Project health metrics.
     */
    public function test_project_health_metrics()
    {
        $projectId = 'proj-123';

        // Create multiple repositories
        $repo1 = $this->repositoryRepo->create([
            'project_id' => $projectId,
            'name' => 'repo-1',
            'url' => 'https://github.com/test/repo1.git',
            'status' => 'active',
        ]);

        $repo2 = $this->repositoryRepo->create([
            'project_id' => $projectId,
            'name' => 'repo-2',
            'url' => 'https://github.com/test/repo2.git',
            'status' => 'active',
        ]);

        // Check health
        $this->healthService->checkRepositoryHealth($repo1->id);
        $this->healthService->checkRepositoryHealth($repo2->id);

        // Get metrics
        $metrics = $this->healthService->getProjectHealthMetrics($projectId);

        // Assert
        $this->assertEquals($projectId, $metrics['project_id']);
        $this->assertGreaterThanOrEqual(2, $metrics['total_repositories']);
        $this->assertArrayHasKey('average_health_score', $metrics);
        $this->assertArrayHasKey('repositories', $metrics);
    }

    /**
     * Test: Health report generation.
     */
    public function test_generate_health_report()
    {
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        // Check health first
        $this->healthService->checkRepositoryHealth($repository->id);

        // Generate report
        $report = $this->healthService->generateHealthReport($repository->id);

        // Assert
        $this->assertArrayHasKey('repository_id', $report);
        $this->assertArrayHasKey('health_score', $report);
        $this->assertArrayHasKey('metrics', $report);
        $this->assertArrayHasKey('trend', $report);
    }

    /**
     * Test: Security vulnerabilities detected.
     */
    public function test_security_vulnerabilities_detection()
    {
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        // Create health check with vulnerabilities
        RepositoryHealthCheck::create([
            'repository_id' => $repository->id,
            'health_score' => 50,
            'health_status' => 'poor',
            'test_coverage' => 70,
            'ci_success_rate' => 80,
            'dependency_vulnerabilities' => 3,
            'outdated_dependencies' => 5,
            'days_since_last_commit' => 10,
            'issues' => ['Found 3 security vulnerabilities'],
            'checked_at' => now(),
        ]);

        $healthCheck = $this->healthService->getLatestHealthCheck($repository->id);

        // Assert
        $this->assertTrue($healthCheck->hasSecurityIssues());
        $this->assertGreaterThan(0, $healthCheck->dependency_vulnerabilities);
    }

    /**
     * Test: Stale repository detection.
     */
    public function test_stale_repository_detection()
    {
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        // Create health check with stale repo
        RepositoryHealthCheck::create([
            'repository_id' => $repository->id,
            'health_score' => 40,
            'health_status' => 'poor',
            'test_coverage' => 75,
            'ci_success_rate' => 85,
            'dependency_vulnerabilities' => 0,
            'outdated_dependencies' => 3,
            'days_since_last_commit' => 45,
            'issues' => ['No commits in 45 days'],
            'checked_at' => now(),
        ]);

        $healthCheck = $this->healthService->getLatestHealthCheck($repository->id);

        // Assert
        $this->assertTrue($healthCheck->isStale());
        $this->assertGreaterThan(30, $healthCheck->days_since_last_commit);
    }

    /**
     * Test: Health trends.
     */
    public function test_health_trend_calculation()
    {
        $repository = $this->repositoryRepo->create([
            'project_id' => 'proj-123',
            'name' => 'test-repo',
            'url' => 'https://github.com/test/repo.git',
            'status' => 'active',
        ]);

        // Create health checks with improving scores
        RepositoryHealthCheck::create([
            'repository_id' => $repository->id,
            'health_score' => 50,
            'health_status' => 'poor',
            'checked_at' => now()->subDays(2),
        ]);

        RepositoryHealthCheck::create([
            'repository_id' => $repository->id,
            'health_score' => 75,
            'health_status' => 'good',
            'checked_at' => now(),
        ]);

        // Generate report
        $report = $this->healthService->generateHealthReport($repository->id);

        // Assert trend exists
        $this->assertArrayHasKey('trend', $report);
        $this->assertIn($report['trend'], ['improving', 'declining', 'stable', 'unknown']);
    }
}
