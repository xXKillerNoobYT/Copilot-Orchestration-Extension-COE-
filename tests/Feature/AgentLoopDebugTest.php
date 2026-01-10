<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentLoopDebugTest extends TestCase
{
    use RefreshDatabase;

    public function test_debug_start_agent_loop()
    {
        Agent::factory()->create(['name' => 'zen-planner']);
        Task::factory()->create(['status' => 'pending']);

        $response = $this->postJson('/api/v1/agent-loop/start', [
            'max_cycles' => 1,
        ]);

        // Print response for debugging
        $json = json_decode($response->getContent(), true);
        if ($response->status() === 500 && isset($json['message'])) {
            echo "\n[ERROR] " . $json['message'] . "\n";
            if (isset($json['trace'])) {
                echo "\nTrace (first 20 frames):\n";
                foreach (array_slice($json['trace'], 0, 20) as $frame) {
                    echo "  {$frame['file']}:{$frame['line']} in {$frame['function']}\n";
                }
            }
        }

        $response->assertStatus(200);
    }
}
