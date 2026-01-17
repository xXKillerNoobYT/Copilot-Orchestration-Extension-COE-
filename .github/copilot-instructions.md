# Copilot Instructions
Guidelines for using Copilot with this project's GitHub Issues-based task management system.

## Critical Requirements
- ✅ Use GitHub Issues for task management and tracking
- ✅ Coordinate multiple agents to handle complex tasks
- ✅ Ensure clear communication between agents
- ✅ Ensure all tests are picked up in Jest/Mocha test configuration
- ✅ Always give a recommended task or next step. And by task I mean issue if an issue is complete.
- ✅ If there are problems or things that need to be fixed. That you're not working on right now and you do not need to get fixed to finish your task. Or issue? Create a Github issue for it.

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
## Autonomous Issue Fix Workflow (Jan 16, 2026+)

When tasked with fixing GitHub issues autonomously:

### Workflow Pattern
1. **Issue Created**: Issue exists in GitHub with clear description, steps, evidence
2. **Assign Copilot**: Use `mcp_github_assign_copilot_to_issue` to assign issue to Copilot coding agent
3. **Copilot Works**: Copilot creates implementation branch and PR with fixes
4. **Request Review**: Use `mcp_github_request_copilot_review` on the PR for automated code review
5. **Review Feedback**: Address any feedback from Copilot review
6. **Merge PR**: Merge the PR back to main branch
7. **Sync Changes**: Pull latest changes to verify everything integrated correctly
8. **Close Issue**: Issue auto-closes when PR merged, or manually close if needed

### When to Use This Pattern
- ✅ Issue has clear acceptance criteria
- ✅ Issue has reproduction steps documented
- ✅ Issue is isolated (not blocking other work)
- ✅ Issue doesn't require complex architecture decisions
- ✅ Can be completed in 1-3 days

### When NOT to Use
- ❌ Issue requires design discussion first
- ❌ Issue depends on other issues not yet fixed
- ❌ Issue requires manual testing on local machine
- ❌ Issue needs human decision-making

### Example Commands
```bash
# Assign Copilot to issue #86
mcp_github_assign_copilot_to_issue(owner, repo, 86)

# Request Copilot review on PR #99
mcp_github_request_copilot_review(owner, repo, 99)

# Merge PR when review passes
mcp_github2_merge_pull_request(owner, repo, 99)
```

### Benefits
- **Autonomous Execution**: Issues get fixed without human coding
- **Parallel Work**: Multiple issues can be assigned to Copilot simultaneously
- **Code Review**: Automated review catches issues before human review
- **Audit Trail**: Full commit history and PR record of all changes
- **Scale**: Can fix 10+ issues in parallel with one orchestrator

## Remembers
- Use GitHub Issues for task management and tracking.
- Coordinate multiple agents to handle complex tasks.
- Ensure clear communication between agents.
- **When you see fixable issues, assign them to Copilot agents instead of fixing manually** (use autonomous workflow above).
- make sure all the tests are being picked up in the jest test running configuration.
- Always give a recommended task or next step. And by task I mean issue if an issue is complete.
- allways create a github issue for anything that needs to be fixed that you're not working on right now and do not need to get fixed to finish your task.
- Run tests frequently to catch issues early. using the test tool you have.
