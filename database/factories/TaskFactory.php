<?php

namespace Database\Factories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'task_type' => $this->faker->randomElement(['feature', 'bug', 'refactor', 'maintenance', 'architecture', 'testing', 'documentation']),
            'priority' => $this->faker->randomElement(['critical', 'high', 'medium', 'low']),
            'status' => 'pending',
            'estimated_effort' => $this->faker->numberBetween(15, 480),
        ];
    }
}
