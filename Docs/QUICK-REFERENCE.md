# Quick Reference Guide

## Test Commands

### Run All Tests
```bash
npm test                          # All test suites
npm run test:context-manager      # Context manager only
npm run test:extension            # VS Code extension only
npm run test:coverage             # With coverage reports
npm run test:watch                # Watch mode (auto-rerun)
npm run test:report               # Display test report
```

### Laravel Tests
```bash
php artisan test                  # PHPUnit test suite
vendor/bin/phpunit                # Direct PHPUnit
```

### Build Commands
```bash
npm run build                     # Vite SSR + CSR production build
npm run compile                   # VS Code extension webpack
npx tsc --noEmit                  # TypeScript type checking
php artisan pint                  # Laravel code formatting
```

### Development
```bash
php artisan serve                 # Laravel dev server
npm run dev                       # Vite dev server + HMR
cd vscode-extension && npm run compile  # Extension build
```

## Common Issues & Fixes

### Jest Configuration
- **Issue**: CLI argument conflicts (`--runInBand` + `--maxWorkers`)
- **Fix**: Use only one worker control flag at a time
- **Location**: `vscode-extension/package.json`

### Import Errors
- **Issue**: Vitest imports in Jest tests
- **Fix**: Use `@jest/globals` instead of `vitest`
- **Pattern**: Replace `vi` with `jest`, `vitest` with `@jest/globals`

### Extension Commands
- **Issue**: Command 'copilot-orchestrator.showPanel' not found
- **Fix**: Run `npm run compile` after pulling changes
- **Verify**: Check `extension.ts` for command registrations

## Test Status

**Current Metrics:**
- Total Tests: 377+ passing
- Pass Rate: 100%
- Coverage: 82%+ average
  - Context Manager: 82%
  - VS Code Extension: 96.8%

## Security

**Vulnerabilities**: 0 (verified via `npm audit`)
**Dependencies**: Clean, up-to-date

## Build Status

### Root (Laravel + Vue)
- ✅ TypeScript: 0 errors
- ✅ Client bundle: ~97 kB gzipped
- ✅ SSR bundle: Generated
- ⏱️ Build time: ~18 seconds

### VS Code Extension
- ✅ Webpack bundle: OK
- ✅ Plan builder UI: ~131 kB
- ✅ MCP server: OK
- ⏱️ Build time: ~10 seconds

### Context Manager
- ✅ TypeScript: 0 errors
- ✅ Ready to publish

## Key Files

### Configuration
- `jest.config.cjs` - Root Jest config
- `vscode-extension/package.json` - Extension scripts
- `context-manager/jest.config.js` - Context manager tests
- `phpunit.xml` - PHP test configuration
- `vite.config.js` - Vite build config

### Documentation
- `Docs/PROJECT-RUNBOOK.md` - Execution guide
- `Docs/GITHUB-ISSUES-PLAN.md` - Issue tracking
- `.github/copilot-instructions.md` - AI instructions
- `PRD.json` / `PRD.md` - Product requirements

## Quick Verifications

```bash
# Check test count
npx jest --listTests | wc -l      # Should show 37+ test files

# Verify builds
npm run build && echo "✅ Build OK"

# Check for uncommitted changes
git status

# Security audit
npm audit --audit-level=moderate
```
