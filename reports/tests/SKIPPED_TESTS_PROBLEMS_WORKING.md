# Skipped Tests Now Showing in VS Code Problems! ✅

**Status:** Working as intended

---

## What You'll See

When you run `npm run report:tests`, skipped and failing tests now appear in VS Code Problems format:

```
src\__tests__\jest-sanity-check.test.ts:1:1 - warning: ⏭️  SKIPPED TEST: [test name]
  Skipped tests must be documented with issue link and timeline

src\__tests__\jest-sanity-check.test.ts:1:1 - error: ❌ FAILING TEST: [test name]
  Error message...
```

## How to View in VS Code

1. **Open Problems Panel:**
   - `Ctrl+Shift+M` (Windows/Linux)
   - `Cmd+Shift+M` (Mac)

2. **Or use Command Palette:**
   - `Ctrl+Shift+P` → "Problems: Focus"

3. **Filter by test files:**
   - Click any `.test.ts` result to jump to the test

## How It Works

### Pipeline:
1. Run tests with JSON output: `npm run test:jest -- --json --outputFile=test-results.json`
2. Parse results: `npm run report:tests`
3. Output in VS Code Problems format:
   - ⏭️ `warning:` for skipped tests
   - ❌ `error:` for failures

### Custom reporter:
- **File:** `vscode-extension/scripts/report-tests.js`
- **Config:** `vscode-extension/jest.config.js` (includes reporter)
- **Output:** Readable by VS Code and CI/CD systems

## Integration

### Single command:
```bash
npm run test:jest -- --json --outputFile=test-results.json && npm run report:tests
```

### In CI/CD:
The report appears in build logs in the same format, making it easy for developers and automation to find issues.

### Skipped Test Requirements

Every skipped test must have documentation:
```typescript
test.skip('descriptive test name', () => {
  // GitHub Issue: #123
  // Timeline: Fix by January 25, 2026
  // Reason: Waiting for feature X to be implemented
});
```

---

## Current Status

✅ **Sanity-check test verified:**
- 1 skipped test ✓
- 1 failing test ✓
- Both appear in Problems format ✓

---

**Last Updated:** January 19, 2026
