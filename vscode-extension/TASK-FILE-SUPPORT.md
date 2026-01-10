# Task File Support (.task.md) - VS Code Extension

## Overview

The Copilot Orchestrator VS Code extension now includes full support for creating and editing `.task.md` files with specialized CodeLens, real-time metadata parsing, and direct integration with the main orchestrator workflow.

## Features

### 1. CodeLens (Inline Action Buttons)

When editing a `.task.md` file, the following CodeLens actions appear at the top of the file:

#### Execute Now
- **Icon**: `$(play)`
- **Purpose**: Trigger immediate task execution through the orchestrator
- **Command**: `copilot-orchestrator.executeTask`
- **Arguments**: Task URI, Task ID
- **Output**: Emits `executeTask` event to orchestrator workflow

#### Status Display & Change
- **Icon**: Status emoji (⏳ 🔄 ✔️ 🚫 etc.)
- **Display**: Shows current status (e.g., "Status: in_progress")
- **Purpose**: View and change task status
- **Command**: `copilot-orchestrator.changeTaskStatus`
- **Interaction**: Opens status picker with all valid states

#### Context Bundle Management
- **Icon**: `$(file-symlink-file)`
- **Display**: Either "Open Context" or "Create Context" depending on linked bundle
- **Command**: `copilot-orchestrator.openContextBundle` or `copilot-orchestrator.createContextBundle`
- **Purpose**: Access associated context bundle files

#### GitHub Issue Linking
- **Icon**: `$(github)`
- **Display**: Either "Link GitHub" or "Issue #123" depending on linkage status
- **Command**: `copilot-orchestrator.linkGitHubIssue` or `copilot-orchestrator.openGitHubIssue`
- **Purpose**: Create or navigate to linked GitHub issue

#### Metadata Display
- **Icon**: `$(info)`
- **Display**: Shows type, priority, and estimate in compact format
- **Example**: "Type: feature • Priority: high • Est: 4h"
- **Command**: `copilot-orchestrator.showTaskMetadata`

#### Dependency Management
- **Icon**: `$(link)`
- **Display**: "Dependencies (N)" where N is the count
- **Command**: `copilot-orchestrator.manageDependencies`
- **Purpose**: View and modify task dependencies

### 2. Document Watcher & Real-time Updates

The extension monitors all `.task.md` files in the workspace:

- **File Creation**: Detects new `.task.md` files and parses metadata
- **File Changes**: Updates CodeLens and decorations on every edit
- **File Deletion**: Cleans up cached metadata
- **Live Parsing**: Validates YAML front matter as you type

### 3. Inline Decorations & Status Display

#### Status Bar Integration
- Shows task status, priority, and estimate in the bottom status bar when editing a `.task.md` file
- Example: "⏳ pending 🟡 medium • 4h"
- Automatically updates as you edit the file

#### Inline Metadata Display
- After the YAML front matter section, displays a formatted metadata summary
- Example: "Status: pending • Priority: medium • Est: 4h"
- Gray, italic text positioned after the closing `---`

### 4. Custom Syntax Highlighting

#### YAML Front Matter Highlighting
- **Required Fields**: Bold with yellow background (id, title, type, priority, status)
- **Status Field**: Blue background with underline
- **Priority Field**: Orange background with underline
- **Type Field**: Purple background with dotted underline
- **Dependencies**: Green highlighting for TASK-* references
- **Invalid Values**: Red wavy underline with error icon

#### Markdown Body Highlighting
- **Section Headers**: Bold, blue, with subtle background
- **Task References**: Task ID references (e.g., TASK-001) highlighted in blue with pointer cursor
- **GitHub Issues**: Issue references (#123) highlighted in cyan with pointer cursor

### 5. Task Interaction API

The `TaskInteractionAPI` provides programmatic access to task operations:

```typescript
// Execute a task
await taskInteractionAPI.executeTask(taskId, taskUri);

// Change status
await taskInteractionAPI.changeTaskStatus(taskId, taskUri);

// Manage context bundles
await taskInteractionAPI.createContextBundle(taskId, taskUri);
await taskInteractionAPI.openContextBundle(bundlePath);

// GitHub integration
await taskInteractionAPI.linkGitHubIssue(taskId, taskUri);
await taskInteractionAPI.openGitHubIssue(issueUrl);

// Show metadata
await taskInteractionAPI.showTaskMetadata(task);

// Manage dependencies
await taskInteractionAPI.manageDependencies(taskId, taskUri, dependencies);
```

#### Event Emitter

The API emits events for all major interactions:

```typescript
taskInteractionAPI.onTaskInteraction((event) => {
  switch (event.type) {
    case 'executeTask':
      // Task execution initiated
      // event.task contains ParsedTask
      break;
    case 'statusChanged':
      // Status updated
      // event.oldStatus, event.newStatus
      break;
    case 'contextBundleCreated':
      // Context bundle created
      // event.bundlePath
      break;
    case 'gitHubLinked':
      // GitHub issue linked
      // event.issueUrl, event.issueNumber
      break;
    case 'dependenciesChanged':
      // Dependencies modified
      // event.dependencies array
      break;
  }
});
```

## File Format

### Filename Convention
```
TASK-{ID}-{slug}.task.md
```

Examples:
- `TASK-001-auth.task.md`
- `TASK-042-refactor-parser.task.md`

### YAML Front Matter

```yaml
---
id: TASK-001
title: Authentication flow skeleton
type: feature
priority: high
status: pending
dependencies: [TASK-002, TASK-003]
assignees: [coder, tester]
labels: [auth, backend, security]
estimate: "4h"
due: "2026-01-15"
subtasks:
  - id: TASK-001A
    title: Login form skeleton
    priority: medium
github_issue_id: 42
github_issue_url: "https://github.com/owner/repo/issues/42"
context_bundle: "context/task-001-bundle.json"
---
```

### Markdown Body

```markdown
## Goal

Clear objective statement for the task.

## Acceptance Criteria

- Criterion 1
- Criterion 2
- Criterion 3

## Implementation Notes

Additional context and implementation details.

## Resources

Links to relevant documentation, related tasks, or external resources.
```

## Commands Reference

| Command | Keyboard Shortcut | Description |
|---------|-------------------|-------------|
| `copilot-orchestrator.executeTask` | — | Execute task immediately |
| `copilot-orchestrator.changeTaskStatus` | — | Update task status |
| `copilot-orchestrator.openContextBundle` | — | Open context bundle |
| `copilot-orchestrator.createContextBundle` | — | Create context bundle |
| `copilot-orchestrator.linkGitHubIssue` | — | Link GitHub issue |
| `copilot-orchestrator.openGitHubIssue` | — | Open linked GitHub issue |
| `copilot-orchestrator.showTaskMetadata` | — | Display task metadata |
| `copilot-orchestrator.manageDependencies` | — | Manage task dependencies |

## Integration with Orchestrator Workflow

Task file interactions emit events that can be consumed by the main orchestrator:

1. **Task Execution**
   - User clicks "Execute Now" CodeLens
   - Event emitted with task details
   - Orchestrator receives event and initiates execution workflow

2. **Status Updates**
   - User changes status via CodeLens
   - File is automatically updated with new status
   - Event emitted for workflow sync
   - CodeLens refreshed to show new status

3. **Context Bundles**
   - User creates context bundle from CodeLens
   - Bundle file created with metadata
   - Event emitted with bundle path
   - Frontend can load context for task execution

4. **GitHub Integration**
   - User links issue via CodeLens prompt
   - YAML front matter updated with GitHub metadata
   - Event emitted with issue URL and number
   - CodeLens updated to show issue number

5. **Dependency Management**
   - User modifies dependencies via CodeLens picker
   - YAML dependencies array updated
   - Event emitted with new dependencies
   - Workflow can validate dependency graph

## Error Handling

### Validation Warnings
When a `.task.md` file has issues, the extension shows warnings:
- Invalid field values (e.g., status not in enum)
- Missing required fields
- Malformed YAML
- Invalid task IDs in dependencies

### Status Bar Indicators
- 🔴 Red indicators for critical errors
- 🟡 Yellow indicators for warnings
- ✅ Green indicators for valid task files

## Performance Considerations

- **Lazy Parsing**: Files are only parsed when needed
- **Caching**: Task metadata cached to avoid repeated parsing
- **Event Debouncing**: Rapid edits don't trigger excessive updates
- **Memory Management**: Old cache entries cleaned up on file deletion

## Extensibility

The TaskInteractionAPI and event system enable future extensions:

- **Custom Status Workflows**: Add custom status values and transitions
- **Plugin Integration**: Third-party tools can listen for events
- **Automation Hooks**: Create automated workflows on task events
- **Analytics**: Track task execution and status changes

## Troubleshooting

### CodeLens Not Showing
1. Ensure file ends with `.task.md`
2. Check that file has valid YAML front matter (enclosed in `---`)
3. Run "Copilot Orchestrator: Refresh Tasks" command
4. Reload VS Code window

### Decorations Not Updating
1. Save the file to trigger updates
2. Check that file has no syntax errors (shown in Problems panel)
3. Try closing and reopening the file

### Commands Not Working
1. Check that extension is properly activated
2. Verify VS Code version is 1.90.0 or higher
3. Check Output panel for error messages

## API Reference

See [TaskInteractionAPI documentation](./src/taskInteractionAPI.ts) for complete type definitions and method signatures.
