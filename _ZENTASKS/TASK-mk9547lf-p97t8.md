# Re-enable and Fix Design System Test Files

## Task Information

**ID:** TASK-mk9547lf-p97t8

**Status:** blocked

**Priority:** high

**Dependencies:** None

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Move tokenGenerator.test.ts and validator.test.ts from .disabled state back to executable .ts files. Fix any test failures that arise and ensure full design system test coverage is restored. Tests should validate token generation (JSON, Tailwind, CSS formats) and token validation (colors, palette, typography, spacing).

## Implementation Details

BLOCKED: Cannot re-enable test files because the source modules (tokenGenerator.ts, validator.ts) were deleted during pr-6-revert merge.

Blocker: Depends on EPIC-009 (Visual Design System Editor) completion to restore source files first.

Test files currently disabled:
- vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts.disabled (355 lines)
- vscode-extension/src/planBuilder/designSystem/validator.test.ts.disabled (424 lines)

Once EPIC-009 restores the source modules, this task will:
1. Rename .disabled files back to .ts
2. Run tests and fix any failures
3. Verify coverage for token generation (JSON, Tailwind, CSS)
4. Verify coverage for validation (colors, palette, typography, spacing)
5. Ensure all 30+ test cases pass

## Test Strategy

Run npm test and verify all design system tests pass. Check test output for coverage report (should be 95%+). Verify no console errors or warnings. Run tests in CI/CD pipeline.
