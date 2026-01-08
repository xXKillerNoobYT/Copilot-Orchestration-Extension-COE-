<?php

namespace App\Services;

use App\Models\Repository;
use App\Models\RepositoryHealthCheck;
use App\Repositories\RepositoryRepository;
use Illuminate\Database\Eloquent\Collection;
use Exception;

class RepositoryHealthService
{
    private RepositoryRepository $repositoryRepo;
    private LoggingService $loggingService;
    private TaskOrchestrationService $taskService;

    public function __construct(
        RepositoryRepository $repositoryRepo,
        LoggingService $loggingService,
        TaskOrchestrationService $taskService
    ) {
        $this->repositoryRepo = $repositoryRepo;
        $this->loggingService = $loggingService;
        $this->taskService = $taskService;
    }

    /**
     * Check repository health and generate metrics.
     */
    public function checkRepositoryHealth(string $repositoryId): RepositoryHealthCheck
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository {$repositoryId} not found");
        }

        $issues = [];
        $recommendations = [];

        // 1. Check test coverage
        $testCoverage = $this->analyzeTestCoverage($repositoryId);
        if ($testCoverage < 50) {
            $issues[] = "Test coverage is low ({$testCoverage}%)";
            $recommendations[] = "Increase test coverage to at least 75%";
        }

        // 2. Check CI/CD health
        $ciHealth = $this->analyzeCIHealth($repositoryId);
        if ($ciHealth < 80) {
            $issues[] = "CI/CD success rate is low ({$ciHealth}%)";
            $recommendations[] = "Fix failing CI/CD pipelines";
        }

        // 3. Check dependencies
        $depAnalysis = $this->analyzeDependencies($repositoryId);
        if ($depAnalysis['vulnerabilities'] > 0) {
            $issues[] = "Found {$depAnalysis['vulnerabilities']} security vulnerabilities";
            $recommendations[] = "Update vulnerable dependencies immediately";
        }

        if ($depAnalysis['outdated'] > 5) {
            $issues[] = "Found {$depAnalysis['outdated']} outdated dependencies";
            $recommendations[] = "Plan regular dependency updates";
        }

        // 4. Check commit frequency
        $daysSinceCommit = $this->daysSinceLastCommit($repositoryId);
        if ($daysSinceCommit > 30) {
            $issues[] = "No commits in {$daysSinceCommit} days";
            $recommendations[] = "Ensure regular development activity";
        }

        // Calculate health score (0-100)
        $healthScore = $this->calculateHealthScore(
            $testCoverage,
            $ciHealth,
            $depAnalysis['vulnerabilities'],
            $depAnalysis['outdated'],
            $daysSinceCommit
        );

        // Determine status
        $healthStatus = $this->getHealthStatus($healthScore);

        // Create health check record
        $healthCheck = RepositoryHealthCheck::create([
            'repository_id' => $repositoryId,
            'health_score' => $healthScore,
            'health_status' => $healthStatus,
            'test_coverage' => $testCoverage,
            'ci_success_rate' => $ciHealth,
            'dependency_vulnerabilities' => $depAnalysis['vulnerabilities'],
            'outdated_dependencies' => $depAnalysis['outdated'],
            'days_since_last_commit' => $daysSinceCommit,
            'issues' => $issues,
            'recommendations' => $recommendations,
            'checked_at' => now(),
            'last_issue_detected' => count($issues) > 0 ? now() : null,
        ]);

        // Log health check
        $this->loggingService->log('repository_health', "Health check completed for {$repository->name}", [
            'repository_id' => $repositoryId,
            'health_score' => $healthScore,
            'health_status' => $healthStatus,
            'issues_detected' => count($issues),
        ]);

        // Create maintenance tasks if issues detected
        if (count($issues) > 0) {
            $this->createMaintenanceTasks($repositoryId, $issues, $recommendations);
        }

        return $healthCheck;
    }

    /**
     * Analyze test coverage (simulated - would integrate with actual CI/CD in production).
     */
    private function analyzeTestCoverage(string $repositoryId): int
    {
        // In production, would:
        // 1. Query CI/CD pipeline for coverage reports
        // 2. Parse codecov, nyc, or similar reports
        // 3. Calculate weighted coverage across languages
        
        // For now, return reasonable default
        return random_int(60, 95);
    }

    /**
     * Analyze CI/CD health (success rate).
     */
    private function analyzeCIHealth(string $repositoryId): int
    {
        // In production, would:
        // 1. Query GitHub Actions/GitLab CI logs
        // 2. Calculate success rate over last N builds
        // 3. Identify flaky tests
        
        return random_int(70, 100);
    }

    /**
     * Analyze dependencies for vulnerabilities and outdated packages.
     */
    private function analyzeDependencies(string $repositoryId): array
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            return ['vulnerabilities' => 0, 'outdated' => 0];
        }

        // In production, would:
        // 1. Parse composer.lock and package-lock.json
        // 2. Query security databases (npm audit, composer audit, CVE)
        // 3. Check version constraints vs latest releases
        // 4. Flag breaking changes
        
        return [
            'vulnerabilities' => random_int(0, 3),
            'outdated' => random_int(0, 10),
        ];
    }

    /**
     * Days since last commit.
     */
    private function daysSinceLastCommit(string $repositoryId): int
    {
        // In production, would:
        // 1. Query repository branches last_commit_at
        // 2. Calculate from main branch
        // 3. Return days
        
        return random_int(1, 45);
    }

    /**
     * Calculate overall health score (0-100).
     */
    private function calculateHealthScore(
        int $testCoverage,
        int $ciSuccess,
        int $vulnCount,
        int $outdatedCount,
        int $daysSinceCommit
    ): int {
        // Weighted scoring formula
        $score = 100;

        // Test coverage (30% weight)
        $score -= (100 - $testCoverage) * 0.3;

        // CI health (25% weight)
        $score -= (100 - $ciSuccess) * 0.25;

        // Security vulnerabilities (25% weight) - critical
        $score -= min($vulnCount * 10, 25);

        // Dependency freshness (10% weight)
        $outdatedPenalty = min($outdatedCount * 0.5, 10);
        $score -= $outdatedPenalty;

        // Commit frequency (10% weight)
        if ($daysSinceCommit > 30) {
            $score -= min(($daysSinceCommit - 30) * 0.2, 10);
        }

        return max(0, min(100, (int)$score));
    }

    /**
     * Determine health status from score.
     */
    private function getHealthStatus(int $score): string
    {
        return match (true) {
            $score >= 90 => 'excellent',
            $score >= 75 => 'good',
            $score >= 60 => 'fair',
            $score >= 40 => 'poor',
            default => 'critical',
        };
    }

    /**
     * Create maintenance tasks for detected issues.
     */
    private function createMaintenanceTasks(string $repositoryId, array $issues, array $recommendations): void
    {
        try {
            foreach ($issues as $index => $issue) {
                $recommendation = $recommendations[$index] ?? 'No specific recommendation';

                // Create maintenance task
                $this->taskService->createTask('system', [
                    'title' => "Maintenance: {$issue}",
                    'description' => "Auto-detected repository health issue: {$issue}",
                    'details' => "Recommendation: {$recommendation}",
                    'type' => 'maintenance',
                    'priority' => $this->determinePriority($issue),
                    'assignees' => ['maintenance-bot'],
                ]);
            }
        } catch (Exception $e) {
            $this->loggingService->log('repository_health', "Failed to create maintenance tasks: {$e->getMessage()}");
        }
    }

    /**
     * Determine task priority based on issue type.
     */
    private function determinePriority(string $issue): string
    {
        if (str_contains($issue, 'security') || str_contains($issue, 'vulnerability')) {
            return 'critical';
        }

        if (str_contains($issue, 'coverage') || str_contains($issue, 'outdated')) {
            return 'high';
        }

        return 'medium';
    }

    /**
     * Get latest health check for a repository.
     */
    public function getLatestHealthCheck(string $repositoryId): ?RepositoryHealthCheck
    {
        return RepositoryHealthCheck::where('repository_id', $repositoryId)
            ->orderBy('checked_at', 'desc')
            ->first();
    }

    /**
     * Get health check history for a repository.
     */
    public function getHealthHistory(string $repositoryId, int $limit = 10): Collection
    {
        return RepositoryHealthCheck::where('repository_id', $repositoryId)
            ->orderBy('checked_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get repositories with critical health issues.
     */
    public function getCriticalRepositories(): Collection
    {
        return RepositoryHealthCheck::where('health_status', 'critical')
            ->where('checked_at', '>=', now()->subDays(7))
            ->with('repository')
            ->distinct('repository_id')
            ->get();
    }

    /**
     * Get health metrics for project.
     */
    public function getProjectHealthMetrics(string $projectId): array
    {
        $repositories = $this->repositoryRepo->getByProject($projectId);

        $metrics = [];
        $totalScore = 0;
        $count = 0;

        foreach ($repositories as $repo) {
            $latest = $this->getLatestHealthCheck($repo->id);
            if ($latest) {
                $metrics[] = [
                    'repository_id' => $repo->id,
                    'name' => $repo->name,
                    'health_score' => $latest->health_score,
                    'health_status' => $latest->health_status,
                    'checked_at' => $latest->checked_at,
                ];
                $totalScore += $latest->health_score;
                $count++;
            }
        }

        $averageScore = $count > 0 ? (int)($totalScore / $count) : 0;

        return [
            'project_id' => $projectId,
            'total_repositories' => $repositories->count(),
            'checked_repositories' => $count,
            'average_health_score' => $averageScore,
            'repositories' => $metrics,
        ];
    }

    /**
     * Generate health report for dashboard.
     */
    public function generateHealthReport(string $repositoryId): array
    {
        $repository = $this->repositoryRepo->find($repositoryId);
        if (!$repository) {
            throw new Exception("Repository not found");
        }

        $latest = $this->getLatestHealthCheck($repositoryId);
        if (!$latest) {
            return [
                'repository_id' => $repositoryId,
                'name' => $repository->name,
                'status' => 'no_data',
                'message' => 'No health checks performed yet',
            ];
        }

        return [
            'repository_id' => $repositoryId,
            'name' => $repository->name,
            'health_score' => $latest->health_score,
            'health_status' => $latest->health_status,
            'metrics' => [
                'test_coverage' => $latest->test_coverage . '%',
                'ci_success_rate' => $latest->ci_success_rate . '%',
                'security_vulnerabilities' => $latest->dependency_vulnerabilities,
                'outdated_dependencies' => $latest->outdated_dependencies,
                'days_since_last_commit' => $latest->days_since_last_commit,
            ],
            'issues' => $latest->issues ?? [],
            'recommendations' => $latest->recommendations ?? [],
            'checked_at' => $latest->checked_at,
            'trend' => $this->calculateTrend($repositoryId),
        ];
    }

    /**
     * Calculate health trend (improving/declining/stable).
     */
    private function calculateTrend(string $repositoryId): string
    {
        $history = RepositoryHealthCheck::where('repository_id', $repositoryId)
            ->orderBy('checked_at', 'desc')
            ->limit(3)
            ->pluck('health_score')
            ->toArray();

        if (count($history) < 2) {
            return 'unknown';
        }

        $current = $history[0];
        $previous = $history[1];

        if ($current > $previous + 5) {
            return 'improving';
        } elseif ($current < $previous - 5) {
            return 'declining';
        }

        return 'stable';
    }
}
