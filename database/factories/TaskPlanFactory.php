<?php

namespace Database\Factories;

use App\Models\TaskPlan;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskPlanFactory extends Factory
{
    protected $model = TaskPlan::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'created_by_user_id' => User::factory(),
            'approved_by_user_id' => null,
            'requirement' => $this->faker->sentence(20),
            'parsed_requirement' => [
                'features' => [
                    'User Authentication',
                    'Data Management',
                    'Reporting Dashboard',
                ],
                'technical_requirements' => [
                    'Security',
                    'Performance',
                    'Scalability',
                ],
                'constraints' => [
                    'Budget: $50,000',
                    'Timeline: 3 months',
                ],
            ],
            'generated_tasks' => [
                [
                    'id' => 'TASK-001',
                    'name' => 'Setup authentication',
                    'description' => 'Implement user authentication system',
                    'estimated_hours' => 40,
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'TASK-002',
                    'name' => 'Create database schema',
                    'description' => 'Design and implement database schema',
                    'estimated_hours' => 24,
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'TASK-003',
                    'name' => 'Build reporting dashboard',
                    'description' => 'Create admin dashboard with reports',
                    'estimated_hours' => 60,
                    'priority' => 'medium',
                    'dependencies' => ['TASK-001', 'TASK-002'],
                ],
            ],
            'dependencies' => [
                'TASK-003' => ['TASK-001', 'TASK-002'],
            ],
            'architecture_design' => [
                'patterns' => ['MVC', 'Repository Pattern'],
                'frameworks' => ['Laravel', 'Vue.js'],
                'infrastructure' => ['Docker', 'PostgreSQL', 'Redis'],
            ],
            'status' => 'draft',
            'complexity' => 'moderate',
            'estimated_hours' => 124,
            'version' => 1,
            'rejection_reason' => null,
            'approved_at' => null,
            'rejected_at' => null,
        ];
    }

    /**
     * Indicate that the task plan is approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'approved_by_user_id' => User::factory(),
            'approved_at' => now(),
        ]);
    }

    /**
     * Indicate that the task plan is rejected.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'rejection_reason' => 'Does not meet project requirements',
            'rejected_at' => now(),
        ]);
    }

    /**
     * Indicate that the task plan is high complexity.
     */
    public function complex(): static
    {
        return $this->state(fn (array $attributes) => [
            'complexity' => 'very_complex',
            'estimated_hours' => 400,
        ]);
    }
}
