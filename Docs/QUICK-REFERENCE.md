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

### LLM Connection Timeouts
- **Issue**: Connection tests timeout when testing slow LLM systems
- **Fix**: Increase timeout settings in VS Code
  ```json
  {
    "copilot-orchestrator.llm.timeouts.testConnectionMs": 600000,  // 10 minutes
    "copilot-orchestrator.llm.timeouts.coldLoadMs": 1800000,       // 30 minutes
    "copilot-orchestrator.llm.timeouts.modelSwitchMs": 2700000     // 45 minutes
  }
  ```
- **Documentation**: See `vscode-extension/LLM-TIMEOUT-CONFIGURATION.md`

### Request Queue Overflow
- **Issue**: "Queue full: 20/20 requests" error
- **Fix**: Increase max queue depth or decrease response wait time
  ```json
  {
    "copilot-orchestrator.llm.timeouts.maxQueueDepth": 50,
    "copilot-orchestrator.llm.timeouts.queuedResponseMs": 600000  // 10 minutes
  }
  ```

### Agent Activation Failures
- **Issue**: Agent activation timeout errors
- **Fix**: Increase agent activation/deactivation timeouts
  ```json
  {
    "copilot-orchestrator.llm.timeouts.agentActivationMs": 1800000,  // 30 minutes
    "copilot-orchestrator.llm.timeouts.agentDeactivationMs": 600000  // 10 minutes
  }
  ```

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
- **Status**: ✅ FIXED (Jan 19, 2026)

### LLM Monitor Configuration
- **Issue**: LLM Monitor shows "unreachable at 192.168.137.215:8000" even after configuring different IP
- **Fix**: Configure `copilot-orchestrator.llm.baseUrl` in VS Code settings (settings now override cache on startup)
- **Example**:
  ```json
  {
    "copilot-orchestrator.llm.baseUrl": "http://192.168.1.100:8000"
  }
  ```
- **Status**: ✅ FIXED (Jan 19, 2026)

### Agent Loop Startup Failure
- **Issue**: "Start loop failed: fetch failed" error
- **Fix**: Start Laravel backend with `php artisan serve` before using Agent Loop
- **Default URL**: `http://localhost:8000`
- **Configure**: Set `copilot-orchestrator.backendUrl` in settings if using different URL
- **Status**: ✅ FIXED with enhanced error messages (Jan 19, 2026)

## Test Status

**Current Metrics (Updated: January 19, 2026)**:
- Total Tests: 543 (541 passing, 1 skipped, 1 failing - both intentional sanity checks)
- Pass Rate: 99.6% (100% excluding sanity checks)
- Coverage: 96.8% (VS Code Extension)
  - Context Manager: 82%
  - VS Code Extension: 96.8%

**Sanity Check Status**: ✅ HEALTHY
- Intentional skip: Surfacing correctly in Problems panel
- Intentional failure: Surfacing correctly in Problems panel
- Test runner integration: Working as designed

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
