<?php

namespace App\Services;

use App\Models\Task;
use App\Exceptions\AgentInvocationException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Exception;

/**
 * AgentInvocationService
 *
 * Handles actual invocation of Zen Planner and Auto Zen agents.
 * Manages:
 * - Context bundle preparation
 * - Agent endpoint calls (with timeouts and retries)
 * - Error handling and parsing
 * - Output capture and storage
 *
 * Phase 7: Auto-Agent Switching & Continuous Execution
 */
class AgentInvocationService
{
    const AGENT_TIMEOUT = 300; // 5 minutes max per agent call
    const AGENT_MAX_RETRIES = 3;
    const AGENT_RETRY_BACKOFF = 2; // exponential backoff multiplier

    protected ContextBundleService $contextBundleService;

    public function __construct(ContextBundleService $contextBundleService)
    {
        $this->contextBundleService = $contextBundleService;
    }

    /**
     * Invoke Zen Planner for a planning task.
     *
     * @param Task $task
     * @return array ['success' => bool, 'output' => string|array, 'tasks_generated' => int, 'error' => ?string]
     */
    public function invokeZenPlanner(Task $task): array
    {
        try {
            Log::info('Invoking Zen Planner', ['task_id' => $task->id, 'title' => $task->title]);

            // Prepare context bundle with project vision, current task queue, architecture docs
            $contextBundle = $this->contextBundleService->buildPlanningContext($task);

            // Construct agent prompt
            $prompt = $this->buildPlannerPrompt($task, $contextBundle);

            // Call Zen Planner (could be local agent file or remote API)
            $result = $this->callAgentWithRetry('zen-planner', $prompt);

            if (!$result['success']) {
                return [
                    'success' => false,
                    'output' => null,
                    'tasks_generated' => 0,
                    'error' => $result['error'],
                ];
            }

            // Parse output: extract generated task tree
            $parsedTasks = $this->parseTaskOutput($result['output']);

            Log::info('Zen Planner succeeded', [
                'task_id' => $task->id,
                'tasks_generated' => count($parsedTasks),
            ]);

            return [
                'success' => true,
                'output' => $result['output'],
                'tasks_generated' => count($parsedTasks),
                'error' => null,
            ];
        } catch (Exception $e) {
            Log::error('Zen Planner invocation error', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'output' => null,
                'tasks_generated' => 0,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Invoke Auto Zen for an execution task.
     *
     * @param Task $task
     * @return array ['success' => bool, 'output' => string|array, 'summary' => string, 'error' => ?string]
     */
    public function invokeAutoZen(Task $task): array
    {
        try {
            Log::info('Invoking Auto Zen', ['task_id' => $task->id, 'title' => $task->title]);

            // Prepare execution context: scoped files, acceptance criteria, constraints
            $contextBundle = $this->contextBundleService->buildExecutionContext($task);

            // Construct execution prompt
            $prompt = $this->buildExecutionPrompt($task, $contextBundle);

            // Call Auto Zen
            $result = $this->callAgentWithRetry('auto-zen', $prompt);

            if (!$result['success']) {
                return [
                    'success' => false,
                    'output' => null,
                    'summary' => '',
                    'error' => $result['error'],
                ];
            }

            // Parse output: extract summary (per agent rules, must include files changed, tests, follow-ups)
            $summary = $this->parseExecutionSummary($result['output']);

            Log::info('Auto Zen succeeded', [
                'task_id' => $task->id,
                'files_changed' => count($summary['files'] ?? []),
            ]);

            return [
                'success' => true,
                'output' => $result['output'],
                'summary' => $summary['text'] ?? $result['output'],
                'error' => null,
            ];
        } catch (Exception $e) {
            Log::error('Auto Zen invocation error', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'output' => null,
                'summary' => '',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Call an agent with retry logic and timeout.
     *
     * @param string $agentName
     * @param string $prompt
     * @return array ['success' => bool, 'output' => string, 'error' => ?string]
     */
    protected function callAgentWithRetry(string $agentName, string $prompt): array
    {
        $lastError = null;
        $delay = 1; // seconds, exponential backoff

        for ($attempt = 1; $attempt <= self::AGENT_MAX_RETRIES; $attempt++) {
            try {
                Log::debug("Agent call attempt {$attempt}/{self::AGENT_MAX_RETRIES}", [
                    'agent' => $agentName,
                    'prompt_length' => strlen($prompt),
                ]);

                // Call agent endpoint (will be configured per deployment)
                $response = Http::timeout(self::AGENT_TIMEOUT)
                    ->post(config('services.agents.endpoint') . '/' . $agentName, [
                        'prompt' => $prompt,
                        'api_key' => config('services.agents.api_key'),
                    ]);

                if ($response->successful()) {
                    return [
                        'success' => true,
                        'output' => $response->body(),
                        'error' => null,
                    ];
                }

                $lastError = $response->body();
                Log::warning("Agent call failed", [
                    'agent' => $agentName,
                    'attempt' => $attempt,
                    'status' => $response->status(),
                    'error' => $lastError,
                ]);
            } catch (Exception $e) {
                $lastError = $e->getMessage();
                Log::warning("Agent call exception", [
                    'agent' => $agentName,
                    'attempt' => $attempt,
                    'error' => $lastError,
                ]);
            }

            // Exponential backoff before retry
            if ($attempt < self::AGENT_MAX_RETRIES) {
                sleep($delay);
                $delay *= self::AGENT_RETRY_BACKOFF;
            }
        }

        return [
            'success' => false,
            'output' => null,
            'error' => "Agent '{$agentName}' failed after {$attempt} attempts: {$lastError}",
        ];
    }

    /**
     * Build planning prompt for Zen Planner.
     */
    protected function buildPlannerPrompt(Task $task, array $contextBundle): string
    {
        return <<<PROMPT
You are Zen Planner, an expert task decomposition agent.

**Task:** {$task->title}

**Description:** {$task->description}

**Context:**
- Project Vision: {$contextBundle['project_vision'] ?? 'N/A'}
- Current Task Queue: {$contextBundle['task_queue_summary'] ?? 'N/A'}
- Architecture Docs: {$contextBundle['architecture_docs'] ?? 'N/A'}

**Your Job:**
1. Decompose the task into atomic subtasks (15-45 minutes each).
2. Identify dependencies between subtasks.
3. Assign priority (critical, high, medium, low).
4. For each subtask, provide:
   - Title (clear, actionable)
   - Description (why it matters)
   - Acceptance Criteria (how to verify completion)
   - Estimated Duration
   - Dependencies (if any)

**Output Format:**
Return a structured JSON array of tasks:
[
  {{
    "title": "Subtask 1",
    "description": "...",
    "acceptance_criteria": [...],
    "estimated_minutes": 30,
    "priority": "high",
    "dependencies": []
  }},
  ...
]

**Constraints:**
- No task should exceed 45 minutes or span multiple domains.
- Dependencies must be acyclic.
- Include test strategy for each subtask.
PROMPT;
    }

    /**
     * Build execution prompt for Auto Zen.
     */
    protected function buildExecutionPrompt(Task $task, array $contextBundle): string
    {
        return <<<PROMPT
You are Auto Zen, an expert code implementation and execution agent.

**Task:** {$task->title}

**Description:** {$task->description}

**Acceptance Criteria:**
{$contextBundle['acceptance_criteria'] ?? 'N/A'}

**Files to Modify:**
{$contextBundle['files_list'] ?? 'N/A'}

**Constraints:**
- Follow SOLID principles (Single Responsibility, Open/Closed, etc.)
- Use existing patterns from the codebase (repositories, services, etc.)
- Add tests alongside implementation
- No breaking changes to existing APIs

**Your Job:**
1. Analyze the files
2. Implement the required changes
3. Write/update tests
4. Verify no regressions
5. Document your work

**Post-Task Comment (Required):**
After completion, summarize:
- What was implemented
- Files changed
- Tests added/modified
- Follow-up tasks (if any)
- Next step

**Output:**
Submit your work. Include a final summary matching the Post-Task Comment format above.
PROMPT;
    }

    /**
     * Parse task output from Zen Planner.
     */
    protected function parseTaskOutput(string $output): array
    {
        try {
            // Attempt JSON parsing
            $decoded = json_decode($output, true);
            if (is_array($decoded)) {
                return $decoded;
            }

            // Fallback: extract task-like structures from text
            Log::warning('Could not parse task output as JSON; using fallback', [
                'output_length' => strlen($output),
            ]);

            return [];
        } catch (Exception $e) {
            Log::error('Failed to parse task output', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Parse execution summary from Auto Zen output.
     */
    protected function parseExecutionSummary(string $output): array
    {
        try {
            // Look for post-task comment section
            if (preg_match('/## Post-Task Comment.*?(?=##|$)/s', $output, $matches)) {
                $commentText = $matches[0];

                // Extract files changed
                $files = [];
                if (preg_match_all('/(?:modified|changed|created|deleted):\s*(.+?)(?:\n|$)/i', $commentText, $fileMatches)) {
                    $files = array_map('trim', $fileMatches[1]);
                }

                return [
                    'text' => $commentText,
                    'files' => $files,
                ];
            }

            return [
                'text' => $output,
                'files' => [],
            ];
        } catch (Exception $e) {
            Log::warning('Failed to parse execution summary', ['error' => $e->getMessage()]);
            return [
                'text' => $output,
                'files' => [],
            ];
        }
    }
}
