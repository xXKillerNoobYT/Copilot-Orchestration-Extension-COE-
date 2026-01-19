# Skipped Tests Problem Reporting

**Status:** ✅ Configured and Working

---

## Overview

Skipped tests and failing tests are now explicitly reported in:
- ✅ Jest console output
- ✅ VS Code Problems panel (when using VS Code Jest extension)
- ✅ CI/CD logs

---

## How It Works

### Custom Jest Reporter
**File:** `vscode-extension/jest-problems-reporter.js`

The custom reporter:
1. Catches all skipped tests (`test.skip()`)
2. Reports failures with explicit markers
3. Outputs skipped count and requirements
4. Outputs failure count and urgency

### Configuration
**File:** `vscode-extension/jest.config.js`

```javascript
reporters: ['default', '<rootDir>/jest-problems-reporter.js'],
```

This runs both:
- `default` - Standard Jest reporter
- `jest-problems-reporter.js` - Custom problem reporter

---

## What Gets Reported

### Skipped Tests
```
⏭️  SKIPPED TESTS DETECTED: X test(s) skipped
Skipped tests must be documented in the test file with:
  - Reason for skip
  - GitHub issue number
  - Expected timeline for fix
```

**Requirements for skip tests:**
- Must have a comment explaining why it's skipped
- Must reference a GitHub issue
- Must include expected timeline

Example:
```typescript
test.skip('feature under development', () => {
  // TODO: https://github.com/user/repo/issues/123
  // Expected fix: January 25, 2026
});
```

### Failing Tests
```
[TEST FAILURE] path/to/test.ts
ΓùÅ Test name

    expect(received).toBe(expected)

❌ FAILING TESTS DETECTED: X test(s) failed
Failing tests block PR approval and must be fixed immediately.
```

---

## Output in VS Code

### Test Explorer
- ✅ Shows pass/skip/fail status
- ✅ Allows clicking to jump to test
- ✅ Shows test output on hover

### Problems Panel (Ctrl+Shift+M)
- ✅ Failures appear as errors
- ✅ Skipped tests appear as warnings
- ✅ Grouped with TypeScript errors

### Console Output
```bash
npm run test:jest
```

Outputs:
1. Default Jest summary
2. Custom reporter warnings/errors
3. Explicit skip/failure counts

---

## Integration with CI/CD

The reporter ensures:
- ✅ Skipped tests are visible in logs
- ✅ Failures block the build
- ✅ PR feedback includes test status
- ✅ Coverage reports capture skip/failure data

---

## Best Practices

### For Skipped Tests
```typescript
// ❌ BAD - No documentation
test.skip('some feature', () => {});

// ✅ GOOD - Documented with issue and timeline
test.skip('waiting for API endpoint to be available', () => {
  // GitHub Issue: xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#42
  // Timeline: Will fix by January 25, 2026
  // Reason: API endpoint not deployed to staging yet
});
```

### For Failing Tests
```typescript
// ❌ BAD - Vague failure message
expect(result).toBe(true);

// ✅ GOOD - Clear context
expect(result.success).toBe(true);
// Fix immediately - this blocks PR approval
```

---

## Troubleshooting

### Skipped tests not appearing in Problems panel?
1. Ensure `jest.config.js` includes custom reporter
2. Check VS Code Jest extension version (use latest)
3. Reload VS Code window (Ctrl+Shift+P → "Reload Window")

### Too many skipped tests?
1. Review and document each skip
2. Create GitHub issues for long-term skips
3. Schedule fix dates and update timeline
4. Reduce skip count in each PR

### Failures not surfacing?
1. Run `npm run test:jest` to verify output
2. Check VS Code Problems panel (Ctrl+Shift+M)
3. Try running in watch mode to see live updates

---

## References

- [Jest Reporters](https://jestjs.io/docs/reporters)
- [VS Code Problems Panel](https://code.visualstudio.com/docs/editor/editingevolved#_errors-and-warnings)
- [Jest Configuration](https://jestjs.io/docs/configuration)

---

**Last Updated:** January 18, 2026  
**Status:** Production Ready ✅
