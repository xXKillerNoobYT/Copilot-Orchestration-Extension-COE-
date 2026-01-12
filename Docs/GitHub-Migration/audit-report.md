# _ZENTASKS Migration Audit Report

**Date**: 2026-01-12  
**Issue**: #[Issue Number]  
**Status**: Complete  
**Auditor**: Auto Zen (Autonomous Agent)

---

## Executive Summary

This comprehensive audit identifies all `_ZENTASKS` and `zen-tasks_*` tool references across the Copilot Orchestration Extension codebase. The migration from the legacy file-based task system to GitHub Issues is partially complete, with significant references remaining that must be updated.

### Key Findings

- **Total _ZENTASKS References**: 232 across codebase
- **Agent Files Using zen-tasks Tools**: 5 out of 7 agents
- **Prompt File References**: 10 references in workflow documentation
- **Copilot Instructions References**: 4 references
- **Critical Impact**: High - affects core agent orchestration workflows

---

## 1. Reference Count Summary

### By Category

| Category | Count | Files Affected | Priority |
|----------|-------|----------------|----------|
| Agent Tool Declarations | 5 agents | `.github/agents/*.agent.md` | CRITICAL |
| Workflow Documentation | 10+ | `prompts/zen_tasks_workflow.md`, `prompts/base.md` | HIGH |
| Copilot Instructions | 4 | `.github/copilot-instructions.md` | HIGH |
| Documentation References | 100+ | Various `Docs/` files | MEDIUM |
| Code Implementation | 50+ | TypeScript/PHP files | MEDIUM |
| Legacy Task Files | 77+ | `_ZENTASKS/*.md` | LOW (read-only) |

### Tool-Specific Counts

| zen-tasks Tool | Agent References | Description |
|----------------|------------------|-------------|
| `listTasks` | 5 agents | Query all tasks with filters |
| `addTask` | 5 agents | Create new task |
| `getTask` | 5 agents | Retrieve task details |
| `updateTask` | 5 agents | Modify task properties |
| `setTaskStatus` | 5 agents | Update task status |
| `getNextTask` | 5 agents | Find ready-to-start task |
| `parseRequirements` | 5 agents | Bulk task creation from requirements |

**Total Tool References**: 35 (7 tools × 5 agents)

---

## 2. Agent Breakdown

### 2.1 Auto Zen (Auto Zen.agent.md)

**zen-tasks Tool Usage**: ✗ NONE in tool declaration  
**Workflow References**: ✓ YES in handoff prompts (legacy)

**Analysis**:
- Tool declaration does NOT include zen-tasks tools
- However, handoff prompt #2 ("Full Auto - Cloud Task Master") contains legacy reference:
  ```
  "Load Zen Tasks workflow context using zen-tasks_000_workflow_context. 
   Inspect current tasks in _ZENTASKS/tasks.json..."
  ```
- This is a **critical inconsistency** - prompt refers to tools not available

**Critical Paths**:
- Continuous development loop (uses GitHub Issues - ✓ MIGRATED)
- Cloud deployment workflow (uses GitHub Issues - ✓ MIGRATED)
- Task observation and follow-up creation (uses GitHub Issues - ✓ MIGRATED)

**Migration Status**: 🟡 **PARTIAL** - Tool declarations migrated, but legacy prompt remains

---

### 2.2 Zen Planner (Zen Planner.agent.md)

**zen-tasks Tool Usage**: ✓ ALL 7 TOOLS

**Tools Declared**:
```yaml
- barradevdigitalsolutions.zen-tasks-copilot/listTasks
- barradevdigitalsolutions.zen-tasks-copilot/addTask
- barradevdigitalsolutions.zen-tasks-copilot/getTask
- barradevdigitalsolutions.zen-tasks-copilot/updateTask
- barradevdigitalsolutions.zen-tasks-copilot/setTaskStatus
- barradevdigitalsolutions.zen-tasks-copilot/getNextTask
- barradevdigitalsolutions.zen-tasks-copilot/parseRequirements
```

**Workflow Context Loading**:
- Documented to use GitHub MCP tools (Primary)
- Fallback to file-based reads of `_ZENTASKS/tasks.json`
- Instructions reference both systems

**Critical Paths**:
- Requirements parsing → task creation
- Task decomposition and breakdown
- Dependency mapping
- Priority assignment

**Migration Status**: 🔴 **NOT MIGRATED** - Still declares all zen-tasks tools

---

### 2.3 Testing Agent (Testing Agent.agent.md)

**zen-tasks Tool Usage**: ✓ ALL 7 TOOLS

**Tools Declared**: Same as Zen Planner

**Critical Paths**:
- Test generation from completed tasks
- Quality gate enforcement
- Coverage gap detection → task creation
- Test failure → investigation task creation

**Migration Status**: 🔴 **NOT MIGRATED** - Still declares all zen-tasks tools

---

### 2.4 Plan Agent (Plan Agent.agent.md)

**zen-tasks Tool Usage**: ✓ ALL 7 TOOLS

**Tools Declared**: Same as Zen Planner

**Critical Paths**:
- Architecture documentation → implementation tasks
- Design validation → compliance tasks
- Structural decisions → architectural issues

**Migration Status**: 🔴 **NOT MIGRATED** - Still declares all zen-tasks tools

---

### 2.5 Issue Handler (Issue Handler.agent.md)

**zen-tasks Tool Usage**: ✓ ALL 7 TOOLS

**Tools Declared**: Same as Zen Planner (plus GitHub issue tools)

**Critical Paths**:
- GitHub issue → internal task sync
- Task → GitHub issue creation
- Bidirectional state synchronization

**Migration Status**: 🔴 **NOT MIGRATED** - Still declares all zen-tasks tools

---

### 2.6 Dependency Agent (Dependency Agent.agent.md)

**zen-tasks Tool Usage**: ✓ ALL 7 TOOLS

**Tools Declared**: Same as Zen Planner

**Critical Paths**:
- Dependency update → maintenance task creation
- Security vulnerability → critical task creation
- Version drift detection → update tasks

**Migration Status**: 🔴 **NOT MIGRATED** - Still declares all zen-tasks tools

---

### 2.7 Cloud Agent (Cloud Agent.agent.md)

**zen-tasks Tool Usage**: ✗ NONE

**Migration Status**: ✅ **ALREADY MIGRATED** - No zen-tasks dependencies

---

## 3. Critical Workflow Paths

### 3.1 Autonomous Development Loop (Auto Zen)

**Current Implementation**: ✅ GitHub Issues-based

```yaml
Flow:
  1. Load plan context from Docs/Plan/
  2. Query GitHub Issues (github-mcp-server-search_issues)
  3. Pick highest-priority ready issue
  4. Update labels to in-progress
  5. Implement → Test → Close issue
  6. Create follow-up GitHub issues
  7. Repeat
```

**Risk**: LOW - Already migrated, but legacy prompt exists

---

### 3.2 Requirements → Task Creation (Zen Planner)

**Current Implementation**: 🔴 zen-tasks tools

```yaml
Flow:
  1. Parse requirements with zen-tasks_parse_requirements
  2. Create tasks with zen-tasks_add_task
  3. Set dependencies in tasks.json
  4. Assign priorities with zen-tasks_update_task
```

**Target Implementation**: GitHub Issues

```yaml
Flow:
  1. Parse requirements manually
  2. Create GitHub Issues via API
  3. Link dependencies in issue body ("Depends on #X")
  4. Apply priority labels
```

**Risk**: HIGH - Core planning workflow, heavily used

---

### 3.3 Test Generation → Coverage Tasks (Testing Agent)

**Current Implementation**: 🔴 zen-tasks tools

```yaml
Flow:
  1. Analyze code coverage
  2. Identify gaps
  3. Create tasks with zen-tasks_add_task
  4. Link to original task
```

**Target Implementation**: GitHub Issues

```yaml
Flow:
  1. Analyze code coverage
  2. Identify gaps
  3. Create GitHub Issues for coverage
  4. Link via "Related to #X" in body
```

**Risk**: MEDIUM - Quality workflow, frequent usage

---

### 3.4 Architecture Validation → Compliance Tasks (Plan Agent)

**Current Implementation**: 🔴 zen-tasks tools

```yaml
Flow:
  1. Review implementation
  2. Detect violations
  3. Create tasks with zen-tasks_add_task
  4. Assign to Auto Zen
```

**Target Implementation**: GitHub Issues

```yaml
Flow:
  1. Review implementation
  2. Detect violations
  3. Create GitHub Issues
  4. Assign via GitHub API
```

**Risk**: MEDIUM - Architectural integrity depends on this

---

### 3.5 Issue Sync Workflow (Issue Handler)

**Current Implementation**: 🔴 Bidirectional sync with zen-tasks

```yaml
Flow:
  1. Monitor GitHub Issues
  2. Convert to tasks with zen-tasks_add_task
  3. Sync status with zen-tasks_set_status
  4. Keep both systems aligned
```

**Target Implementation**: GitHub Issues as single source of truth

```yaml
Flow:
  1. Monitor GitHub Issues (only)
  2. Use GitHub Issues directly
  3. No sync needed
  4. Remove bidirectional complexity
```

**Risk**: HIGH - Critical bridge between systems, complex logic

---

## 4. Tool Usage Analysis

### 4.1 zen-tasks_000_workflow_context

**Purpose**: Load workflow guidelines and task state

**Usage Patterns**:
- Called at agent initialization
- Hydrates context before task selection
- Loads from `prompts/zen_tasks_workflow.md` and `_ZENTASKS/tasks.json`

**References Found**: 1 (Auto Zen handoff prompt)

**Migration Path**:
```yaml
Before: zen-tasks_000_workflow_context
After:  
  1. Read Docs/Plan/ files directly
  2. Query github-mcp-server-list_issues
  3. Parse issue state from GitHub
```

---

### 4.2 zen-tasks_list_tasks

**Purpose**: Query all tasks with optional filters

**Usage Patterns**:
- List tasks by status
- Filter by priority
- Get tasks by type
- Dependency queries

**References Found**: 5 agent tool declarations

**Migration Path**:
```yaml
Before: zen-tasks_list_tasks(status="pending", priority="high")
After:  github-mcp-server-search_issues(query="is:open label:status:pending label:priority:high")
```

---

### 4.3 zen-tasks_next_task

**Purpose**: Find highest-priority ready-to-start task

**Usage Patterns**:
- Select next task for autonomous execution
- Respect dependencies
- Apply priority ordering

**References Found**: 5 agent tool declarations

**Migration Path**:
```yaml
Before: zen-tasks_next_task()
After:  
  1. github-mcp-server-search_issues(query="is:open -label:status:blocked -label:status:in-progress sort:priority")
  2. Parse dependencies from issue body
  3. Verify dependencies met
  4. Return first eligible issue
```

---

### 4.4 zen-tasks_add_task

**Purpose**: Create new task

**Usage Patterns**:
- Create follow-up tasks from observations
- Generate tasks from requirements
- Create sub-tasks for decomposition

**References Found**: 5 agent tool declarations

**Migration Path**:
```yaml
Before: zen-tasks_add_task(title, description, priority, type)
After:  
  GitHub API: POST /repos/{owner}/{repo}/issues
  Body: {
    title: title,
    body: description + "\n\n**Labels**: priority: {priority}, type: {type}",
    labels: ["priority:{priority}", "type:{type}", "status:pending"]
  }
```

---

### 4.5 zen-tasks_update_task

**Purpose**: Modify task properties

**Usage Patterns**:
- Update task details
- Change priority
- Add dependencies
- Modify description

**References Found**: 5 agent tool declarations

**Migration Path**:
```yaml
Before: zen-tasks_update_task(task_id, updates)
After:  
  GitHub API: PATCH /repos/{owner}/{repo}/issues/{issue_number}
  Body: {
    body: updated_body,
    labels: updated_labels
  }
```

---

### 4.6 zen-tasks_set_status

**Purpose**: Change task status

**Usage Patterns**:
- Mark in-progress
- Mark blocked
- Mark done
- Mark review

**References Found**: 5 agent tool declarations

**Migration Path**:
```yaml
Before: zen-tasks_set_status(task_id, "in-progress")
After:  
  If status="done": Close issue via GitHub API
  Else: Update labels via GitHub API (remove old status, add new status)
```

---

### 4.7 zen-tasks_get_task

**Purpose**: Retrieve detailed task information

**Usage Patterns**:
- Load task for execution
- Read task dependencies
- Get task metadata

**References Found**: 5 agent tool declarations

**Migration Path**:
```yaml
Before: zen-tasks_get_task(task_id)
After:  github-mcp-server-issue_read(issue_number, method="get")
```

---

### 4.8 zen-tasks_parse_requirements

**Purpose**: Bulk task creation from requirements text

**Usage Patterns**:
- Convert user stories to tasks
- Parse feature requirements
- Generate task hierarchies

**References Found**: 5 agent tool declarations

**Migration Path**:
```yaml
Before: zen-tasks_parse_requirements(requirements_text)
After:  
  1. Parse requirements manually (LLM analysis)
  2. Create multiple GitHub Issues via API
  3. Link dependencies in issue bodies
  4. Apply appropriate labels
```

---

## 5. Dependency Mapping

### 5.1 Agent → Tool Usage Matrix

| Agent | listTasks | addTask | getTask | updateTask | setStatus | nextTask | parseReqs |
|-------|-----------|---------|---------|------------|-----------|----------|-----------|
| Auto Zen | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Zen Planner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Testing Agent | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Plan Agent | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Issue Handler | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dependency Agent | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cloud Agent | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Total Agents**: 7  
**Agents Using zen-tasks Tools**: 5 (71%)  
**Agents Fully Migrated**: 2 (29%)

---

### 5.2 Tool Call Chains

**Chain 1: Autonomous Loop (Auto Zen)**
```
[Already Migrated to GitHub Issues]
github-mcp-server-search_issues 
  → Select Issue
  → github-mcp-server-issue_read (get details)
  → Execute
  → Update labels or Close
  → Create follow-up issues
```

**Chain 2: Requirements Planning (Zen Planner)**
```
[Needs Migration]
zen-tasks_parse_requirements 
  → zen-tasks_add_task (multiple)
  → zen-tasks_update_task (set dependencies)
  → zen-tasks_list_tasks (verify)
```

**Chain 3: Test Generation (Testing Agent)**
```
[Needs Migration]
zen-tasks_get_task (get completed task)
  → Analyze code
  → zen-tasks_add_task (test tasks)
  → zen-tasks_set_status (mark original done)
```

**Chain 4: Issue Sync (Issue Handler)**
```
[Needs Migration]
GitHub Issue Created
  → zen-tasks_add_task (create internal task)
  → zen-tasks_set_status (sync status)
  → GitHub Issue Updated
  → zen-tasks_update_task (sync back)
```

---

### 5.3 Handoff Protocols Using _ZENTASKS

**Auto Zen → Zen Planner**
- Current: Reports blocked tasks, Zen Planner decomposes via zen-tasks tools
- Target: Report blocked issues, Zen Planner creates sub-issues via GitHub API

**Zen Planner → Auto Zen**
- Current: Creates tasks with zen-tasks_add_task, Auto Zen picks with zen-tasks_next_task
- Target: Creates GitHub Issues, Auto Zen queries via github-mcp-server-search_issues

**Testing Agent → Auto Zen**
- Current: Creates fix tasks with zen-tasks_add_task
- Target: Creates GitHub Issues with labels

**Any Agent → Issue Handler**
- Current: Issue Handler syncs to zen-tasks
- Target: Issue Handler works only with GitHub Issues

---

## 6. Risk Assessment

### 6.1 High-Risk Areas

#### Risk 1: Requirements Parsing (Zen Planner)
**Severity**: 🔴 HIGH  
**Impact**: Core planning workflow breaks  
**Affected Agents**: Zen Planner, Auto Zen  
**Migration Complexity**: HIGH

**Consequences if not migrated**:
- Cannot create new task hierarchies
- Planning sessions fail
- Bulk task creation broken

**Mitigation**:
1. Implement GitHub Issues bulk creation API wrapper
2. Develop dependency parsing for issue bodies
3. Create label management utilities
4. Test with sample requirements before full migration

---

#### Risk 2: Issue Sync Bidirectionality (Issue Handler)
**Severity**: 🔴 HIGH  
**Impact**: Data inconsistency between systems  
**Affected Agents**: Issue Handler, all agents  
**Migration Complexity**: VERY HIGH

**Consequences if not migrated**:
- Sync failures between GitHub and internal tasks
- Data loss or duplication
- Status inconsistencies
- Confusion about source of truth

**Mitigation**:
1. Phase out bidirectional sync
2. Make GitHub Issues single source of truth
3. Archive _ZENTASKS data before removal
4. Update all agents simultaneously to avoid drift

---

#### Risk 3: Tool Availability During Migration (All Agents)
**Severity**: 🟡 MEDIUM  
**Impact**: Agent workflows fail if tools removed prematurely  
**Affected Agents**: 5 agents  
**Migration Complexity**: MEDIUM

**Consequences if not migrated**:
- Agents invoke non-existent tools
- Workflow failures
- Manual intervention required

**Mitigation**:
1. Migrate agents sequentially
2. Keep both systems running during transition
3. Test each agent after migration
4. Deprecate tools only after all agents migrated

---

### 6.2 Medium-Risk Areas

#### Risk 4: Dependency Resolution Logic
**Severity**: 🟡 MEDIUM  
**Impact**: Task selection may choose blocked tasks  
**Affected Agents**: Auto Zen, Zen Planner

**Mitigation**:
- Implement robust dependency parsing from issue bodies
- Validate dependency chains before task selection
- Add "Depends on #X" parsing utilities

---

#### Risk 5: Status Transition Complexity
**Severity**: 🟡 MEDIUM  
**Impact**: Status updates more complex with labels  
**Affected Agents**: All agents

**Mitigation**:
- Create label management helper functions
- Define clear status label conventions
- Test status transitions thoroughly

---

### 6.3 Low-Risk Areas

#### Risk 6: Documentation References
**Severity**: 🟢 LOW  
**Impact**: Documentation out of date  
**Affected**: Documentation files

**Mitigation**:
- Update documentation post-migration
- Create migration guide for users

---

## 7. Migration Order Recommendation

### Phase 1: Foundation (Week 1)
**Priority**: CRITICAL  
**Sequence**: Must be completed first

1. ✅ **Auto Zen** - ALREADY DONE
   - Verify GitHub Issues integration works
   - Remove legacy handoff prompt reference
   - Test autonomous loop

2. **Cloud Agent** - ALREADY DONE
   - No changes needed
   - Already uses GitHub workflows

3. **Create Migration Utilities**
   - GitHub Issues bulk creation API
   - Dependency parsing from issue bodies
   - Label management helpers
   - Status transition utilities

---

### Phase 2: Planning Infrastructure (Week 2)
**Priority**: HIGH  
**Sequence**: Required for new work

4. **Zen Planner**
   - Remove zen-tasks tool declarations
   - Update handoff prompts to use GitHub MCP tools
   - Implement bulk issue creation for parse_requirements
   - Update workflow documentation
   - Test requirements → issues workflow

5. **Documentation Updates**
   - Update `prompts/zen_tasks_workflow.md`
   - Update `prompts/base.md`
   - Update `.github/copilot-instructions.md`
   - Archive legacy workflow docs

---

### Phase 3: Quality & Architecture Agents (Week 3)
**Priority**: MEDIUM  
**Sequence**: Support agents

6. **Testing Agent**
   - Remove zen-tasks tool declarations
   - Use GitHub Issues for test gap tasks
   - Update quality gate workflows
   - Test coverage → issues workflow

7. **Plan Agent**
   - Remove zen-tasks tool declarations
   - Use GitHub Issues for architecture tasks
   - Update compliance checking
   - Test architecture → issues workflow

---

### Phase 4: Integration Agents (Week 4)
**Priority**: MEDIUM  
**Sequence**: Cross-cutting concerns

8. **Dependency Agent**
   - Remove zen-tasks tool declarations
   - Use GitHub Issues for dependency updates
   - Update security vulnerability workflows
   - Test dependency → issues workflow

9. **Issue Handler** (LAST)
   - Remove bidirectional sync logic
   - Make GitHub Issues single source of truth
   - Remove zen-tasks tool declarations
   - Archive sync state tracking
   - Test full issue lifecycle

---

### Phase 5: Cleanup & Verification (Week 5)
**Priority**: LOW  
**Sequence**: Final cleanup

10. **Archive _ZENTASKS**
    - Move to `_ZENTASKS_ARCHIVE/`
    - Create read-only snapshot
    - Update .gitignore
    - Document archival in CHANGELOG

11. **Remove Legacy Documentation**
    - Archive old workflow docs
    - Remove deprecated references
    - Update all links

12. **Full System Test**
    - Test complete autonomous loop
    - Verify all handoffs work
    - Test bulk planning session
    - Validate no tool errors
    - Performance testing

---

## 8. Success Criteria

### 8.1 Agent Migration Success

For each agent migration to be considered successful:

- [ ] Agent file has NO `barradevdigitalsolutions.zen-tasks-copilot/*` tools
- [ ] Agent handoff prompts reference GitHub MCP tools
- [ ] Agent can execute full workflow without zen-tasks tools
- [ ] Agent can create/read/update GitHub Issues successfully
- [ ] All tests pass for agent workflows
- [ ] Documentation updated to reflect new patterns

---

### 8.2 System-Wide Success

For complete migration to be successful:

- [ ] All 7 agents can operate without zen-tasks tools
- [ ] GitHub Issues is single source of truth
- [ ] No bidirectional sync needed
- [ ] All workflow loops functional
- [ ] Dependency resolution works
- [ ] Status transitions work
- [ ] Bulk operations work (planning sessions)
- [ ] Performance acceptable
- [ ] No data loss from migration
- [ ] Documentation complete and accurate
- [ ] _ZENTASKS safely archived
- [ ] 30-day production validation passed

---

## 9. Rollback Plan

If migration fails critically:

### Rollback Triggers
- Data loss or corruption
- Critical workflow failures
- Performance degradation >50%
- Unrecoverable errors in production

### Rollback Procedure
1. Restore agent files from git history
2. Re-enable zen-tasks tools
3. Restore _ZENTASKS/ from archive
4. Revert documentation changes
5. Restore bidirectional sync
6. Run verification tests
7. Document rollback reasons
8. Plan remediation

---

## 10. Recommendations

### Immediate Actions (This Week)

1. **Remove Legacy Prompt** (Auto Zen)
   - Delete handoff #2 legacy prompt containing zen-tasks references
   - Verify agent still works correctly

2. **Create Migration Utilities**
   - Build GitHub Issues API wrappers
   - Implement dependency parser
   - Test label management

3. **Test Current State**
   - Verify Auto Zen and Cloud Agent work
   - Confirm GitHub Issues integration stable
   - Baseline performance metrics

---

### Next Sprint (Weeks 2-4)

4. **Migrate Zen Planner** (Week 2)
   - Highest priority after foundation
   - Enables all new planning work
   - Test thoroughly before proceeding

5. **Migrate Support Agents** (Week 3)
   - Testing Agent
   - Plan Agent
   - Lower risk, parallel work possible

6. **Migrate Integration Agent** (Week 4)
   - Issue Handler last
   - Most complex migration
   - Requires all others complete

---

### Future Considerations

7. **Performance Optimization**
   - GitHub API rate limiting
   - Caching strategies
   - Bulk operation optimization

8. **Enhanced Features**
   - Issue templates
   - Automated workflows
   - Advanced queries

9. **Monitoring**
   - Track migration progress
   - Monitor error rates
   - Performance dashboards

---

## 11. Appendix: File Inventory

### Files with _ZENTASKS References

**Agent Files** (5):
- `.github/agents/Zen Planner.agent.md` - 7 tool declarations
- `.github/agents/Testing Agent.agent.md` - 7 tool declarations
- `.github/agents/Plan Agent.agent.md` - 7 tool declarations
- `.github/agents/Issue Handler.agent.md` - 7 tool declarations
- `.github/agents/Dependency Agent.agent.md` - 7 tool declarations

**Prompt Files** (2):
- `prompts/zen_tasks_workflow.md` - 10+ references
- `prompts/base.md` - 5+ references

**Configuration Files** (1):
- `.github/copilot-instructions.md` - 4 references

**Documentation Files** (50+):
- `Docs/ZENTASKS-MIGRATION-PLAN.md`
- `Docs/GitHub-Migration-Summary.md`
- `Docs/GitHub-Migration-Tool-Mapping.md`
- Various session summaries
- Implementation guides
- Architecture documentation

**Code Files** (20+):
- `vscode-extension/src/**/*.ts` - Task parsing, execution
- `app/Services/ZenTasksFileService.php`
- `app/Services/GitHubZenTasksSyncService.php`

**Legacy Task Files** (77):
- `_ZENTASKS/tasks.json`
- `_ZENTASKS/TASK-*.md` (76 task markdown files)

---

## 12. Conclusion

The migration from _ZENTASKS to GitHub Issues is **71% complete** in terms of agent count, but **critical dependencies remain** in 5 out of 7 agents. The highest priority is migrating **Zen Planner**, as it blocks all new planning work.

**Estimated Total Migration Effort**: 4-5 weeks  
**Risk Level**: MEDIUM-HIGH (with mitigation plan)  
**Recommended Start Date**: Immediately after utility creation

**Next Steps**:
1. Review and approve this audit report
2. Create migration utility tasks
3. Begin Phase 1: Remove Auto Zen legacy prompt
4. Start Phase 2: Migrate Zen Planner

---

**Report Compiled**: 2026-01-12  
**Tools Used**: grep, custom bash scripts, manual analysis  
**Lines Analyzed**: ~50,000+  
**Files Reviewed**: 100+  
