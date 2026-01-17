<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Services\TaskQueueService;
use App\Services\PlanReaderService;
use App\Services\VerificationService;
use App\Services\ObservationService;
use App\Events\TaskStatusUpdated;
use App\Events\ObservationLogged;
use App\Events\TestFailureAlert;
use App\Events\VerificationCompleted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * MCP Server API Test
 * 
 * Comprehensive tests for Model Context Protocol endpoints
 * per Code Master Section 11.7-11.8 specification.
 */
class McpServerTest extends TestCase
{
    use RefreshDatabase;

    private Project $project;
    private Task $readyTask;
    private Task $blockedTask;
    private Task $completedTask;

    protected function setUp(): void
    {
        parent::setUp();
        
        Event::fake([
            TaskStatusUpdated::class,
            ObservationLogged::class,
            TestFailureAlert::class,
            VerificationCompleted::class,
        ]);

        // Create test project
        $this->project = Project::factory()->create();

        // Create test tasks with various states
        $this->completedTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'Completed Task',
            'status' => 'completed',
            'priority' => 'low',
        ]);

        $this->readyTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'Ready Task',
            'description' => 'A task ready to be executed',
            'task_type' => 'feature',
            'priority' => 'high',
            'status' => 'pending',
        ]);

        $this->blockedTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'Blocked Task',
            'status' => 'blocked',
            'priority' => 'medium',
        ]);
    }

    /** @test */
    public function it_returns_next_ready_task_via_get_next_task_endpoint()
    {
        $response = $this->getJson('/api/v1/mcp/nextTask');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'task' => [
                    'taskId',
                    'title',
                    'description',
                    'priority',
                    'type',
                    'status',
                    'details',
                ],
                'planContext',
                'queueStats' => [
                    'totalTasks',
                    'readyTasks',
                    'blockedTasks',
                    'completedTasks',
                ],
                'nextTasksPreview',
            ]);

        $this->assertEquals($this->readyTask->id, $response->json('task.taskId'));
        $this->assertEquals('Ready Task', $response->json('task.title'));
    }

    /** @test */
    public function it_handles_empty_queue_gracefully()
    {
        // Complete all tasks
        Task::query()->update(['status' => 'completed']);

        $response = $this->getJson('/api/v1/mcp/nextTask');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'task' => null,
                'message' => 'No tasks available in queue',
            ]);
    }

    /** @test */
    public function it_includes_plan_context_with_next_task()
    {
        $response = $this->getJson('/api/v1/mcp/nextTask');

        $response->assertOk()
            ->assertJsonStructure([
                'planContext' => [
                    'version',
                    'relevantSections',
                    'designReferences',
                ],
            ]);
    }

    /** @test */
    public function it_reports_task_status_update_successfully()
    {
        $payload = [
            'taskId' => $this->readyTask->id,
            'status' => 'in_progress',
            'notes' => 'Started implementation',
            'filesChanged' => ['src/components/Feature.vue'],
        ];

        $response = $this->postJson('/api/v1/mcp/reportTaskStatus', $payload);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'taskId',
                'status',
                'message',
            ]);

        Event::assertDispatched(TaskStatusUpdated::class);

        $this->readyTask->refresh();
        $this->assertEquals('in_progress', $this->readyTask->status);
    }

    /** @test */
    public function it_creates_verification_task_when_task_marked_done()
    {
        $payload = [
            'taskId' => $this->readyTask->id,
            'status' => 'done',
            'notes' => 'Implementation complete',
            'verification' => [
                'required' => true,
                'checklist' => [
                    ['item' => 'Unit tests pass', 'status' => 'passed'],
                    ['item' => 'Integration tests pass', 'status' => 'passed'],
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/mcp/reportTaskStatus', $payload);

        $response->assertOk()
            ->assertJsonStructure([
                'verificationTaskCreated' => [
                    'taskId',
                    'title',
                ],
            ]);

        // Verify that a verification task was created
        $this->assertDatabaseHas('tasks', [
            'name' => 'VERIFY: Ready Task',
            'task_type' => 'testing',
        ]);
    }

    /** @test */
    public function it_validates_status_enum_values()
    {
        $payload = [
            'taskId' => $this->readyTask->id,
            'status' => 'invalid_status',
        ];

        $response = $this->postJson('/api/v1/mcp/reportTaskStatus', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    /** @test */
    public function it_reports_observation_successfully()
    {
        $payload = [
            'taskId' => $this->readyTask->id,
            'observation' => 'Found that HSL is better than HEX for theme switching',
            'type' => 'discovery',
            'severity' => 'medium',
            'details' => [
                'what' => 'HSL format provides better theme control',
                'why' => 'Easier to adjust lightness/saturation programmatically',
                'impact' => 'Should refactor color system',
                'suggestedAction' => 'Create task to migrate to HSL',
            ],
        ];

        $response = $this->postJson('/api/v1/mcp/reportObservation', $payload);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'observationId',
                'observation',
                'type',
                'severity',
                'status',
            ]);

        Event::assertDispatched(ObservationLogged::class);
    }

    /** @test */
    public function it_creates_new_task_from_observation_when_requested()
    {
        $payload = [
            'taskId' => $this->readyTask->id,
            'observation' => 'Missing error handling in API calls',
            'type' => 'issue',
            'severity' => 'high',
            'createNewTask' => true,
            'newTaskDetails' => [
                'title' => 'Add error handling to API calls',
                'priority' => 'high',
                'estimatedHours' => 4,
            ],
        ];

        $response = $this->postJson('/api/v1/mcp/reportObservation', $payload);

        $response->assertOk()
            ->assertJsonStructure([
                'newTaskCreated' => [
                    'taskId',
                    'title',
                    'priority',
                ],
            ]);

        $this->assertDatabaseHas('tasks', [
            'name' => 'Add error handling to API calls',
            'priority' => 'high',
        ]);
    }

    /** @test */
    public function it_reports_test_failure_and_blocks_task()
    {
        $payload = [
            'taskId' => $this->readyTask->id,
            'testName' => 'test_color_contrast_wcag_aa',
            'testFile' => 'src/styles/colors.test.ts',
            'failureDetails' => [
                'error' => 'Expected contrast ratio 4.5:1 but got 3.8:1',
                'failingColor' => ['name' => 'warning-light', 'hex' => '#FFF3CD'],
                'expectedRatio' => 4.5,
                'actualRatio' => 3.8,
            ],
            'needsInvestigation' => true,
        ];

        $response = $this->postJson('/api/v1/mcp/reportTestFailure', $payload);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'testFailureId',
                'blockingTask',
                'investigationTaskCreated' => [
                    'taskId',
                    'title',
                    'priority',
                ],
            ]);

        Event::assertDispatched(TestFailureAlert::class);

        // Verify task is now blocked
        $this->readyTask->refresh();
        $this->assertEquals('blocked', $this->readyTask->status);

        // Verify investigation task was created
        $this->assertDatabaseHas('tasks', [
            'name' => 'FIX: Investigate test_color_contrast_wcag_aa failure',
            'task_type' => 'bug',
            'priority' => 'critical',
        ]);
    }

    /** @test */
    public function it_reports_verification_result_with_pass()
    {
        $verificationTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'VERIFY: Ready Task',
            'task_type' => 'testing',
            'status' => 'in_progress',
        ]);

        $payload = [
            'verificationTaskId' => $verificationTask->id,
            'originalTaskId' => $this->readyTask->id,
            'verificationStatus' => 'passed',
            'verification' => [
                'checklist' => [
                    ['item' => 'Color renders correctly', 'status' => 'passed'],
                    ['item' => 'Theme toggle works', 'status' => 'passed'],
                    ['item' => 'Accessibility verified', 'status' => 'passed'],
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/mcp/reportVerificationResult', $payload);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'verificationStatus' => 'passed',
                'originalTaskStatus' => 'completed',
            ]);

        Event::assertDispatched(VerificationCompleted::class);
    }

    /** @test */
    public function it_reports_verification_result_with_failures()
    {
        $verificationTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'VERIFY: Ready Task',
            'task_type' => 'testing',
            'status' => 'in_progress',
        ]);

        $payload = [
            'verificationTaskId' => $verificationTask->id,
            'originalTaskId' => $this->readyTask->id,
            'verificationStatus' => 'failed',
            'verification' => [
                'checklist' => [
                    ['item' => 'Color renders correctly', 'status' => 'passed'],
                    ['item' => 'Theme toggle works', 'status' => 'failed'],
                ],
                'failedItems' => [
                    [
                        'item' => 'Theme toggle works',
                        'issue' => 'Dark theme not applying to all components',
                        'why' => 'Some components using hardcoded colors',
                    ],
                ],
            ],
            'suggestedActions' => [
                'Create follow-up task: Update components to use CSS variables',
            ],
        ];

        $response = $this->postJson('/api/v1/mcp/reportVerificationResult', $payload);

        $response->assertOk()
            ->assertJsonStructure([
                'followUpTasksCreated',
                'issuesFound',
            ]);

        // Verify follow-up task created
        $this->assertDatabaseHas('tasks', [
            'task_type' => 'bug',
            'priority' => 'high',
        ]);
    }

    /** @test */
    public function it_asks_question_and_gets_plan_context()
    {
        $payload = [
            'question' => 'Should sidebar collapse on mobile?',
            'context' => 'Working on Navigation component',
            'currentTaskId' => $this->readyTask->id,
            'searchInPlan' => 'responsive-design|mobile',
        ];

        $response = $this->postJson('/api/v1/mcp/askQuestion', $payload);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'question',
                'answerFromPlan',
                'confidence',
                'evidence' => [
                    'source',
                    'section',
                ],
                'guidance',
                'relatedDesignChoices',
            ]);
    }

    /** @test */
    public function it_handles_missing_task_id_gracefully()
    {
        $response = $this->postJson('/api/v1/mcp/reportTaskStatus', [
            'status' => 'in_progress',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['taskId']);
    }

    /** @test */
    public function it_handles_nonexistent_task_id()
    {
        $response = $this->postJson('/api/v1/mcp/reportTaskStatus', [
            'taskId' => 99999,
            'status' => 'in_progress',
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Task not found',
            ]);
    }

    /** @test */
    public function it_returns_queue_statistics_in_get_next_task()
    {
        $response = $this->getJson('/api/v1/mcp/nextTask');

        $response->assertOk()
            ->assertJsonStructure([
                'queueStats' => [
                    'totalTasks',
                    'readyTasks',
                    'blockedTasks',
                    'completedTasks',
                    'inProgressTasks',
                ],
            ]);

        $stats = $response->json('queueStats');
        $this->assertGreaterThan(0, $stats['totalTasks']);
        $this->assertEquals(1, $stats['readyTasks']);
        $this->assertEquals(1, $stats['blockedTasks']);
        $this->assertEquals(1, $stats['completedTasks']);
    }

    /** @test */
    public function it_provides_next_tasks_preview()
    {
        // Create multiple ready tasks
        Task::factory()->count(3)->create([
            'project_id' => $this->project->id,
            'status' => 'pending',
            'priority' => 'medium',
        ]);

        $response = $this->getJson('/api/v1/mcp/nextTask');

        $response->assertOk()
            ->assertJsonStructure([
                'nextTasksPreview' => [
                    '*' => [
                        'taskId',
                        'title',
                        'priority',
                    ],
                ],
            ]);

        $preview = $response->json('nextTasksPreview');
        $this->assertGreaterThanOrEqual(1, count($preview));
        $this->assertLessThanOrEqual(3, count($preview));
    }

    /** @test */
    public function it_includes_version_in_next_task_response()
    {
        $response = $this->getJson('/api/v1/mcp/nextTask');

        $response->assertOk()
            ->assertJsonStructure([
                'task' => [
                    'taskId',
                    'title',
                    'version',
                ],
            ]);

        $this->assertIsInt($response->json('task.version'));
        $this->assertGreaterThanOrEqual(0, $response->json('task.version'));
    }

    /** @test */
    public function it_increments_version_on_status_update()
    {
        $initialVersion = $this->readyTask->version;

        $payload = [
            'taskId' => $this->readyTask->id,
            'status' => 'in_progress',
            'expectedVersion' => $initialVersion,
        ];

        $response = $this->postJson('/api/v1/mcp/reportTaskStatus', $payload);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'version' => $initialVersion + 1,
            ]);

        $this->readyTask->refresh();
        $this->assertEquals($initialVersion + 1, $this->readyTask->version);
    }

    /** @test */
    public function it_rejects_status_update_with_stale_version()
    {
        // Update task to increment version
        $this->readyTask->update(['status' => 'in_progress']);
        $currentVersion = $this->readyTask->version;

        // Try to update with stale version
        $payload = [
            'taskId' => $this->readyTask->id,
            'status' => 'done',
            'expectedVersion' => $currentVersion - 1, // Stale version
        ];

        $response = $this->postJson('/api/v1/mcp/reportTaskStatus', $payload);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'error' => 'version_conflict',
                'currentVersion' => $currentVersion,
                'expectedVersion' => $currentVersion - 1,
            ])
            ->assertJsonStructure([
                'message',
                'currentStatus',
            ]);

        // Verify task status wasn't changed
        $this->readyTask->refresh();
        $this->assertEquals('in_progress', $this->readyTask->status);
    }

    /** @test */
    public function it_allows_status_update_without_version_check()
    {
        // Backward compatibility: version check is optional
        $payload = [
            'taskId' => $this->readyTask->id,
            'status' => 'in_progress',
            // No expectedVersion provided
        ];

        $response = $this->postJson('/api/v1/mcp/reportTaskStatus', $payload);

        $response->assertOk()
            ->assertJson([
                'success' => true,
            ]);

        $this->readyTask->refresh();
        $this->assertEquals('in_progress', $this->readyTask->status);
    }

    /** @test */
    public function it_handles_concurrent_updates_with_optimistic_locking()
    {
        $initialVersion = $this->readyTask->version;

        // First agent updates successfully
        $payload1 = [
            'taskId' => $this->readyTask->id,
            'status' => 'in_progress',
            'expectedVersion' => $initialVersion,
        ];

        $response1 = $this->postJson('/api/v1/mcp/reportTaskStatus', $payload1);
        $response1->assertOk();

        $this->readyTask->refresh();
        $newVersion = $this->readyTask->version;

        // Second agent tries to update with same initial version (should fail)
        $payload2 = [
            'taskId' => $this->readyTask->id,
            'status' => 'blocked',
            'expectedVersion' => $initialVersion, // Stale version
        ];

        $response2 = $this->postJson('/api/v1/mcp/reportTaskStatus', $payload2);

        $response2->assertStatus(409)
            ->assertJson([
                'success' => false,
                'error' => 'version_conflict',
                'currentVersion' => $newVersion,
            ]);

        // Verify task retained first agent's status
        $this->readyTask->refresh();
        $this->assertEquals('in_progress', $this->readyTask->status);
        $this->assertEquals($newVersion, $this->readyTask->version);
    }
}
