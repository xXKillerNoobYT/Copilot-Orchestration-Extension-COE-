---
name: task-execution
description: Execute development tasks autonomously by reading GitHub Issues, implementing solutions, running tests, and managing the full development lifecycle until completion
---

# Task Execution Skill

Execute development tasks with full autonomy, from issue selection to completion verification.

## When to Use This Skill

-   User requests autonomous task execution
-   Need to work through a backlog of GitHub Issues
-   Implementing features or fixes from structured issues
-   Running continuous development loops

## What This Skill Does

1. **Load Context**: Reads project plan from `Docs/Plan/` folder
2. **Query Issues**: Searches GitHub Issues for ready work
3. **Select Task**: Picks highest-priority issue with met dependencies
4. **Implement**: Writes code, updates files, runs tests
5. **Verify**: Ensures tests pass, no lint errors, changes work
6. **Complete**: Closes issue with summary or updates labels
7. **Observe**: Creates follow-up issues for discovered work
8. **Loop**: Repeats until all issues complete

## Step-by-Step Procedure

### Phase 1: Context Loading

```
1. Read Docs/Plan/detailed project description
2. Read Docs/Plan/feature list
3. Load current project state from filesystem
4. Query open GitHub Issues
```

### Phase 2: Issue Selection

```
1. Filter issues:
   - is:open
   - NOT label:"status: blocked"
   - NOT label:"status: in-progress"
   - Dependencies met (check sub-issues)

2. Sort by priority:
   - priority: critical (first)
   - priority: high
   - priority: medium
   - priority: low

3. Select highest priority issue
```

### Phase 3: Implementation

```
1. Update issue labels: status: in-progress
2. Read full issue body + details
3. Identify files to modify
4. Implement changes (code, tests, docs)
5. Run tests and linting
6. Verify changes work correctly
```

### Phase 4: Verification Checklist

```
Before closing issue, verify:
- [ ] Code compiles/runs without errors
- [ ] Tests pass (new tests added if needed)
- [ ] No new lint/type errors
- [ ] Related docs updated
- [ ] Changes committed/staged
```

### Phase 5: Completion

```
1. Add issue comment with summary:
   - What was done
   - Files changed
   - Tests run + results
   - Follow-up issues created
   - Next steps recommendation

2. Close issue OR update labels to:
   - status: review (if PR needed)
   - status: testing (if QA needed)
   - status: done (if complete)

3. Commit changes with message:
   "Fixes #<issue-number>: <title>"
```

### Phase 6: Observation & Follow-ups

```
Create GitHub issues for:
- Code smells, duplication, complexity
- Lint/type errors discovered
- Missing test coverage
- Documentation gaps
- Security concerns
- Performance issues
```

## Expected Input

**User Request Examples**:

-   "Execute tasks autonomously"
-   "Work through the backlog"
-   "@Auto Zen start"
-   "Continue autonomous execution"

**Issue Format** (GitHub):

```markdown
Title: TASK: [Clear action verb + object]

## Description

What needs to be done and why

## Implementation Details

-   Approach
-   Files to modify
-   Edge cases to consider

## Test Strategy

How to verify completion

## Dependencies

Depends on: #123, #124

Labels: type: feature, priority: high, status: approved
```

## Expected Output

**Issue Comment**:

```markdown
## Implementation Complete ✅

**What was done:**

-   Implemented feature X in src/feature.ts
-   Added unit tests in tests/feature.test.ts
-   Updated documentation in docs/feature.md

**Files changed:** 5

-   src/feature.ts (+120, -0)
-   tests/feature.test.ts (+50, -0)
-   docs/feature.md (+30, -0)
-   package.json (+1, -1)
-   README.md (+5, -0)

**Tests run:** 24 passed, 0 failed
**Coverage:** 87% (+5%)

**Follow-up issues created:**

-   #456: Refactor feature helper for better testability
-   #457: Add integration tests for feature workflow

**Next steps:**
Ready for code review and merge to main.
```

**New Issues Created**:

-   Follow-up tasks for discovered work
-   Architecture improvements
-   Test coverage gaps
-   Documentation updates

## Error Handling

### If Tests Fail

```
1. DO NOT close issue
2. Debug test failures
3. Fix failing tests
4. Re-run tests
5. Only proceed when all tests pass
```

### If Blocker Encountered

```
1. Add label: status: blocked
2. Document blocker in issue comment
3. Create investigation issue
4. Move to next available issue
```

### If Scope Too Large

```
1. Comment on issue requesting decomposition
2. Hand off to Zen Planner for breakdown
3. Wait for sub-issues to be created
4. Resume with first sub-issue
```

## Integration with Other Skills

-   **Planning**: Uses [microtasking](./microtasking/SKILL.md) for task breakdown
-   **Testing**: Uses [test-generation](./test-generation/SKILL.md) for QA
-   **Deployment**: Uses [cloud-deployment](./cloud-deployment/SKILL.md) for production

## Quality Gates

Before marking task complete:

1. All tests must pass
2. Coverage must be ≥80% (or same as before)
3. No new lint/type errors
4. Documentation updated
5. Changes committed

## Configuration

**Required Plan Files**:

-   `Docs/Plan/detailed project description` - Project vision
-   `Docs/Plan/feature list` - Planned features

**Required GitHub Labels**:

-   `status: pending`, `status: approved`, `status: in-progress`
-   `priority: critical`, `priority: high`, `priority: medium`, `priority: low`
-   `type: feature`, `type: bug`, `type: refactor`, etc.

**Required Permissions**:

-   Read/write access to repository
-   Create/update/close GitHub Issues
-   Create branches and commits
-   Run CI/CD workflows

## References

-   GitHub Issues API documentation
-   Project plan in Docs/Plan/
-   `.github/copilot-instructions.md` - Full agent instructions
