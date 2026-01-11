<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\MetricsEvent;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\MetricsService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class MetricsServiceTest extends TestCase
{
    use DatabaseTransactions;

    protected MetricsService $metricsService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->metricsService = $this->app->make(MetricsService::class);
    }

    /**
     * Test recording a task completion event.
     */
    public function test_record_task_completion(): void
    {
        $task = Task::factory()->create();
        $user = User::factory()->create();
        $this->actingAs($user);

        $event = $this->metricsService->recordTaskCompletion(
            $task->id,
            150.5,
            $user->id,
            $task->project_id
        );

        $this->assertNotNull($event->id);
        $this->assertEquals('task_completed', $event->event_type);
        $this->assertEquals('task_duration_seconds', $event->metric_name);
        $this->assertEquals(150.5, $event->value);
        $this->assertEquals($task->id, $event->task_id);

        $this->assertDatabaseHas('metrics_events', [
            'event_type' => 'task_completed',
            'task_id' => $task->id,
            'value' => 150.5,
        ]);
    }

    /**
     * Test recording task start event.
     */
    public function test_record_task_start(): void
    {
        $task = Task::factory()->create();
        $agent = Agent::factory()->create();

        $event = $this->metricsService->recordTaskStart(
            $task->id,
            $agent->id
        );

        $this->assertEquals('task_started', $event->event_type);
        $this->assertEquals('task_start', $event->metric_name);
        $this->assertEquals($agent->id, $event->agent_id);
    }

    /**
     * Test recording error events.
     */
    public function test_record_error_event(): void
    {
        $task = Task::factory()->create();

        $event = $this->metricsService->recordErrorEvent(
            'Database connection failed',
            $task->id,
            null,
            null,
            null,
            ['error_code' => 'DB_CONN_001']
        );

        $this->assertEquals('error_occurred', $event->event_type);
        $this->assertEquals('error_count', $event->metric_name);
        $this->assertEquals(1, $event->value);
        $this->assertJsonStringEqualsJsonString(
            json_encode(['error_code' => 'DB_CONN_001']),
            $event->metadata
        );
    }

    /**
     * Test recording execution time.
     */
    public function test_record_execution_time(): void
    {
        $task = Task::factory()->create();
        $agent = Agent::factory()->create();

        $event = $this->metricsService->recordExecutionTime(
            $task->id,
            245.75,
            $agent->id
        );

        $this->assertEquals('execution_time', $event->event_type);
        $this->assertEquals('execution_time_ms', $event->metric_name);
        $this->assertEquals(245.75, $event->value);
    }

    /**
     * Test recording API calls.
     */
    public function test_record_api_call(): void
    {
        $event = $this->metricsService->recordApiCall(
            '/api/v1/tasks',
            125.5,
            200
        );

        $this->assertEquals('api_call', $event->event_type);
        $this->assertEquals('/api/v1/tasks', $event->context_value);
        $this->assertEquals(200, $event->metadata['status_code']);
    }

    /**
     * Test recording test execution.
     */
    public function test_record_test_execution(): void
    {
        $project = Project::factory()->create();

        $event = $this->metricsService->recordTestExecution(
            total: 100,
            passed: 95,
            failed: 5,
            projectId: $project->id
        );

        $this->assertEquals('test_run', $event->event_type);
        $this->assertEquals(95.0, $event->value); // 95% coverage
        $this->assertEquals(100, $event->metadata['total_tests']);
        $this->assertEquals(95, $event->metadata['passed_tests']);
        $this->assertEquals(5, $event->metadata['failed_tests']);
    }

    /**
     * Test recording agent execution.
     */
    public function test_record_agent_execution(): void
    {
        $agent = Agent::factory()->create();
        $task = Task::factory()->create();

        $event = $this->metricsService->recordAgentExecution(
            $agent->id,
            $task->id,
            'success',
            125.5
        );

        $this->assertEquals('agent_execution', $event->event_type);
        $this->assertEquals('success', $event->metadata['status']);
        $this->assertEquals(125.5, $event->metadata['duration_seconds']);
    }

    /**
     * Test getting metrics history.
     */
    public function test_get_metrics_history(): void
    {
        // Create multiple events
        for ($i = 0; $i < 5; $i++) {
            MetricsEvent::create([
                'event_type' => 'test_run',
                'metric_name' => 'test_coverage_percent',
                'value' => 80 + $i,
                'recorded_at' => now()->subDays(30 - $i),
            ]);
        }

        $history = $this->metricsService->getMetricsHistory('test_coverage_percent', 30);

        $this->assertEquals('test_coverage_percent', $history['metric_name']);
        $this->assertEquals(5, $history['event_count']);
        $this->assertEquals(82.0, $history['average_value']);
        $this->assertEquals(84.0, $history['max_value']);
        $this->assertEquals(80.0, $history['min_value']);
    }

    /**
     * Test KPI dashboard generation.
     */
    public function test_get_kpi_dashboard(): void
    {
        // Create some test data
        $task = Task::factory()->create();
        $project = Project::factory()->create();

        $this->metricsService->recordTaskCompletion(1, 100.0, null, $project->id);
        $this->metricsService->recordErrorEvent('Test error', 1);
        $this->metricsService->recordTestExecution(100, 90, 10, $project->id);

        $dashboard = $this->metricsService->getKpiDashboard();

        $this->assertArrayHasKey('generated_at', $dashboard);
        $this->assertArrayHasKey('period_days', $dashboard);
        $this->assertArrayHasKey('quality_metrics', $dashboard);
        $this->assertArrayHasKey('functionality_metrics', $dashboard);
        $this->assertArrayHasKey('adoption_metrics', $dashboard);
        $this->assertArrayHasKey('performance_metrics', $dashboard);
        $this->assertArrayHasKey('business_metrics', $dashboard);

        // Verify all 15+ KPI fields are present
        $kpis = [
            ...$dashboard['quality_metrics'],
            ...$dashboard['functionality_metrics'],
            ...$dashboard['adoption_metrics'],
            ...$dashboard['performance_metrics'],
            ...$dashboard['business_metrics'],
        ];

        $this->assertGreaterThanOrEqual(15, count($kpis));
    }

    /**
     * Test cleanup of old metrics.
     */
    public function test_cleanup_old_metrics(): void
    {
        // Create recent and old events
        MetricsEvent::create([
            'event_type' => 'task_completed',
            'metric_name' => 'task_duration_seconds',
            'value' => 100,
            'recorded_at' => now()->subDays(30),
        ]);

        MetricsEvent::create([
            'event_type' => 'task_completed',
            'metric_name' => 'task_duration_seconds',
            'value' => 100,
            'recorded_at' => now()->subDays(120),
        ]);

        $deleted = $this->metricsService->cleanupOldMetrics(retentionDays: 90);

        $this->assertEquals(1, $deleted);
        $this->assertEquals(1, MetricsEvent::count());
    }

    /**
     * Test task metrics aggregation.
     */
    public function test_task_metrics(): void
    {
        Task::factory()->count(10)->create(['status' => 'completed']);
        Task::factory()->count(5)->create(['status' => 'in_progress']);
        Task::factory()->count(3)->create(['status' => 'pending']);

        $metrics = $this->metricsService->getTaskMetrics();

        $this->assertEquals(18, $metrics['counts']['total']);
        $this->assertEquals(10, $metrics['counts']['completed']);
        $this->assertEquals(5, $metrics['counts']['in_progress']);
        $this->assertEquals(3, $metrics['counts']['pending']);
        $this->assertGreaterThan(0, $metrics['completionRate']);
    }

    /**
     * Test agent metrics.
     */
    public function test_agent_metrics(): void
    {
        Agent::factory()->count(3)->create(['is_active' => true]);
        Agent::factory()->count(2)->create(['is_active' => false]);

        $metrics = $this->metricsService->getAgentMetrics();

        $this->assertEquals(5, $metrics['counts']['total_agents']);
        $this->assertEquals(3, $metrics['counts']['active_agents']);
    }

    /**
     * Test error metrics.
     */
    public function test_error_metrics(): void
    {
        MetricsEvent::create([
            'event_type' => 'error_occurred',
            'metric_name' => 'error_count',
            'value' => 1,
        ]);

        $metrics = $this->metricsService->getErrorMetrics();

        $this->assertGreaterThanOrEqual(0, $metrics['failures']['failure_rate']);
    }

    /**
     * Test metric events are queryable by scope.
     */
    public function test_metric_event_scopes(): void
    {
        MetricsEvent::create([
            'event_type' => 'task_completed',
            'metric_name' => 'task_duration_seconds',
            'value' => 100,
            'recorded_at' => now(),
        ]);

        MetricsEvent::create([
            'event_type' => 'error_occurred',
            'metric_name' => 'error_count',
            'value' => 1,
            'recorded_at' => now(),
        ]);

        $this->assertEquals(1, MetricsEvent::byEventType('task_completed')->count());
        $this->assertEquals(1, MetricsEvent::byEventType('error_occurred')->count());
        $this->assertEquals(1, MetricsEvent::byMetricName('task_duration_seconds')->count());
        $this->assertEquals(2, MetricsEvent::lastNDays(30)->count());
    }
}
