<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TaskExecution>
 */
class TaskExecutionFactory extends Factory
{
    /**
     * Probability constants
     */
    private const COMPLETION_PROBABILITY = 70; // 70% chance of completion
    private const ERROR_PROBABILITY = 20; // 20% chance of error if not completed
    
    /**
     * Duration and token usage ranges
     */
    private const MIN_DURATION_MS = 100;
    private const MAX_DURATION_MS = 5000;
    private const MIN_TOKENS = 500;
    private const MAX_TOKENS = 3000;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $started = $this->faker->dateTimeBetween('-1 week', 'now');
        $isCompleted = $this->faker->boolean(self::COMPLETION_PROBABILITY);
        
        return [
            'task_id' => Task::factory(),
            'agent_id' => Agent::factory(),
            'execution_number' => $this->faker->numberBetween(1, 3),
            'status' => $isCompleted 
                ? $this->faker->randomElement(['success', 'error', 'completed'])
                : $this->faker->randomElement(['running', 'pending']),
            'context_provided' => [
                'input' => $this->faker->sentence(),
                'params' => $this->faker->words(3)
            ],
            'result' => $isCompleted ? [
                'output' => $this->faker->paragraph(),
                'metrics' => [
                    'duration' => $this->faker->numberBetween(self::MIN_DURATION_MS, self::MAX_DURATION_MS),
                    'tokens_used' => $this->faker->numberBetween(self::MIN_TOKENS, self::MAX_TOKENS)
                ]
            ] : null,
            'error_message' => !$isCompleted && $this->faker->boolean(self::ERROR_PROBABILITY) 
                ? $this->faker->sentence() 
                : null,
            'started_at' => $started,
            'completed_at' => $isCompleted 
                ? $this->faker->dateTimeBetween($started, 'now')
                : null,
            'created_at' => $started,
        ];
    }

    /**
     * Indicate that the execution is running.
     */
    public function running(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'running',
            'completed_at' => null,
            'result' => null,
        ]);
    }

    /**
     * Indicate that the execution succeeded.
     */
    public function succeeded(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'success',
            'result' => [
                'output' => $this->faker->paragraph(),
                'success' => true
            ],
            'error_message' => null,
        ]);
    }

    /**
     * Indicate that the execution failed.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'error',
            'result' => null,
            'error_message' => $this->faker->sentence(),
        ]);
    }
}
