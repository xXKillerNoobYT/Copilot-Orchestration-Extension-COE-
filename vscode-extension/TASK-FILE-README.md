# Task File Support - Documentation Index

## Overview

The Copilot Orchestrator VS Code extension now includes full support for managing `.task.md` files with specialized CodeLens, real-time parsing, syntax highlighting, and deep integration with the orchestrator workflow.

## Documentation Map

### For Users

**Start Here:**
- [QUICK-START.md](./QUICK-START.md) - 5-minute setup guide with common tasks

**Learn More:**
- [TASK-FILE-SUPPORT.md](./TASK-FILE-SUPPORT.md) - Complete user guide with all features, commands, and troubleshooting

### For Developers

**Implementation Overview:**
- [TASK-FILE-IMPLEMENTATION.md](./TASK-FILE-IMPLEMENTATION.md) - Architecture, modules, integration details

**API Reference:**
- [API-USAGE-EXAMPLES.md](./API-USAGE-EXAMPLES.md) - 10 complete code examples showing how to use the TaskInteractionAPI

**Technical Summary:**
- [TASK-FILE-SUMMARY.md](./TASK-FILE-SUMMARY.md) - Feature breakdown, file statistics, event flows, performance characteristics

## File Structure

```
vscode-extension/
├── src/
│   ├── extension.ts (modified)           ← Main entry point
│   ├── taskFileCodeLens.ts               ← CodeLens provider (240 lines)
│   ├── taskStatusParser.ts               ← YAML parsing (280 lines)
│   ├── taskFileDocumentWatcher.ts        ← File monitoring (340 lines)
│   ├── taskFileSyntaxHighlighter.ts      ← Syntax highlighting (280 lines)
│   ├── taskInteractionAPI.ts             ← Command handler & events (450 lines)
│   └── taskFileSupport.test.ts           ← Test suite (200 lines)
├── syntaxes/
│   └── task-markdown.json                ← TextMate grammar
├── language-configuration.json           ← Language config
├── package.json (modified)               ← Commands & contributions
├── sample-tasks/
│   └── EXAMPLE-task-file.task.md         ← Example task file
├── QUICK-START.md                        ← User quick start
├── TASK-FILE-SUPPORT.md                  ← Full user guide
├── TASK-FILE-IMPLEMENTATION.md           ← Developer guide
├── API-USAGE-EXAMPLES.md                 ← Code examples
├── TASK-FILE-SUMMARY.md                  ← Technical summary
└── README.md (documentation index)       ← This file
```

## Key Features

### CodeLens Actions (6 per file)

1. **Execute Now** - Trigger task execution
2. **Status Display** - Change task status
3. **Context Management** - Create/open context bundles
4. **GitHub Integration** - Link to issues
5. **Metadata Display** - View task details
6. **Dependency Management** - Modify dependencies

### Real-time Updates

- File monitoring with metadata caching
- Status bar integration
- Inline decoration display
- Automatic CodeLens refresh

### Syntax Highlighting

- YAML field highlighting (required, status, priority, type)
- Dependency reference detection
- Markdown header styling
- Task ID and GitHub issue highlighting

### Event System

Events emitted for all operations:
- `executeTask` - Task execution initiated
- `statusChanged` - Status updated
- `contextBundleCreated` - Context bundle created
- `gitHubLinked` - GitHub issue linked
- `dependenciesChanged` - Dependencies modified

## Module Quick Reference

| Module | Purpose | Lines | Key Exports |
|--------|---------|-------|------------|
| taskFileCodeLens.ts | CodeLens provider | 240 | TaskFileCodeLensProvider |
| taskStatusParser.ts | YAML parsing | 280 | TaskStatusParser |
| taskFileDocumentWatcher.ts | File monitoring | 340 | TaskFileDocumentWatcher |
| taskFileSyntaxHighlighter.ts | Syntax highlighting | 280 | TaskFileSyntaxHighlighter |
| taskInteractionAPI.ts | Command handling | 450 | TaskInteractionAPI |
| taskFileSupport.test.ts | Tests | 200 | Test suite |

## Task File Format

### Minimal Example

```yaml
---
id: TASK-001
title: My Task
type: feature
priority: high
status: pending
---

## Goal

What needs to be done.
```

### Complete Example

```yaml
---
id: TASK-001
title: Authentication flow skeleton
type: feature
priority: high
status: pending
dependencies: [TASK-002, TASK-003]
assignees: [coder, tester]
labels: [auth, security]
estimate: "4h"
due: "2026-01-15"
subtasks:
  - id: TASK-001A
    title: Login form
    priority: high
github_issue_id: 42
context_bundle: "context/task-001-bundle.json"
---

## Goal

...markdown content...
```

## API Quick Reference

```typescript
// Create API instance
const taskAPI = new TaskInteractionAPI();

// Commands
taskAPI.executeTask(taskId, taskUri);
taskAPI.changeTaskStatus(taskId, taskUri);
taskAPI.createContextBundle(taskId, taskUri);
taskAPI.openContextBundle(bundlePath);
taskAPI.linkGitHubIssue(taskId, taskUri);
taskAPI.openGitHubIssue(issueUrl);
taskAPI.showTaskMetadata(task);
taskAPI.manageDependencies(taskId, taskUri, deps);

// Events
taskAPI.onTaskInteraction((event) => {
  // Handle event
  console.log(event.type);
  console.log(event.taskId);
  console.log(event.task);
});
```

## Commands

All commands registered in VS Code:

| Command | Category | Title |
|---------|----------|-------|
| `copilot-orchestrator.executeTask` | Task File | Execute Task Now |
| `copilot-orchestrator.changeTaskStatus` | Task File | Change Task Status |
| `copilot-orchestrator.openContextBundle` | Task File | Open Context Bundle |
| `copilot-orchestrator.createContextBundle` | Task File | Create Context Bundle |
| `copilot-orchestrator.linkGitHubIssue` | Task File | Link GitHub Issue |
| `copilot-orchestrator.openGitHubIssue` | Task File | Open GitHub Issue |
| `copilot-orchestrator.showTaskMetadata` | Task File | Show Task Metadata |
| `copilot-orchestrator.manageDependencies` | Task File | Manage Task Dependencies |

## Development Workflow

### 1. Create a .task.md File

```bash
touch TASK-001-myname.task.md
```

### 2. Add YAML Front Matter

Use template from [QUICK-START.md](./QUICK-START.md)

### 3. Build and Test

```bash
npm run compile
npm test
```

### 4. Use CodeLens

Open file in VS Code and click CodeLens buttons

### 5. Listen to Events

```typescript
taskAPI.onTaskInteraction((event) => {
  // Handle events from user interactions
  console.log(`Task ${event.taskId}: ${event.type}`);
});
```

## Integration with Orchestrator

The task file support integrates with the main orchestrator workflow through events:

```
User clicks CodeLens
    ↓
TaskInteractionAPI executes command
    ↓
API emits TaskInteractionEvent
    ↓
Extension listener in extension.ts catches event
    ↓
Event forwarded to orchestrator service
    ↓
Orchestrator processes event (execute, sync, etc.)
```

## Performance

- **File Parsing**: O(n) where n = file size
- **Memory per Task**: ~1KB cached
- **Update Latency**: <100ms
- **Decoration**: Incremental refresh

## Browser Compatibility

- VS Code 1.90.0+
- Windows, macOS, Linux
- WebView compatible

## Testing

Run test suite:

```bash
npm test
```

Tests cover:
- YAML parsing and validation
- Field validation (status, priority, type)
- Subtask parsing
- Error handling
- Syntax highlighting
- Event emission

## File Statistics

- **Total New Code**: ~3,200 lines
- **Core Modules**: 5 files, 1,790 lines
- **Tests**: 200 lines
- **Documentation**: 1,100+ lines
- **Configuration**: 150+ lines

## Success Criteria

✅ CodeLens actions functional
✅ Real-time metadata updates
✅ Syntax highlighting applied
✅ Event system working
✅ File operations (CRUD)
✅ Error handling & validation
✅ Status bar integration
✅ GitHub integration
✅ Context bundles
✅ Dependency management
✅ Comprehensive documentation
✅ Test coverage

## Common Tasks

### Create a Task
→ See [QUICK-START.md](./QUICK-START.md#quick-start-5-minutes)

### Change Status
→ See [TASK-FILE-SUPPORT.md](./TASK-FILE-SUPPORT.md#features)

### Link GitHub Issue
→ See [QUICK-START.md](./QUICK-START.md#common-tasks)

### Create Context Bundle
→ See [API-USAGE-EXAMPLES.md](./API-USAGE-EXAMPLES.md#example-3-create-and-link-context-bundle)

### Handle Events
→ See [API-USAGE-EXAMPLES.md](./API-USAGE-EXAMPLES.md#example-7-integrate-with-orchestrator-workflow)

## Troubleshooting

See [TASK-FILE-SUPPORT.md#troubleshooting](./TASK-FILE-SUPPORT.md#troubleshooting) for:
- CodeLens not showing
- Decorations not updating
- Commands not working
- Syntax errors
- Performance issues

## Next Steps

1. **Users**: Read [QUICK-START.md](./QUICK-START.md)
2. **Developers**: Read [TASK-FILE-IMPLEMENTATION.md](./TASK-FILE-IMPLEMENTATION.md)
3. **API Usage**: See [API-USAGE-EXAMPLES.md](./API-USAGE-EXAMPLES.md)
4. **Examples**: Open `sample-tasks/EXAMPLE-task-file.task.md`

## Contributing

To extend or modify the task file support:

1. Read [TASK-FILE-IMPLEMENTATION.md](./TASK-FILE-IMPLEMENTATION.md) for architecture
2. Check [API-USAGE-EXAMPLES.md](./API-USAGE-EXAMPLES.md) for patterns
3. Update tests in `taskFileSupport.test.ts`
4. Update documentation

## Support

- **Questions?** Check documentation files
- **Bug Report?** Create GitHub issue
- **Feature Request?** See "Future Enhancements" in [TASK-FILE-IMPLEMENTATION.md](./TASK-FILE-IMPLEMENTATION.md)

---

**Last Updated**: January 2026
**Version**: 1.0
**Author**: Copilot Orchestration Extension Team
