# Issue Handler - GitHub MCP Migration Guide

**Created**: 2026-01-14  
**Status**: Complete  
**Agent**: Issue Handler  
**Migration Type**: zen-tasks → GitHub MCP Tools (SIMPLIFIED)

---

## 🎯 Overview

This document details the migration of Issue Handler from the legacy `zen-tasks_*` tool system to GitHub MCP server tools. **This migration is unique**: Issue Handler's role is dramatically simplified because GitHub Issues ARE now the single source of truth. Instead of synchronizing between systems, Issue Handler now focuses on **triage, labeling, and lifecycle management**.

---

## 📋 Summary of Changes

### Tools Updated
- **Removed**: All `barradevdigitalsolutions.zen-tasks-copilot/*` tools
- **Added**: `github-mcp-server-*` tools (list_issues, search_issues, issue_read, issue_write)
- **Retained**: All other tools (read, edit, search, web, vscode, memory, GitHub PR tools, Mermaid, etc.)

### Major Simplification
- **OLD**: Sync GitHub Issues ↔ _ZENTASKS (bidirectional synchronization)
- **NEW**: GitHub Issues ARE the source of truth (no sync needed!)

### Handoffs Updated
- ✅ Hand off to Zen Planner for Issue Breakdown (uses github-mcp-server-issue_read)
- ✅ Hand off to Auto Zen for Implementation (uses github-mcp-server-issue_write)
- ✅ Request Plan Alignment (uses github-mcp-server-issue_write and GitHub API)

### Workflow Updates
- ✅ Triage focuses on labeling and commenting
- ✅ No more task conversion - issues stay as issues
- ✅ Lifecycle management through labels
- ✅ Duplicate detection and linking simplified

---

## 🔄 Key Migration Patterns

### Pattern 1: Triage New Issue (SIMPLIFIED)

**BEFORE (zen-tasks)**:
```
1. Detect new GitHub issue
2. Create internal task from issue
3. Sync issue ↔ task
4. Comment on issue with task ID
```

**AFTER (GitHub MCP)**:
```
1. Detect new issue via github-mcp-server-list_issues
   Query: "is:open no:label"

2. Read issue details
   github-mcp-server-issue_read({
     issue_number: X
   })

3. Add appropriate labels via GitHub API
   - type: [bug|feature|etc]
   - priority: [critical|high|medium|low]
   - status: pending

4. Add triage comment
   github-mcp-server-issue_write({
     method: "add_comment",
     comment: "## Triage Complete\n..."
   })

5. Assign to agent if clear (via GitHub API)

Done! No task creation needed - issue IS the task!
```

---

### Pattern 2: Manage Issue Lifecycle (SIMPLIFIED)

**BEFORE (zen-tasks)**:
```
1. Update task status
2. Sync status to GitHub issue
3. Keep both in sync
```

**AFTER (GitHub MCP)**:
```
1. Update labels via GitHub API
   - Remove: "status: pending"
   - Add: "status: in-progress"

2. Optionally add comment for major transitions
   github-mcp-server-issue_write({
     method: "add_comment",
     comment: "Started work on this issue"
   })

Done! Single source of truth - no sync!
```

---

### Pattern 3: Detect Duplicates (SIMPLIFIED)

**BEFORE (zen-tasks)**:
```
1. Check both GitHub and _ZENTASKS for duplicates
2. Link in both systems
3. Keep sync
```

**AFTER (GitHub MCP)**:
```
1. Search for similar issues
   github-mcp-server-search_issues({
     query: "[keywords from new issue title]"
   })

2. If duplicate found:
   a. Add comment to new issue
      github-mcp-server-issue_write({
        comment: "Duplicate of #100"
      })
   
   b. Close new issue via GitHub API
      state: closed
      labels: add "duplicate"

Done! Everything stays in GitHub!
```

---

### Pattern 4: Check Plan Alignment

**BEFORE (zen-tasks)**:
```
1. Check issue against plan
2. Create task if needed
3. Flag in both systems
```

**AFTER (GitHub MCP)**:
```
1. Read Docs/Plan/ documents

2. Review issue against plan
   github-mcp-server-issue_read({issue_number: X})

3. If conflicts:
   github-mcp-server-issue_write({
     method: "add_comment",
     comment: "⚠️ Conflicts with plan - see Docs/Plan/..."
   })
   
   Add label: "needs-planning-review"

4. If aligns:
   github-mcp-server-issue_write({
     comment: "✅ Aligns with project plan"
   })
   
   Add label: "status: approved"
```

---

## 🏷️ Issue Handler Label Strategy

### Triage Labels
- `needs-triage` - Not yet reviewed
- `needs-planning-review` - Conflicts with plan
- `duplicate` - Duplicate issue
- `wontfix` - Won't be implemented

### Type Labels (Applied during triage)
- `type: bug`
- `type: feature`
- `type: refactor`
- `type: maintenance`
- `type: documentation`
- `type: question`

### Priority Labels (Applied during triage)
- `priority: critical`
- `priority: high`
- `priority: medium`
- `priority: low`

### Status Labels (Lifecycle management)
- `status: pending` - Triaged, not started
- `status: approved` - Ready to work
- `status: in-progress` - Being worked on
- `status: blocked` - Waiting on something
- `status: review` - In review

---

## 📝 Triage Comment Templates

### Standard Triage
```markdown
## Triage Complete

**Classification**:
- Type: [Bug|Feature|Refactor|etc]
- Priority: [Critical|High|Medium|Low]
- Complexity: [Simple|Medium|Complex]

**Plan Alignment**: [✅ Aligns | ⚠️ Conflicts]

**Assignment**: [Agent or @copilot]

**Next Steps**:
1. [Step 1]
2. [Step 2]

**Labels Applied**: [list of labels]
```

### Duplicate Detection
```markdown
## Duplicate Issue

This appears to be a duplicate of #[original-number].

Please subscribe to #[original-number] for updates.

**Closing** this issue in favor of the original.
```

### Plan Conflict
```markdown
## Plan Alignment Issue

⚠️ This request conflicts with the documented plan.

**Documented Plan**: `Docs/Plan/detailed project description`

**Conflict**: [Description of conflict]

**Action Required**: Consult with Plan Agent before proceeding

**Label Added**: `needs-planning-review`
```

### Needs Clarification
```markdown
## Clarification Needed

This issue needs more information before we can proceed.

**Missing Information**:
- [ ] [What's missing 1]
- [ ] [What's missing 2]

Please provide the requested information and we'll continue triage.
```

---

## 🔍 Query Examples for Issue Handler

### Find Unlabeled Issues (Need Triage)
```typescript
github-mcp-server-list_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  state: "OPEN",
  labels: [] // No labels = needs triage
})

// Or more specifically:
github-mcp-server-search_issues({
  query: "is:open no:label"
})
```

### Find Issues Needing Planning Review
```typescript
github-mcp-server-search_issues({
  query: "is:open label:\"needs-planning-review\""
})
```

### Find Stale Issues
```typescript
github-mcp-server-search_issues({
  query: "is:open updated:<2025-12-15"  // Not updated in 30 days
})
```

### Find Blocked Issues
```typescript
github-mcp-server-search_issues({
  query: "is:open label:\"status: blocked\""
})
```

---

## 🎯 Workflow Examples

### Example 1: Triage New Bug Report

**Scenario**: New bug report submitted

**Workflow**:
```
1. Detect new issue
   github-mcp-server-list_issues({state: "OPEN"})
   Filter for unlabeled issues

2. Read issue details
   github-mcp-server-issue_read({issue_number: 150})

3. Analyze:
   - Is it really a bug? (vs feature request)
   - What's the severity?
   - Does it align with plan?
   - Is it a duplicate?

4. Apply labels via GitHub API:
   - type: bug
   - priority: high
   - status: pending

5. Add triage comment
   github-mcp-server-issue_write({
     method: "add_comment",
     comment: [triage template]
   })

6. Assign to Auto Zen (if ready)
   Update assignee via GitHub API

Done! Issue is triaged and ready for work.
```

---

### Example 2: Detect and Close Duplicate

**Scenario**: Duplicate issue submitted

**Workflow**:
```
1. Read new issue
   github-mcp-server-issue_read({issue_number: 151})

2. Search for similar issues
   github-mcp-server-search_issues({
     query: "is:open \"[keywords from title]\""
   })

3. If duplicate found (#100):
   a. Comment on new issue
      github-mcp-server-issue_write({
        issue_number: 151,
        comment: "Duplicate of #100"
      })
   
   b. Add label and close
      Labels: add "duplicate"
      State: closed

   c. Comment on original
      github-mcp-server-issue_write({
        issue_number: 100,
        comment: "Linked duplicate: #151"
      })

Done! No separate task system to update!
```

---

### Example 3: Check Plan Alignment

**Scenario**: Feature request needs plan verification

**Workflow**:
```
1. Read feature request
   github-mcp-server-issue_read({issue_number: 152})

2. Read plan documents
   - Docs/Plan/detailed project description
   - Docs/Plan/feature list

3. Compare:
   - Does feature align with plan?
   - Is it in scope?
   - Does it conflict with architecture?

4. If aligns:
   github-mcp-server-issue_write({
     comment: "✅ Aligns with project plan"
   })
   Labels: add "status: approved"
   Hand off to Zen Planner if complex

5. If conflicts:
   github-mcp-server-issue_write({
     comment: "⚠️ Conflicts with plan..."
   })
   Labels: add "needs-planning-review"
   Hand off to Plan Agent

Done! Clear next steps without task conversion!
```

---

## ✅ Migration Checklist

- [x] Removed `barradevdigitalsolutions.zen-tasks-copilot/*` tools
- [x] Added `github-mcp-server-*` tools
- [x] Updated handoff prompts to use GitHub MCP tools
- [x] Simplified triage workflow (no task conversion)
- [x] Updated lifecycle management (labels only)
- [x] Simplified duplicate detection (GitHub only)
- [x] Removed synchronization logic (not needed!)
- [x] Updated comment automation templates
- [x] Verified all tool references are correct
- [x] Verified workflow patterns are simplified
- [x] Created migration documentation

---

## 🎉 Major Simplifications

### What's Gone
- ❌ Task conversion logic
- ❌ Bidirectional sync
- ❌ Dual source-of-truth management
- ❌ Sync status tracking
- ❌ Task ID management

### What's New
- ✅ Direct GitHub Issue management
- ✅ Simplified triage workflow
- ✅ Label-based lifecycle
- ✅ Single source of truth
- ✅ Less complexity, more reliability

---

## 📚 References

- Main Migration Guide: `Docs/GitHub-Migration-Tool-Mapping.md`
- Auto Zen Migration: `Docs/GitHub-Migration/auto-zen-migration.md`
- Zen Planner Migration: `Docs/GitHub-Migration/zen-planner-migration.md`
- Testing Agent Migration: `Docs/GitHub-Migration/testing-agent-migration.md`
- Plan Agent Migration: `Docs/GitHub-Migration/plan-agent-migration.md`
- Dependency Agent Migration: `Docs/GitHub-Migration/dependency-agent-migration.md`
- GitHub Issues API: https://docs.github.com/en/rest/issues

---

**Migration Completed**: 2026-01-14  
**Verified By**: Autonomous Migration Process  
**Key Achievement**: Dramatically simplified from sync-heavy to triage-focused role
