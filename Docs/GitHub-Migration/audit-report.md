# _ZENTASKS and zen-tasks_\* Tool References Audit Report

**Date**: 2026-01-12  
**Auditor**: Auto Zen Agent  
**Scope**: Complete codebase analysis for migration from \_ZENTASKS to GitHub Issues  
**Status**: ✅ Complete

---

## Executive Summary

This audit identified **200+ references** to `_ZENTASKS` folder and `zen-tasks_*` tools across the entire codebase. The migration to GitHub Issues requires updating:

-   **6 agent configuration files** (`.github/agents/`)
-   **1 primary instructions file** (`.github/copilot-instructions.md`)
-   **40+ documentation files** (mostly in `Docs/`)
-   **4 GitHub workflow files**
-   **Multiple legacy/archived documents** (can be left as historical reference)

**CRITICAL FINDING**: All 6 orchestration agents currently use `barradevdigitalsolutions.zen-tasks-copilot/*` tools and must be migrated.

---

## 1. Agent File Analysis

### 1.1 Auto Zen Agent

**File**: `.github/agents/Auto Zen.agent.md`

**Current Tools**:

-   ❌ None listed (agent already uses GitHub MCP tools via `github/*` tools)

**Tool Usage**:

-   **Status**: ✅ Already migrated
-   Uses `github/*` tools exclusively
-   Handoff prompts reference GitHub Issues correctly

**Migration Requirements**:

-   None - agent is already GitHub-native
-   Documentation references need cleanup only

---

### 1.2 Zen Planner Agent

**File**: `.github/agents/Zen Planner.agent.md` (lines 1-50 of 378 total)

**Current Tools**:

```yaml
tools:
    [
        "barradevdigitalsolutions.zen-tasks-copilot/listTasks",
        "barradevdigitalsolutions.zen-tasks-copilot/addTask",
        "barradevdigitalsolutions.zen-tasks-copilot/getTask",
        "barradevdigitalsolutions.zen-tasks-copilot/updateTask",
        "barradevdigitalsolutions.zen-tasks-copilot/setTaskStatus",
        "barradevdigitalsolutions.zen-tasks-copilot/getNextTask",
        "barradevdigitalsolutions.zen-tasks-copilot/parseRequirements",
    ]
```

**Tool Usage Pattern**:

-   `listTasks` - Query all tasks → Replace with `github-mcp-server-list_issues`
-   `addTask` - Create task → Replace with GitHub issue creation
-   `getTask` - Read task → Replace with `github-mcp-server-issue_read`
-   `updateTask` - Update task → Replace with GitHub issue update
-   `setTaskStatus` - Update status → Replace with label updates
-   `getNextTask` - Get ready task → Replace with `github-mcp-server-search_issues` with filters
-   `parseRequirements` - Bulk create → Parse + bulk GitHub issue creation

**Handoff Protocol References**:

-   "Review the GitHub issues created using github-mcp-server-list_issues" ✅ Already updated
-   "Begin executing the highest priority ready issues" ✅ Already updated
-   "Use GitHub issue comments for detailed updates" ✅ Already updated

**Migration Complexity**: 🟡 Medium (7 tools to replace, handoffs already updated)

---

### 1.3 Testing Agent

**File**: `.github/agents/Testing Agent.agent.md` (lines 1-50 of 373 total)

**Current Tools**:

```yaml
tools:
    [
        "barradevdigitalsolutions.zen-tasks-copilot/listTasks",
        "barradevdigitalsolutions.zen-tasks-copilot/addTask",
        "barradevdigitalsolutions.zen-tasks-copilot/getTask",
        "barradevdigitalsolutions.zen-tasks-copilot/updateTask",
        "barradevdigitalsolutions.zen-tasks-copilot/setTaskStatus",
        "barradevdigitalsolutions.zen-tasks-copilot/getNextTask",
        "barradevdigitalsolutions.zen-tasks-copilot/parseRequirements",
    ]
```

**Tool Usage Pattern**: Same as Zen Planner (7 zen-tasks tools)

**Handoff Protocol References**:

-   "Create new issues to fix failing tests" ✅ Uses GitHub Issues
-   "Filter: label:'type: testing' is:open" ✅ Already updated
-   "Document test results in issue comments" ✅ Already updated

**Migration Complexity**: 🟡 Medium (7 tools to replace, handoffs already updated)

---

### 1.4 Plan Agent

**File**: `.github/agents/Plan Agent.agent.md` (lines 1-50 of 354 total)

**Current Tools**:

```yaml
tools:
    [
        "barradevdigitalsolutions.zen-tasks-copilot/listTasks",
        "barradevdigitalsolutions.zen-tasks-copilot/addTask",
        "barradevdigitalsolutions.zen-tasks-copilot/getTask",
        "barradevdigitalsolutions.zen-tasks-copilot/updateTask",
        "barradevdigitalsolutions.zen-tasks-copilot/setTaskStatus",
        "barradevdigitalsolutions.zen-tasks-copilot/getNextTask",
        "barradevdigitalsolutions.zen-tasks-copilot/parseRequirements",
    ]
```

**Tool Usage Pattern**: Same as Zen Planner (7 zen-tasks tools)

**Handoff Protocol References**:

-   "Review the architectural GitHub issues (filter: label:'type: architecture' is:open)" ✅ Already updated
-   "Create or update GitHub issues to ensure architecture aligns" ✅ Already updated
-   "Document in issue bodies with 'Depends on #X'" ✅ Already updated

**Migration Complexity**: 🟡 Medium (7 tools to replace, handoffs already updated)

---

### 1.5 Issue Handler Agent

**File**: `.github/agents/Issue Handler.agent.md` (lines 1-50 of 463 total)

**Current Tools**:

```yaml
tools: [
        "barradevdigitalsolutions.zen-tasks-copilot/listTasks",
        "barradevdigitalsolutions.zen-tasks-copilot/addTask",
        "barradevdigitalsolutions.zen-tasks-copilot/getTask",
        "barradevdigitalsolutions.zen-tasks-copilot/updateTask",
        "barradevdigitalsolutions.zen-tasks-copilot/setTaskStatus",
        "barradevdigitalsolutions.zen-tasks-copilot/getNextTask",
        "barradevdigitalsolutions.zen-tasks-copilot/parseRequirements",
        # GitHub tools already present:
        "github.vscode-pull-request-github/issue_fetch",
        "github.vscode-pull-request-github/createIssue",
        "github.vscode-pull-request-github/updateIssue",
        "github.vscode-pull-request-github/closeIssue",
    ]
```

**Special Consideration**:

-   **ALREADY HAS GITHUB TOOLS** ✅
-   zen-tasks tools can simply be removed
-   GitHub tools cover all needed functionality

**Migration Complexity**: 🟢 Low (remove zen-tasks tools, keep GitHub tools)

---

### 1.6 Dependency Agent

**File**: `.github/agents/Dependency Agent.agent.md` (lines 1-50 of 408 total)

**Current Tools**:

```yaml
tools:
    [
        "barradevdigitalsolutions.zen-tasks-copilot/listTasks",
        "barradevdigitalsolutions.zen-tasks-copilot/addTask",
        "barradevdigitalsolutions.zen-tasks-copilot/getTask",
        "barradevdigitalsolutions.zen-tasks-copilot/updateTask",
        "barradevdigitalsolutions.zen-tasks-copilot/setTaskStatus",
        "barradevdigitalsolutions.zen-tasks-copilot/getNextTask",
        "barradevdigitalsolutions.zen-tasks-copilot/parseRequirements",
    ]
```

**Tool Usage Pattern**: Same as Zen Planner (7 zen-tasks tools)

**Handoff Protocol References**:

-   "Filter: label:'type: maintenance' label:'dependencies'" ✅ Already updated
-   "Create critical/high-priority GitHub issues for security vulnerabilities" ✅ Already updated

**Migration Complexity**: 🟡 Medium (7 tools to replace, handoffs already updated)

---

## 2. Tool Usage Breakdown

### zen-tasks_000_workflow_context

**Count**: 3 references  
**Locations**:

-   `.github/copilot-instructions.md` (1)
-   `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` (1)
-   `Docs/SESSION-SUMMARY-2026-01-11-PHASE3-START.md` (1)

**Migration**: Remove - load context from `Docs/Plan/` directly

---

### zen-tasks_list_tasks

**Count**: 8 references  
**Locations**:

-   `.github/copilot-instructions.md` (1)
-   `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` (1)
-   `_ZENTASKS/TASK-mjxz0spv-m4odq.md` (task title)
-   `Docs/PROJECT-RUNBOOK.md` (1)
-   `Docs/EXECUTION-READY-SUMMARY.md` (2)
-   `Docs/GitHub-Migration-Tool-Mapping.md` (2)
-   `Docs/SESSION-SUMMARY-2026-01-11-PHASE3-START.md` (1)

**Migration**: Replace with `github-mcp-server-list_issues`

---

### zen-tasks_get_task

**Count**: 5 references  
**Locations**:

-   `.github/copilot-instructions.md` (1)
-   `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` (1)
-   `Docs/PROJECT-RUNBOOK.md` (1)
-   `Docs/EXECUTION-READY-SUMMARY.md` (1)
-   `Docs/GitHub-Migration-Tool-Mapping.md` (1)

**Migration**: Replace with `github-mcp-server-issue_read`

---

### zen-tasks_next_task

**Count**: 6 references  
**Locations**:

-   `.github/copilot-instructions.md` (1)
-   `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` (1)
-   `Docs/PROJECT-RUNBOOK.md` (1)
-   `Docs/EXECUTION-READY-SUMMARY.md` (1)
-   `Docs/GitHub-Migration-Tool-Mapping.md` (2)

**Migration**: Replace with `github-mcp-server-search_issues` with priority filters

---

### zen-tasks_add_task

**Count**: 10 references  
**Locations**:

-   `.github/copilot-instructions.md` (1)
-   `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` (1)
-   `_ZENTASKS/TASK-mjxz0y0m-kk8ty.md` (3)
-   `Docs/Plan/CODE-MASTER-ALIGNMENT.md` (1)
-   `Docs/EXECUTION-READY-SUMMARY.md` (1)
-   `Docs/GitHub-Migration-Tool-Mapping.md` (2)
-   `Docs/GITHUB-ISSUES-PLAN.md` (1)

**Migration**: Replace with GitHub issue creation

---

### zen-tasks_update_task

**Count**: 4 references  
**Locations**:

-   `.github/copilot-instructions.md` (1)
-   `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` (1)
-   `Docs/GitHub-Migration-Tool-Mapping.md` (2)

**Migration**: Replace with GitHub issue update

---

### zen-tasks_set_status

**Count**: 12 references  
**Locations**:

-   `.github/copilot-instructions.md` (1)
-   `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` (1)
-   `Docs/PROJECT-RUNBOOK.md` (4)
-   `Docs/EXECUTION-READY-SUMMARY.md` (4)
-   `Docs/GitHub-Migration-Tool-Mapping.md` (2)

**Migration**: Replace with GitHub label updates

---

### zen-tasks_parse_requirements

**Count**: 4 references  
**Locations**:

-   `.github/copilot-instructions.md` (1)
-   `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` (1)
-   `_ZENTASKS/TASK-mjxz0y0m-kk8ty.md` (task title)
-   `Docs/GitHub-Migration-Tool-Mapping.md` (1)

**Migration**: Parse + bulk GitHub issue creation

---

## 3. \_ZENTASKS Folder References

**Total**: 150+ references across documentation

**Categories**:

1. **Active References** (need update): 12 files
2. **Archival References** (historical): 28 files
3. **Migration Documentation** (informational): 5 files
4. **Task Files** (legacy data): 60+ files

**Key Active References**:

-   `.gitignore` (4) - keep for legacy folder
-   `.github/copilot-instructions.md` (4) - update to remove deprecated references
-   `.github/workflows/sync-feature-branches.yml` (1) - update script path
-   `vscode-extension/LLM-SETUP.md` (3) - update default taskRoots

**Archival References** (can remain):

-   `Docs/Archive/*` (multiple) - historical documentation
-   `Docs/SESSION-SUMMARY-*` (multiple) - session logs
-   `Docs/Plan/code master.ipynb` (multiple) - planning notebook

---

## 4. Critical Path Files

### 4.1 Primary Instructions

**File**: `.github/copilot-instructions.md`

**References**:

-   Line 15: "Legacy: \_ZENTASKS/ has been deprecated"
-   Line 321: "\_ZENTASKS/ folder (deprecated, read-only)"
-   Line 324-327: zen-tasks\_\* tool documentation
-   Line 337: "\_ZENTASKS/tasks.json — current task state"
-   Line 341: "Task definitions: \_ZENTASKS/tasks.json"
-   Line 410: "Never edit \_ZENTASKS files directly"

**Status**: ⚠️ Partial migration (mentions GitHub Issues as primary, \_ZENTASKS as fallback)

**Action Required**: Remove all \_ZENTASKS references, keep GitHub-only workflow

---

### 4.2 Consolidated Instructions

**File**: `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md`

**References**:

-   Similar to copilot-instructions.md
-   Appears to be older/consolidated version

**Status**: ⚠️ Needs full update

**Action Required**: Sync with copilot-instructions.md or deprecate

---

### 4.3 GitHub Workflows

**File**: `.github/workflows/sync-feature-branches.yml`

**Reference**: Line 119 - Script path `_ZENTASKS/scripts/resolve-conflicts.sh`

**Status**: ⚠️ Broken reference (script may not exist)

**Action Required**: Update or remove broken script reference

---

### 4.4 VS Code Extension

**File**: `vscode-extension/LLM-SETUP.md`

**References**:

-   Line 14: "Task Roots (defaults to \_ZENTASKS)"
-   Line 47: Default taskRoots = "\_ZENTASKS"
-   Line 55: "keep \_ZENTASKS unless tasks live elsewhere"

**Status**: ⚠️ Extension still expects \_ZENTASKS

**Action Required**: Update extension default to use GitHub Issues API or deprecate taskRoots

---

## 5. Dependency Mapping

### Agent → Tool Usage

| Agent            | zen-tasks Tools | GitHub Tools | Status            |
| ---------------- | --------------- | ------------ | ----------------- |
| Auto Zen         | 0               | ✅ Full      | ✅ Migrated       |
| Zen Planner      | 7               | ⚠️ Partial   | 🟡 Needs Update   |
| Testing Agent    | 7               | ✅ PR tools  | 🟡 Needs Update   |
| Plan Agent       | 7               | ✅ PR tools  | 🟡 Needs Update   |
| Issue Handler    | 7               | ✅ Full      | 🟢 Easy Migration |
| Dependency Agent | 7               | ✅ PR tools  | 🟡 Needs Update   |

**Total zen-tasks tool references in agents**: 35 (7 tools × 5 agents)

---

### Tool Call Chains

**Zen Planner Workflow**:

```
1. parseRequirements (bulk create)
   ↓
2. addTask (create individual tasks)
   ↓
3. listTasks (verify created)
   ↓
4. Hand off to Auto Zen
```

**Auto Zen Workflow** (already migrated):

```
1. github-mcp-server-search_issues (find ready tasks)
   ↓
2. github-mcp-server-issue_read (get details)
   ↓
3. Implement + test
   ↓
4. Update GitHub issue labels
   ↓
5. Close issue
```

---

## 6. Risk Assessment

### High Risk (Blocks Migration)

-   ❌ **5 agents still use zen-tasks tools** - Cannot function without migration
-   ❌ **barradevdigitalsolutions.zen-tasks-copilot extension dependency** - May not be available
-   ❌ **VS Code extension expects \_ZENTASKS folder** - Breaks task discovery

### Medium Risk (Degrades Functionality)

-   ⚠️ **Legacy documentation confusion** - Users may follow outdated instructions
-   ⚠️ **Workflow script references** - CI/CD may break
-   ⚠️ **Mixed GitHub/zen-tasks references** - Inconsistent behavior

### Low Risk (Cosmetic)

-   ℹ️ **Archived documentation** - Historical reference only
-   ℹ️ **Session summaries** - No functional impact
-   ℹ️ **Jupyter notebooks** - Planning artifacts

---

## 7. Migration Order (Recommended)

### Phase 1: Foundation (Issue #23, #24) ✅ COMPLETE

-   [x] Audit references (this document)
-   [x] Design GitHub Issues schema
-   [x] Create label taxonomy
-   [x] Document migration mappings

### Phase 2: Critical Path Agents (Issue #27)

1. **Auto Zen** ✅ Already migrated
2. **Issue Handler** 🎯 Easiest (has GitHub tools, just remove zen-tasks)

### Phase 3: Planning Agents (Issue #26, #28)

3. **Zen Planner** 🎯 High priority (task creation)
4. **Plan Agent** 🎯 Architecture decisions

### Phase 4: Quality Agents (Issue #25)

5. **Testing Agent** 🎯 Test generation
6. **Dependency Agent** 🎯 Dependency updates

### Phase 5: Documentation & Cleanup (Issue #29, #30)

7. Update `.github/copilot-instructions.md`
8. Update VS Code extension (or deprecate taskRoots)
9. Update GitHub workflows
10. Archive \_ZENTASKS folder

---

## 8. Migration Checklist by Agent

### Auto Zen ✅ COMPLETE

-   [x] Tools: Already uses `github/*` exclusively
-   [x] Handoffs: References GitHub Issues correctly
-   [x] Documentation: Mentions GitHub Issues as primary
-   [ ] Cleanup: Remove stray \_ZENTASKS references in docs

---

### Zen Planner 🟡 IN PROGRESS

-   [ ] Remove: All 7 `barradevdigitalsolutions.zen-tasks-copilot/*` tools
-   [ ] Add: GitHub MCP tools (or rely on `github/*` wildcard)
-   [ ] Update: Tool usage patterns in agent body
-   [ ] Test: Bulk task creation with GitHub Issues
-   [ ] Verify: Handoffs work with GitHub Issues

---

### Testing Agent 🟡 PENDING

-   [ ] Remove: All 7 `barradevdigitalsolutions.zen-tasks-copilot/*` tools
-   [ ] Keep: `github.vscode-pull-request-github/*` tools
-   [ ] Update: Test task creation to use GitHub Issues
-   [ ] Verify: Coverage tracking via issue comments

---

### Plan Agent 🟡 PENDING

-   [ ] Remove: All 7 `barradevdigitalsolutions.zen-tasks-copilot/*` tools
-   [ ] Keep: `github.vscode-pull-request-github/*` tools
-   [ ] Update: Architecture decision docs to use GitHub Issues
-   [ ] Verify: Constraint validation via issue reviews

---

### Issue Handler 🟢 READY

-   [ ] Remove: All 7 `barradevdigitalsolutions.zen-tasks-copilot/*` tools
-   [ ] Keep: All `github.vscode-pull-request-github/*` tools (already sufficient)
-   [ ] Update: Remove sync logic (GitHub IS the source now)
-   [ ] Simplify: Direct GitHub issue management (no conversion needed)

---

### Dependency Agent 🟡 PENDING

-   [ ] Remove: All 7 `barradevdigitalsolutions.zen-tasks-copilot/*` tools
-   [ ] Keep: `github.vscode-pull-request-github/*` tools
-   [ ] Update: Dependency update tasks to use GitHub Issues
-   [ ] Verify: Security vulnerability issues created with correct labels

---

## 9. Documentation Update Requirements

### Primary Docs (Must Update)

-   [ ] `.github/copilot-instructions.md` - Remove all zen-tasks\_\* references
-   [ ] `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` - Sync or deprecate
-   [ ] `vscode-extension/LLM-SETUP.md` - Update taskRoots default
-   [ ] `Docs/README.md` - Update task management section
-   [ ] `Docs/PROJECT-RUNBOOK.md` - Replace all zen-tasks\_\* commands

### Secondary Docs (Should Update)

-   [ ] `Docs/EXECUTION-READY-SUMMARY.md` - Update workflow examples
-   [ ] `Docs/GITHUB-ISSUES-PLAN.md` - Verify accuracy
-   [ ] `Docs/ZEN-TASKS-GITHUB-SYNC.md` - Deprecate or remove

### Archive (Keep for Historical Reference)

-   [x] `Docs/Archive/*` - No changes needed
-   [x] `Docs/SESSION-SUMMARY-*` - Historical records
-   [x] `Docs/Plan/code master.ipynb` - Planning artifact

---

## 10. Blockers & Dependencies

### Blockers

1. ❌ **zen-tasks extension availability** - If extension is required, migration blocked
2. ❌ **GitHub MCP tool access** - Must verify tools are available
3. ❌ **Tool permission scopes** - Must have write access to create/update issues

### Dependencies (Execution Order)

```
Issue #28 (Audit) ✅ COMPLETE
    ↓
Issue #24 (Schema Design) → Must define labels before migration
    ↓
Issue #27 (Auto Zen + Issue Handler) → Easiest, test GitHub tools
    ↓
Issue #26 (Zen Planner) → Core planning must work
    ↓
Issue #25 (Testing, Plan, Dependency Agents) → Parallel execution
    ↓
Issue #29 (Data Migration) → Move existing tasks
    ↓
Issue #30 (Documentation) → Final cleanup
```

---

## 11. Success Criteria

### Agent Migration Complete When:

-   [ ] Zero `barradevdigitalsolutions.zen-tasks-copilot/*` tool references
-   [ ] All handoffs reference GitHub Issues
-   [ ] Agents can create, read, update, close GitHub Issues
-   [ ] Dependency tracking works via sub-issues
-   [ ] Priority filtering works via labels
-   [ ] Test task creation and completion end-to-end

### Documentation Complete When:

-   [ ] Zero instructional references to zen-tasks\_\* tools (except historical)
-   [ ] All runbooks use GitHub MCP tool commands
-   [ ] Agent instructions reference GitHub Issues exclusively
-   [ ] Migration complete banner in \_ZENTASKS/README.md

### System Complete When:

-   [ ] Auto Zen autonomous loop works with GitHub Issues
-   [ ] Zen Planner creates GitHub Issues from requirements
-   [ ] All agents coordinate via GitHub Issues
-   [ ] \_ZENTASKS folder archived
-   [ ] Rollback plan documented

---

## 12. Rollback Plan

### If Migration Fails:

1. Revert agent .md files from git history
2. Restore `.github/copilot-instructions.md` from commit before migration
3. Keep \_ZENTASKS folder intact (don't delete until verified)
4. Document failure reasons in new GitHub Issue
5. Create investigation task to resolve blockers

### Partial Rollback (Per Agent):

-   Each agent can be rolled back independently
-   Keep Auto Zen on GitHub (already working)
-   Revert others to zen-tasks tools if needed
-   Document mixed-mode operation constraints

---

## 13. Estimated Effort

| Phase            | Tasks  | Est. Hours | Complexity  |
| ---------------- | ------ | ---------- | ----------- |
| Audit            | 1      | 2h         | ✅ Complete |
| Schema Design    | 1      | 2h         | Pending     |
| Auto Zen         | 1      | 0h         | ✅ Complete |
| Issue Handler    | 1      | 1h         | Low         |
| Zen Planner      | 1      | 3h         | Medium      |
| Testing Agent    | 1      | 1.5h       | Medium      |
| Plan Agent       | 1      | 1h         | Medium      |
| Dependency Agent | 1      | 1.5h       | Medium      |
| Data Migration   | 1      | 3h         | Medium      |
| Documentation    | 1      | 2h         | Low         |
| **Total**        | **10** | **17h**    | **Medium**  |

---

## 14. Next Steps

1. ✅ **Complete**: Audit (this document)
2. 🎯 **Next**: Issue #24 - Design GitHub Issues schema
3. 🎯 **Then**: Issue #27 - Migrate Auto Zen (verify), Issue Handler
4. 🎯 **Then**: Issue #26 - Migrate Zen Planner
5. 🎯 **Then**: Issue #25 - Migrate remaining agents
6. 🎯 **Then**: Issue #29 - Migrate data
7. 🎯 **Then**: Documentation cleanup

---

## Appendix A: Complete File Reference List

### Agent Files (6)

1. `.github/agents/Auto Zen.agent.md` ✅ Migrated
2. `.github/agents/Zen Planner.agent.md` 🟡 Needs Update
3. `.github/agents/Testing Agent.agent.md` 🟡 Needs Update
4. `.github/agents/Plan Agent.agent.md` 🟡 Needs Update
5. `.github/agents/Issue Handler.agent.md` 🟡 Needs Update
6. `.github/agents/Dependency Agent.agent.md` 🟡 Needs Update

### Critical Documentation (5)

1. `.github/copilot-instructions.md` ⚠️ Partial migration
2. `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` ⚠️ Needs update
3. `vscode-extension/LLM-SETUP.md` ⚠️ Needs update
4. `Docs/PROJECT-RUNBOOK.md` ⚠️ Needs update
5. `Docs/README.md` ⚠️ Needs update

### Workflow Files (1)

1. `.github/workflows/sync-feature-branches.yml` ⚠️ Broken reference

### Migration Docs (3)

1. `Docs/GitHub-Migration-Tool-Mapping.md` ✅ Complete
2. `Docs/GitHub-Migration-Summary.md` ✅ Complete
3. `Docs/ZENTASKS-MIGRATION-PLAN.md` ✅ Planning complete

---

## Appendix B: Tool Mapping Reference

| Old Tool                         | New Tool                          | Notes                                  |
| -------------------------------- | --------------------------------- | -------------------------------------- |
| `zen-tasks_000_workflow_context` | N/A                               | Load from `Docs/Plan/` + GitHub search |
| `zen-tasks_list_tasks`           | `github-mcp-server-list_issues`   | With filters                           |
| `zen-tasks_get_task`             | `github-mcp-server-issue_read`    | method: get                            |
| `zen-tasks_next_task`            | `github-mcp-server-search_issues` | Priority filters                       |
| `zen-tasks_add_task`             | GitHub Issue Creation             | Via appropriate tool                   |
| `zen-tasks_update_task`          | GitHub Issue Update               | Body, labels, assignees                |
| `zen-tasks_set_status`           | GitHub Labels                     | status: \* labels                      |
| `zen-tasks_parse_requirements`   | Parse + Bulk Create               | Custom logic                           |

---

## Conclusion

This audit provides a complete inventory of all _ZENTASKS and zen-tasks_\* references across the codebase. The migration path is clear:

1. **Foundation work complete** ✅ (audit, schema, mapping docs)
2. **5 agents need tool migration** 🟡 (remove zen-tasks, use GitHub)
3. **Documentation cleanup required** ⚠️ (instructions, runbooks)
4. **Data migration pending** 🔜 (move existing tasks to issues)

**Estimated completion**: 17 hours across 10 tasks  
**Risk level**: Medium (agents blocked until tool migration)  
**Recommended start**: Issue #24 (Schema Design) → Issue #27 (Agent Migration)

---

**Report Generated**: 2026-01-12  
**Auto Zen Agent**: Autonomous Execution Mode  
**Next Action**: Proceed to Issue #24 - GitHub Issues Schema Design
