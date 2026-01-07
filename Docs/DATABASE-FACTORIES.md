# Database Factories — Test Data Generation

**Date:** January 6, 2026  
**Location:** `database/factories/`  

---

## 📦 Factory Guide

Factories generate realistic test data using Faker library. They're used in tests and seeders.

---

## 🏭 Complete Factory Examples

### TaskFactory

```php
<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(3),
            'task_type' => $this->faker->randomElement([
                'feature', 'bug', 'refactor', 'maintenance', 
                'architecture', 'testing', 'documentation'
            ]),
            'priority' => $this->faker->randomElement(['critical', 'high', 'medium', 'low']),
            'status' => 'pending',
            'assigned_agent' => null,
            'estimated_effort' => $this->faker->numberBetween(30, 480), // minutes
            'actual_effort' => null,
            'started_at' => null,
            'completed_at' => null,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'started_at' => null,
            'completed_at' => null,
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'started_at' => now()->subHours(rand(1, 48)),
        ]);
    }

    public function completed(): static
    {
        $startedAt = now()->subDays(rand(1, 30));
        $estimatedEffort = $attributes['estimated_effort'] ?? 120;
        
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'started_at' => $startedAt,
            'completed_at' => $startedAt->addMinutes(rand($estimatedEffort, $estimatedEffort * 2)),
            'actual_effort' => rand($estimatedEffort, $estimatedEffort * 2),
        ]);
    }

    public function blocked(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'blocked',
            'started_at' => now()->subDays(rand(1, 14)),
        ]);
    }

    public function withSubtasks(int $count = 3): static
    {
        return $this->has(Task::factory($count), 'subtasks');
    }

    public function feature(): static
    {
        return $this->state(fn (array $attributes) => [
            'task_type' => 'feature',
            'priority' => $this->faker->randomElement(['high', 'medium']),
        ]);
    }

    public function bugFix(): static
    {
        return $this->state(fn (array $attributes) => [
            'task_type' => 'bug',
            'priority' => $this->faker->randomElement(['critical', 'high']),
            'estimated_effort' => $this->faker->numberBetween(30, 120),
        ]);
    }

    public function highPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => 'high',
        ]);
    }

    public function criticalPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => 'critical',
        ]);
    }

    public function withGithubIssue(int $issueNumber = null): static
    {
        return $this->state(fn (array $attributes) => [
            'github_issue_id' => $issueNumber ?? rand(1000, 9999),
            'github_issue_url' => 'https://github.com/owner/repo/issues/' . ($issueNumber ?? rand(1000, 9999)),
        ]);
    }

    public function forProject(Project $project): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => $project->id,
        ]);
    }
}
```

### ProjectFactory

```php
<?php

namespace Database\Factories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->paragraph(),
            'repository_type' => 'git',
            'repository_url' => 'https://github.com/' . $this->faker->userName() . '/' . $this->faker->word(),
            'github_owner' => $this->faker->userName(),
            'github_repo' => $this->faker->word(),
            'status' => 'active',
            'skill_level' => $this->faker->randomElement(['beginner', 'intermediate', 'advanced', 'expert']),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    public function planning(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'planning',
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
        ]);
    }

    public function expert(): static
    {
        return $this->state(fn (array $attributes) => [
            'skill_level' => 'expert',
        ]);
    }

    public function withTasks(int $count = 5): static
    {
        return $this->has(Task::factory($count), 'tasks');
    }

    public function withArchitecture(): static
    {
        return $this->state(fn (array $attributes) => [
            'architecture_document' => 'docs/ARCHITECTURE.md',
        ]);
    }
}
```

### AgentFactory

```php
<?php

namespace Database\Factories;

use App\Models\Agent;
use Illuminate\Database\Eloquent\Factories\Factory;

class AgentFactory extends Factory
{
    protected $model = Agent::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->word(),
            'type' => $this->faker->randomElement([
                'planner', 'architect', 'coder', 'tester', 
                'reviewer', 'documentation', 'deployment', 'maintenance'
            ]),
            'description' => $this->faker->sentence(),
            'capabilities' => ['capability_1', 'capability_2'],
            'configuration' => [
                'model' => 'gpt-4',
                'temperature' => 0.7,
                'max_tokens' => 2000,
            ],
            'llm_provider' => 'copilot',
            'is_active' => true,
        ];
    }

    public function planner(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'zen_planner_' . $this->faker->randomNumber(),
            'type' => 'planner',
            'capabilities' => ['task_decomposition', 'dependency_analysis', 'risk_assessment'],
        ]);
    }

    public function coder(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'auto_zen_' . $this->faker->randomNumber(),
            'type' => 'coder',
            'capabilities' => ['code_generation', 'refactoring', 'debugging'],
        ]);
    }

    public function architect(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'zen_architect_' . $this->faker->randomNumber(),
            'type' => 'architect',
            'capabilities' => ['architecture_design', 'adrs', 'system_design'],
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function withOpenai(): static
    {
        return $this->state(fn (array $attributes) => [
            'llm_provider' => 'openai',
            'configuration' => [
                'model' => 'gpt-4',
                'api_key' => env('OPENAI_API_KEY'),
            ],
        ]);
    }
}
```

### ContextBundleFactory

```php
<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\ContextBundle;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContextBundleFactory extends Factory
{
    protected $model = ContextBundle::class;

    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'agent_id' => Agent::factory(),
            'bundle_type' => 'task_context',
            'files_included' => [
                'src/' . $this->faker->word() . '.ts',
                'src/test/' . $this->faker->word() . '.test.ts',
                'README.md',
            ],
            'architecture_notes' => null,
            'constraints' => [
                'max_tokens' => 8000,
                'timeout_seconds' => 300,
            ],
        ];
    }

    public function taskContext(): static
    {
        return $this->state(fn (array $attributes) => [
            'bundle_type' => 'task_context',
        ]);
    }

    public function architectureContext(): static
    {
        return $this->state(fn (array $attributes) => [
            'bundle_type' => 'architecture_context',
            'files_included' => [
                'docs/ARCHITECTURE.md',
                'docs/ADRs/*.md',
                'src/core/*.ts',
            ],
            'architecture_notes' => $this->faker->paragraph(),
        ]);
    }

    public function testContext(): static
    {
        return $this->state(fn (array $attributes) => [
            'bundle_type' => 'test_context',
            'files_included' => [
                'src/test/*.test.ts',
                'coverage/report.html',
            ],
            'test_failures' => [
                [
                    'test' => 'Example test',
                    'error' => 'Expected true but got false',
                ],
            ],
        ]);
    }

    public function issueContext(): static
    {
        return $this->state(fn (array $attributes) => [
            'bundle_type' => 'issue_context',
            'files_included' => [
                '.github/issue.md',
                'PR#123',
            ],
        ]);
    }

    public function withArchitectureNotes(): static
    {
        return $this->state(fn (array $attributes) => [
            'architecture_notes' => $this->faker->paragraph(5),
        ]);
    }
}
```

### UserFactory

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class UserFactory extends Factory
{
    protected $model = User::class;

    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => \Illuminate\Support\Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);
    }
}
```

### TaskExecutionFactory

```php
<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\Task;
use App\Models\TaskExecution;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskExecutionFactory extends Factory
{
    protected $model = TaskExecution::class;

    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'agent_id' => Agent::factory(),
            'status' => 'pending',
            'input_context' => [
                'task_id' => $this->faker->uuid(),
                'priority' => 'high',
            ],
            'output_result' => null,
            'error_message' => null,
            'duration_seconds' => null,
            'tokens_used' => null,
            'executed_at' => null,
        ];
    }

    public function success(): static
    {
        $duration = rand(30, 300);
        
        return $this->state(fn (array $attributes) => [
            'status' => 'success',
            'output_result' => [
                'code' => $this->faker->paragraph(),
                'explanation' => $this->faker->text(),
            ],
            'duration_seconds' => $duration,
            'tokens_used' => rand(100, 2000),
            'executed_at' => now()->subSeconds($duration),
        ]);
    }

    public function failure(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'failure',
            'error_message' => $this->faker->sentence(),
            'duration_seconds' => rand(10, 60),
            'executed_at' => now(),
        ]);
    }

    public function running(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'running',
            'executed_at' => now()->subMinutes(rand(1, 10)),
        ]);
    }
}
```

---

## ✅ Factory Usage Examples

### In Tests

```php
use Tests\TestCase;
use App\Models\Task;
use App\Models\Project;

class TaskTest extends TestCase
{
    public function test_can_create_task()
    {
        $task = Task::factory()->create();
        $this->assertNotNull($task->id);
    }

    public function test_can_create_multiple_tasks()
    {
        $tasks = Task::factory(5)->create();
        $this->assertCount(5, $tasks);
    }

    public function test_task_with_relationships()
    {
        $task = Task::factory()
            ->withSubtasks(3)
            ->completed()
            ->create();
        
        $this->assertCount(3, $task->subtasks);
        $this->assertEquals('completed', $task->status);
    }

    public function test_project_with_tasks()
    {
        $project = Project::factory()
            ->withTasks(10)
            ->create();
        
        $this->assertCount(10, $project->tasks);
    }
}
```

### In Seeders

```php
public function run(): void
{
    // Create 3 projects with 10 tasks each
    Project::factory(3)
        ->has(Task::factory(10))
        ->create();

    // Create specific types of tasks
    Task::factory(5)
        ->feature()
        ->highPriority()
        ->create();

    Task::factory(3)
        ->bugFix()
        ->completed()
        ->create();
}
```

---

## 🎯 Factory Best Practices

1. **Use state methods for variations**

   ```php
   Task::factory()->completed()->create();
   Task::factory()->highPriority()->inProgress()->create();
   ```

2. **Chain relationships**

   ```php
   Task::factory()
       ->withSubtasks(5)
       ->withGithubIssue()
       ->create();
   ```

3. **Override specific attributes**

   ```php
   Task::factory()->create([
       'name' => 'Custom task name',
       'priority' => 'critical',
   ]);
   ```

4. **Use sequences for bulk creation**

   ```php
   Task::factory(100)->sequence(
       ['priority' => 'high'],
       ['priority' => 'medium'],
       ['priority' => 'low'],
   )->create();
   ```

---

## 📝 Checklist

- [x] TaskFactory with all states
- [x] ProjectFactory with relationships
- [x] AgentFactory with types
- [x] ContextBundleFactory with bundle types
- [x] UserFactory for authentication
- [x] TaskExecutionFactory for tracking
- [x] Usage examples documented
- [x] Best practices provided

---

**Status:** ✅ **COMPLETE**

*All factories implemented and ready for testing and seeding.*
