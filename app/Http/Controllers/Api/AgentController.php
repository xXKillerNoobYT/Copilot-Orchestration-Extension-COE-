<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AgentManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Agent Controller
 * 
 * RESTful API for agent management.
 */
class AgentController extends Controller
{
    public function __construct(
        private AgentManagementService $agentService
    ) {}

    /**
     * Get all active agents.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $agents = $this->agentService->getActiveAgents();
        
        return response()->json([
            'success' => true,
            'data' => $agents,
            'meta' => [
                'total' => $agents->count(),
            ],
        ]);
    }

    /**
     * Get agents by type.
     *
     * @param string $type Agent type
     * @return JsonResponse
     */
    public function byType(string $type): JsonResponse
    {
        $agents = $this->agentService->getAgentsByType($type);
        
        return response()->json([
            'success' => true,
            'data' => $agents,
            'meta' => [
                'type' => $type,
                'count' => $agents->count(),
            ],
        ]);
    }

    /**
     * Create a new agent.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:agents,name',
            'type' => 'required|string|in:planner,architect,coder,tester,reviewer,documentation,deployment,maintenance',
            'description' => 'nullable|string',
            'capabilities' => 'nullable|array',
            'capabilities.*' => 'string',
            'configuration' => 'nullable|array',
            'llm_provider' => 'nullable|string|in:copilot,local,cloud,openai,anthropic',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $agent = $this->agentService->createAgent($validator->validated());
            
            return response()->json([
                'success' => true,
                'data' => $agent,
                'message' => 'Agent created successfully',
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an agent.
     *
     * @param Request $request
     * @param string $agentId
     * @return JsonResponse
     */
    public function update(Request $request, string $agentId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255|unique:agents,name,' . $agentId,
            'type' => 'sometimes|string|in:planner,architect,coder,tester,reviewer,documentation,deployment,maintenance',
            'description' => 'nullable|string',
            'capabilities' => 'nullable|array',
            'capabilities.*' => 'string',
            'configuration' => 'nullable|array',
            'llm_provider' => 'nullable|string|in:copilot,local,cloud,openai,anthropic',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $agent = $this->agentService->updateAgent($agentId, $validator->validated());
            
            return response()->json([
                'success' => true,
                'data' => $agent,
                'message' => 'Agent updated successfully',
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Activate an agent.
     *
     * @param string $agentId
     * @return JsonResponse
     */
    public function activate(string $agentId): JsonResponse
    {
        try {
            $agent = $this->agentService->activateAgent($agentId);
            
            return response()->json([
                'success' => true,
                'data' => $agent,
                'message' => 'Agent activated successfully',
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Deactivate an agent.
     *
     * @param string $agentId
     * @return JsonResponse
     */
    public function deactivate(string $agentId): JsonResponse
    {
        try {
            $agent = $this->agentService->deactivateAgent($agentId);
            
            return response()->json([
                'success' => true,
                'data' => $agent,
                'message' => 'Agent deactivated successfully',
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get candidate agents for a task.
     *
     * @param Request $request
     * @param string $taskId
     * @return JsonResponse
     */
    public function candidatesForTask(Request $request, string $taskId): JsonResponse
    {
        try {
            $task = \App\Models\Task::findOrFail($taskId);
            $candidates = $this->agentService->getCandidateAgents($task);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'task_id' => $taskId,
                    'candidates' => $candidates,
                ],
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Get workload distribution across all agents.
     *
     * @return JsonResponse
     */
    public function workloadDistribution(): JsonResponse
    {
        $distribution = $this->agentService->getWorkloadDistribution();
        
        return response()->json([
            'success' => true,
            'data' => $distribution,
        ]);
    }

    /**
     * Balance workload for a specific agent type.
     *
     * @param string $agentType
     * @return JsonResponse
     */
    public function balanceWorkload(string $agentType): JsonResponse
    {
        try {
            $recommendations = $this->agentService->balanceWorkload($agentType);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'agent_type' => $agentType,
                    'recommendations' => $recommendations,
                    'count' => count($recommendations),
                ],
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get agent statistics.
     *
     * @param string $agentId
     * @return JsonResponse
     */
    public function statistics(string $agentId): JsonResponse
    {
        try {
            $stats = $this->agentService->getAgentStatistics($agentId);
            
            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get least busy agents for a task type.
     *
     * @param Request $request
     * @param string $taskType
     * @return JsonResponse
     */
    public function leastBusy(Request $request, string $taskType): JsonResponse
    {
        $limit = $request->input('limit', 5);
        
        try {
            $agents = $this->agentService->getLeastBusyAgents($taskType, $limit);
            
            return response()->json([
                'success' => true,
                'data' => $agents,
                'meta' => [
                    'task_type' => $taskType,
                    'limit' => $limit,
                ],
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
