<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Project;
use App\Models\Task;
use App\Services\AgentManagementService;
use App\Services\AgentCapabilityMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Agent Management Test
 * 
 * Comprehensive tests for the multi-agent system.
 */
class AgentManagementTest extends TestCase
{
    use RefreshDatabase;

    private AgentManagementService $agentService;
    private AgentCapabilityMatcher $capabilityMatcher;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->agentService = app(AgentManagementService::class);
        $this->capabilityMatcher = app(AgentCapabilityMatcher::class);
        $this->project = Project::factory()->create();
    }

    /** @test */
    public function it_creates_an_agent_successfully()
    {
        $agentData = [
            'name' => 'Test Coder Agent',
            'type' => 'coder',
            'description' => 'A coding agent for testing',
            'capabilities' => ['coding', 'debugging', 'testing'],
            'llm_provider' => 'copilot',
        ];

        $agent = $this->agentService->createAgent($agentData);

        $this->assertNotNull($agent);
        $this->assertEquals('Test Coder Agent', $agent->name);
        $this->assertEquals('coder', $agent->type);
        $this->assertCount(3, $agent->capabilities);
        $this->assertTrue($agent->is_active);
    }

    /** @test */
    public function it_activates_and_deactivates_agents()
    {
        $agent = Agent::factory()->create(['is_active' => false]);

        $this->assertFalse($agent->is_active);

        $activatedAgent = $this->agentService->activateAgent($agent->id);
        $this->assertTrue($activatedAgent->is_active);

        $deactivatedAgent = $this->agentService->deactivateAgent($agent->id);
        $this->assertFalse($deactivatedAgent->is_active);
    }

    /** @test */
    public function it_gets_agents_by_type()
    {
        Agent::factory()->create(['type' => 'coder', 'is_active' => true]);
        Agent::factory()->create(['type' => 'coder', 'is_active' => true]);
        Agent::factory()->create(['type' => 'tester', 'is_active' => true]);

        $coders = $this->agentService->getAgentsByType('coder');

        $this->assertCount(2, $coders);
        $this->assertTrue($coders->every(fn($a) => $a->type === 'coder'));
    }

    /** @test */
    public function it_finds_best_agent_for_task()
    {
        $agent1 = Agent::factory()->create([
            'type' => 'coder',
            'capabilities' => ['coding', 'debugging'],
            'is_active' => true,
        ]);

        $agent2 = Agent::factory()->create([
            'type' => 'coder',
            'capabilities' => ['coding', 'debugging', 'testing', 'problem_solving'],
            'is_active' => true,
        ]);

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'task_type' => 'feature',
            'priority' => 'high',
        ]);

        $bestAgent = $this->agentService->assignAgentToTask($task);

        // Agent2 should score higher due to more matching capabilities
        $this->assertNotNull($bestAgent);
        $this->assertEquals($agent2->id, $bestAgent->id);
    }

    /** @test */
    public function it_prefers_less_busy_agents()
    {
        $busyAgent = Agent::factory()->create([
            'type' => 'coder',
            'capabilities' => ['coding'],
            'is_active' => true,
        ]);

        $freeAgent = Agent::factory()->create([
            'type' => 'coder',
            'capabilities' => ['coding'],
            'is_active' => true,
        ]);

        // Assign 3 tasks to busyAgent
        Task::factory()->count(3)->create([
            'project_id' => $this->project->id,
            'assigned_agent' => 'coder',
            'status' => 'in_progress',
        ]);

        $newTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'task_type' => 'feature',
        ]);

        $assignedAgent = $this->agentService->assignAgentToTask($newTask);

        // Should prefer the less busy agent
        $this->assertNotNull($assignedAgent);
    }

    /** @test */
    public function it_respects_preferred_agent_if_capable()
    {
        $preferredAgent = Agent::factory()->create([
            'type' => 'coder',
            'capabilities' => ['coding', 'debugging', 'problem_solving'],
            'is_active' => true,
        ]);

        $otherAgent = Agent::factory()->create([
            'type' => 'coder',
            'capabilities' => ['coding'],
            'is_active' => true,
        ]);

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'task_type' => 'feature',
        ]);

        $assignedAgent = $this->agentService->assignAgentToTask($task, $preferredAgent->id);

        $this->assertEquals($preferredAgent->id, $assignedAgent->id);
    }

    /** @test */
    public function it_checks_capability_matching()
    {
        $agent = Agent::factory()->create([
            'capabilities' => ['coding', 'debugging', 'testing'],
        ]);

        $requiredCapabilities = ['coding', 'debugging'];
        
        $canHandle = $this->capabilityMatcher->canHandleTask($agent, $requiredCapabilities);

        $this->assertTrue($canHandle);
    }

    /** @test */
    public function it_requires_minimum_capability_overlap()
    {
        $agent = Agent::factory()->create([
            'capabilities' => ['coding'],
        ]);

        $requiredCapabilities = ['debugging', 'testing', 'architecture'];
        
        $canHandle = $this->capabilityMatcher->canHandleTask($agent, $requiredCapabilities);

        $this->assertFalse($canHandle); // Only 0/3 capabilities match
    }

    /** @test */
    public function it_scores_agents_correctly()
    {
        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'task_type' => 'feature',
            'priority' => 'high',
        ]);

        $goodAgent = Agent::factory()->create([
            'type' => 'coder',
            'capabilities' => ['coding', 'problem_solving', 'api_design'],
            'is_active' => true,
        ]);

        $poorAgent = Agent::factory()->create([
            'type' => 'architect',
            'capabilities' => ['architecture'],
            'is_active' => true,
        ]);

        $goodScore = $this->capabilityMatcher->scoreAgent($goodAgent, $task);
        $poorScore = $this->capabilityMatcher->scoreAgent($poorAgent, $task);

        $this->assertGreaterThan($poorScore, $goodScore);
    }

    /** @test */
    public function it_gets_candidate_agents_with_scores()
    {
        Agent::factory()->count(3)->create([
            'type' => 'coder',
            'capabilities' => ['coding', 'debugging'],
            'is_active' => true,
        ]);

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'task_type' => 'bug',
        ]);

        $candidates = $this->agentService->getCandidateAgents($task);

        $this->assertCount(3, $candidates);
        $this->assertArrayHasKey('agent', $candidates->first());
        $this->assertArrayHasKey('score', $candidates->first());
        $this->assertArrayHasKey('workload', $candidates->first());
    }

    /** @test */
    public function it_calculates_workload_distribution()
    {
        Agent::factory()->create([
            'type' => 'coder',
            'is_active' => true,
        ]);

        Agent::factory()->create([
            'type' => 'tester',
            'is_active' => true,
        ]);

        Task::factory()->count(2)->create([
            'project_id' => $this->project->id,
            'assigned_agent' => 'coder',
            'status' => 'in_progress',
        ]);

        $distribution = $this->agentService->getWorkloadDistribution();

        $this->assertArrayHasKey('total_agents', $distribution);
        $this->assertArrayHasKey('distribution', $distribution);
        $this->assertArrayHasKey('total_active_tasks', $distribution);
        $this->assertGreaterThan(0, $distribution['total_active_tasks']);
    }

    /** @test */
    public function it_identifies_least_busy_agents()
    {
        $agent1 = Agent::factory()->create(['type' => 'coder', 'is_active' => true]);
        $agent2 = Agent::factory()->create(['type' => 'coder', 'is_active' => true]);

        // Assign tasks to agent1 (making it busy)
        Task::factory()->count(5)->create([
            'project_id' => $this->project->id,
            'assigned_agent' => 'coder',
            'status' => 'in_progress',
        ]);

        $leastBusy = $this->agentService->getLeastBusyAgents('feature', 1);

        $this->assertCount(1, $leastBusy);
    }

    /** @test */
    public function it_gets_agent_statistics()
    {
        $agent = Agent::factory()->create([
            'type' => 'coder',
            'is_active' => true,
        ]);

        Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_agent' => 'coder',
            'status' => 'completed',
            'started_at' => now()->subHours(2),
            'completed_at' => now(),
        ]);

        Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_agent' => 'coder',
            'status' => 'in_progress',
        ]);

        $stats = $this->agentService->getAgentStatistics($agent->id);

        $this->assertArrayHasKey('total_tasks', $stats);
        $this->assertArrayHasKey('active_tasks', $stats);
        $this->assertArrayHasKey('completed_tasks', $stats);
        $this->assertArrayHasKey('success_rate', $stats);
        $this->assertEquals(2, $stats['total_tasks']);
        $this->assertEquals(1, $stats['active_tasks']);
        $this->assertEquals(1, $stats['completed_tasks']);
    }

    /** @test */
    public function it_filters_inactive_agents()
    {
        Agent::factory()->create(['type' => 'coder', 'is_active' => true]);
        Agent::factory()->create(['type' => 'coder', 'is_active' => false]);

        $activeAgents = $this->agentService->getActiveAgents();

        $this->assertCount(1, $activeAgents);
        $this->assertTrue($activeAgents->every(fn($a) => $a->is_active));
    }

    /** @test */
    public function it_handles_tasks_with_no_suitable_agents()
    {
        // No agents in database
        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'task_type' => 'feature',
        ]);

        $agent = $this->agentService->assignAgentToTask($task);

        $this->assertNull($agent);
    }

    /** @test */
    public function it_matches_specialized_agents_to_task_types()
    {
        $architectAgent = Agent::factory()->create([
            'type' => 'architect',
            'capabilities' => ['system_design', 'architecture'],
            'is_active' => true,
        ]);

        $coderAgent = Agent::factory()->create([
            'type' => 'coder',
            'capabilities' => ['coding'],
            'is_active' => true,
        ]);

        $architectureTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'task_type' => 'architecture',
        ]);

        $assignedAgent = $this->agentService->assignAgentToTask($architectureTask);

        // Should prefer architect for architecture tasks
        $this->assertEquals('architect', $assignedAgent->type);
    }
}
