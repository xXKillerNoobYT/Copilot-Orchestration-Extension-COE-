# Task Orchestration Flow

**Copilot Orchestration Extension (COE) - End-to-End Task Lifecycle**

**Version:** 1.0  
**Last Updated:** January 2, 2026

---

## Overview

This document describes how tasks flow through the Copilot Orchestration Extension system, from initial creation to final completion. It covers file parsing, database persistence, agent assignment, context bundle generation, workflow state transitions, and GitHub synchronization.

---

## Architecture Overview

```
┌─────────────────────┐
│  Task Markdown File │
│   (sample-tasks/)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   VS Code Parser    │
│  (taskParser.ts)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Validation Layer   │
│  (Schema/Enums)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Task Tree View    │
│  (VS Code UI)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Backend API Sync   │
│  (Laravel REST)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Database (MySQL)   │
│  - tasks            │
│  - task_dependencies│
│  - workflow_states  │
│  - context_bundles  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent Assignment   │
│  (Orchestrator)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Context Bundle     │
│  Generation         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GitHub Copilot     │
│  Execution          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Task Execution     │
│  Tracking           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GitHub PR/Issue    │
│  Synchronization    │
└─────────────────────┘
```

---

## Stage 1: Task File Creation

### Input Sources

Tasks can originate from multiple sources:

1. **Manual Creation** - Developer creates `.md` file in `sample-tasks/`
2. **GitHub Issues** - Auto-generated from issue metadata
3. **CI/CD Failures** - Automated task generation from build failures
4. **Dependency Drift** - Maintenance tasks from dependency scans
5. **Architecture Reviews** - ADR tasks from design decisions

### File Structure

```markdown
---
id: TASK-042
title: Add user authentication
type: feature
priority: high
status: pending
dependencies: [TASK-001]
assignees: [planner, coder, tester]
labels: [auth, security]
estimate: "6h"
format_version: "1.0"
---

## Goal
Implement OAuth2 authentication flow
...
```

**Location:** `vscode-extension/sample-tasks/TASK-042-auth.md`

---

## Stage 2: Parsing & Validation

### Parser Invocation

**Trigger Points:**

- VS Code extension activation
- File system watcher detects changes in `sample-tasks/`
- Manual refresh command: `copilot-orchestrator.refreshTasks`
- API sync operation

### Parsing Process

```typescript
// vscode-extension/src/taskParser.ts
const result = parseTaskFile(markdown, {
  fileName: 'TASK-042-auth.md',
  validateSchema: true,
  normalizeEffort: true,
  failOnInvalid: false
});
```

**Steps:**

1. **Extract Front Matter** - Regex match YAML between `---` delimiters
2. **Parse YAML** - Use `yaml` library to deserialize
3. **Extract Body** - Remaining Markdown content
4. **Normalize Fields** - ID fallback, title fallback, array coercion
5. **Type Validation** - Check TaskType, TaskPriority, TaskStatus, AgentType enums
6. **Effort Normalization** - Convert `"6h"` → `360` minutes
7. **Subtask Recursion** - Parse nested subtasks with full metadata
8. **Error Collection** - Gather validation errors/warnings

### Validation Results

```typescript
{
  task: ParsedTask {
    id: "TASK-042",
    title: "Add user authentication",
    type: "feature",
    priority: "high",
    status: "pending",
    dependencies: ["TASK-001"],
    assignees: ["planner", "coder", "tester"],
    // ... additional fields
  },
  errors: [],
  warnings: [
    {
      file: "TASK-042-auth.md",
      field: "estimate",
      message: "Effort normalized to 360 minutes",
      severity: "warning"
    }
  ]
}
```

### Error Handling

**Invalid Task Type:**

```
ERROR: type: Invalid task type: "feat"
SUGGESTION: Must be one of: feature, bug, refactor, maintenance, architecture, testing, documentation
```

**Invalid Agent:**

```
ERROR: assignees: Invalid agent types: deployer
SUGGESTION: Must be one of: planner, architect, coder, tester, reviewer, documentation, deployment, maintenance
```

---

## Stage 3: VS Code Tree View Display

### Tree Provider

**File:** `vscode-extension/src/extension.ts`

```typescript
class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    const tasks = await parseTasksFromDirectory(tasksDir);
    return tasks.map(task => new TaskTreeItem(task));
  }
}
```

### UI Representation

```
📁 COPILOT TASKS
  🚀 TASK-001: Authentication flow (pending)
     └─ TASK-001A: Login form skeleton (pending)
     └─ TASK-001B: Session persistence (pending)
  🚀 TASK-042: Add user authentication (in_progress)
  ✅ TASK-037: Refactor parser logic (completed)
```

**Icons:**

- 🚀 Rocket - `pending`, `approved`, `in_progress`
- ✅ Pass - `completed`
- ❌ Error - `failed`
- 🚫 Blocked - `blocked`

**Tooltip:**

```
Type: feature
Priority: high
Status: pending
Dependencies: TASK-001
Assignees: planner, coder, tester

Goal:
Implement OAuth2 authentication flow
...
```

---

## Stage 4: Backend API Synchronization

### REST API Endpoint

**POST** `/api/tasks`

```json
{
  "id": "TASK-042",
  "title": "Add user authentication",
  "description": "## Goal\nImplement OAuth2...",
  "task_type": "feature",
  "priority": "high",
  "status": "pending",
  "dependencies": ["TASK-001"],
  "assignees": ["planner", "coder", "tester"],
  "labels": ["auth", "security"],
  "estimated_effort": 360,
  "format_version": "1.0"
}
```

### Database Schema Mapping

**Table:** `tasks`

| Markdown Field | Database Column | Transformation |
|----------------|-----------------|----------------|
| `id` | `id` (string, PK) | Direct |
| `title` | `title` (string) | Direct |
| `description` | `description` (text) | Markdown body |
| `type` | `task_type` (enum) | Rename field |
| `priority` | `priority` (enum) | Direct |
| `status` | `status` (enum) | Direct |
| `estimate` | `estimated_effort` (int) | Normalize to minutes |
| `assignees` | `assigned_agent` (string) | Take first agent |
| `github_issue_id` | `github_issue_id` (int) | Direct |
| `github_issue_url` | `github_issue_url` (string) | Direct |

**Table:** `task_dependencies`

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string (FK) | Dependent task |
| `depends_on_task_id` | string (FK) | Blocking task |

**Example:**

```sql
INSERT INTO task_dependencies (task_id, depends_on_task_id)
VALUES ('TASK-042', 'TASK-001');
```

### Dependency Graph Validation

**Circular Reference Detection:**

```php
// app/Services/TaskOrchestrationService.php
public function validateDependencies(Task $task): array
{
    $visited = [];
    $stack = [$task->id];
    
    while (!empty($stack)) {
        $current = array_pop($stack);
        
        if (in_array($current, $visited)) {
            throw new CircularDependencyException(
                "Circular dependency detected: " . implode(' → ', $visited)
            );
        }
        
        $visited[] = $current;
        $dependencies = TaskDependency::where('task_id', $current)->pluck('depends_on_task_id');
        $stack = array_merge($stack, $dependencies->toArray());
    }
    
    return $visited;
}
```

---

## Stage 5: Workflow State Transitions

### State Machine

**Table:** `workflow_states`

```
pending → approved → in_progress → testing → review → completed
            ↓            ↓             ↓         ↓
         cancelled    blocked       failed    failed
```

### Transition Rules

| From State | To State | Trigger | Validation |
|------------|----------|---------|------------|
| `pending` | `approved` | Planner approval | All dependencies resolved |
| `approved` | `in_progress` | Agent assignment | Agent available |
| `in_progress` | `testing` | Code complete | Tests exist |
| `testing` | `review` | Tests pass | Coverage threshold met |
| `review` | `completed` | Approval | All reviewers approved |
| Any | `blocked` | Dependency blocker | - |
| Any | `failed` | Error encountered | - |
| Any | `cancelled` | User action | - |

### Transition Tracking

```sql
INSERT INTO workflow_states (
    task_id, 
    state, 
    previous_state, 
    transitioned_by, 
    metadata,
    transitioned_at
) VALUES (
    'TASK-042',
    'in_progress',
    'approved',
    'system',
    '{"agent_id": 3, "reason": "Auto-assigned to coder agent"}',
    NOW()
);
```

---

## Stage 6: Agent Assignment

### Agent Selection Algorithm

**File:** `app/Services/AgentAssignmentService.php`

```php
public function assignAgent(Task $task): Agent
{
    // 1. Get candidate agents from task assignees
    $candidateTypes = $task->assignees; // ['planner', 'coder', 'tester']
    
    // 2. Filter by task type compatibility
    $compatibleAgents = Agent::whereIn('type', $candidateTypes)
        ->where('is_active', true)
        ->get()
        ->filter(function($agent) use ($task) {
            return $this->isAgentCompatible($agent, $task);
        });
    
    // 3. Select based on workload and capabilities
    $selectedAgent = $compatibleAgents->sortBy('current_workload')->first();
    
    // 4. Update task assignment
    $task->update([
        'assigned_agent' => $selectedAgent->type,
        'assigned_github_agent' => $selectedAgent->llm_provider === 'copilot' 
            ? $selectedAgent->id 
            : null
    ]);
    
    return $selectedAgent;
}
```

### Agent Capabilities Matching

**Example: Feature Task**

```json
{
  "task_type": "feature",
  "required_capabilities": [
    "requirement_analysis",
    "code_implementation",
    "test_generation"
  ],
  "agent_sequence": [
    {
      "agent": "planner",
      "stage": "planning",
      "capabilities_used": ["requirement_analysis", "task_decomposition"]
    },
    {
      "agent": "coder",
      "stage": "development",
      "capabilities_used": ["code_implementation", "github_copilot_integration"]
    },
    {
      "agent": "tester",
      "stage": "testing",
      "capabilities_used": ["test_generation", "test_execution"]
    }
  ]
}
```

---

## Stage 7: Context Bundle Generation

### Purpose

Context bundles provide scoped, task-specific context to agents, preventing information overload while ensuring relevant data is available.

### Bundle Structure

**Table:** `context_bundles`

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string (FK) | Associated task |
| `type` | enum | `task_context`, `architecture_context`, `test_context`, `issue_context` |
| `files_included` | JSON | List of file paths |
| `architecture_notes` | JSON | ADRs, design decisions |
| `constraints` | JSON | Requirements, limitations |
| `test_failures` | JSON | Recent test failures |
| `created_at` | timestamp | Bundle creation time |

### Generation Process

```php
// app/Services/ContextBundleService.php
public function generateBundle(Task $task, Agent $agent): ContextBundle
{
    $bundle = ContextBundle::create([
        'task_id' => $task->id,
        'type' => 'task_context',
    ]);
    
    // 1. Analyze task dependencies
    $relatedTasks = $this->getRelatedTasks($task);
    
    // 2. Extract affected files from task description
    $affectedFiles = $this->extractFileReferences($task->description);
    
    // 3. Load architecture decisions
    $adrs = ArchitectureDecision::whereHas('tasks', function($q) use ($task) {
        $q->where('task_id', $task->id);
    })->get();
    
    // 4. Gather constraints from project settings
    $constraints = $this->getProjectConstraints($task->project_id);
    
    // 5. Check recent test failures
    $testFailures = $this->getRelevantTestFailures($task);
    
    // 6. Assemble bundle
    $bundle->update([
        'files_included' => $affectedFiles,
        'architecture_notes' => $adrs->pluck('decision'),
        'constraints' => $constraints,
        'test_failures' => $testFailures,
    ]);
    
    // 7. Write to file system
    $this->writeBundleToFile($bundle, "context/{$task->id}-bundle.json");
    
    return $bundle;
}
```

### Bundle File Example

**File:** `context/TASK-042-bundle.json`

```json
{
  "task_id": "TASK-042",
  "type": "task_context",
  "timestamp": "2026-01-02T14:30:00Z",
  "files_included": [
    "app/Http/Controllers/AuthController.php",
    "app/Models/User.php",
    "resources/js/components/LoginForm.tsx",
    "config/auth.php"
  ],
  "architecture_notes": [
    "ADR-001: Use Laravel Sanctum for API authentication",
    "ADR-005: TypeScript strict mode enforced"
  ],
  "constraints": [
    "Must support OAuth2 providers: Google, GitHub",
    "Session timeout: 30 minutes",
    "CSRF protection required",
    "Password requirements: 12+ chars, mixed case, numbers"
  ],
  "test_failures": [],
  "related_tasks": [
    {
      "id": "TASK-001",
      "title": "Authentication flow skeleton",
      "status": "completed",
      "lessons": "Sanctum token refresh requires explicit endpoint"
    }
  ],
  "code_examples": [
    {
      "file": "app/Http/Controllers/AuthController.php",
      "snippet": "public function login(Request $request) { ... }",
      "relevance": "Existing login pattern to follow"
    }
  ]
}
```

---

## Stage 8: GitHub Copilot Execution

### Agent Configuration

**Table:** `agents`

```sql
SELECT * FROM agents WHERE type = 'coder';
```

```json
{
  "id": 3,
  "type": "coder",
  "capabilities": [
    "code_implementation",
    "github_copilot_integration",
    "refactoring",
    "bug_fixing"
  ],
  "configuration": {
    "auto_commit": false,
    "create_pr": true,
    "run_tests": true
  },
  "llm_provider": "copilot",
  "is_active": true
}
```

### Execution Flow

```
1. Load Context Bundle
   ├─ Task description
   ├─ Architecture notes
   ├─ Affected files
   └─ Constraints

2. Create Git Branch
   └─ Branch: feature/TASK-042-add-user-authentication

3. Invoke GitHub Copilot
   ├─ Provide context bundle
   ├─ Request code generation
   └─ Stream responses

4. Apply Changes
   ├─ Create/modify files
   ├─ Run formatters
   └─ Stage changes

5. Run Tests
   ├─ Execute test suite
   ├─ Check coverage
   └─ Capture failures

6. Record Execution
   └─ TaskExecution record created
```

### Execution Tracking

**Table:** `task_executions`

```sql
INSERT INTO task_executions (
    task_id,
    agent_id,
    status,
    context_provided,
    result,
    output_files,
    tests_passed,
    coverage_percentage,
    started_at,
    completed_at
) VALUES (
    'TASK-042',
    3,
    'completed',
    '{"context_bundle": "context/TASK-042-bundle.json"}',
    'Successfully implemented OAuth2 authentication',
    '["app/Http/Controllers/AuthController.php", "resources/js/components/LoginForm.tsx"]',
    true,
    87.5,
    '2026-01-02 14:35:00',
    '2026-01-02 15:05:00'
);
```

---

## Stage 9: GitHub Synchronization

### Two-Way Sync

#### Task → GitHub Issue

**Trigger:** Task status changes to `in_progress`, `review`, or `completed`

```php
// app/Services/GitHubSyncService.php
public function syncTaskToIssue(Task $task): void
{
    if (!$task->github_issue_id) {
        // Create new issue
        $issue = $this->githubClient->createIssue([
            'title' => $task->title,
            'body' => $task->description,
            'labels' => $task->labels,
            'assignee' => $this->mapAgentToGitHubUser($task->assigned_agent),
        ]);
        
        $task->update([
            'github_issue_id' => $issue->number,
            'github_issue_url' => $issue->html_url,
        ]);
    } else {
        // Update existing issue
        $this->githubClient->updateIssue($task->github_issue_id, [
            'state' => $this->mapStatusToIssueState($task->status),
            'body' => $this->appendExecutionLog($task),
        ]);
    }
}
```

#### GitHub Issue → Task

**Trigger:** Webhook receives issue update event

```php
public function handleIssueWebhook(array $payload): void
{
    $issueNumber = $payload['issue']['number'];
    $task = Task::where('github_issue_id', $issueNumber)->first();
    
    if ($task) {
        $task->update([
            'status' => $this->mapIssueStateToStatus($payload['issue']['state']),
        ]);
        
        // Import comments as context
        $this->importIssueComments($task, $payload['issue']['comments_url']);
    }
}
```

### Pull Request Creation

**Branch:** `feature/TASK-042-add-user-authentication`

```php
public function createPullRequest(Task $task, Branch $branch): void
{
    $pr = $this->githubClient->createPullRequest([
        'title' => "[{$task->id}] {$task->title}",
        'body' => $this->generatePRDescription($task),
        'head' => $branch->name,
        'base' => 'main',
    ]);
    
    $task->update(['pull_request_url' => $pr->html_url]);
    
    // Request review from assigned reviewers
    $reviewers = Agent::where('type', 'reviewer')
        ->where('is_active', true)
        ->pluck('github_username');
    
    $this->githubClient->requestReview($pr->number, $reviewers->toArray());
}
```

### PR Description Template

```markdown
## Task: TASK-042

**Title:** Add user authentication

**Type:** feature
**Priority:** high
**Estimate:** 6h (360 minutes)

---

### Goal

Implement OAuth2 authentication flow with support for Google and GitHub providers.

### Changes

- ✅ Created `AuthController` with OAuth2 endpoints
- ✅ Implemented `LoginForm` React component
- ✅ Added session management with 30-minute timeout
- ✅ Integrated CSRF protection
- ✅ Added password validation (12+ chars, mixed case, numbers)

### Testing

- ✅ Unit tests: 45 passed
- ✅ Integration tests: 12 passed
- ✅ Coverage: 87.5%

### Dependencies

- Blocked by: None
- Blocks: TASK-043 (User profile management)

### Related

- Architecture: ADR-001 (Laravel Sanctum)
- Issue: #127
- Context Bundle: `context/TASK-042-bundle.json`

---

**Auto-generated by Copilot Orchestration Extension**
```

---

## Stage 10: Review & Completion

### Code Review Integration

**Table:** `github_reviews`

```sql
INSERT INTO github_reviews (
    task_id,
    reviewer,
    status,
    comment_count,
    submitted_at
) VALUES (
    'TASK-042',
    'architect-agent',
    'approved',
    3,
    '2026-01-02 16:00:00'
);
```

### Completion Criteria

Task transitions to `completed` when:

1. ✅ All subtasks completed
2. ✅ All tests passing
3. ✅ Coverage threshold met (≥ 80%)
4. ✅ Code review approved
5. ✅ No blocking issues
6. ✅ PR merged to main branch

### Final State Update

```php
public function completeTask(Task $task): void
{
    $task->update([
        'status' => 'completed',
        'completed_at' => now(),
        'actual_effort' => $this->calculateActualEffort($task),
    ]);
    
    // Update workflow state
    WorkflowState::create([
        'task_id' => $task->id,
        'state' => 'completed',
        'previous_state' => 'review',
        'metadata' => [
            'pr_merged' => true,
            'final_coverage' => 87.5,
            'review_approvals' => 2,
        ],
        'transitioned_at' => now(),
    ]);
    
    // Unblock dependent tasks
    $this->unblockDependentTasks($task);
    
    // Notify stakeholders
    $this->notifyTaskCompletion($task);
}
```

---

## Integration Points Summary

### VS Code Extension ↔ Backend API

| Operation | Endpoint | Method | Payload |
|-----------|----------|--------|---------|
| Sync tasks | `/api/tasks/sync` | POST | `{ tasks: ParsedTask[] }` |
| Get task status | `/api/tasks/{id}` | GET | - |
| Update status | `/api/tasks/{id}/status` | PATCH | `{ status: TaskStatus }` |
| Get context bundle | `/api/tasks/{id}/context` | GET | - |

### Backend ↔ GitHub

| Operation | GitHub API | Trigger |
|-----------|------------|---------|
| Create issue | `POST /repos/{owner}/{repo}/issues` | Task created |
| Update issue | `PATCH /repos/{owner}/{repo}/issues/{number}` | Status change |
| Create PR | `POST /repos/{owner}/{repo}/pulls` | Code complete |
| Request review | `POST /repos/{owner}/{repo}/pulls/{number}/requested_reviewers` | PR created |
| Webhook | `POST /webhooks/github` | Issue/PR events |

### Database Relationships

```sql
tasks (1) ─────── (N) task_dependencies (N) ─────── (1) tasks
  │                                                      │
  │ (1)                                              (1) │
  │                                                      │
  ▼ (N)                                              (N) ▼
task_executions                            workflow_states
  │                                                      │
  │ (N)                                              (N) │
  │                                                      │
  ▼ (1)                                              (1) ▼
agents                                         context_bundles
```

---

## Performance Considerations

### Caching Strategy

1. **Task Parsing** - Cache parsed tasks in memory, invalidate on file change
2. **Dependency Graph** - Pre-compute dependency trees, update incrementally
3. **Context Bundles** - Generate on-demand, cache for task duration
4. **GitHub Sync** - Batch updates, rate limit respecting

### Optimization Techniques

- **Lazy Loading** - Load subtasks only when expanded in tree view
- **Batch Operations** - Sync multiple tasks in single API call
- **Incremental Updates** - Only sync changed fields
- **Background Workers** - Offload heavy operations (context generation, GitHub sync)

---

## Error Recovery

### Parsing Failures

```typescript
// Graceful degradation
const result = parseTaskFile(content, { failOnInvalid: false });

if (result.errors.length > 0) {
  // Show in VS Code Problems panel
  diagnosticCollection.set(uri, errors.map(toDiagnostic));
  
  // Display partial task with warnings
  if (result.task) {
    tasks.push(result.task);
  }
}
```

### API Sync Failures

```php
try {
    $this->syncTaskToBackend($task);
} catch (ApiException $e) {
    // Queue for retry
    SyncQueue::create([
        'task_id' => $task->id,
        'operation' => 'sync',
        'retry_count' => 0,
        'max_retries' => 3,
        'error' => $e->getMessage(),
    ]);
    
    Log::error("Task sync failed: {$e->getMessage()}");
}
```

### GitHub Sync Failures

```php
// Exponential backoff retry
$retryDelay = min(300, pow(2, $retryCount) * 5); // Max 5 minutes

dispatch(new SyncTaskToGitHub($task))
    ->delay(now()->addSeconds($retryDelay))
    ->onQueue('github-sync');
```

---

## Future Enhancements

1. **Real-Time Collaboration** - WebSocket updates for multi-user editing
2. **AI-Generated Context** - LLM-based context bundle enrichment
3. **Predictive Analytics** - Estimate accuracy improvements from historical data
4. **Dependency Inference** - Auto-detect dependencies from code analysis
5. **Multi-Project Support** - Cross-project task dependencies
6. **Custom Workflows** - User-defined state machines per project
7. **Metrics Dashboard** - Agent performance, velocity, quality trends

---

## References

- [Task Format Specification](task-format-specification.md)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Laravel Documentation](https://laravel.com/docs)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Task Database Schema](../database/migrations/*_create_tasks_table.php)
- [Agent Model](../app/Models/Agent.php)
- [Context Bundle Model](../app/Models/ContextBundle.php)
