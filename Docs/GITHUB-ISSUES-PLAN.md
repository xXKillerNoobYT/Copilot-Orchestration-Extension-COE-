# GitHub Issues Plan - Project Runbook
**Created**: January 11, 2026  
**Purpose**: Sequential GitHub issues to get the project running properly  
**Total Issues**: 3 (to be executed in order)  
**Estimated Total Time**: 25-36 hours

---

## 📋 Overview

These three GitHub issues are designed to:
1. **Fix critical blockers** (Issue #1)
2. **Implement live preview system** (Issue #2)  
3. **Implement plan decomposition engine** (Issue #3)

Execute in order. Each issue must be completed before starting the next.

---

## 🎯 ISSUE #1: Fix Critical Blockers & Prepare Project Infrastructure

**Title**: `[CRITICAL] Fix Git state, design system integration, and test suite`

**Priority**: 🔴 CRITICAL  
**Type**: Bug + Chore  
**Effort**: 3-4 hours  
**Assignee**: Auto Zen Agent  
**Milestone**: Week 1 (Jan 11-14)

### Description

This issue resolves three critical blockers that are preventing the project from running properly:

1. **Git Repository in Inconsistent State**
   - Uncommitted changes in `vscode-extension/` directory
   - Test files disabled but not properly committed
   - Working directory dirty after design system merge

2. **Design System Integration Incomplete**
   - Temporary markers in `planIntegration.ts` (lines 11-17, 180-195)
   - Design handoff imports commented out
   - Prevents plan → design handoff functionality

3. **Test Suite Partially Disabled**
   - Design system tests disabled (`.disabled` extension)
   - No replacement tests created
   - Coverage gap in design token validation

### Acceptance Criteria

- [ ] All uncommitted changes properly committed or reverted
- [ ] Git working directory is clean (`git status` shows "nothing to commit")
- [ ] Design system imports restored in `planIntegration.ts`
- [ ] No "TEMPORARY" markers remaining in codebase
- [ ] Design system tests re-enabled (74+ tests)
- [ ] All 74+ design tests passing (100% pass rate)
- [ ] TypeScript compilation succeeds (0 errors)
- [ ] 4+ atomic git commits with clear messages
- [ ] Code Master alignment verified
- [ ] Documentation updated in Docs folder

### Definition of Done

```
✅ Git Clean
✅ Design System Operational  
✅ Tests Passing (74/74)
✅ No TypeScript Errors
✅ Ready for Issue #2
```

### Files to Check/Modify

- `vscode-extension/src/planBuilder/planIntegration.ts` (restore imports)
- `vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts.disabled`
- `vscode-extension/src/planBuilder/designSystem/validator.test.ts.disabled`
- `_ZENTASKS/tasks.json` (mark related tasks done)
- `Docs/Plan/CODE-MASTER-ALIGNMENT.md` (update status)

### Related Documentation

- CODE-MASTER-ALIGNMENT.md (Critical Issues 1-3)
- PROJECT-EXECUTION-DASHBOARD.md (Immediate Tasks section)
- SESSION-AUTO-ZEN-2026-01-11-EVENING.md (session report)

### Next Issue

→ **ISSUE #2: Implement Live Preview System for Interactive Design**

---

## 🎯 ISSUE #2: Implement Live Preview System for Interactive Design

**Title**: `[HIGH] Implement live preview system with real-time design updates`

**Priority**: 🟠 HIGH  
**Type**: Feature  
**Effort**: 5-8 hours  
**Assignee**: Auto Zen Agent  
**Blocker**: Must complete ISSUE #1 first  
**Milestone**: Week 1-2 (Jan 12-14)

### Description

Implement a real-time preview system that allows users to see design changes as they modify wizard answers. This is a key feature of the Interactive Design Phase.

### Requirements

**Core Functionality**:
1. **PreviewEngine.ts** - Real-time renderer that converts wizard state to visual preview
2. **WizardStateObserver.ts** - Watches for answer changes and triggers updates
3. **PreviewFeedback.ts** - Shows compatibility indicators and impact warnings
4. **WizardContainer Integration** - Wire preview into existing wizard interface

**Performance Requirements**:
- Preview updates within 200-500ms of wizard change (critical)
- Handle 10+ wizard pages rendering efficiently
- No memory leaks during extended usage

**Testing Requirements**:
- >75% code coverage minimum
- Unit tests for each component
- Integration tests for wizard → preview flow
- Performance tests verifying <500ms latency
- Edge case tests (empty values, invalid data)

### Acceptance Criteria

- [ ] PreviewEngine renders all 10 wizard pages correctly
- [ ] WizardStateObserver detects all answer changes
- [ ] Preview updates <500ms after wizard change (verified with performance test)
- [ ] Feedback indicators display correctly (compatibility, impact)
- [ ] No console errors or warnings
- [ ] >75% code coverage for new code
- [ ] All unit tests passing (100%)
- [ ] All integration tests passing (100%)
- [ ] All performance tests passing
- [ ] TypeScript compilation succeeds (0 errors)
- [ ] No new lint/type errors introduced
- [ ] New code follows project patterns and conventions

### Definition of Done

```
✅ Preview Engine Operational (<500ms latency)
✅ All 10 Wizard Pages Render
✅ Feedback System Working
✅ Tests Passing (>75% coverage)
✅ No TypeScript Errors
✅ Ready for ISSUE #3
```

### New Files to Create

- `vscode-extension/src/components/preview/PreviewEngine.ts`
- `vscode-extension/src/components/preview/WizardStateObserver.ts`
- `vscode-extension/src/components/preview/PreviewFeedback.ts`
- `vscode-extension/src/components/preview/PreviewContainer.vue`
- `vscode-extension/src/components/preview/PreviewEngine.test.ts`
- `vscode-extension/src/components/preview/WizardStateObserver.test.ts`

### Files to Modify

- `vscode-extension/src/planBuilder/wizardContainer.ts` (integrate preview)
- `vscode-extension/src/planBuilder/wizardContainer.vue` (add preview panel)

### Related Documentation

- EXECUTION-BRIEF-2026-01-12-TASK4.md (if created)
- CODE-MASTER-ALIGNMENT.md (update Section 9 status)
- PROJECT-EXECUTION-DASHBOARD.md (update progress)

### Next Issue

→ **ISSUE #3: Implement Plan Decomposition Engine**

---

## 🎯 ISSUE #3: Implement Plan Decomposition Engine (Auto Task Generation)

**Title**: `[HIGH] Implement automatic task decomposition from plans`

**Priority**: 🟠 HIGH  
**Type**: Feature  
**Effort**: 12-16 hours  
**Assignee**: Auto Zen Agent  
**Blocker**: Must complete ISSUE #1 first (ISSUE #2 is independent)  
**Milestone**: Week 2 (Jan 14-21)

### Description

Implement the Plan Decomposition Engine that automatically generates tasks from plan features. This is the core mechanism that turns the wizard output into an executable task queue.

### Requirements

**Backend Services**:
1. **PlanDecompositionService.php** - Core decomposition algorithm
   - Feature → subtask breakdown logic
   - Dependency inference from feature descriptions
   - Circular dependency detection (DFS)
   - Critical path analysis
   - Priority assignment (HIGH/MEDIUM/LOW)

2. **WizardPlanParserService.php** - Parse wizard output
   - Extract features from plan JSON
   - Map wizard answers to task properties
   - Validate feature completeness

3. **API Endpoint** - `/api/v1/plans/{id}/decompose`
   - POST endpoint to trigger decomposition
   - Returns generated tasks with dependencies
   - WebSocket event broadcast for real-time UI updates

**Core Algorithm**:
```
Plan.features (with scope/timeline)
    ↓
Automatic Feature Decomposition (15-45 min subtasks)
    ↓
Subtask Generation (from feature descriptions)
    ↓
Dependency Inference (smart detection from descriptions)
    ↓
Circular Dependency Check (DFS algorithm)
    ↓
Critical Path Analysis (identify blockers)
    ↓
Priority Assignment (HIGH/MEDIUM/LOW)
    ↓
Task Queue Population (insert into database)
    ↓
WebSocket Event Broadcast (notify frontend)
```

**Testing Requirements**:
- >75% code coverage minimum
- 27+ test cases covering:
  - Feature decomposition scenarios
  - Edge cases (complex features, dependencies)
  - Error handling (circular dependencies)
  - Priority assignment logic
  - Performance (50+ features)
- All tests passing (100%)

### Acceptance Criteria

- [ ] PlanDecompositionService created and tested
- [ ] WizardPlanParserService created and tested
- [ ] `/api/v1/plans/{id}/decompose` endpoint working
- [ ] Features correctly decomposed into 15-45 min subtasks
- [ ] Dependencies automatically detected from feature text
- [ ] Circular dependencies prevented (algorithm verified)
- [ ] Priority assignments correct (HIGH/MEDIUM/LOW)
- [ ] Critical path identified and marked
- [ ] Handles 50+ features without issues (performance test)
- [ ] >75% code coverage for new code
- [ ] All 27+ unit tests passing
- [ ] All integration tests passing
- [ ] No new PHP syntax errors
- [ ] No new lint/type errors introduced
- [ ] WebSocket broadcast working (UI updates in real-time)

### Definition of Done

```
✅ Plan → Task Conversion Operational
✅ 27+ Tests Passing (>75% coverage)
✅ Circular Dependencies Prevented
✅ Priority Assignment Working
✅ Critical Path Analysis Active
✅ No PHP Errors
✅ Ready for Integration Testing
```

### New Files to Create

- `app/Services/PlanDecompositionService.php`
- `app/Services/WizardPlanParserService.php`
- `app/Http/Controllers/PlanDecompositionController.php`
- `tests/Feature/PlanDecompositionTest.php`
- `tests/Unit/Services/PlanDecompositionServiceTest.php`
- `tests/Unit/Services/WizardPlanParserServiceTest.php`

### Files to Modify

- `routes/api.php` (add decomposition endpoint)
- `app/Models/Plan.php` (add decomposition relationship)
- `Docs/Plan/CODE-MASTER-ALIGNMENT.md` (update status)

### Related Documentation

- CODE-MASTER-ALIGNMENT.md (update Section 10 status)
- PROJECT-EXECUTION-DASHBOARD.md (update progress)
- task-orchestration-flow.md (reference for decomposition algorithm)

### Success Metrics

- ✅ 27/27 tests passing
- ✅ 100+ test assertions all passing
- ✅ >75% code coverage
- ✅ Plan → Task conversion time <2 seconds
- ✅ Project completion: 42% → 48%+ (estimated)

---

## 📊 Execution Timeline

```
Week 1 (Jan 11-14)
├─ ISSUE #1: Fix Blockers [3-4 hrs]
│  └─ Fri-Sat: Git cleanup, design restoration
│
├─ ISSUE #2: Live Preview [5-8 hrs]  [Starts after ISSUE #1]
│  └─ Sat-Sun: Preview engine implementation
│
└─ Testing Phase (parallel with ISSUE #2)

Week 2 (Jan 14-21)
├─ ISSUE #3: Plan Decomposition [12-16 hrs]  [Starts Jan 14]
│  ├─ Mon-Wed: Core algorithm implementation
│  ├─ Wed-Thu: Testing & edge cases
│  └─ Thu-Fri: Performance validation
│
└─ Integration Phase
   └─ Verify all three features working together
```

---

## 🔍 Quality Gates (All Issues)

**Pre-Commit Checks** (mandatory for all issues):
- [ ] TypeScript/PHP compiles without errors
- [ ] All tests passing (100%)
- [ ] Code coverage >75% for new code
- [ ] No new lint/type/PHP errors
- [ ] All related documentation updated
- [ ] Atomic git commits with clear messages
- [ ] Code follows project conventions

**Post-Completion Validation**:
- [ ] Manual testing in VS Code
- [ ] Edge case verification
- [ ] Performance benchmarking
- [ ] Code Master alignment check
- [ ] Documentation review

---

## 💾 Git Discipline

### Commit Message Format

**ISSUE #1**:
```
fix: Resolve Git state and design system integration issues

- Commit all pending changes in vscode-extension/
- Restore design system imports in planIntegration.ts
- Remove TEMPORARY markers
- Re-enable design system tests (74+ tests)
- Update task statuses in _ZENTASKS/
```

**ISSUE #2**:
```
feat: Implement live preview system for interactive design

- Add PreviewEngine for real-time rendering
- Add WizardStateObserver for change detection
- Add PreviewFeedback for indicators
- Integrate with WizardContainer
- Add comprehensive test suite (75%+ coverage)
```

**ISSUE #3**:
```
feat: Implement plan decomposition engine for auto task generation

- Add PlanDecompositionService with core algorithm
- Add WizardPlanParserService for plan parsing
- Add `/api/v1/plans/{id}/decompose` endpoint
- Add circular dependency detection (DFS)
- Add priority assignment and critical path analysis
- Add 27+ comprehensive test suite
```

### Commit Strategy
- One logical commit per major feature
- Minimum one commit per issue (can be more for large issues)
- Use semantic commit prefixes (feat:, fix:, test:, docs:, chore:)
- Reference issue number in commit messages where applicable

---

## 🚀 How to Use This Document

### Option A: Create Issues Manually in GitHub
1. Copy the text of each issue from this document
2. Go to your GitHub repository
3. Click "New Issue" for each
4. Paste the content and adjust formatting
5. Assign to Auto Zen Agent
6. Add to appropriate milestone
7. Execute in order

### Option B: Use This as Execution Plan
1. Use these issues as a task breakdown
2. Create corresponding Zen Tasks (via `zen-tasks_add_task`)
3. Execute via Auto Zen workflow
4. Track progress independently
5. Create GitHub issues as final documentation

### Option C: Hybrid Approach
1. Create ISSUE #1 and #2 in GitHub first (critical path)
2. Create as Zen Tasks for immediate execution
3. Create ISSUE #3 after progress on #1-2
4. Use GitHub issues as external tracking

---

## 📞 Support & Escalation

### If Stuck on Issue #1
- Review CODE-MASTER-ALIGNMENT.md for full context
- Check git log for previous related work
- Consult planIntegration.ts for exact line numbers
- Mark task as blocked and create investigation task

### If Stuck on Issue #2
- Review existing wizard implementation
- Check performance requirements (200-500ms critical)
- Consult Plan Agent for architecture guidance
- Mark task as blocked and create investigation task

### If Stuck on Issue #3
- Review task-orchestration-flow.md for decomposition patterns
- Consult existing task dependency logic
- Check circular dependency algorithm in Phase 1 code
- Mark task as blocked and create investigation task

---

## ✅ Success Criteria (All Issues Complete)

- ✅ ISSUE #1: Git clean, design system operational, tests passing
- ✅ ISSUE #2: Live preview working (<500ms latency), all tests passing
- ✅ ISSUE #3: Plan decomposition working, 27+ tests passing
- ✅ Project completion: 42% → 48%+
- ✅ All code properly tested (>75% coverage)
- ✅ All documentation updated
- ✅ Clean git history with atomic commits
- ✅ Ready for next iteration

---

**Next Steps**: Create these issues in GitHub and execute in order, or use as Zen Tasks for autonomous execution.
