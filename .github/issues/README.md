# GitHub Issues Sync

This folder contains synchronized GitHub Issues managed by the `hiroyannnn.vscode-github-issues-sync` extension.

## Overview

All project tasks are now managed as GitHub Issues and synced to this local folder. This enables:

-   Local editing of issues in VS Code
-   Git-based version control for tasks
-   Bidirectional sync with GitHub
-   Offline task management
-   Agent automation via issue comments

## Folder Structure

```
.github/issues/
  issue-1.md        # Issue #1: Example feature task
  issue-2.md        # Issue #2: Bug fix
  issue-3.md        # Issue #3: Testing task
  ...
```

## File Format

Each issue file contains:

```markdown
---
id: 1
title: "Implement user authentication"
state: open
labels:
    - type:feature
    - priority:high
    - status:in-progress
assignees:
    - username
created_at: 2026-01-12T00:00:00Z
updated_at: 2026-01-12T10:30:00Z
---

## Description

Implement OAuth 2.0 authentication flow for user login.

## Tasks

-   [x] Set up OAuth provider
-   [ ] Implement login endpoint
-   [ ] Add token validation
-   [ ] Write tests

## Dependencies

-   Closes #42
-   Blocked by #35

## Agent Assignment

/delegate @Auto-Zen implement authentication flow
```

## Workflow

### Creating a New Task

**Option 1: GitHub Web Interface**

1. Go to https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues/new
2. Fill in title, description, labels
3. Create issue
4. Extension auto-syncs to `.github/issues/issue-N.md`

**Option 2: Local File (Advanced)**

1. Create new file: `.github/issues/my-task.md`
2. Add frontmatter (see format above)
3. Save file
4. Extension auto-creates GitHub issue
5. File renamed to `issue-N.md` with GitHub ID

### Assigning to Agents

In issue body or comments:

```markdown
/delegate @Auto-Zen implement feature
/delegate @Testing-Agent create test suite
/delegate @Cloud-Agent deploy to staging
```

Agents respond in comments and update status.

### Updating Tasks

**Locally:**

1. Edit `.github/issues/issue-N.md`
2. Save
3. Extension syncs changes to GitHub

**On GitHub:**

1. Edit issue (web/mobile/CLI)
2. Extension syncs to local file (every 5 min or on demand)

### Closing Tasks

**Via PR:**

```markdown
Fixes #123
Closes #124, #125
```

On merge: issues auto-close, local files sync to `state: closed`.

**Manually:**

```markdown
# In issue comment

/close resolved
```

**Locally:**
Change frontmatter: `state: closed`, save, syncs to GitHub.

## Agent Commands

### Delegation

-   `/delegate @AgentName [task description]` - Assign task to agent
-   `/reassign @AgentName` - Change agent assignment

### Status Updates

-   `/status [message]` - Post status update
-   `/progress` - Request progress report
-   `/block [reason]` - Mark as blocked
-   `/unblock` - Remove blocker

### Review & Completion

-   `/review-ready` - Mark ready for review
-   `/approve` - Approve work
-   `/merge` - Trigger PR merge
-   `/close [reason]` - Close issue

## Sync Settings

Configured in `.vscode/settings.json`:

-   **Sync Interval:** 5 minutes (300000ms)
-   **Sync Direction:** Bidirectional
-   **Auto Sync:** Enabled
-   **Sync on Startup:** Enabled

## Manual Sync

Trigger sync manually:

```bash
# Command Palette (Ctrl+Shift+P)
> GitHub Issues Sync: Sync Now
```

## Migration from ZenTasks

ZenTasks in `_ZENTASKS/` have been migrated to GitHub Issues. The old folder structure:

```
_ZENTASKS/
  TASK-xxx.md  →  .github/issues/issue-N.md
```

Mapping:

-   YAML frontmatter preserved
-   Task ID → Issue number
-   Status → Issue state + labels
-   Dependencies → Issue references
-   Comments → Issue comments

## Troubleshooting

### Sync Not Working

1. Check extension is installed and enabled
2. Verify GitHub token: `> GitHub Issues Sync: Verify GitHub Token`
3. Check logs: `> GitHub Issues Sync: Show Logs`
4. Restart sync: `> GitHub Issues Sync: Restart Sync Service`

### Conflicts

Extension uses last-write-wins strategy. Manual conflict resolution:

1. Check both local file and GitHub issue
2. Choose authoritative version
3. Update the other to match
4. Force resync: `> GitHub Issues Sync: Force Resync`

### Missing Issues

1. Clear cache: `> GitHub Issues Sync: Clear Local Cache`
2. Force full resync: `> GitHub Issues Sync: Force Resync`
3. Verify repository setting in `.vscode/settings.json`

## Best Practices

### 1. Always Sync Before Major Changes

```bash
> GitHub Issues Sync: Sync Now
```

### 2. Use Labels Consistently

-   `type:*` - Task type (feature, bug, refactor, etc.)
-   `priority:*` - Priority level (critical, high, medium, low)
-   `status:*` - Current status (pending, in-progress, review, etc.)
-   `agent:*` - Assigned agent

### 3. Link Related Issues

```markdown
Related to #42
Depends on #35
Blocks #67
```

### 4. Keep Descriptions Updated

Agents and humans should comment progress, not edit the main description.

### 5. Archive Completed Work

Closed issues remain in `.github/issues/` but are marked `state: closed`. Filter in VS Code:

```bash
# Show only open issues
grep -l "state: open" .github/issues/*.md
```

## Resources

-   **Extension:** https://marketplace.visualstudio.com/items?itemName=hiroyannnn.vscode-github-issues-sync
-   **GitHub Repo:** https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-
-   **Issues:** https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues
-   **Documentation:** `Docs/GitHub-Integration.md`

---

**Last Updated:** 2026-01-12  
**Managed By:** Copilot Orchestration Extension (COE)
