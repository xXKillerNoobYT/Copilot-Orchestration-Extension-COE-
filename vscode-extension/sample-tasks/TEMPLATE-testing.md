---
id: TEST-XXX
title: [Testing objective]
type: testing
priority: high
status: pending
dependencies: []
assignees: [tester]
labels: [testing, quality]
estimate: "4h"
format_version: "1.0"
subtasks:
  - [Write unit tests]
  - [Write integration tests]
  - [Write E2E tests (if applicable)]
  - [Verify coverage thresholds]
---

## Scope

[What functionality, module, or feature is being tested]

## Test Types

- [ ] **Unit Tests** - Individual function/method testing
- [ ] **Integration Tests** - Component interaction testing
- [ ] **E2E Tests** - Full user workflow testing
- [ ] **Performance Tests** - Load, stress, benchmark testing
- [ ] **Security Tests** - Vulnerability scanning, penetration testing

## Coverage Goals

- **Target Coverage:** [e.g., 80% line coverage, 90% branch coverage]
- **Critical Paths:** [List must-cover scenarios]
  - [Critical path 1]
  - [Critical path 2]
- **Edge Cases:** [Boundary conditions, error scenarios]
  - [Edge case 1]
  - [Edge case 2]

## Test Data Requirements

[Fixtures, mocks, external data, or test databases needed]

- **Fixtures:** [e.g., sample user data, test database seeds]
- **Mocks:** [e.g., external API responses, third-party services]
- **Test Environment:** [e.g., isolated DB, staging environment]

## Test Cases

### Test Case 1: [Scenario name]

**Given:** [Initial state]  
**When:** [Action performed]  
**Then:** [Expected outcome]

### Test Case 2: [Scenario name]

**Given:** [Initial state]  
**When:** [Action performed]  
**Then:** [Expected outcome]

### Test Case 3: [Error scenario]

**Given:** [Initial state]  
**When:** [Invalid action or error condition]  
**Then:** [Error handling expectation]

## Success Criteria

- [ ] All tests passing
- [ ] Coverage threshold met ([X]%)
- [ ] Edge cases covered
- [ ] No flaky tests (100% reliability)
- [ ] Performance benchmarks met (if applicable)
- [ ] Test documentation complete

## Tools & Frameworks

[Testing frameworks, assertion libraries, coverage tools]

- **Framework:** [e.g., Jest, PHPUnit, Cypress]
- **Coverage:** [e.g., Istanbul, PHPUnit coverage]
- **CI Integration:** [e.g., GitHub Actions, Laravel Dusk]

## AI Prompt (for agents)

- **Goal:** [One-liner objective for the AI]
- **Context:** [System/domain context and risk areas to focus]
- **Acceptance Criteria (bullet list):**
  - [Criterion 1]
  - [Criterion 2]
- **Expected Outputs:** [e.g., failing test first, coverage report, CI link]
- **Constraints/Guardrails:** [non-flaky requirement, runtime budget, environment limits]

---

**Template Notes:**

- Use `TEST-` prefix for testing task IDs
- Link to related feature/bug tasks in `dependencies` (e.g., `[TASK-042]`)
- Set `priority`:
  - `critical`: Pre-production validation, security testing
  - `high`: New feature coverage, regression prevention
  - `medium`: Improved coverage, refactoring validation
  - `low`: Optional performance tests, edge case expansion
- Include `tester` agent in `assignees`
- Add test type labels: `unit-tests`, `integration-tests`, `e2e-tests`
- Specify coverage tools and CI integration requirements
- Define clear success metrics (not just "tests pass")
- **Best Practice:** Write tests before implementation (TDD) when possible
- Link to test reports or CI dashboard for validation
