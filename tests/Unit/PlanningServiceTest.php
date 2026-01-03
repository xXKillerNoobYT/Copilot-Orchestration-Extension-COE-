<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\PlanningService;
use App\Services\RequirementParserService;
use App\Services\ArchitectureDesignService;
use App\Services\DependencyGraphService;
use App\Services\TaskOrchestrationService;
use App\Services\LoggingService;
use App\Services\AuditTrailService;
use App\Services\MetricsCollectionService;
use App\Repositories\TaskPlanRepository;
use App\Models\TaskPlan;
use App\Models\Project;
use App\Models\User;
use App\Exceptions\PlanningException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;

class PlanningServiceTest extends TestCase
{
    use RefreshDatabase;

    private PlanningService $planningService;
    private $taskPlanRepo;
    private $requirementParser;
    private $architectureDesigner;
    private $dependencyGraph;
    private $taskOrchestration;
    private $logging;
    private $auditTrail;
    private $metrics;

    protected function setUp(): void
    {
        parent::setUp();

        $this->taskPlanRepo = Mockery::mock(TaskPlanRepository::class);
        $this->requirementParser = Mockery::mock(RequirementParserService::class);
        $this->architectureDesigner = Mockery::mock(ArchitectureDesignService::class);
        $this->dependencyGraph = Mockery::mock(DependencyGraphService::class);
        $this->taskOrchestration = Mockery::mock(TaskOrchestrationService::class);
        $this->logging = Mockery::mock(LoggingService::class);
        $this->auditTrail = Mockery::mock(AuditTrailService::class);
        $this->metrics = Mockery::mock(MetricsCollectionService::class);

        $this->planningService = new PlanningService(
            $this->taskPlanRepo,
            $this->requirementParser,
            $this->architectureDesigner,
            $this->dependencyGraph,
            $this->taskOrchestration,
            $this->logging,
            $this->auditTrail,
            $this->metrics
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_generates_task_plan_from_requirement()
    {
        $project = Project::factory()->create();
        $requirement = 'Build a User management system with CRUD operations, authentication, and role-based access control.';

        $parsedRequirement = [
            'entities' => ['User', 'Role', 'Permission'],
            'intents' => ['crud', 'authentication', 'authorization'],
            'constraints' => ['security'],
            'complexity' => 'moderate',
            'estimated_scope' => ['days' => 15, 'features' => 5],
        ];

        $this->requirementParser
            ->shouldReceive('parseRequirement')
            ->once()
            ->with($requirement)
            ->andReturn($parsedRequirement);

        $this->taskPlanRepo
            ->shouldReceive('create')
            ->once()
            ->andReturn(new TaskPlan([
                'id' => 'plan-123',
                'project_id' => $project->id,
                'requirement' => $requirement,
                'parsed_requirement' => $parsedRequirement,
                'status' => 'draft',
                'complexity' => 'moderate',
            ]));

        $this->logging->shouldReceive('info')->atLeast()->once();
        $this->auditTrail->shouldReceive('log')->atLeast()->once();
        $this->metrics->shouldReceive('increment')->atLeast()->once();

        $plan = $this->planningService->generateTaskPlan($project->id, $requirement);

        $this->assertInstanceOf(TaskPlan::class, $plan);
        $this->assertEquals('moderate', $plan->complexity);
    }

    /** @test */
    public function it_refines_task_plan_by_adding_task()
    {
        $plan = TaskPlan::factory()->create([
            'generated_tasks' => [
                ['id' => 'task-1', 'title' => 'Create User model'],
            ],
        ]);

        $refinements = [
            [
                'action' => 'add_task',
                'task_data' => [
                    'title' => 'Create User migration',
                    'type' => 'feature',
                    'priority' => 'high',
                ],
            ],
        ];

        $this->taskPlanRepo
            ->shouldReceive('find')
            ->once()
            ->with($plan->id)
            ->andReturn($plan);

        $this->taskPlanRepo
            ->shouldReceive('update')
            ->once()
            ->andReturn($plan);

        $this->logging->shouldReceive('info')->atLeast()->once();
        $this->auditTrail->shouldReceive('log')->atLeast()->once();

        $refined = $this->planningService->refineTaskPlan($plan->id, $refinements);

        $this->assertInstanceOf(TaskPlan::class, $refined);
    }

    /** @test */
    public function it_validates_task_plan_structure()
    {
        $plan = TaskPlan::factory()->create([
            'generated_tasks' => [
                ['id' => 'task-1', 'title' => 'Create User model', 'type' => 'feature'],
                ['id' => 'task-2', 'title' => 'Create User repository', 'type' => 'feature'],
            ],
            'dependencies' => [
                ['from' => 'task-1', 'to' => 'task-2'],
            ],
        ]);

        $this->taskPlanRepo
            ->shouldReceive('find')
            ->once()
            ->with($plan->id)
            ->andReturn($plan);

        $this->dependencyGraph
            ->shouldReceive('detectCycles')
            ->once()
            ->andReturn([]);

        $this->logging->shouldReceive('info')->atLeast()->once();

        $validation = $this->planningService->validateTaskPlan($plan->id);

        $this->assertTrue($validation['valid']);
        $this->assertEmpty($validation['errors']);
    }

    /** @test */
    public function it_detects_circular_dependencies()
    {
        $plan = TaskPlan::factory()->create([
            'generated_tasks' => [
                ['id' => 'task-1', 'title' => 'Task 1'],
                ['id' => 'task-2', 'title' => 'Task 2'],
            ],
            'dependencies' => [
                ['from' => 'task-1', 'to' => 'task-2'],
                ['from' => 'task-2', 'to' => 'task-1'],
            ],
        ]);

        $this->taskPlanRepo
            ->shouldReceive('find')
            ->once()
            ->andReturn($plan);

        $this->dependencyGraph
            ->shouldReceive('detectCycles')
            ->once()
            ->andReturn([['task-1', 'task-2', 'task-1']]);

        $this->logging->shouldReceive('warning')->atLeast()->once();

        $validation = $this->planningService->validateTaskPlan($plan->id);

        $this->assertFalse($validation['valid']);
        $this->assertNotEmpty($validation['errors']);
    }

    /** @test */
    public function it_approves_plan_and_creates_tasks()
    {
        $user = User::factory()->create();
        $plan = TaskPlan::factory()->create([
            'status' => 'pending_approval',
            'generated_tasks' => [
                [
                    'id' => 'task-1',
                    'title' => 'Create User model',
                    'type' => 'feature',
                    'priority' => 'high',
                ],
            ],
        ]);

        $this->taskPlanRepo
            ->shouldReceive('find')
            ->once()
            ->andReturn($plan);

        $this->taskPlanRepo
            ->shouldReceive('update')
            ->once()
            ->andReturn($plan);

        $this->taskOrchestration
            ->shouldReceive('createTask')
            ->once();

        $this->logging->shouldReceive('info')->atLeast()->once();
        $this->auditTrail->shouldReceive('log')->atLeast()->once();
        $this->metrics->shouldReceive('increment')->atLeast()->once();

        $approved = $this->planningService->approveTaskPlan($plan->id, $user->id);

        $this->assertEquals('approved', $approved->status);
    }

    /** @test */
    public function it_rejects_plan_with_reason()
    {
        $user = User::factory()->create();
        $plan = TaskPlan::factory()->create([
            'status' => 'pending_approval',
        ]);

        $this->taskPlanRepo
            ->shouldReceive('find')
            ->once()
            ->andReturn($plan);

        $this->taskPlanRepo
            ->shouldReceive('update')
            ->once()
            ->andReturn($plan);

        $this->logging->shouldReceive('info')->atLeast()->once();
        $this->auditTrail->shouldReceive('log')->atLeast()->once();

        $rejected = $this->planningService->rejectTaskPlan(
            $plan->id,
            'Tasks are too granular',
            $user->id
        );

        $this->assertEquals('rejected', $rejected->status);
    }

    /** @test */
    public function it_calculates_plan_statistics()
    {
        $plan = TaskPlan::factory()->create([
            'generated_tasks' => [
                ['id' => 'task-1', 'type' => 'feature', 'priority' => 'high'],
                ['id' => 'task-2', 'type' => 'bug', 'priority' => 'medium'],
                ['id' => 'task-3', 'type' => 'feature', 'priority' => 'low'],
            ],
            'dependencies' => [
                ['from' => 'task-1', 'to' => 'task-2'],
            ],
        ]);

        $this->taskPlanRepo
            ->shouldReceive('find')
            ->once()
            ->andReturn($plan);

        $stats = $this->planningService->getPlanStatistics($plan->id);

        $this->assertEquals(3, $stats['total_tasks']);
        $this->assertEquals(2, $stats['by_type']['feature']);
        $this->assertEquals(1, $stats['by_type']['bug']);
        $this->assertEquals(1, $stats['total_dependencies']);
    }

    /** @test */
    public function it_throws_exception_for_invalid_plan()
    {
        $this->taskPlanRepo
            ->shouldReceive('find')
            ->once()
            ->with('invalid-id')
            ->andReturn(null);

        $this->expectException(PlanningException::class);
        $this->expectExceptionMessage('Plan not found');

        $this->planningService->validateTaskPlan('invalid-id');
    }
}
