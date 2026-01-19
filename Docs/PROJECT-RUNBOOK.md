# Project Runbook - Autonomous Execution Guide
**Created**: January 11, 2026  
**Purpose**: Complete guide to get the project running autonomously  
**Status**: ✅ READY FOR EXECUTION

---

## 🚀 Quick Start

Three GitHub-style issues have been created and are ready to execute in order. These mirror both GitHub issues and Zen Tasks for autonomous workflow execution.

### Execute in This Order

```
1️⃣ TASK-mk9fli5s-rdccw: Fix critical blockers [3-4 hrs]
   └─ Git cleanup, design system restoration, test re-enablement
   
2️⃣ TASK-mk9flig9-mxpna: Live preview system [5-8 hrs]
   └─ Real-time design updates (<500ms latency)
   
3️⃣ TASK-mk9flire-o6vp4: Plan decomposition engine [12-16 hrs]
   └─ Automatic task generation from plans
```

**Total Estimated Time**: 20-28 hours  
**Target Completion**: January 24, 2026  
**Target Project Completion**: 42% → 48%+

---

## 📋 Issue Details & Linked Resources

### Issue #1: Fix Critical Blockers

**Zen Task**: `TASK-mk9fli5s-rdccw`  
**GitHub Issue**: See [GITHUB-ISSUES-PLAN.md](GITHUB-ISSUES-PLAN.md#-issue-1-fix-critical-blockers--prepare-project-infrastructure)  
**Effort**: 3-4 hours  
**Blocks**: ISSUE #2

**What to Do**:
1. Commit all pending changes in `vscode-extension/`
2. Restore design system imports in `planIntegration.ts`
3. Re-enable design system tests
4. Verify all tests pass (74/74)
5. Update documentation

**Success**: Git clean, design system operational, tests passing

---

### Issue #2: Live Preview System

**Zen Task**: `TASK-mk9flig9-mxpna`  
**GitHub Issue**: See [GITHUB-ISSUES-PLAN.md](GITHUB-ISSUES-PLAN.md#-issue-2-implement-live-preview-system-for-interactive-design)  
**Effort**: 5-8 hours  
**Blocks**: None (can run in parallel with Issue #1)  
**Blocked By**: Issue #1

**What to Do**:
1. Create PreviewEngine.ts (real-time renderer)
2. Create WizardStateObserver.ts (change detection)
3. Create PreviewFeedback.ts (indicators)
4. Integrate with WizardContainer
5. Create comprehensive test suite (>75% coverage)
6. Verify <500ms latency

**Success**: Preview working, <500ms latency, tests passing

---

### Issue #3: Plan Decomposition Engine

**Zen Task**: `TASK-mk9flire-o6vp4`  
**GitHub Issue**: See [GITHUB-ISSUES-PLAN.md](GITHUB-ISSUES-PLAN.md#-issue-3-implement-plan-decomposition-engine-auto-task-generation)  
**Effort**: 12-16 hours  
**Blocks**: None (core feature)  
**Blocked By**: Issue #1

**What to Do**:
1. Create PlanDecompositionService.php (core algorithm)
2. Create WizardPlanParserService.php (plan parsing)
3. Implement decomposition algorithm (15-45 min subtasks)
4. Implement dependency inference
5. Implement circular dependency detection
6. Create 27+ test cases (>75% coverage)
7. Create API endpoint `/api/v1/plans/{id}/decompose`

**Success**: Plan→Task working, 27+ tests passing, no circular dependencies

---

## 🔍 How to Inspect Current State

### Check Current Tasks

```bash
# List all high-priority pending tasks
zen-tasks_list_tasks --status pending --priority high

# Get next available task
zen-tasks_next_task --limit 5

# View specific task details
zen-tasks_get_task --taskId TASK-mk9fli5s-rdccw
```

### Check Project Documentation

```bash
# View overall alignment status
cat Docs/Plan/CODE-MASTER-ALIGNMENT.md

# View execution dashboard
cat Docs/PROJECT-EXECUTION-DASHBOARD.md

# View GitHub issues plan
cat Docs/GITHUB-ISSUES-PLAN.md
```

### Check Git Status

```bash
# Verify git is clean
git status  # Should show: "Your branch is up to date. nothing to commit"

# View recent commits
git log --oneline -10

# Check for uncommitted changes
git diff
git diff --cached
```

---

## 🚀 How to Execute (Option A: Autonomous)

### For Auto Zen Autonomous Execution

```bash
# Start the autonomous loop with first task
# The system will:
# 1. Load workflow context
# 2. Get next ready task (TASK-mk9fli5s-rdccw)
# 3. Mark in-progress
# 4. Execute implementation
# 5. Run tests and verify
# 6. Mark done
# 7. Create follow-up tasks
# 8. Repeat with Issue #2

# Command
@Auto Zen start
```

### What Auto Zen Will Do

1. **Load Context** (5 min)
   - Read workflow guidelines
   - Refresh plan context from Docs/Plan/
   - Analyze current task state

2. **Issue #1 Execution** (3-4 hrs)
   - Read task details
   - Fix Git issues
   - Restore design system
   - Re-enable tests
   - Verify compilation
   - Commit changes
   - Mark task done

3. **Issue #2 Execution** (5-8 hrs)
   - Create preview components
   - Implement state observer
   - Add feedback system
   - Create tests
   - Verify latency <500ms
   - Commit changes
   - Mark task done

4. **Issue #3 Execution** (12-16 hrs)
   - Create decomposition service
   - Implement algorithm
   - Create 27+ tests
   - Verify performance
   - Commit changes
   - Mark task done

5. **Post-Session**
   - Create session report
   - Update documentation
   - Commit all changes
   - Prepare for next iteration

---

## 🚀 How to Execute (Option B: Step-by-Step Manual)

### Execute Issue #1

```bash
# 1. Start the task
zen-tasks_set_status --taskId TASK-mk9fli5s-rdccw --status in-progress

# 2. Fix Git issues
cd vscode-extension/
git status  # Check for uncommitted changes
git add -A
git commit -m "fix: Resolve uncommitted changes in vscode-extension"

# 3. Restore design system imports
# Edit: vscode-extension/src/planBuilder/planIntegration.ts
# Uncomment: lines 11-17 (design system imports)
# Remove: TEMPORARY markers

# 4. Re-enable tests
mv vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts.disabled \
   vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts

mv vscode-extension/src/planBuilder/designSystem/validator.test.ts.disabled \
   vscode-extension/src/planBuilder/designSystem/validator.test.ts

# 5. Run tests
npm test -- designSystem  # Should show 74/74 passing

# 6. Verify compilation
npm run compile  # Should show 0 TypeScript errors

# 7. Commit all changes
git add -A
git commit -m "fix: Restore design system integration and re-enable tests"

# 8. Mark task done
zen-tasks_set_status --taskId TASK-mk9fli5s-rdccw --status done
```

### Execute Issue #2

```bash
# After Issue #1 is complete
zen-tasks_set_status --taskId TASK-mk9flig9-mxpna --status in-progress

# Follow steps outlined in GITHUB-ISSUES-PLAN.md → Issue #2
# Create 6 new files for preview system
# Implement real-time renderer with <500ms latency
# Create comprehensive tests (>75% coverage)
# Verify all tests pass
# Commit changes
# Mark task done
```

### Execute Issue #3

```bash
# After Issue #1 is complete
zen-tasks_set_status --taskId TASK-mk9flire-o6vp4 --status in-progress

# Follow steps outlined in GITHUB-ISSUES-PLAN.md → Issue #3
# Create backend services for plan decomposition
# Implement decomposition algorithm
# Create 27+ test cases
# Implement API endpoint
# Verify performance with 50+ features
# Commit changes
# Mark task done
```

---

## 📊 Execution Monitoring

### Track Progress with Todo List

```bash
# Update todo list as you progress
manage_todo_list --operation write --todoList [
  {"id": 1, "title": "Issue #1: Fix blockers", "status": "in-progress"},
  {"id": 2, "title": "Issue #2: Live preview", "status": "not-started"},
  {"id": 3, "title": "Issue #3: Plan decomposition", "status": "not-started"}
]
```

### Monitor Git History

```bash
# View recent commits after each task
git log --oneline -15

# Should see commits for:
# - Issue #1: fix: Git + design system fixes
# - Issue #2: feat: Live preview implementation
# - Issue #3: feat: Plan decomposition implementation
```

### Verify Compilation After Each Task

```bash
# After each major task
npm run compile

# Expected: 0 TypeScript errors
# If errors: debug immediately, mark task blocked, create investigation task
```

### Run Full Test Suite

```bash
# After all tasks complete
npm test  # Should show >90% pass rate
phpunit   # Should show >90% pass rate
```

---

## 🎯 Success Criteria (End of All Issues)

- ✅ **Issue #1 Complete**
  - Git clean (no uncommitted changes)
  - Design system fully integrated
  - Design tests passing (74/74)
  - No "TEMPORARY" markers

- ✅ **Issue #2 Complete**
  - Preview engine operational
  - Real-time updates <500ms
  - All 10 wizard pages render
  - Feedback indicators working
  - >75% test coverage

- ✅ **Issue #3 Complete**
  - Plan decomposition working
  - 27+ tests passing
  - Circular dependencies prevented
  - Priority assignment working
  - Critical path analysis active

- ✅ **Overall Quality**
  - 0 TypeScript errors
  - 0 PHP syntax errors
  - >75% code coverage (new code)
  - All tests passing (100%)
  - Clean git history (atomic commits)

- ✅ **Project Advancement**
  - Completion: 42% → 48%+
  - Ready for next phase

---

## 📞 Troubleshooting

### If Stuck on Issue #1

**Problem**: Git conflicts or uncommitted changes won't clear  
**Solution**: 
1. Review git status carefully
2. Stash any unrelated changes (`git stash`)
3. Create investigation task
4. Mark Issue #1 as blocked

**Problem**: Design tests won't pass  
**Solution**:
1. Check if .disabled files were properly renamed
2. Run individual test file (`npm test -- tokenGenerator`)
3. Review error messages for specific failures
4. Create investigation task for each failing test

### If Stuck on Issue #2

**Problem**: Preview latency >500ms  
**Solution**:
1. Profile with performance monitoring
2. Optimize rendering (reduce re-renders)
3. Use Vue 3 composition API optimizations
4. Cache computed values
5. Create optimization task

**Problem**: Tests failing for wizard state observer  
**Solution**:
1. Verify Pinia store is mocked correctly
2. Check state change detection mechanism
3. Debug async timing issues
4. Create test debugging task

### If Stuck on Issue #3

**Problem**: Circular dependency detection failing  
**Solution**:
1. Review DFS algorithm implementation
2. Test with known circular dependency
3. Add diagnostic logging
4. Create algorithm debugging task

**Problem**: Performance issues with 50+ features  
**Solution**:
1. Profile decomposition algorithm
2. Optimize feature parsing
3. Cache intermediate results
4. Create performance optimization task

---

## 📝 Documentation to Update

After completing each issue, update:

1. **CODE-MASTER-ALIGNMENT.md**
   - Update status from "HIGH" to "RESOLVED" (Issue #1)
   - Update section percentages (Issues #2, #3)
   - Add completion dates

2. **PROJECT-EXECUTION-DASHBOARD.md**
   - Mark tasks as DONE
   - Update progress percentages
   - Document any issues encountered

3. **Session Report**
   - Create Docs/SESSION-AUTO-ZEN-EXECUTION-REPORT.md
   - Document what was done, files changed, tests run
   - Include follow-up recommendations

---

## 🔄 After All Issues Complete

1. **Final Validation**
   - Run full test suite
   - Verify compilation
   - Check code coverage >75%
   - Manual testing in VS Code

2. **Git Cleanup**
   - Squash related commits (optional)
   - Push to origin
   - Tag release (optional)

3. **Documentation**
   - Update README with new features
   - Update API documentation
   - Create feature release notes

4. **Next Iteration**
   - Analyze remaining work
   - Identify next 3 high-priority tasks
   - Create GitHub issues for next phase
   - Continue autonomous execution

---

## 📚 Reference Documents

- **GITHUB-ISSUES-PLAN.md** - Detailed GitHub issues (copy-paste ready)
- **CODE-MASTER-ALIGNMENT.md** - Architecture alignment audit
- **PROJECT-EXECUTION-DASHBOARD.md** - Progress dashboard
- **CONFIGURATION-REFERENCE.md** - Complete settings guide (including LLM timeouts)
- **QUICK-REFERENCE.md** - Commands, fixes, and troubleshooting (including timeout issues)
- **task-format-specification.md** - Task creation guidelines
- **task-orchestration-flow.md** - Task workflow documentation
- **vscode-extension/LLM-TIMEOUT-CONFIGURATION.md** - LLM timeout configuration for slow systems

---

## ✨ Key Success Factors

1. **Autonomous Execution**
   - Use Auto Zen for continuous execution
   - Let system run through all three issues
   - Minimal manual intervention needed

2. **Quality Gates**
   - Every issue must have >75% test coverage
   - Every issue must pass 100% of tests
   - Every issue must have 0 compilation errors

3. **Git Discipline**
   - Atomic commits with semantic prefixes
   - Clear commit messages
   - One logical change per commit

4. **Documentation**
   - Update docs in Docs/ folder (not root)
   - Follow task format specification
   - Use tools to update tasks (not direct edits)

5. **Progress Tracking**
   - Update PROJECT-EXECUTION-DASHBOARD.md
   - Update CODE-MASTER-ALIGNMENT.md
   - Create session reports
   - Use manage_todo_list for visibility

---

## 🎓 How to Get Help

- **For Architecture Questions**: See CODE-MASTER-ALIGNMENT.md
- **For Task Details**: Read GITHUB-ISSUES-PLAN.md
- **For Workflow**: Read zen_tasks_workflow.md
- **For Configuration**: See CONFIGURATION-REFERENCE.md
- **For LLM Timeout Issues**: See vscode-extension/LLM-TIMEOUT-CONFIGURATION.md
- **For Quick Fixes**: See QUICK-REFERENCE.md
- **For Blocking Issues**: Create investigation task, mark as blocked
- **For Requirements**: See Docs/Plan/detailed project description

---

**Ready to Start?** Execute with: `@Auto Zen start`

