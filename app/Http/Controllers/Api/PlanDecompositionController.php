<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Task;
use App\Services\PlanDecompositionService;
use App\Services\WizardPlanParserService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Plan Decomposition Controller
 * 
 * Handles automatic task generation from wizard plans
 */
class PlanDecompositionController extends Controller
{
    public function __construct(
        private PlanDecompositionService $decompositionService,
        private WizardPlanParserService $planParser
    ) {}

    /**
     * Decompose a plan into executable tasks
     * 
     * POST /api/plans/{id}/decompose
     * 
     * @param Request $request
     * @param int $id Plan ID
     * @return JsonResponse
     */
    public function decompose(Request $request, int $id): JsonResponse
    {
        try {
            // Load plan
            $plan = Plan::find($id);
            
            if (!$plan) {
                return response()->json([
                    'error' => 'Plan not found',
                ], 404);
            }
            
            // Validate plan status
            if (!in_array($plan->status, ['active', 'completed'])) {
                return response()->json([
                    'error' => 'Plan must be in active or completed status for decomposition',
                    'current_status' => $plan->status,
                ], 400);
            }
            
            // Validate request
            $validated = $request->validate([
                'options' => 'nullable|array',
                'options.auto_create' => 'nullable|boolean',
                'options.microtask_size' => 'nullable|integer|min:15|max:240',
                'project_id' => 'nullable|integer',
            ]);
            
            $autoCreate = $validated['options']['auto_create'] ?? false;
            $microtaskSize = $validated['options']['microtask_size'] ?? 45;
            $projectId = $validated['project_id'] ?? null;
            
            // Get normalized plan data from wizard_state
            $normalizedPlan = $this->getNormalizedPlanFromWizardState($plan);
            
            // Decompose plan into tasks
            $result = $this->decompositionService->decomposePlan(
                $normalizedPlan,
                ['microtask_size' => $microtaskSize]
            );
            
            // If auto_create is true, create Task models
            $createdTasks = [];
            if ($autoCreate) {
                $createdTasks = $this->createTasksInDatabase(
                    $result['tasks'],
                    $projectId,
                    $plan->id
                );
            }
            
            Log::info('Plan decomposed successfully', [
                'plan_id' => $id,
                'total_tasks' => $result['metadata']['total_tasks'],
                'auto_created' => $autoCreate,
                'created_count' => count($createdTasks),
            ]);
            
            return response()->json([
                'success' => true,
                'tasks' => $result['tasks'],
                'metadata' => $result['metadata'],
                'preview' => !$autoCreate,
                'created_tasks' => $autoCreate ? $createdTasks : null,
            ]);
            
        } catch (InvalidArgumentException $e) {
            Log::warning('Plan decomposition validation failed', [
                'plan_id' => $id,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
            
        } catch (\Exception $e) {
            Log::error('Plan decomposition failed', [
                'plan_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'error' => 'Failed to decompose plan',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get normalized plan data from Plan model's wizard_state
     * 
     * @param Plan $plan
     * @return array Normalized plan structure
     */
    private function getNormalizedPlanFromWizardState(Plan $plan): array
    {
        $wizardState = $plan->wizard_state ?? [];
        
        // Extract plan data from wizard state
        // Assuming wizard_state contains the plan structure
        $planData = $wizardState['plan'] ?? $wizardState;
        
        // Convert to normalized format expected by decomposition service
        return [
            'metadata' => [
                'project_name' => $plan->name,
                'description' => $plan->description ?? '',
                'created_at' => $plan->created_at->toIso8601String(),
                'version' => $planData['version'] ?? '1.0',
            ],
            'features' => collect($planData['features'] ?? [])->map(function ($feature) {
                return [
                    'id' => $feature['id'] ?? uniqid('feat-'),
                    'name' => $feature['name'] ?? 'Unnamed Feature',
                    'description' => $feature['description'] ?? '',
                    'priority' => $feature['priority'] ?? 'medium',
                    'dependencies' => $feature['dependencies'] ?? [],
                    'status' => $feature['status'] ?? 'pending',
                ];
            }),
            'timeline' => $planData['timeline'] ?? [],
            'architecture' => [
                'pattern' => $planData['architecture'] ?? 'mvc',
                'constraints' => $planData['constraints'] ?? [],
                'tech_stack' => $planData['techStack'] ?? [],
                'integrations' => $planData['integrations'] ?? [],
            ],
            'team' => $planData['team'] ?? [],
            'raw' => $planData,
        ];
    }

    /**
     * Create Task models in database from generated tasks
     * 
     * @param array $tasks Generated task array
     * @param int|null $projectId Project ID to assign tasks to
     * @param int $planId Plan ID for reference
     * @return array Created task IDs
     */
    private function createTasksInDatabase(
        array $tasks,
        ?int $projectId,
        int $planId
    ): array {
        $createdTasks = [];
        
        DB::beginTransaction();
        
        try {
            // Create task ID mapping for dependencies
            $taskIdMap = [];
            
            // First pass: create all tasks
            foreach ($tasks as $taskData) {
                $task = Task::create([
                    'project_id' => $projectId,
                    'name' => $taskData['title'],
                    'description' => $taskData['description'],
                    'task_type' => $taskData['type'] ?? 'feature',
                    'priority' => $taskData['priority'],
                    'status' => 'pending',
                    'estimated_effort' => isset($taskData['estimate_hours']) 
                        ? (int)($taskData['estimate_hours'] * 60) 
                        : null, // Convert hours to minutes
                ]);
                
                $taskIdMap[$taskData['id']] = $task->id;
                
                $createdTasks[] = [
                    'id' => $task->id,
                    'uuid' => $task->id, // UUID from HasUuids trait
                    'name' => $task->name,
                    'priority' => $task->priority,
                    'feature_id' => $taskData['id'],
                ];
                
                // Create subtasks if present
                if (!empty($taskData['subtasks'])) {
                    foreach ($taskData['subtasks'] as $subtaskData) {
                        $subtask = Task::create([
                            'project_id' => $projectId,
                            'parent_task_id' => $task->id,
                            'name' => $subtaskData['title'],
                            'description' => $subtaskData['description'],
                            'task_type' => 'subtask',
                            'priority' => $subtaskData['priority'],
                            'status' => 'pending',
                            'estimated_effort' => isset($subtaskData['estimate_hours'])
                                ? (int)($subtaskData['estimate_hours'] * 60)
                                : null,
                        ]);
                        
                        $taskIdMap[$subtaskData['id']] = $subtask->id;
                        
                        $createdTasks[] = [
                            'id' => $subtask->id,
                            'uuid' => $subtask->id,
                            'name' => $subtask->name,
                            'priority' => $subtask->priority,
                            'parent_id' => $task->id,
                            'feature_id' => $subtaskData['id'],
                        ];
                    }
                }
            }
            
            // Second pass: create dependencies
            // Note: This requires a TaskDependency model/table
            // For now, we'll skip dependency creation and log a TODO
            Log::info('Task dependencies need to be created', [
                'task_count' => count($createdTasks),
                'plan_id' => $planId,
            ]);
            
            DB::commit();
            
            Log::info('Tasks created from plan decomposition', [
                'plan_id' => $planId,
                'task_count' => count($createdTasks),
            ]);
            
            return $createdTasks;
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Failed to create tasks from decomposition', [
                'plan_id' => $planId,
                'error' => $e->getMessage(),
            ]);
            
            throw $e;
        }
    }
}
