# Task File Format Specification v1.0

**Copilot Orchestration Extension (COE) - Task Markdown Format**

**Version:** 1.0  
**Last Updated:** January 2, 2026  
**Compatibility:** VS Code Markdown Preview, Node.js (yaml ^2.6.0)

---

## Overview

This document defines the standardized Markdown format for task files in the Copilot Orchestration Extension. Each task file uses YAML front matter for structured metadata and Markdown sections for human-readable descriptions, acceptance criteria, and contextual information.

### Design Principles

1. **Human-readable** - Tasks should be easily understood in VS Code Markdown preview
2. **Machine-parsable** - YAML front matter enables automated processing
3. **Type-safe** - Strict enums align with backend database schema
4. **Extensible** - Custom fields supported for specialized workflows
5. **Consistent** - Standardized sections per task type
6. **Validation-friendly** - Clear required/optional field specifications

---

## File Structure

```markdown
---
[YAML Front Matter]
---

[Markdown Body Sections]
```

### File Naming Convention

- **Pattern:** `TASK-{ID}-{slug}.md`
- **Examples:**
  - `TASK-001-auth.md`
  - `TASK-042-refactor-parser.md`
  - `BUG-015-session-leak.md`

---

## YAML Front Matter

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | `string` | Unique task identifier (auto-generated from filename if missing) | `TASK-001` |
| `title` | `string` | Concise task title | `Authentication flow skeleton` |
| `type` | `TaskType` | Task category (see enum below) | `feature` |
| `priority` | `TaskPriority` | Urgency level (see enum below) | `high` |
| `status` | `TaskStatus` | Current workflow state (see enum below) | `pending` |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `dependencies` | `string[]` | Task IDs that must complete first | `[TASK-001, TASK-003]` |
| `assignees` | `string[]` | Agent types assigned to task | `[planner, coder]` |
| `labels` | `string[]` | Categorization tags | `[auth, backend, security]` |
| `estimate` | `string` | Time estimate (human-readable or minutes) | `4h` or `240` |
| `due` | `string` | Due date (ISO 8601 or natural language) | `2026-01-15` or `next week` |
| `subtasks` | `Subtask[]` | Nested sub-tasks (see format below) | See Subtasks section |
| `github_issue_id` | `number` | Linked GitHub Issue number | `42` |
| `github_issue_url` | `string` | Full GitHub Issue URL | `https://github.com/owner/repo/issues/42` |
| `context_bundle` | `string` | Path to associated context bundle | `context/task-001-bundle.json` |
| `format_version` | `string` | Format specification version | `1.0` |

### Extended Fields (Backend-Only)

These fields are managed by the backend and should NOT be included in `.md` files:

- `assigned_agent` - Single agent ID (backend assigns from `assignees`)
- `assigned_github_agent` - GitHub Copilot agent identifier
- `branch_name` - Git branch for task work
- `estimated_effort` - Normalized effort in minutes
- `actual_effort` - Actual time spent (minutes)
- `started_at` - Timestamp when status changed to `in_progress`
- `completed_at` - Timestamp when status changed to `completed`
- `parent_task_id` - Parent task for hierarchical relationships

---

## Type Enumerations

### TaskType

**Strict Enum** (must match database schema):

```typescript
type TaskType = 
  | 'feature'        // New functionality
  | 'bug'            // Defect correction
  | 'refactor'       // Code restructuring
  | 'maintenance'    // Dependency updates, health checks
  | 'architecture'   // Design decisions, ADRs
  | 'testing'        // Test creation, quality validation
  | 'documentation'; // Docs, guides, API documentation
```

### TaskPriority

```typescript
type TaskPriority = 
  | 'critical'  // Immediate action required (production down, security breach)
  | 'high'      // Next sprint priority
  | 'medium'    // Backlog consideration
  | 'low';      // Nice-to-have enhancements
```

### TaskStatus

**Workflow States** (aligned with backend state machine):

```typescript
type TaskStatus = 
  | 'pending'      // Created, awaiting approval
  | 'approved'     // Ready for assignment
  | 'in_progress'  // Actively being worked on
  | 'testing'      // Implementation complete, in QA
  | 'review'       // Code review in progress
  | 'completed'    // Successfully finished
  | 'failed'       // Implementation failed, needs retry
  | 'blocked'      // Waiting on external dependency
  | 'cancelled';   // No longer needed
```

---

## Subtask Format

### String Format (Simple)

Use for quick, lightweight subtasks without metadata:

```yaml
subtasks:
  - Define initial module boundaries
  - Identify external integration points
  - Capture open questions for stakeholders
```

**Limitations:** No priority, status, or assignee tracking. Inherits parent task metadata.

### Object Format (Structured)

Use for complex subtasks requiring independent tracking:

```yaml
subtasks:
  - id: TASK-001A
    title: Login form skeleton
    priority: medium
    status: pending
    assignees: [coder]
    estimate: "1h"
  - id: TASK-001B
    title: Session persistence wiring
    priority: high
    status: in_progress
    assignees: [coder, tester]
    estimate: "2h"
```

**Capabilities:** Full metadata support, independent status tracking, recursive nesting.

### Nested Subtasks (Recursive)

```yaml
subtasks:
  - id: TASK-001A
    title: Frontend authentication
    priority: high
    subtasks:
      - id: TASK-001A1
        title: Login form component
        priority: medium
      - id: TASK-001A2
        title: Token storage logic
        priority: high
```

**Best Practice:** Limit nesting to 2-3 levels for maintainability.

---

## Markdown Body Sections

### Standard Sections by Task Type

#### Feature Tasks

```markdown
## Goal
Clear objective statement - what capability are we building?

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Approach (Optional)
High-level implementation strategy

## Dependencies & Risks (Optional)
External factors that could impact delivery
```

#### Bug Tasks

```markdown
## Problem
Description of the defect or unexpected behavior

## Steps to Reproduce
1. Step one
2. Step two
3. Observe error

## Expected Behavior
What should happen

## Actual Behavior
What currently happens

## Root Cause (Optional)
Analysis of underlying issue

## Fix Approach
Proposed solution
```

#### Refactor Tasks

```markdown
## Current State
Description of existing code structure

## Problems
- Technical debt issue 1
- Technical debt issue 2

## Proposed Changes
Refactoring strategy and goals

## Migration Path (Optional)
How to transition existing code

## Success Metrics
- Metric 1 (e.g., reduced complexity)
- Metric 2 (e.g., improved test coverage)
```

#### Architecture Tasks

```markdown
## Context
Background information and motivations

## Decision
Architectural choice being documented

## Rationale
Why this approach was selected

## Alternatives Considered
Other options evaluated and reasons for rejection

## Consequences
- Positive consequence 1
- Negative consequence 1
- Trade-off 1

## Implementation Notes (Optional)
Guidance for developers
```

#### Testing Tasks

```markdown
## Scope
What functionality is being tested

## Test Types
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

## Coverage Goals
Target coverage percentage or critical paths

## Test Data Requirements (Optional)
Fixtures, mocks, or external data needed

## Success Criteria
- [ ] All tests passing
- [ ] Coverage threshold met
- [ ] Edge cases covered
```

#### Documentation Tasks

```markdown
## Audience
Who will use this documentation

## Scope
What topics/features to document

## Deliverables
- [ ] API reference
- [ ] User guide
- [ ] Architecture diagrams

## Format
Markdown, JSDoc, OpenAPI, etc.

## Examples & Tutorials (Optional)
Code samples to include
```

#### Maintenance Tasks

```markdown
## Maintenance Type
Dependency update | Health check | Performance optimization | Security patch

## Current State
Description of what needs maintenance

## Actions Required
- [ ] Action 1
- [ ] Action 2

## Testing & Validation
How to verify maintenance was successful

## Rollback Plan (Optional)
Recovery strategy if issues arise
```

---

## Agent Assignment Guidelines

### Single Agent Tasks

```yaml
assignees: [coder]
```

Simple tasks executed by one agent type.

### Multi-Agent Collaboration

```yaml
assignees: [architect, coder, tester]
```

Complex tasks requiring sequential handoffs:

1. **Architect** - Design approach
2. **Coder** - Implement solution
3. **Tester** - Validate quality

### Agent Type Reference

| Agent | Primary Responsibilities | Typical Task Types |
|-------|--------------------------|-------------------|
| `planner` | Requirements analysis, task decomposition | All types (initial breakdown) |
| `architect` | Design decisions, ADRs, pattern enforcement | architecture, refactor |
| `coder` | Implementation via GitHub Copilot | feature, bug, refactor |
| `tester` | Test generation, quality validation | testing, bug (verification) |
| `reviewer` | Code review, completion verification | All types (final check) |
| `documentation` | Docs, guides, API references | documentation, feature (docs) |
| `deployment` | CI/CD, release orchestration | maintenance, feature (deploy) |
| `maintenance` | Health monitoring, dependency updates | maintenance |

---

## Effort Estimation Format

### Recommended Formats

1. **Human-readable:** `2h`, `30m`, `3d`, `1w`
2. **Minutes (numeric):** `120`, `1440`
3. **Composite:** `2h 30m`

### Conversion Rules (for backend normalization)

- `m` → minutes (e.g., `30m` = 30)
- `h` → hours × 60 (e.g., `2h` = 120)
- `d` → days × 480 (8h workday) (e.g., `3d` = 1440)
- `w` → weeks × 2400 (5d workweek) (e.g., `1w` = 2400)
- Numeric only → assumed minutes (e.g., `120` = 120)

### Examples

```yaml
estimate: "4h"       # 240 minutes
estimate: "240"      # 240 minutes
estimate: "2h 30m"   # 150 minutes
estimate: "0.5d"     # 240 minutes
```

---

## Dependency Declaration

### Simple Dependencies

```yaml
dependencies: [TASK-001, TASK-003]
```

Task cannot start until TASK-001 and TASK-003 are `completed`.

### Cross-Project Dependencies (Future)

```yaml
dependencies:
  - TASK-042
  - PROJECT-X/TASK-007  # External project reference
```

### Dependency Validation

Parser MUST validate:

1. **No circular references** - Task cannot depend on itself (direct or transitive)
2. **Valid task IDs** - Referenced tasks must exist in workspace
3. **Status consistency** - Blocking tasks should be `completed` before dependent task can start

---

## GitHub Integration

### Linking to Issues

```yaml
github_issue_id: 42
github_issue_url: https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues/42
```

### Bi-directional Sync

- **Task → Issue:** Creating task can auto-create GitHub Issue
- **Issue → Task:** GitHub Issue can generate task file
- **Updates:** Status changes sync bidirectionally
- **Comments:** Issue comments → context bundle, task updates → issue comments

---

## Context Bundles

### Reference Format

```yaml
context_bundle: context/task-001-auth-bundle.json
```

### Context Bundle Contents

Context bundles provide scoped context to agents:

```json
{
  "task_id": "TASK-001",
  "type": "task_context",
  "files_included": [
    "app/Http/Controllers/AuthController.php",
    "resources/js/components/LoginForm.tsx"
  ],
  "architecture_notes": [
    "Follow Laravel Sanctum pattern",
    "Use TypeScript strict mode"
  ],
  "constraints": [
    "Must support OAuth2",
    "Session timeout: 30 minutes"
  ],
  "test_failures": [],
  "related_decisions": ["ADR-001-auth-strategy"]
}
```

---

## AI Prompt Block (optional)

Tasks should include an AI-ready prompt so agents can execute with minimal back-and-forth. Add this to YAML front matter or a dedicated section:

```yaml
ai_prompt:
  goal: "What the AI should accomplish"
  context: "Relevant system/domain info the AI must respect"
  acceptance_criteria:
    - "Testable criterion 1"
    - "Testable criterion 2"
  outputs:
    - "Expected artifact 1 (e.g., code, tests, docs)"
  constraints:
    - "Guardrail 1 (style/perf/security/privacy/SLOs)"
```

**Best Practices:**

- Keep the goal to one sentence.
- Use bullet acceptance criteria that are objectively testable.
- List concrete outputs (code, tests, docs, diagrams, links).
- State non-negotiable constraints (style guides, performance budgets, safety/privacy limits).
- Prefer this block in addition to the Markdown sections so both humans and agents benefit.

---

## Validation Rules

### Required Field Validation

Parser MUST enforce:

- ✅ `id` - Present or derivable from filename
- ✅ `title` - Non-empty string
- ✅ `type` - Valid TaskType enum value
- ✅ `priority` - Valid TaskPriority enum value
- ✅ `status` - Valid TaskStatus enum value

### Optional Field Validation

Parser SHOULD validate when present:

- `dependencies` - Array of strings (task IDs)
- `assignees` - Array of valid agent type strings
- `labels` - Array of strings
- `estimate` - Parseable effort format
- `due` - Valid date format
- `subtasks` - Array of strings or TaskFrontMatter objects

### Error Handling

Invalid tasks should:

1. **Log descriptive errors** - Include file path, line number, field name
2. **Provide suggestions** - e.g., "Did you mean 'feature' instead of 'feat'?"
3. **Fail gracefully** - Continue parsing other tasks, collect all errors
4. **Surface to UI** - Show validation errors in VS Code problems panel

---

## Examples

### Complete Feature Task

```markdown
---
id: TASK-001
title: Authentication flow skeleton
type: feature
priority: high
status: pending
dependencies: []
assignees: [planner, coder, tester]
labels: [auth, backend, security]
estimate: "4h"
due: "2026-01-10"
format_version: "1.0"
subtasks:
  - id: TASK-001A
    title: Login form skeleton
    priority: medium
    estimate: "1h"
  - id: TASK-001B
    title: Session persistence wiring
    priority: medium
    estimate: "2h"
  - id: TASK-001C
    title: Basic validation and errors
    priority: medium
    estimate: "1h"
---

## Goal

Create the foundational authentication flow scaffolding so subsequent tasks can layer on security and UX enhancements.

## Acceptance Criteria

- [ ] Landing page links to Login route
- [ ] Login form renders email/password inputs and submit button
- [ ] Fake submit handler logs payload to console for now
- [ ] Placeholder area for error display is present
- [ ] No backend integration yet (stub only)

## Technical Approach

Use Laravel Sanctum for API token management. Frontend will use React context for auth state.

## Dependencies & Risks

- Risk: Session strategy may change based on architecture review (TASK-002)
- Dependency: Routing must be configured before login page accessible
```

### Complete Bug Task

```markdown
---
id: BUG-015
title: Session timeout causes data loss
type: bug
priority: critical
status: in_progress
dependencies: []
assignees: [coder, tester]
labels: [bug, auth, data-loss]
estimate: "3h"
github_issue_id: 127
github_issue_url: https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues/127
format_version: "1.0"
---

## Problem

Users lose unsaved work when session expires silently in the background.

## Steps to Reproduce

1. Log in to application
2. Fill out long form (e.g., project creation wizard)
3. Wait 31 minutes (session timeout = 30min)
4. Click "Save" button
5. Observe: "Unauthorized" error, form data lost

## Expected Behavior

- Warning notification at 25 minutes: "Session expiring soon, save your work"
- Auto-save draft every 2 minutes while form is active
- Graceful session refresh on user activity

## Actual Behavior

Silent session expiration, no warning, data loss on submit.

## Root Cause

Frontend doesn't track session expiry time. API returns 401 with no context preservation.

## Fix Approach

1. Store session expiry timestamp in localStorage on login
2. Set interval to check expiry (every 60s)
3. Show warning modal at expiry - 5min
4. Implement auto-save to localStorage every 120s for active forms
5. On 401 response, attempt to restore from localStorage after re-auth
```

---

## Parser Implementation Guide

### Recommended Architecture

```typescript
// src/taskParser.ts

export interface ParserOptions {
  validateSchema?: boolean;       // Enable strict validation
  failOnInvalid?: boolean;        // Throw on first error vs collect all
  normalizeEffort?: boolean;      // Convert estimates to minutes
  resolveDependencies?: boolean;  // Validate dependency graph
}

export interface ValidationError {
  file: string;
  line?: number;
  field: string;
  message: string;
  suggestion?: string;
}

export interface ParseResult {
  tasks: ParsedTask[];
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Main parsing function
export function parseTaskDirectory(
  dirPath: string,
  options: ParserOptions = {}
): ParseResult;

// Single file parser
export function parseTaskFile(
  filePath: string,
  options: ParserOptions = {}
): { task: ParsedTask | null; errors: ValidationError[] };

// Validation functions
export function validateTaskType(type: string): type is TaskType;
export function validateTaskPriority(priority: string): priority is TaskPriority;
export function validateTaskStatus(status: string): status is TaskStatus;
export function validateDependencies(taskId: string, deps: string[], allTasks: Map<string, ParsedTask>): ValidationError[];

// Normalization functions
export function normalizeEffort(estimate: string): number; // Returns minutes
export function extractIdFromFilename(filename: string): string;
```

### Validation Strategy

**Three-Tier Approach:**

1. **Syntax Validation** - YAML parsing, front matter extraction
2. **Schema Validation** - Required fields, type enums, format rules
3. **Semantic Validation** - Dependency cycles, task references, context bundles

### Performance Considerations

- Cache parsed tasks to avoid re-parsing on each access
- Use lazy loading for subtask resolution
- Batch validate dependencies across all tasks (single graph traversal)
- Stream large directories instead of loading all into memory

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-02 | Initial specification release |

---

## Future Enhancements

**Under Consideration:**

- Custom field validation via JSON Schema
- Templating system for task generation
- AI-generated acceptance criteria
- Automatic dependency inference from code analysis
- Rich diff view for task updates
- Multi-language support for descriptions

---

## References

- [VS Code Markdown Guide](https://code.visualstudio.com/docs/languages/markdown)
- [YAML Specification](https://yaml.org/spec/1.2/spec.html)
- [TaskFrontMatter TypeScript Interface](../vscode-extension/src/types.ts)
- [Task Database Schema](../database/migrations/*_create_tasks_table.php)
- [Agent Configuration](../app/Models/Agent.php)
