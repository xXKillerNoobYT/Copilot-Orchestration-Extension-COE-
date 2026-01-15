# Dependency Agent - GitHub MCP Migration Guide

**Created**: 2026-01-14  
**Status**: Complete  
**Agent**: Dependency Agent  
**Migration Type**: zen-tasks → GitHub MCP Tools

---

## 🎯 Overview

This document details the migration of Dependency Agent from the legacy `zen-tasks_*` tool system to GitHub MCP server tools. The migration enables the Dependency Agent to create dependency-related GitHub Issues, flag security vulnerabilities with critical priority, and manage dependency updates through GitHub's native issue system.

---

## 📋 Summary of Changes

### Tools Updated
- **Removed**: All `barradevdigitalsolutions.zen-tasks-copilot/*` tools
- **Added**: `github-mcp-server-*` tools (list_issues, search_issues, issue_read, issue_write)
- **Retained**: All other tools (read, edit, execute, search, vscode, web, memory, Python, Mermaid, etc.)

### Handoffs Updated
- ✅ Hand off to Auto Zen for Updates (uses github-mcp-server-search_issues and issue_write)
- ✅ Report Security Issues (uses github-mcp-server-search_issues with security-vulnerability filter)
- ✅ Review Dependency Strategy (unchanged structure)

### Workflow Updates
- ✅ Dependency monitoring creates GitHub Issues for updates
- ✅ Security scans create critical-priority GitHub Issues
- ✅ Version drift creates refactor GitHub Issues
- ✅ Update workflows tracked through GitHub Issues

---

## 🔄 Key Migration Patterns

### Pattern 1: Creating Security Vulnerability Issues

**BEFORE (zen-tasks)**:
```
zen-tasks_add_task({
  title: "Fix security vulnerability in package X",
  type: "security",
  priority: "critical"
})
```

**AFTER (GitHub MCP)**:
```
Create GitHub Issue via API:
  Title: "SECURITY: Fix CVE-2026-12345 in lodash"
  Body: |
    ## Security Vulnerability
    **Package**: lodash
    **Current Version**: 4.17.20
    **Vulnerable**: Yes
    **CVE**: CVE-2026-12345
    **Severity**: Critical
    
    ## Vulnerability Details
    Prototype pollution vulnerability allowing remote code execution.
    
    ## Fix Available
    **Fixed Version**: 4.17.21
    **Release Date**: 2026-01-10
    
    ## Update Required
    - [ ] Update lodash to 4.17.21+
    - [ ] Run full test suite
    - [ ] Verify no breaking changes
    - [ ] Deploy immediately
    
    ## Impact
    - Affects all user input validation
    - Potential for RCE attacks
    - Must fix before next deployment
    
    ## References
    - CVE: https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2026-12345
    - Fix PR: https://github.com/lodash/lodash/pull/12345
  
  Labels: ["type: bug", "priority: critical", "security-vulnerability", "dependencies", "status: pending"]
```

---

### Pattern 2: Creating Dependency Update Issues

**BEFORE (zen-tasks)**:
```
zen-tasks_add_task({
  title: "Update React to v18",
  type: "maintenance",
  priority: "medium"
})
```

**AFTER (GitHub MCP)**:
```
Create GitHub Issue via API:
  Title: "Update React from v17.0.2 to v18.2.0"
  Body: |
    ## Dependency Update
    **Package**: react
    **Current Version**: 17.0.2
    **Latest Version**: 18.2.0
    **Update Type**: Major
    
    ## Changelog Highlights
    - Automatic batching of updates
    - New concurrent features
    - Suspense improvements
    - Breaking changes in event handling
    
    ## Breaking Changes
    - Automatic batching may change behavior
    - ReactDOM.render deprecated (use createRoot)
    - Internet Explorer no longer supported
    
    ## Update Plan
    - [ ] Review migration guide
    - [ ] Update React and ReactDOM
    - [ ] Replace ReactDOM.render with createRoot
    - [ ] Test all components
    - [ ] Update documentation
    - [ ] Verify bundle size impact
    
    ## Testing Strategy
    - Unit tests must pass
    - E2E tests must pass
    - Manual testing of critical flows
    - Performance benchmarks
    
    ## Rollback Plan
    If issues found, revert to 17.0.2
    
    ## Estimated Effort
    4-6 hours
  
  Labels: ["type: maintenance", "priority: medium", "dependencies", "status: pending"]
```

---

### Pattern 3: Reporting Version Drift

**BEFORE (zen-tasks)**:
```
Create task for version drift alignment
```

**AFTER (GitHub MCP)**:
```
Create GitHub Issue via API:
  Title: "Align version drift: lodash across modules"
  Body: |
    ## Version Drift Detected
    **Package**: lodash
    **Inconsistent Versions**: 3 different versions found
    
    ## Current State
    - Module A: lodash@4.17.20
    - Module B: lodash@4.17.21
    - Module C: lodash@4.17.15
    
    ## Impact
    - Duplicate code in bundle (+45KB)
    - Inconsistent behavior across modules
    - Difficult to track security vulnerabilities
    
    ## Resolution
    Align all modules to lodash@4.17.21 (latest stable)
    
    ## Update Steps
    - [ ] Update Module A to 4.17.21
    - [ ] Update Module C to 4.17.21
    - [ ] Regenerate lock files
    - [ ] Verify bundle size reduction
    - [ ] Test all modules
    
    ## Expected Benefits
    - Bundle size reduction: ~45KB
    - Consistent behavior
    - Easier security management
  
  Labels: ["type: refactor", "priority: medium", "dependencies", "status: pending"]
```

---

### Pattern 4: Tracking Update Progress

**BEFORE (zen-tasks)**:
```
Update task status and add notes
```

**AFTER (GitHub MCP)**:
```typescript
// Post update progress as issue comment
github-mcp-server-issue_write({
  method: "add_comment",
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  issue_number: 123,
  comment: `
## Dependency Update Progress

### Completed Steps
- ✅ Updated package.json
- ✅ Regenerated package-lock.json
- ✅ Ran \`npm install\`
- ✅ All unit tests passed (145/145)

### Test Results
- Unit Tests: ✅ Passed
- Integration Tests: ✅ Passed
- E2E Tests: ⏳ Running...
- Bundle Size: +2KB (acceptable)

### Next Steps
- [ ] Complete E2E test run
- [ ] Manual verification
- [ ] Update documentation
- [ ] Create release notes entry

### Notes
No breaking changes detected. All tests passing smoothly.
  `
})
```

---

## 🏷️ Dependency-Specific Labels

### Type Labels
- `type: maintenance` - Dependency updates
- `type: bug` - Security vulnerabilities

### Priority Labels (for dependency issues)
- `priority: critical` - Security vulnerabilities (CVEs), breaking production
- `priority: high` - Major version updates, deprecated packages
- `priority: medium` - Minor/patch updates, version drift
- `priority: low` - Cleanup, unused dependencies

### Special Labels
- `dependencies` - All dependency-related issues
- `security-vulnerability` - Security issues (CVEs)
- `deprecated` - Deprecated package issues
- `performance` - Bundle size/performance issues

---

## 📝 Issue Body Templates

### Security Vulnerability Issue
```markdown
## Security Vulnerability
**Package**: [package-name]
**Current Version**: [version]
**Vulnerable**: Yes
**CVE**: [CVE-ID]
**Severity**: [Critical|High|Medium|Low]

## Vulnerability Details
[Description of the vulnerability]

## Fix Available
**Fixed Version**: [version]
**Release Date**: [date]

## Update Required
- [ ] Update to fixed version
- [ ] Run full test suite
- [ ] Verify no breaking changes
- [ ] Deploy immediately (if critical)

## Impact
- [Impact on application]
- [Affected features/modules]
- [Risk level]

## References
- CVE: [link]
- Advisory: [link]
- Fix PR/Release: [link]
```

### Dependency Update Issue
```markdown
## Dependency Update
**Package**: [package-name]
**Current Version**: [version]
**Latest Version**: [version]
**Update Type**: [Patch|Minor|Major]

## Changelog Highlights
- [Key change 1]
- [Key change 2]

## Breaking Changes
- [Breaking change 1]
- [Breaking change 2]
(None if patch/minor)

## Update Plan
- [ ] Review changelog
- [ ] Update package
- [ ] Run tests
- [ ] Verify compatibility
- [ ] Update documentation

## Testing Strategy
- [Testing approach]

## Rollback Plan
[How to rollback if issues]

## Estimated Effort
[Hours]
```

---

## 🔍 Query Examples for Dependency Agent

### Find All Dependency Issues
```typescript
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"dependencies\""
})
```

### Find Security Vulnerabilities
```typescript
github-mcp-server-search_issues({
  query: "is:open label:\"security-vulnerability\""
})
```

### Find Critical Dependency Updates
```typescript
github-mcp-server-search_issues({
  query: "is:open label:\"dependencies\" label:\"priority: critical\""
})
```

### Find Version Drift Issues
```typescript
github-mcp-server-search_issues({
  query: "is:open label:\"dependencies\" \"drift\" in:title"
})
```

---

## 🎯 Workflow Examples

### Example 1: Security Scan Detects Vulnerability

**Scenario**: Daily security scan finds CVE

**Workflow**:
```
1. Run security scan
   - npm audit / composer audit
   - Identify vulnerabilities

2. For each vulnerability:
   Create GitHub Issue:
     Title: "SECURITY: Fix CVE-[ID] in [package]"
     Body: [security vulnerability template]
     Labels: ["type: bug", "priority: critical", "security-vulnerability", "dependencies"]

3. Alert Zen Planner via handoff
   - Zen Planner coordinates immediate response
   - Auto Zen applies fix
   - Testing Agent verifies

4. Track resolution
   github-mcp-server-issue_write({
     method: "add_comment",
     comment: "Fix applied and deployed"
   })

5. Close issue when resolved
   Update state to closed
```

---

### Example 2: Weekly Dependency Update Check

**Scenario**: Weekly check for updates

**Workflow**:
```
1. Check for updates
   - npm outdated / composer outdated
   - Categorize: patch, minor, major

2. Create issues for updates
   For each update:
     Create GitHub Issue:
       Title: "Update [package] to [version]"
       Body: [dependency update template]
       Labels: ["type: maintenance", "dependencies", "priority: [level]"]

3. Prioritize updates
   - Critical: Security fixes
   - High: Major versions
   - Medium: Minor versions
   - Low: Patch versions

4. Hand off to Auto Zen
   - Auto Zen processes by priority
   - Tests each update
   - Reports results

5. Monitor and close
   - Track progress via comments
   - Close when complete
```

---

### Example 3: Handle Version Drift

**Scenario**: Detect inconsistent package versions

**Workflow**:
```
1. Analyze dependency tree
   - Identify duplicate packages
   - Check for version mismatches

2. Create drift issue
   Create GitHub Issue:
     Title: "Align version drift: [package]"
     Body: [version drift template]
     Labels: ["type: refactor", "dependencies", "priority: medium"]

3. Plan alignment
   - Determine target version
   - Identify affected modules
   - Assess impact

4. Execute alignment
   - Update all references
   - Regenerate lock files
   - Test thoroughly

5. Verify resolution
   - Confirm single version
   - Check bundle size
   - Close issue
```

---

## ✅ Migration Checklist

- [x] Removed `barradevdigitalsolutions.zen-tasks-copilot/*` tools
- [x] Added `github-mcp-server-*` tools
- [x] Updated handoff prompts to use GitHub MCP tools
- [x] Updated dependency monitoring to create GitHub Issues
- [x] Updated security scanning to create critical GitHub Issues
- [x] Updated version drift detection to create GitHub Issues
- [x] Updated update workflow to use GitHub Issues
- [x] Verified all tool references are correct
- [x] Verified workflow patterns match other migrated agents
- [x] Created migration documentation

---

## 📚 References

- Main Migration Guide: `Docs/GitHub-Migration-Tool-Mapping.md`
- Auto Zen Migration: `Docs/GitHub-Migration/auto-zen-migration.md`
- Zen Planner Migration: `Docs/GitHub-Migration/zen-planner-migration.md`
- Testing Agent Migration: `Docs/GitHub-Migration/testing-agent-migration.md`
- Plan Agent Migration: `Docs/GitHub-Migration/plan-agent-migration.md`
- GitHub Issues API: https://docs.github.com/en/rest/issues

---

**Migration Completed**: 2026-01-14  
**Verified By**: Autonomous Migration Process
