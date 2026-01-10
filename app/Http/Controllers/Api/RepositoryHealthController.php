<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RepositoryHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RepositoryHealthController extends Controller
{
    private RepositoryHealthService $healthService;

    public function __construct(RepositoryHealthService $healthService)
    {
        $this->healthService = $healthService;
    }

    /**
     * Check repository health.
     * POST /api/v1/repositories/{repositoryId}/health-check
     */
    public function checkHealth(string $repositoryId): JsonResponse
    {
        try {
            $healthCheck = $this->healthService->checkRepositoryHealth($repositoryId);
            return response()->json($healthCheck);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Get latest health check.
     * GET /api/v1/repositories/{repositoryId}/health
     */
    public function getLatestHealth(string $repositoryId): JsonResponse
    {
        try {
            $healthCheck = $this->healthService->getLatestHealthCheck($repositoryId);
            if (!$healthCheck) {
                return response()->json(['error' => 'No health check data available'], 404);
            }
            return response()->json($healthCheck);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Get health history.
     * GET /api/v1/repositories/{repositoryId}/health-history
     */
    public function getHealthHistory(Request $request, string $repositoryId): JsonResponse
    {
        $limit = $request->query('limit', 10);
        $history = $this->healthService->getHealthHistory($repositoryId, $limit);

        return response()->json([
            'repository_id' => $repositoryId,
            'health_checks' => $history,
        ]);
    }

    /**
     * Get critical repositories.
     * GET /api/v1/repositories/health/critical
     */
    public function getCriticalRepositories(): JsonResponse
    {
        $critical = $this->healthService->getCriticalRepositories();

        return response()->json([
            'critical_count' => $critical->count(),
            'repositories' => $critical,
        ]);
    }

    /**
     * Get project health metrics.
     * GET /api/v1/projects/{projectId}/health-metrics
     */
    public function getProjectMetrics(string $projectId): JsonResponse
    {
        try {
            $metrics = $this->healthService->getProjectHealthMetrics($projectId);
            return response()->json($metrics);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Generate health report.
     * GET /api/v1/repositories/{repositoryId}/health-report
     */
    public function generateReport(string $repositoryId): JsonResponse
    {
        try {
            $report = $this->healthService->generateHealthReport($repositoryId);
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }
}
