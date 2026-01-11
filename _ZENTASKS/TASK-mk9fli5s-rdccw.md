# Fix critical blockers: Git state, design system, and tests

## Task Information

**ID:** TASK-mk9fli5s-rdccw

**Status:** pending

**Priority:** high

**Dependencies:** None

**Created:** 1/11/2026

**Updated:** 1/11/2026

## Description

ISSUE #1: CRITICAL - Resolve three blocking issues preventing project execution: (1) Git repository in inconsistent state with uncommitted changes in vscode-extension/, (2) Design system integration incomplete with TEMPORARY markers in planIntegration.ts, (3) Test suite partially disabled with design system tests as .disabled files

## Implementation Details



## Problem Summary
Three critical blockers are preventing the project from running properly:
1. Uncommitted changes in vscode-extension/ (test files disabled, planIntegration.ts modified)
2. Design system imports commented out with TEMPORARY markers (lines 11-17, 180-195)
3. Design system tests disabled (.disabled extension) with no replacement tests

## Implementation Steps
1. Commit all pending changes in vscode-extension/
2. Restore design system imports in planIntegration.ts (remove TEMPORARY markers)
3. Re-enable design system tests (rename .disabled files back to .ts)
4. Run design system test suite (74+ tests should pass)
5. Verify TypeScript compilation (0 errors)
6. Update task statuses in _ZENTASKS/
7. Update CODE-MASTER-ALIGNMENT.md with completion status

## Files to Check/Modify
- vscode-extension/src/planBuilder/planIntegration.ts (restore imports, remove TEMPORARY)
- vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts.disabled (re-enable)
- vscode-extension/src/planBuilder/designSystem/validator.test.ts.disabled (re-enable)
- _ZENTASKS/tasks.json (update related task statuses)
- Docs/Plan/CODE-MASTER-ALIGNMENT.md (update status from HIGH to RESOLVED)

## Test Strategy
- Run: npm test -- designSystem (expect 74+ tests passing)
- Run: npm run compile (expect 0 TypeScript errors)
- Verify: git status shows clean working directory
- Commit: 4+ atomic commits with semantic prefixes (fix:, test:, chore:)

## Success Criteria
✅ Git working directory clean
✅ Design system imports restored
✅ No TEMPORARY markers in codebase
✅ Design tests re-enabled and passing (74/74)
✅ TypeScript compilation successful (0 errors)
✅ CODE-MASTER-ALIGNMENT.md updated
✅ Ready to proceed to ISSUE #2


## Test Strategy

1. Verify git status (git status → 'nothing to commit')\n2. Run design tests (npm test -- designSystem → 100% pass rate)\n3. Verify TypeScript (npm run compile → 0 errors)\n4. Check CODE-MASTER-ALIGNMENT.md (status shows RESOLVED)\n5. Verify no TEMPORARY markers (grep -r 'TEMPORARY' src/)\n6. Check git log (4+ atomic commits with clear messages)
