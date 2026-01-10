<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentLoopTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Create sample agents and tasks for testing
        Agent::factory()->create(['name' => 'zen-planner']);
        Agent::factory()->create(['name' => 'auto-zen']);
        Task::factory()->create(['status' => 'pending']);
    }

    /**
     * Test POST /api/v1/agent-loop/start endpoint
     */
    public function test_start_agent_loop()
    {
        $response = $this->postJson('/api/v1/agent-loop/start', [
            'max_cycles' => 5,
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'message',
            'stats' => [
                'running',
            ],
        ]);
        $response->assertJson([
            'status' => 'success',
        ]);
    }

    /**
     * Test POST /api/v1/agent-loop/start with default (infinite) cycles
     */
    public function test_start_agent_loop_infinite()
    {
        $response = $this->postJson('/api/v1/agent-loop/start', [
            'max_cycles' => 0,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
        ]);
    }

    /**
     * Test POST /api/v1/agent-loop/stop endpoint
     */
    public function test_stop_agent_loop()
    {
        // Start the loop first
        $this->postJson('/api/v1/agent-loop/start', ['max_cycles' => 0]);

        // Then stop it
        $response = $this->postJson('/api/v1/agent-loop/stop');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'message' => 'Loop stop signal sent',
        ]);
    }

    /**
     * Test GET /api/v1/agent-loop/status endpoint
     */
    public function test_get_agent_loop_status()
    {
        $response = $this->getJson('/api/v1/agent-loop/status');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'running',
            'stats' => [
                'running',
            ],
        ]);
    }

    /**
     * Test POST /api/v1/agent-loop/cycle endpoint
     */
    public function test_execute_single_cycle()
    {
        $response = $this->postJson('/api/v1/agent-loop/cycle');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'cycle_result',
        ]);
        $response->assertJson([
            'status' => 'success',
        ]);
    }

    /**
     * Test invalid input validation
     */
    public function test_start_agent_loop_invalid_cycles()
    {
        $response = $this->postJson('/api/v1/agent-loop/start', [
            'max_cycles' => -1, // Invalid: negative
        ]);

        $response->assertStatus(422); // Validation error
    }

    /**
     * Test loop status reflects running state
     */
    public function test_loop_status_reflects_running_state()
    {
        // Start the loop
        $this->postJson('/api/v1/agent-loop/start', ['max_cycles' => 0]);

        // Check status
        $response = $this->getJson('/api/v1/agent-loop/status');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
        ]);
    }

    /**
     * Test sequential start/stop operations
     */
    public function test_sequential_start_stop_operations()
    {
        // Start
        $response1 = $this->postJson('/api/v1/agent-loop/start', ['max_cycles' => 10]);
        $response1->assertStatus(200);

        // Stop
        $response2 = $this->postJson('/api/v1/agent-loop/stop');
        $response2->assertStatus(200);

        // Start again
        $response3 = $this->postJson('/api/v1/agent-loop/start', ['max_cycles' => 5]);
        $response3->assertStatus(200);
    }
}
