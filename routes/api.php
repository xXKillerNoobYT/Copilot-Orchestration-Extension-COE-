<?php

use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\GitHubController;
use App\Http\Controllers\Api\McpController;
use App\Http\Controllers\Api\MonitoringController;
use App\Http\Controllers\Api\PlanningController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\AgentLoopController;
use App\Http\Controllers\Api\RepositoryController;
use App\Http\Controllers\Api\RepositoryHealthController;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\DesignColorController;
use App\Http\Controllers\Api\DesignTypographyController;
use App\Http\Controllers\Api\DesignSpacingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

/*
|--------------------------------------------------------------------------
| Task Orchestration API Routes
|--------------------------------------------------------------------------
*/
Route::prefix('v1')->group(function () {
    // Project tasks
    Route::get('/projects/{projectId}/tasks', [TaskController::class, 'index'])
        ->name('api.tasks.index');
    
    Route::post('/tasks', [TaskController::class, 'store'])
        ->name('api.tasks.store');
    
    // Task operations
    Route::get('/tasks/{taskId}', [TaskController::class, 'show'])
        ->name('api.tasks.show');
    
    Route::patch('/tasks/{taskId}/status', [TaskController::class, 'updateStatus'])
        ->name('api.tasks.updateStatus');
    
    Route::post('/tasks/{taskId}/assign', [TaskController::class, 'assignAgent'])
        ->name('api.tasks.assignAgent');
    
    // Dependency management
    Route::get('/tasks/{taskId}/dependencies', [TaskController::class, 'dependencies'])
        ->name('api.tasks.dependencies');
    
    // Project-level task queries
    Route::get('/projects/{projectId}/tasks/ready', [TaskController::class, 'ready'])
        ->name('api.tasks.ready');
    
    Route::get('/projects/{projectId}/tasks/blocked', [TaskController::class, 'blocked'])
        ->name('api.tasks.blocked');
    
    // Graph analysis
    Route::get('/projects/{projectId}/tasks/validate-graph', [TaskController::class, 'validateGraph'])
        ->name('api.tasks.validateGraph');
    
    Route::get('/projects/{projectId}/tasks/critical-path', [TaskController::class, 'criticalPath'])
        ->name('api.tasks.criticalPath');
    
    /*
    |--------------------------------------------------------------------------
    | Agent Management API Routes
    |--------------------------------------------------------------------------
    */
    
    // Agent CRUD
    Route::get('/agents', [AgentController::class, 'index'])
        ->name('api.agents.index');
    
    Route::post('/agents', [AgentController::class, 'store'])
        ->name('api.agents.store');
    
    Route::patch('/agents/{agentId}', [AgentController::class, 'update'])
        ->name('api.agents.update');
    
    Route::post('/agents/{agentId}/activate', [AgentController::class, 'activate'])
        ->name('api.agents.activate');
    
    Route::post('/agents/{agentId}/deactivate', [AgentController::class, 'deactivate'])
        ->name('api.agents.deactivate');
    
    // Agent queries
    Route::get('/agents/type/{type}', [AgentController::class, 'byType'])
        ->name('api.agents.byType');
    
    Route::get('/agents/{agentId}/statistics', [AgentController::class, 'statistics'])
        ->name('api.agents.statistics');
    
    // Task-agent matching
    Route::get('/tasks/{taskId}/candidate-agents', [AgentController::class, 'candidatesForTask'])
        ->name('api.agents.candidatesForTask');
    
    Route::get('/agents/least-busy/{taskType}', [AgentController::class, 'leastBusy'])
        ->name('api.agents.leastBusy');
    
    // Workload management
    Route::get('/agents/workload/distribution', [AgentController::class, 'workloadDistribution'])
        ->name('api.agents.workloadDistribution');
    
    Route::get('/agents/workload/balance/{agentType}', [AgentController::class, 'balanceWorkload'])
        ->name('api.agents.balanceWorkload');
    
    /*
    |--------------------------------------------------------------------------
    | Context Bundle API Routes
    |--------------------------------------------------------------------------
    */
    
    // Context bundles for tasks
    Route::get('/tasks/{taskId}/context-bundles', [\App\Http\Controllers\Api\ContextBundleController::class, 'index'])
        ->name('api.context-bundles.index');
    
    Route::post('/tasks/{taskId}/context-bundles/from-task', [\App\Http\Controllers\Api\ContextBundleController::class, 'createFromTask'])
        ->name('api.context-bundles.createFromTask');
    
    Route::post('/tasks/{taskId}/context-bundles/from-files', [\App\Http\Controllers\Api\ContextBundleController::class, 'createFromFiles'])
        ->name('api.context-bundles.createFromFiles');
    
    Route::post('/tasks/{taskId}/context-bundles/from-repository', [\App\Http\Controllers\Api\ContextBundleController::class, 'createFromRepository'])
        ->name('api.context-bundles.createFromRepository');
    
    Route::get('/tasks/{taskId}/context-bundles/statistics', [\App\Http\Controllers\Api\ContextBundleController::class, 'statistics'])
        ->name('api.context-bundles.statistics');
    
    Route::get('/tasks/{taskId}/context-bundles/history', [\App\Http\Controllers\Api\ContextBundleController::class, 'history'])
        ->name('api.context-bundles.history');
    
    Route::get('/tasks/{taskId}/context-bundles/version/{version}', [\App\Http\Controllers\Api\ContextBundleController::class, 'version'])
        ->name('api.context-bundles.version');
    
    Route::post('/tasks/{taskId}/context-bundles/version', [\App\Http\Controllers\Api\ContextBundleController::class, 'createVersion'])
        ->name('api.context-bundles.createVersion');
    
    // Context bundle operations
    Route::post('/context-bundles', [\App\Http\Controllers\Api\ContextBundleController::class, 'store'])
        ->name('api.context-bundles.store');
    
    Route::get('/context-bundles/{id}', [\App\Http\Controllers\Api\ContextBundleController::class, 'show'])
        ->name('api.context-bundles.show');
    
    Route::post('/context-bundles/{id}/files', [\App\Http\Controllers\Api\ContextBundleController::class, 'addFiles'])
        ->name('api.context-bundles.addFiles');
    
    Route::delete('/context-bundles/{id}/files', [\App\Http\Controllers\Api\ContextBundleController::class, 'removeFile'])
        ->name('api.context-bundles.removeFile');
    
    Route::patch('/context-bundles/{id}/metadata', [\App\Http\Controllers\Api\ContextBundleController::class, 'updateMetadata'])
        ->name('api.context-bundles.updateMetadata');
    
    Route::get('/context-bundles/search', [\App\Http\Controllers\Api\ContextBundleController::class, 'search'])
        ->name('api.context-bundles.search');
    
    Route::delete('/context-bundles/{id}', [\App\Http\Controllers\Api\ContextBundleController::class, 'destroy'])
        ->name('api.context-bundles.destroy');
    
    /*
    |--------------------------------------------------------------------------
    | GitHub Integration API Routes
    |--------------------------------------------------------------------------
    */
    
    // GitHub issue synchronization
    Route::post('/github/sync/issue', [GitHubController::class, 'syncIssue'])
        ->name('api.github.syncIssue');
    
    Route::post('/github/sync/repository', [GitHubController::class, 'syncRepository'])
        ->name('api.github.syncRepository');
    
    Route::post('/tasks/{taskId}/sync-to-github', [GitHubController::class, 'syncTaskToGitHub'])
        ->name('api.github.syncTaskToGitHub');
    
    Route::post('/tasks/{taskId}/create-github-issue', [GitHubController::class, 'createIssueFromTask'])
        ->name('api.github.createIssueFromTask');
    
    // GitHub issue queries
    Route::get('/github/issues/{owner}/{repo}', [GitHubController::class, 'listIssues'])
        ->name('api.github.listIssues');
    
    Route::get('/github/issues/{owner}/{repo}/{number}', [GitHubController::class, 'getIssue'])
        ->name('api.github.getIssue');
    
    // GitHub comments synchronization
    Route::post('/tasks/{taskId}/sync-comments', [GitHubController::class, 'syncComments'])
        ->name('api.github.syncComments');
    
    Route::post('/tasks/{taskId}/post-update', [GitHubController::class, 'postUpdate'])
        ->name('api.github.postUpdate');
    
    // GitHub sync status
    Route::get('/tasks/{taskId}/github-sync-status', [GitHubController::class, 'syncStatus'])
        ->name('api.github.syncStatus');
    
    // GitHub utilities
    Route::post('/github/parse-repo-url', [GitHubController::class, 'parseRepoUrl'])
        ->name('api.github.parseRepoUrl');
    
    /*
    |--------------------------------------------------------------------------
    | Monitoring & Observability API Routes
    |--------------------------------------------------------------------------
    */
    
    // System health and metrics
    Route::get('/monitoring/health', [MonitoringController::class, 'health'])
        ->name('api.monitoring.health');
    
    Route::get('/monitoring/metrics', [MonitoringController::class, 'systemMetrics'])
        ->name('api.monitoring.systemMetrics');
    
    Route::get('/monitoring/metrics/application', [MonitoringController::class, 'applicationMetrics'])
        ->name('api.monitoring.applicationMetrics');
    
    Route::get('/monitoring/metrics/{type}/{name}', [MonitoringController::class, 'getMetric'])
        ->name('api.monitoring.getMetric');
    
    Route::get('/monitoring/metrics/prefix/{prefix}', [MonitoringController::class, 'getMetricsByPrefix'])
        ->name('api.monitoring.getMetricsByPrefix');
    
    Route::post('/monitoring/metrics/reset', [MonitoringController::class, 'resetMetrics'])
        ->name('api.monitoring.resetMetrics');
    
    // Performance monitoring
    Route::get('/monitoring/performance', [MonitoringController::class, 'performanceReport'])
        ->name('api.monitoring.performanceReport');
    
    Route::get('/monitoring/alerts', [MonitoringController::class, 'alerts'])
        ->name('api.monitoring.alerts');
    
    Route::get('/monitoring/trends', [MonitoringController::class, 'trends'])
        ->name('api.monitoring.trends');
    
    // Audit trail
    Route::get('/monitoring/audit', [MonitoringController::class, 'auditTrail'])
        ->name('api.monitoring.auditTrail');
    
    Route::get('/monitoring/audit/{entityType}/{entityId}', [MonitoringController::class, 'entityAuditTrail'])
        ->name('api.monitoring.entityAuditTrail');
    
    Route::get('/monitoring/audit/statistics', [MonitoringController::class, 'auditStatistics'])
        ->name('api.monitoring.auditStatistics');
    
    Route::get('/monitoring/audit/export', [MonitoringController::class, 'exportAudit'])
        ->name('api.monitoring.exportAudit');
    
    // Logging
    Route::get('/monitoring/logs/statistics', [MonitoringController::class, 'logStatistics'])
        ->name('api.monitoring.logStatistics');
    
    // Dashboard
    Route::get('/monitoring/dashboard', [MonitoringController::class, 'dashboard'])
        ->name('api.monitoring.dashboard');
    
    /*
    |--------------------------------------------------------------------------
    | Planning & Architecture API Routes
    |--------------------------------------------------------------------------
    */
    
    // Task plan generation
    Route::post('/planning/generate', [PlanningController::class, 'generate'])
        ->name('api.planning.generate');
    
    Route::get('/planning/{planId}', [PlanningController::class, 'show'])
        ->name('api.planning.show');
    
    Route::patch('/planning/{planId}', [PlanningController::class, 'refine'])
        ->name('api.planning.refine');
    
    Route::delete('/planning/{planId}', [PlanningController::class, 'destroy'])
        ->name('api.planning.destroy');
    
    // Plan approval workflow
    Route::post('/planning/{planId}/approve', [PlanningController::class, 'approve'])
        ->name('api.planning.approve');
    
    Route::post('/planning/{planId}/reject', [PlanningController::class, 'reject'])
        ->name('api.planning.reject');
    
    Route::post('/planning/{planId}/validate', [PlanningController::class, 'validate'])
        ->name('api.planning.validate');
    
    // Plan queries
    Route::get('/projects/{projectId}/plans', [PlanningController::class, 'index'])
        ->name('api.planning.index');
    
    Route::get('/planning/pending', [PlanningController::class, 'pending'])
        ->name('api.planning.pending');
    
    // Architecture generation
    Route::post('/planning/{planId}/architecture', [PlanningController::class, 'generateArchitecture'])
        ->name('api.planning.generateArchitecture');
    
    Route::get('/planning/{planId}/diagrams', [PlanningController::class, 'getDiagrams'])
        ->name('api.planning.getDiagrams');
    
    // Export and statistics
    Route::post('/planning/{planId}/export', [PlanningController::class, 'export'])
        ->name('api.planning.export');
    
    Route::get('/planning/{planId}/statistics', [PlanningController::class, 'statistics'])
        ->name('api.planning.statistics');
    
    Route::get('/projects/{projectId}/planning-metrics', [PlanningController::class, 'metrics'])
        ->name('api.planning.metrics');

    /*
    |--------------------------------------------------------------------------
    | Repository Management Routes
    |--------------------------------------------------------------------------
    | Phase 9a: Safe Branching & Merge Validation
    */

    // Repository management (8 endpoints)
    Route::post('/projects/{projectId}/repositories', [RepositoryController::class, 'createRepository'])
        ->name('api.repositories.create');

    Route::get('/projects/{projectId}/repositories', [RepositoryController::class, 'listRepositories'])
        ->name('api.repositories.list');

    Route::get('/repositories/{repositoryId}', [RepositoryController::class, 'getRepository'])
        ->name('api.repositories.show');

    Route::patch('/repositories/{repositoryId}', [RepositoryController::class, 'updateRepository'])
        ->name('api.repositories.update');

    Route::delete('/repositories/{repositoryId}', [RepositoryController::class, 'archiveRepository'])
        ->name('api.repositories.delete');

    Route::post('/repositories/{repositoryId}/initialize', [RepositoryController::class, 'initializeRepository'])
        ->name('api.repositories.initialize');

    Route::get('/repositories/{repositoryId}/health', [RepositoryController::class, 'getRepositoryHealth'])
        ->name('api.repositories.health');

    Route::get('/projects/{projectId}/repo-status', [RepositoryController::class, 'getProjectRepositoryStatus'])
        ->name('api.projects.repo-status');

    // Branch management (9 endpoints)
    Route::post('/repositories/{repositoryId}/branches', [RepositoryController::class, 'createBranch'])
        ->name('api.branches.create');

    Route::get('/repositories/{repositoryId}/branches', [RepositoryController::class, 'listBranches'])
        ->name('api.branches.list');

    Route::get('/repositories/{repositoryId}/branches/active', [RepositoryController::class, 'getActiveBranches'])
        ->name('api.branches.active');

    Route::get('/repositories/{repositoryId}/branches/stale', [RepositoryController::class, 'getStaleBranches'])
        ->name('api.branches.stale');

    Route::get('/branches/{branchId}', [RepositoryController::class, 'getBranch'])
        ->name('api.branches.show');

    Route::patch('/branches/{branchId}', [RepositoryController::class, 'updateBranch'])
        ->name('api.branches.update');

    Route::delete('/branches/{branchId}', [RepositoryController::class, 'deleteBranch'])
        ->name('api.branches.delete');

    Route::post('/branches/{branchId}/protect', [RepositoryController::class, 'protectBranch'])
        ->name('api.branches.protect');

    Route::post('/repositories/{repositoryId}/branches/strategy', [RepositoryController::class, 'validateStrategy'])
        ->name('api.branches.validate-strategy');

    // Merge & validation (8 endpoints)
    Route::post('/branches/{branchId}/validate-merge', [RepositoryController::class, 'validateMerge'])
        ->name('api.branches.validate-merge');

    Route::post('/branches/{branchId}/merge-gates', [RepositoryController::class, 'runMergeGates'])
        ->name('api.branches.merge-gates');

    Route::get('/branches/{branchId}/merge-status', [RepositoryController::class, 'getMergeStatus'])
        ->name('api.branches.merge-status');

    Route::post('/branches/{branchId}/authorize-merge', [RepositoryController::class, 'authorizeMerge'])
        ->name('api.branches.authorize-merge');

    Route::post('/branches/{branchId}/reject-merge', [RepositoryController::class, 'rejectMerge'])
        ->name('api.branches.reject-merge');
    /*
    |--------------------------------------------------------------------------
    | Agent Loop / Continuous Execution Routes
    |--------------------------------------------------------------------------
    | Phase 7: Auto-Agent Switching & Continuous Execution
    */
    
    // Agent loop lifecycle
    Route::post('/agent-loop/start', [AgentLoopController::class, 'start'])
        ->name('api.agent-loop.start');
    
    Route::post('/agent-loop/stop', [AgentLoopController::class, 'stop'])
        ->name('api.agent-loop.stop');
    
    Route::get('/agent-loop/status', [AgentLoopController::class, 'status'])
        ->name('api.agent-loop.status');
    
    // For testing
    Route::post('/agent-loop/cycle', [AgentLoopController::class, 'executeCycle'])
        ->name('api.agent-loop.cycle');

    /*
    |--------------------------------------------------------------------------
    | Model Context Protocol (MCP) Server Routes
    |--------------------------------------------------------------------------
    | Phase 1: MCP Integration for Autonomous Agent Execution
    | Reference: Code Master notebook, Section 11.7-11.8
    */
    Route::prefix('mcp')->group(function () {
        Route::get('/nextTask', [McpController::class, 'getNextTask'])
            ->name('api.mcp.nextTask');
        Route::post('/reportTaskStatus', [McpController::class, 'reportTaskStatus'])
            ->name('api.mcp.reportTaskStatus');
        Route::post('/reportObservation', [McpController::class, 'reportObservation'])
            ->name('api.mcp.reportObservation');
        Route::post('/reportTestFailure', [McpController::class, 'reportTestFailure'])
            ->name('api.mcp.reportTestFailure');
        Route::post('/reportVerificationResult', [McpController::class, 'reportVerificationResult'])
            ->name('api.mcp.reportVerificationResult');
        Route::post('/askQuestion', [McpController::class, 'askQuestion'])
            ->name('api.mcp.askQuestion');
    });

    /*
    |--------------------------------------------------------------------------
    | Repository Health Monitoring Routes
    |--------------------------------------------------------------------------
    | Phase 10a: Repository Health Monitoring & Auto-Maintenance
    */

    // Health check operations
    Route::post('/repositories/{repositoryId}/health-check', [RepositoryHealthController::class, 'checkHealth'])
        ->name('api.health.check');

    Route::get('/repositories/{repositoryId}/health', [RepositoryHealthController::class, 'getLatestHealth'])
        ->name('api.health.latest');

    Route::get('/repositories/{repositoryId}/health-history', [RepositoryHealthController::class, 'getHealthHistory'])
        ->name('api.health.history');

    Route::get('/repositories/{repositoryId}/health-report', [RepositoryHealthController::class, 'generateReport'])
        ->name('api.health.report');

    Route::get('/repositories/health/critical', [RepositoryHealthController::class, 'getCriticalRepositories'])
        ->name('api.health.critical');

    Route::get('/projects/{projectId}/health-metrics', [RepositoryHealthController::class, 'getProjectMetrics'])
        ->name('api.health.project-metrics');

    /*
    |--------------------------------------------------------------------------
    | Design System API Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('design')->group(function () {
        // Colors
        Route::get('/colors', [DesignColorController::class, 'index'])
            ->name('api.design.colors.index');
        Route::post('/colors', [DesignColorController::class, 'store'])
            ->name('api.design.colors.store');
        Route::get('/colors/{id}', [DesignColorController::class, 'show'])
            ->name('api.design.colors.show');
        Route::patch('/colors/{id}', [DesignColorController::class, 'update'])
            ->name('api.design.colors.update');
        Route::delete('/colors/{id}', [DesignColorController::class, 'destroy'])
            ->name('api.design.colors.destroy');

        // Typography
        Route::get('/typography', [DesignTypographyController::class, 'index'])
            ->name('api.design.typography.index');
        Route::post('/typography', [DesignTypographyController::class, 'store'])
            ->name('api.design.typography.store');
        Route::get('/typography/{id}', [DesignTypographyController::class, 'show'])
            ->name('api.design.typography.show');
        Route::patch('/typography/{id}', [DesignTypographyController::class, 'update'])
            ->name('api.design.typography.update');
        Route::delete('/typography/{id}', [DesignTypographyController::class, 'destroy'])
            ->name('api.design.typography.destroy');

        // Spacing
        Route::get('/spacing', [DesignSpacingController::class, 'index'])
            ->name('api.design.spacing.index');
        Route::post('/spacing', [DesignSpacingController::class, 'store'])
            ->name('api.design.spacing.store');
        Route::patch('/spacing/{id}', [DesignSpacingController::class, 'update'])
            ->name('api.design.spacing.update');
        Route::delete('/spacing/{id}', [DesignSpacingController::class, 'destroy'])
            ->name('api.design.spacing.destroy');
    });
});
/*
|--------------------------------------------------------------------------
| GitHub Webhook Routes
|--------------------------------------------------------------------------
| These routes are outside the v1 prefix and do not require authentication
*/
Route::post('/github/webhook', [GitHubController::class, 'webhook'])
    ->name('api.github.webhook');

