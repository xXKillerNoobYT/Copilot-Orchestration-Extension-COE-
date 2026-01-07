# Database Schema Design — Complete Implementation Guide

**Date:** January 6, 2026  
**Status:** ✅ Implemented  
**Framework:** Laravel + Eloquent ORM  
**Database:** PostgreSQL / MySQL  

---

## 📋 Overview

Complete database schema for the Copilot Orchestration Extension, featuring:

- ✅ **24 tables** with proper relationships
- ✅ **UUID primary keys** for all tables
- ✅ **Foreign key constraints** with cascade operations
- ✅ **Soft deletes** for audit trail compliance
- ✅ **Comprehensive indexing** for performance
- ✅ **Eloquent models** with relationships and scopes
- ✅ **Factories** for testing and seeding
- ✅ **Seeders** for initial data

---

## 🗂️ Table Structure

### Core Tables

#### 1. **users** (Laravel default)

Stores application users and administrators.

**Fields:**

- `id` (uuid, primary)
- `name` (string)
- `email` (string, unique)
- `password` (hashed)
- `email_verified_at` (nullable timestamp)
- `created_at`, `updated_at` (timestamps)

**Indexes:**

- `email` (unique)

---

#### 2. **projects** (Primary entity)

Top-level project container for all orchestration work.

**Fields:**

- `id` (uuid, primary)
- `name` (string)
- `description` (text, nullable)
- `repository_type` (enum: git, svn, none)
- `repository_url` (string, nullable)
- `github_owner` (string, nullable)
- `github_repo` (string, nullable)
- `architecture_document` (text, nullable)
- `base_document` (text, nullable)
- `status` (enum: planning, active, paused, completed)
- `skill_level` (enum: beginner, intermediate, advanced, expert)
- `created_at`, `updated_at` (timestamps)
- `deleted_at` (nullable timestamp - soft delete)

**Relationships:**

- HasMany: tasks
- HasMany: branches
- HasMany: architecture_decisions
- HasMany: dependencies
- HasMany: ci_cd_pipelines
- HasMany: repository_health_metrics
- BelongsToMany: users (via project_users)

**Indexes:**

- `status`, `skill_level`, `created_at`

---

#### 3. **agents** (AI agent management)

Configurable AI agents that execute tasks.

**Fields:**

- `id` (uuid, primary)
- `name` (string, unique)
- `type` (enum: planner, architect, coder, tester, reviewer, documentation, deployment, maintenance)
- `description` (text, nullable)
- `capabilities` (json - array of capability strings)
- `configuration` (json - agent-specific settings)
- `llm_provider` (enum: copilot, local, cloud, openai, anthropic)
- `is_active` (boolean, default true)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- HasMany: task_executions
- HasMany: context_bundles
- HasMany: audit_logs

**Indexes:**

- `type`, `is_active`, `name`

**Example Agents:**

```json
{
  "name": "zen_planner",
  "type": "planner",
  "capabilities": ["task_decomposition", "dependency_analysis", "risk_assessment"],
  "llm_provider": "copilot"
}
```

---

#### 4. **tasks** (Core work units)

Individual tasks representing work to be completed.

**Fields:**

- `id` (uuid, primary)
- `project_id` (uuid, foreign key → projects)
- `parent_task_id` (uuid, nullable, foreign key → tasks, cascade)
- `github_issue_id` (integer, nullable)
- `github_issue_url` (string, nullable)
- `name` (string)
- `description` (text, nullable)
- `task_type` (enum: feature, bug, refactor, maintenance, architecture, testing, documentation)
- `priority` (enum: critical, high, medium, low)
- `status` (enum: pending, approved, in_progress, testing, review, completed, failed, blocked, cancelled)
- `assigned_agent` (string, nullable)
- `assigned_github_agent` (string, nullable)
- `branch_name` (string, nullable)
- `context_bundle_path` (string, nullable)
- `estimated_effort` (integer, nullable - minutes)
- `actual_effort` (integer, nullable - minutes)
- `started_at` (nullable timestamp)
- `completed_at` (nullable timestamp)
- `created_at`, `updated_at` (timestamps)
- `deleted_at` (nullable timestamp - soft delete)

**Relationships:**

- BelongsTo: project
- BelongsTo: parent_task
- HasMany: subtasks (as parent)
- HasMany: dependencies
- HasMany: executions
- HasMany: branches
- HasMany: context_bundles
- HasMany: workflow_states
- HasOne: github_issue
- HasMany: notifications
- HasMany: audit_logs
- HasMany: architecture_decisions
- HasMany: github_reviews

**Scopes:**

```php
$tasks->status('in_progress')
$tasks->priority('high')
$tasks->pending()
$tasks->inProgress()
$tasks->completed()
$tasks->highPriority()
```

**Indexes:**

- `(project_id, status)`, `(priority, status)`, `github_issue_id`, `parent_task_id`

---

#### 5. **task_dependencies** (Dependency graph)

Tracks task dependencies to prevent circular relationships.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `depends_on_task_id` (uuid, foreign key → tasks, cascade)
- `created_at` (timestamp)

**Relationships:**

- BelongsTo: task
- BelongsTo: depends_on_task (polymorphic)

**Indexes:**

- `(task_id, depends_on_task_id)` (composite, unique)

**Constraint:**

- Prevent circular dependencies at application level

---

#### 6. **branches** (Git branch tracking)

Tracks Git branches associated with tasks.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `project_id` (uuid, foreign key → projects, cascade)
- `branch_name` (string)
- `base_branch` (string, default: main)
- `github_branch_url` (string, nullable)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: task
- BelongsTo: project

**Indexes:**

- `(project_id, branch_name)` (composite, unique)

---

#### 7. **task_executions** (Execution log)

Records each agent execution attempt for audit trail.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `agent_id` (uuid, foreign key → agents, cascade)
- `status` (enum: pending, running, success, failure, timeout)
- `input_context` (json - execution parameters)
- `output_result` (json - execution results)
- `error_message` (text, nullable)
- `duration_seconds` (integer, nullable)
- `tokens_used` (integer, nullable - for LLM tracking)
- `executed_at` (nullable timestamp)
- `created_at` (timestamp)

**Relationships:**

- BelongsTo: task
- BelongsTo: agent

**Indexes:**

- `(task_id, status)`, `(agent_id, status)`, `executed_at`

---

#### 8. **context_bundles** (AI context management)

Pre-packaged context for agent execution.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `agent_id` (uuid, foreign key → agents, cascade)
- `bundle_type` (enum: task_context, architecture_context, test_context, issue_context)
- `files_included` (json - array of file paths)
- `architecture_notes` (text, nullable)
- `constraints` (json - constraints/limitations)
- `test_failures` (json - test failure details)
- `created_at` (timestamp)

**Relationships:**

- BelongsTo: task
- BelongsTo: agent

**Indexes:**

- `(task_id, bundle_type)`, `agent_id`

**Bundle Types:**

- `task_context` — Task description + related files
- `architecture_context` — Architecture diagrams + ADRs
- `test_context` — Test files + failure logs
- `issue_context` — GitHub issue + PR context

---

#### 9. **workflow_states** (State machine tracking)

Tracks task workflow transitions and state history.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `from_status` (string)
- `to_status` (string)
- `triggered_by` (string - agent name or user email)
- `reason` (text, nullable)
- `metadata` (json - transition context)
- `created_at` (timestamp)

**Relationships:**

- BelongsTo: task

**Indexes:**

- `(task_id, created_at)`

---

#### 10. **github_issues** (GitHub sync)

Mirrors GitHub issues linked to tasks.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `github_issue_number` (integer)
- `github_issue_url` (string)
- `title` (string)
- `body` (text)
- `state` (enum: open, closed)
- `labels` (json - array of label names)
- `assignees` (json - array of GitHub usernames)
- `created_at`, `updated_at` (timestamps)
- `synced_at` (nullable timestamp)

**Relationships:**

- BelongsTo: task
- HasMany: github_reviews

**Indexes:**

- `github_issue_number`, `(task_id, github_issue_number)`

---

#### 11. **github_reviews** (PR review tracking)

Tracks GitHub pull request reviews.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `github_issue_id` (uuid, foreign key → github_issues, cascade)
- `github_pr_number` (integer)
- `reviewer` (string - GitHub username)
- `status` (enum: pending, approved, requested_changes, commented)
- `comments` (text, nullable)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: task
- BelongsTo: github_issue

**Indexes:**

- `(github_pr_number, reviewer)`, `task_id`

---

#### 12. **architecture_decisions** (ADR tracking)

Architecture Decision Records for design decisions.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `project_id` (uuid, foreign key → projects, cascade)
- `title` (string)
- `status` (enum: proposed, accepted, deprecated, superseded)
- `context` (text)
- `decision` (text)
- `consequences` (text)
- `alternatives_considered` (text, nullable)
- `related_adr_id` (uuid, nullable, foreign key → architecture_decisions)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: task
- BelongsTo: project
- HasMany: related_adrs (polymorphic)

**Indexes:**

- `(project_id, status)`, `task_id`

---

#### 13. **dependencies** (Project dependencies)

Tracks external dependencies (npm, composer, etc.).

**Fields:**

- `id` (uuid, primary)
- `project_id` (uuid, foreign key → projects, cascade)
- `package_name` (string)
- `current_version` (string)
- `latest_version` (string, nullable)
- `dependency_type` (enum: npm, composer, pip, cargo, maven, other)
- `is_outdated` (boolean)
- `security_vulnerabilities` (json - vulnerability array)
- `checked_at` (nullable timestamp)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: project
- HasMany: module_dependencies

**Indexes:**

- `(project_id, package_name)` (composite, unique)

---

#### 14. **module_dependencies** (Internal module dependencies)

Tracks dependencies between internal modules.

**Fields:**

- `id` (uuid, primary)
- `project_id` (uuid, foreign key → projects, cascade)
- `from_module` (string)
- `to_module` (string)
- `dependency_type` (enum: requires, recommends, optional, conflicts)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: project

**Indexes:**

- `(from_module, to_module)`, `project_id`

---

#### 15. **ci_cd_pipelines** (Pipeline tracking)

Tracks CI/CD pipeline executions.

**Fields:**

- `id` (uuid, primary)
- `project_id` (uuid, foreign key → projects, cascade)
- `task_id` (uuid, nullable, foreign key → tasks, cascade)
- `pipeline_name` (string)
- `status` (enum: pending, running, success, failed, cancelled)
- `trigger_type` (enum: push, pull_request, manual, schedule)
- `branch` (string)
- `commit_sha` (string, nullable)
- `logs_url` (string, nullable)
- `duration_seconds` (integer, nullable)
- `triggered_at` (nullable timestamp)
- `completed_at` (nullable timestamp)
- `created_at` (timestamp)

**Relationships:**

- BelongsTo: project
- BelongsTo: task (nullable)

**Indexes:**

- `(project_id, status)`, `(pipeline_name, created_at)`

---

#### 16. **repository_health_metrics** (Health monitoring)

Tracks repository health metrics.

**Fields:**

- `id` (uuid, primary)
- `project_id` (uuid, foreign key → projects, cascade)
- `metric_name` (string)
- `metric_value` (decimal)
- `unit` (string)
- `threshold_warning` (decimal, nullable)
- `threshold_critical` (decimal, nullable)
- `status` (enum: healthy, warning, critical)
- `measured_at` (nullable timestamp)
- `created_at` (timestamp)

**Relationships:**

- BelongsTo: project

**Indexes:**

- `(project_id, metric_name, measured_at)`

**Example Metrics:**

- Code coverage percentage
- Cyclomatic complexity
- Technical debt ratio
- Test execution time
- Build time

---

#### 17. **notifications** (User notifications)

Application notifications for tasks and events.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `user_id` (uuid, foreign key → users, cascade)
- `type` (enum: task_assigned, task_completed, task_blocked, review_requested, deployment_ready)
- `message` (text)
- `is_read` (boolean, default false)
- `read_at` (nullable timestamp)
- `created_at` (timestamp)

**Relationships:**

- BelongsTo: task
- BelongsTo: user

**Indexes:**

- `(user_id, is_read)`, `(task_id, created_at)`

---

#### 18. **audit_logs** (Comprehensive audit trail)

Complete audit trail for compliance and debugging.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, nullable, foreign key → tasks, cascade)
- `agent_id` (uuid, nullable, foreign key → agents, cascade)
- `user_id` (uuid, nullable, foreign key → users, cascade)
- `action` (string - action name: created, updated, deleted, executed, etc.)
- `model_type` (string - model class name)
- `model_id` (uuid - affected entity ID)
- `old_values` (json, nullable)
- `new_values` (json)
- `ip_address` (string, nullable)
- `user_agent` (string, nullable)
- `created_at` (timestamp)

**Relationships:**

- BelongsTo: task (nullable)
- BelongsTo: agent (nullable)
- BelongsTo: user (nullable)

**Indexes:**

- `(model_type, model_id, created_at)`, `user_id`, `agent_id`

---

#### 19. **project_users** (Project membership)

Maps users to projects with roles.

**Fields:**

- `id` (uuid, primary)
- `project_id` (uuid, foreign key → projects, cascade)
- `user_id` (uuid, foreign key → users, cascade)
- `role` (enum: owner, admin, developer, viewer)
- `permissions` (json - granular permissions array)
- `joined_at` (timestamp)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: project
- BelongsTo: user

**Indexes:**

- `(project_id, user_id)` (composite, unique)

---

#### 20. **architecture_designs** (Design documents)

Architecture design documents and specs.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `title` (string)
- `description` (text)
- `design_type` (enum: system_architecture, database_schema, api_design, component_architecture)
- `diagram_url` (string, nullable)
- `status` (enum: draft, review, approved, implemented)
- `reviewed_by` (string, nullable)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: task

**Indexes:**

- `(task_id, design_type)`, `status`

---

#### 21. **project_memory** (Project context memory)

Persistent memory for project context and learnings.

**Fields:**

- `id` (uuid, primary)
- `project_id` (uuid, foreign key → projects, cascade)
- `memory_type` (enum: decision, lesson_learned, architectural_constraint, known_issue)
- `title` (string)
- `content` (text)
- `importance` (enum: low, medium, high, critical)
- `related_tasks` (json - array of task IDs)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: project

**Indexes:**

- `(project_id, memory_type)`, `importance`

---

#### 22. **task_plans** (Execution plans)

Detailed execution plans for complex tasks.

**Fields:**

- `id` (uuid, primary)
- `task_id` (uuid, foreign key → tasks, cascade)
- `title` (string)
- `steps` (json - array of step objects)
- `estimated_duration` (integer - minutes)
- `success_criteria` (json - array of criteria)
- `risk_assessment` (text, nullable)
- `created_at`, `updated_at` (timestamps)

**Relationships:**

- BelongsTo: task

---

#### 23. **personal_access_tokens** (Laravel Sanctum)

API token authentication for headless integration.

**Fields:**

- `id` (uuid, primary)
- `tokenable_type` (string)
- `tokenable_id` (uuid)
- `name` (string)
- `token` (string, unique, hashed)
- `abilities` (json - token scopes)
- `last_used_at` (nullable timestamp)
- `expires_at` (nullable timestamp)
- `created_at`, `updated_at` (timestamps)

---

#### 24. **failed_jobs** (Queue failures)

Failed job tracking for asynchronous task processing.

**Fields:**

- `id` (uuid, primary)
- `uuid` (string, unique)
- `connection` (string)
- `queue` (string)
- `payload` (json)
- `exception` (text)
- `failed_at` (timestamp)

---

## 🔗 Relationship Diagram

```
users
  ├── HasMany: project_users
  ├── HasMany: notifications (received)
  ├── HasMany: audit_logs (performed by)

projects
  ├── HasMany: tasks
  ├── HasMany: branches
  ├── HasMany: architecture_decisions
  ├── HasMany: dependencies
  ├── HasMany: module_dependencies
  ├── HasMany: ci_cd_pipelines
  ├── HasMany: repository_health_metrics
  ├── HasMany: project_memory
  ├── BelongsToMany: users (via project_users)

tasks
  ├── BelongsTo: project
  ├── BelongsTo: parent_task
  ├── HasMany: subtasks
  ├── HasMany: task_dependencies
  ├── HasMany: task_executions
  ├── HasMany: branches
  ├── HasMany: context_bundles
  ├── HasMany: workflow_states
  ├── HasOne: github_issue
  ├── HasMany: github_reviews
  ├── HasMany: architecture_decisions
  ├── HasMany: architecture_designs
  ├── HasMany: task_plans
  ├── HasMany: notifications
  ├── HasMany: audit_logs

agents
  ├── HasMany: task_executions
  ├── HasMany: context_bundles
  ├── HasMany: audit_logs (performed by)

github_issues
  ├── BelongsTo: task
  ├── HasMany: github_reviews
```

---

## 🏗️ Eloquent Model Best Practices

### 1. **Type Casting**

```php
protected $casts = [
    'capabilities' => 'array',
    'files_included' => 'array',
    'created_at' => 'datetime',
    'updated_at' => 'datetime',
    'deleted_at' => 'datetime',
    'is_active' => 'boolean',
];
```

### 2. **Scopes**

```php
// Usage: Task::pending()->inProgress()->with('project')
public function scopePending($query) {
    return $query->where('status', 'pending');
}

public function scopeHighPriority($query) {
    return $query->whereIn('priority', ['critical', 'high']);
}

public function scopeForProject($query, $projectId) {
    return $query->where('project_id', $projectId);
}
```

### 3. **Eager Loading**

```php
// Prevent N+1 queries
$tasks = Task::with([
    'project',
    'subtasks',
    'dependencies.task',
    'executions.agent',
    'contextBundles'
])->get();
```

### 4. **Relationships**

```php
// Use HasMany correctly
public function subtasks(): HasMany {
    return $this->hasMany(Task::class, 'parent_task_id');
}

// Use custom foreign keys
public function parentTask(): BelongsTo {
    return $this->belongsTo(Task::class, 'parent_task_id');
}
```

### 5. **Attributes & Accessors**

```php
protected $appends = ['is_overdue', 'cycle_time'];

public function getIsOverdueAttribute(): bool {
    return $this->completed_at === null && 
           $this->completed_at?->isPast();
}

public function getCycleTimeAttribute(): ?int {
    if (!$this->started_at || !$this->completed_at) {
        return null;
    }
    return $this->started_at->diffInMinutes($this->completed_at);
}
```

---

## 🔍 Indexing Strategy

### Composite Indexes (High Priority)

```sql
-- Task lookup patterns
CREATE INDEX idx_task_project_status ON tasks(project_id, status);
CREATE INDEX idx_task_priority_status ON tasks(priority, status);
CREATE INDEX idx_task_dependency ON task_dependencies(task_id, depends_on_task_id);

-- Branch tracking
CREATE INDEX idx_branch_project_name ON branches(project_id, branch_name);

-- Execution logging
CREATE INDEX idx_execution_task_status ON task_executions(task_id, status);
CREATE INDEX idx_execution_agent_status ON task_executions(agent_id, status);

-- GitHub sync
CREATE INDEX idx_github_issue_task ON github_issues(task_id, github_issue_number);

-- Audit trail
CREATE INDEX idx_audit_model ON audit_logs(model_type, model_id, created_at);

-- Workflow tracking
CREATE INDEX idx_workflow_task ON workflow_states(task_id, created_at);
```

### Single Indexes

```sql
-- Lookups
CREATE UNIQUE INDEX idx_agent_name ON agents(name);
CREATE UNIQUE INDEX idx_branch_unique ON branches(project_id, branch_name);
CREATE INDEX idx_dependency_package ON dependencies(project_id, package_name);

-- Foreign keys
CREATE INDEX idx_github_issue_number ON github_issues(github_issue_number);
CREATE INDEX idx_ci_cd_pipeline_status ON ci_cd_pipelines(status);

-- Notification queries
CREATE INDEX idx_notification_user_read ON notifications(user_id, is_read);
```

---

## 📊 Factory Examples

### TaskFactory

```php
<?php

namespace Database\Factories;

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
            'name' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'task_type' => $this->faker->randomElement([
                'feature', 'bug', 'refactor', 'maintenance', 
                'architecture', 'testing', 'documentation'
            ]),
            'priority' => $this->faker->randomElement(['critical', 'high', 'medium', 'low']),
            'status' => 'pending',
            'estimated_effort' => $this->faker->numberBetween(30, 480),
        ];
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
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'started_at' => now()->subDays(rand(1, 30)),
            'completed_at' => now(),
            'actual_effort' => $attributes['estimated_effort'] * rand(80, 150) / 100,
        ]);
    }

    public function highPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => 'high',
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
            'bundle_type' => $this->faker->randomElement([
                'task_context', 'architecture_context', 
                'test_context', 'issue_context'
            ]),
            'files_included' => [
                'src/example.ts',
                'src/test/example.test.ts',
                'README.md',
            ],
            'created_at' => now(),
        ];
    }

    public function withArchitectureNotes(): static
    {
        return $this->state(fn (array $attributes) => [
            'bundle_type' => 'architecture_context',
            'architecture_notes' => $this->faker->paragraph(),
        ]);
    }
}
```

---

## 🌱 Seeder Examples

### DatabaseSeeder

```php
<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create users
        $users = User::factory(5)->create();

        // Create agents
        $agents = [
            [
                'name' => 'zen_planner',
                'type' => 'planner',
                'capabilities' => ['task_decomposition', 'dependency_analysis'],
                'llm_provider' => 'copilot',
            ],
            [
                'name' => 'auto_zen',
                'type' => 'coder',
                'capabilities' => ['code_generation', 'refactoring'],
                'llm_provider' => 'copilot',
            ],
            [
                'name' => 'zen_architect',
                'type' => 'architect',
                'capabilities' => ['architecture_design', 'adrs'],
                'llm_provider' => 'copilot',
            ],
        ];

        foreach ($agents as $agent) {
            Agent::create($agent);
        }

        // Create projects with tasks
        Project::factory(3)
            ->has(Task::factory(10))
            ->create();
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
                'description' => 'Breaks down complex projects into manageable tasks',
                'capabilities' => json_encode(['task_decomposition', 'dependency_analysis', 'risk_assessment']),
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'auto_zen',
                'type' => 'coder',
                'description' => 'Autonomous coding agent for implementation',
                'capabilities' => json_encode(['code_generation', 'refactoring', 'testing']),
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'zen_architect',
                'type' => 'architect',
                'description' => 'Architecture design and decision records',
                'capabilities' => json_encode(['architecture_design', 'adrs', 'system_design']),
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

---

## 🚀 Migration Checklist

### Before Running Migrations

- [ ] Set up database credentials in `.env`
- [ ] Create database: `php artisan db:create`
- [ ] Review all migrations for accuracy
- [ ] Backup existing database (if upgrading)

### Running Migrations

```bash
# Run all migrations
php artisan migrate

# Specific migration
php artisan migrate --path=database/migrations/2026_01_02_071351_create_tasks_table.php

# Rollback
php artisan migrate:rollback

# Refresh (rollback + migrate)
php artisan migrate:refresh

# Refresh with seeding
php artisan migrate:refresh --seed
```

### After Migrations

- [ ] Verify table structure: `php artisan tinker` → `Schema::getTables()`
- [ ] Seed initial data: `php artisan db:seed`
- [ ] Run tests: `phpunit`
- [ ] Check indexes: Database IDE or `SHOW INDEX FROM table_name`

---

## 🧪 Testing

### Feature Test Example

```php
<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_task()
    {
        $project = Project::factory()->create();
        $task = Task::factory()->create(['project_id' => $project->id]);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'project_id' => $project->id,
        ]);
    }

    public function test_task_relationships()
    {
        $task = Task::factory()
            ->has(Task::factory(3), 'subtasks')
            ->create();

        $this->assertCount(3, $task->subtasks);
    }

    public function test_task_scopes()
    {
        Task::factory(5)->create(['status' => 'pending']);
        Task::factory(3)->create(['status' => 'in_progress']);

        $this->assertCount(5, Task::pending()->get());
        $this->assertCount(3, Task::inProgress()->get());
    }
}
```

---

## 📈 Performance Optimization

### Query Optimization

```php
// ❌ N+1 problem
$tasks = Task::all();
foreach ($tasks as $task) {
    echo $task->project->name; // Query on every iteration
}

// ✅ Eager loading
$tasks = Task::with('project')->get();
foreach ($tasks as $task) {
    echo $task->project->name; // Already loaded
}
```

### Pagination

```php
// For large task lists
$tasks = Task::with('project', 'subtasks')
    ->paginate(15);

// In API responses
return TaskResource::collection($tasks);
```

### Caching

```php
// Cache agent list (changes infrequently)
$agents = Cache::remember('agents.active', 3600, function () {
    return Agent::active()->get();
});
```

---

## ✅ Acceptance Criteria

- [x] All 24 tables created with proper schema
- [x] Relationships defined in Eloquent models
- [x] Foreign key constraints with cascade operations
- [x] Soft deletes implemented for audit compliance
- [x] Comprehensive indexing for performance
- [x] Factories for testing (5+ factories)
- [x] Seeders for initial data
- [x] Best practices documented
- [x] Query optimization patterns
- [x] Testing examples provided

---

## 📚 Files

| File | Purpose |
|------|---------|
| `database/migrations/*` | All 24 table migrations |
| `app/Models/*` | All 22 Eloquent models with relationships |
| `database/factories/*` | Test data factories |
| `database/seeders/*` | Initial data seeders |

---

**Status:** ✅ **COMPLETE AND READY FOR PRODUCTION**

*Database schema fully implemented with comprehensive documentation and best practices.*
