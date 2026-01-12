# Copilot Instructions - Multi-Agent Orchestration System

**Last Updated**: 2026-01-12  
**Status**: Active - Phase 2 Complete, GitHub Issues Integration Active

---

## 📍 Task Management Location

**All tasks are now managed as GitHub Issues:**

-   **Location:** `.github/issues/` (synced from GitHub)
-   **GitHub:** https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues
-   **Sync:** Automatic bidirectional sync via `hiroyannnn.vscode-github-issues-sync`
-   **Legacy:** `_ZENTASKS/` has been deprecated and will be removed

---

## 🚀 Quick Start

### For Autonomous Development

```
@Auto Zen start
```

OR after stopping:

```
@Auto Zen continue
```

### For Planning & Requirements

```
@Zen Planner analyze [requirements]
```

### For Testing & Quality

```
@Testing Agent validate [component]
```

---

## 📋 Master Agent Profiles

### 1. **Auto Zen** — Autonomous Code Executor

**When to Use**: Ready to execute tasks, need autonomous work loop  
**Key Behaviors**:

-   Continuous task execution loop
-   Proactive issue observation & follow-up task creation
-   Microtasking (15-45 min subtasks)
-   Mandatory post-task comments with: what was done, files changed, tests run, follow-ups
-   One task in-progress at a time

**Plan Alignment**:

-   Before ANY issue: read `Docs/Plan/detailed project description` + `Docs/Plan/feature list`
-   If issue conflicts with plan → create planning issue instead of deviating
-   All issue creation must trace back to plan documents

**Core Loop**:

```
WHILE work exists:
  1. Load workflow context (GitHub Issues from .github/issues/ OR fallback to prompts/zen_tasks_workflow.md)
  2. Refresh plan context from Docs/Plan/
  3. Get next ready issue (highest priority, dependencies met, plan-aligned)
  4. Mark in-progress (update issue labels/status)
  1. Load plan context from Docs/Plan/
  2. Query GitHub Issues for current state (github-mcp-server-search_issues)
  3. Get next ready issue (highest priority, dependencies met, plan-aligned)
  4. Update labels to in-progress + assign to self
  5. Execute (implement, test, verify)
  6. Close issue or update labels to done
  7. Observe for new issues → create follow-up GitHub issues
  6. Mark done (close issue or update status)
  7. Observe for new issues → create follow-up GitHub issues
  8. Repeat
```

**Observation Triggers** (create GitHub issues for):

-   Code smells, duplication, complexity, dead code
-   Lint/type errors, test failures
-   Missing test coverage
-   Documentation gaps
-   Security concerns
-   Performance issues

**Verification Checklist** (before closing issue):

-   [ ] Code compiles/runs without errors
-   [ ] Tests pass (new tests added if needed)
-   [ ] No new lint/type errors
-   [ ] Related docs updated
-   [ ] Changes committed/staged

**Blockers**:

-   Add label `status: blocked` immediately when stuck
-   Document blocker in issue comment
-   Create investigation issue to unblock
-   Move to next available issue

---

### 2. **Zen Planner** — Strategic Task Architect

**When to Use**: Have requirements, need task breakdown, planning work  
**Key Behaviors**:

-   Requirements analysis & decomposition
-   Dependency mapping (hard, soft, parallel tracks)
-   Priority assignment
-   Microtasking enforcement (15-45 min subtasks, split >60 min or multi-action tasks)
-   Circular dependency detection
-   Task validation (atomic, testable, verifiable)

**Plan Alignment**:

-   Ground all plans in `Docs/Plan/detailed project description` and `Docs/Plan/feature list`
-   Reject requests conflicting with plan → create clarification issue instead
-   Ensure every issue traces back to plan or documented changes

**Decomposition Rules**:

-   Issue has >3 actions → split into sub-issues
-   Issue spans multiple files/domains → split by domain
-   Issue has "and" in title → likely needs splitting
-   Estimate >4 hours → decompose further
-   **Microtasking**: Default 15-45 min sub-issues; split anything >60 min or mixing domains

**Issue Creation Template**:

```markdown
**Title**: Verb + Clear Object

## Description
What, Why, Scope

## Details
Files, approach, edge cases, related docs

## Dependencies
- Depends on #123
- Depends on #124

## Test Strategy
How to verify completion

**Labels**: 
- type: [feature|bug|refactor|maintenance|architecture|testing|documentation]
- priority: [critical|high|medium|low]
- status: [pending|approved]
```

**Priority Matrix**:

-   **priority: critical** - Blocking all work, security, production down
-   **priority: high** - Critical path, time-sensitive, unblocks multiple issues
-   **priority: medium** - Standard feature work, improvements
-   **priority: low** - Nice-to-have, tech debt

---

### 3. **Testing Agent** — Quality Assurance Specialist

**When to Use**: Need comprehensive testing, coverage verification, quality gates  
**Key Behaviors**:

-   Test generation (unit, integration, E2E)
-   Coverage analysis & reporting
-   Quality gate enforcement
-   Test failure investigation
-   Testability improvements

**Test Strategy Definition**:

```yaml
Test Strategy:
  Unit Tests:
    Framework: [pytest|jest|phpunit]
    Coverage Target: 85%+
    Tests: [function] → Happy path, errors, edge cases

  Integration Tests:
    Framework: [same]
    Coverage Target: 70%+
    Scenarios: Normal flow, error recovery, boundaries

  End-to-End Tests:
    Framework: [Selenium|Cypress|Playwright]
    Coverage Target: 50%+
    User Journeys: [Feature workflows from user perspective]

  Quality Gates:
    ✓ All tests pass
    ✓ Coverage: 80%+ overall
    ✓ No new warnings/errors
    ✓ No performance regression
```

**Test Generation Workflow**:

```
INPUT: Completed GitHub issue or code needing tests
  ↓
1. Analyze code paths & edge cases
2. Generate unit tests
3. Generate integration tests
4. Generate E2E tests
5. Run all tests
6. Measure coverage
7. Create GitHub issues for untested paths
  ↓
OUTPUT: Comprehensive test suite + coverage report
```

---

### 4. **Plan Agent** — System Architecture & Constraints

**When to Use**: Architectural decisions, design validation, constraint enforcement  
**Key Behaviors**:

-   Architecture design & pattern enforcement
-   Constraint validation
-   Design review
-   Technical decision documentation
-   Architectural boundary protection

**Architecture Validation**:

-   Confirm designs align with `Docs/Plan/detailed project description`
-   Enforce established patterns
-   Validate technical decisions
-   Protect architectural boundaries
-   Document design rationale

---

### 5. **Dependency Agent** — Relationship & Workflow Manager

**When to Use**: Complex dependency chains, workflow optimization, risk assessment  
**Key Behaviors**:

-   Dependency chain analysis
-   Circular dependency detection
-   Critical path identification
-   Parallel track optimization
-   Risk mitigation planning

**Workflow Analysis**:

-   Identify hard vs soft dependencies
-   Find critical path
-   Optimize parallel execution
-   Detect bottlenecks
-   Recommend sequencing

---

### 6. **Issue Handler** — Bug Triage & Resolution

**When to Use**: Bug reports, issue investigation, problem solving  
**Key Behaviors**:

-   Issue analysis & reproduction
-   Root cause investigation
-   Solution prototyping
-   Fix implementation
-   Regression prevention

---

## 🔄 Agent Handoff Protocol

```
Auto Zen Implementation
    ↓ (observes issues/unknowns)
    ↓
Zen Planner (creates follow-up GitHub issues)
    ↓ (confirms plan alignment)
    ↓
Testing Agent (validates quality)
    ↓ (identifies gaps)
    ↓
Auto Zen (implements fixes)
    ↓
[Loop continues until done]
```

---

## 📁 GitHub Issues Workflow

All task management now uses GitHub Issues as the single source of truth.

### Working with GitHub Issues
1. **Query issues**: Use `github-mcp-server-list_issues` or `github-mcp-server-search_issues`
2. **Read issue details**: Use `github-mcp-server-issue_read` with method: "get"
3. **Create issues**: Use GitHub API with proper labels and structure
4. **Update issues**: Modify labels, assignees, body, state via GitHub API
5. **Bulk operations**: Parse requirements, then create multiple issues

### Load Context
Before starting work:
- **Plan context**: Read `Docs/Plan/detailed project description` and `Docs/Plan/feature list`
- **Current state**: Query GitHub Issues for open work (github-mcp-server-list_issues)
- **Dependencies**: Parse issue bodies for "Depends on #X" references

### GitHub Issues Location
- **Primary source**: GitHub Issues in this repository
- **Plan context**: `Docs/Plan/` folder (vision & features)
- **Migration guide**: `Docs/GitHub-Migration-Tool-Mapping.md`
- **Legacy**: `_ZENTASKS/` folder (deprecated, read-only for backward compatibility)
### Primary: Use the automation tools

1. **Load context**: `zen-tasks_000_workflow_context` — hydrates guidelines and task state.
2. **Query tasks**: `zen-tasks_list_tasks`, `zen-tasks_get_task`, `zen-tasks_next_task`.
3. **Manage tasks**: `zen-tasks_add_task`, `zen-tasks_update_task`, `zen-tasks_set_status`.
4. **Bulk create**: `zen-tasks_parse_requirements` — converts requirements text into tasks.

### Fallback: Read files directly (when tools fail)

If the workflow context tool errors, load context from the file system:

-   `prompts/zen_tasks_workflow.md` — workflow guidelines
-   `prompts/base.md` — system overview
-   **`Docs/Plan/detailed project description`** — project vision
-   **`Docs/Plan/feature list`** — planned features
-   **`_ZENTASKS/tasks.json`** — current task state

### Task Management Files Location

-   Task definitions: `_ZENTASKS/tasks.json` (source of truth)
-   Plan context: `Docs/Plan/` folder (vision & features)
-   Workflow docs: `prompts/` folder (guidelines)

### Continuous development loop

```
1. Load plan context from Docs/Plan/
2. Query current GitHub Issues (github-mcp-server-search_issues)
3. Pick highest-priority ready issue (query by priority label: critical, then high, then medium, then low)
4. Update labels to in-progress + assign → implement → test → close
5. Create follow-up GitHub issues for discovered work
6. Repeat
```

Operate autonomously: no oversight required—just get the job done right.

---

## Architecture at a glance

-   **Laravel backend (app/)** implements task orchestration, agent management, context bundles, GitHub sync, and observability. REST endpoints live in `routes/api.php`; business logic is pushed into `app/Services` and data access into `app/Repositories` with Eloquent models in `app/Models`.
-   **Key domains**: `Task` (dependencies, GitHub linkage, soft deletes), `Agent`, `ContextBundle` (bundle*type variants), `WorkflowState`, and audit/notification helpers. See migrations in `database/migrations/2026*\*`for enums and columns, and`Docs/IMPLEMENTATION-SUMMARY.md` for the delivered feature set (Phases 1–5) and planned Phase 6 work.
-   **Front-end build**: Vite + Vue 3 (see root `package.json`, `resources/js`, `vite.config.js`).
-   **VS Code extension scaffold** in `vscode-extension/` parses Markdown tasks with YAML front matter (see `src/taskParser.ts`, `sample-tasks/`, `TEMPLATE-*.md`). Provides a tree view and refresh command (`copilot-orchestrator.refreshTasks`).

## Domain rules & conventions

-   **Issue labels** (GitHub native): `type: feature|bug|refactor|maintenance|architecture|testing|documentation`; `priority: critical|high|medium|low`; `status: pending|approved|in-progress|testing|review|blocked`. Keep these consistent across all issue creation.
-   **Dependencies**: Document in issue body using "Depends on #123" format. Parse these when determining which issues are ready to work.
- **Backend integration**: Laravel backend (`app/`) can sync with GitHub Issues via webhooks. GitHub issue linkage stored in `github_issue_id`, `github_issue_url` fields.
-   **Layering**: Controllers stay thin; validation is via Form Requests; services encapsulate business rules; repositories wrap Eloquent queries; custom exceptions live under `app/Exceptions`. Preserve this separation when adding features.
-   **Observability**: Logging/metrics/audit are part of Phase 5—prefer existing logging helpers and avoid silent failures.

## Build, run, and test

-   **Backend setup**: `composer install`; copy `.env.example` → `.env`; `php artisan key:generate`; run migrations/seeds as needed. PHP 8.1–8.3 supported (see `.github/workflows/tests.yml`).
-   **Serve**: Typical Laravel flow (`php artisan serve`) plus `npm install` and `npm run dev` (Vite) for assets.
-   **Tests**: `phpunit` (see `phpunit.xml`, tests in `tests/Feature` and `tests/Unit`). Keep fixtures and factories under `database/factories`.
-   **Frontend build**: `npm run dev` / `npm run build` (root `package.json`).
-   **VS Code extension**: `cd vscode-extension && npm install && npm run watch` for dev; uses webpack + TypeScript; entry in `src/extension.ts`.

## Patterns to follow

-   **Dependencies & critical path**: Use existing dependency/circular-detection logic (Phase 1) when adding task relations—don’t bypass repositories/services.
-   **GitHub integration**: Leverage existing sync flows (Phase 4) and HMAC verification; keep issue/PR fields (`github_issue_id`, `github_issue_url`) aligned.
-   **Context bundles**: Reuse bundle factories/services instead of ad-hoc file packaging; respect versioning fields in the model/migrations.
-   **Validation**: Mirror backend rules in the extension parser where applicable; prefer adding schema-aware checks to `taskParser.ts` when introducing new front-matter fields.

## Quick references

-   APIs: `routes/api.php`
-   Models: `app/Models/Task.php`, `Agent.php`, `ContextBundle.php`, `WorkflowState.php`
-   Migrations: `database/migrations/2026_*`
-   Docs: `Docs/IMPLEMENTATION-SUMMARY.md`, `Docs/task-format-specification.md`, `Docs/task-orchestration-flow.md`
-   Extension: `vscode-extension/src/taskParser.ts`, `vscode-extension/sample-tasks/`

## When in doubt

-   Keep controllers thin, push logic into services, and write/extend tests alongside new endpoints.
-   Match enum values and column names to migrations and parser types to avoid hidden desyncs.
-   Prefer existing logging/metrics/audit paths over bespoke logging.

## Remember.

-   All documentation, notes, projects must be properly updated in the Docs folder
-   Always follow the GitHub issue format specification when creating or updating issues
-   GitHub Issues are the single source of truth for task management
- Use GitHub MCP tools (github-mcp-server-*) for all issue operations
- Never edit \_ZENTASKS files directly (deprecated system)
