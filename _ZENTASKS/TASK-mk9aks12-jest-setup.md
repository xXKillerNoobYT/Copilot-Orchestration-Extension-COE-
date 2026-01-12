# Setup Jest Testing Framework

## Task Information

**ID:** TASK-mk9aks12-jest-setup

**Status:** pending

**Priority:** high

**Dependencies:** []

**Created:** 2026-01-11

**Updated:** 2026-01-11

## Description

Configure Jest testing framework for VS Code extension to complement existing Mocha and Vitest setups. Provide unified testing experience with better TypeScript support and modern async testing capabilities.

## Implementation Details

**Current State:**
- ✅ Mocha tests exist for extension core (taskGraph, llmClient, github sync, etc.)
- ✅ Vitest tests exist for wizard/planBuilder components
- ❌ Jest not configured - would provide better VS Code extension testing with @vscode/test-electron

**What to Add:**
1. Install Jest dependencies: `jest`, `ts-jest`, `@types/jest`, `@vscode/test-electron`
2. Create `jest.config.js` with TypeScript preset
3. Add Jest scripts to `package.json`:
   - `test:jest`: Run Jest tests
   - `test:jest:watch`: Watch mode
   - `test:jest:coverage`: Coverage report
4. Create sample Jest test in `src/__tests__/` to verify setup
5. Configure VS Code Test Explorer integration
6. Update `.vscode/settings.json` for Jest IntelliSense

**Files to Create/Modify:**
- `vscode-extension/jest.config.js` (new)
- `vscode-extension/package.json` (modify scripts, add devDependencies)
- `vscode-extension/src/__tests__/sample.test.ts` (new - verification)
- `.vscode/settings.json` (modify - test explorer config)

**Rationale:**
- Jest has better async/await support than Mocha
- Better TypeScript integration via ts-jest
- Snapshot testing capabilities
- Parallel test execution
- Better mocking utilities

## Test Strategy

Verification steps:
1. Run `npm test:jest` - should execute without errors
2. Run `npm test:jest:watch` - should enter watch mode
3. Run `npm test:jest:coverage` - should generate coverage report
4. Verify VS Code Test Explorer shows Jest tests
5. Verify existing Mocha/Vitest tests still work
6. Check IntelliSense for Jest matchers (expect, describe, it)

## Notes

- Jest will complement (not replace) existing Mocha/Vitest setups
- Use Jest for new extension core tests
- Keep Vitest for wizard components (better Vue support)
- Keep Mocha for legacy tests (no need to migrate immediately)
