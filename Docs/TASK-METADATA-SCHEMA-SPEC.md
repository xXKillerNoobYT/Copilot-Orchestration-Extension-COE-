# Task Metadata Schema Specification

**Version:** 1.0  
**Date:** January 7, 2026  
**Format:** Markdown + YAML Front Matter  
**Parser Support:** Node.js, PHP, VS Code  

---

## Overview

This specification defines a structured, machine-parseable Markdown format for task files (`*.task.md`). The format supports:

- **YAML Metadata** — status, priority, dependencies, agents, tags, audit trail
- **Rich Descriptions** — goal, acceptance criteria, constraints, architecture context
- **Subtasks** — hierarchical task decomposition with automatic ordering
- **AI Prompts** — structured blocks for agent instruction
- **Versioning** — audit trail, history, change tracking
- **Integration** — GitHub Issues, branches, CI/CD pipelines

---

## File Naming Convention

```
TASK-{taskid}.task.md
```

**Format:**

- `TASK` — literal prefix
- `{taskid}` — unique identifier (alphanumeric, URL-safe, ~10 chars)
- `.task` — explicit file type marker
- `.md` — Markdown extension

**Examples:**

- `TASK-mk3k0e09-culd4.task.md` — Phase 7 auto-switching
- `TASK-ghy8sk3a-lm0p2.task.md` — Feature implementation

---

## Schema Structure

### 1. YAML Front Matter (Header)

```yaml
---
id: TASK-mk3k0e09-culd4
title: Implement Phase 7: Auto-Agent Switching & Continuous Execution
type: feature          # feature|bug|refactor|maintenance|architecture|testing|documentation
status: done          # pending|in_progress|review|testing|blocked|done|deferred|cancelled
priority: high        # critical|high|medium|low
complexity: high      # low|medium|high|expert
estimate_minutes: 480 # estimated duration in minutes
created_at: 2026-01-07T05:04:25.834Z  # ISO 8601
updated_at: 2026-01-07T10:30:00.000Z  # ISO 8601
completed_at: 2026-01-07T10:30:00.000Z # ISO 8601 (only if status=done)

# Dependencies
depends_on:
  - TASK-xxxx-yyyyy   # task ID this depends on
  - TASK-aaaa-bbbbb
parent_task: null     # parent task if this is a subtask

# Agent Assignment
assigned_to:
  agent_type: auto_zen  # zen_planner|auto_zen|zen_architect|cloud_coder|health_monitor
  agent_name: null      # specific agent name if multi-agent scenario
  escalated_to: null    # escalated to higher agent if blocked
assigned_at: 2026-01-07T05:04:25.834Z
completed_by: copilot  # who completed the task (agent name or human)

# Tags & Categorization
tags:
  - orchestration
  - continuous-execution
  - phase-7
component: orchestration-engine  # codebase component

# GitHub Integration
github_issue_id: null   # GitHub issue number
github_issue_url: null  # Full URL
github_branch: null     # Associated branch name
github_pr: null         # Pull request number (if applicable)

# Context & Audit Trail
context_bundle_id: null  # ID of associated context bundle
context_version: null    # Version of context used
labels:
  - needs-testing
  - ready-for-review
milestone: Phase 7
blocked_reason: null     # If status=blocked, why
blocked_since: null      # When blocking started

# Metrics & SLOs
start_time: null        # When work actually started (ISO 8601)
end_time: null          # When work actually ended
cycle_time_minutes: null # Time from start to end
review_count: 0         # Number of reviews/iterations
failure_count: 0        # Number of failures before success

# Extended Fields (Optional)
custom_fields: {}       # Custom metadata for integration
ai_model_version: gpt-4 # Which LLM/version if AI-generated
---
```

---

### 2. Body Structure

#### Section: Description

```markdown
## Description

One-sentence summary of what this task accomplishes.

### Goal
Single sentence describing the desired outcome.

### Context
Why this task matters. What problem does it solve? What is the business value?

### Scope
What's included. What's explicitly excluded (to prevent scope creep).
```

**Example:**

```markdown
## Description

Design and implement a state machine for autonomous agent switching between planning and execution modes.

### Goal
Enable the Copilot Orchestration Extension to automatically loop through planning (Zen Planner) and execution (Auto Zen) without manual intervention.

### Context
Currently, tasks require manual assignment to agents. Phase 7 enables fully autonomous operation: system plans work, executes it, and loops until queue is empty.

### Scope
- State machine implementation (idle, planning, execution, maintenance modes)
- Agent invocation with proper prompting
- Loop scheduling and control
- Telemetry and logging

**Out of Scope:**
- GitHub integration (Phase 8)
- Repository branching strategy (Phase 9)
- Health monitoring (Phase 10)
```

---

#### Section: Acceptance Criteria

```markdown
## Acceptance Criteria

- [ ] Criterion 1: Specific, measurable outcome
- [ ] Criterion 2: Testable requirement
- [ ] Criterion 3: Clear pass/fail condition

**Definition of Done:**
- Code merged to main branch
- All tests passing
- Documentation updated
- No breaking changes
```

**Example:**

```markdown
## Acceptance Criteria

- [ ] State machine transitions correctly between all 6 states
- [ ] Zen Planner invoked for planning tasks, Auto Zen for execution tasks
- [ ] Loop continues until queue is empty or error triggers backoff
- [ ] Error handling: 3 retries with exponential backoff (max 10 min)
- [ ] Telemetry: cycles, successes, errors, latency tracked and reported
- [ ] REST API endpoints: /start, /stop, /status, /cycle functional
- [ ] Test scenarios (10+) passing with real agent mocks

**Definition of Done:**
- All code in app/Services/AgentSwitch* and Http/Controllers/AgentLoop*
- Unit + integration tests with >80% coverage
- Documentation: architecture guide, API docs, test scenarios
- Code review approved; no TODOs or FIXMEs
- Merged to main; CI/CD passing
```

---

#### Section: Implementation Details

```markdown
## Implementation Details

Technical specification of what to build and how.

### Architecture
High-level design. Diagrams, patterns, key components.

### Technologies
Languages, frameworks, libraries to use.

### Data Model
Entities, relationships, storage.

### API/Integration Points
External services, webhooks, data flows.

### Error Handling
How to handle failures, edge cases.

### Performance Considerations
Latency requirements, scalability needs, resource constraints.
```

**Example:**

```markdown
## Implementation Details

### Architecture
State machine with 6 states: idle, planning_ready, planning_done, execution_ready, execution_done, maintenance_mode. 
Transitions based on task queue state and agent responses.

Use service layer pattern:
- `AgentSwitchService` — state machine
- `AgentInvocationService` — agent calls with retries
- `LoopSchedulerService` — lifecycle control
- `AgentLoopController` — REST API

### Technologies
- PHP 8.1+ (Laravel service classes)
- HTTP client (Guzzle) for agent endpoint calls
- Cache (Redis/file) for state persistence
- Logging (Monolog)

### Data Model
Task model with fields: status, assigned_agent, dependencies, context_bundle_id.
Agent model with: type, endpoint, api_key, success_rate.

### API/Integration Points
- Agent endpoint: `POST /agents/{type}` with prompt + context
- Task repository: query for ready tasks
- Cache backend: state transitions
- Logging: all decisions

### Error Handling
- HTTP timeout: 300s, retry up to 3 times
- Exponential backoff: 2x multiplier (1s → 2s → 4s → max 10min)
- On hard failure: log error, continue to next cycle
- Graceful shutdown: stop signal, finish current cycle

### Performance Considerations
- Cycle latency: 30–120s (agent call + overhead)
- Memory: <100MB sustained
- Cache TTL: 1 day for state, 30m for metrics
```

---

#### Section: Test Strategy

```markdown
## Test Strategy

How to verify this task is complete and working.

### Unit Tests
Isolated component tests (no external dependencies).

### Integration Tests
Multiple components together, external service mocks.

### Manual Tests
Step-by-step scenarios a human can execute.

### Success Metrics
Measurable outcomes to confirm completion.
```

**Example:**

```markdown
## Test Strategy

### Unit Tests
- State transitions: idle→planning_ready→planning_done
- Error retry logic with exponential backoff
- Task parsing from agent output
- Backoff delay calculation

### Integration Tests
- Full cycle: planning task → Zen Planner → execution task → Auto Zen → completion
- Error scenario: agent timeout → retry → eventual success
- State persistence across cycles
- API endpoints: start, stop, status, cycle

### Manual Tests
1. Start loop: `POST /api/v1/agent-loop/start`
2. Check status every 5s until completion
3. Verify logs show state transitions
4. Call stop: `POST /api/v1/agent-loop/stop`
5. Verify graceful shutdown

### Success Metrics
- All 10 test scenarios passing (see PHASE-7-TEST-SCENARIOS.md)
- Loop latency: 30–120s average
- Error recovery: <10s on transient failures
- Memory: <100MB under load
```

---

#### Section: AI Prompt

```markdown
## AI Prompt

Instructions for AI agents (Copilot, Claude, etc.) to understand and execute this task.

### Objective
What the AI should accomplish.

### Context
Domain information, patterns, existing code to reference.

### Requirements
Hard constraints (SOLID principles, security, performance).

### Expected Output
What constitutes successful completion.

### Guardrails
Things NOT to do (breaking changes, unsafe patterns, etc.).
```

**Example:**

```markdown
## AI Prompt

### Objective
Design and implement a state machine service that automatically switches between Zen Planner (for decomposing work) and Auto Zen (for executing work). The system should loop until the task queue is empty, then enter maintenance mode.

### Context
- Existing task orchestration framework (Phases 1-6 complete)
- TaskRepository provides `findNextPlanningTask()` and `findNextExecutionTask()`
- AgentInvocationService handles agent calls with retries
- Patterns: service layer (TaskOrchestrationService), repository pattern, SOLID principles

### Requirements
- Use PHP service classes in `app/Services/`
- State transitions atomic (use cache for distributed safety)
- Exponential backoff on errors (2x multiplier, max 10 min)
- All decisions logged to application logs
- No breaking changes to existing API
- >80% test coverage

### Expected Output
1. AgentSwitchService with state machine
2. LoopSchedulerService to control lifecycle
3. AgentLoopController with REST API (start, stop, status)
4. 10+ test scenarios documented
5. Implementation summary (architecture, usage, config)

### Guardrails
- Do NOT hardcode agent endpoints; use config
- Do NOT block synchronously; use async for long-running agents (Phase 10)
- Do NOT expose internal state in API responses (only stats)
- Do NOT catch generic Exception; use specific exception types
- Do NOT skip logging; every decision must be logged
```

---

#### Section: Subtasks

```markdown
## Subtasks

Decomposition of work into smaller, atomic 15–45 minute tasks.

### Format
- [ ] [SUBTASK-{order}] Subtask title — brief description
```

**Example:**

```markdown
## Subtasks

- [ ] [SUBTASK-1] Design state machine and state transitions (30 min)
  - Dependencies: none
  - Output: StateEnum, transition table
  
- [ ] [SUBTASK-2] Implement AgentSwitchService with state logic (45 min)
  - Dependencies: SUBTASK-1
  - Output: Service class with executeCycle() method
  
- [ ] [SUBTASK-3] Create AgentInvocationService for agent calls (45 min)
  - Dependencies: SUBTASK-2
  - Output: Service class with invokeZenPlanner(), invokeAutoZen()
  
- [ ] [SUBTASK-4] Implement LoopSchedulerService for lifecycle (30 min)
  - Dependencies: SUBTASK-3
  - Output: Service class with startLoop(), stopLoop(), getStats()
  
- [ ] [SUBTASK-5] Create AgentLoopController with REST API (30 min)
  - Dependencies: SUBTASK-4
  - Output: Controller with /start, /stop, /status, /cycle endpoints
  
- [ ] [SUBTASK-6] Write 10+ test scenarios and manual tests (30 min)
  - Dependencies: SUBTASK-5
  - Output: PHASE-7-TEST-SCENARIOS.md
  
- [ ] [SUBTASK-7] Write implementation summary and config guide (20 min)
  - Dependencies: SUBTASK-6
  - Output: PHASE-7-IMPLEMENTATION-SUMMARY.md
```

---

#### Section: Review Notes

```markdown
## Review Notes

Notes from code review, feedback, or iteration cycles.

### Iteration 1
- Reviewer: Alice
- Date: 2026-01-07
- Comments: Good state machine design; consider adding circuit breaker pattern (Phase 10)
- Status: Approved with minor suggestions

### Iteration 2
- Reviewer: Bob
- Date: 2026-01-08
- Comments: Excellent telemetry; add distributed lock for multi-instance safety
- Status: Approved
```

---

#### Section: Completion Summary

```markdown
## Completion Summary

Post-task comment summarizing work completed (per agent rules).

**What was implemented:**
- Listed deliverables

**Files created/modified:**
- app/Services/AgentSwitchService.php (new)
- app/Services/AgentInvocationService.php (new)
- app/Services/LoopSchedulerService.php (new)
- app/Http/Controllers/AgentLoopController.php (new)
- routes/api.php (modified)

**Tests added/updated:**
- PHASE-7-TEST-SCENARIOS.md (10 scenarios)
- Unit tests in tests/Unit/Services/AgentSwitch* (new)

**Follow-up tasks:**
- Phase 8 (GitHub Issue Sync)
- Phase 9 (Safe Branching)

**Next step:**
Begin Phase 8 implementation; GitHub Issue Sync depends on Phase 7 working.
```

---

## Complete Example

See [TASK-METADATA-SCHEMA-EXAMPLE.md](TASK-METADATA-SCHEMA-EXAMPLE.md) for a complete, real-world task file.

---

## Parser Requirements

### Node.js Parser (VS Code Extension)

**Tool:** `vscode-extension/src/taskParser.ts`

```typescript
interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  description: string;
  acceptanceCriteria: string[];
  subtasks: Subtask[];
  assignedAgent: AgentInfo;
  dependencies: string[]; // task IDs
  tags: string[];
  estimateMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  aiPrompt?: {
    objective: string;
    context: string;
    requirements: string[];
    expectedOutput: string;
    guardrails: string[];
  };
}

interface Subtask {
  order: number;
  title: string;
  description?: string;
  estimateMinutes?: number;
  dependencies?: string[]; // subtask orders
  completed: boolean;
}
```

**Parser functions:**

```typescript
// Parse YAML front matter
function parseYamlMetadata(content: string): Task;

// Extract Markdown sections
function extractSection(content: string, sectionName: string): string;

// Parse checklist items as criteria/subtasks
function parseChecklist(markdownList: string): string[];

// Validate schema
function validateTask(task: Task): ValidationError[];

// Serialize back to Markdown
function taskToMarkdown(task: Task): string;
```

### PHP Parser (Laravel Backend)

**Tool:** `app/Services/TaskParsingService.php`

```php
namespace App\Services;

class TaskParsingService
{
    /**
     * Parse a task file (Markdown with YAML front matter)
     */
    public function parseTaskFile(string $filePath): array;

    /**
     * Extract YAML metadata
     */
    protected function parseYamlMetadata(string $yaml): array;

    /**
     * Extract and parse Markdown sections
     */
    protected function extractMarkdownSections(string $content): array;

    /**
     * Validate task against schema
     */
    public function validateTask(array $taskData): array; // returns errors

    /**
     * Generate YAML from task array
     */
    public function generateYaml(array $taskData): string;

    /**
     * Generate Markdown from task array
     */
    public function generateMarkdown(array $taskData): string;
}
```

---

## Compatibility

### VS Code

- ✅ Native Markdown preview
- ✅ YAML syntax highlighting (with extensions)
- ✅ Tree view display of tasks
- ✅ Command palette for task operations (create, complete, etc.)
- ✅ Link navigation (dependencies, GitHub issues)

### GitHub

- ✅ Display in repository browser
- ✅ Links to issues (if github_issue_id set)
- ✅ Searchable via GitHub search
- ✅ Possible: render as wiki pages or PR templates

### Automation

- ✅ Parseable from Node.js (YAML + regex)
- ✅ Parseable from PHP (YAML + Laravel)
- ✅ Diffable (markdown is line-based)
- ✅ Versionable (Git tracks changes)
- ✅ Queryable (extract fields from YAML)

---

## Validation Rules

When parsing tasks, enforce:

1. **Required Fields:**
   - id, title, type, status, priority
   - Description with Goal section
   - Acceptance Criteria (at least 1)

2. **Enum Constraints:**
   - type ∈ {feature, bug, refactor, maintenance, architecture, testing, documentation}
   - status ∈ {pending, in_progress, review, testing, blocked, done, deferred, cancelled}
   - priority ∈ {critical, high, medium, low}
   - complexity ∈ {low, medium, high, expert}

3. **Dependency Rules:**
   - No circular dependencies
   - All referenced task IDs must exist in repository
   - Parent task must exist if parent_task set

4. **Temporal Rules:**
   - created_at ≤ updated_at
   - updated_at ≤ completed_at (if completed_at set)
   - estimate_minutes > 0

5. **Format Rules:**
   - Task ID matches pattern: `TASK-[a-z0-9]+-[a-z0-9]+`
   - All dates ISO 8601
   - No breaking Markdown syntax
   - YAML valid and parseable

---

## Best Practices

1. **Naming:** Use kebab-case for task IDs, titles clear and actionable
2. **Descriptions:** Be specific; vague goals = wasted work
3. **Acceptance Criteria:** Testable, measurable, no "and/or"
4. **Subtasks:** 15–45 minutes each; split anything >60 min
5. **AI Prompts:** Include constraints and guardrails; be explicit
6. **Dependencies:** Document why (not just "depends on X")
7. **Tags:** Use consistent, lowercase tags across project
8. **Review:** Every task should be reviewed before starting (Phase 8 integration)

---

## Versioning & Future Extensions

**Current Version:** 1.0 (Jan 7, 2026)

**Planned Extensions (Phase 11+):**

- Linked subtasks (not just children, but cross-task dependencies)
- SLA/deadline tracking
- AI model versioning per task
- Cost tracking (compute, human time)
- Automated task generation from code analysis

---

## Sign-off

This specification provides a robust, machine-parseable, and human-friendly format for task management in the Copilot Orchestration Extension.

**Status:** ✅ Approved for production use
