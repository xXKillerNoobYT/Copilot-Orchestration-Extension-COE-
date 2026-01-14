---
name: task-planning
description: Analyze requirements and decompose complex work into atomic, dependency-aware GitHub Issues with proper priorities, test strategies, and implementation plans
---

# Task Planning Skill

Transform vague ideas and requirements into structured, actionable GitHub Issues with clear dependencies and execution plans.

## When to Use This Skill

- User provides raw requirements or feature requests
- Complex feature needs breakdown into manageable tasks
- Need to create project roadmap from vision
- Planning epic features with multiple sub-tasks

## What This Skill Does

1. **Analyze Requirements**: Parse and understand user request
2. **Decompose Work**: Break into atomic, testable tasks
3. **Map Dependencies**: Identify hard and soft dependencies
4. **Assign Priorities**: Determine critical path and ordering
5. **Define Tests**: Specify how to verify each task
6. **Create Issues**: Generate GitHub Issues with proper structure
7. **Link Sub-issues**: Establish parent-child relationships

## Step-by-Step Procedure

### Phase 1: Requirements Analysis
```
INPUT: Raw requirements, feature request, or idea

1. Read Docs/Plan/detailed project description
2. Read Docs/Plan/feature list
3. Analyze scope and complexity
4. Identify distinct deliverables
5. Map to existing plan objectives
```

### Phase 2: Task Decomposition
```
For each deliverable:
1. Break into atomic tasks (15-45 min each)
2. Ensure each task is:
   - Atomic (one clear action)
   - Testable (can verify completion)
   - Independent (minimal blocking)
   - Valuable (delivers something)

Rules:
- Task >60 min → Split into sub-tasks
- Task with >3 actions → Decompose further
- Task spans multiple domains → Split by domain
- Title has "and" → Likely needs splitting
```

### Phase 3: Dependency Mapping
```
For each task:
1. Identify dependencies:
   - Hard (must complete first)
   - Soft (helpful but not required)

2. Detect circular dependencies
3. Order by critical path
4. Identify parallel execution opportunities
```

### Phase 4: Priority Assignment
```
Priority Matrix:
- CRITICAL: Blocking all work, security, production down
- HIGH: Critical path, time-sensitive, unblocks multiple
- MEDIUM: Standard feature work, improvements
- LOW: Nice-to-have, tech debt, polish

Consider:
- Business value
- Risk/urgency
- Dependency impact
- Resource availability
```

### Phase 5: Test Strategy Definition
```
For each task, define:
- Unit tests (what functions to test)
- Integration tests (what workflows to verify)
- E2E tests (what user journeys to validate)
- Acceptance criteria (how to know it's done)
```

### Phase 6: Issue Creation
```
For each task, create GitHub Issue:

Title: TASK: [Verb + Clear Object]

## Description
What, Why, Scope

## Implementation Details
- Approach
- Files to modify
- Edge cases
- Related docs

## Dependencies
Depends on: #123, #124

## Test Strategy
- Unit: Test X, Y, Z
- Integration: Verify workflow A
- E2E: User can do B

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Labels:
- type: [feature|bug|refactor]
- priority: [critical|high|medium|low]
- status: pending
```

### Phase 7: Sub-issue Linking
```
If creating epic with sub-tasks:
1. Create parent epic issue
2. Create child sub-issues
3. Link via GitHub sub-issue API
4. Document dependencies in issue body
```

## Expected Input

**User Request Examples**:
- "Plan implementation of user authentication"
- "Break down this feature into tasks"
- "Create roadmap for Q1 features"
- "I need to build [feature description]"

**Requirements Format**:
```
Feature: User Authentication

Users should be able to:
- Register with email/password
- Log in with credentials
- Reset forgotten passwords
- Update profile information
- Log out

Must integrate with existing user database.
Should support OAuth in future.
```

## Expected Output

**Epic Issue**:
```markdown
# EPIC: User Authentication System

## Overview
Complete user authentication with registration, login, password reset, and profile management.

## Sub-tasks
- #101: Database schema for users table
- #102: Registration endpoint and validation
- #103: Login endpoint with JWT tokens
- #104: Password reset workflow
- #105: Profile update endpoint
- #106: Logout and session management
- #107: Integration tests for auth flows
- #108: E2E tests for user journeys

## Timeline
Est. 16 hours (2 days with 2 developers)

Labels: epic, type: feature, priority: high
```

**Sub-issue Example**:
```markdown
# TASK: Implement registration endpoint

## Description
Create POST /api/auth/register endpoint that accepts email/password and creates new user account.

## Implementation Details
- File: app/Http/Controllers/AuthController.php
- Validation: Email format, password strength (8+ chars)
- Hash password with bcrypt
- Create user record
- Return 201 with user ID
- Handle duplicate email (return 409)

## Dependencies
Depends on: #101 (database schema)

## Test Strategy
**Unit Tests**:
- Valid registration creates user
- Invalid email returns 422
- Weak password returns 422
- Duplicate email returns 409

**Integration Tests**:
- Full registration workflow end-to-end
- User can login after registration

## Acceptance Criteria
- [ ] Endpoint accepts email/password
- [ ] Password hashed before storage
- [ ] Returns 201 on success
- [ ] Returns 409 on duplicate
- [ ] All tests pass

Labels: type: feature, priority: high, status: pending
```

## Microtasking Rules

**Enforce 15-45 minute tasks**:
```
Signs task is too large:
- Estimated >60 minutes
- >3 distinct actions
- Spans multiple files/domains
- Has "and" in title
- Unclear how to start

Solution: Split into smaller sub-tasks
```

**Example Decomposition**:
```
BEFORE (too large):
"Implement user authentication and authorization system"

AFTER (properly decomposed):
1. "Create users database schema" (30 min)
2. "Build registration endpoint" (45 min)
3. "Build login endpoint with JWT" (45 min)
4. "Add password reset workflow" (30 min)
5. "Create authorization middleware" (30 min)
6. "Write integration tests" (45 min)
```

## Dependency Syntax

**In Issue Body**:
```markdown
**Depends on**: #123, #124
**Blocks**: #125, #126

(Also use GitHub sub-issue linking)
```

## Quality Checklist

Before creating issues, verify:
- [ ] All tasks atomic (single clear action)
- [ ] All tasks testable (can verify done)
- [ ] All tasks have implementation details
- [ ] Dependencies mapped
- [ ] No circular dependencies
- [ ] Priorities assigned logically
- [ ] Test strategies defined
- [ ] Tasks align with project plan

## Integration with Other Skills

- **Execution**: Hands off to [task-execution](./task-execution/SKILL.md)
- **Architecture**: Consults [architecture-design](./architecture-design/SKILL.md)
- **Testing**: Coordinates with [test-generation](./test-generation/SKILL.md)

## References

- `Docs/Plan/detailed project description` - Project vision
- `Docs/Plan/feature list` - Planned features
- `.github/copilot-instructions.md` - Zen Planner agent instructions
- [GitHub Sub-issues Documentation](https://docs.github.com/en/issues)
