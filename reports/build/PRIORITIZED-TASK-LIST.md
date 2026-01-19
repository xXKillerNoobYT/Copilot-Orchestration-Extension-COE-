# 📋 Prioritized Task List - Next Development Cycle

**Generated**: January 18, 2026  
**Cycle**: Sprint Focus on Test Fixes + Issue #2  
**Total Estimated Time**: 10-14 hours  
**Target Completion**: January 19-20, 2026

---

## 🔴 PRIORITY 1: CRITICAL BLOCKERS (Must Complete Before Issue #2)

### Task 1.1: Fix Optimistic Locking Retry Logic
**Status**: 🔴 BLOCKING  
**Impact**: Blocks Issue #2 + Issue #3 + F012 feature  
**Estimated Time**: 1.5-2 hours  
**Severity**: CRITICAL

**Problem**:
- File: `vscode-extension/src/services/mcpClient.optimisticLocking.test.ts`
- 5 test failures across lines 123, 180, 185, 258, 288
- Retry mechanism not functioning (result.version undefined)
- 409 conflict handling broken
- Non-conflict errors not throwing immediately

**Root Cause Analysis**:
- Optimistic locking retry implementation incomplete in `mcpClient.ts`
- Mock responses for 409 conflicts not configured correctly
- Exponential backoff timing not implemented
- Error propagation chain broken

**Implementation Steps**:
1. Open `vscode-extension/src/services/mcpClient.ts`
2. Review `reportTaskStatus()` method for 409 conflict handling
3. Implement 3-retry loop with exponential backoff:
   ```typescript
   private async reportTaskStatusWithRetry(
     taskId: string,
     status: string,
     expectedVersion?: number
   ): Promise<any> {
     let attempts = 0;
     const maxAttempts = 3;
     
     while (attempts < maxAttempts) {
       try {
         return await this.reportTaskStatusDirect(...);
       } catch (error) {
         if (error.status === 409 && attempts < maxAttempts - 1) {
           // 409 Conflict: version mismatch, retry
           const delay = Math.pow(2, attempts) * 100; // exponential backoff
           await sleep(delay);
           attempts++;
         } else {
           throw error; // Non-409 or last attempt
         }
       }
     }
   }
   ```
4. Update mock responses in test file to return correct version
5. Run tests: `npm run test:jest -- mcpClient.optimisticLocking`
6. Verify all 5 tests pass

**Exit Criteria**:
- ✅ All 5 tests in mcpClient.optimisticLocking.test.ts pass
- ✅ Version number increments correctly after retry
- ✅ Non-409 errors throw immediately
- ✅ Backward compatibility preserved (without expectedVersion)

**Files to Modify**:
- `vscode-extension/src/services/mcpClient.ts` (retry logic)
- `vscode-extension/src/services/mcpClient.optimisticLocking.test.ts` (mock responses)

---

### Task 1.2: Fix Plan Adjustment Service Version Bumping
**Status**: 🔴 BLOCKING  
**Impact**: Blocks Issue #2 (Plan Adjustment Wizard)  
**Estimated Time**: 1-1.5 hours  
**Severity**: CRITICAL

**Problem**:
- File: `vscode-extension/src/services/planAdjustmentService.test.ts`
- 2 test failures at lines 163 and 248
- Expected: `result.success = true` after adjustment application
- Actual: `result.success = false` or undefined
- Version bump not applied to plan

**Root Cause Analysis**:
- `applyAdjustment()` method not returning success status
- File write not completing properly
- Version number not incremented
- Adjustment object structure mismatch

**Implementation Steps**:
1. Open `vscode-extension/src/services/planAdjustmentService.ts`
2. Review `applyAdjustment()` method signature and logic
3. Verify:
   - Load plan from file correctly
   - Apply adjustment to plan object
   - Increment version number: `plan.metadata.version++`
   - Write updated plan back to file
   - Return `{ success: true, plan, version }`
4. Add logging at each step for debugging
5. Run tests: `npm run test:jest -- planAdjustmentService`
6. Verify both tests pass (lines 163 and 248)

**Exit Criteria**:
- ✅ Both tests in planAdjustmentService.test.ts pass
- ✅ Version number increments on adjustment
- ✅ File write completes successfully
- ✅ Return value includes success status

**Files to Modify**:
- `vscode-extension/src/services/planAdjustmentService.ts` (core logic)
- Possibly: `vscode-extension/src/services/planPersistence.ts` (file I/O)

---

### ✅ COMPLETION GATE FOR PRIORITY 1
**Test Command**: 
```bash
npm run test:jest -- --testPathPattern="(mcpClient.optimisticLocking|planAdjustmentService)"
```
**Expected Output**: ✅ 7/7 tests passing  
**Blocking Issue #2**: Until this passes

---

## 🟠 PRIORITY 2: HIGH-IMPACT FIXES (Complete Same Day as Priority 1)

### Task 2.1: Fix Path Normalization for Windows
**Status**: 🟠 HIGH PRIORITY  
**Impact**: Cross-platform compatibility, file path validation  
**Estimated Time**: 0.75-1 hour  
**Severity**: MEDIUM

**Problem**:
- File: `vscode-extension/src/utils/pathValidation.test.ts`
- 2 test failures related to Windows drive letters
- Expected: Proper path validation without prepending drive letters
- Actual: Incorrectly prepending `C:\` to relative paths

**Implementation Steps**:
1. Open `vscode-extension/src/utils/pathValidation.ts`
2. Review `normalizeFilePath()` function
3. Fix logic to:
   - Detect Windows vs. Unix-style paths
   - Preserve relative paths without modification
   - Only prepend drive letter if workspace root is on Windows AND path is relative
4. Add platform detection: `process.platform === 'win32'`
5. Test both Windows and Unix path formats
6. Run tests: `npm run test:jest -- pathValidation`

**Exit Criteria**:
- ✅ All path normalization tests pass
- ✅ Works on both Windows and Unix
- ✅ Relative paths preserved correctly
- ✅ No drive letter prepending to relative paths

**Files to Modify**:
- `vscode-extension/src/utils/pathValidation.ts`

---

### Task 2.2: Fix Context Bundle Event Wiring
**Status**: 🟠 HIGH PRIORITY  
**Impact**: UI not updated when context bundle changes  
**Estimated Time**: 0.75-1 hour  
**Severity**: MEDIUM

**Problem**:
- File: `vscode-extension/src/taskInteractionAPI.contextBundle.test.ts`
- 3 test failures at lines 351, 416, 450
- Expected: `contextBundleModified` event fired on changes
- Actual: Event not triggered, UI not updated

**Implementation Steps**:
1. Open `vscode-extension/src/taskInteractionAPI.ts`
2. Find `addFilesToContextBundle()` method
3. Verify event emission at end of method:
   ```typescript
   // After successful file additions
   this.emit('contextBundleModified', {
     bundlePath: bundle.path,
     type: 'contextBundleModified',
     timestamp: Date.now(),
     changedFiles: filesAdded
   });
   ```
4. Verify class extends EventEmitter
5. Check for duplicate file prevention logic
6. Run tests: `npm run test:jest -- contextBundle`

**Exit Criteria**:
- ✅ Event emission tests pass
- ✅ Duplicate prevention working
- ✅ File write triggered correctly
- ✅ All 3 context bundle tests passing

**Files to Modify**:
- `vscode-extension/src/taskInteractionAPI.ts` (event wiring)

---

### ✅ COMPLETION GATE FOR PRIORITY 2
**Test Command**:
```bash
npm run test:jest -- --testPathPattern="(pathValidation|contextBundle)"
```
**Expected Output**: ✅ 5/5 tests passing  
**Impacts**: Phase 4 UI quality

---

## 🟡 PRIORITY 3: TEST VERIFICATION & DOCUMENTATION (1-2 hours)

### Task 3.1: Verify Full Test Suite
**Status**: 🟡 MEDIUM PRIORITY  
**Estimated Time**: 0.5 hours  
**Success Criteria**: All Priority 1 & 2 fixes integrated

**Steps**:
```bash
cd vscode-extension
npm run test:jest -- --coverage --maxWorkers=1
```

**Expected Results**:
- ✅ 71 test files discovered
- ✅ Sanity check: 1 skipped + 1 intentional failure visible
- ✅ All other tests passing
- ✅ Coverage report generated

---

### Task 3.2: Update Documentation
**Status**: 🟡 MEDIUM PRIORITY  
**Estimated Time**: 0.5 hours  
**Files to Update**:

1. **CHANGELOG.md** - Document fixes
   ```markdown
   ## [Unreleased]
   
   ### Fixed
   - Fixed optimistic locking retry mechanism (Issue #45)
   - Fixed plan adjustment service version bumping (Issue #46)
   - Fixed path normalization for Windows (Issue #47)
   - Fixed context bundle event wiring (Issue #48)
   ```

2. **CONTINUOUS-DEVELOPMENT-CYCLE-REPORT.md** - Mark as completed

3. **PROJECT-RUNBOOK.md** - Update issue status

---

## 📊 Task Dependency Graph

```
Priority 1.1 (Optimistic Locking)
    ↓
Priority 1.2 (Plan Adjustment Service)
    ↓
Both Required ✅
    ↓
Priority 2.1 (Path Normalization)
Priority 2.2 (Context Bundle Events)
    ↓ (Parallel)
Priority 3.1 (Full Test Verification)
    ↓
Priority 3.2 (Documentation Update)
    ↓
✅ Ready for Issue #2
```

---

## 📈 Execution Timeline

| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| 1.1 - Optimistic Locking | 1.5-2h | — | 🔴 NEXT |
| 1.2 - Plan Adjustment | 1-1.5h | — | 🔴 NEXT |
| 2.1 - Path Normalization | 0.75-1h | — | 🟠 QUEUED |
| 2.2 - Bundle Events | 0.75-1h | — | 🟠 QUEUED |
| 3.1 - Test Verification | 0.5h | — | 🟡 QUEUED |
| 3.2 - Documentation | 0.5h | — | 🟡 QUEUED |
| **TOTAL** | **4.5-6.5h** | — | — |

**Recommended Execution**: Single session, 4-6 hours with breaks

---

## 🎯 Success Criteria for Next Cycle

### Before Moving to Issue #2:
- ✅ All Priority 1 tests passing (7/7)
- ✅ All Priority 2 tests passing (5/5)
- ✅ No new TypeScript errors
- ✅ Coverage reports generated
- ✅ Documentation updated
- ✅ Sanity check still visible (1 skip + 1 failure)

### After All Fixes:
- ✅ 71 test files passing (minus 4 network-dependent skips)
- ✅ Zero blocking issues for Issue #2
- ✅ Ready to implement live preview system
- ✅ Ready to implement plan decomposition

---

## 📞 Related Issues

**GitHub Issues**:
- ISSUE #1 (COMPLETED): Fix critical blockers
- ISSUE #2 (BLOCKED BY THESE FIXES): Live preview system
- ISSUE #3 (BLOCKED BY THESE FIXES): Plan decomposition

**Sprint Timeline**:
- Today (Jan 18): Run self-test and this task list
- Tomorrow (Jan 19): Execute Priority 1 & 2 fixes (4-6 hours)
- Jan 20: Verify + start Issue #2 (5-8 hours)
- Jan 21: Continue Issue #2 + start Issue #3 (parallel)
- Jan 22-24: Complete both issues

**Launch Path**: Fixes → Issue #2 → Issue #3 → Phase 5 (AI Integration)

---

**Report Generated By**: Continuous-Development System  
**Status**: ✅ Ready for execution  
**Next Review**: After Priority 1 fixes applied
