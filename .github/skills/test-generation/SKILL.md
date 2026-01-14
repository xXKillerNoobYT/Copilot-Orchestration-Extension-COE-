---
name: test-generation
description: Generate comprehensive unit, integration, and E2E tests for code, measure coverage, enforce quality gates, and verify task completion through testing
---

# Test Generation Skill

Create comprehensive test suites that validate code correctness, measure coverage, and enforce quality standards.

## When to Use This Skill

- Code needs test coverage
- Feature implementation requires validation
- Quality gates not met
- Test failures need investigation
- Coverage gaps identified

## What This Skill Does

1. **Analyze Code**: Identify all code paths and edge cases
2. **Generate Unit Tests**: Test individual functions/methods
3. **Generate Integration Tests**: Test component interactions
4. **Generate E2E Tests**: Test complete user workflows
5. **Run Tests**: Execute test suite
6. **Measure Coverage**: Report code coverage metrics
7. **Enforce Gates**: Block completion if quality criteria unmet

## Step-by-Step Procedure

### Phase 1: Code Analysis
```
1. Read code to be tested
2. Identify:
   - Public functions/methods
   - Code branches (if/else, switch)
   - Edge cases (null, empty, invalid input)
   - Error conditions
   - Async operations
3. Map code paths
```

### Phase 2: Unit Test Generation
```
For each function:
1. **Happy path**: Normal input → expected output
2. **Error cases**: Invalid input → error handling
3. **Edge cases**: Boundary conditions
4. **Null/undefined**: Defensive checks
5. **Async**: Promise resolution/rejection

Framework: Jest/PHPUnit/pytest (match project)
Coverage Target: 85%+
```

### Phase 3: Integration Test Generation
```
For each workflow:
1. **Normal flow**: All steps succeed
2. **Error recovery**: Failures handled gracefully
3. **Boundary cases**: Limits and constraints
4. **State transitions**: Multi-step workflows

Framework: Same as unit (with test database/mocks)
Coverage Target: 70%+
```

### Phase 4: E2E Test Generation
```
For each user journey:
1. **Critical paths**: Key user workflows
2. **Authentication flows**: Login, logout, permissions
3. **Data creation**: CRUD operations
4. **Error scenarios**: User-facing error messages

Framework: Selenium/Cypress/Playwright
Coverage Target: 50%+ (critical paths)
```

### Phase 5: Test Execution
```
1. Run unit tests first (fastest)
2. Run integration tests (slower)
3. Run E2E tests last (slowest)
4. Collect results:
   - Pass/fail counts
   - Execution time
   - Coverage %
   - Failures with stack traces
```

### Phase 6: Coverage Analysis
```
1. Measure code coverage
2. Identify untested paths
3. Generate coverage report
4. Create issues for gaps >15%
```

### Phase 7: Quality Gates
```
Enforcement:
- All tests must pass
- Coverage ≥80% overall
- Coverage ≥85% for new code
- No new warnings/errors
- No performance regression

If gates fail → Block task completion
```

## Expected Input

**Code to Test**:
```typescript
export function calculateDiscount(price: number, percent: number): number {
  if (price < 0) throw new Error('Price cannot be negative');
  if (percent < 0 || percent > 100) throw new Error('Invalid percent');
  return price * (1 - percent / 100);
}
```

## Expected Output

**Generated Tests**:
```typescript
import { calculateDiscount } from './discount';

describe('calculateDiscount', () => {
  describe('happy path', () => {
    it('calculates 10% discount correctly', () => {
      expect(calculateDiscount(100, 10)).toBe(90);
    });

    it('calculates 50% discount correctly', () => {
      expect(calculateDiscount(200, 50)).toBe(100);
    });

    it('handles 0% discount', () => {
      expect(calculateDiscount(100, 0)).toBe(100);
    });
  });

  describe('error cases', () => {
    it('throws on negative price', () => {
      expect(() => calculateDiscount(-100, 10)).toThrow('Price cannot be negative');
    });

    it('throws on negative percent', () => {
      expect(() => calculateDiscount(100, -10)).toThrow('Invalid percent');
    });

    it('throws on percent >100', () => {
      expect(() => calculateDiscount(100, 150)).toThrow('Invalid percent');
    });
  });

  describe('edge cases', () => {
    it('handles 100% discount (free)', () => {
      expect(calculateDiscount(100, 100)).toBe(0);
    });

    it('handles zero price', () => {
      expect(calculateDiscount(0, 50)).toBe(0);
    });

    it('handles fractional discounts', () => {
      expect(calculateDiscount(100, 12.5)).toBe(87.5);
    });
  });
});
```

**Coverage Report**:
```
Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Coverage:    100% statements (12/12)
             100% branches (8/8)
             100% functions (1/1)
             100% lines (10/10)
```

## Test Strategy Template

```markdown
## Test Strategy

### Unit Tests
**Files**: tests/unit/feature.test.ts
- [ ] Function X with valid input
- [ ] Function X with invalid input
- [ ] Function Y error handling
- [ ] Function Z edge cases
**Target**: 85%+ coverage

### Integration Tests
**Files**: tests/integration/workflow.test.ts
- [ ] Full workflow happy path
- [ ] Error recovery workflow
- [ ] Multi-step state transitions
**Target**: 70%+ coverage

### E2E Tests
**Files**: tests/e2e/user-journey.spec.ts
- [ ] User can complete critical path
- [ ] User sees error messages
- [ ] User can recover from errors
**Target**: 50%+ critical paths

### Quality Gates
- [ ] All tests pass
- [ ] Coverage ≥80%
- [ ] No new lint errors
- [ ] No performance regression
```

## Test Frameworks by Language

| Language | Unit | Integration | E2E |
|----------|------|-------------|-----|
| TypeScript/JavaScript | Jest | Jest + Supertest | Playwright/Cypress |
| PHP | PHPUnit | PHPUnit + Database | Selenium/Dusk |
| Python | pytest | pytest + fixtures | Selenium/Playwright |
| Go | testing | testing + testify | Selenium |

## Quality Gate Enforcement

**Before marking task complete**:
```
IF tests fail → Fix code or tests
IF coverage <80% → Add more tests
IF lint errors → Fix linting
IF performance regression → Optimize or document

DO NOT proceed until all gates pass
```

## Integration with Other Skills

- **Execution**: Called by [task-execution](./task-execution/SKILL.md)
- **Planning**: Defined in [task-planning](./task-planning/SKILL.md)
- **Review**: Validated in [code-review](./code-review/SKILL.md)

## Configuration

**Coverage Thresholds**:
```json
{
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    }
  }
}
```

**Test Commands**:
```bash
# Unit tests
npm test
php artisan test
pytest

# Coverage
npm test -- --coverage
php artisan test --coverage
pytest --cov=src

# Integration
npm run test:integration
php artisan test --testsuite=Feature

# E2E
npm run test:e2e
php artisan dusk
```

## References

- Project testing standards in README.md
- `.github/copilot-instructions.md` - Testing Agent instructions
- Test framework documentation (Jest, PHPUnit, Playwright)
