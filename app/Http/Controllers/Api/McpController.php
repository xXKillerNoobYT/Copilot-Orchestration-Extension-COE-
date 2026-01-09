<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\TaskQueueService;
use App\Services\VerificationService;
use App\Services\ObservationService;
use App\Services\PlanReaderService;
use App\Services\WebSocketEventsService;
use App\Events\TaskStatusUpdated;
use App\Events\ObservationLogged;
use App\Events\TestFailureAlert;
use App\Events\VerificationCompleted;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * MCP Server Controller
 * 
 * Implements Model Context Protocol endpoints for task orchestration:
 * - getNextTask: Fetch next ready task with plan context
 * - reportTaskStatus: Report task completion and progress
 * - reportObservation: Log observations and discoveries
 * - reportTestFailure: Report test failures and block task
 * - reportVerificationResult: Report verification pass/fail
 * - askQuestion: Answer questions with plan/code context
 * 
 * Reference: Code Master notebook, Section 11.7-11.8
 */
class McpController extends Controller
{
    protected TaskQueueService $taskQueue;
    protected PlanReaderService $planReader;
    protected VerificationService $verificationService;
    protected ObservationService $observationService;
    protected WebSocketEventsService $wsEvents;

    public function __construct(
        TaskQueueService $taskQueue,
        PlanReaderService $planReader,
        VerificationService $verificationService,
        ObservationService $observationService,
        WebSocketEventsService $wsEvents
    ) {
        $this->taskQueue = $taskQueue;
        $this->planReader = $planReader;
        $this->verificationService = $verificationService;
        $this->observationService = $observationService;
        $this->wsEvents = $wsEvents;
    }

    /**
     * GET /mcp/nextTask
     * 
     * Fetch the next ready task with enriched prompt and plan context.
     * Implements auto-prioritization based on dependencies.
     * 
     * Query params:
     * - filter: optional task type filter (feature|bug|refactor|etc)
     * - priority: optional priority filter (critical|high|medium|low)
     * 
     * Response: { success, task, queueLength, nextTasksPreview }
     */
    public function getNextTask(Request $request): JsonResponse
    {
        try {
            // Get next ready task from queue
            $task = $this->taskQueue->getNextReady(
                filter: $request->query('filter'),
                priority: $request->query('priority')
            );

            if (!$task) {
                return response()->json([
                    'success' => true,
                    'task' => null,
                    'message' => 'No ready tasks in queue',
                    'queueLength' => $this->taskQueue->countReady(),
                    'queueStats' => [
                        'ready' => $this->taskQueue->countReady(),
                        'blocked' => $this->taskQueue->countBlocked(),
                        'verification' => $this->taskQueue->countVerification(),
                        'investigation' => $this->taskQueue->countInvestigation(),
                    ]
                ], 200);
            }

            // Enrich task with plan context and detailed prompt
            $enrichedTask = $this->enrichTaskWithPlanContext($task);

            return response()->json([
                'success' => true,
                'task' => $enrichedTask,
                'queueLength' => $this->taskQueue->countReady(),
                'nextTasksPreview' => $this->taskQueue->peekNext(2),
                'queueStats' => [
                    'ready' => $this->taskQueue->countReady(),
                    'blocked' => $this->taskQueue->countBlocked(),
                    'verification' => $this->taskQueue->countVerification(),
                    'investigation' => $this->taskQueue->countInvestigation(),
                ]
            ], 200);
        } catch (\Exception $e) {
            Log::error('MCP getNextTask error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /mcp/reportTaskStatus
     * 
     * Report task completion status with implementation details.
     * Triggers verification flow or creates follow-up tasks as needed.
     * 
     * Payload:
     * {
     *   taskId, status, progressPercent, implementationNotes,
     *   filesModified[], testing{}, acceptanceCriteriaVerification[],
     *   observations[], followUpTasks[]
     * }
     * 
     * Response: { success, verificationRequired, followUpTasks, dashboardUpdate }
     */
    public function reportTaskStatus(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'taskId' => 'required|string',
                'status' => 'required|string|in:in-progress,done,blocked,failed',
                'progressPercent' => 'nullable|integer|min:0|max:100',
                'implementationNotes' => 'nullable|string',
                'filesModified' => 'nullable|array',
                'testing' => 'nullable|array',
                'acceptanceCriteriaVerification' => 'nullable|array',
                'observations' => 'nullable|array',
                'followUpTasks' => 'nullable|array',
            ]);

            // Update task in database
            $task = Task::findOrFail($validated['taskId']);
            $task->update([
                'status' => $validated['status'],
                'progress_percent' => $validated['progressPercent'] ?? 0,
                'implementation_notes' => $validated['implementationNotes'],
            ]);

            // Log implementation details
            Log::info('Task status reported', [
                'taskId' => $validated['taskId'],
                'status' => $validated['status'],
                'filesModified' => $validated['filesModified'] ?? [],
            ]);

            // Determine next action
            $response = ['success' => true];

            if ($validated['status'] === 'done') {
                // Task complete - trigger verification
                $response['requiresVerification'] = true;
                $response['verificationTask'] = $this->verificationService->createVerificationTask($task);
            } elseif ($validated['status'] === 'blocked' || $validated['status'] === 'failed') {
                // Create investigation task
                $response['investigationTask'] = $this->createInvestigationTask($task, $validated);
            }

            // Create any follow-up tasks
            if (!empty($validated['followUpTasks'])) {
                $response['followUpTasks'] = $this->createFollowUpTasks($task, $validated['followUpTasks']);
            }

            // Emit WebSocket event for dashboard
            $this->wsEvents->emitTaskStatus(
                $task,
                $validated['progressPercent'] ?? 0,
                $validated['implementationNotes'] ?? 'Task status updated'
            );

            return response()->json($response, 200);
        } catch (\Exception $e) {
            Log::error('MCP reportTaskStatus error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /mcp/reportObservation
     * 
     * Log observations, discoveries, or issues found during task execution.
     * May automatically create new tasks if observation suggests scope changes.
     * 
     * Payload:
     * {
     *   taskId, type (discovery|issue|risk|optimization),
     *   message, severity?, suggestedAction?, createTask?
     * }
     * 
     * Response: { success, observationId, newTaskCreated }
     */
    public function reportObservation(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'taskId' => 'required|string',
                'type' => 'required|string|in:discovery,issue,risk,optimization',
                'message' => 'required|string',
                'severity' => 'nullable|string|in:low,medium,high,critical',
                'suggestedAction' => 'nullable|string',
                'createTask' => 'nullable|boolean',
            ]);

            // Log observation
            $observation = $this->observationService->log($validated);

            // Maybe create new task
            $newTask = null;
            if ($validated['createTask'] ?? false) {
                $newTask = $this->observationService->maybeCreateTaskFromObservation($observation);
            }

            // Emit WebSocket event
            $this->wsEvents->emitObservation(
                $validated['taskId'],
                $validated['type'],
                $validated['message'],
                $validated['severity'] ?? 'medium',
                $newTask !== null,
                $newTask
            );

            return response()->json([
                'success' => true,
                'observationId' => $observation->id,
                'newTaskCreated' => $newTask ? $newTask->id : null,
            ], 200);
        } catch (\Exception $e) {
            Log::error('MCP reportObservation error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /mcp/reportTestFailure
     * 
     * Report test failures and block task execution.
     * Creates investigation task to resolve failure.
     * 
     * Payload:
     * {
     *   taskId, testName, errorMessage, stackTrace?,
     *   failureType (assertion|timeout|error)?
     * }
     * 
     * Response: { success, investigationTask, taskBlocked }
     */
    public function reportTestFailure(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'taskId' => 'required|string',
                'testName' => 'required|string',
                'errorMessage' => 'required|string',
                'stackTrace' => 'nullable|string',
                'failureType' => 'nullable|string|in:assertion,timeout,error,other',
            ]);

            // Block the task
            $task = Task::findOrFail($validated['taskId']);
            $task->update(['status' => 'blocked']);

            // Create investigation task
            $investigationTask = $this->createInvestigationTask(
                $task,
                array_merge($validated, ['reason' => 'test_failure'])
            );

            // Emit critical alert
            $this->wsEvents->emitTestFailure(
                $task->id,
                $validated['testName'],
                $validated['errorMessage'],
                $validated['stackTrace'] ?? null,
                $validated['failureType'] ?? 'error'
            );

            return response()->json([
                'success' => true,
                'investigationTask' => $investigationTask,
                'taskBlocked' => true,
            ], 200);
        } catch (\Exception $e) {
            Log::error('MCP reportTestFailure error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /mcp/reportVerificationResult
     * 
     * Report visual/manual verification pass/fail status.
     * Closes task or creates follow-up items based on result.
     * 
     * Payload:
     * {
     *   verificationTaskId, originalTaskId, status (passed|failed|partial),
     *   checklist[], issuesFound[], followUpTasks[]
     * }
     * 
     * Response: { success, taskClosed, followUpTasks, dashboardUpdate }
     */
    public function reportVerificationResult(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'verificationTaskId' => 'required|string',
                'originalTaskId' => 'required|string',
                'status' => 'required|string|in:passed,failed,partial',
                'checklist' => 'nullable|array',
                'issuesFound' => 'nullable|array',
                'followUpTasks' => 'nullable|array',
                'notes' => 'nullable|string',
            ]);

            // Apply verification result
            $result = $this->verificationService->applyResult($validated);

            // Emit dashboard update via WebSocket
            $this->wsEvents->emitVerification(
                $validated['verificationTaskId'],
                $validated['originalTaskId'],
                $validated['checklist'] ?? [],
                false,
                'idle',
                []
            );

            return response()->json($result, 200);
        } catch (\Exception $e) {
            Log::error('MCP reportVerificationResult error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /mcp/askQuestion
     * 
     * Answer questions with context from plan and codebase.
     * Provides references to plan sections and code locations.
     * 
     * Payload:
     * {
     *   question, currentTaskId?, planSection?, context?
     * }
     * 
     * Response: { success, answer, confidence, references, planRefs }
     */
    public function askQuestion(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'question' => 'required|string',
                'currentTaskId' => 'nullable|string',
                'planSection' => 'nullable|string',
                'context' => 'nullable|array',
            ]);

            // Get plan context
            $planContext = $this->planReader->getContext(
                $validated['planSection'] ?? null
            );

            // Build contextual answer
            $answer = $this->buildContextualAnswer(
                $validated['question'],
                $planContext,
                $validated['context'] ?? []
            );

            return response()->json([
                'success' => true,
                'answer' => $answer['text'],
                'confidence' => $answer['confidence'],
                'references' => $answer['references'] ?? [],
                'planReferences' => $answer['planReferences'] ?? [],
            ], 200);
        } catch (\Exception $e) {
            Log::error('MCP askQuestion error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== Helper Methods =====

    /**
     * Enrich task with plan context and detailed prompt
     */
    private function enrichTaskWithPlanContext(Task $task): array
    {
        $planSection = $task->plan_section ?? 'general';
        $planContext = $this->planReader->getContext($planSection);

        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'type' => $task->task_type,
            'priority' => $task->priority,
            'status' => $task->status,
            'estimatedHours' => $task->estimated_hours,
            'acceptanceCriteria' => $task->acceptance_criteria,
            'dependencies' => $task->dependencies,
            'planReference' => $planSection,
            'detailedPrompt' => $this->generateDetailedPrompt($task, $planContext),
            'planContext' => $planContext,
            'codeContext' => $this->gatherCodeContext($task),
        ];
    }

    /**
     * Generate detailed execution prompt for task
     */
    private function generateDetailedPrompt(Task $task, array $planContext): string
    {
        $prompt = "# Task: {$task->title}\n\n";
        $prompt .= "## Description\n{$task->description}\n\n";
        $prompt .= "## Acceptance Criteria\n";
        foreach ($task->acceptance_criteria ?? [] as $criteria) {
            $prompt .= "- [ ] {$criteria}\n";
        }
        $prompt .= "\n## Plan Reference\n";
        $section = $planContext['section'] ?? 'N/A';
        $summary = $planContext['summary'] ?? '';
        $prompt .= "Code Master notebook, Section: {$section}\n";
        $prompt .= "{$summary}\n";
        return $prompt;
    }

    /**
     * Gather relevant code context for task
     */
    private function gatherCodeContext(Task $task): array
    {
        // TODO: Implement code context gathering
        // This would involve searching for related files, recent commits, etc.
        return [];
    }

    /**
     * Create investigation task for failed/blocked task
     */
    private function createInvestigationTask(Task $task, array $context): Task
    {
        // TODO: Implement investigation task creation
        $reason = $context['reason'] ?? 'unknown';
        return Task::create([
            'title' => "Investigate: {$task->title}",
            'description' => "Investigation task for blocked task: {$reason}",
            'task_type' => 'investigation',
            'priority' => 'high',
            'parent_task_id' => $task->id,
        ]);
    }

    /**
     * Create follow-up tasks from observations
     */
    private function createFollowUpTasks(Task $parentTask, array $followUpSpecs): array
    {
        $created = [];
        foreach ($followUpSpecs as $spec) {
            $task = Task::create([
                'title' => $spec['title'] ?? 'Follow-up task',
                'description' => $spec['description'] ?? '',
                'task_type' => $spec['type'] ?? 'task',
                'priority' => $spec['priority'] ?? 'medium',
                'parent_task_id' => $parentTask->id,
            ]);
            $created[] = $task;
        }
        return $created;
    }

    /**
     * Build contextual answer from plan and code
     */
    private function buildContextualAnswer(string $question, array $planContext, array $context): array
    {
        // TODO: Implement contextual answering
        // This would use plan context to answer questions
        return [
            'text' => "Answer to: {$question}",
            'confidence' => 0.75,
            'references' => [],
            'planReferences' => [$planContext['section'] ?? null],
        ];
    }
}
