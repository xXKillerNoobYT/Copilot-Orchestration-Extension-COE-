# Quick Start Guide - Task File Support

## Installation

The Task File Support feature is automatically included in the Copilot Orchestrator extension. No additional installation needed.

## Quick Start (5 Minutes)

### Step 1: Create a .task.md File

Create a new file with the `.task.md` extension:

```bash
TASK-001-example.task.md
```

### Step 2: Add YAML Front Matter

Paste this template at the top of your file:

```yaml
---
id: TASK-001
title: My first task
type: feature
priority: high
status: pending
dependencies: []
assignees: [coder]
estimate: "4h"
---
```

**Required fields:**
- `id` - Unique task identifier
- `title` - Task name
- `type` - One of: feature, bug, refactor, maintenance, architecture, testing, documentation
- `priority` - One of: critical, high, medium, low
- `status` - One of: pending, approved, in_progress, testing, review, completed, failed, blocked, cancelled

### Step 3: Add Description

Add markdown content below the front matter:

```markdown
## Goal

Brief description of what needs to be done.

## Acceptance Criteria

- Criterion 1
- Criterion 2
- Criterion 3

## Implementation Notes

Any additional context or notes.
```

### Step 4: Use CodeLens Actions

When you save the file, colorful CodeLens buttons will appear at the top:

| Button | Action |
|--------|--------|
| `▶️ Execute Now` | Run the task immediately |
| `⏳ Status: pending` | Click to change task status |
| `📎 Create Context` | Create a context bundle |
| `🔗 Link GitHub` | Link to a GitHub issue |
| `ℹ️ Type: feature...` | View task metadata |
| `🔗 Dependencies (0)` | Manage task dependencies |

### Step 5: Interact with Your Task

**Change Status:**
1. Click the Status CodeLens (e.g., "⏳ Status: pending")
2. Select new status from the picker
3. File automatically saves with new status

**Link GitHub Issue:**
1. Click "Link GitHub" CodeLens
2. Enter GitHub issue number or URL
3. CodeLens updates to show "Issue #123"

**Execute Task:**
1. Click "Execute Now" CodeLens
2. Task execution is triggered in the orchestrator
3. Status may auto-update to "in_progress"

## Common Tasks

### Change Task Priority

Edit the YAML `priority` field:

```yaml
priority: high  # Change to: critical, high, medium, or low
```

### Add Dependencies

List task IDs that must complete first:

```yaml
dependencies: [TASK-002, TASK-003]
```

### Create Subtasks

Define subtasks in YAML:

```yaml
subtasks:
  - id: TASK-001A
    title: First subtask
    priority: high
  - id: TASK-001B
    title: Second subtask
    priority: medium
```

### Link Context Bundle

Create a context bundle:
1. Click "Create Context" CodeLens
2. Enter bundle name (or use default)
3. Bundle created at `context/{name}/`

Then reference in YAML:
```yaml
context_bundle: "context/task-001-bundle.json"
```

### View Full Metadata

Click the metadata CodeLens (e.g., "ℹ️ Type: feature • Priority: high • Est: 4h") to see:
- Task ID
- Type
- Priority
- Status
- Estimate
- Dependencies
- GitHub issue (if linked)
- Context bundle (if linked)

## Example Task Files

The extension includes example task files in `sample-tasks/`:

- `TASK-001-auth.md` - Authentication task
- `TASK-002-architecture.md` - Architecture task
- `EXAMPLE-task-file.task.md` - Complete example with all features

Open any of these to see real examples.

## Status Workflow

Typical task status progression:

```
pending
   ↓
approved (when ready to start)
   ↓
in_progress (when actively working)
   ↓
testing (when testing)
   ↓
review (waiting for review)
   ↓
completed (✓ Done!)
```

Alternative paths:
- `blocked` - Cannot proceed (dependency issue)
- `failed` - Something went wrong
- `cancelled` - No longer needed

## Keyboard Shortcuts

While editing a .task.md file:

| Action | Command |
|--------|---------|
| Open file | `Ctrl+O` (Select .task.md file) |
| Save file | `Ctrl+S` |
| Run command | `Ctrl+Shift+P` then search "Copilot Orchestrator" |

## Syntax Highlighting Guide

### Color Coding

When you edit a .task.md file, you'll see color highlighting:

- **Bold Yellow** = Required fields (id, title, type, priority, status)
- **Blue** = Status field
- **Orange** = Priority field
- **Purple** = Type field
- **Green** = Task ID references (TASK-*)
- **Red Underline** = Invalid values

### Example

```yaml
---
id: TASK-001              # ← Green task ID
title: My Task            # ← Bold (required)
type: feature             # ← Purple (valid type)
priority: high            # ← Orange (valid priority)
status: pending           # ← Blue (valid status)
dependencies: [TASK-002]  # ← Green task reference
---
```

## Troubleshooting

### CodeLens Not Showing

**Problem:** No action buttons appear at top of file

**Solution:**
1. Ensure file ends with `.task.md`
2. Check file has YAML front matter (`---` before and after)
3. Save the file (`Ctrl+S`)
4. Run "Copilot Orchestrator: Refresh Tasks" from command palette

### Status Bar Not Updating

**Problem:** Status bar at bottom doesn't show task info

**Solution:**
1. Make sure you're editing a `.task.md` file
2. Check YAML syntax (must be valid)
3. Close and reopen the file

### GitHub Issue Not Linking

**Problem:** "Link GitHub" doesn't work or gives error

**Solution:**
1. Ensure you have valid GitHub issue number or URL
2. Format: Either `123` (number) or `https://github.com/owner/repo/issues/123` (URL)
3. Check you have internet connection
4. Try restarting VS Code

### Invalid Status/Priority/Type

**Problem:** Red wavy underline under field value

**Solution:**
1. Check field value is in the allowed list:
   - **Status**: pending, approved, in_progress, testing, review, completed, failed, blocked, cancelled
   - **Priority**: critical, high, medium, low
   - **Type**: feature, bug, refactor, maintenance, architecture, testing, documentation
2. Fix spelling and capitalization

## Next Steps

1. **Create your first task file** - Try the 5-minute quick start above
2. **Explore examples** - Open `sample-tasks/EXAMPLE-task-file.task.md`
3. **Read full docs** - See `TASK-FILE-SUPPORT.md` for all features
4. **Try CodeLens actions** - Click each button to see what it does
5. **Connect to orchestrator** - Link GitHub issues and execute tasks

## Tips & Tricks

### Create Task Quickly

Copy this template and fill in:

```yaml
---
id: TASK-XXX
title: 
type: feature
priority: high
status: pending
dependencies: []
estimate: ""
---

## Goal



## Acceptance Criteria

- 

## Implementation Notes

```

### Use GitHub Issues for Tracking

Always link tasks to GitHub issues:
1. Create issue in GitHub
2. Get issue number
3. Click "Link GitHub" and enter number
4. Now issue and task stay in sync

### Group Related Tasks

Use dependencies to show relationships:

```yaml
# TASK-001: Main feature
dependencies: [TASK-002, TASK-003, TASK-004]

# TASK-002: Component A (dependency of TASK-001)
# TASK-003: Component B (dependency of TASK-001)
# TASK-004: Tests (dependency of TASK-001)
```

### Time Estimation

Use human-readable estimates:
- `30m` - 30 minutes
- `2h` - 2 hours
- `1d` - 1 day (8 hours)
- `1w` - 1 week (40 hours)

## Need Help?

- **Questions?** Check `TASK-FILE-SUPPORT.md` for comprehensive docs
- **API Usage?** See `API-USAGE-EXAMPLES.md` for code examples
- **Technical Details?** Read `TASK-FILE-IMPLEMENTATION.md`
- **Issues?** Check the troubleshooting section above

---

**Ready to create your first task?** Open VS Code, create a new file named `TASK-001-myname.task.md`, paste the template from Step 2 above, and start using CodeLens! 🚀
