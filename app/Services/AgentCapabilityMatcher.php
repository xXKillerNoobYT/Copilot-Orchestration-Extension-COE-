<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Task;
use App\Repositories\AgentRepository;
use App\Repositories\TaskRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Agent Capability Matcher Service
 * 
 * Matches tasks to agents based on capabilities and workload.
 */
class AgentCapabilityMatcher
{
    /**
     * Capability requirements for each task type.
     */
    private const TASK_TYPE_CAPABILITIES = [
        'feature' => ['coding', 'problem_solving', 'api_design'],
        'bug' => ['debugging', 'code_analysis', 'testing'],
        'refactor' => ['code_review', 'architecture', 'best_practices'],
        'architecture' => ['system_design', 'architecture', 'documentation'],
        'testing' => ['testing', 'quality_assurance', 'automation'],
        'documentation' => ['writing', 'documentation', 'communication'],
        'maintenance' => ['code_maintenance', 'dependency_management', 'updates'],
    ];

    /**
     * Priority multipliers for workload scoring.
     */
    private const PRIORITY_MULTIPLIERS = [
        'critical' => 4.0,
        'high' => 3.0,
        'medium' => 2.0,
        'low' => 1.0,
    ];

    public function __construct(
        private AgentRepository $agentRepository
    ) {}

    /**
     * Find the best agent for a task based on capabilities and workload.
     *
     * @param Task $task
     * @return Agent|null
     */
    public function findBestAgent(Task $task): ?Agent
    {
        $candidates = $this->getCandidateAgents($task);
        
        if ($candidates->isEmpty()) {
            Log::warning('No suitable agents found for task', [
                'task_id' => $task->id,
                'task_type' => $task->task_type,
            ]);
            return null;
        }
        
        // Score each candidate
        $scoredCandidates = $candidates->map(function ($agent) use ($task) {
            return [
                'agent' => $agent,
                'score' => $this->scoreAgent($agent, $task),
            ];
        });
        
        // Get agent with highest score
        $best = $scoredCandidates->sortByDesc('score')->first();
        
        Log::info('Best agent selected for task', [
            'task_id' => $task->id,
            'agent_id' => $best['agent']->id,
            'agent_type' => $best['agent']->type,
            'score' => $best['score'],
        ]);
        
        return $best['agent'];
    }

    /**
     * Get candidate agents for a task.
     *
     * @param Task $task
     * @return Collection
     */
    public function getCandidateAgents(Task $task): Collection
    {
        // Get agents of the appropriate type
        $typeAgents = $this->agentRepository->getByType($this->getAgentTypeForTask($task));
        
        // Filter by capabilities if task requires specific capabilities
        $requiredCapabilities = $this->getRequiredCapabilities($task);
        
        if (empty($requiredCapabilities)) {
            return $typeAgents;
        }
        
        return $typeAgents->filter(function ($agent) use ($requiredCapabilities) {
            return $this->canHandleTask($agent, $requiredCapabilities);
        });
    }

    /**
     * Check if an agent can handle a task based on capabilities.
     *
     * @param Agent $agent
     * @param array $requiredCapabilities
     * @return bool
     */
    public function canHandleTask(Agent $agent, array $requiredCapabilities): bool
    {
        if (!$agent->capabilities || empty($agent->capabilities)) {
            // If agent has no specified capabilities, assume it can handle basic tasks
            return true;
        }
        
        // Calculate capability overlap
        $overlap = array_intersect($requiredCapabilities, $agent->capabilities);
        
        // Agent must have at least 50% of required capabilities
        $threshold = max(1, ceil(count($requiredCapabilities) * 0.5));
        
        return count($overlap) >= $threshold;
    }

    /**
     * Get matching capabilities between agent and task.
     *
     * @param Agent $agent
     * @param Task $task
     * @return array
     */
    public function getMatchingCapabilities(Agent $agent, Task $task): array
    {
        $required = $this->getRequiredCapabilities($task);
        
        if (!$agent->capabilities || empty($required)) {
            return [];
        }
        
        return array_values(array_intersect($required, $agent->capabilities));
    }

    /**
     * Score an agent for a task (higher is better).
     *
     * @param Agent $agent
     * @param Task $task
     * @return float
     */
    public function scoreAgent(Agent $agent, Task $task): float
    {
        $score = 0.0;
        
        // Capability match score (0-50 points)
        $capabilityScore = $this->calculateCapabilityScore($agent, $task);
        $score += $capabilityScore;
        
        // Workload score (0-30 points) - prefer less busy agents
        $workloadScore = $this->calculateWorkloadScore($agent);
        $score += $workloadScore;
        
        // Specialization score (0-20 points) - prefer specialized agents
        $specializationScore = $this->calculateSpecializationScore($agent, $task);
        $score += $specializationScore;
        
        // Priority bonus (multiply by priority weight)
        $priorityMultiplier = self::PRIORITY_MULTIPLIERS[$task->priority] ?? 1.0;
        
        return $score * $priorityMultiplier;
    }

    /**
     * Calculate capability match score.
     *
     * @param Agent $agent
     * @param Task $task
     * @return float
     */
    private function calculateCapabilityScore(Agent $agent, Task $task): float
    {
        $required = $this->getRequiredCapabilities($task);
        
        if (empty($required)) {
            return 25.0; // Neutral score
        }
        
        if (!$agent->capabilities) {
            return 10.0; // Low score for agents without defined capabilities
        }
        
        $matches = array_intersect($required, $agent->capabilities);
        $matchRate = count($matches) / count($required);
        
        return $matchRate * 50.0;
    }

    /**
     * Calculate workload score (lower workload = higher score).
     *
     * @param Agent $agent
     * @return float
     */
    private function calculateWorkloadScore(Agent $agent): float
    {
        $workload = $this->agentRepository->getWorkload($agent->id);
        
        // Inverse scoring: fewer tasks = higher score
        // 0 tasks = 30 points, 10+ tasks = 0 points
        return max(0, 30 - ($workload * 3));
    }

    /**
     * Calculate specialization score.
     *
     * @param Agent $agent
     * @param Task $task
     * @return float
     */
    private function calculateSpecializationScore(Agent $agent, Task $task): float
    {
        // Prefer agents whose type exactly matches task requirements
        $idealType = $this->getAgentTypeForTask($task);
        
        if ($agent->type === $idealType) {
            return 20.0;
        }
        
        return 5.0; // Low score for non-specialized agents
    }

    /**
     * Get required capabilities for a task.
     *
     * @param Task $task
     * @return array
     */
    private function getRequiredCapabilities(Task $task): array
    {
        return self::TASK_TYPE_CAPABILITIES[$task->task_type] ?? [];
    }

    /**
     * Get the ideal agent type for a task.
     *
     * @param Task $task
     * @return string
     */
    private function getAgentTypeForTask(Task $task): string
    {
        return match ($task->task_type) {
            'feature' => 'coder',
            'bug' => 'coder',
            'refactor' => 'coder',
            'architecture' => 'architect',
            'testing' => 'tester',
            'documentation' => 'documentation',
            'maintenance' => 'maintenance',
            default => 'planner',
        };
    }

    /**
     * Get all agents capable of handling a specific task type.
     *
     * @param string $taskType
     * @return Collection
     */
    public function getCapableAgents(string $taskType): Collection
    {
        $agentType = match ($taskType) {
            'feature', 'bug', 'refactor' => 'coder',
            'architecture' => 'architect',
            'testing' => 'tester',
            'documentation' => 'documentation',
            'maintenance' => 'maintenance',
            default => 'planner',
        };
        
        return $this->agentRepository->getByType($agentType);
    }
}
