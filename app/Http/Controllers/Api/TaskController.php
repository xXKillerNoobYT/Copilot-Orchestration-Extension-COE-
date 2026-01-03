<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateTaskRequest;
use App\Http\Requests\UpdateTaskStatusRequest;
use App\Services\TaskOrchestrationService;
use App\Services\DependencyGraphService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Task Controller
 * 
 * RESTful API for task management.
 */
class TaskController extends Controller
{
    public function __construct(
        private TaskOrchestrationService $orchestrationService,
        private DependencyGraphService $dependencyService
    ) {}

    /**
     * Get all tasks for a project.
     *
     * @param Request $request
     * @param string $projectId
     * @return JsonResponse
     */
    public function index(Request $request, string $projectId): JsonResponse
    {
        $filters = $request->only(['status', 'priority', 'task_type', 'assigned_agent']);
        $tasks = $this->orchestrationService->getTasksByProject($projectId, $filters);
        
        return response()->json([
            'success' => true,
            'data' => $tasks,
            'meta' => [
                'total' => $tasks->count(),
                'filters' => $filters,
            ],
        ]);
    }

    /**
     * Get a specific task with full context.
     *
     * @param string $taskId
     * @return JsonResponse
     */
    public function show(string $taskId): JsonResponse
    {
        $task = $this->orchestrationService->getTaskWithContext($taskId);
        
        if (!$task) {
            return response()->json([
                'success' => false,
                'error' => 'Task not found',
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $task,
        ]);
    }

    /**
     * Create a new task.
     *
     * @param CreateTaskRequest $request
     * @return JsonResponse
     */
    public function store(CreateTaskRequest $request): JsonResponse
    {
        try {
            $task = $this->orchestrationService->createTask($request->validated());
            
            return response()->json([
                'success' => true,
                'data' => $task,
                'message' => 'Task created successfully',
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Update task status.
     *
     * @param UpdateTaskStatusRequest $request
     * @param string $taskId
     * @return JsonResponse
     */
    public function updateStatus(UpdateTaskStatusRequest $request, string $taskId): JsonResponse
    {
        try {
            $task = $this->orchestrationService->updateTaskStatus(
                $taskId,
                $request->input('status'),
                $request->input('metadata', [])
            );
            
            return response()->json([
                'success' => true,
                'data' => $task,
                'message' => 'Task status updated successfully',
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Assign an agent to a task.
     *
     * @param Request $request
     * @param string $taskId
     * @return JsonResponse
     */
    public function assignAgent(Request $request, string $taskId): JsonResponse
    {
        $request->validate([
            'agent_type' => 'nullable|string|in:planner,architect,coder,tester,reviewer,documentation,deployment,maintenance',
        ]);
        
        try {
            $task = $this->orchestrationService->assignAgent(
                $taskId,
                $request->input('agent_type')
            );
            
            return response()->json([
                'success' => true,
                'data' => $task,
                'message' => 'Agent assigned successfully',
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Get dependency tree for a task.
     *
     * @param Request $request
     * @param string $taskId
     * @return JsonResponse
     */
    public function dependencies(Request $request, string $taskId): JsonResponse
    {
        $includeIndirect = $request->boolean('include_indirect', true);
        $dependencies = $this->dependencyService->getDependencyTree($taskId, $includeIndirect);
        
        return response()->json([
            'success' => true,
            'data' => [
                'task_id' => $taskId,
                'dependencies' => $dependencies,
                'total_count' => $dependencies->count(),
            ],
        ]);
    }

    /**
     * Get tasks ready to execute (no pending dependencies).
     *
     * @param string $projectId
     * @return JsonResponse
     */
    public function ready(string $projectId): JsonResponse
    {
        $tasks = $this->dependencyService->getExecutableTasks($projectId);
        
        return response()->json([
            'success' => true,
            'data' => $tasks,
            'meta' => [
                'count' => $tasks->count(),
            ],
        ]);
    }

    /**
     * Get blocked tasks (have pending dependencies).
     *
     * @param string $projectId
     * @return JsonResponse
     */
    public function blocked(string $projectId): JsonResponse
    {
        $tasks = $this->dependencyService->getBlockedTasks($projectId);
        
        return response()->json([
            'success' => true,
            'data' => $tasks,
            'meta' => [
                'count' => $tasks->count(),
            ],
        ]);
    }

    /**
     * Validate dependency graph for a project.
     *
     * @param string $projectId
     * @return JsonResponse
     */
    public function validateGraph(string $projectId): JsonResponse
    {
        $validation = $this->dependencyService->validateGraph($projectId);
        
        return response()->json([
            'success' => $validation['valid'],
            'data' => $validation,
        ]);
    }

    /**
     * Calculate critical path for a project.
     *
     * @param string $projectId
     * @return JsonResponse
     */
    public function criticalPath(string $projectId): JsonResponse
    {
        $criticalPath = $this->dependencyService->calculateCriticalPath($projectId);
        
        return response()->json([
            'success' => true,
            'data' => $criticalPath,
        ]);
    }
}
