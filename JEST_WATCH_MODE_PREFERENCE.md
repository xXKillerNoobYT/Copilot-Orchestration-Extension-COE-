# Jest Test Configuration Preferences
**Date:** January 18, 2026  
**Status:** Active Configuration

---

## 🎯 Default Test Mode: Watch with Coverage

### Preference Settings

**Default behavior**: Jest runs in **watch mode with coverage on save**

This provides:
- ✅ Immediate feedback on test status while coding
- ✅ Live coverage visualization in editor
- ✅ Auto-run tests when files change
- ✅ Red/yellow/green coverage highlights in code

---

## 📁 Configuration Files

### `.vscode/settings.json`
```json
{
  "jest.autoRun": {
    "watch": true,
    "onSave": "test-src-file"
  },
  "jest.showCoverageOnLoad": true,
  "jest.coverageColors": {
    "uncovered": "rgba(255, 0, 0, 0.15)",
    "partially-covered": "rgba(255, 255, 0, 0.15)",
    "covered": "rgba(0, 255, 0, 0.15)"
  },
  "// NOTE": "Jest defaults to watch mode with coverage on save. This provides immediate feedback on test status and coverage while developing. Use 'npm run test:jest' for CI/one-time runs."
}
```

### `package.json` Scripts

**context-manager:**
```json
{
  "test": "jest --watch --coverage --maxWorkers=1",
  "test:watch": "jest --watch --coverage --maxWorkers=1",
  "test:ci": "jest --runInBand --detectOpenHandles --forceExit --coverage"
}
```

**vscode-extension:**
```json
{
  "test": "npm run test:watch",
  "test:watch": "node --expose-gc --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --watch --coverage --maxWorkers=1 --passWithNoTests",
  "test:jest": "node --expose-gc --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --runInBand --detectOpenHandles --forceExit --passWithNoTests"
}
```

---

## 🎨 Coverage Visualization

### In-Editor Highlights
- **Red** (uncovered): Lines not covered by any test
- **Yellow** (partially-covered): Branches partially covered
- **Green** (covered): Fully covered code

### Coverage Panel
- Click the coverage indicator in status bar
- View detailed coverage report
- Jump to uncovered lines

---

## 🚀 Usage

### Development Mode (Default)
```bash
# Starts watch mode with coverage
npm test
```

### CI/Production Mode
```bash
# One-time run for CI
npm run test:ci         # context-manager
npm run test:jest       # vscode-extension
```

### Coverage Report Only
```bash
npm run test:coverage
```

---

## 📊 Coverage Targets

### context-manager (Enforced)
- **Branches**: 80%+
- **Functions**: 90%+
- **Lines**: 90%+
- **Statements**: 90%+

### vscode-extension (Target)
- **All metrics**: 50%+ (gradual improvement)

---

## ⚙️ How It Works

1. **Save a file** → Jest detects change
2. **Runs related tests** → Only tests affected by the change
3. **Updates coverage** → Highlights updated in editor
4. **Shows results** → Pass/fail in Test Explorer and Problems panel

### Performance Notes
- Uses `maxWorkers=1` to reduce memory usage
- Only reruns affected tests (fast feedback)
- Coverage calculated incrementally

---

## 🔧 Customization

### Disable Auto-Run (Temporarily)
In VS Code:
1. Open Command Palette (Ctrl+Shift+P)
2. Search "Jest: Toggle Auto Run"
3. Select "off"

### Run All Tests Manually
In VS Code:
1. Click "Run All Tests" in Test Explorer
2. Or use Command Palette → "Jest: Run All Tests"

### Change Coverage Display
Edit `.vscode/settings.json`:
```json
{
  "jest.showCoverageOnLoad": false  // Disable auto-show
}
```

---

## 📝 Problem Reporting

### Failed Tests → Problems Panel
All test failures appear in VS Code Problems panel (Ctrl+Shift+M):
- ❌ Test assertion failures
- ⏭️ Skipped tests (`.skip`, `.todo`)
- 🔴 Runtime errors in tests

### Accessing Problems
```bash
# View problems in VS Code
Ctrl+Shift+M (Windows/Linux)
Cmd+Shift+M (Mac)

# Or use get_errors tool
get_errors
```

---

## ✅ Best Practices

1. **Keep tests green**: Fix failures immediately
2. **Document skips**: Add issue number for `.skip` tests
3. **Watch coverage**: Red lines = missing tests
4. **Use watch mode**: Faster than full runs
5. **CI uses test:ci**: Full run with coverage in CI/CD

---

## 🎓 References

- [Jest Watch Mode](https://jestjs.io/docs/cli#--watch)
- [Jest Coverage](https://jestjs.io/docs/cli#--coverageboolean)
- [VS Code Jest Extension](https://github.com/jest-community/vscode-jest)

---

**Last Updated:** January 18, 2026  
**Maintained By:** Development Team
