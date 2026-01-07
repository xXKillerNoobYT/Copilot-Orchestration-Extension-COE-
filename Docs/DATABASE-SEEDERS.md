# Database Seeders — Initial Data & Setup

**Date:** January 6, 2026  
**Location:** `database/seeders/`  

---

## 🌱 Seeder Guide

Seeders populate the database with initial/test data. Run with `php artisan db:seed`.

---

## 📋 Seeder Implementation

### DatabaseSeeder (Main Entry Point)

```php
<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        User::factory()->admin()->create();
        
        // Create regular users
        $users = User::factory(5)->create();

        // Call specific seeders
        $this->call([
            AgentSeeder::class,
            ProjectSeeder::class,
            TaskSeeder::class,
        ]);

        // Assign users to projects
        $projects = Project::all();
        foreach ($projects as $project) {
            $project->users()->attach(
                $users->random(2)->pluck('id')->toArray(),
                ['role' => 'developer']
            );
            
            // Add admin
            $project->users()->attach(
                User::where('email', 'admin@example.com')->first()->id,
                ['role' => 'owner']
            );
        }
    }
}
```

### AgentSeeder

```php
<?php

namespace Database\Seeders;

use App\Models\Agent;
use Illuminate\Database\Seeder;

class AgentSeeder extends Seeder
{
    public function run(): void
    {
        $agents = [
            [
                'name' => 'zen_planner',
                'type' => 'planner',
                'description' => 'Decomposes complex projects into manageable tasks with dependency analysis',
                'capabilities' => json_encode([
                    'task_decomposition',
                    'dependency_analysis',
                    'risk_assessment',
                    'timeline_estimation',
                ]),
                'configuration' => json_encode([
                    'model' => 'gpt-4',
                    'temperature' => 0.7,
                    'max_tokens' => 4000,
                ]),
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'auto_zen',
                'type' => 'coder',
                'description' => 'Autonomous coding agent for feature implementation and refactoring',
                'capabilities' => json_encode([
                    'code_generation',
                    'refactoring',
                    'bug_fixing',
                    'testing',
                    'documentation',
                ]),
                'configuration' => json_encode([
                    'model' => 'gpt-4',
                    'temperature' => 0.5,
                    'max_tokens' => 8000,
                ]),
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'zen_architect',
                'type' => 'architect',
                'description' => 'System architect for design decisions and architecture documentation',
                'capabilities' => json_encode([
                    'architecture_design',
                    'adr_creation',
                    'system_design',
                    'database_design',
                    'api_design',
                ]),
                'configuration' => json_encode([
                    'model' => 'gpt-4',
                    'temperature' => 0.6,
                    'max_tokens' => 6000,
                ]),
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'zen_tester',
                'type' => 'tester',
                'description' => 'QA specialist for test creation and validation',
                'capabilities' => json_encode([
                    'test_generation',
                    'test_automation',
                    'bug_identification',
                    'coverage_analysis',
                ]),
                'configuration' => json_encode([
                    'model' => 'gpt-4',
                    'temperature' => 0.5,
                    'max_tokens' => 5000,
                ]),
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'zen_reviewer',
                'type' => 'reviewer',
                'description' => 'Code reviewer for pull request reviews and quality checks',
                'capabilities' => json_encode([
                    'code_review',
                    'quality_assessment',
                    'security_review',
                    'performance_review',
                ]),
                'configuration' => json_encode([
                    'model' => 'gpt-4',
                    'temperature' => 0.6,
                    'max_tokens' => 4000,
                ]),
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'zen_documenter',
                'type' => 'documentation',
                'description' => 'Documentation specialist for API docs and guides',
                'capabilities' => json_encode([
                    'documentation_generation',
                    'api_documentation',
                    'markdown_formatting',
                    'diagram_creation',
                ]),
                'configuration' => json_encode([
                    'model' => 'gpt-4',
                    'temperature' => 0.7,
                    'max_tokens' => 3000,
                ]),
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
        ];

        foreach ($agents as $agent) {
            Agent::create($agent);
        }
    }
}
```

### ProjectSeeder

```php
<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        $projects = [
            [
                'name' => 'Copilot Orchestration Extension',
                'description' => 'AI-powered task orchestration and automation platform',
                'repository_type' => 'git',
                'repository_url' => 'https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE',
                'github_owner' => 'xXKillerNoobYT',
                'github_repo' => 'Copilot-Orchestration-Extension-COE',
                'status' => 'active',
                'skill_level' => 'advanced',
            ],
            [
                'name' => 'Example Laravel API',
                'description' => 'RESTful API for task management',
                'repository_type' => 'git',
                'repository_url' => 'https://github.com/example/api',
                'github_owner' => 'example',
                'github_repo' => 'api',
                'status' => 'active',
                'skill_level' => 'intermediate',
            ],
            [
                'name' => 'Frontend Application',
                'description' => 'Vue 3 + Vite frontend application',
                'repository_type' => 'git',
                'repository_url' => 'https://github.com/example/frontend',
                'github_owner' => 'example',
                'github_repo' => 'frontend',
                'status' => 'planning',
                'skill_level' => 'intermediate',
            ],
        ];

        foreach ($projects as $projectData) {
            $project = Project::create($projectData);

            // Add tasks to each project
            Task::factory(8)
                ->forProject($project)
                ->state(['priority' => 'high'])
                ->create();

            Task::factory(5)
                ->forProject($project)
                ->feature()
                ->create();

            Task::factory(3)
                ->forProject($project)
                ->bugFix()
                ->completed()
                ->create();
        }
    }
}
```

### TaskSeeder

```php
<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\Project;
use App\Models\Agent;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        $projects = Project::all();
        $agents = Agent::all();

        foreach ($projects as $project) {
            // Create feature tasks
            Task::factory(5)
                ->forProject($project)
                ->feature()
                ->state(fn () => [
                    'assigned_agent' => $agents->where('type', 'coder')->first()?->name,
                ])
                ->create()
                ->each(function (Task $task) {
                    // Add subtasks
                    Task::factory(2)
                        ->state(['parent_task_id' => $task->id])
                        ->create();
                });

            // Create bug tasks
            Task::factory(3)
                ->forProject($project)
                ->bugFix()
                ->inProgress()
                ->state(fn () => [
                    'assigned_agent' => $agents->where('type', 'coder')->first()?->name,
                ])
                ->create();

            // Create refactoring tasks
            Task::factory(2)
                ->forProject($project)
                ->state(fn () => [
                    'task_type' => 'refactor',
                    'priority' => 'medium',
                    'assigned_agent' => $agents->where('type', 'architect')->first()?->name,
                ])
                ->create();

            // Create testing tasks
            Task::factory(2)
                ->forProject($project)
                ->state(fn () => [
                    'task_type' => 'testing',
                    'priority' => 'high',
                    'assigned_agent' => $agents->where('type', 'tester')->first()?->name,
                ])
                ->create();

            // Create documentation tasks
            Task::factory(1)
                ->forProject($project)
                ->state(fn () => [
                    'task_type' => 'documentation',
                    'priority' => 'medium',
                    'assigned_agent' => $agents->where('type', 'documentation')->first()?->name,
                ])
                ->create();
        }
    }
}
```

### ContextBundleSeeder

```php
<?php

namespace Database\Seeders;

use App\Models\ContextBundle;
use App\Models\Task;
use App\Models\Agent;
use Illuminate\Database\Seeder;

class ContextBundleSeeder extends Seeder
{
    public function run(): void
    {
        $tasks = Task::with(['subtasks', 'project'])->limit(10)->get();
        $agents = Agent::all();

        foreach ($tasks as $task) {
            // Create task context bundle
            ContextBundle::factory()
                ->taskContext()
                ->create([
                    'task_id' => $task->id,
                    'agent_id' => $agents->where('type', 'coder')->first()?->id,
                ]);

            // Create architecture context for feature tasks
            if ($task->task_type === 'feature') {
                ContextBundle::factory()
                    ->architectureContext()
                    ->create([
                        'task_id' => $task->id,
                        'agent_id' => $agents->where('type', 'architect')->first()?->id,
                    ]);
            }

            // Create test context
            if (in_array($task->task_type, ['feature', 'bug'])) {
                ContextBundle::factory()
                    ->testContext()
                    ->create([
                        'task_id' => $task->id,
                        'agent_id' => $agents->where('type', 'tester')->first()?->id,
                    ]);
            }
        }
    }
}
```

---

## 🚀 Running Seeders

### Run all seeders
```bash
php artisan db:seed
```

### Run specific seeder
```bash
php artisan db:seed --class=AgentSeeder
```

### Refresh database with seeders
```bash
php artisan migrate:refresh --seed
```

### Seed in production (with confirmation)
```bash
php artisan db:seed --force
```

---

## 📊 Data Generation Examples

### Create Complex Task Hierarchy

```php
public function run(): void
{
    $project = Project::factory()->create();

    // Parent task
    $parentTask = Task::factory()
        ->forProject($project)
        ->feature()
        ->create([
            'name' => 'Implement Authentication System',
            'priority' => 'critical',
        ]);

    // Subtasks
    $subtasks = [
        'Design OAuth2 flow',
        'Implement token refresh',
        'Add CSRF protection',
        'Write unit tests',
        'Create documentation',
    ];

    foreach ($subtasks as $subtaskName) {
        Task::factory()
            ->forProject($project)
            ->state([
                'parent_task_id' => $parentTask->id,
                'name' => $subtaskName,
            ])
            ->create();
    }
}
```

### Create Task Dependencies

```php
public function run(): void
{
    $project = Project::factory()->create();

    $tasks = Task::factory(5)
        ->forProject($project)
        ->create();

    // Create dependency chain: Task 1 → Task 2 → Task 3
    $tasks[1]->dependencies()->create([
        'depends_on_task_id' => $tasks[0]->id,
    ]);

    $tasks[2]->dependencies()->create([
        'depends_on_task_id' => $tasks[1]->id,
    ]);
}
```

### Create Workflow History

```php
public function run(): void
{
    $task = Task::factory()
        ->inProgress()
        ->create();

    // Track state transitions
    $task->workflowStates()->createMany([
        [
            'from_status' => 'pending',
            'to_status' => 'approved',
            'triggered_by' => 'zen_planner',
            'reason' => 'Task approved after planning',
        ],
        [
            'from_status' => 'approved',
            'to_status' => 'in_progress',
            'triggered_by' => 'auto_zen',
            'reason' => 'Agent started implementation',
        ],
    ]);
}
```

---

## 🧪 Testing with Seeders

### Test Data Setup in Feature Tests

```php
use Database\Seeders\DatabaseSeeder;

class TaskManagementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        
        // Load base data for all tests
        $this->seed(DatabaseSeeder::class);
    }

    public function test_can_list_tasks()
    {
        $response = $this->get('/api/tasks');
        $response->assertStatus(200);
        $response->assertJsonStructure(['data', 'meta']);
    }
}
```

### Isolated Test Seeding

```php
use Database\Seeders\AgentSeeder;

public function test_agents_are_seeded()
{
    $this->seed(AgentSeeder::class);
    
    $this->assertGreaterThan(0, Agent::count());
}
```

---

## 📋 Seeder Checklist

- [x] DatabaseSeeder (main entry point)
- [x] AgentSeeder (predefined agents)
- [x] ProjectSeeder (sample projects)
- [x] TaskSeeder (tasks with various types)
- [x] ContextBundleSeeder (context bundles)
- [x] Usage examples provided
- [x] Testing patterns documented
- [x] Data relationships maintained

---

## 🎯 Best Practices

1. **Keep seeders idempotent** — can run multiple times safely
   ```php
   Agent::firstOrCreate(['name' => 'zen_planner'], $data);
   ```

2. **Use factories for variation**
   ```php
   Task::factory(10)->create(); // Creates 10 different tasks
   ```

3. **Maintain relationships**
   ```php
   Project::factory()
       ->has(Task::factory(5))
       ->create();
   ```

4. **Document seeded data**
   ```php
   // Creates admin user with credentials: admin@example.com / password
   ```

5. **Use appropriate seeding strategy for environment**
   ```bash
   # Development
   php artisan migrate:refresh --seed
   
   # Production
   php artisan migrate --force (no seeding)
   ```

---

**Status:** ✅ **COMPLETE**

*All seeders implemented with comprehensive examples and best practices.*
