<?php

namespace Tests\Feature;

use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class McpPlanPersistenceTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_can_save_a_plan()
    {
        $planData = [
            'name' => 'Test Project Plan',
            'description' => 'A test project plan',
            'wizard_state' => [
                'project_name' => 'Test Project',
                'project_category' => 'web_app',
                'project_scale' => 'medium',
            ],
            'metadata' => [
                'version' => '1.0',
                'author' => 'test',
            ],
            'status' => 'draft',
        ];

        $response = $this->postJson('/api/v1/mcp/savePlan', $planData);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Plan saved successfully',
                 ])
                 ->assertJsonStructure([
                     'plan' => ['id', 'name', 'description', 'status', 'created_at', 'updated_at'],
                 ]);

        $this->assertDatabaseHas('plans', [
            'name' => 'Test Project Plan',
            'description' => 'A test project plan',
        ]);
    }

    /** @test */
    public function it_validates_required_fields()
    {
        $response = $this->postJson('/api/v1/mcp/savePlan', [
            // Missing required 'name' and 'wizard_state'
            'description' => 'Incomplete plan',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name', 'wizard_state']);
    }

    /** @test */
    public function it_can_load_a_plan()
    {
        $plan = Plan::create([
            'name' => 'Existing Plan',
            'description' => 'An existing plan',
            'wizard_state' => [
                'project_name' => 'Existing Project',
                'project_scale' => 'large',
            ],
            'status' => 'active',
        ]);

        $response = $this->getJson("/api/v1/mcp/loadPlan/{$plan->id}");

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'plan' => [
                         'id' => $plan->id,
                         'name' => 'Existing Plan',
                         'wizard_state' => [
                             'project_name' => 'Existing Project',
                             'project_scale' => 'large',
                         ],
                     ],
                 ]);
    }

    /** @test */
    public function it_returns_404_for_non_existent_plan()
    {
        $response = $this->getJson('/api/v1/mcp/loadPlan/99999');

        $response->assertStatus(404)
                 ->assertJson([
                     'success' => false,
                     'message' => 'Plan not found',
                 ]);
    }

    /** @test */
    public function it_can_list_plans()
    {
        Plan::create([
            'name' => 'Plan 1',
            'wizard_state' => ['test' => 'data'],
            'status' => 'draft',
        ]);

        Plan::create([
            'name' => 'Plan 2',
            'wizard_state' => ['test' => 'data'],
            'status' => 'active',
        ]);

        $response = $this->getJson('/api/v1/mcp/listPlans');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'count' => 2,
                 ])
                 ->assertJsonStructure([
                     'plans' => [
                         '*' => ['id', 'name', 'description', 'status', 'created_at', 'updated_at'],
                     ],
                 ]);
    }

    /** @test */
    public function it_can_filter_plans_by_status()
    {
        Plan::create(['name' => 'Draft Plan', 'wizard_state' => [], 'status' => 'draft']);
        Plan::create(['name' => 'Active Plan', 'wizard_state' => [], 'status' => 'active']);

        $response = $this->getJson('/api/v1/mcp/listPlans?status=active');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'count' => 1,
                 ]);

        $this->assertEquals('Active Plan', $response->json('plans.0.name'));
    }

    /** @test */
    public function it_respects_limit_parameter()
    {
        for ($i = 1; $i <= 10; $i++) {
            Plan::create([
                'name' => "Plan $i",
                'wizard_state' => [],
            ]);
        }

        $response = $this->getJson('/api/v1/mcp/listPlans?limit=5');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'count' => 5,
                 ]);
    }
}
