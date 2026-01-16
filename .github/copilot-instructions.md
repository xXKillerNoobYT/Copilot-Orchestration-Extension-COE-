# Copilot Instructions
Guidelines for using Copilot with this project's GitHub Issues-based task management system.

## Critical Requirements
- ✅ Use GitHub Issues for task management and tracking
- ✅ Coordinate multiple agents to handle complex tasks
- ✅ Ensure clear communication between agents
- ✅ Ensure all tests are picked up in Jest/Mocha test configuration

## VS Code Extension Build Configuration
### Webpack Settings (vscode-extension/webpack.config.js)
- **Main Extension Bundle**: EXCLUDE .test.ts files (production only)
- **Tools Bundle**: INCLUDE .test.ts files (test compilation)
- **Entry Points**: All test files must be listed explicitly
- **Rule**: Do NOT apply same module rules to both bundles

### Test Configuration Status ✅
- Jest Configuration: vscode-extension/jest.config.js ✅
- Mocha Test Support: extension.agentLoop.test.ts ✅
- Test Compilation: Webpack properly configured ✅
- Test Execution: All 92 tests passing ✅

## Recent Fixes (Jan 15, 2026)
### Issue Resolution
- Fixed webpack test compilation - now properly includes .test.ts files in tools bundle
- Added missing extension.agentLoop.test entry point to webpack config
- All 92 tests now passing with 0 failures

### Verification
```
✅ npm run compile   → SUCCESS
✅ npm test         → 92 PASSING (0 failing, 4 pending)
✅ Build artifacts  → ALL GENERATED
```

## Key Lessons
1. **Webpack Dual-Bundle Pattern**: Different rules needed for source vs test bundles
2. **Test File Inclusion**: Test files must be explicitly listed in entry points
3. **Mixed Frameworks**: Jest and Mocha can coexist with proper webpack configuration
## Remembers
- Use GitHub Issues for task management and tracking.
- Coordinate multiple agents to handle complex tasks.
- Ensure clear communication between agents.
- make sure all the tests are being picked up in the jest test running configuration.
