<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Agent>
 */
class AgentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->word(),
            'type' => $this->faker->randomElement(['planner', 'architect', 'coder', 'tester', 'reviewer', 'documentation', 'deployment', 'maintenance']),
            'description' => $this->faker->paragraph(),
            'capabilities' => json_encode([$this->faker->word(), $this->faker->word()]),
            'configuration' => json_encode(['timeout' => 300]),
            'llm_provider' => 'copilot',
            'is_active' => true,
        ];
    }
}
