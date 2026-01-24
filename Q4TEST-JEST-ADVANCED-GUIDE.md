# Q4Test + Jest Integration - Extension Guide

> Advanced setup and customization for Q4Test with Jest in your VS Code extension

## Table of Contents

1. [Custom Adapter Development](#custom-adapter-development)
2. [Advanced Configuration](#advanced-configuration)
3. [Mock Generation Strategies](#mock-generation-strategies)
4. [Coverage Analysis](#coverage-analysis)
5. [CI/CD Integration](#cicd-integration)
6. [Performance Optimization](#performance-optimization)
7. [Troubleshooting Guide](#troubleshooting-guide)

## Custom Adapter Development

The `Q4TestJestAdapter` can be extended for custom behavior.

### Extending the Adapter

```typescript
import Q4TestJestAdapter, { TestScenario } from './Q4TestJestAdapter';

class CustomQ4TestAdapter extends Q4TestJestAdapter {
  /**
   * Custom template generation for your specific use case
   */
  generateCustomTemplate(
    serviceAnalysis: any,
    scenarios: TestScenario[]
  ): string {
    // Custom logic here
    return super.generateTestTemplate(
      serviceAnalysis.sourceFile,
      scenarios,
      serviceAnalysis.fileName
    );
  }

  /**
   * Custom mock generation for your APIs
   */
  generateCustomMocks(apis: string[]): string {
    return apis.map(api => `
      jest.mock('${api}', () => ({
        // Your custom mock implementation
      }));
    `).join('\n');
  }
}
```

### Using Custom Adapter in npm Scripts

```json
{
  "scripts": {
    "q4test:custom": "node -e \"const adapter = require('./adapters/CustomQ4TestAdapter'); adapter.generateTests();\""
  }
}
```

## Advanced Configuration

### Scenario Category Weighting

Adjust how Q4Test prioritizes test scenarios:

```json
{
  ".q4testrc.json": {
    "scenarioWeights": {
      "critical": 0.40,
      "logical": 0.35,
      "error": 0.15,
      "edge": 0.10
    }
  }
}
```

### Custom Import Paths

Map your monorepo structure:

```json
{
  "testFilePatterns": {
    "@services/*": "src/services/*",
    "@commands/*": "src/commands/*",
    "@utils/*": "src/utils/*"
  }
}
```

### Framework-Specific Options

For VSCode extension testing:

```json
{
  "vscodeExtension": {
    "enableAPIBridging": true,
    "mockActivationEvents": true,
    "generateCommandTests": true,
    "generateEventHandlerTests": true,
    "generateWebviewTests": true
  }
}
```

## Mock Generation Strategies

### Strategy 1: Auto-Mock All Imports

Automatically mock all external dependencies:

```json
{
  "mockingStrategy": "auto",
  "mockExclusions": [
    "src/**/__mocks__/**",
    "node_modules/**"
  ]
}
```

### Strategy 2: Selective Mocking

Only mock specific modules:

```json
{
  "mockingStrategy": "selective",
  "mockedModules": [
    "vscode",
    "axios",
    "fs",
    "path"
  ]
}
```

### Strategy 3: Spy-Based Testing

Use spies for tracking calls without full mocks:

```json
{
  "mockingStrategy": "spy",
  "spiedMethods": [
    "externalAPI.call",
    "database.query",
    "fileSystem.read"
  ]
}
```

### Custom VSCode API Mocks

Create more realistic VSCode mocks for better tests:

```typescript
// src/__mocks__/vscode-advanced.ts
export const window = {
  showErrorMessage: jest.fn(async (msg) => {
    // Simulate user dismissing message
    return undefined as unknown as string;
  }),
  showInformationMessage: jest.fn(async (msg) => {
    return undefined as unknown as string;
  }),
  createOutputChannel: jest.fn((name) => ({
    append: jest.fn(),
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  })),
  // Add more realistic implementations...
};
```

## Coverage Analysis

### Generate Coverage Details

```bash
# Generate detailed coverage report
npm run test:q4test:coverage

# View in browser
open coverage/q4test/index.html  # macOS
xdg-open coverage/q4test/index.html  # Linux
start coverage/q4test/index.html  # Windows
```

### Coverage Benchmarking

Track coverage improvements over time:

```typescript
// scripts/benchmark-coverage.js
const fs = require('fs');
const path = require('path');

function benchmarkCoverage() {
  const coverageFile = 'coverage/q4test/coverage-final.json';
  const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
  
  const stats = {
    timestamp: new Date().toISOString(),
    fileCount: Object.keys(coverage).length,
    estimatedCoverage: calculateCoverage(coverage),
  };
  
  // Log to benchmark file
  fs.appendFileSync('coverage-benchmarks.json', JSON.stringify(stats) + '\n');
}
```

### Identify Uncovered Code

```bash
#!/bin/bash
# Find files with <50% coverage

files=$(npm run test:q4test:coverage 2>/dev/null | grep -E '\s[0-4][0-9]\.|[0-4]\.[0-9]%' | awk '{print $1}')
echo "Files below 50% coverage:"
echo "$files"
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Q4Test + Jest Integration

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run hand-written tests
        run: npm run test:jest
      
      - name: Run Q4Test-generated tests
        run: npm run test:q4test
      
      - name: Validate Q4Test compliance
        run: npm run q4test:validate
      
      - name: Merge coverage reports
        run: npm run q4test:merge-coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/combined/lcov.info
          flags: q4test
          fail_ci_if_error: true
```

### GitLab CI Configuration

```yaml
test:q4test:
  stage: test
  script:
    - npm install
    - npm run test:q4test
    - npm run q4test:validate
    - npm run q4test:merge-coverage
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/combined/cobertura-coverage.xml
```

### Azure Pipelines

```yaml
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'

- script: npm install
  displayName: 'Install dependencies'

- script: npm run test:q4test
  displayName: 'Run Q4Test generated tests'

- script: npm run q4test:validate
  displayName: 'Validate Q4Test compliance'

- script: npm run q4test:merge-coverage
  displayName: 'Merge coverage reports'

- task: PublishCodeCoverageResults@1
  inputs:
    codeCoverageTool: Cobertura
    summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/combined/cobertura-coverage.xml'
```

## Performance Optimization

### Jest Configuration Tuning

```javascript
// jest-q4test.config.js
module.exports = {
  // ... existing config ...
  
  // Performance optimizations
  maxWorkers: 2,  // Adjust based on CPU cores
  testTimeout: 10000,  // Timeout for long-running tests
  bail: 1,  // Stop after first test failure
  
  // Caching
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Parallel execution
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // Memory optimization
  forceExit: true,
  detectOpenHandles: false,  // Can be slow
};
```

### Parallel Test Execution

```bash
#!/bin/bash
# Run multiple Q4Test test files in parallel

files=$(find src -name "Q4TEST_GEN_*.test.ts" | sort)
parallel -j 4 npm run test:q4test -- {} :::: <(echo "$files")
```

### Caching Generated Tests

```json
{
  "testGeneration": {
    "cacheGenerated": true,
    "cacheDirectory": ".q4test-cache",
    "invalidateOn": [
      "src/**/*.ts",
      ".q4testrc.json"
    ]
  }
}
```

## Troubleshooting Guide

### Issue: Tests timeout repeatedly

```bash
# Increase timeout in jest-q4test.config.js
testTimeout: 30000  // 30 seconds

# Or via environment variable
TEST_TIMEOUT=30000 npm run test:q4test
```

### Issue: Memory errors with large test suites

```bash
# Run tests with increased memory
node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js --config jest-q4test.config.js
```

### Issue: VSCode mock conflicts

```typescript
// Ensure mocks are set before imports
jest.mock('vscode', () => ({...}), { virtual: true });

// Import after mock
import * as vscode from 'vscode';
```

### Issue: Coverage reports not merging

```bash
# Check both coverage directories exist
ls coverage/jest/coverage-final.json
ls coverage/q4test/coverage-final.json

# If missing, generate:
npm run test:jest:coverage
npm run test:q4test:coverage

# Then merge:
npm run q4test:merge-coverage
```

### Issue: No tests found after generation

```bash
# Check test file naming
ls src/**/*Q4TEST_GEN_*.test.ts

# Verify Jest pattern matches
npm run test:q4test -- --listTests
```

## Advanced Debugging

### Debug Generated Tests

```bash
# Run in debug mode
npm run test:q4test:debug

# Then open chrome://inspect in Chrome
```

### Verbose Test Output

```bash
# Run with verbose output
npm run test:q4test -- --verbose

# Save to file for analysis
npm run test:q4test -- --verbose > test-output.txt 2>&1
```

### Profile Test Performance

```bash
# Find slowest tests
npm run test:q4test -- --detectLeaks --logHeapUsage

# Generate detailed timing report
npm run test:q4test -- --timers
```

## Additional Resources

- [Q4Test Documentation](https://docs.q4us.com/qunit)
- [Jest Performance Guide](https://jestjs.io/docs/timer-mocks)
- [TypeScript Testing Best Practices](https://www.typescriptlang.org/docs/handbook/testing.html)
- [VSCode Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extensions)

---

**Last Updated**: January 23, 2026  
**Topic**: Advanced Q4Test Integration with Jest
