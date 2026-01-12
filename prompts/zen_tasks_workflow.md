# Zen Tasks Workflow Context

> **⚠️ MIGRATION NOTICE**: The Zen Tasks system (_ZENTASKS) has been migrated to GitHub Issues.  
> All new task management should use GitHub Issues as the primary system.  
> See `Docs/GitHub-Migration-Tool-Mapping.md` for the complete migration guide.  
> This file is maintained for backward compatibility and historical reference.

## Overview

This document provides essential guidelines for structured, dependency-driven development. 

**Current System**: GitHub Issues (primary)  
**Legacy System**: Zen Tasks (_ZENTASKS) - read-only, deprecated

## GitHub Issues Workflow (Current)

### Loading workflow context
1. Read project plan: `Docs/Plan/detailed project description` and `Docs/Plan/feature list`
2. Query GitHub Issues: Use `github-mcp-server-list_issues` or `github-mcp-server-search_issues`
3. Review migration guide: `Docs/GitHub-Migration-Tool-Mapping.md`

### GitHub Issue Operations
- **List issues**: `github-mcp-server-list_issues`
- **Search issues**: `github-mcp-server-search_issues` with query filters
- **Read issue**: `github-mcp-server-issue_read` (method: get)
- **Create issue**: GitHub API with proper labels and structure
- **Update issue**: Modify labels, assignees, body via GitHub API

---

## Legacy: Zen Tasks System (Deprecated)

**Status**: Read-only, no new tasks should be created in _ZENTASKS

### Historical Context
Previously, the system used _ZENTASKS/tasks.json for task management with these tools:
- ~~`zen-tasks_000_workflow_context`~~ (removed)
- ~~`zen-tasks_list_tasks`~~ → Use `github-mcp-server-list_issues`
- ~~`zen-tasks_get_task`~~ → Use `github-mcp-server-issue_read`
- ~~`zen-tasks_next_task`~~ → Use `github-mcp-server-search_issues` with filters
- ~~`zen-tasks_add_task`~~ → Create GitHub Issues
- ~~`zen-tasks_update_task`~~ → Update GitHub Issues
- ~~`zen-tasks_set_status`~~ → Update GitHub Issue labels

## Core Principles

### 1. Task-Driven Development

- Break down complex features into discrete, manageable tasks
- Each task should have a clear, testable outcome
- Tasks should be independent where possible or have explicit dependencies

### 2. Dependency Management

- Explicitly declare task dependencies using task IDs
- Ensure dependency chains are acyclic (no circular dependencies)
- Tasks can only be started when all dependencies are completed

### 3. Priority System

- **High**: Critical features, blocking issues, security concerns
- **Medium**: Standard features, improvements, non-blocking bugs
- **Low**: Nice-to-have features, minor optimizations, technical debt

### 4. Status Lifecycle

- **pending**: Task is defined but not yet started
- **in-progress**: Work is actively being done
- **blocked**: Task cannot proceed (waiting on external factors)
- **review**: Task is complete and awaiting review
- **done**: Task is complete and verified
- **deferred**: Task postponed to future iteration
- **cancelled**: Task no longer needed

## Workflow Process

### Phase 1: Requirements Analysis

1. Parse project requirements or user stories
2. Break down into logical tasks
3. Identify dependencies between tasks
4. Assign priorities based on business value and technical dependencies

### Phase 2: Task Planning (Legacy - Now use GitHub Issues)

~~1. Use `zen-tasks_parse_requirements` to create initial task structure~~  
**Current**: Parse requirements and create GitHub Issues with proper labels

2. Review and refine issue descriptions
3. Add technical details and acceptance criteria in issue body
4. Define test strategies in each issue

### Phase 3: Execution (Legacy - Now use GitHub Issues)

~~1. Use `zen-tasks_next_task` to identify ready-to-start tasks~~  
**Current**: Query GitHub Issues with `github-mcp-server-search_issues` using filters

2. Update issue labels to `status: in-progress` before beginning work
3. Follow test-driven development when appropriate
4. Update issue labels and comments as work progresses
5. Maintain a human-readable checklist in `Docs/TO DO/` (e.g., `EXECUTION-ORDER.md`) mirroring GitHub Issues DAG and critical path to aid multi-issue coordination and handoffs.

### Phase 4: Validation

1. Verify tasks meet acceptance criteria
2. Run tests defined in test strategy
3. Mark tasks as `review` or `done`
4. Update dependent tasks

## Best Practices

### Task Creation

- Write clear, actionable titles (verb + object)
- Include detailed descriptions with context
- Specify acceptance criteria
- Define test strategy
- Link to related tasks or documentation

### Task Updates

- Keep status current
- Add details as implementation progresses
- Update test strategies based on actual implementation
- Document any deviations from original plan

### Dependency Management

- Review dependency chains before starting work
- Identify and break circular dependencies early
- Consider parallelizable work streams
- Keep dependency graphs shallow when possible
 - Publish an ordered execution list under `Docs/TO DO/` to align team communication with Zen Tasks status, especially during multi-task execution.

### Multi-Task Coordination and Handoffs

- Use agent handoffs to keep work flowing:
	- Main: Auto Zen executes; Zen Planner refines when blockers arise.
	- Specialty: Planning assistance (blockers) and completion/next steps (milestones).
- For complex iterations, keep a synchronized "Order of Execution" document (`Docs/TO DO/EXECUTION-ORDER.md`) listing:
	- Critical path tasks in sequence
	- Parallelizable tracks
	- Requirements to-do checklist
	- Handoffs used and next steps

### To-Do Checklist Integration

- Maintain a lightweight, human-facing checklist in `Docs/TO DO/` to summarize:
	- Greeting and context
	- Ordered task list (critical path + parallel tracks)
	- Requirements to-do items
	- Agent handoffs in use
	- Notes (testing, strict typing, secret redaction)
 - Update this checklist alongside Zen Tasks status changes to preserve clarity during multitasking.

### Test Strategies

- Define how task completion will be verified
- Include unit, integration, and manual testing as needed
- Specify edge cases and error conditions
- Document test data requirements

## Task Properties

### Required

- **title**: Brief, descriptive name
- **description**: Detailed explanation of what needs to be done

### Optional

- **priority**: high | medium | low (default: medium)
- **dependencies**: Array of task IDs that must be completed first
- **details**: Technical specifications, implementation notes
- **testStrategy**: How to verify task completion
- **status**: Current state (managed separately)

## Common Patterns

### Feature Implementation

```text
1. Design task (high priority, no dependencies)
2. Backend implementation (depends on design)
3. Frontend implementation (depends on design)
4. Integration (depends on backend + frontend)
5. Testing (depends on integration)
```

### Bug Fix

```text
1. Investigate/reproduce (high priority)
2. Implement fix (depends on investigation)
3. Add regression tests (depends on fix)
4. Verify in staging (depends on tests)
```

### Refactoring

```text
1. Add tests for existing behavior
2. Refactor implementation (depends on tests)
3. Verify tests still pass (depends on refactor)
```

## Integration with Development Tools

### Version Control

- Create feature branches for high-priority tasks
- Commit work incrementally
- Reference task IDs in commit messages
- Link pull requests to tasks

### Testing

- Run tests before marking tasks as done
- Add new tests as defined in test strategy
- Update existing tests as needed
- Document test coverage

### Documentation

- Update relevant documentation as tasks complete
- Keep README and API docs current
- Document architectural decisions
- Maintain changelog

## Error Handling

### Blocked Tasks

- Identify blocking issue clearly
- Create task to resolve blocker
- Update status to `blocked`
- Track blocker resolution

### Failed Validation

- Update task with failure details
- Return to `in-progress` status
- Revise implementation or test strategy
- Re-validate when ready

### Scope Changes

- Update task description and details
- Adjust dependencies if needed
- Re-evaluate priority
- Consider splitting into multiple tasks

## Reporting and Metrics

### Progress Tracking

- Monitor completed vs. total tasks
- Track average time per priority level
- Identify bottlenecks in dependency chains
- Review blocked and deferred tasks regularly

### Quality Metrics

- Test coverage per task
- Defect rate post-completion
- Review feedback incorporation
- Documentation completeness

## Conclusion

The Zen Tasks system provides structure and visibility for development work. By following these guidelines, teams can:

- Maintain clear focus on current work
- Understand dependencies and blockers
- Track progress systematically
- Ensure quality through defined test strategies
- Collaborate effectively with shared task context

Remember: The goal is productive development, not perfect task management. Adapt these guidelines to your team's needs and workflow.
