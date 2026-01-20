# Tasks View Provider - Real Workspace Integration

## Overview
The Tasks View Provider has been upgraded from displaying hardcoded sample data to showing real tasks from the workspace `_ZENTASKS/tasks.json` file.

## Architecture Decision: File-Based vs. Database Integration

**Implementation Approach**: This VS Code extension uses a **file-based integration** with `_ZENTASKS/tasks.json` and file watching for updates.

**Original Requirements vs. Implementation**: The broader PRD describes a multi-agent task orchestration system with SQLite database and WebSocket real-time updates. However, for the VS Code extension specifically, a file-based approach was chosen because:

1. **VS Code Extension Best Practices**: Extensions typically work with workspace files rather than maintaining separate databases
2. **Simplicity**: File-based approach avoids database setup, connection management, and migration complexity
3. **Developer Experience**: JSON files are easy to inspect, edit, and version control
4. **Workspace Integration**: Aligns with VS Code's file-centric workflow
5. **Performance**: File watching with 1-second polling provides adequate real-time updates for typical use cases

**Future Integration**: The extension can be enhanced to:
- Sync with a backend API/database when available
- Support both file-based (local) and API-based (remote) data sources
- Add WebSocket support for sub-second real-time updates when connected to backend

**Current Limitations** (vs. full PRD requirements):
- No SQLite database integration (uses JSON file)
- No WebSocket real-time updates (uses file polling at 1-second intervals)
- No dependency count display in task details
- No subtask count display in task details  
- No estimated vs actual hours display
- No context menu actions (Start Task, Complete Task, Report Issue)

These features are either provided by the backend system or planned as future enhancements to this extension.

## Implementation Details

### Integration Architecture
```
TasksViewProvider
    ↓
TasksSource (workspace/tasksSource.ts)
    ↓
_ZENTASKS/tasks.json
```

### Key Features

#### 1. Real-Time Data Loading
- Tasks are loaded from `_ZENTASKS/tasks.json` in the workspace root
- File watching enabled for automatic updates when tasks.json changes
- Graceful handling of missing or invalid files

#### 2. Status Mapping
Tasks are categorized based on their status field:

| Task Status | View Category |
|------------|---------------|
| `pending` | Ready Tasks |
| `in-progress` | In Progress |
| `blocked` | Blocked Tasks |
| `done`, `review` | Completed |
| `failed`, `cancelled` | Not displayed in view (filtered out) |

#### 3. Visual Indicators
- **Icons**: Status-specific icons (play, loading, error, check, eye)
- **Priority**: High priority tasks show ⚡ indicator
- **Tooltips**: Full description + action hint

#### 4. Error Handling
- Shows warning notification if tasks file has validation errors
- Returns empty array if no workspace or tasks file exists
- Safely handles malformed JSON or schema violations

### File Structure

#### tasks.json Schema
```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Task Title",
      "description": "Task description",
      "status": "pending",
      "priority": "high",
      "dependencies": [],
      "type": "feature",
      "details": "Optional details",
      "testStrategy": "Optional test strategy",
      "createdAt": "2026-01-19T00:00:00Z",
      "updatedAt": "2026-01-19T12:00:00Z"
    }
  ]
}
```

#### Required Fields
- `id` (string): Unique identifier
- `title` (string): Display name
- `description` (string): Task description
- `status` (string): One of: pending, in-progress, done, blocked, review, failed, cancelled
- `priority` (string): One of: high, medium, low
- `dependencies` (array): Array of task IDs

#### Optional Fields
- `type` (string): Task type (feature, bug, etc.)
- `details` (string): Additional details
- `testStrategy` (string): Testing approach
- `createdAt` (string): ISO 8601 timestamp
- `updatedAt` (string): ISO 8601 timestamp

### Resource Management

The provider properly manages resources:
- File watcher is disposed when provider is disposed
- TasksSource is disposed to cleanup resources
- Provider is registered in extension's context.subscriptions for automatic cleanup

### User Experience

#### When Tasks File Exists
1. Tasks load automatically on extension activation
2. View shows tasks grouped by category
3. Changes to tasks.json trigger automatic refresh
4. Click task to execute (triggers `copilot-orchestrator.executeTask` command)

#### When Tasks File Doesn't Exist
1. View shows empty categories (no tasks)
2. No error messages (graceful degradation)
3. User can create `_ZENTASKS/tasks.json` and refresh

#### When Tasks File Has Errors
1. View shows partial data (valid tasks only)
2. Warning notification shows first validation error
3. User can fix issues and file watcher will auto-refresh

### Testing

Integration tests cover:
- Initialization without tasks file
- Loading tasks from file
- Status mapping to categories
- Priority indicators
- Resource disposal
- Event firing on refresh

Run tests:
```bash
cd vscode-extension
npm test -- tasksViewProvider.test.ts
```

### Future Enhancements

Potential improvements:
1. Add task count badges to category labels (e.g., "Ready Tasks (3)")
2. Support sorting tasks by priority/date within categories
3. Add context menu actions (mark complete, edit, delete)
4. Support multiple workspace folders
5. Add search/filter functionality
6. Integrate with backend API for remote tasks

### Related Files

- `vscode-extension/src/views/tasksViewProvider.ts` - Main provider implementation
- `vscode-extension/src/workspace/tasksSource.ts` - File loading and validation
- `vscode-extension/src/extension.ts` - Provider registration
- `vscode-extension/src/views/tasksViewProvider.test.ts` - Integration tests

### Configuration

No additional configuration required. The provider automatically:
- Detects workspace root
- Looks for `_ZENTASKS/tasks.json`
- Sets up file watching
- Handles cleanup

### Troubleshooting

#### Tasks not appearing?
1. Check workspace has `_ZENTASKS/tasks.json` file
2. Verify JSON is valid (use JSON linter)
3. Verify tasks array exists and has valid schema
4. Check VS Code Output panel for errors
5. Try "Refresh Tasks" command

#### Changes not updating?
1. File watcher should auto-update (1 second poll interval)
2. Try manual refresh: `Ctrl+Shift+P` → "Refresh Tasks"
3. Check file permissions (ensure readable)

#### Validation errors?
1. Check notification message for details
2. Verify required fields: id, title, description, status, priority
3. Verify status is valid value
4. Verify priority is valid value
5. Ensure dependencies is an array

### Migration from Sample Data

The old implementation used hardcoded sample tasks:
```typescript
const sampleTasks = {
  ready: [new TaskItem(...)],
  // ...
};
```

New implementation loads from workspace:
```typescript
const state = this.tasksSource.getCached();
const tasks = state.tasks.filter(t => t.status === 'pending');
```

Benefits:
- ✅ Real workspace data
- ✅ Automatic updates
- ✅ Shared with other components
- ✅ Persistent across sessions
- ✅ Supports multi-task workflows

## References

- Issue: [HIGH] Tasks View Provider - Replace Sample Data with Real Workspace Integration
- Audit: COMPREHENSIVE-AUDIT-UNDONE-TASKS.md - Section 2.3
- PRD: Describes multi-agent task orchestration system
