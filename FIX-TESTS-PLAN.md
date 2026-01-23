# Test Coverage Fix Plan - VS Code Extension

## Current Status
- **Current Coverage**: 31.18% statements, 25.75% branches, 30.15% functions
- **Target Coverage**: 60%+  
- **Failing Tests**: 33 tests (down from 39)
- **Files with 0% Coverage**: 74 files

## Progress

### ✅ Fixed (6 tests fixed)
1. agentProfileValidator.test.ts - Fixed version type (string → number)
2. agentProfileWatcher.test.ts - Added proper mocks and async handling

### 🔧 Remaining Failures (33 tests)

#### High Priority Fixes
1. **jest-sanity-check.test.ts** (1 test) - INTENTIONAL FAILURE (keep as-is)
2. **extension.test.ts** (~10 tests) - Extension activation and registration
3. **autoAgentLoop.test.ts** (~4 tests) - Loop status and execution
4. **taskParser.test.ts** (~10 tests) - Parser validation and options
5. **executeLLM.test.ts** (~8 tests) - LLM execution and streaming

#### Root Causes
- Mock expectations not matching actual implementation
- Async/await issues in test setup
- Missing VS Code API mocks
- Type mismatches in test data

## Strategy to Reach 60% Coverage

### Phase 1: Fix Failing Tests (Priority 1)
- Fix extension.test.ts activation/registration tests
- Fix autoAgentLoop.test.ts status display tests
- Fix taskParser.test.ts validation tests
- Fix executeLLM.test.ts streaming tests

### Phase 2: Add Critical Panel Tests (Priority 2)
Target files with user-facing impact:
- panels/DeadLetterQueuePanel.ts → 50% coverage
- panels/auditDashboardPanel.ts → 50% coverage
- panels/planAdjustmentWizard.ts → 40% coverage
- panels/planBuilderPanel.ts → 50% coverage
- panels/visualVerificationPanel.ts → 40% coverage

### Phase 3: Add Service Tests (Priority 3)
Core functionality services:
- services/agentLoopService.ts → 50% coverage
- services/connectionMonitor.ts → 50% coverage
- services/mcpRouter.ts → 50% coverage
- services/taskGenerator.ts → 50% coverage

### Phase 4: Add Validator Tests (Priority 4)
- planBuilder/planValidator.ts → 60% coverage
- planBuilder/validators.ts → 60% coverage

## Estimated Coverage Impact

| Phase | Estimated Coverage Gain | New Coverage Total |
|-------|------------------------|-------------------|
| Current | - | 31.18% |
| Phase 1 (Fix Failing) | +5% | 36% |
| Phase 2 (Panels) | +12% | 48% |
| Phase 3 (Services) | +10% | 58% |
| Phase 4 (Validators) | +5% | 63% |

## Test Files to Create

### Panel Tests (if missing)
```
src/panels/__tests__/DeadLetterQueuePanel.test.ts
src/panels/__tests__/planAdjustmentWizard.test.ts  
src/panels/__tests__/visualVerificationPanel.test.ts
```

### Service Tests
```
src/services/__tests__/agentLoopService.test.ts
src/services/__tests__/connectionMonitor.test.ts
src/services/__tests__/mcpRouter.test.ts
src/services/__tests__/taskGenerator.test.ts
```

### Validator Tests
```
src/planBuilder/__tests__/validators.enhanced.test.ts
```

## CI Integration
- Tests must pass in CI before merge
- Coverage threshold enforced at 60%
- Failing tests block PR approval

## Next Steps
1. Fix extension.test.ts (highest impact)
2. Fix taskParser.test.ts (core functionality)
3. Fix executeLLM.test.ts (LLM integration)
4. Fix autoAgentLoop.test.ts (agent loop)
5. Add panel tests for 0% coverage files
6. Add service tests
7. Verify CI pipeline runs tests
8. Confirm 60%+ coverage achieved
