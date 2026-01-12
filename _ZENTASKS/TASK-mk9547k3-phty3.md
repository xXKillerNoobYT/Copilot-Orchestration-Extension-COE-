# Restore and Test Design System Integration in planIntegration.ts

## Task Information

**ID:** TASK-mk9547k3-phty3

**Status:** done

**Priority:** high

**Dependencies:** None

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Uncomment and restore design system imports and logic in planIntegration.ts that were stubbed during merge. Verify design handoff payload extraction, validation, and token conversion functions work correctly with wizard completion flow.

## Implementation Details

BLOCKED: Design system files (designHandoff.ts, tokenGenerator.ts, validator.ts) were deleted during pr-6-revert merge. These files must be recreated before this task can proceed.

Blocker: Depends on EPIC-009 (Visual Design System Editor) completion to restore:
- vscode-extension/src/planBuilder/designHandoff.ts
- vscode-extension/src/planBuilder/designSystem/tokenGenerator.ts  
- vscode-extension/src/planBuilder/designSystem/validator.ts

Once files are restored, this task will:
1. Uncomment imports in planIntegration.ts (lines 15, 19)
2. Remove stub type definition (line 22)
3. Uncomment design data extraction logic (lines 180-194)
4. Test wizard completion → design handoff flow
5. Verify design payload validation works correctly

## Test Strategy

Test design handoff in planIntegration: Complete wizard flow and verify processPlanCompletion() properly extracts and validates design data. Check console logs for successful design payload extraction. Run: npm test -- planBuilder for integration tests.
