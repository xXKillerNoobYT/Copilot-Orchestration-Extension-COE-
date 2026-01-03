<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\TaskOrchestrationService;
use App\Services\DependencyGraphService;
use App\Services\WorkflowStateService;
use App\Exceptions\TaskValidationException;
use App\Exceptions\CircularDependencyException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task Orchestration Service Test
 * 
 * Comprehensive tests for the task orchestration system.
 */
class TaskOrchestrationTest extends TestCase
{
    use RefreshDatabase;

    private TaskOrchestrationService $orchestrationService;
    private DependencyGraphService $dependencyService;
    private WorkflowStateService $workflowService;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->orchestrationService = app(TaskOrchestrationService::class);
        $this->dependencyService = app(DependencyGraphService::class);
        $this->workflowService = app(WorkflowStateService::class);
        
        // Create a test project
        $this->project = Project::factory()->create();
    }

    /** @test */
    public function it_creates_a_task_successfully()
    {
        $taskData = [
            'project_id' => $this->project->id,
            'name' => 'Test Feature Implementation',
            'description' => 'Implement test feature',
            'task_type' => 'feature',
            'priority' => 'high',
        ];

        $task = $this->orchestrationService->createTask($taskData);

        $this->assertNotNull($task);
        $this->assertEquals('Test Feature Implementation', $task->name);
        $this->assertEquals('feature', $task->task_type);
        $this->assertEquals('high', $task->priority);
        $this->assertEquals('pending', $task->status);
    }

    /** @test */
    public function it_validates_required_fields_on_task_creation()
    {
        $this->expectException(TaskValidationException::class);

        $taskData = [
            'name' => 'Test Task',
            // Missing project_id and task_type
        ];

        $this->orchestrationService->createTask($taskData);
    }

    /** @test */
    public function it_validates_task_type_enum()
    {
        $this->expectException(TaskValidationException::class);

        $taskData = [
            'project_id' => $this->project->id,
            'name' => 'Test Task',
            'task_type' => 'invalid_type', // Invalid task type
        ];

        $this->orchestrationService->createTask($taskData);
    }

    /** @test */
    public function it_creates_task_with_dependencies()
    {
        $task1 = $this->orchestrationService->createTask([
            'project_id' => $this->project->id,
            'name' => 'Task 1',
            'task_type' => 'feature',
        ]);

        $task2 = $this->orchestrationService->createTask([
            'project_id' => $this->project->id,
            'name' => 'Task 2',
            'task_type' => 'feature',
            'dependencies' => [$task1->id],
        ]);

        $task2 = $task2->fresh(['dependencies']);
        $this->assertCount(1, $task2->dependencies);
        $this->assertEquals($task1->id, $task2->dependencies->first()->id);
    }

    /** @test */
    public function it_detects_circular_dependencies()
    {
        $this->expectException(CircularDependencyException::class);

        $task1 = Task::factory()->create(['project_id' => $this->project->id]);
        $task2 = Task::factory()->create(['project_id' => $this->project->id]);

        // Create dependency: task2 depends on task1
        $this->dependencyService->createDependency($task2->id, $task1->id);

        // Try to create circular dependency: task1 depends on task2
        $this->dependencyService->createDependency($task1->id, $task2->id);
    }

    /** @test */
    public function it_prevents_self_dependency()
    {
        $this->expectException(CircularDependencyException::class);

        $task = Task::factory()->create(['project_id' => $this->project->id]);
        
        $this->dependencyService->createDependency($task->id, $task->id);
    }

    /** @test */
    public function it_updates_task_status_successfully()
    {
        $task = $this->orchestrationService->createTask([
            'project_id' => $this->project->id,
            'name' => 'Test Task',
            'task_type' => 'feature',
        ]);

        $updatedTask = $this->orchestrationService->updateTaskStatus($task->id, 'in_progress');

        $this->assertEquals('in_progress', $updatedTask->status);
        $this->assertNotNull($updatedTask->started_at);
    }

    /** @test */
    public function it_validates_status_transitions()
    {
        $this->expectException(TaskValidationException::class);

        $task = $this->orchestrationService->createTask([
            'project_id' => $this->project->id,
            'name' => 'Test Task',
            'task_type' => 'feature',
        ]);

        // Try invalid transition: pending -> completed (should go through in_progress)
        $this->orchestrationService->updateTaskStatus($task->id, 'completed');
    }

    /** @test */
    public function it_blocks_task_start_with_pending_dependencies()
    {
        $this->expectException(TaskValidationException::class);

        $task1 = Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'pending',
        ]);

        $task2 = Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'pending',
        ]);

        $this->dependencyService->createDependency($task2->id, $task1->id);

        // Try to start task2 while task1 is still pending
        $this->orchestrationService->updateTaskStatus($task2->id, 'in_progress');
    }

    /** @test */
    public function it_unblocks_dependent_tasks_when_completed()
    {
        $task1 = Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'in_progress',
        ]);

        $task2 = Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'blocked',
        ]);

        $this->dependencyService->createDependency($task2->id, $task1->id);

        // Complete task1
        $this->orchestrationService->updateTaskStatus($task1->id, 'completed');

        // Check if task2 was unblocked
        $task2 = $task2->fresh();
        $this->assertEquals('pending', $task2->status);
    }

    /** @test */
    public function it_assigns_agent_based_on_task_type()
    {
        $task = $this->orchestrationService->createTask([
            'project_id' => $this->project->id,
            'name' => 'Bug Fix',
            'task_type' => 'bug',
        ]);

        $taskWithAgent = $this->orchestrationService->assignAgent($task->id);

        $this->assertEquals('coder', $taskWithAgent->assigned_agent);
    }

    /** @test */
    public function it_gets_ready_tasks()
    {
        // Task with no dependencies
        Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'pending',
        ]);

        // Task with completed dependency
        $completedTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'completed',
        ]);

        $readyTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'pending',
        ]);
        $this->dependencyService->createDependency($readyTask->id, $completedTask->id);

        $readyTasks = $this->dependencyService->getExecutableTasks($this->project->id);

        $this->assertCount(2, $readyTasks);
    }

    /** @test */
    public function it_gets_blocked_tasks()
    {
        $pendingTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'pending',
        ]);

        $blockedTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => 'blocked',
        ]);
        $this->dependencyService->createDependency($blockedTask->id, $pendingTask->id);

        $blockedTasks = $this->dependencyService->getBlockedTasks($this->project->id);

        $this->assertCount(1, $blockedTasks);
        $this->assertEquals($blockedTask->id, $blockedTasks->first()->id);
    }

    /** @test */
    public function it_calculates_critical_path()
    {
        $task1 = Task::factory()->create([
            'project_id' => $this->project->id,
            'estimated_effort' => 120, // 2 hours
        ]);

        $task2 = Task::factory()->create([
            'project_id' => $this->project->id,
            'estimated_effort' => 180, // 3 hours
        ]);
        $this->dependencyService->createDependency($task2->id, $task1->id);

        $task3 = Task::factory()->create([
            'project_id' => $this->project->id,
            'estimated_effort' => 240, // 4 hours
        ]);
        $this->dependencyService->createDependency($task3->id, $task2->id);

        $criticalPath = $this->dependencyService->calculateCriticalPath($this->project->id);

        $this->assertEquals(540, $criticalPath['total_duration']); // 9 hours total
        $this->assertEquals(3, $criticalPath['tasks_count']);
    }

    /** @test */
    public function it_validates_dependency_graph()
    {
        Task::factory()->count(3)->create(['project_id' => $this->project->id]);

        $validation = $this->dependencyService->validateGraph($this->project->id);

        $this->assertTrue($validation['valid']);
        $this->assertEquals(0, $validation['issues_count']);
    }

    /** @test */
    public function it_records_workflow_transitions()
    {
        $task = $this->orchestrationService->createTask([
            'project_id' => $this->project->id,
            'name' => 'Test Task',
            'task_type' => 'feature',
        ]);

        $this->orchestrationService->updateTaskStatus($task->id, 'in_progress');
        $this->orchestrationService->updateTaskStatus($task->id, 'testing');

        $history = $this->workflowService->getTaskHistory($task->id);

        $this->assertGreaterThanOrEqual(3, $history->count()); // Initial + 2 transitions
    }

    /** @test */
    public function it_gets_allowed_transitions_for_status()
    {
        $allowed = $this->workflowService->getAllowedTransitions('pending');

        $this->assertContains('approved', $allowed);
        $this->assertContains('in_progress', $allowed);
        $this->assertContains('cancelled', $allowed);
    }

    /** @test */
    public function it_identifies_terminal_states()
    {
        $this->assertTrue($this->workflowService->isTerminalState('completed'));
        $this->assertTrue($this->workflowService->isTerminalState('cancelled'));
        $this->assertFalse($this->workflowService->isTerminalState('in_progress'));
    }
}
