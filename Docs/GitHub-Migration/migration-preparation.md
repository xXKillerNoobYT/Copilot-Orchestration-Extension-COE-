# _ZENTASKS to GitHub Issues Migration - Preparation Document

**Created**: 2026-01-15  
**Status**: Ready for Migration  
**Total Tasks**: 76

---

## 📊 Task Analysis

### By Status
- **Done**: 63 tasks (82.9%)
- **Pending**: 7 tasks (9.2%)
- **Blocked**: 4 tasks (5.3%)
- **In Progress**: 1 task (1.3%)
- **Cancelled**: 1 task (1.3%)

### By Priority
- **Critical**: 1 task (1.3%)
- **High**: 43 tasks (56.6%)
- **Medium**: 25 tasks (32.9%)
- **Low**: 7 tasks (9.2%)

### Special Categories
- **EPICs**: 12 tasks
- **With Dependencies**: 50 tasks (65.8%)
- **With Completion Summaries**: 4 tasks

---

## 🗺️ Migration Mapping

The migration script has created a mapping file at: `_ZENTASKS/task-id-to-issue-number.json`

### Mapping Strategy
- **Issue Number Range**: #100-#175
- **Ordering**: 
  1. Done tasks first (for historical record)
  2. Then by priority (critical → high → medium → low)
  3. Finally by creation date

### Sample Mappings
```json
{
  "TASK-mk7k9xxd-diskfree": 100,
  "TASK-mk9340a0-y1pk7": 101,
  "TASK-mk9352eu-xm9qr": 102,
  ...
}
```

---

## 🏷️ Label Mapping

### Type Labels Applied
- **epic** - For EPIC tasks (12 tasks)
- **type: feature** - Feature implementation (default)
- **type: bug** - Bug fixes (detected from title)
- **type: testing** - Test-related tasks
- **type: documentation** - Documentation tasks
- **type: architecture** - Architecture/EPIC tasks
- **type: refactor** - Refactoring tasks

### Priority Labels
- **priority: critical** - 1 task
- **priority: high** - 43 tasks
- **priority: medium** - 25 tasks
- **priority: low** - 7 tasks

### Status Labels (for non-done tasks)
- **status: pending** - 7 tasks
- **status: blocked** - 4 tasks
- **status: in-progress** - 1 task

---

## 🔗 Dependency Analysis

### Total Dependencies
- **Tasks with dependencies**: 50 (65.8%)
- **Dependency links to create**: 13

### Dependency Resolution Strategy
1. **Phase 1**: Create all issues without dependencies
2. **Phase 2**: Update issue bodies to include "Depends on #XXX" references
3. **Verification**: Ensure all dependency links are valid

### Known Issues
Some tasks reference EPIC IDs that don't exist as separate tasks (e.g., "EPIC-003", "EPIC-004"). These will be marked as warnings but won't break the migration.

**Tasks with unresolved dependencies**:
- TASK-mk936720-1uajo → EPIC-004 (missing)
- TASK-mk9367c1-v290i → EPIC-003 (missing)
- And 17 more with similar EPIC references

---

## 📝 Issue Body Structure

Each migrated issue will have the following structure:

```markdown
## Description
[Original task description]

## Implementation Details
[Original task details]

## Test Strategy
[Original test strategy]

## Dependencies
- Depends on task: `TASK-XXX` (will be linked after migration)

## Completion Summary
[For completed tasks - includes files created/modified, LOC, etc.]

---

**Original Task ID**: `TASK-XXX` (migrated from _ZENTASKS)
**Created**: [timestamp]
**Updated**: [timestamp]
```

---

## ⚠️ Migration Warnings

### Circular Dependencies
None detected in current task set.

### Missing Dependencies
Some tasks reference EPIC IDs that aren't in the task list. These are likely conceptual groupings rather than actual tasks. The migration will note these as warnings but continue.

### Special Cases

1. **TASK-mk9c0009-branch-management** (In Progress)
   - Currently in progress
   - Will remain open after migration
   - Should be assigned to current executor

2. **Blocked Tasks** (4 total)
   - Will have `status: blocked` label
   - Will remain open
   - Should be reviewed for unblocking

---

## 🎯 Migration Execution Plan

### Phase 1: Pre-Migration (COMPLETE)
- ✅ Analyze tasks.json structure
- ✅ Count and categorize tasks
- ✅ Create migration mapping
- ✅ Generate migration script
- ✅ Run dry-run test

### Phase 2: GitHub Issue Creation (PENDING)
Since we cannot programmatically create GitHub Issues from this script (requires GitHub API authentication), the migration will be done through GitHub's MCP tools.

**Options**:
1. **Manual Creation**: Use the mapping file and script output to manually create issues
2. **GitHub MCP Integration**: Use GitHub MCP server tools to create issues programmatically
3. **GitHub CLI**: Use `gh issue create` in batch mode

**Recommended Approach**: GitHub MCP tools (option #2)

### Phase 3: Dependency Linking (PENDING)
After all issues are created, update issue bodies to include dependency references.

### Phase 4: Verification (PENDING)
- Verify count matches
- Verify labels are correct
- Verify dependencies are linked
- Create verification report

### Phase 5: Legacy Archival (PENDING)
- Rename `_ZENTASKS/` to `_ZENTASKS_LEGACY/`
- Add README explaining migration
- Keep for 30 days then archive

---

## 📋 Verification Checklist

- [ ] All 76 tasks migrated to GitHub Issues
- [ ] Issue numbers match mapping file
- [ ] All labels applied correctly
- [ ] All completed tasks marked as closed
- [ ] All open tasks have correct status labels
- [ ] All dependencies linked
- [ ] Completion summaries present for completed tasks
- [ ] Migration mapping file saved
- [ ] Verification report created

---

## 🛡️ Rollback Plan

If migration fails:

1. **Keep original data**: `_ZENTASKS/tasks.json` remains untouched
2. **Delete created issues**: Use mapping file to identify and remove created issues
3. **Restore agents**: Agents haven't been updated yet (per dependency plan)
4. **Document issues**: Record what went wrong for retry

---

## 📚 Next Steps

1. **Execute Migration**: Use GitHub MCP tools or API to create issues
2. **Verify Migration**: Check all tasks are present and correct
3. **Update Agents**: After verification, update agents to use GitHub Issues (issues #23-27)
4. **Archive Legacy**: Rename _ZENTASKS to _ZENTASKS_LEGACY
5. **Update Documentation**: Update all references to new system

---

**Dependencies**: 
- Depends on: #23, #24, #25, #26, #27 (agent migrations)
- Blocks: #29 (documentation updates)

**Status**: Ready for execution pending GitHub API/MCP integration
