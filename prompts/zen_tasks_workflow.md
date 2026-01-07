# Zen Tasks Workflow Context

## Overview

This document provides essential guidelines for structured, dependency-driven development using the Zen Tasks system.

## Loading the workflow context (must-do)

1. **Primary**: Invoke the automation entrypoint (`zen-tasks_000_workflow_context`) to hydrate the workflow context.
2. **File-system fallback** (when the tool reports missing files or cannot run):
	- Read this file directly from `prompts/zen_tasks_workflow.md` and `prompts/base.md`.
	- Load project planning context from `Docs/Plan/` (e.g., `Docs/Plan/detailed project description`, `Docs/Plan/feature list`).
	- Keep both prompt files and plan docs in sync so the automation can pick them up when it recovers.

Always ensure the workflow context is loaded **before** performing any zen-tasks operations.

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

### Phase 2: Task Planning

1. Use `zen-tasks_parse_requirements` to create initial task structure
2. Review and refine task descriptions
3. Add technical details and acceptance criteria
4. Define test strategies for each task

### Phase 3: Execution

1. Use `zen-tasks_next_task` to identify ready-to-start tasks
2. Mark tasks as `in-progress` before beginning work
3. Follow test-driven development when appropriate
4. Update task status as work progresses

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
