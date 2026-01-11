<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Plan;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PlanDecompositionTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_returns_404_for_non_existent_plan()
    {
        $response = $this->postJson('/api/mcp/plans/9999/decompose');
        
        $response->assertStatus(404)
            ->assertJson(['error' => 'Plan not found']);
    }

    /** @test */
    public function it_validates_plan_status()
    {
        $plan = Plan::factory()->create(['status' => 'draft']);
        
        $response = $this->postJson("/api/mcp/plans/{$plan->id}/decompose");
        
        $response->assertStatus(400)
            ->assertJsonStructure(['error', 'current_status']);
    }

    /** @test */
    public function it_decomposes_plan_into_tasks_preview()
    {
        $plan = Plan::factory()->create([
            'status' => 'active',
            'wizard_state' => [
                'features' => [
                    [
                        'id' => 'feat-1',
                        'name' => 'User Authentication',
                        'description' => 'Login and registration',
                        'priority' => 'high',
                        'dependencies' => [],
                    ],
                    [
                        'id' => 'feat-2',
                        'name' => 'Dashboard',
                        'description' => 'Main dashboard',
                        'priority' => 'medium',
                        'dependencies' => ['feat-1'],
                    ],
                ],
                'timeline' => [],
                'architecture' => 'mvc',
            ],
        ]);
        
        $response = $this->postJson("/api/mcp/plans/{$plan->id}/decompose", [
            'options' => [
                'auto_create' => false,
            ],
        ]);
        
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'tasks',
                'metadata' => [
                    'total_tasks',
                    'estimated_hours',
                    'critical_path',
                    'architecture_pattern',
                    'priority_breakdown',
                ],
                'preview',
            ])
            ->assertJson([
                'success' => true,
                'preview' => true,
            ]);
        
        // Verify tasks structure
        $data = $response->json();
        $this->assertCount(2, $data['tasks']);
        $this->assertEquals(2, $data['metadata']['total_tasks']);
    }

    /** @test */
    public function it_creates_tasks_when_auto_create_is_true()
    {
        $plan = Plan::factory()->create([
            'status' => 'active',
            'wizard_state' => [
                'features' => [
                    [
                        'id' => 'feat-1',
                        'name' => 'User Authentication',
                        'description' => 'Login and registration',
                        'priority' => 'high',
                        'dependencies' => [],
                    ],
                ],
                'timeline' => [],
                'architecture' => 'mvc',
            ],
        ]);
        
        $this->assertCount(0, Task::all());
        
        $response = $this->postJson("/api/mcp/plans/{$plan->id}/decompose", [
            'options' => [
                'auto_create' => true,
            ],
            'project_id' => 1,
        ]);
        
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'preview' => false,
            ])
            ->assertJsonStructure([
                'created_tasks',
            ]);
        
        // Verify tasks were created
        $this->assertGreaterThan(0, Task::count());
        
        $task = Task::first();
        $this->assertEquals('Implement: User Authentication', $task->name);
        $this->assertEquals('high', $task->priority);
        $this->assertEquals('pending', $task->status);
    }

    /** @test */
    public function it_validates_microtask_size_option()
    {
        $plan = Plan::factory()->create([
            'status' => 'active',
            'wizard_state' => ['features' => [], 'timeline' => []],
        ]);
        
        $response = $this->postJson("/api/mcp/plans/{$plan->id}/decompose", [
            'options' => [
                'microtask_size' => 10, // Less than minimum 15
            ],
        ]);
        
        $response->assertStatus(422) // Validation error
            ->assertJsonValidationErrors(['options.microtask_size']);
    }

    /** @test */
    public function it_handles_plan_with_subtasks()
    {
        $plan = Plan::factory()->create([
            'status' => 'active',
            'wizard_state' => [
                'features' => [
                    [
                        'id' => 'feat-complex',
                        'name' => 'Complex Authentication System',
                        'description' => 'Full authentication with OAuth integration, two-factor authentication, password recovery, email verification, and role-based access control',
                        'priority' => 'critical',
                        'dependencies' => [],
                    ],
                ],
                'timeline' => [],
                'architecture' => 'microservices',
            ],
        ]);
        
        $response = $this->postJson("/api/mcp/plans/{$plan->id}/decompose", [
            'options' => [
                'auto_create' => true,
                'microtask_size' => 45,
            ],
        ]);
        
        $response->assertStatus(200);
        
        // Verify parent task and subtasks were created
        $tasks = Task::all();
        $this->assertGreaterThan(1, $tasks->count());
        
        $parentTask = $tasks->whereNull('parent_task_id')->first();
        $this->assertNotNull($parentTask);
        
        $subtasks = $tasks->where('parent_task_id', $parentTask->id);
        $this->assertGreaterThan(0, $subtasks->count());
    }

    /** @test */
    public function it_handles_circular_dependencies_gracefully()
    {
        $plan = Plan::factory()->create([
            'status' => 'active',
            'wizard_state' => [
                'features' => [
                    [
                        'id' => 'feat-a',
                        'name' => 'Feature A',
                        'description' => 'Feature A',
                        'priority' => 'high',
                        'dependencies' => ['feat-c'],
                    ],
                    [
                        'id' => 'feat-b',
                        'name' => 'Feature B',
                        'description' => 'Feature B',
                        'priority' => 'high',
                        'dependencies' => ['feat-a'],
                    ],
                    [
                        'id' => 'feat-c',
                        'name' => 'Feature C',
                        'description' => 'Feature C',
                        'priority' => 'high',
                        'dependencies' => ['feat-b'],
                    ],
                ],
                'timeline' => [],
                'architecture' => 'mvc',
            ],
        ]);
        
        $response = $this->postJson("/api/mcp/plans/{$plan->id}/decompose");
        
        $response->assertStatus(400)
            ->assertJsonStructure(['error'])
            ->assertJsonFragment(['error' => 'Generated task tree contains circular dependencies']);
    }

    /** @test */
    public function it_handles_empty_feature_list()
    {
        $plan = Plan::factory()->create([
            'status' => 'active',
            'wizard_state' => [
                'features' => [],
                'timeline' => [],
                'architecture' => 'mvc',
            ],
        ]);
        
        $response = $this->postJson("/api/mcp/plans/{$plan->id}/decompose");
        
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'metadata' => [
                    'total_tasks' => 0,
                    'estimated_hours' => 0,
                ],
            ]);
    }
}
