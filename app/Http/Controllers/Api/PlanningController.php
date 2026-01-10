<?php

namespace App\Http\Controllers\Api;

use App\Services\PlanningService;
use App\Services\ArchitectureDesignService;
use App\Http\Requests\GenerateTaskPlanRequest;
use App\Http\Requests\RefineTaskPlanRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanningController
{
    public function __construct(
        private PlanningService $planningService,
        private ArchitectureDesignService $architectureService
    ) {}

    /**
     * Generate a task plan from requirements
     * 
     * POST /api/v1/planning/generate
     */
    public function generate(GenerateTaskPlanRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $plan = $this->planningService->generateTaskPlan(
            $validated['project_id'],
            $validated['requirement'],
            [
                'generate_architecture' => $validated['generate_architecture'] ?? true,
                'include_testing' => $validated['include_testing'] ?? true,
                'include_documentation' => $validated['include_documentation'] ?? true,
                'complexity_hint' => $validated['complexity_hint'] ?? null,
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $plan,
            'message' => 'Task plan generated successfully',
        ], 201);
    }

    /**
     * Get a specific plan
     * 
     * GET /api/v1/planning/{planId}
     */
    public function show(string $planId): JsonResponse
    {
        $plan = $this->planningService->getPlan($planId);

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $plan,
        ]);
    }

    /**
     * Refine an existing plan
     * 
     * PATCH /api/v1/planning/{planId}
     */
    public function refine(string $planId, RefineTaskPlanRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $plan = $this->planningService->refineTaskPlan(
            $planId,
            $validated['refinements']
        );

        return response()->json([
            'success' => true,
            'data' => $plan,
            'message' => 'Plan refined successfully',
        ]);
    }

    /**
     * Delete a plan
     * 
     * DELETE /api/v1/planning/{planId}
     */
    public function destroy(string $planId): JsonResponse
    {
        $plan = $this->planningService->getPlan($planId);

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found',
            ], 404);
        }

        if ($plan->status === 'approved' || $plan->status === 'implemented') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete approved or implemented plans',
            ], 422);
        }

        $plan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Plan deleted successfully',
        ]);
    }

    /**
     * Approve a plan
     * 
     * POST /api/v1/planning/{planId}/approve
     */
    public function approve(string $planId, Request $request): JsonResponse
    {
        $plan = $this->planningService->approveTaskPlan(
            $planId,
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'data' => $plan,
            'message' => 'Plan approved and tasks created',
        ]);
    }

    /**
     * Reject a plan
     * 
     * POST /api/v1/planning/{planId}/reject
     */
    public function reject(string $planId, Request $request): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        $this->planningService->rejectTaskPlan(
            $planId,
            $request->input('reason'),
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Plan rejected',
        ]);
    }

    /**
     * Validate a plan
     * 
     * POST /api/v1/planning/{planId}/validate
     */
    public function validate(string $planId): JsonResponse
    {
        $validation = $this->planningService->validateTaskPlan($planId);

        return response()->json([
            'success' => true,
            'data' => $validation,
        ]);
    }

    /**
     * Get plans for a project
     * 
     * GET /api/v1/projects/{projectId}/plans
     */
    public function index(string $projectId, Request $request): JsonResponse
    {
        $filters = [
            'status' => $request->input('status'),
            'complexity' => $request->input('complexity'),
            'created_by' => $request->input('created_by'),
        ];

        $plans = $this->planningService->getPlansForProject($projectId, array_filter($filters));

        return response()->json([
            'success' => true,
            'data' => $plans,
            'count' => $plans->count(),
        ]);
    }

    /**
     * Get pending approvals
     * 
     * GET /api/v1/planning/pending
     */
    public function pending(Request $request): JsonResponse
    {
        $plans = $this->planningService->getPendingPlans($request->user()?->id);

        return response()->json([
            'success' => true,
            'data' => $plans,
            'count' => $plans->count(),
        ]);
    }

    /**
     * Generate architecture for a plan
     * 
     * POST /api/v1/planning/{planId}/architecture
     */
    public function generateArchitecture(string $planId): JsonResponse
    {
        $architecture = $this->architectureService->generateArchitecture($planId);

        return response()->json([
            'success' => true,
            'data' => $architecture,
            'message' => 'Architecture generated successfully',
        ]);
    }

    /**
     * Get architecture diagrams
     * 
     * GET /api/v1/planning/{planId}/diagrams
     */
    public function getDiagrams(string $planId): JsonResponse
    {
        $plan = $this->planningService->getPlan($planId);

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found',
            ], 404);
        }

        $diagrams = $plan->architecture_design['diagrams'] ?? [];

        return response()->json([
            'success' => true,
            'data' => $diagrams,
        ]);
    }

    /**
     * Export plan to JSON or Markdown
     * 
     * POST /api/v1/planning/{planId}/export
     */
    public function export(string $planId, Request $request): JsonResponse
    {
        $format = $request->input('format', 'json');

        $plan = $this->planningService->getPlan($planId);

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found',
            ], 404);
        }

        if ($format === 'markdown') {
            $content = $this->exportAsMarkdown($plan);
            $filename = "plan_{$plan->id}.md";
            $mimeType = 'text/markdown';
        } else {
            $content = json_encode($plan->toArray(), JSON_PRETTY_PRINT);
            $filename = "plan_{$plan->id}.json";
            $mimeType = 'application/json';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'content' => $content,
                'filename' => $filename,
                'format' => $format,
            ],
        ]);
    }

    /**
     * Get plan statistics
     * 
     * GET /api/v1/planning/{planId}/statistics
     */
    public function statistics(string $planId): JsonResponse
    {
        $stats = $this->planningService->getPlanStatistics($planId);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get planning metrics for a project
     * 
     * GET /api/v1/projects/{projectId}/planning-metrics
     */
    public function metrics(string $projectId): JsonResponse
    {
        $metrics = $this->planningService->getPlanningMetrics($projectId);

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * Export plan as Markdown
     */
    private function exportAsMarkdown($plan): string
    {
        $md = "# Task Plan: {$plan->id}\n\n";
        $md .= "**Status:** {$plan->status}\n";
        $md .= "**Complexity:** {$plan->complexity}\n";
        $md .= "**Estimated Hours:** {$plan->estimated_hours}\n";
        $md .= "**Version:** {$plan->version}\n\n";

        $md .= "## Requirement\n\n{$plan->requirement}\n\n";

        $md .= "## Generated Tasks\n\n";
        foreach ($plan->generated_tasks as $task) {
            $md .= "### {$task['title']}\n";
            $md .= "- **Type:** {$task['type']}\n";
            $md .= "- **Priority:** {$task['priority']}\n";
            $md .= "- **Assignees:** " . implode(', ', $task['assignees'] ?? []) . "\n";
            $md .= "- **Estimated Hours:** {$task['estimated_hours']}\n";
            if (!empty($task['description'])) {
                $md .= "\n{$task['description']}\n";
            }
            $md .= "\n";
        }

        if (!empty($plan->dependencies)) {
            $md .= "## Dependencies\n\n";
            foreach ($plan->dependencies as $dep) {
                $md .= "- {$dep['from']} → {$dep['to']}\n";
            }
            $md .= "\n";
        }

        return $md;
    }
}
