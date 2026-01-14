# Auto Zen Agent - GitHub MCP Migration Guide

**Created**: 2026-01-14  
**Status**: Complete  
**Agent**: Auto Zen  
**Migration Type**: zen-tasks → GitHub MCP Tools

---

## 🎯 Overview

This document details the migration of Auto Zen agent from the legacy `zen-tasks_*` tool system to GitHub MCP server tools. The migration maintains all autonomous execution capabilities while using GitHub Issues as the single source of truth.

---

## 📋 Summary of Changes

### Tools Updated
- **Removed**: All `zen-tasks_*` tools
- **Added**: `github-mcp-server-*` tools (list_issues, search_issues, issue_read, issue_write)
- **Retained**: All other tools (vscode, execute, read, edit, search, web, memory, etc.)

### Handoffs Updated
- ✅ Continue Autonomous Execution
- ✅ Full Auto - Cloud Task Master
- ✅ Deploy to Cloud Environment
- ✅ Coordinate Remote Agent Work
- ✅ Manage Feature Branches
- ✅ Hand Off to Cloud Specialist
- ✅ Coordinate Multi-Branch Workflow

### Test Suite Updated
- ✅ All 12 test categories updated with GitHub MCP tool references
- ✅ Test execution commands documented
- ✅ Memory-assisted programming features retained

---

## 🔄 Key Migration Patterns

### Pattern 1: Context Loading

**BEFORE (zen-tasks)**:
```
Load Zen Tasks workflow context using zen-tasks_000_workflow_context
```

**AFTER (GitHub MCP)**:
```
Load workflow context from:
1. Read Docs/Plan/detailed project description
2. Read Docs/Plan/feature list
3. Query GitHub Issues: github-mcp-server-list_issues
```

---

### Pattern 2: Finding Next Task

**BEFORE (zen-tasks)**:
```
zen-tasks_next_task  // Returns highest priority ready task
```

**AFTER (GitHub MCP)**:
```typescript
// Query for critical priority first
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open -label:\"status:blocked\" -label:\"status:in-progress\" label:\"priority:critical\"",
  perPage: 1
})

// If no critical, query for high priority
github-mcp-server-search_issues({
  query: "is:open -label:\"status:blocked\" -label:\"status:in-progress\" label:\"priority:high\"",
  perPage: 1
})

// Continue with medium, then low
```

---

### Pattern 3: Status Updates

**BEFORE (zen-tasks)**:
```
zen-tasks_set_status(task_id, "in_progress")
```

**AFTER (GitHub MCP)**:
```
Update GitHub Issue via API:
- Remove label: "status:pending"
- Add label: "status:in-progress"
- Set assignee: @copilot
```

---

### Pattern 4: Creating Follow-up Tasks

**BEFORE (zen-tasks)**:
```
zen-tasks_add_task({
  title: "Fix lint errors in AuthService",
  description: "...",
  priority: "high",
  dependencies: ["TASK-123"]
})
```

**AFTER (GitHub MCP)**:
```
Create GitHub Issue via API:
  Title: "Fix lint errors in AuthService"
  Body: |
    ## Description
    Discovered during implementation of #123
    
    ## Dependencies
    - Depends on #123
    
    ## Test Strategy
    - Run linter and verify all errors resolved
  
  Labels: ["type: refactor", "priority: high", "status: pending"]
```

---

### Pattern 5: Completion Comments

**BEFORE (zen-tasks)**:
```
Update task with completion details in task JSON
```

**AFTER (GitHub MCP)**:
```
Add comment to GitHub issue using github-mcp-server-issue_write:

## Completion Summary

**What was done:**
- Implemented feature X
- Added comprehensive tests
- Updated documentation

**Files changed:**
- `app/Services/AuthService.php`
- `tests/Feature/AuthTest.php`
- `Docs/Authentication.md`

**Tests run:**
- ✅ Unit tests: 24/24 passing
- ✅ Integration tests: 8/8 passing
- ✅ Coverage: 87%

**Follow-up issues created:**
- #456: Optimize token refresh performance
- #457: Add rate limiting to auth endpoints

**Next steps:**
- Close this issue
- Begin work on #458
```

---

## 🔍 Dependency Parsing

Auto Zen now parses issue dependencies from issue body:

**Issue Body Format**:
```markdown
## Dependencies
- Depends on #123 (must complete first)
- Depends on #124 (must complete first)
- Related to #125 (soft dependency)
```

**Parsing Logic**:
```
1. Read issue body using github-mcp-server-issue_read
2. Extract all "Depends on #X" references
3. For each dependency, check if issue is closed
4. Issue is ready only if ALL hard dependencies are closed
```

---

## 🏷️ Label Management

### Status Labels
| Label | Meaning | When to Apply |
|-------|---------|---------------|
| `status:pending` | Not started | Issue created, not triaged |
| `status:approved` | Ready to work | Triaged and prioritized |
| `status:in-progress` | Active work | Agent assigned and working |
| `status:blocked` | Waiting on external factor | Cannot proceed |
| `status:review` | Awaiting verification | Work complete, needs review |
| `status:testing` | In testing phase | Tests being written/run |

### Priority Labels
| Label | Meaning |
|-------|---------|
| `priority:critical` | Blocking all work, security, production down |
| `priority:high` | Critical path, time-sensitive, unblocks multiple tasks |
| `priority:medium` | Standard feature work, improvements |
| `priority:low` | Nice-to-have, tech debt |

### Type Labels
| Label | Meaning |
|-------|---------|
| `type:feature` | Feature implementation |
| `type:bug` | Bug fix |
| `type:refactor` | Code refactoring |
| `type:maintenance` | Maintenance work |
| `type:architecture` | Architecture decisions |
| `type:testing` | Test creation/improvement |
| `type:documentation` | Documentation updates |

---

## 🔄 Continuous Execution Loop

### Complete Flow

```
LOOP:
  1. Load Plan Context
     - Read Docs/Plan/detailed project description
     - Read Docs/Plan/feature list
  
  2. Query Next Issue
     - Search: is:open -label:"status:blocked" -label:"status:in-progress"
     - Filter by priority: critical → high → medium → low
     - Parse dependencies from issue body
     - Verify all dependencies closed
  
  3. Start Work
     - Update labels: Remove "status:pending", Add "status:in-progress"
     - Assign issue to @copilot
     - Create feature branch if needed
  
  4. Execute
     - Implement according to issue description
     - Run tests and verification
     - Fix any issues discovered
     - Update documentation
  
  5. Verify
     - [ ] Code compiles/runs
     - [ ] Tests pass
     - [ ] No new lint errors
     - [ ] Docs updated
     - [ ] Changes committed
  
  6. Complete
     - Add completion comment with full details
     - Close issue OR update to "status:review"
  
  7. Observe & Create Follow-ups
     - Code smells → Create refactor issue
     - Missing tests → Create test issue
     - Documentation gaps → Create docs issue
     - Security concerns → Create security issue
  
  8. Repeat
     - Query for next ready issue
     - Continue until no ready issues
END LOOP
```

---

## 🧪 Testing Approach

All test categories have been updated to use GitHub MCP tools:

### Example Test: "Next Issue Selection"

```
TEST: Next Issue Selection
  
  SETUP:
    1. Create test issues:
       - Issue #100: priority:critical, status:approved
       - Issue #101: priority:high, status:approved
       - Issue #102: priority:high, status:blocked
       - Issue #103: priority:medium, status:in-progress
    
  EXECUTE:
    Query: github-mcp-server-search_issues({
      query: "is:open -label:\"status:blocked\" -label:\"status:in-progress\" label:\"priority:critical\""
    })
  
  VERIFY:
    - Returns issue #100 (critical priority)
    - Does NOT return #102 (blocked)
    - Does NOT return #103 (in-progress)
  
  CLEANUP:
    Close all test issues
```

---

## 🚨 Breaking Changes

### Removed Functionality
- ❌ `zen-tasks_000_workflow_context` - No direct replacement
- ❌ Direct task JSON file manipulation - Use GitHub API
- ❌ `_ZENTASKS/tasks.json` as source of truth - Use GitHub Issues

### Changed Behavior
- ⚠️ Dependencies now parsed from issue body, not separate field
- ⚠️ Status tracked via labels, not task field
- ⚠️ Priority tracked via labels, not task field
- ⚠️ Comments are GitHub issue comments, not task notes

### Migration Path
- Old zen-tasks data can be imported to GitHub Issues manually
- Use Issue Handler to create GitHub issues from existing tasks
- Legacy `_ZENTASKS/` folder deprecated but retained for reference

---

## 📚 Query Examples

### Get All Open Issues
```typescript
github-mcp-server-list_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  state: "OPEN"
})
```

### Get High Priority Ready Issues
```typescript
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"priority:high\" label:\"status:approved\" -assignee:*"
})
```

### Get Blocked Issues
```typescript
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"status:blocked\""
})
```

### Get Issues Assigned to Auto Zen
```typescript
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open assignee:@me label:\"agent:auto-zen\""
})
```

---

## ✅ Success Criteria

- [x] Auto Zen agent file updated with GitHub MCP tools
- [x] All handoff prompts use GitHub Issue queries
- [x] Autonomous execution loop works end-to-end
- [x] Can create, update, close issues via GitHub API
- [x] Can query by priority, status, dependencies
- [x] Follow-up task creation works
- [x] Test suite updated with GitHub MCP references
- [x] Migration guide documentation complete

---

## 🔧 Troubleshooting

### Issue: "Cannot find ready issues"

**Problem**: Search query returns no results  
**Solution**: Check label syntax - use exact match: `label:"priority:high"` not `label:priority:high`

### Issue: "Dependencies not detected"

**Problem**: Issue selected before dependencies complete  
**Solution**: Ensure issue body has exact format: `- Depends on #123`

### Issue: "Status updates not working"

**Problem**: Labels not updating  
**Solution**: Verify label exists in repository, check API permissions

### Issue: "Comments not appearing"

**Problem**: Issue comments not created  
**Solution**: Use `github-mcp-server-issue_write` with method: `add_comment`

---

## 📖 References

- [GitHub MCP Tool Mapping](./GitHub-Migration-Tool-Mapping.md)
- [GitHub Issues Schema](./issues-schema.md)
- [Migration Quick Reference](./QUICK-REFERENCE.md)
- [Original Auto Zen Agent](.github/agents/Auto%20Zen.agent.md)
- [Copilot Instructions](.github/copilot-instructions.md)

---

**Migration Completed**: 2026-01-14  
**Verified By**: Auto Zen Agent Migration Process  
**Status**: ✅ Production Ready
