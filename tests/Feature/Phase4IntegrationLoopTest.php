<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Project;
use App\Models\Task;
use App\Services\TaskQueueService;
use App\Services\PlanReaderService;
use App\Services\VerificationService;
use App\Events\TaskStatusUpdated;
use App\Events\VerificationCompleted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Phase 4: Full Integration Loop Test
 * 
 * End-to-end validation: Plan → Tasks → Execution → Verification → Audit
 * Per Code Master Section 11-12 specification
 */
class Phase4IntegrationLoopTest extends TestCase
{
    use RefreshDatabase;

    private Project $project;
    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();
        
        Event::fake([
            TaskStatusUpdated::class,
            VerificationCompleted::class,
        ]);

        // Create test project and plan
        $this->project = Project::factory()->create([
            'name' => 'Integration Test Project',
        ]);

        $this->plan = Plan::create([
            'name' => 'Test Plan - Full Integration',
            'description' => 'End-to-end integration test plan',
            'wizard_state' => [
                'project_name' => 'Integration Test Project',
                'project_category' => 'web_app',
                'project_scale' => 'medium',
                'features' => [
                    'user_auth',
                    'dashboard',
                    'api_integration',
                ],
            ],
            'metadata' => [
                'version' => '1.0.0',
                'created_by' => 'test',
            ],
            'status' => 'active',
        ]);
    }

    /** @test */
    public function it_completes_full_integration_loop_from_plan_to_audit()
    {
        // PHASE 1: Create tasks from plan
        $tasks = $this->createTasksFromPlan();
        $this->assertCount(3, $tasks, 'Should create 3 tasks from plan features');

        // PHASE 2: Get next task from queue
        $queueService = app(TaskQueueService::class);
        $nextTask = $queueService->getNextTask();
        $this->assertNotNull($nextTask, 'Queue should return next task');
        $this->assertEquals('pending', $nextTask->status);

        // PHASE 3: Execute task (simulate agent execution)
        $nextTask->update(['status' => 'in_progress']);
        Event::assertDispatched(TaskStatusUpdated::class);

        // PHASE 4: Complete task with verification requirement
        $verificationService = app(VerificationService::class);
        $verificationTask = $verificationService->createVerificationTask($nextTask);
        
        $this->assertDatabaseHas('tasks', [
            'id' => $verificationTask->id,
            'task_type' => 'testing',
            'parent_task_id' => $nextTask->id,
        ]);

        // PHASE 5: Verify task passes verification
        $verificationTask->update(['status' => 'in_progress']);
        
        $verificationResult = $verificationService->applyResult([
            'originalTaskId' => $nextTask->id,
            'status' => 'passed',
            'checklist' => [
                ['item' => 'Unit tests pass', 'status' => 'passed'],
                ['item' => 'Integration tests pass', 'status' => 'passed'],
            ],
        ]);

        $this->assertEquals('completed', $verificationResult['originalTaskStatus']);
        Event::assertDispatched(VerificationCompleted::class);

        // PHASE 6: Validate final state (audit)
        $nextTask->refresh();
        $this->assertEquals('completed', $nextTask->status);
        
        $stats = $queueService->getQueueStats();
        $this->assertEquals(1, $stats['completedTasks'], 'One task should be completed');
        $this->assertGreaterThan(0, $stats['totalTasks'], 'Total tasks should exist');
    }

    /** @test */
    public function it_handles_verification_failure_and_creates_follow_up()
    {
        // Create and execute task
        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'Task with Failing Verification',
            'status' => 'in_progress',
        ]);

        // Create verification task
        $verificationService = app(VerificationService::class);
        $verificationTask = $verificationService->createVerificationTask($task);

        // Apply failed verification result
        $verificationResult = $verificationService->applyResult([
            'originalTaskId' => $task->id,
            'status' => 'failed',
            'checklist' => [
                ['item' => 'UI renders correctly', 'status' => 'passed'],
                ['item' => 'Theme toggle works', 'status' => 'failed'],
            ],
        ]);

        // Verify task returned to in_progress
        $this->assertEquals('in_progress', $verificationResult['originalTaskStatus']);
        
        $task->refresh();
        $this->assertEquals('in_progress', $task->status);
    }

    /** @test */
    public function it_tracks_queue_statistics_across_full_loop()
    {
        // Create multiple tasks
        $tasks = $this->createTasksFromPlan();
        
        $queueService = app(TaskQueueService::class);
        $initialStats = $queueService->getQueueStats();

        $this->assertEquals(3, $initialStats['totalTasks']);
        $this->assertEquals(3, $initialStats['readyTasks']);
        $this->assertEquals(0, $initialStats['completedTasks']);

        // Complete one task
        $tasks[0]->update(['status' => 'completed']);

        $updatedStats = $queueService->getQueueStats();
        $this->assertEquals(1, $updatedStats['completedTasks']);
        $this->assertEquals(2, $updatedStats['readyTasks']);
    }

    /** @test */
    public function it_provides_plan_context_with_tasks()
    {
        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'Task Requiring Plan Context',
            'status' => 'pending',
        ]);

        $planReader = app(PlanReaderService::class);
        $context = $planReader->getContext('general');

        $this->assertArrayHasKey('version', $context);
        $this->assertArrayHasKey('relevantSections', $context);
        $this->assertArrayHasKey('designReferences', $context);
    }

    /** @test */
    public function it_handles_task_dependencies_in_execution_order()
    {
        // Create parent task
        $parentTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'Parent Task',
            'status' => 'pending',
            'priority' => 'high',
        ]);

        // Create dependent child task
        $childTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'Child Task',
            'parent_task_id' => $parentTask->id,
            'status' => 'pending',
            'priority' => 'high',
        ]);

        $queueService = app(TaskQueueService::class);
        $nextTask = $queueService->getNextTask();

        // Should get parent task first (child is blocked by parent)
        $this->assertEquals($parentTask->id, $nextTask->id);

        // Complete parent
        $parentTask->update(['status' => 'completed']);

        // Now child should be available
        $nextTask = $queueService->getNextTask();
        $this->assertEquals($childTask->id, $nextTask->id);
    }

    /**
     * Helper: Create tasks from plan features
     */
    private function createTasksFromPlan(): array
    {
        $features = $this->plan->wizard_state['features'] ?? [];
        $tasks = [];

        foreach ($features as $feature) {
            $tasks[] = Task::create([
                'project_id' => $this->project->id,
                'name' => "Implement {$feature}",
                'description' => "Implement {$feature} feature from plan",
                'task_type' => 'feature',
                'priority' => 'high',
                'status' => 'pending',
            ]);
        }

        return $tasks;
    }
}
