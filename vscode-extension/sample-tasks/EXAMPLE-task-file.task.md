---
id: TASK-demo-001
title: Example Task File with Full Metadata
type: feature
priority: high
status: pending
dependencies: []
assignees: [coder, tester]
labels: [example, documentation]
estimate: "3h"
due: "2026-01-20"
subtasks:
  - id: TASK-demo-001A
    title: Set up project structure
    priority: high
  - id: TASK-demo-001B
    title: Implement core functionality
    priority: high
  - id: TASK-demo-001C
    title: Write unit tests
    priority: medium
github_issue_id: 99
github_issue_url: "https://github.com/owner/repo/issues/99"
context_bundle: "context/task-demo-001-bundle.json"
format_version: "1.0"
---

# Example Task File

This is an example `.task.md` file demonstrating all the features of the Task File Support extension.

## Goal

Create a comprehensive example showing how task metadata and CodeLens features integrate with the VS Code extension to provide an enhanced task management workflow.

## Features Demonstrated

### 1. CodeLens Actions
- **Execute Now**: Trigger task execution through the orchestrator
- **Status Display**: Click to change task status from pending → approved → in_progress → testing → review → completed
- **Open Context**: Access the associated context bundle at `context/task-demo-001-bundle.json`
- **Link GitHub**: This task is already linked to issue #99
- **Metadata Display**: Type: feature • Priority: high • Est: 3h

### 2. Inline Decorations
The YAML front matter above has special syntax highlighting:
- **Required fields** (id, title, type, priority, status) appear bold with yellow background
- **Status field** has blue background
- **Priority field** has orange background
- **Dependencies** (like TASK-demo-001A) are highlighted in green

### 3. Task References
This task depends on completing related work. Other task references like TASK-demo-001A, TASK-demo-001B, and TASK-demo-001C are clickable.

## Acceptance Criteria

- [x] Task file parses correctly with no YAML errors
- [ ] CodeLens actions execute properly
- [ ] Status changes are reflected in file and status bar
- [ ] GitHub issue #99 opens when clicking "Issue #99" CodeLens
- [ ] Context bundle can be created and opened
- [ ] Dependency graph updates when dependencies are modified

## Implementation Details

### Subtasks

The task includes subtasks that break down the work:

1. **TASK-demo-001A**: Set up project structure
   - Create directory layout
   - Initialize configuration files
   - Set up development environment

2. **TASK-demo-001B**: Implement core functionality
   - Write main features
   - Integrate with orchestrator API
   - Handle error cases

3. **TASK-demo-001C**: Write unit tests
   - Achieve 80%+ code coverage
   - Test edge cases
   - Validate error handling

### Integration Points

This task integrates with:
- GitHub issue #99 for tracking external requirements
- Context bundle for storing implementation context
- Orchestrator workflow for execution management

## Status Transitions

```
pending → approved → in_progress → testing → review → completed
              ↓                                           ↓
            blocked                                    failed
```

Use the Status CodeLens to transition between states.

## Related Documentation

- [Task Format Specification](../Docs/task-format-specification.md)
- [Task File Support Guide](./TASK-FILE-SUPPORT.md)
- [Task Orchestration Flow](../Docs/task-orchestration-flow.md)

## Next Steps

1. Open the `context/` directory to create the context bundle
2. Click "Execute Now" to trigger task execution
3. Update dependencies as related tasks are completed
4. Track progress by updating status through CodeLens
