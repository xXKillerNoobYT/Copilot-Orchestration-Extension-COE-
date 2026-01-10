<?php

namespace App\Services;

use App\Models\Task;
use App\Repositories\TaskRepository;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Exception;

/**
 * AgentSwitchService
 *
 * Implements a state machine for automatic agent selection and switching.
 * Orchestrates the flow:
 *   [idle] → planning_ready? → invoke Zen Planner
 *          → execution_ready? → invoke Auto Zen
 *          → more_work? → [idle] or [maintenance_mode]
 *
 * Phase 7: Auto-Agent Switching & Continuous Execution
 */
class AgentSwitchService
{
    const STATE_IDLE = 'idle';
    const STATE_PLANNING_READY = 'planning_ready';
    const STATE_PLANNING_DONE = 'planning_done';
    const STATE_EXECUTION_READY = 'execution_ready';
    const STATE_EXECUTION_DONE = 'execution_done';
    const STATE_MAINTENANCE_MODE = 'maintenance_mode';
    const STATE_ERROR = 'error';

    protected TaskRepository $taskRepository;
    protected AgentInvocationService $invocationService;

    public function __construct(
        TaskRepository $taskRepository,
        AgentInvocationService $invocationService
    ) {
        $this->taskRepository = $taskRepository;
        $this->invocationService = $invocationService;
    }

    /**
     * Execute one cycle of the auto-switch loop.
     *
     * @return array Result of cycle: ['state' => string, 'task_id' => ?string, 'message' => string]
     */
    public function executeCycle(): array
    {
        try {
            $currentState = $this->getCurrentState();
            Log::info('Agent switch cycle started', ['state' => $currentState]);

            $result = match ($currentState) {
                self::STATE_IDLE => $this->handleIdle(),
                self::STATE_PLANNING_READY => $this->handlePlanningReady(),
                self::STATE_PLANNING_DONE => $this->handlePlanningDone(),
                self::STATE_EXECUTION_READY => $this->handleExecutionReady(),
                self::STATE_EXECUTION_DONE => $this->handleExecutionDone(),
                self::STATE_MAINTENANCE_MODE => $this->handleMaintenanceMode(),
                default => $this->transitionToState(self::STATE_IDLE, 'Unknown state, resetting to idle'),
            };

            Log::info('Agent switch cycle completed', $result);
            return $result;
        } catch (Exception $e) {
            Log::error('Agent switch cycle failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->transitionToState(self::STATE_ERROR, "Error: {$e->getMessage()}");
            return [
                'state' => self::STATE_ERROR,
                'task_id' => null,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Handle IDLE state: check if there's planning work or execution work.
     */
    protected function handleIdle(): array
    {
        $planningTask = $this->taskRepository->findNextPlanningTask();
        if ($planningTask) {
            $this->transitionToState(self::STATE_PLANNING_READY, "Planning task found: {$planningTask->id}");
            return [
                'state' => self::STATE_PLANNING_READY,
                'task_id' => $planningTask->id,
                'message' => "Transitioning to planning mode for {$planningTask->id}",
            ];
        }

        $executionTask = $this->taskRepository->findNextExecutionTask();
        if ($executionTask) {
            $this->transitionToState(self::STATE_EXECUTION_READY, "Execution task found: {$executionTask->id}");
            return [
                'state' => self::STATE_EXECUTION_READY,
                'task_id' => $executionTask->id,
                'message' => "Transitioning to execution mode for {$executionTask->id}",
            ];
        }

        // No work available; enter maintenance mode
        $this->transitionToState(self::STATE_MAINTENANCE_MODE, 'No pending tasks; entering maintenance mode');
        return [
            'state' => self::STATE_MAINTENANCE_MODE,
            'task_id' => null,
            'message' => 'All tasks complete. System entering maintenance mode.',
        ];
    }

    /**
     * Handle PLANNING_READY state: invoke Zen Planner.
     */
    protected function handlePlanningReady(): array
    {
        $planningTask = $this->taskRepository->findNextPlanningTask();
        if (!$planningTask) {
            // Task was completed while we were in planning_ready; transition back
            return $this->transitionToState(self::STATE_IDLE, 'Planning task no longer available');
        }

        try {
            $result = $this->invocationService->invokeZenPlanner($planningTask);

            if ($result['success']) {
                // Store planner output in context bundle
                $planningTask->context_data = $result['output'];
                $planningTask->save();

                $this->transitionToState(self::STATE_PLANNING_DONE, "Zen Planner completed for {$planningTask->id}");
                return [
                    'state' => self::STATE_PLANNING_DONE,
                    'task_id' => $planningTask->id,
                    'message' => "Zen Planner output captured; {$result['tasks_generated']} tasks generated",
                ];
            } else {
                throw new Exception("Zen Planner failed: {$result['error']}");
            }
        } catch (Exception $e) {
            Log::error('Zen Planner invocation failed', [
                'task_id' => $planningTask->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle PLANNING_DONE state: check if we should move to execution or back to idle.
     */
    protected function handlePlanningDone(): array
    {
        // After planning, always check if there's execution work
        $executionTask = $this->taskRepository->findNextExecutionTask();
        if ($executionTask) {
            $this->transitionToState(self::STATE_EXECUTION_READY, "Execution task available after planning");
            return [
                'state' => self::STATE_EXECUTION_READY,
                'task_id' => $executionTask->id,
                'message' => "Moving to execution mode",
            ];
        }

        // No execution work; back to idle
        $this->transitionToState(self::STATE_IDLE, 'No execution tasks after planning');
        return [
            'state' => self::STATE_IDLE,
            'task_id' => null,
            'message' => 'Planning complete, returning to idle',
        ];
    }

    /**
     * Handle EXECUTION_READY state: invoke Auto Zen.
     */
    protected function handleExecutionReady(): array
    {
        $executionTask = $this->taskRepository->findNextExecutionTask();
        if (!$executionTask) {
            return $this->transitionToState(self::STATE_IDLE, 'Execution task no longer available');
        }

        try {
            $result = $this->invocationService->invokeAutoZen($executionTask);

            if ($result['success']) {
                // Mark task as completed by Auto Zen
                $executionTask->status = 'completed';
                $executionTask->completed_at = now();
                $executionTask->execution_summary = $result['output'];
                $executionTask->save();

                // Post-task comment (per agent rules)
                if (!empty($result['summary'])) {
                    $this->addTaskComment($executionTask, $result['summary']);
                }

                $this->transitionToState(self::STATE_EXECUTION_DONE, "Auto Zen completed for {$executionTask->id}");
                return [
                    'state' => self::STATE_EXECUTION_DONE,
                    'task_id' => $executionTask->id,
                    'message' => "Auto Zen completed; task status set to completed",
                ];
            } else {
                throw new Exception("Auto Zen failed: {$result['error']}");
            }
        } catch (Exception $e) {
            Log::error('Auto Zen invocation failed', [
                'task_id' => $executionTask->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle EXECUTION_DONE state: check if more work is available or return to idle.
     */
    protected function handleExecutionDone(): array
    {
        // Check for more work
        $nextTask = $this->taskRepository->findNextReadyTask();
        if ($nextTask) {
            // Determine whether it's planning or execution
            $isPlanningTask = $this->isPlanningTask($nextTask);
            $targetState = $isPlanningTask ? self::STATE_PLANNING_READY : self::STATE_EXECUTION_READY;

            $this->transitionToState($targetState, "Next task available: {$nextTask->id}");
            return [
                'state' => $targetState,
                'task_id' => $nextTask->id,
                'message' => "Continuing to next task",
            ];
        }

        // No more work
        $this->transitionToState(self::STATE_MAINTENANCE_MODE, 'No more tasks available');
        return [
            'state' => self::STATE_MAINTENANCE_MODE,
            'task_id' => null,
            'message' => 'Execution complete, entering maintenance mode',
        ];
    }

    /**
     * Handle MAINTENANCE_MODE state: system idle, awaiting new work or health checks.
     * In Phase 10, health monitor will auto-generate maintenance tasks.
     */
    protected function handleMaintenanceMode(): array
    {
        // Check if new planning or execution tasks have appeared
        $nextTask = $this->taskRepository->findNextReadyTask();
        if ($nextTask) {
            $isPlanningTask = $this->isPlanningTask($nextTask);
            $targetState = $isPlanningTask ? self::STATE_PLANNING_READY : self::STATE_EXECUTION_READY;

            $this->transitionToState($targetState, "New task in maintenance mode: {$nextTask->id}");
            return [
                'state' => $targetState,
                'task_id' => $nextTask->id,
                'message' => "Exiting maintenance mode; new task found",
            ];
        }

        // Still in maintenance mode; no action
        return [
            'state' => self::STATE_MAINTENANCE_MODE,
            'task_id' => null,
            'message' => 'System in maintenance mode; no pending tasks',
        ];
    }

    /**
     * Get current state from cache.
     */
    protected function getCurrentState(): string
    {
        return Cache::get('agent_switch.state', self::STATE_IDLE);
    }

    /**
     * Transition to a new state and log the change.
     */
    protected function transitionToState(string $newState, string $message): array
    {
        Cache::put('agent_switch.state', $newState, now()->addDay());
        Log::info("State transition", [
            'from' => $this->getCurrentState(),
            'to' => $newState,
            'message' => $message,
        ]);

        return [
            'state' => $newState,
            'task_id' => null,
            'message' => $message,
        ];
    }

    /**
     * Determine if a task is a planning task.
     */
    protected function isPlanningTask(Task $task): bool
    {
        return in_array($task->type, ['planning', 'decomposition', 'architecture']);
    }

    /**
     * Add a post-task comment (per agent rules).
     */
    protected function addTaskComment(Task $task, string $summary): void
    {
        // If task has a GitHub issue, post comment there
        if ($task->github_issue_id) {
            try {
                // Will be implemented in Phase 8 (GitHub sync)
                Log::info('Task comment will be posted to GitHub issue', [
                    'task_id' => $task->id,
                    'issue_id' => $task->github_issue_id,
                ]);
            } catch (Exception $e) {
                Log::warning('Failed to post GitHub comment', [
                    'task_id' => $task->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Store comment in task audit trail
        $task->addComment("Task completed by Auto Zen.\n\n{$summary}");
    }
}
