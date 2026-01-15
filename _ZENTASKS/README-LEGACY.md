# _ZENTASKS_LEGACY - Historical Task Archive

**Status**: DEPRECATED - Migrated to GitHub Issues  
**Migration Date**: [TO BE FILLED]  
**Archived**: [TO BE FILLED]

---

## ⚠️ Important Notice

This directory contains the **LEGACY** task management system that was used before migration to GitHub Issues. 

**Do NOT modify files in this directory.**  
**Do NOT create new tasks here.**  
**Do NOT update task statuses here.**

All task management now happens through **GitHub Issues** in this repository.

---

## 📦 What's in This Directory

### Core Files
- **`tasks.json`**: The original task database (76 tasks as of migration)
- **`task-id-to-issue-number.json`**: Mapping from old task IDs to new GitHub issue numbers

### Scripts
- **`scripts/migrate-to-github.cjs`**: The migration script used to transfer tasks
- **`scripts/migrate-to-github.ts`**: TypeScript version of migration script

### Individual Task Files
- **`TASK-*.md`**: Individual task markdown files (historical record)
- **`TASK-*-COMPLETION.md`**: Task completion summaries

---

## 🔍 Finding Your Tasks

To find a task that was previously in _ZENTASKS, use the mapping file:

### Method 1: Using the Mapping File
```bash
# Find the GitHub issue number for a task
cat task-id-to-issue-number.json | jq '.["TASK-mk9c0009-branch-management"]'
# Returns: 170 (for example)

# Then visit: https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues/170
```

### Method 2: Search GitHub Issues
All migrated issues include the original task ID in the body, so you can search:

1. Go to GitHub Issues: https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues
2. Search for: `TASK-mk9c0009-branch-management` (your task ID)
3. Find the issue in the results

### Method 3: Browse by Labels
Tasks were migrated with appropriate labels:
- `priority: high` / `priority: medium` / `priority: low` / `priority: critical`
- `type: feature` / `type: bug` / `type: testing` / `type: documentation` etc.
- `status: pending` / `status: in-progress` / `status: blocked`

---

## 📊 Migration Summary

### Tasks Migrated
- **Total**: 76 tasks
- **Issue Range**: #100-#175
- **Completed**: 64 closed issues (63 done + 1 cancelled)
- **Active**: 12 open issues (7 pending + 4 blocked + 1 in-progress)

### What Was Preserved
✅ All task descriptions and details  
✅ All test strategies  
✅ All dependencies  
✅ All completion summaries  
✅ All timestamps (created/updated)  
✅ All priorities and statuses  
✅ All metadata  

### Migration Documents
- **Preparation**: `Docs/GitHub-Migration/migration-preparation.md`
- **Verification**: `Docs/GitHub-Migration/migration-verification.md`
- **Tool Mapping**: `Docs/GitHub-Migration-Tool-Mapping.md`

---

## 🛠️ For Developers

### Why We Migrated

The migration from _ZENTASKS to GitHub Issues provides:

1. **Single Source of Truth**: No more sync issues between systems
2. **Better Collaboration**: Native GitHub features (comments, assignees, milestones)
3. **Improved Visibility**: Tasks visible to all contributors
4. **GitHub Copilot Integration**: Native support for GitHub Coding Agent
5. **Better Tooling**: Labels, projects, automation, API access
6. **Audit Trail**: Full GitHub history and activity log

### Agent Migration Status

All orchestration agents have been updated to use GitHub Issues:
- ✅ Auto Zen - Uses `github-mcp-server-*` tools
- ✅ Zen Planner - Creates GitHub issues directly
- ✅ Testing Agent - Manages test issues on GitHub
- ✅ Plan Agent - Reviews via GitHub comments
- ✅ Dependency Agent - Creates dependency issues
- ✅ Issue Handler - Native GitHub integration

### Task Management Workflow (New)

```
1. Create Issue on GitHub (with proper labels)
2. Assign to agent or team member
3. Update status via labels (status: in-progress, status: review, etc.)
4. Close issue when done
5. Link dependencies via "Depends on #XXX" in issue body
```

### Querying Tasks (New)

**Old Way** (deprecated):
```bash
zen-tasks_list_tasks
zen-tasks_next_task
zen-tasks_get_task(task_id)
```

**New Way**:
```bash
# List all open tasks
github-mcp-server-list_issues(state: "OPEN")

# Find next high-priority task
github-mcp-server-search_issues(query: "is:open label:\"priority: high\" label:\"status: approved\"")

# Get specific task
github-mcp-server-issue_read(issue_number: 123)
```

---

## 📅 Archival Timeline

- **Migration Date**: [TO BE FILLED]
- **Active Reference Period**: 30 days
- **Archival Date**: [TO BE FILLED]
- **Final Disposition**: Compressed and moved to `Docs/Archive/`

During the active reference period (30 days), this directory will remain in place for reference. After that, it will be archived.

---

## 🔗 Quick Links

- **GitHub Issues**: https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues
- **Migration Docs**: `/Docs/GitHub-Migration/`
- **Agent Documentation**: `.github/agents/`
- **Copilot Instructions**: `.github/copilot-instructions.md`

---

## ❓ FAQ

### Q: Can I still read tasks from this directory?
**A**: Yes, this is a read-only archive. You can reference old task files, but don't modify them.

### Q: What if I find a bug in the migration?
**A**: Report it as a GitHub issue. Include the task ID and what's wrong. We can update the GitHub issue manually.

### Q: Can I restore the old system?
**A**: Technically yes, but not recommended. The agents have been updated to use GitHub Issues. Reverting would break the system.

### Q: Where did my in-progress task go?
**A**: Check the mapping file for the new issue number. Your task is now a GitHub issue with the same status.

### Q: How do I create new tasks?
**A**: Create a new GitHub issue with the appropriate labels. See the issue templates in `.github/ISSUE_TEMPLATE/`.

---

**Last Updated**: [TO BE FILLED]  
**Maintained By**: System Administrator  
**Status**: Read-Only Archive
