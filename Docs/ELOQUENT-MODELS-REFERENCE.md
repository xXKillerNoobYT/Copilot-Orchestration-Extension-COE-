# Eloquent Models & Relationships — Complete Reference

**Date:** January 6, 2026  
**Status:** ✅ Implemented  

---

## 📦 Model Registry

### Core Domain Models

#### 1. **User** (Authentication)

```php
use HasMany: notifications, audit_logs
use BelongsToMany: projects (via project_users)
```

**Key Methods:**

```php
$user->projects()           // All projects user is member of
$user->notifications()      // User's notifications
$user->hasRole('admin')     // Role checking
```

---

#### 2. **Project** (Top-level entity)

```php
use HasMany: tasks, branches, architecture_decisions, dependencies, 
            module_dependencies, ci_cd_pipelines, 
            repository_health_metrics, project_memory
use BelongsToMany: users (via project_users)
```

**Key Methods:**

```php
$project->activeTasks()         // Tasks not completed/cancelled
$project->highPriorityTasks()   // Critical + High priority
$project->blockedTasks()        // Blocked tasks
$project->overallHealth()       // Repository health score
```

---

#### 3. **Task** (Core work unit)

```php
use BelongsTo: project, parent_task
use HasMany: subtasks, dependencies, executions, branches,
            context_bundles, workflow_states, notifications,
            audit_logs, architecture_decisions, github_reviews
use HasOne: github_issue
use HasManyThrough: project->users (team members)
```

**Key Methods:**

```php
$task->isCritical()              // priority === 'critical'
$task->isBlocked()               // status === 'blocked'
$task->canStart()                // All deps completed
$task->cycleTime()               // completed_at - started_at
$task->overallProgress()         // % of completed subtasks
$task->getBlockingTasks()        // Tasks blocking this one
$task->assignToAgent($agent)     // Assign execution
```

**Scopes:**

```php
Task::pending()                  // status = 'pending'
Task::inProgress()               // status = 'in_progress'
Task::completed()                // status = 'completed'
Task::forProject($projectId)     // project_id filter
Task::highPriority()             // priority in [critical, high]
Task::byType('feature')          // task_type filter
Task::blockedSince(now()->subDays(7))  // Blocked > 7 days
```

---

#### 4. **Agent** (AI executor)

```php
use HasMany: task_executions, context_bundles, audit_logs
```

**Key Methods:**

```php
$agent->isAvailable()            // is_active = true
$agent->totalExecutions()        // Count of all executions
$agent->successRate()            // % successful executions
$agent->averageDuration()        // Avg execution time
$agent->canHandle($taskType)     // Task type compatibility
```

**Scopes:**

```php
Agent::active()                  // is_active = true
Agent::ofType('coder')           // type filter
Agent::withCapability('refactoring')
```

**Predefined Agents:**

- `zen_planner` (type: planner)
- `auto_zen` (type: coder)
- `zen_architect` (type: architect)
- `zen_tester` (type: tester)
- `zen_reviewer` (type: reviewer)

---

#### 5. **TaskDependency** (Dependency graph)

```php
use BelongsTo: task, depends_on_task
```

**Key Methods:**

```php
$dependency->createsDependency()  // Check if circular
$dependency->hasCyclicalPath()    // Detect cycles
TaskDependency::detectCycles($taskId)  // Find all cycles
```

---

#### 6. **Branch** (Git tracking)

```php
use BelongsTo: task, project
```

**Key Methods:**

```php
$branch->isMainBranch()          // base_branch === 'main'
$branch->getPullRequests()       // Associated PRs
$branch->delete()                // Soft delete available
```

---

#### 7. **TaskExecution** (Execution log)

```php
use BelongsTo: task, agent
```

**Key Methods:**

```php
$execution->wasSuccessful()      // status === 'success'
$execution->failed()             // status === 'failure'
$execution->timedOut()           // status === 'timeout'
$execution->duration()           // In seconds
$execution->tokensPerSecond()    // Performance metric
```

**Statuses:**

- `pending` — Queued for execution
- `running` — Currently executing
- `success` — Completed successfully
- `failure` — Failed with error
- `timeout` — Exceeded time limit

---

#### 8. **ContextBundle** (AI context)

```php
use BelongsTo: task, agent
```

**Key Methods:**

```php
$bundle->fileCount()             // Count of included files
$bundle->totalSize()             // Combined file size
$bundle->getConstraintsList()    // Parsed constraints
```

**Bundle Types:**

- `task_context` — Task description + implementation files
- `architecture_context` — Architecture diagrams + ADRs
- `test_context` — Test files + failure reports
- `issue_context` — GitHub issue + PR context

---

#### 9. **WorkflowState** (State machine)

```php
use BelongsTo: task
```

**Key Methods:**

```php
$state->duration()               // Time in this state
$state->triggeredBy()            // Agent or user name
$state->getTransitionPath()      // Full path to current state
```

---

#### 10. **GithubIssue** (GitHub sync)

```php
use BelongsTo: task
use HasMany: github_reviews
```

**Key Methods:**

```php
$issue->isOpen()                 // state === 'open'
$issue->isClosed()               // state === 'closed'
$issue->getAssignees()           // Array of usernames
$issue->hasLabels(['bug', 'critical'])
```

---

#### 11. **GithubReview** (PR reviews)

```php
use BelongsTo: task, github_issue
```

**Review Statuses:**

- `pending` — Awaiting review
- `approved` — Review approved
- `requested_changes` — Changes needed
- `commented` — Review comment only

---

#### 12. **ArchitectureDecision** (ADR)

```php
use BelongsTo: task, project
use HasMany: related_adrs (self-referential)
```

**Key Methods:**

```php
$adr->isApproved()               // status === 'accepted'
$adr->getSummary()               // Formatted ADR text
$adr->getRelatedDecisions()      // All related ADRs
```

**Statuses:**

- `proposed` — New proposal
- `accepted` — Approved
- `deprecated` — No longer used
- `superseded` — Replaced by newer ADR

---

#### 13. **Dependency** (External packages)

```php
use BelongsTo: project
use HasMany: module_dependencies
```

**Key Methods:**

```php
$dependency->isOutdated()        // has newer version
$dependency->hasVulnerabilities() // Security issues
$dependency->getVulnerabilities()  // Vulnerability array
```

**Types:**

- `npm` — Node.js packages
- `composer` — PHP packages
- `pip` — Python packages
- `cargo` — Rust packages
- `maven` — Java packages

---

#### 14. **ModuleDependency** (Internal modules)

```php
use BelongsTo: project
```

**Dependency Types:**

- `requires` — Hard dependency
- `recommends` — Soft dependency
- `optional` — Optional feature
- `conflicts` — Incompatible with

---

#### 15. **CiCdPipeline** (Pipeline tracking)

```php
use BelongsTo: project, task (nullable)
```

**Statuses:**

- `pending` — Queued
- `running` — In progress
- `success` — Passed all checks
- `failed` — Build failed
- `cancelled` — Manually stopped

---

#### 16. **RepositoryHealthMetric** (Monitoring)

```php
use BelongsTo: project
```

**Example Metrics:**

- `code_coverage` (percentage)
- `cyclomatic_complexity` (average)
- `technical_debt_ratio` (percentage)
- `test_execution_time` (seconds)
- `build_time` (seconds)

---

#### 17. **Notification** (User alerts)

```php
use BelongsTo: task, user
```

**Notification Types:**

- `task_assigned` — Task assigned to user
- `task_completed` — Task marked complete
- `task_blocked` — Task blocked/unblocked
- `review_requested` — Code review needed
- `deployment_ready` — Ready for deployment

---

#### 18. **AuditLog** (Compliance)

```php
use BelongsTo: task (nullable), agent (nullable), user (nullable)
```

**Common Actions:**

- `created` — Resource created
- `updated` — Resource modified
- `deleted` — Resource deleted
- `executed` — Task executed
- `reviewed` — Code reviewed
- `deployed` — Code deployed

---

#### 19. **ProjectUser** (Membership)

```php
use BelongsTo: project, user
```

**Roles:**

- `owner` — Full control
- `admin` — Administrative access
- `developer` — Can create/edit tasks
- `viewer` — Read-only access

---

#### 20. **ArchitectureDesign** (Design docs)

```php
use BelongsTo: task
```

**Design Types:**

- `system_architecture` — Overall system design
- `database_schema` — Database design
- `api_design` — API specification
- `component_architecture` — Component structure

---

#### 21. **ProjectMemory** (Learnings)

```php
use BelongsTo: project
```

**Memory Types:**

- `decision` — Important decision made
- `lesson_learned` — Learning from experience
- `architectural_constraint` — System constraint
- `known_issue` — Known issues/workarounds

---

#### 22. **TaskPlan** (Execution plans)

```php
use BelongsTo: task
```

**JSON Structure:**

```json
{
  "steps": [
    {
      "order": 1,
      "title": "Setup environment",
      "duration": 30,
      "depends_on": []
    }
  ],
  "success_criteria": [
    "All tests pass",
    "Code coverage > 80%"
  ]
}
```

---

## 🔄 Relationship Chaining Examples

```php
// Get all team members for all tasks in a project
$teamMembers = Project::find($id)
    ->tasks()
    ->with('project.users')
    ->get()
    ->pluck('project.users')
    ->flatten()
    ->unique('id');

// Get all blocked tasks with blocking dependencies
$blockedTasks = Task::where('status', 'blocked')
    ->with(['dependencies.task' => function ($q) {
        $q->where('status', '!=', 'completed');
    }])
    ->get();

// Get agent execution history with task context
$executions = Agent::find($agentId)
    ->taskExecutions()
    ->with('task.project')
    ->latest()
    ->paginate(20);

// Get all recent architecture decisions for a project
$adrs = Project::find($id)
    ->architectureDecisions()
    ->with('task')
    ->where('status', 'accepted')
    ->orderBy('created_at', 'desc')
    ->get();
```

---

## 🛠️ Custom Methods

### Task Methods

```php
// Check if task can be started
public function canStart(): bool
{
    return $this->status === 'pending' && 
           $this->dependencies()->whereStatus('!=', 'completed')->count() === 0;
}

// Get estimated completion date
public function estimatedCompletionDate(): Carbon
{
    return $this->created_at->addMinutes($this->estimated_effort ?? 0);
}

// Calculate progress percentage
public function progressPercentage(): int
{
    if ($this->subtasks()->count() === 0) {
        return $this->status === 'completed' ? 100 : 0;
    }
    
    $completed = $this->subtasks()->where('status', 'completed')->count();
    return round(($completed / $this->subtasks()->count()) * 100);
}
```

### Agent Methods

```php
// Get success rate percentage
public function successRate(): float
{
    $total = $this->taskExecutions()->count();
    if ($total === 0) return 0;
    
    $successful = $this->taskExecutions()
        ->where('status', 'success')
        ->count();
    
    return round(($successful / $total) * 100, 2);
}

// Get average execution time
public function averageExecutionTime(): float
{
    return $this->taskExecutions()
        ->whereNotNull('duration_seconds')
        ->avg('duration_seconds') ?? 0;
}
```

---

## 🧪 Model Testing Patterns

```php
// Test relationship loading
$task = Task::with('project', 'subtasks')->find($id);
$this->assertNotNull($task->project);

// Test query optimization
$query = Task::with('project', 'executions.agent');
$this->assertCount(2, $query->getEagerLoads());

// Test scope chaining
$tasks = Task::pending()
    ->highPriority()
    ->forProject($projectId)
    ->get();

// Test soft deletes
$task->delete();
$this->assertTrue($task->trashed());
$task->restore();
$this->assertFalse($task->trashed());
```

---

## 📖 Relationship Matrix

| Model | BelongsTo | HasMany | HasOne | BelongsToMany |
|-------|-----------|---------|--------|---------------|
| User | — | notifications, audit_logs | — | projects |
| Project | — | tasks, branches, dependencies, etc. | — | users |
| Task | project, parent_task | subtasks, dependencies, executions, etc. | github_issue | — |
| Agent | — | taskExecutions, contextBundles, auditLogs | — | — |
| Branch | task, project | — | — | — |
| TaskExecution | task, agent | — | — | — |
| ContextBundle | task, agent | — | — | — |
| GithubIssue | task | github_reviews | — | — |
| GithubReview | task, github_issue | — | — | — |

---

## ✅ Implementation Checklist

- [x] All 22 models created
- [x] Relationships defined correctly
- [x] Custom methods implemented
- [x] Query scopes added
- [x] Type casting configured
- [x] Soft deletes implemented
- [x] Factory definitions ready
- [x] Documentation complete

---

**Status:** ✅ **COMPLETE**

*All Eloquent models fully documented with comprehensive examples and best practices.*
