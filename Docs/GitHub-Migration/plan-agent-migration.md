# Plan Agent - GitHub MCP Migration Guide

**Created**: 2026-01-14  
**Status**: Complete  
**Agent**: Plan Agent  
**Migration Type**: zen-tasks → GitHub MCP Tools

---

## 🎯 Overview

This document details the migration of Plan Agent from the legacy `zen-tasks_*` tool system to GitHub MCP server tools. The migration enables the Plan Agent to create architecture-related GitHub Issues, document architectural decisions in issue comments, and enforce patterns through GitHub's native labeling system.

---

## 📋 Summary of Changes

### Tools Updated
- **Removed**: All `barradevdigitalsolutions.zen-tasks-copilot/*` tools
- **Added**: `github-mcp-server-*` tools (list_issues, search_issues, issue_read, issue_write)
- **Retained**: All other tools (read, edit, search, web, mcp_docker/search, memory, Mermaid, etc.)

### Handoffs Updated
- ✅ Hand off to Auto Zen for Implementation (uses github-mcp-server-search_issues)
- ✅ Consult with Zen Planner (uses github-mcp-server-search_issues)
- ✅ Validate Architecture Compliance (uses github-mcp-server-issue_write)

### Workflow Updates
- ✅ Architectural design loop creates GitHub Issues for implementation
- ✅ Architecture validation creates GitHub Issues for violations
- ✅ Constraint monitoring creates GitHub Issues for detected issues
- ✅ Architectural decisions documented in issue comments

---

## 🔄 Key Migration Patterns

### Pattern 1: Creating Architecture Issues

**BEFORE (zen-tasks)**:
```
zen-tasks_add_task({
  title: "Implement service layer pattern",
  type: "architecture",
  priority: "high"
})
```

**AFTER (GitHub MCP)**:
```
Create GitHub Issue via API:
  Title: "Implement service layer pattern for data access"
  Body: |
    ## Context
    Current code mixes business logic with data access, violating separation of concerns.
    
    ## Decision
    Implement service layer pattern to separate business logic from data access.
    
    ## Implementation Guidelines
    - Create service classes in `app/Services/`
    - Services handle business logic
    - Repositories handle data access
    - Controllers delegate to services
    
    ## Acceptance Criteria
    - [ ] All business logic in service layer
    - [ ] No direct DB access in controllers
    - [ ] All services tested
    - [ ] Documentation updated
    
    ## Files Affected
    - `app/Services/*`
    - `app/Repositories/*`
    - `app/Http/Controllers/*`
    
    ## Anti-patterns to Avoid
    - Services calling controllers
    - Business logic in repositories
    - Direct DB access in services
  
  Labels: ["type: architecture", "priority: high", "status: pending"]
```

---

### Pattern 2: Documenting Architectural Decisions

**BEFORE (zen-tasks)**:
```
Update task with architectural decision
```

**AFTER (GitHub MCP)**:
```typescript
// Post architectural decision as issue comment
github-mcp-server-issue_write({
  method: "add_comment",
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  issue_number: 123,
  comment: `
## Architectural Decision Record (ADR)

**Decision**: Use repository pattern for data access
**Date**: 2026-01-14
**Status**: Accepted

### Context
Need consistent data access patterns across application.

### Options Considered
1. Active Record (Laravel default)
2. Repository Pattern
3. Data Mapper

### Decision Rationale
Repository pattern chosen because:
- Better testability (can mock repositories)
- Cleaner separation of concerns
- Easier to switch data sources
- Consistent with Laravel best practices

### Trade-offs
- More boilerplate code
- Steeper learning curve
- Additional abstraction layer

### Implementation Plan
See acceptance criteria in issue body.
  `
})
```

---

### Pattern 3: Validating Architecture Compliance

**BEFORE (zen-tasks)**:
```
Create task for architecture violation
```

**AFTER (GitHub MCP)**:
```
Create GitHub Issue via API:
  Title: "Fix architecture violation: Controller accessing database directly"
  Body: |
    ## Violation Details
    **File**: `app/Http/Controllers/UserController.php`
    **Line**: 45
    **Violation**: Direct database access in controller
    
    ## Expected Pattern
    Controllers should delegate to services, not access DB directly.
    
    ## Current Code
    ```php
    $user = DB::table('users')->where('id', $id)->first();
    ```
    
    ## Expected Code
    ```php
    $user = $this->userService->findById($id);
    ```
    
    ## Fix Steps
    - [ ] Create UserService if doesn't exist
    - [ ] Move query to UserRepository
    - [ ] Update controller to use service
    - [ ] Add tests
    
    ## Related Patterns
    - Service layer pattern
    - Repository pattern
  
  Labels: ["type: refactor", "priority: high", "architecture-violation"]
```

---

### Pattern 4: Monitoring Architectural Constraints

**BEFORE (zen-tasks)**:
```
Create task when circular dependency detected
```

**AFTER (GitHub MCP)**:
```
Create GitHub Issue via API:
  Title: "CRITICAL: Circular dependency detected between Service A and Service B"
  Body: |
    ## Circular Dependency Detected
    **Services**: AuthService ↔ UserService
    
    ## Dependency Chain
    ```
    AuthService → UserService → AuthService
    ```
    
    ## Impact
    - Prevents proper dependency injection
    - Makes testing difficult
    - Violates clean architecture principles
    
    ## Resolution Options
    1. Extract shared logic to new service
    2. Use events to decouple
    3. Refactor to remove circular reference
    
    ## Recommended Solution
    Extract token validation to TokenService.
    
    ## Fix Steps
    - [ ] Create TokenService
    - [ ] Move token logic from AuthService
    - [ ] Update UserService to use TokenService
    - [ ] Update AuthService to use TokenService
    - [ ] Verify no circular dependencies remain
  
  Labels: ["type: bug", "priority: critical", "architecture-violation", "status: pending"]
```

---

## 🏷️ Architecture-Specific Labels

### Type Label
- `type: architecture` - All architecture-related issues

### Priority Labels (for architecture issues)
- `priority: critical` - Circular dependencies, major violations
- `priority: high` - Pattern violations, constraint breaches
- `priority: medium` - Architecture improvements
- `priority: low` - Documentation updates, minor refactoring

### Special Labels
- `architecture-violation` - Code violating architectural patterns
- `architectural-debt` - Accumulated architectural issues
- `design-pattern` - Related to specific design patterns

---

## 📝 Issue Body Templates

### Architecture Decision Issue
```markdown
## Context
[What architectural problem are we solving?]

## Decision
[What architecture/pattern are we implementing?]

## Rationale
[Why this approach over alternatives?]

## Implementation Guidelines
- [Guideline 1]
- [Guideline 2]
- [Pattern to follow]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] All tests pass
- [ ] Documentation updated

## Files Affected
- `path/to/file1`
- `path/to/file2`

## Anti-patterns to Avoid
- [Anti-pattern 1]
- [Anti-pattern 2]

## Related Decisions
- Related to #[issue-number]
```

### Architecture Validation Issue
```markdown
## Violation Details
**File**: [file path]
**Line**: [line number]
**Violation**: [what's wrong]

## Expected Pattern
[What should be done instead]

## Current Code
```[language]
[problematic code]
```

## Expected Code
```[language]
[correct code]
```

## Fix Steps
- [ ] [Step 1]
- [ ] [Step 2]
- [ ] Add tests
- [ ] Update documentation

## Related Patterns
- [Pattern 1]
- [Pattern 2]

## Blocks
#[related-issue] (if applicable)
```

---

## 🔍 Query Examples for Plan Agent

### Find All Architecture Issues
```typescript
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"type: architecture\""
})
```

### Find Architecture Violations
```typescript
github-mcp-server-search_issues({
  query: "is:open label:\"architecture-violation\""
})
```

### Find Critical Architecture Issues
```typescript
github-mcp-server-search_issues({
  query: "is:open label:\"type: architecture\" label:\"priority: critical\""
})
```

### Review Completed Architecture Work
```typescript
github-mcp-server-search_issues({
  query: "is:closed label:\"type: architecture\""
})
```

---

## 🎯 Workflow Examples

### Example 1: Design New Architecture

**Scenario**: Need to design authentication architecture

**Workflow**:
```
1. Analyze requirements
   - Read Docs/Plan/detailed project description
   - Understand authentication needs

2. Document decision
   - Create architecture document
   - Evaluate options
   - Choose best approach

3. Create implementation issue
   Create GitHub Issue:
     Title: "Implement JWT authentication architecture"
     Body: [architecture decision template]
     Labels: ["type: architecture", "priority: high", "status: pending"]

4. Define validation criteria
   - Add acceptance criteria to issue
   - Define architectural constraints
   - Specify patterns to follow

5. Hand off to Auto Zen
   - Auto Zen implements architecture
   - Plan Agent validates compliance
```

---

### Example 2: Validate Architecture Compliance

**Scenario**: Review completed work for compliance

**Workflow**:
```
1. Query completed architecture issues
   github-mcp-server-search_issues({
     query: "is:closed label:\"type: architecture\""
   })

2. Review implementation
   - Check code against architectural patterns
   - Verify constraints followed
   - Identify violations

3. Create violation issues if needed
   For each violation:
     Create GitHub Issue:
       Title: "Fix architecture violation: [description]"
       Body: [validation issue template]
       Labels: ["type: refactor", "priority: high", "architecture-violation"]

4. Document findings
   github-mcp-server-issue_write({
     method: "add_comment",
     issue_number: original_issue,
     comment: "✅ Architecture compliance verified" OR
              "⚠️ Violations found: #[issue1], #[issue2]"
   })
```

---

### Example 3: Monitor Architectural Constraints

**Scenario**: Continuous monitoring for architectural issues

**Workflow**:
```
1. Scan codebase for violations
   - Check for circular dependencies
   - Verify layer boundaries
   - Validate patterns

2. Create issues for detected violations
   For each violation:
     Create GitHub Issue:
       Title: "CRITICAL: Circular dependency detected"
       Body: [constraint violation template]
       Labels: ["type: bug", "priority: critical"]

3. Track architectural debt
   github-mcp-server-search_issues({
     query: "is:open label:\"architectural-debt\""
   })

4. Prioritize fixes
   - Critical violations first
   - High-priority improvements next
   - Document in architectural roadmap
```

---

## ✅ Migration Checklist

- [x] Removed `barradevdigitalsolutions.zen-tasks-copilot/*` tools
- [x] Added `github-mcp-server-*` tools
- [x] Updated handoff prompts to use GitHub MCP tools
- [x] Updated architectural design loop to create GitHub Issues
- [x] Updated architecture validation to create GitHub Issues
- [x] Updated constraint monitoring to create GitHub Issues
- [x] Updated decision documentation to use issue comments
- [x] Verified all tool references are correct
- [x] Verified workflow patterns match other migrated agents
- [x] Created migration documentation

---

## 📚 References

- Main Migration Guide: `Docs/GitHub-Migration-Tool-Mapping.md`
- Auto Zen Migration: `Docs/GitHub-Migration/auto-zen-migration.md`
- Zen Planner Migration: `Docs/GitHub-Migration/zen-planner-migration.md`
- Testing Agent Migration: `Docs/GitHub-Migration/testing-agent-migration.md`
- GitHub Issues API: https://docs.github.com/en/rest/issues

---

**Migration Completed**: 2026-01-14  
**Verified By**: Autonomous Migration Process
