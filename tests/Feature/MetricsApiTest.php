<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Task;
use App\Models\TaskExecution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class MetricsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_tasks_metrics_endpoint_returns_counts(): void
    {
        Task::factory()->create(['status' => 'pending']);
        Task::factory()->create(['status' => 'in_progress']);
        Task::factory()->create([
            'status' => 'completed',
            'started_at' => Carbon::now()->subHours(2),
            'completed_at' => Carbon::now()->subHour(),
        ]);

        $response = $this->getJson('/api/v1/metrics/tasks');

        $response->assertOk();
        $response->assertJsonFragment([
            'total' => 3,
            'completed' => 1,
            'in_progress' => 1,
            'pending' => 1,
        ]);
        $response->assertJsonStructure([
            'counts' => ['total', 'completed', 'in_progress', 'pending', 'blocked', 'failed'],
            'completionRate',
            'averageCycleSeconds',
            'averageCycleDisplay',
            'lastUpdated',
        ]);
    }

    public function test_agent_metrics_endpoint_returns_utilization(): void
    {
        $agentA = Agent::factory()->create(['is_active' => true, 'name' => 'Alpha']);
        $agentB = Agent::factory()->create(['is_active' => false, 'name' => 'Beta']);

        TaskExecution::create([
            'task_id' => Task::factory()->create()->id,
            'agent_id' => $agentA->id,
            'execution_number' => 1,
            'status' => 'completed',
            'started_at' => Carbon::now()->subMinutes(30),
            'completed_at' => Carbon::now()->subMinutes(10),
            'created_at' => Carbon::now()->subMinutes(30),
        ]);

        $response = $this->getJson('/api/v1/metrics/agents');

        $response->assertOk();
        $response->assertJsonFragment([
            'total_agents' => 2,
            'active_agents' => 1,
            'total_executions' => 1,
        ]);
        $response->assertJsonStructure([
            'counts' => ['total_agents', 'active_agents', 'total_executions'],
            'avgExecutionsPerAgent',
            'currentRunningExecutions',
            'utilization',
            'busiestAgent',
            'lastUpdated',
        ]);
    }

    public function test_error_metrics_endpoint_returns_recent_failures(): void
    {
        $agent = Agent::factory()->create(['is_active' => true]);
        $task = Task::factory()->create();

        TaskExecution::create([
            'task_id' => $task->id,
            'agent_id' => $agent->id,
            'execution_number' => 1,
            'status' => 'failed',
            'error_message' => 'LLM timeout',
            'completed_at' => Carbon::now()->subMinutes(5),
            'created_at' => Carbon::now()->subMinutes(10),
        ]);

        $response = $this->getJson('/api/v1/metrics/errors');

        $response->assertOk();
        $response->assertJsonStructure([
            'failures' => ['total_executions', 'failed_executions', 'failure_rate'],
            'recent_errors',
            'lastUpdated',
        ]);
        $this->assertStringContainsString('LLM timeout', $response->getContent());
    }
}
