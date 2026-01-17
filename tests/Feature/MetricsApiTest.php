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
        Task::factory()->create(['status' => 'pending', 'created_at' => Carbon::now()->subDays(5)]);
        Task::factory()->create(['status' => 'in_progress', 'created_at' => Carbon::now()->subDays(3)]);
        Task::factory()->create([
            'status' => 'completed',
            'created_at' => Carbon::now()->subDays(2),
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
            'timeRange',
            'startDate',
            'lastUpdated',
        ]);
    }
    
    public function test_tasks_metrics_endpoint_supports_time_range_filter(): void
    {
        // Create tasks outside the range
        Task::factory()->create(['status' => 'completed', 'created_at' => Carbon::now()->subDays(10)]);
        Task::factory()->create(['status' => 'completed', 'created_at' => Carbon::now()->subDays(8)]);
        
        // Create tasks within the range (last 7 days)
        Task::factory()->create(['status' => 'completed', 'created_at' => Carbon::now()->subDays(5)]);
        Task::factory()->create(['status' => 'pending', 'created_at' => Carbon::now()->subDays(2)]);

        $response = $this->getJson('/api/v1/metrics/tasks?range=7d');

        $response->assertOk();
        $response->assertJsonPath('counts.total', 2);
        $response->assertJsonPath('counts.completed', 1);
        $response->assertJsonPath('timeRange', '7d');
    }

    public function test_tasks_metrics_endpoint_supports_hours_format(): void
    {
        Task::factory()->create(['status' => 'completed', 'created_at' => Carbon::now()->subHours(10)]);
        Task::factory()->create(['status' => 'pending', 'created_at' => Carbon::now()->subHours(2)]);

        $response = $this->getJson('/api/v1/metrics/tasks?range=24h');

        $response->assertOk();
        $response->assertJsonPath('counts.total', 2);
        $response->assertJsonPath('timeRange', '24h');
    }

    public function test_tasks_metrics_endpoint_supports_weeks_format(): void
    {
        Task::factory()->create(['status' => 'completed', 'created_at' => Carbon::now()->subWeeks(3)]);
        Task::factory()->create(['status' => 'pending', 'created_at' => Carbon::now()->subWeeks(1)]);

        $response = $this->getJson('/api/v1/metrics/tasks?range=2w');

        $response->assertOk();
        $response->assertJsonPath('counts.total', 1);
        $response->assertJsonPath('timeRange', '2w');
    }

    public function test_tasks_metrics_endpoint_supports_months_format(): void
    {
        Task::factory()->create(['status' => 'completed', 'created_at' => Carbon::now()->subMonths(2)]);
        Task::factory()->create(['status' => 'pending', 'created_at' => Carbon::now()->subDays(15)]);

        $response = $this->getJson('/api/v1/metrics/tasks?range=1m');

        $response->assertOk();
        $response->assertJsonPath('counts.total', 1);
        $response->assertJsonPath('timeRange', '1m');
    }

    public function test_tasks_metrics_endpoint_rejects_invalid_time_range_format(): void
    {
        $response = $this->getJson('/api/v1/metrics/tasks?range=abc');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['range']);
    }

    public function test_tasks_metrics_endpoint_rejects_malformed_time_range(): void
    {
        $response = $this->getJson('/api/v1/metrics/tasks?range=7x');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['range']);
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
    
    public function test_error_metrics_endpoint_supports_severity_filter(): void
    {
        $agent = Agent::factory()->create(['is_active' => true]);
        $task1 = Task::factory()->create();
        $task2 = Task::factory()->create();
        $task3 = Task::factory()->create();

        // Create errors with different severity levels
        TaskExecution::create([
            'task_id' => $task1->id,
            'agent_id' => $agent->id,
            'execution_number' => 1,
            'status' => 'failed',
            'error_message' => 'Critical: Database connection failed',
            'completed_at' => Carbon::now()->subMinutes(5),
            'created_at' => Carbon::now()->subMinutes(10),
        ]);
        
        TaskExecution::create([
            'task_id' => $task2->id,
            'agent_id' => $agent->id,
            'execution_number' => 1,
            'status' => 'failed',
            'error_message' => 'High: API rate limit exceeded',
            'completed_at' => Carbon::now()->subMinutes(3),
            'created_at' => Carbon::now()->subMinutes(8),
        ]);
        
        TaskExecution::create([
            'task_id' => $task3->id,
            'agent_id' => $agent->id,
            'execution_number' => 1,
            'status' => 'failed',
            'error_message' => 'Low: Minor validation warning',
            'completed_at' => Carbon::now()->subMinutes(1),
            'created_at' => Carbon::now()->subMinutes(6),
        ]);

        $response = $this->getJson('/api/v1/metrics/errors?severity=high');

        $response->assertOk();
        $response->assertJsonPath('filtered_by_severity', 'high');
        $this->assertStringContainsString('High:', $response->getContent());
        $this->assertStringNotContainsString('Low:', $response->getContent());
    }

    public function test_error_metrics_endpoint_rejects_invalid_severity(): void
    {
        $response = $this->getJson('/api/v1/metrics/errors?severity=invalid');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['severity']);
    }

    public function test_error_metrics_endpoint_returns_all_errors_for_invalid_severity(): void
    {
        $agent = Agent::factory()->create(['is_active' => true]);
        
        TaskExecution::create([
            'task_id' => Task::factory()->create()->id,
            'agent_id' => $agent->id,
            'execution_number' => 1,
            'status' => 'failed',
            'error_message' => 'Critical: Error 1',
            'completed_at' => Carbon::now()->subMinutes(5),
            'created_at' => Carbon::now()->subMinutes(10),
        ]);
        
        TaskExecution::create([
            'task_id' => Task::factory()->create()->id,
            'agent_id' => $agent->id,
            'execution_number' => 1,
            'status' => 'failed',
            'error_message' => 'Low: Error 2',
            'completed_at' => Carbon::now()->subMinutes(3),
            'created_at' => Carbon::now()->subMinutes(8),
        ]);

        // When severity is invalid, validation should reject the request
        $response = $this->getJson('/api/v1/metrics/errors?severity=123');

        $response->assertStatus(422);
    }

    public function test_error_metrics_endpoint_respects_limit_parameter(): void
    {
        $agent = Agent::factory()->create(['is_active' => true]);
        
        // Create 10 failed executions
        for ($i = 0; $i < 10; $i++) {
            TaskExecution::create([
                'task_id' => Task::factory()->create()->id,
                'agent_id' => $agent->id,
                'execution_number' => 1,
                'status' => 'failed',
                'error_message' => "Error {$i}",
                'completed_at' => Carbon::now()->subMinutes($i + 1),
                'created_at' => Carbon::now()->subMinutes($i + 5),
            ]);
        }

        $response = $this->getJson('/api/v1/metrics/errors?limit=5');

        $response->assertOk();
        $this->assertCount(5, $response->json('recent_errors'));
    }

    public function test_error_metrics_endpoint_rejects_negative_limit(): void
    {
        $response = $this->getJson('/api/v1/metrics/errors?limit=-1');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['limit']);
    }

    public function test_error_metrics_endpoint_rejects_excessive_limit(): void
    {
        $response = $this->getJson('/api/v1/metrics/errors?limit=2000');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['limit']);
    }

    public function test_error_metrics_endpoint_handles_zero_limit(): void
    {
        $response = $this->getJson('/api/v1/metrics/errors?limit=0');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['limit']);
    }
}
