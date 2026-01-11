<?php

namespace App\Services;

use App\Models\TaskPlan;
use App\Repositories\TaskPlanRepository;
use App\Exceptions\PlanningException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PlanningService
{
    public function __construct(
        private TaskPlanRepository $planRepository,
        private RequirementParserService $requirementParser,
        private ArchitectureDesignService $architectureDesigner,
        private DependencyGraphService $dependencyGraph,
        private TaskOrchestrationService $taskOrchestration,
        private LoggingService $logging,
        private AuditTrailService $audit,
        private MetricsCollectionService $metrics
    ) {}

    /**
     * Generate a comprehensive task plan from user requirements
     */
    public function generateTaskPlan(string $projectId, string $requirement, array $options = []): TaskPlan
    {
        $startTime = microtime(true);
        
        try {
            $this->logging->logEvent('plan_generation_started', [
                'project_id' => $projectId,
                'requirement_length' => strlen($requirement),
                'options' => $options,
            ]);

            // Parse the requirement
            $parsedRequirement = $this->requirementParser->parseRequirement($requirement);
            
            // Analyze complexity
            $complexity = $this->requirementParser->analyzeComplexity($parsedRequirement);
            
            // Generate task hierarchy
            $taskHierarchy = $this->generateTaskHierarchy($parsedRequirement, $options);
            
            // Extract dependencies
            $dependencies = $this->extractDependencies($taskHierarchy);
            
            // Validate no circular dependencies
            $this->validateDependencies($dependencies);
            
            // Estimate effort
            $estimatedHours = $this->estimateEffort($taskHierarchy, $complexity);
            
            // Create the plan
            $planData = [
                'project_id' => $projectId,
                'created_by_user_id' => Auth::id(),
                'requirement' => $requirement,
                'parsed_requirement' => $parsedRequirement->toArray(),
                'generated_tasks' => $taskHierarchy,
                'dependencies' => $dependencies,
                'status' => 'draft',
                'complexity' => $complexity->level,
                'estimated_hours' => $estimatedHours,
                'version' => 1,
            ];

            $plan = $this->planRepository->create($planData);

            // Generate architecture design if requested
            if ($options['generate_architecture'] ?? true) {
                $architecture = $this->architectureDesigner->generateArchitecture($plan->id);
                $plan->architecture_design = $architecture->toArray();
                $plan->save();
            }

            // Record metrics
            $duration = (microtime(true) - $startTime) * 1000;
            $this->metrics->recordTaskMetrics([
                'type' => 'plan_generation',
                'duration' => $duration,
                'task_count' => count($taskHierarchy),
                'complexity' => $complexity->level,
            ]);

            // Log and audit
            $this->logging->logTaskEvent('plan_generated', [
                'plan_id' => $plan->id,
                'task_count' => count($taskHierarchy),
                'complexity' => $complexity->level,
                'duration_ms' => $duration,
            ]);

            $this->audit->logTaskAudit('plan_created', $plan->id, [
                'task_count' => count($taskHierarchy),
                'complexity' => $complexity->level,
            ]);

            return $plan->fresh();

        } catch (\Exception $e) {
            $this->logging->logError($e, [
                'event' => 'plan_generation_failed',
                'project_id' => $projectId,
                'requirement' => substr($requirement, 0, 200),
            ]);

            throw new PlanningException(
                "Failed to generate task plan: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Refine an existing task plan with user feedback
     */
    public function refineTaskPlan(string $planId, array $refinements): TaskPlan
    {
        try {
            $plan = $this->planRepository->find($planId);
            
            if (!$plan) {
                throw new PlanningException("Plan not found: {$planId}");
            }

            if (!in_array($plan->status, ['draft', 'pending_approval'])) {
                throw new PlanningException("Cannot refine plan with status: {$plan->status}");
            }

            $this->logging->logTaskEvent('plan_refinement_started', $planId, [
                'refinements_count' => count($refinements),
            ]);

            $taskHierarchy = $plan->generated_tasks;
            $changes = [];

            foreach ($refinements as $refinement) {
                $type = $refinement['type'];
                $data = $refinement['data'];

                switch ($type) {
                    case 'add_task':
                        $taskHierarchy[] = $data;
                        $changes[] = "Added task: {$data['title']}";
                        break;

                    case 'remove_task':
                        $taskHierarchy = array_filter($taskHierarchy, fn($t) => $t['id'] !== $data['task_id']);
                        $changes[] = "Removed task: {$data['task_id']}";
                        break;

                    case 'modify_task':
                        foreach ($taskHierarchy as &$task) {
                            if ($task['id'] === $data['task_id']) {
                                $task = array_merge($task, $data['changes']);
                                $changes[] = "Modified task: {$data['task_id']}";
                                break;
                            }
                        }
                        break;

                    case 'add_dependency':
                        $dependencies = $plan->dependencies ?? [];
                        $dependencies[] = [
                            'from' => $data['from_task_id'],
                            'to' => $data['to_task_id'],
                        ];
                        $plan->dependencies = $dependencies;
                        $changes[] = "Added dependency: {$data['from_task_id']} → {$data['to_task_id']}";
                        break;
                }
            }

            // Validate refined dependencies
            if (!empty($plan->dependencies)) {
                $this->validateDependencies($plan->dependencies);
            }

            // Update plan
            $plan->generated_tasks = array_values($taskHierarchy);
            $plan->version += 1;
            $plan->save();

            // Audit
            $this->audit->logTaskAudit('plan_refined', $planId, [
                'changes' => $changes,
                'version' => $plan->version,
            ]);

            $this->logging->logTaskEvent('plan_refined', [
                'plan_id' => $planId,
                'changes_count' => count($changes),
                'version' => $plan->version,
            ]);

            return $plan->fresh();

        } catch (\Exception $e) {
            $this->logging->logError($e, [
                'event' => 'plan_refinement_failed',
                'plan_id' => $planId,
            ]);

            throw new PlanningException(
                "Failed to refine plan: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Validate task plan structure and dependencies
     */
    public function validateTaskPlan(string $planId): array
    {
        try {
            $plan = $this->planRepository->find($planId);
            
            if (!$plan) {
                throw new PlanningException("Plan not found: {$planId}");
            }

            $errors = [];
            $warnings = [];

            // Validate task structure
            foreach ($plan->generated_tasks as $task) {
                if (empty($task['title'])) {
                    $errors[] = "Task missing title: {$task['id']}";
                }

                if (empty($task['type'])) {
                    $warnings[] = "Task missing type: {$task['id']}";
                }

                if (empty($task['assignees'])) {
                    $warnings[] = "Task has no assignees: {$task['id']}";
                }
            }

            // Validate dependencies
            if (!empty($plan->dependencies)) {
                $taskIds = array_column($plan->generated_tasks, 'id');
                
                foreach ($plan->dependencies as $dep) {
                    if (!in_array($dep['from'], $taskIds)) {
                        $errors[] = "Dependency references non-existent task: {$dep['from']}";
                    }
                    if (!in_array($dep['to'], $taskIds)) {
                        $errors[] = "Dependency references non-existent task: {$dep['to']}";
                    }
                }

                // Check for circular dependencies
                try {
                    $this->validateDependencies($plan->dependencies);
                } catch (\Exception $e) {
                    $errors[] = "Circular dependency detected: {$e->getMessage()}";
                }
            }

            // Validate effort estimates
            if ($plan->estimated_hours <= 0) {
                $warnings[] = "Plan has no time estimate";
            }

            return [
                'valid' => empty($errors),
                'errors' => $errors,
                'warnings' => $warnings,
                'task_count' => count($plan->generated_tasks),
                'dependency_count' => count($plan->dependencies ?? []),
            ];

        } catch (\Exception $e) {
            throw new PlanningException(
                "Failed to validate plan: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Approve a task plan and create actual tasks
     */
    public function approveTaskPlan(string $planId, ?string $userId = null): TaskPlan
    {
        try {
            $plan = $this->planRepository->find($planId);
            
            if (!$plan) {
                throw new PlanningException("Plan not found: {$planId}");
            }

            if ($plan->status !== 'pending_approval' && $plan->status !== 'draft') {
                throw new PlanningException("Plan cannot be approved in current status: {$plan->status}");
            }

            // Validate before approval
            $validation = $this->validateTaskPlan($planId);
            if (!$validation['valid']) {
                throw new PlanningException(
                    "Plan has validation errors: " . implode(', ', $validation['errors'])
                );
            }

            DB::beginTransaction();

            try {
                // Update plan status
                $plan->status = 'approved';
                $plan->approved_by_user_id = $userId ?? Auth::id();
                $plan->approved_at = now();
                $plan->save();

                // Create actual tasks from plan
                $createdTasks = [];
                foreach ($plan->generated_tasks as $taskData) {
                    $task = $this->taskOrchestration->createTask([
                        'project_id' => $plan->project_id,
                        'name' => $taskData['title'],
                        'description' => $taskData['description'] ?? '',
                        'task_type' => $taskData['type'] ?? 'feature',
                        'priority' => $taskData['priority'] ?? 'medium',
                        'status' => 'pending',
                        'assigned_agent' => $taskData['assignees'][0] ?? null,
                        'estimated_effort' => $taskData['estimated_hours'] ?? null,
                    ]);

                    $createdTasks[$taskData['id']] = $task->id;
                }

                // Create task dependencies
                if (!empty($plan->dependencies)) {
                    foreach ($plan->dependencies as $dep) {
                        if (isset($createdTasks[$dep['from']]) && isset($createdTasks[$dep['to']])) {
                            DB::table('task_dependencies')->insert([
                                'task_id' => $createdTasks[$dep['to']],
                                'depends_on_task_id' => $createdTasks[$dep['from']],
                                'created_at' => now(),
                            ]);
                        }
                    }
                }

                DB::commit();

                // Audit and log
                $this->audit->logTaskAudit('plan_approved', $planId, [
                    'tasks_created' => count($createdTasks),
                    'approved_by' => $userId ?? Auth::id(),
                ]);

                $this->logging->logTaskEvent('plan_approved', [
                    'plan_id' => $planId,
                    'tasks_created' => count($createdTasks),
                ]);

                $this->metrics->incrementCounter('plans.approved');

                return $plan->fresh();

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            $this->logging->logError($e, [
                'event' => 'plan_approval_failed',
                'plan_id' => $planId,
            ]);

            throw new PlanningException(
                "Failed to approve plan: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Reject a task plan with reason
     */
    public function rejectTaskPlan(string $planId, string $reason, ?string $userId = null): void
    {
        try {
            $plan = $this->planRepository->find($planId);
            
            if (!$plan) {
                throw new PlanningException("Plan not found: {$planId}");
            }

            $plan->status = 'rejected';
            $plan->rejection_reason = $reason;
            $plan->rejected_at = now();
            $plan->save();

            $this->audit->logTaskAudit('plan_rejected', $planId, [
                'reason' => $reason,
                'rejected_by' => $userId ?? Auth::id(),
            ]);

            $this->logging->logTaskEvent('plan_rejected', [
                'plan_id' => $planId,
                'reason' => $reason,
            ]);

            $this->metrics->incrementCounter('plans.rejected');

        } catch (\Exception $e) {
            $this->logging->logError($e, [
                'event' => 'plan_rejection_failed',
                'plan_id' => $planId,
            ]);

            throw new PlanningException(
                "Failed to reject plan: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Get a specific plan
     */
    public function getPlan(string $planId): ?TaskPlan
    {
        return $this->planRepository->find($planId);
    }

    /**
     * Get plans for a project with optional filters
     */
    public function getPlansForProject(string $projectId, array $filters = []): Collection
    {
        return $this->planRepository->findForProject($projectId, $filters);
    }

    /**
     * Get plans pending approval for a user
     */
    public function getPendingPlans(?string $userId = null): Collection
    {
        return $this->planRepository->getPendingPlans($userId);
    }

    /**
     * Get plan statistics
     */
    public function getPlanStatistics(string $planId): array
    {
        $plan = $this->planRepository->find($planId);
        
        if (!$plan) {
            throw new PlanningException("Plan not found: {$planId}");
        }

        $tasks = $plan->generated_tasks;
        
        return [
            'total_tasks' => count($tasks),
            'by_type' => $this->groupByKey($tasks, 'type'),
            'by_priority' => $this->groupByKey($tasks, 'priority'),
            'total_dependencies' => count($plan->dependencies ?? []),
            'estimated_hours' => $plan->estimated_hours,
            'complexity' => $plan->complexity,
            'version' => $plan->version,
            'status' => $plan->status,
        ];
    }

    /**
     * Get planning metrics for a project
     */
    public function getPlanningMetrics(string $projectId): array
    {
        $plans = $this->planRepository->findForProject($projectId);

        return [
            'total_plans' => $plans->count(),
            'by_status' => $plans->groupBy('status')->map->count(),
            'by_complexity' => $plans->groupBy('complexity')->map->count(),
            'total_estimated_hours' => $plans->sum('estimated_hours'),
            'average_tasks_per_plan' => $plans->avg(fn($p) => count($p->generated_tasks)),
            'approval_rate' => $this->calculateApprovalRate($plans),
        ];
    }

    /**
     * Generate task hierarchy from parsed requirement
     */
    private function generateTaskHierarchy($parsedRequirement, array $options): array
    {
        $tasks = [];
        $entities = $parsedRequirement->entities;
        $intents = $parsedRequirement->intents;

        // Generate tasks based on entities and intents
        foreach ($entities as $entity) {
            // Create CRUD tasks for each entity
            $entityTasks = $this->generateEntityTasks($entity, $intents);
            $tasks = array_merge($tasks, $entityTasks);
        }

        // Add testing tasks
        if ($options['include_testing'] ?? true) {
            $tasks[] = [
                'id' => 'task_' . uniqid(),
                'title' => 'Write comprehensive tests',
                'description' => 'Unit, integration, and feature tests for all functionality',
                'type' => 'testing',
                'priority' => 'high',
                'assignees' => ['tester'],
                'estimated_hours' => ceil(count($tasks) * 0.3), // 30% of dev time
            ];
        }

        // Add documentation task
        if ($options['include_documentation'] ?? true) {
            $tasks[] = [
                'id' => 'task_' . uniqid(),
                'title' => 'Create documentation',
                'description' => 'API documentation, user guides, and technical documentation',
                'type' => 'documentation',
                'priority' => 'medium',
                'assignees' => ['documentation'],
                'estimated_hours' => 8,
            ];
        }

        return $tasks;
    }

    /**
     * Generate tasks for an entity
     */
    private function generateEntityTasks(object $entity, array $intents): array
    {
        $tasks = [];
        $entityName = $entity->name;

        // Model task
        $tasks[] = [
            'id' => 'task_model_' . strtolower($entityName),
            'title' => "Create {$entityName} model and migration",
            'description' => "Create Eloquent model, migration, and factory for {$entityName}",
            'type' => 'architecture',
            'priority' => 'high',
            'assignees' => ['architect', 'coder'],
            'estimated_hours' => 2,
        ];

        // Repository task
        $tasks[] = [
            'id' => 'task_repo_' . strtolower($entityName),
            'title' => "Create {$entityName}Repository",
            'description' => "Data access layer for {$entityName}",
            'type' => 'feature',
            'priority' => 'high',
            'assignees' => ['coder'],
            'estimated_hours' => 2,
        ];

        // Service task
        $tasks[] = [
            'id' => 'task_service_' . strtolower($entityName),
            'title' => "Create {$entityName}Service",
            'description' => "Business logic layer for {$entityName}",
            'type' => 'feature',
            'priority' => 'high',
            'assignees' => ['coder'],
            'estimated_hours' => 4,
        ];

        // Controller task if API needed
        if (in_array('api', $intents)) {
            $tasks[] = [
                'id' => 'task_controller_' . strtolower($entityName),
                'title' => "Create {$entityName}Controller",
                'description' => "RESTful API endpoints for {$entityName}",
                'type' => 'feature',
                'priority' => 'medium',
                'assignees' => ['coder'],
                'estimated_hours' => 3,
            ];
        }

        return $tasks;
    }

    /**
     * Extract dependencies from task hierarchy
     */
    private function extractDependencies(array $tasks): array
    {
        $dependencies = [];

        // Add logical dependencies (models before services before controllers)
        $modelTasks = array_filter($tasks, fn($t) => str_contains($t['id'], 'model'));
        $repoTasks = array_filter($tasks, fn($t) => str_contains($t['id'], 'repo'));
        $serviceTasks = array_filter($tasks, fn($t) => str_contains($t['id'], 'service'));
        $controllerTasks = array_filter($tasks, fn($t) => str_contains($t['id'], 'controller'));

        foreach ($repoTasks as $repoTask) {
            foreach ($modelTasks as $modelTask) {
                if ($this->areRelated($modelTask, $repoTask)) {
                    $dependencies[] = ['from' => $modelTask['id'], 'to' => $repoTask['id']];
                }
            }
        }

        foreach ($serviceTasks as $serviceTask) {
            foreach ($repoTasks as $repoTask) {
                if ($this->areRelated($repoTask, $serviceTask)) {
                    $dependencies[] = ['from' => $repoTask['id'], 'to' => $serviceTask['id']];
                }
            }
        }

        foreach ($controllerTasks as $controllerTask) {
            foreach ($serviceTasks as $serviceTask) {
                if ($this->areRelated($serviceTask, $controllerTask)) {
                    $dependencies[] = ['from' => $serviceTask['id'], 'to' => $controllerTask['id']];
                }
            }
        }

        return $dependencies;
    }

    /**
     * Check if two tasks are related (same entity)
     */
    private function areRelated(array $task1, array $task2): bool
    {
        // Extract entity name from task ID
        preg_match('/task_\w+_(\w+)/', $task1['id'], $matches1);
        preg_match('/task_\w+_(\w+)/', $task2['id'], $matches2);

        return isset($matches1[1], $matches2[1]) && $matches1[1] === $matches2[1];
    }

    /**
     * Validate dependencies for circular references
     */
    private function validateDependencies(array $dependencies): void
    {
        // Build adjacency list
        $graph = [];
        foreach ($dependencies as $dep) {
            $graph[$dep['from']][] = $dep['to'];
        }

        // Check for cycles using DFS
        $visited = [];
        $recStack = [];

        foreach (array_keys($graph) as $node) {
            if ($this->hasCycle($node, $graph, $visited, $recStack)) {
                throw new PlanningException("Circular dependency detected in task plan");
            }
        }
    }

    /**
     * Detect cycle using DFS
     */
    private function hasCycle($node, array $graph, array &$visited, array &$recStack): bool
    {
        if (isset($recStack[$node])) {
            return true;
        }

        if (isset($visited[$node])) {
            return false;
        }

        $visited[$node] = true;
        $recStack[$node] = true;

        if (isset($graph[$node])) {
            foreach ($graph[$node] as $neighbor) {
                if ($this->hasCycle($neighbor, $graph, $visited, $recStack)) {
                    return true;
                }
            }
        }

        unset($recStack[$node]);
        return false;
    }

    /**
     * Estimate effort for task hierarchy
     */
    private function estimateEffort(array $tasks, object $complexity): int
    {
        $baseHours = array_sum(array_column($tasks, 'estimated_hours'));

        // Apply complexity multiplier
        $multiplier = match($complexity->level) {
            'simple' => 1.0,
            'moderate' => 1.3,
            'complex' => 1.6,
            'very_complex' => 2.0,
            default => 1.0,
        };

        return ceil($baseHours * $multiplier);
    }

    /**
     * Group array by key
     */
    private function groupByKey(array $items, string $key): array
    {
        $grouped = [];
        foreach ($items as $item) {
            $value = $item[$key] ?? 'unknown';
            $grouped[$value] = ($grouped[$value] ?? 0) + 1;
        }
        return $grouped;
    }

    /**
     * Calculate approval rate
     */
    private function calculateApprovalRate(Collection $plans): float
    {
        if ($plans->isEmpty()) {
            return 0.0;
        }

        $approved = $plans->where('status', 'approved')->count();
        $total = $plans->whereIn('status', ['approved', 'rejected'])->count();

        return $total > 0 ? round(($approved / $total) * 100, 2) : 0.0;
    }
}
