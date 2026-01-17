<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Agent;
use App\Models\Task;
use App\Models\Project;
use App\Models\TaskExecution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrchestratorDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_dashboard_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/orchestrator');

        $response->assertOk();
    }

    public function test_orchestrator_dashboard_requires_authentication(): void
    {
        $response = $this->get('/orchestrator');

        $response->assertRedirect('/login');
    }

    public function test_agents_api_returns_correct_structure(): void
    {
        $user = User::factory()->create();
        
        // Create test agents
        Agent::factory()->count(3)->create(['is_active' => true]);

        $response = $this
            ->actingAs($user)
            ->getJson('/api/v1/agents');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'type',
                        'is_active',
                    ]
                ],
                'meta' => [
                    'total'
                ]
            ]);
    }

    public function test_tasks_api_returns_correct_structure(): void
    {
        $user = User::factory()->create();
        
        // Create test project and tasks
        $project = Project::factory()->create();
        Task::factory()->count(5)->create(['project_id' => $project->id]);

        $response = $this
            ->actingAs($user)
            ->getJson("/api/v1/projects/{$project->id}/tasks");

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'status',
                        'priority',
                        'task_type',
                    ]
                ],
                'meta' => [
                    'total',
                    'filters'
                ]
            ]);
    }

    public function test_metrics_health_api_returns_correct_structure(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->getJson('/api/v1/metrics/health');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'status',
                'timestamp',
                'tasks',
                'agents',
                'errors'
            ]);
    }

    public function test_executions_api_returns_correct_structure(): void
    {
        $user = User::factory()->create();
        
        // Create test executions
        $agent = Agent::factory()->create();
        $project = Project::factory()->create();
        $task = Task::factory()->create(['project_id' => $project->id]);
        TaskExecution::factory()->count(3)->create([
            'task_id' => $task->id,
            'agent_id' => $agent->id
        ]);

        $response = $this
            ->actingAs($user)
            ->getJson('/api/v1/monitoring/executions?limit=50');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'task_id',
                        'agent_id',
                        'status',
                        'started_at'
                    ]
                ],
                'count'
            ]);
    }

    public function test_task_status_can_be_updated(): void
    {
        $user = User::factory()->create();
        
        $project = Project::factory()->create();
        $task = Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'pending'
        ]);

        $response = $this
            ->actingAs($user)
            ->patchJson("/api/v1/tasks/{$task->id}/status", [
                'status' => 'in_progress'
            ]);

        $response->assertOk();

        $task->refresh();
        $this->assertEquals('in_progress', $task->status);
    }

    public function test_task_queue_statistics_are_accurate(): void
    {
        $user = User::factory()->create();
        
        $project = Project::factory()->create();
        
        // Create tasks with different statuses
        Task::factory()->count(5)->create(['project_id' => $project->id, 'status' => 'pending']);
        Task::factory()->count(3)->create(['project_id' => $project->id, 'status' => 'in_progress']);
        Task::factory()->count(2)->create(['project_id' => $project->id, 'status' => 'blocked']);
        Task::factory()->count(10)->create(['project_id' => $project->id, 'status' => 'completed']);

        $response = $this
            ->actingAs($user)
            ->getJson("/api/v1/projects/{$project->id}/tasks");

        $response->assertOk();
        
        $data = $response->json('data');
        $this->assertCount(20, $data);
        
        $statusCounts = collect($data)->countBy('status');
        $this->assertEquals(5, $statusCounts['pending'] ?? 0);
        $this->assertEquals(3, $statusCounts['in_progress'] ?? 0);
        $this->assertEquals(2, $statusCounts['blocked'] ?? 0);
        $this->assertEquals(10, $statusCounts['completed'] ?? 0);
    }
}
