# Database Quick Reference Guide

**For rapid development & debugging**

---

## 🚀 Common Commands

```bash
# Create new table
php artisan make:migration create_table_name_table

# Create model with migration and factory
php artisan make:model ModelName -mf

# Run migrations
php artisan migrate

# Rollback last batch
php artisan migrate:rollback

# Reset all and re-run
php artisan migrate:refresh --seed

# Seed database
php artisan db:seed --class=SeederName

# Create factory
php artisan make:factory NameFactory

# Create seeder
php artisan make:seeder NameSeeder

# Tinker shell
php artisan tinker
```

---

## 📦 Model Quick Access

### Task

```php
Task::pending()->with('project')->paginate(15)
Task::where('priority', 'critical')->inProgress()
Task::find($id)->subtasks()->completed()
$task->cycleTime() // Minutes from start to completion
$task->progressPercentage() // For parent with subtasks
```

### Project

```php
Project::active()->with('tasks')->get()
Project::find($id)->activeTasks()
Project::find($id)->highPriorityTasks()
```

### Agent

```php
Agent::active()->ofType('coder')->get()
Agent::find($id)->successRate() // Percentage
Agent::find($id)->averageExecutionTime() // Seconds
```

### User

```php
User::with('projects.tasks')->get()
User::find($id)->projects()->pluck('name')
```

---

## 🏗️ Factory Quick Examples

```php
// Single task
$task = Task::factory()->create();

// Multiple tasks
$tasks = Task::factory(5)->create();

// With state
$task = Task::factory()->completed()->create();

// Chained states
$task = Task::factory()
    ->feature()
    ->highPriority()
    ->completed()
    ->create();

// With relationships
$project = Project::factory()
    ->has(Task::factory(10))
    ->create();

// Override attributes
Task::factory()->create([
    'name' => 'Custom task',
    'priority' => 'critical',
]);

// Count with state
Task::factory(10)
    ->pending()
    ->create();
```

---

## 🌱 Seeder Quick Examples

```bash
# Run all seeders
php artisan db:seed

# Run specific seeder
php artisan db:seed --class=AgentSeeder

# Refresh and seed
php artisan migrate:refresh --seed
```

---

## 🔍 Query Examples

### Complex Queries

```php
// Task with all relationships
Task::with([
    'project',
    'parentTask',
    'subtasks',
    'dependencies.task',
    'executions.agent',
    'contextBundles',
    'workflowStates',
    'githubIssue',
])->find($id);

// All team members of a project
$project->users()->with('notifications')->get();

// Blocked tasks with their blockers
Task::where('status', 'blocked')
    ->with(['dependencies' => function ($q) {
        $q->where('status', '!=', 'completed');
    }])
    ->get();

// Agent performance
Agent::find($id)
    ->taskExecutions()
    ->where('status', 'success')
    ->avgTime('duration_seconds');

// Task timeline
Task::where('project_id', $projectId)
    ->whereBetween('created_at', [$start, $end])
    ->orderBy('created_at')
    ->get();
```

### Aggregations

```php
// Count tasks by status
Task::groupBy('status')
    ->selectRaw('status, count(*) as count')
    ->get();

// Average effort by task type
Task::groupBy('task_type')
    ->selectRaw('task_type, avg(estimated_effort) as avg_effort')
    ->get();

// High priority tasks this week
Task::where('priority', 'high')
    ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
    ->count();
```

---

## 🧪 Testing Quick Examples

```php
use App\Models\Task;
use Tests\TestCase;

class TaskTest extends TestCase
{
    public function test_task_creation()
    {
        $task = Task::factory()->create();
        $this->assertInstanceOf(Task::class, $task);
    }

    public function test_task_relationships()
    {
        $task = Task::factory()
            ->has(Task::factory(3), 'subtasks')
            ->create();
        
        $this->assertCount(3, $task->subtasks);
    }

    public function test_task_scope()
    {
        Task::factory(5)->create(['status' => 'pending']);
        $this->assertCount(5, Task::pending()->get());
    }
}
```

---

## 📊 Table Lookup Reference

| Table | ID | Key Queries |
|-------|----|----|
| tasks | uuid | `Task::where('status', 'pending')` |
| projects | uuid | `Project::active()` |
| agents | uuid | `Agent::active()->ofType('coder')` |
| users | uuid | `User::where('email', $email)` |
| branches | uuid | `Branch::where('project_id', $id)` |
| task_executions | uuid | `TaskExecution::where('status', 'success')` |
| github_issues | uuid | `GithubIssue::where('github_issue_number', $num)` |
| workflow_states | uuid | `WorkflowState::where('task_id', $id)` |

---

## 🔧 Debugging

### Check Table Structure

```php
use Illuminate\Support\Facades\Schema;

// List all tables
Schema::getTables();

// Get columns for table
Schema::getColumns('tasks');

// Check if table exists
Schema::hasTable('tasks'); // true

// Check if column exists
Schema::hasColumn('tasks', 'status'); // true
```

### View Query Log

```php
DB::enableQueryLog();
Task::where('status', 'pending')->get();
dd(DB::getQueryLog());
```

### Check Relationships

```php
$task = Task::find($id);
$task->load('project'); // Lazy load
$task->project; // Access
```

---

## 🎯 Common Patterns

### Soft Delete Pattern

```php
// Soft delete
$task->delete(); // Sets deleted_at

// Restore
$task->restore(); // Clears deleted_at

// Query without soft-deleted
Task::withoutTrashed()->get();

// Only soft-deleted
Task::onlyTrashed()->get();

// Force delete
$task->forceDelete();
```

### Transaction Pattern

```php
DB::transaction(function () {
    $task = Task::create([...]);
    $task->subtasks()->create([...]);
    // Both succeed or both rollback
});
```

### Chunk Large Datasets

```php
// Process 100 at a time
Task::chunk(100, function ($tasks) {
    foreach ($tasks as $task) {
        // Process
    }
});
```

---

## 📈 Performance Tips

```php
// ✅ Eager loading (1 query per relationship)
Task::with('project', 'subtasks')->get();

// ❌ Lazy loading (N+1 problem)
Task::all();
foreach ($tasks as $task) {
    echo $task->project->name; // Query per iteration
}

// ✅ Pagination
Task::paginate(15);

// ❌ Loading all rows
Task::all();

// ✅ Pluck single column
Task::pluck('id');

// ❌ Select all then extract
Task::all()->pluck('id');
```

---

## 🔑 Key Field Reference

| Model | Primary Key | Key Foreign Keys |
|-------|-------------|-----------------|
| Task | id (uuid) | project_id, parent_task_id |
| Project | id (uuid) | — |
| Agent | id (uuid) | — |
| Branch | id (uuid) | task_id, project_id |
| TaskExecution | id (uuid) | task_id, agent_id |
| ContextBundle | id (uuid) | task_id, agent_id |
| WorkflowState | id (uuid) | task_id |
| GithubIssue | id (uuid) | task_id |

---

## 💡 Enum Reference

### Task Status

`pending` | `approved` | `in_progress` | `testing` | `review` | `completed` | `failed` | `blocked` | `cancelled`

### Task Priority

`critical` | `high` | `medium` | `low`

### Task Type

`feature` | `bug` | `refactor` | `maintenance` | `architecture` | `testing` | `documentation`

### Agent Type

`planner` | `architect` | `coder` | `tester` | `reviewer` | `documentation` | `deployment` | `maintenance`

### Execution Status

`pending` | `running` | `success` | `failure` | `timeout`

---

## 🚨 Common Issues

### "Table doesn't exist"

```bash
php artisan migrate
# Check: php artisan migrate:status
```

### "Class not found"

```bash
composer dump-autoload
```

### "Foreign key constraint fails"

- Check parent record exists before inserting
- Check cascade delete settings

### "N+1 query problem"

- Use: `Model::with('relationship')->get()`
- Not: `Model::all()` then access relations

---

**Updated:** January 6, 2026  
**Status:** ✅ Complete
