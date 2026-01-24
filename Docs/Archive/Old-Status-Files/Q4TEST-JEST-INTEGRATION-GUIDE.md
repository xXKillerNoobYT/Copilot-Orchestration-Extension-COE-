# Q4Test + Jest Integration Guide

> **Proper Testing Setup with AI-Powered Test Generation**
>
> This guide integrates Q4Test (AI test generator) with your Jest testing infrastructure for enhanced test generation, validation, and coverage reporting.

## Overview

Q4Test is an intelligent VS Code extension that automatically generates high-quality unit and integration tests using AI. This setup bridges Q4Test with your existing Jest infrastructure to provide:

- **AI-Powered Test Generation**: Analyze your code and generate comprehensive test suites
- **Jest Compatibility**: All generated tests use Jest syntax and run within your existing test infrastructure
- **Smart Mocking**: Automatic mock generation for VSCode APIs, external services, and databases
- **Coverage Integration**: Merge generated test coverage with hand-written test coverage
- **Test Validation**: Automated validation and repair of failing generated tests

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Q4Test Extension (VS Code)                   │
│  - AI-powered test plan generation                              │
│  - Scenario analysis and categorization                         │
│  - Interactive UI for scenario selection                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ (Generates tests with Jest syntax)
┌──────────────────────▼──────────────────────────────────────────┐
│           Q4TestJestAdapter (.ts adapter)                       │
│  - Template generation for Jest                                 │
│  - VSCode API mock generation                                   │
│  - Coverage estimation                                          │
│  - Test validation (lint, types, assertions)                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ (Produces: Q4TEST_GEN_*.test.ts)
┌──────────────────────▼──────────────────────────────────────────┐
│                Jest Test Runner                                 │
│  - jest.config.js (base configuration)                          │
│  - jest-q4test.config.js (Q4Test-specific)                      │
│  - ts-jest transformer for TypeScript                           │
│  - VSCode API mocks applied                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │ (Coverage: coverage/q4test/*)
┌──────────────────────▼──────────────────────────────────────────┐
│            Coverage Merge & Reporting                           │
│  - Combine jest + q4test coverage                               │
│  - Generate summary metrics                                     │
│  - Publish results                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Installation & Setup

### 1. Install Q4Test Extension

```bash
# Install the Q4Test extension from VS Code Marketplace
# ID: q4test.q4test
# Or via CLI:
code --install-extension q4test.q4test
```

### 2. Verify NPM Scripts

The following npm scripts have been added to `package.json`:

```json
{
  "scripts": {
    "test:q4test": "jest --config jest-q4test.config.js",
    "test:q4test:watch": "jest --config jest-q4test.config.js --watch",
    "test:q4test:coverage": "jest --config jest-q4test.config.js --coverage",
    "test:q4test:debug": "node --inspect-brk ./node_modules/jest/bin/jest.js --config jest-q4test.config.js",
    "q4test:validate": "node scripts/validate-q4test.js",
    "q4test:merge-coverage": "node scripts/merge-coverage.js"
  }
}
```

### 3. Configure Q4Test

The following files have been created:

- **`.q4testrc.json`** - Main Q4Test configuration (AI, Jest settings, coverage thresholds)
- **`jest-q4test.config.js`** - Jest config specifically for Q4Test-generated tests
- **`src/adapters/Q4TestJestAdapter.ts`** - TypeScript adapter for Q4Test ↔ Jest conversion
- **`scripts/validate-q4test.js`** - Validation script for generated tests
- **`scripts/merge-coverage.js`** - Coverage merge utility
- **`src/config/Q4TestSettings.ts`** - VS Code settings configuration

### 4. Create Workspace Settings

Create or update `.vscode/settings.json`:

```json
{
  "q4test.enabled": true,
  "q4test.autoValidateTests": true,
  "q4test.maxFixAttempts": 3,
  "q4test.testCommand": "npm run test:jest",
  "q4test.testWatchCommand": "npm run test:jest:watch",
  "q4test.testDirectory": "./src",
  "q4test.generatedTestPrefix": "Q4TEST_GEN_",
  "q4test.mockingLibrary": "jest",
  "q4test.testScenarioCategories": ["critical", "logical", "error", "edge"],
  "q4test.useTypescriptTypes": true,
  "q4test.mockExternalDependencies": true
}
```

## Usage

### Workflow 1: Generate Tests from UI

1. **Open Q4Test Panel**
   - Click the beaker icon (🧪) in the Activity Bar
   - Or run: `q4test.openPanel`

2. **Select a Service/Action**
   - Browse detected services in the sidebar
   - Click on an action to view details

3. **Generate Test Plan**
   - Click the beaker icon next to the action
   - Review AI-proposed test scenarios (Critical, Logical, Error, Edge)
   - Select which scenarios to generate

4. **Add Custom Instructions** (Optional)
   - Specify test requirements (e.g., "Mock database to return empty results")
   - Click Generate

5. **Review Generated Tests**
   - Generated file: `src/services/Q4TEST_GEN_<service>.test.ts`
   - Adjust mocks and assertions as needed
   - Commit or iterate

### Workflow 2: Command Line Generation

```bash
# Run existing Q4Test-generated tests
npm run test:q4test

# Watch mode during development
npm run test:q4test:watch

# Generate coverage report
npm run test:q4test:coverage

# Debug generated tests
npm run test:q4test:debug

# Validate all generated tests for Jest compliance
npm run q4test:validate

# Merge coverage reports (jest + q4test)
npm run q4test:merge-coverage
```

### Workflow 3: Automated Test Repair

If generated tests fail:

1. Click **Repair Tests** in Q4Test UI
2. AI analyzes errors and regenerates fixes
3. Tests are re-run (up to `maxFixAttempts` times)
4. Results displayed in Test Details panel

## Configuration Reference

### `.q4testrc.json`

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `testFramework` | string | `jest` | Test runner (jest, mocha, vitest) |
| `autoValidateTests` | boolean | `true` | Auto-run tests after generation |
| `maxFixAttempts` | number | `3` | Max AI fix attempts for failing tests |
| `testCommand` | string | `npm run test:jest` | Command to run tests |
| `testDirectory` | string | `./src` | Source directory for test generation |
| `generatedTestPrefix` | string | `Q4TEST_GEN_` | Prefix for auto-generated files |
| `mockingLibrary` | string | `jest` | Mocking library (jest, sinon) |
| `includeEdgeCases` | boolean | `true` | Generate edge case scenarios |
| `useTypescriptTypes` | boolean | `true` | Use TypeScript types in tests |

### VS Code Settings

```json
{
  "q4test.enabled": true,
  "q4test.autoValidateTests": true,
  "q4test.maxFixAttempts": 3,
  "q4test.testCommand": "npm run test:jest",
  "q4test.testWatchCommand": "npm run test:jest:watch",
  "q4test.debug": false
}
```

## Generated Test Structure

Q4Test generates tests with this structure:

```typescript
/**
 * AUTO-GENERATED TEST SUITE BY Q4TEST
 * Source File: src/services/example.ts
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// VSCode API mocks
jest.mock('vscode', () => ({...}), { virtual: true });

import * as moduleUnderTest from '../services/example';

describe('example', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ========== CRITICAL TESTS ==========
  it('🔴 [CRITICAL] should do X', async () => {
    // Test case...
  });

  // ========== LOGICAL TESTS ==========
  // ...

  // ========== ERROR TESTS ==========
  // ...

  // ========== EDGE TESTS ==========
  // ...
});
```

## Test Scenarios

Q4Test AI generates tests in four categories:

### 🔴 Critical Tests
- Core functionality verification
- Core business logic
- Main user flows
- **Weight**: 30%

### 🟡 Logical Tests
- Business logic flows
- Complex decision paths
- Integration between functions
- **Weight**: 40%

### 🟠 Error Tests
- Error handling paths
- Exceptions and edge errors
- Validation failures
- **Weight**: 20%

### 🟢 Edge Tests
- Boundary conditions
- Unusual inputs
- Resource limits
- **Weight**: 10%

## Validation & Quality

### Run Validation

```bash
npm run q4test:validate
```

This checks:
- ✅ Jest imports and syntax
- ✅ Test case structure (`describe`, `it`)
- ✅ Assertions (`expect`)
- ✅ Mock configuration (`jest.mock`)
- ✅ TypeScript type annotations
- ⚠️  Naming conventions

Example output:
```
🔍 Validating Q4Test Generated Files...

Configuration: .q4testrc.json
Test Pattern: src/**/Q4TEST_GEN_*.test.ts

Found 3 generated test file(s):

📄 src/services/Q4TEST_GEN_user.test.ts
   ✅ Valid (5 tests, 8 assertions)

📄 src/commands/Q4TEST_GEN_deploy.test.ts
   ✅ Valid (4 tests, 6 assertions)

📄 src/services/Q4TEST_GEN_api.test.ts
   ⚠️  No assertions found in 3 test case(s)

📊 Summary:
   Total Files: 3
   Total Tests: 12
   Total Assertions: 14
   Errors: 0
   Warnings: 1
```

### Coverage Merging

Merge hand-written test coverage with Q4Test-generated coverage:

```bash
npm run q4test:merge-coverage
```

Output structure:
```
coverage/
├── jest/                    # Hand-written tests
│   ├── coverage-final.json
│   └── lcov.info
├── q4test/                  # Generated tests
│   ├── coverage-final.json
│   └── lcov.info
└── combined/                # Merged coverage
    ├── coverage-final.json
    └── lcov.info
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run hand-written tests
  run: npm run test:jest

- name: Run Q4Test-generated tests
  run: npm run test:q4test

- name: Validate Q4Test compliance
  run: npm run q4test:validate

- name: Merge coverage reports
  run: npm run q4test:merge-coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/combined/lcov.info
```

## Troubleshooting

### Issue: "Q4Test extension not found"

**Solution**: Install from VS Code Marketplace
```bash
code --install-extension q4test.q4test
```

### Issue: "Jest configuration not found"

**Solution**: Ensure `jest-q4test.config.js` exists:
```bash
# Check file exists
ls vscode-extension/jest-q4test.config.js

# Run with explicit config
npm run test:q4test
```

### Issue: "VSCode mocks not working"

**Solution**: Verify `.q4testrc.json` has:
```json
{
  "mockingLibrary": "jest",
  "vscode": { "enabled": true }
}
```

### Issue: "Generated tests fail immediately"

**Solutions**:
1. Enable auto-validation: `q4test.autoValidateTests: true`
2. Increase fix attempts: `q4test.maxFixAttempts: 5`
3. Check mock setup in generated test file
4. Review imports for correct relative paths

### Issue: Coverage merge not working

**Solution**: Ensure both reports exist:
```bash
# Generate both coverage reports
npm run test:jest:coverage      # Hand-written
npm run test:q4test:coverage    # Generated

# Then merge
npm run q4test:merge-coverage
```

## Best Practices

### 1. Review Generated Tests
- Always review generated tests before committing
- Adjust mocks for your specific use case
- Add assertions that test-generator may have missed

### 2. Version Control
- Commit both `.q4testrc.json` and generated test files
- Tag auto-generated tests with `Q4TEST_GEN_` prefix
- Keep generated tests in version control for history

### 3. Custom Instructions
When generating tests, provide specific instructions:
```
- Mock all database calls to return empty results
- Test error handling with invalid permissions
- Include timeout scenarios
- Verify exact error messages match spec
```

### 4. Continuous Improvement
- Review Q4Test-generated test coverage metrics
- Identify patterns in test failures
- Update custom instructions based on feedback
- Gradually increase coverage thresholds

### 5. Integration with Hand-Written Tests
Hand-written tests usually cover:
- Integration between services
- End-to-end user workflows
- Critical business logic

Q4Test excels at:
- Unit test generation
- Edge case discovery
- Error path exploration
- Quick coverage expansion

Use both for comprehensive testing!

## Commands Reference

| Command | Shortcut | Description |
|---------|----------|-------------|
| `q4test.generateTests` | `Ctrl+Shift+T G` | Generate AI tests for file |
| `q4test.runTests` | `Ctrl+Shift+T R` | Run generated tests |
| `q4test.runTestsWatch` | `Ctrl+Shift+T W` | Run tests in watch mode |
| `q4test.repairTests` | — | Auto-fix failing tests |
| `q4test.analyzeCoverage` | — | Analyze test coverage |
| `q4test.validateTests` | — | Validate Jest compliance |
| `q4test.mergeCoverage` | — | Merge coverage reports |
| `q4test.openSettings` | — | Open Q4Test settings |

## Learning Resources

- [Q4Test Official Docs](https://docs.q4us.com/qunit)
- [Jest Documentation](https://jestjs.io/)
- [ts-jest Guide](https://kulshekhar.github.io/ts-jest/)
- [TypeScript Testing Patterns](https://www.typescriptlang.org/docs/handbook/testing.html)

## Support

- **Q4Test Issues**: https://github.com/yourusername/q4test/issues
- **Contact**: support@q4us.com
- **Local Issues**: Check `.q4testrc.json` and `jest-q4test.config.js`

## Next Steps

1. ✅ Install Q4Test extension
2. ✅ Review `.q4testrc.json` configuration
3. ✅ Open Q4Test panel in VS Code
4. ✅ Select a service to generate tests for
5. ✅ Review and customize generated tests
6. ✅ Run validation: `npm run q4test:validate`
7. ✅ Merge coverage: `npm run q4test:merge-coverage`
8. ✅ Commit generated tests to version control

---

**Last Updated**: January 23, 2026  
**Maintainer**: Copilot Orchestration Extension Team  
**Framework**: Jest 30.2.0, Q4Test 1.0.5, TypeScript 5.4.0
