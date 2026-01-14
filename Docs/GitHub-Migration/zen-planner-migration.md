# Zen Planner Migration to GitHub MCP Tools

**Created**: 2026-01-14  
**Status**: Complete  
**Parent Issue**: [#26](https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues/26)

---

## 🎯 Overview

This document details the migration of the Zen Planner agent from the legacy `zen-tasks_*` tool system to GitHub MCP (Model Context Protocol) tools for native GitHub Issues management.

---

## 📋 Migration Summary

### What Changed

**Before**: Zen Planner used `barradevdigitalsolutions.zen-tasks-copilot/*` tools to manage tasks in `_ZENTASKS/tasks.json`

**After**: Zen Planner uses `github-mcp-server-*` tools to create and manage GitHub Issues directly

### Key Benefits

1. **Single Source of Truth**: GitHub Issues are now the primary task management system
2. **Native Integration**: No synchronization needed between systems
3. **Better Collaboration**: Team can view and interact with tasks directly in GitHub
4. **Improved Visibility**: All task information available in GitHub's native interface
5. **Standardized Workflow**: Consistent with Auto Zen and other agents

---

## 🔧 Tool Changes

### Removed Tools

All `barradevdigitalsolutions.zen-tasks-copilot/*` tools have been removed:
- ❌ `zen-tasks_listTasks`
- ❌ `zen-tasks_addTask`
- ❌ `zen-tasks_getTask`
- ❌ `zen-tasks_updateTask`
- ❌ `zen-tasks_setTaskStatus`
- ❌ `zen-tasks_getNextTask`
- ❌ `zen-tasks_parseRequirements`

### Added Tools

Added GitHub MCP server tools:
- ✅ `github-mcp-server-*` (wildcard for all GitHub MCP tools)

Specifically uses:
- `github-mcp-server-list_issues` - List all issues in repository
- `github-mcp-server-search_issues` - Search issues with filters
- `github-mcp-server-issue_read` - Read issue details
- GitHub API for creating and updating issues

---

## 📝 Workflow Changes

### 1. Single Task Creation

**OLD Workflow**:
```
zen-tasks_add_task({
  title: "Implement feature X",
  description: "...",
  priority: "high",
  dependencies: ["TASK-123"]
})
```

**NEW Workflow**:
```
Create GitHub Issue:
  Title: "TASK: Implement feature X"
  Body: |
    ## Description
    [Feature description]
    
    ## Dependencies
    - Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#123
    
    ## Test Strategy
    [Testing approach]
  
  Labels: ["type: feature", "priority: high", "status: pending"]
```

### 2. Bulk Task Creation

**OLD Workflow**:
```
zen-tasks_parse_requirements(requirements_text)
```

**NEW Workflow**:
```
1. Parse requirements manually or with AI
2. Break into atomic tasks
3. For each task:
   - Create GitHub issue with proper structure
   - Link dependencies in issue body
   - Apply appropriate labels
```

### 3. Epic + Subtask Creation

**NEW Capability** (not available in old system):
```
1. Create parent epic issue
2. For each subtask:
   a. Create sub-issue
   b. Link via dependency in issue body
   c. Apply labels: type, priority, status
```

---

## 🔗 Dependency Management

### OLD Format
```json
{
  "dependencies": ["TASK-123", "TASK-124"]
}
```

### NEW Format

Dependencies are documented in issue body using full repository references:

```markdown
## Dependencies
- Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#123
- Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#124
- Blocks xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#125
- Related to xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#126 (soft dependency)
```

**Parsing Dependencies**:
- Auto Zen reads issue body to identify dependencies
- Must parse "Depends on #X" patterns
- Verifies all dependencies are closed before starting issue

---

## 🤝 Handoff Protocol Changes

### "Hand off to Auto Zen for Implementation"

**OLD**:
```
Review the tasks created in _ZENTASKS/tasks.json.
Begin executing the highest priority ready tasks.
```

**NEW**:
```
Load workflow context from Docs/Plan/ (detailed project description and feature list). 
Review the GitHub issues created using github-mcp-server-list_issues. 
Begin executing the highest priority ready issues (query with filters: 
is:open label:"status: approved" -assignee:* sort:priority), 
update labels to in-progress and assign to self, implement changes, 
run tests, and close issues. Continue the continuous development loop 
until all issues are completed or blockers are encountered. 
Create follow-up GitHub issues for any problems discovered during implementation.
```

### "Refine Plan"

**OLD**:
```
zen-tasks_update_task to modify task details
```

**NEW**:
```
Review the current GitHub Issues structure using github-mcp-server-list_issues 
and github-mcp-server-search_issues. Incorporate new requirements or feedback. 
Update issue bodies via GitHub API with new dependencies, change priority labels, 
and update details as needed. Ensure no circular dependencies and all issues are 
atomic and testable. Use github-mcp-server-issue_read (method: add_comment) for 
detailed updates.
```

---

## 📊 Issue Templates

### Feature Issue Template
```markdown
**Title**: Implement [feature name]

## Description
Add [capability] to [component] so users can [benefit]

## Details
- Modify [files]
- Add [new components]
- Update [related systems]

## Dependencies
- Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#123
- Blocks xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#124

## Test Strategy
- Unit: [specific tests]
- Integration: [scenarios]
- Manual: [verification steps]

**Labels**: type: feature, priority: medium, status: pending
```

### Epic Issue Template
```markdown
**Title**: EPIC: [Epic name]

## Overview
[High-level description of the epic]

## Goals
- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

## Sub-Issues
- [ ] #123 - Subtask 1
- [ ] #124 - Subtask 2
- [ ] #125 - Subtask 3

## Dependencies
- Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#100

## Acceptance Criteria
- [ ] All sub-issues completed
- [ ] Integration tests pass
- [ ] Documentation updated

**Labels**: type: feature, priority: high, status: pending, epic
```

---

## 🏷️ Label Schema

### Required Labels

**Type Labels** (one required):
- `type: feature` - Feature implementation
- `type: bug` - Bug fix
- `type: refactor` - Code refactoring
- `type: maintenance` - Maintenance work
- `type: architecture` - Architecture decisions
- `type: testing` - Test creation/improvement
- `type: documentation` - Documentation updates

**Priority Labels** (one required):
- `priority: critical` - Blocking all work, security, production down
- `priority: high` - Critical path, time-sensitive, unblocks multiple tasks
- `priority: medium` - Standard feature work, improvements
- `priority: low` - Nice-to-have, tech debt

**Status Labels** (one required for workflow tracking):
- `status: pending` - Not started, awaiting triage
- `status: approved` - Ready to work
- `status: in-progress` - Actively working
- `status: blocked` - Waiting on dependency
- `status: review` - Awaiting review
- `status: testing` - In testing phase

### Optional Labels

**Agent Assignment**:
- `agent: zen-planner` - Assigned to Zen Planner
- `agent: auto-zen` - Assigned to Auto Zen

**Special Markers**:
- `epic` - Issue is an epic/parent issue
- `good first issue` - Good for new contributors
- `help wanted` - Needs additional help

---

## 🔄 Requirements Analysis Loop

### Updated Process

**Phase 1: Load Context**
```
1. Read Docs/Plan/detailed project description
2. Read Docs/Plan/feature list
3. Query existing issues: github-mcp-server-list_issues
4. Identify gaps and conflicts
```

**Phase 2: Decomposition**
```
1. Analyze requirements against plan
2. Break into atomic tasks (15-45 min each)
3. Identify dependencies
4. Assign priorities
5. Define test strategies
```

**Phase 3: Issue Creation**
```
For each task:
  1. Create GitHub issue with structured body
  2. Apply type, priority, status labels
  3. Link dependencies in body
  4. Add to epic if applicable
```

**Phase 4: Validation**
```
1. Verify no circular dependencies
2. Check all tasks are atomic and testable
3. Confirm critical path is identified
4. Ensure plan alignment
```

---

## ✅ Testing Verification

### Test 1: Single Task Creation
**Objective**: Verify Zen Planner can create a single issue

**Steps**:
1. Invoke Zen Planner with a simple requirement
2. Verify issue created in GitHub
3. Confirm proper labels applied
4. Check dependency format in body

**Expected Result**: Issue created with all required fields and labels

### Test 2: Epic Creation
**Objective**: Verify epic with subtasks works

**Steps**:
1. Provide complex feature requiring multiple tasks
2. Verify epic issue created
3. Verify 5+ subtask issues created
4. Confirm dependencies linked correctly

**Expected Result**: Epic + subtasks with proper dependency chain

### Test 3: Dependency Test
**Objective**: Verify dependency parsing works

**Steps**:
1. Create task chain: A → B → C
2. Verify "Depends on" syntax in issue bodies
3. Confirm Auto Zen can parse dependencies

**Expected Result**: Proper dependency chain established

### Test 4: Bulk Creation
**Objective**: Verify parsing requirements into multiple issues

**Steps**:
1. Provide requirements document with 10+ tasks
2. Verify all issues created
3. Check dependencies are correct
4. Verify priorities assigned properly

**Expected Result**: 10+ issues created with proper structure

### Test 5: Handoff Test
**Objective**: Verify Zen Planner → Auto Zen transition

**Steps**:
1. Zen Planner creates issues
2. Hand off to Auto Zen
3. Verify Auto Zen picks up issues
4. Confirm Auto Zen can parse dependencies

**Expected Result**: Smooth handoff, Auto Zen starts execution

---

## 📚 Documentation Updates

### Files Updated

1. **`.github/agents/Zen Planner.agent.md`**
   - Updated tools list
   - Updated handoff protocols
   - Updated workflow loops
   - Updated issue templates

2. **`.github/copilot-instructions.md`**
   - Updated Zen Planner section
   - Confirmed GitHub Issues as primary system
   - Updated examples

3. **`prompts/zen_tasks_workflow.md`**
   - Added migration notice
   - Updated workflow process
   - Confirmed legacy system deprecated

4. **`Docs/GitHub-Migration/zen-planner-migration.md`** (this file)
   - Complete migration guide
   - Testing procedures
   - Examples and templates

---

## 🚨 Breaking Changes

### What No Longer Works

1. **Direct _ZENTASKS access**: Zen Planner no longer reads or writes to `_ZENTASKS/tasks.json`
2. **zen-tasks_* tools**: All old tools are removed and will fail if called
3. **Task IDs**: Old TASK-XXX IDs are replaced with GitHub issue numbers (#XXX)

### Migration Path

If you have existing _ZENTASKS tasks:
1. Manually create GitHub issues for open tasks
2. Close tasks in _ZENTASKS
3. Use GitHub Issues going forward
4. _ZENTASKS is now read-only for historical reference

---

## 🎓 Best Practices

### Creating Issues

1. **Be Specific**: Clear, actionable titles (Verb + Object)
2. **Add Context**: Full description with why and scope
3. **Link Dependencies**: Use full repository reference format
4. **Apply Labels**: Always include type, priority, status
5. **Define Tests**: Include test strategy in body

### Managing Dependencies

1. **Use Full References**: `xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#123`
2. **Document Blocks**: List what the issue blocks
3. **Identify Related**: Mark soft dependencies
4. **Avoid Circular**: Check dependency graph before creating

### Handoffs

1. **Clear Context**: Provide full context in handoff prompt
2. **Specify Filters**: Use label filters for issue queries
3. **Verify State**: Confirm issues in expected state before handoff
4. **Document Progress**: Add comments during handoff

---

## 🔍 Troubleshooting

### Issue: Zen Planner not finding issues

**Solution**: Check query filters, verify labels are correct

### Issue: Dependencies not being parsed

**Solution**: Ensure dependency format matches: `Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#XXX`

### Issue: Auto Zen not picking up issues

**Solution**: Verify status label is `status: approved` and priority label is set

### Issue: Circular dependency detected

**Solution**: Review dependency chain, break the circle by removing or reordering dependencies

---

## 📖 References

- [GitHub Migration Tool Mapping](../GitHub-Migration-Tool-Mapping.md)
- [Auto Zen Migration](./auto-zen-migration.md)
- [GitHub Issues Schema](./issues-schema.md)
- [GitHub Issues API](https://docs.github.com/en/rest/issues)
- [GitHub Search Syntax](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests)

---

**Migration Complete**: 2026-01-14  
**Verified By**: Auto Zen Migration Team
