# Q4Test + Jest Setup - Quick Reference

## TL;DR - Get Started in 5 Minutes

### 1. Install Q4Test Extension
```bash
# Via VS Code Marketplace
# Search for: "q4test.q4test" and click Install

# Or via CLI:
code --install-extension q4test.q4test
```

### 2. Verify Configuration Files Exist
✅ `.q4testrc.json` - Q4Test config  
✅ `jest-q4test.config.js` - Jest config for Q4Test  
✅ `src/adapters/Q4TestJestAdapter.ts` - Adapter  
✅ `scripts/validate-q4test.js` - Validation  
✅ `scripts/merge-coverage.js` - Coverage merge  

### 3. Add npm Scripts
```bash
# Already added to package.json:
npm run test:q4test           # Run Q4Test-generated tests
npm run test:q4test:watch     # Watch mode
npm run test:q4test:coverage  # Generate coverage
npm run q4test:validate       # Validate compliance
npm run q4test:merge-coverage # Merge coverage
```

### 4. Configure VS Code Workspace
Update `.vscode/settings.json`:
```json
{
  "q4test.enabled": true,
  "q4test.autoValidateTests": true,
  "q4test.testCommand": "npm run test:jest",
  "q4test.testWatchCommand": "npm run test:jest:watch"
}
```

### 5. Generate Your First Tests
1. Click beaker icon (🧪) in Activity Bar
2. Select a service/action from the sidebar
3. Click Generate Tests (🧪)
4. Review proposed scenarios
5. Click Generate
6. Tests created: `src/services/Q4TEST_GEN_<service>.test.ts`

## Common Commands

| Command | What it does |
|---------|-------------|
| `npm run test:q4test` | Run all Q4Test-generated tests |
| `npm run test:q4test:watch` | Watch mode for development |
| `npm run test:q4test:coverage` | Generate coverage report |
| `npm run q4test:validate` | Check tests for Jest compliance |
| `npm run q4test:merge-coverage` | Combine jest + q4test coverage |

## Generated Test Structure

Generated tests follow this pattern:

```typescript
describe('serviceName', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  afterEach(() => { jest.restoreAllMocks(); });

  // 🔴 CRITICAL - Core functionality (30%)
  it('should do X', () => { /* test */ });

  // 🟡 LOGICAL - Business logic (40%)
  it('should handle Y', () => { /* test */ });

  // 🟠 ERROR - Error paths (20%)
  it('should fail gracefully', () => { /* test */ });

  // 🟢 EDGE - Edge cases (10%)
  it('should handle edge case Z', () => { /* test */ });
});
```

## File Locations

```
vscode-extension/
├── .q4testrc.json              ← Q4Test config
├── jest-q4test.config.js       ← Jest config for Q4Test
├── jest.config.js              ← Base Jest config (unchanged)
├── package.json                ← Scripts added ✓
├── src/
│   ├── adapters/
│   │   └── Q4TestJestAdapter.ts    ← Adapter
│   ├── config/
│   │   └── Q4TestSettings.ts       ← VS Code settings
│   ├── services/
│   │   └── Q4TEST_GEN_*.test.ts    ← Generated tests
│   └── __mocks__/
│       └── vscode.ts           ← VSCode API mock
├── scripts/
│   ├── validate-q4test.js      ← Validation script
│   └── merge-coverage.js       ← Coverage merge script
├── examples/
│   └── Q4TEST_GEN_exampleService.test.ts  ← Example
├── Q4TEST-JEST-INTEGRATION-GUIDE.md    ← Full guide
└── Q4TEST-JEST-ADVANCED-GUIDE.md       ← Advanced topics
```

## Key Features

✅ **AI-Powered**: Q4Test uses AI to analyze code and propose test scenarios  
✅ **Jest Compatible**: All tests run with existing Jest infrastructure  
✅ **Smart Mocking**: Auto-generates mocks for VSCode APIs  
✅ **Coverage Tracking**: Merge generated coverage with hand-written  
✅ **Auto-Validation**: Optional automatic test validation and repair  
✅ **4 Scenario Types**: Critical, Logical, Error, Edge cases  

## Test Scenario Types

| Type | Weight | Focus | Example |
|------|--------|-------|---------|
| 🔴 Critical | 30% | Core functionality | "should initialize service" |
| 🟡 Logical | 40% | Business logic | "should chain operations" |
| 🟠 Error | 20% | Error handling | "should throw on invalid input" |
| 🟢 Edge | 10% | Edge cases | "should handle empty arrays" |

## Validation Checklist

Before committing generated tests:

- [ ] Tests follow Jest syntax (`describe`, `it`, `expect`)
- [ ] Tests have proper setup (`beforeEach`, `afterEach`)
- [ ] VSCode APIs are mocked
- [ ] All assertions are present
- [ ] Import paths are correct
- [ ] Run `npm run q4test:validate` passes
- [ ] Coverage meets thresholds

## Troubleshooting

### Q4Test Panel Not Showing?
```bash
code --install-extension q4test.q4test
# Reload VS Code window (Ctrl+R or Cmd+R)
```

### Tests Not Running?
```bash
# Verify config exists
ls jest-q4test.config.js
ls .q4testrc.json

# Clear Jest cache
npm run test:q4test -- --clearCache
```

### Coverage Merge Failing?
```bash
# Generate both coverage reports first
npm run test:jest:coverage
npm run test:q4test:coverage

# Then merge
npm run q4test:merge-coverage
```

### Validation Errors?
```bash
# Check generated test file
npm run q4test:validate

# Review output for specific issues
cat coverage-summary.json
```

## Next Steps

1. ✅ Review `.q4testrc.json` settings
2. ✅ Open Q4Test panel (click beaker 🧪)
3. ✅ Generate tests for one service
4. ✅ Review generated test file
5. ✅ Run `npm run test:q4test`
6. ✅ Check coverage with `npm run test:q4test:coverage`
7. ✅ Validate with `npm run q4test:validate`
8. ✅ Merge coverage with `npm run q4test:merge-coverage`

## Documentation

- **[Full Guide](./Q4TEST-JEST-INTEGRATION-GUIDE.md)** - Complete setup and usage
- **[Advanced Guide](./Q4TEST-JEST-ADVANCED-GUIDE.md)** - Custom adapters, CI/CD, performance
- **[Example Test](./examples/Q4TEST_GEN_exampleService.test.ts)** - Generated test example

## Support

- Q4Test Issues: https://github.com/yourusername/q4test/issues
- Contact: support@q4us.com
- Local Setup Issues: Review `.q4testrc.json` and `jest-q4test.config.js`

---

**Installed**: January 23, 2026  
**Framework**: Jest 30.2.0 | Q4Test 1.0.5 | TypeScript 5.4.0
