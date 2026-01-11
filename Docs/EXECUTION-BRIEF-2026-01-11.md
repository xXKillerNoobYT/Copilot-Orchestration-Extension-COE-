# Execution Brief - Critical Issue Remediation
**Date**: January 11, 2026  
**Priority**: CRITICAL  
**Target Completion**: Within 2 weeks  
**Overall Status**: 28% → Target 45%+

---

## Executive Summary

The CODE-MASTER-ALIGNMENT audit identified **6 critical issues** blocking project progress. This execution brief contains autonomous work assignments for cloud agents with clear success criteria.

**Key Goal**: Resolve IMMEDIATE issues (30min-6hrs each) this week to unblock SHORT-TERM work (5-16hrs each) for next 2 weeks.

---

## IMMEDIATE Actions (This Week) - BLOCKING CRITICAL

### ✅ Task 1: Commit Unstaged Git Changes
**Severity**: HIGH | **Effort**: 30 min | **Agent**: Auto Zen

**Current State**:
- 3 modified files in working directory (not staged)
- 2 test files disabled (.disabled extension)
- Design system integration incomplete

**Files**:
```
vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts → tokenGenerator.test.ts.disabled
vscode-extension/src/planBuilder/designSystem/validator.test.ts → validator.test.ts.disabled
vscode-extension/src/planBuilder/planIntegration.ts (INCOMPLETE)
```

**Action Items**:
1. Stage the .disabled files and planIntegration.ts changes
2. Commit with message: `fix: Disable design system tests during Phase 3 merge integration`
3. Verify git status is clean

**Success Criteria**:
- [ ] Git status shows clean working directory
- [ ] Commit message properly recorded
- [ ] No uncommitted changes remain

---

### ✅ Task 2: Restore Design System Integration
**Severity**: HIGH | **Effort**: 4-6 hours | **Agent**: Auto Zen

**Current Problem** (Lines 11-17, 180-195 in planIntegration.ts):
```typescript
// TEMPORARY: Design system removed during merge - restore in TASK-mk9380vc-br0n9
// import { extractDesignDataFromWizard, validateDesignPayload, convertToDesignTokens } from './designHandoff';
// Stub types
type DesignHandoffPayload = Record<string, unknown>;
```

**What's Needed**:
1. Uncomment the design system imports
2. Restore `extractDesignDataFromWizard()` function calls
3. Restore `validateDesignPayload()` integration
4. Restore `convertToDesignTokens()` workflow
5. Remove stub type definitions
6. Run tests to verify integration works

**Files to Modify**:
- `vscode-extension/src/planBuilder/planIntegration.ts`
- `vscode-extension/src/planBuilder/designHandoff.ts` (verify exists/complete)

**Success Criteria**:
- [ ] No "TEMPORARY" or commented-out imports remain
- [ ] designHandoff functions properly imported and exported
- [ ] TypeScript compilation passes
- [ ] Design system integration tests pass (from Task 3)

---

### ✅ Task 3: Re-enable Design System Test Files
**Severity**: HIGH | **Effort**: 2-3 hours | **Agent**: Testing Agent

**Current State**:
- Tests disabled: `tokenGenerator.test.ts.disabled` (354 LOC)
- Tests disabled: `validator.test.ts.disabled` (430 LOC)
- No replacement tests exist

**Action Plan**:
1. Rename `.disabled` files back to `.ts` extension
2. Run test suite: `npm test -- designSystem`
3. Fix any failures from design system changes
4. Commit fixed tests with message: `fix: Re-enable and fix design system tests`
5. Verify coverage metrics

**Files**:
- `vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts`
- `vscode-extension/src/planBuilder/designSystem/validator.test.ts`

**Success Criteria**:
- [ ] Both test files renamed back to .ts
- [ ] All design system tests pass
- [ ] npm test output shows 100% pass rate
- [ ] Test coverage >80% for design system module
- [ ] No skipped or pending tests

---

## SHORT-TERM Actions (Next 2 Weeks) - HIGH IMPACT

### 🔄 Task 4: Implement Live Preview System
**Severity**: MEDIUM | **Effort**: 5-8 hours | **Agent**: Auto Zen  
**Blocker**: Tasks 1-3 must complete first

**Overview**: Connect wizard state to preview panel with real-time design updates (target <500ms latency)

**Missing Components**:
- Real-time design updates from wizard answers
- Page section rendering based on wizard state
- Preview panel ↔ question answers data binding
- Live feedback indicators (compatibility, impact)
- Visual element selection/highlighting

**Implementation Strategy**:
1. Create `PreviewEngine.ts` - Real-time renderer for wizard state → visual design
2. Implement `WizardStateObserver.ts` - Watches wizard changes, triggers preview refresh
3. Add WebSocket listener for live preview updates from backend
4. Create `PreviewFeedback.ts` - Compatibility/impact indicators
5. Integrate with existing `wizardContainer.ts`

**Key Files**:
- `vscode-extension/src/planBuilder/livePreview/previewEngine.ts` (NEW)
- `vscode-extension/src/planBuilder/livePreview/wizardStateObserver.ts` (NEW)
- `vscode-extension/src/planBuilder/wizardContainer.ts` (MODIFY)

**Success Criteria**:
- [ ] Preview updates <500ms after wizard answer change
- [ ] All wizard page types render correctly
- [ ] Feedback indicators working
- [ ] No console errors
- [ ] Test coverage >75%

---

### 🔄 Task 5: Implement Plan-Driven Task Decomposition
**Severity**: HIGH | **Effort**: 12-16 hours | **Agent**: Auto Zen  
**Blocker**: Task 1 (clean git), Tasks 2-3 optional but nice

**Overview**: Auto-generate tasks from plan features with dependency mapping and priority assignment

**Current Gap**: Plans are created but don't automatically generate tasks. Users must manually create tasks.

**Components to Build**:

1. **Backend Service** (Laravel):
   - `app/Services/PlanDecompositionService.php` (NEW)
   - Methods: `decomposeFeatures()`, `inferDependencies()`, `assignPriorities()`
   - Integrate with existing `DependencyGraphService` for validation

2. **Backend Route** (NEW):
   - POST `/api/v1/plans/{id}/decompose` - Trigger task generation
   - Validation & error handling
   - Return generated tasks

3. **Frontend Integration** (Wizard):
   - Call decomposition endpoint on plan creation
   - Update task queue automatically
   - Notify user: "X tasks generated from plan"

4. **MCP Integration**:
   - Add new MCP tool: `plan_to_tasks` - Expose decomposition to agents

**Files to Create/Modify**:
- `app/Services/PlanDecompositionService.php` (NEW, ~300 LOC)
- `app/Http/Controllers/McpController.php` (ADD route)
- `routes/api.php` (ADD route)
- `vscode-extension/src/planBuilder/planCompletion.ts` (MODIFY)

**Success Criteria**:
- [ ] Plans with features auto-generate tasks on save
- [ ] Tasks have proper dependencies detected
- [ ] Circular dependency detection prevents invalid graphs
- [ ] Priority assignment follows critical path analysis
- [ ] All tests pass (feature + unit)
- [ ] Task queue populated correctly

---

### 🔄 Task 6: Set Up Basic Observability & Metrics
**Severity**: MEDIUM | **Effort**: 8-12 hours | **Agent**: Auto Zen

**Overview**: Implement task completion tracking, execution time metrics, error rate monitoring

**Current Gap**: No metrics collection. Can't measure project success against KPIs.

**Components**:

1. **Metrics Collection Service** (Laravel):
   - `app/Services/MetricsService.php` (NEW)
   - Track: task completion rate, avg execution time, error rate, success %
   - Store in `metrics` table (NEW migration)

2. **Backend Routes** (NEW):
   - GET `/api/v1/metrics/overview` - High-level metrics
   - GET `/api/v1/metrics/tasks` - Task completion metrics
   - GET `/api/v1/metrics/timeline` - Time-series data

3. **Dashboard** (Frontend - optional but nice):
   - Display key metrics: completion rate, velocity, error rate
   - Timeline chart for progress tracking
   - Team productivity analytics

**Key Metrics** (from Code Master spec):
- Task completion rate (target: >95%)
- Average task execution time
- Error rate (target: <2%)
- User adoption rate
- System reliability (uptime %)

**Files**:
- `app/Services/MetricsService.php` (NEW, ~200 LOC)
- `database/migrations/2026_01_11_000010_create_metrics_table.php` (NEW)
- `routes/api.php` (ADD metrics routes)

**Success Criteria**:
- [ ] Metrics collection running
- [ ] Historical data stored in database
- [ ] API endpoints returning correct data
- [ ] Dashboard displaying metrics (or API verified)
- [ ] Coverage: All major task states tracked

---

## Agent Assignments & Execution Schedule

### **Primary Executor: Auto Zen** (Autonomous Coder)
- Tasks: 1, 2, 4, 5, 6
- Role: Execute all development work
- Output: Code changes, commits, test results
- Review needed: After each major section

### **Secondary: Testing Agent** (QA Specialist)
- Task: 3 (re-enable tests)
- Role: Verify tests pass, coverage metrics, integration
- Output: Test reports, coverage analysis
- Collaboration: Parallel with Auto Zen tasks

### **Coordinator: Plan Agent** (Architecture Review)
- Role: Validate implementation aligns with Code Master
- Review gates: After tasks 2, 5, 6
- Output: Architecture audit, alignment report

---

## Execution Schedule

### **Week 1 (Jan 11-17)**
- Day 1-2: Tasks 1-3 (Commit + Design restoration + Tests)
- Day 3-5: Task 4 (Live preview system)
- Parallel: Task 3 ongoing (Testing)

### **Week 2 (Jan 18-24)**
- Day 1-3: Task 5 (Plan decomposition - high effort)
- Day 4-5: Task 6 (Observability setup)
- Parallel: Integration testing by Testing Agent

---

## Validation & Success Metrics

### **Git Health**
- ✅ Working directory clean
- ✅ All commits have proper messages
- ✅ No uncommitted changes

### **Code Quality**
- ✅ TypeScript compilation passes
- ✅ All tests pass (unit + integration + E2E)
- ✅ No new lint/type errors
- ✅ Test coverage >75% for new code

### **Functionality**
- ✅ Live preview <500ms latency
- ✅ Plans auto-generate tasks
- ✅ Task dependencies correct
- ✅ Metrics collecting and accessible

### **Project Progress**
- 📈 Completion: 28% → 35%+
- 📈 Section 9 (Design): 60% → 90%+
- 📈 Section 10 (Observability): 0% → 80%+
- 📈 Section 6 (Metrics): 0% → 70%+

---

## Risk Mitigation

### Risk: Design system integration incomplete after restoration
**Mitigation**: Testing Agent validates all design tests pass before moving forward

### Risk: Plan decomposition creates invalid task graphs
**Mitigation**: Extensive circular dependency detection + manual validation samples

### Risk: Live preview causes performance issues
**Mitigation**: Real-time monitoring, <500ms latency requirement enforced

---

## Code Master Alignment

All tasks trace back to these Code Master sections:
- **Section 9** (Interactive Design Phase): Tasks 2, 3, 4
- **Section 10** (Plan Lifecycle): Tasks 5
- **Section 6** (Success Metrics): Task 6
- **Git/Repo Health**: Task 1

---

## Review Checkpoints

**After Task 1**: Git clean ✓
**After Tasks 2-3**: Design system fully integrated ✓  
**After Task 4**: Live preview working at spec ✓  
**After Task 5**: Plan→Tasks automation complete ✓  
**After Task 6**: Metrics operational ✓

---

**Document Status**: ACTIVE - Execution Ready  
**Last Updated**: 2026-01-11 02:50 UTC  
**Next Review**: After Task 1 completion (expected ~2 hours)
