<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Task;
use App\Repositories\AgentRepository;
use App\Repositories\TaskRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Agent Management Service
 * 
 * Manages agent lifecycle, assignment, and workload distribution.
 */
class AgentManagementService
{
    public function __construct(
        private AgentRepository $agentRepository,
        private TaskRepository $taskRepository,
        private AgentCapabilityMatcher $capabilityMatcher
    ) {}

    /**
     * Assign the best agent to a task based on capabilities and workload.
     *
     * @param Task $task
     * @param string|null $preferredAgentId Optional preferred agent ID
     * @return Agent|null
     */
    public function assignAgentToTask(Task $task, ?string $preferredAgentId = null): ?Agent
    {
        // Use preferred agent if provided and capable
        if ($preferredAgentId) {
            $agent = $this->agentRepository->findById($preferredAgentId);
            
            if ($agent && $agent->is_active) {
                $requiredCapabilities = $this->getRequiredCapabilitiesForTask($task);
                
                if ($this->capabilityMatcher->canHandleTask($agent, $requiredCapabilities)) {
                    Log::info('Assigned preferred agent to task', [
                        'task_id' => $task->id,
                        'agent_id' => $agent->id,
                    ]);
                    
                    return $agent;
                }
            }
        }
        
        // Find best agent automatically
        $agent = $this->capabilityMatcher->findBestAgent($task);
        
        if (!$agent) {
            Log::warning('No suitable agent found for task', [
                'task_id' => $task->id,
                'task_type' => $task->task_type,
            ]);
            
            return null;
        }
        
        return $agent;
    }

    /**
     * Get candidate agents for a task with scoring.
     *
     * @param Task $task
     * @return Collection
     */
    public function getCandidateAgents(Task $task): Collection
    {
        $candidates = $this->capabilityMatcher->getCandidateAgents($task);
        
        return $candidates->map(function ($agent) use ($task) {
            return [
                'agent' => $agent,
                'score' => $this->capabilityMatcher->scoreAgent($agent, $task),
                'workload' => $this->agentRepository->getWorkload($agent->id),
                'capabilities_match' => $this->capabilityMatcher->getMatchingCapabilities($agent, $task),
            ];
        })->sortByDesc('score')->values();
    }

    /**
     * Create a new agent.
     *
     * @param array $data Agent attributes
     * @return Agent
     */
    public function createAgent(array $data): Agent
    {
        $agent = $this->agentRepository->create($data);
        
        Log::info('Agent created', [
            'agent_id' => $agent->id,
            'type' => $agent->type,
            'name' => $agent->name,
        ]);
        
        return $agent;
    }

    /**
     * Update an agent.
     *
     * @param string $agentId Agent UUID
     * @param array $data Updated attributes
     * @return Agent
     */
    public function updateAgent(string $agentId, array $data): Agent
    {
        $agent = $this->agentRepository->update($agentId, $data);
        
        Log::info('Agent updated', [
            'agent_id' => $agent->id,
            'updated_fields' => array_keys($data),
        ]);
        
        return $agent;
    }

    /**
     * Activate an agent.
     *
     * @param string $agentId Agent UUID
     * @return Agent
     */
    public function activateAgent(string $agentId): Agent
    {
        return $this->updateAgent($agentId, ['is_active' => true]);
    }

    /**
     * Deactivate an agent.
     *
     * @param string $agentId Agent UUID
     * @return Agent
     */
    public function deactivateAgent(string $agentId): Agent
    {
        return $this->updateAgent($agentId, ['is_active' => false]);
    }

    /**
     * Get all active agents.
     *
     * @return Collection
     */
    public function getActiveAgents(): Collection
    {
        return $this->agentRepository->getActive();
    }

    /**
     * Get agents by type.
     *
     * @param string $type Agent type
     * @return Collection
     */
    public function getAgentsByType(string $type): Collection
    {
        return $this->agentRepository->getByType($type);
    }

    /**
     * Get agent workload distribution.
     *
     * @return array
     */
    public function getWorkloadDistribution(): array
    {
        $agents = $this->getActiveAgents();
        
        $distribution = $agents->map(function ($agent) {
            return [
                'agent_id' => $agent->id,
                'agent_name' => $agent->name,
                'agent_type' => $agent->type,
                'active_tasks' => $this->agentRepository->getWorkload($agent->id),
            ];
        });
        
        return [
            'total_agents' => $agents->count(),
            'distribution' => $distribution->toArray(),
            'total_active_tasks' => $distribution->sum('active_tasks'),
            'average_workload' => $agents->isEmpty() ? 0 : round($distribution->avg('active_tasks'), 2),
        ];
    }

    /**
     * Balance workload across agents of the same type.
     * Returns tasks that should be reassigned.
     *
     * @param string $agentType Agent type to balance
     * @return array
     */
    public function balanceWorkload(string $agentType): array
    {
        $agents = $this->agentRepository->getByWorkload($agentType);
        
        if ($agents->count() < 2) {
            return []; // No balancing needed with fewer than 2 agents
        }
        
        $workloads = $agents->map(function ($agent) {
            return $this->agentRepository->getWorkload($agent->id);
        });
        
        $avgWorkload = $workloads->avg();
        $recommendations = [];
        
        // Find overloaded agents (workload > 50% above average)
        $overloadedAgents = $agents->filter(function ($agent) use ($avgWorkload) {
            $workload = $this->agentRepository->getWorkload($agent->id);
            return $workload > ($avgWorkload * 1.5);
        });
        
        // Find underloaded agents (workload < average)
        $underloadedAgents = $agents->filter(function ($agent) use ($avgWorkload) {
            $workload = $this->agentRepository->getWorkload($agent->id);
            return $workload < $avgWorkload;
        })->sortBy(function ($agent) {
            return $this->agentRepository->getWorkload($agent->id);
        });
        
        // Generate recommendations
        foreach ($overloadedAgents as $overloaded) {
            $tasks = $this->taskRepository->getByProject('*') // TODO: Filter by agent
                ->where('assigned_agent', $overloaded->type)
                ->where('status', 'pending')
                ->take(2); // Suggest moving up to 2 tasks
            
            foreach ($tasks as $task) {
                $targetAgent = $underloadedAgents->first();
                
                if ($targetAgent) {
                    $recommendations[] = [
                        'task_id' => $task->id,
                        'from_agent' => $overloaded->id,
                        'to_agent' => $targetAgent->id,
                        'reason' => 'workload_balancing',
                    ];
                }
            }
        }
        
        return $recommendations;
    }

    /**
     * Get agent statistics.
     *
     * @param string $agentId Agent UUID
     * @return array
     */
    public function getAgentStatistics(string $agentId): array
    {
        return $this->agentRepository->getStatistics($agentId);
    }

    /**
     * Get required capabilities for a task.
     *
     * @param Task $task
     * @return array
     */
    private function getRequiredCapabilitiesForTask(Task $task): array
    {
        $capabilityMap = [
            'feature' => ['coding', 'problem_solving', 'api_design'],
            'bug' => ['debugging', 'code_analysis', 'testing'],
            'refactor' => ['code_review', 'architecture', 'best_practices'],
            'architecture' => ['system_design', 'architecture', 'documentation'],
            'testing' => ['testing', 'quality_assurance', 'automation'],
            'documentation' => ['writing', 'documentation', 'communication'],
            'maintenance' => ['code_maintenance', 'dependency_management', 'updates'],
        ];
        
        return $capabilityMap[$task->task_type] ?? [];
    }

    /**
     * Get agents with lowest workload for a task type.
     *
     * @param string $taskType Task type
     * @param int $limit Number of agents to return
     * @return Collection
     */
    public function getLeastBusyAgents(string $taskType, int $limit = 5): Collection
    {
        $agentType = match ($taskType) {
            'feature', 'bug', 'refactor' => 'coder',
            'architecture' => 'architect',
            'testing' => 'tester',
            'documentation' => 'documentation',
            'maintenance' => 'maintenance',
            default => 'planner',
        };
        
        return $this->agentRepository->getByWorkload($agentType)->take($limit);
    }
}
