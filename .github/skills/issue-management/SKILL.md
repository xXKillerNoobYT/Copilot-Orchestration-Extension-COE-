---
name: issue-management
description: Monitor GitHub Issues, convert them to structured work, triage and label incoming issues, manage issue lifecycle, and detect duplicates
---

# Issue Management Skill

Manage GitHub Issues as the primary task system: triage incoming issues, convert to structured work, manage lifecycle, and coordinate across repositories.

## When to Use This Skill

- New GitHub Issue created
- Issue needs triage and labeling
- Convert external bug report to internal issue
- Detect duplicate issues
- Manage issue lifecycle (open → in-progress → closed)

## What This Skill Does

1. **Monitor Issues**: Watch for new/updated GitHub Issues
2. **Triage**: Analyze and categorize new issues
3. **Label**: Apply appropriate type, priority, status labels
4. **Structure**: Convert unstructured issues to proper format
5. **Detect Duplicates**: Find and link duplicate issues
6. **Lifecycle**: Track issues from creation to completion
7. **Metrics**: Report on issue velocity and health

## Step-by-Step Procedure

### Phase 1: Issue Monitoring
```
CONTINUOUS MONITORING:
Every hour (or webhook-triggered):
1. Query new issues (is:open, created:>1h)
2. Query updated issues (is:open, updated:>1h)
3. Check for mentions/assignments
4. Monitor pull request status
5. Track milestone progress
```

### Phase 2: Triage New Issue
```
UPON NEW ISSUE:
1. Read issue title + body
2. Classify type:
   - Bug report
   - Feature request
   - Question
   - Enhancement
   - Documentation

3. Assess urgency:
   - Production down → CRITICAL
   - Major feature broken → HIGH
   - Minor bug → MEDIUM
   - Enhancement → LOW

4. Check for duplicates:
   - Search similar titles
   - Check keywords
   - Compare descriptions
```

### Phase 3: Labeling
```
Apply labels systematically:

TYPE LABELS (required):
- type: feature - New functionality
- type: bug - Something broken
- type: refactor - Code improvement
- type: maintenance - Upkeep work
- type: architecture - Structural change
- type: testing - Test creation
- type: documentation - Doc updates

PRIORITY LABELS (required):
- priority: critical - Blocking all work
- priority: high - Critical path
- priority: medium - Standard work
- priority: low - Nice-to-have

STATUS LABELS (required):
- status: pending - Not started
- status: approved - Ready for work
- status: in-progress - Active work
- status: blocked - Waiting on dependency
- status: review - In code review
- status: testing - In QA
```

### Phase 4: Structure Conversion
```
If issue lacks proper structure:

1. Extract key information:
   - What needs to be done
   - Why it's needed
   - How to verify completion

2. Reformat issue body:
   ## Description
   [What and why]

   ## Implementation Details
   [Approach, files, edge cases]

   ## Test Strategy
   [How to verify]

   ## Dependencies
   Depends on: #X (if any)

3. Add acceptance criteria:
   - [ ] Criterion 1
   - [ ] Criterion 2

4. Comment on original issue:
   "Issue reformatted for clarity. See updated description."
```

### Phase 5: Duplicate Detection
```
SEARCH STRATEGY:
1. Extract keywords from title
2. Search existing issues:
   is:issue [keywords]

3. Compare:
   - Same root cause?
   - Same symptoms?
   - Same proposed solution?

IF DUPLICATE FOUND:
1. Comment on new issue:
   "Duplicate of #123"
2. Add label: duplicate
3. Close new issue
4. Link in original issue:
   "Duplicate: #456"
```

### Phase 6: Assignment
```
AUTO-ASSIGN based on labels:
- type: architecture → Plan Agent
- type: testing → Testing Agent
- type: bug → Issue Handler
- type: feature + priority: high → Auto Zen
- type: maintenance + dependencies → Dependency Agent

OR user can manually assign:
/assign @agent-name
```

### Phase 7: Lifecycle Management
```
TRACK STATUS TRANSITIONS:
pending → approved (triaged + ready)
approved → in-progress (work started)
in-progress → blocked (blocker found)
blocked → in-progress (blocker resolved)
in-progress → review (PR created)
review → testing (PR merged)
testing → closed (verified working)

ALERT ON:
- Stale issues (open >7 days, no activity)
- Blocked issues (need investigation)
- High-priority pending (not assigned)
```

## Expected Input

**Raw Bug Report**:
```markdown
Title: Login not working

When I try to login, I get an error. Please fix.
```

**Structured Version (After Triage)**:
```markdown
# Bug: Login endpoint returns 500 error

## Description
Login form submission returns 500 Internal Server Error instead of creating user session.

**Reproduce**:
1. Navigate to /login
2. Enter valid credentials
3. Click "Login" button
4. Observe 500 error

**Expected**: User logged in, redirected to dashboard
**Actual**: 500 error, user remains on login page

## Investigation
- Error appears in server logs: "Cannot read property 'id' of undefined"
- Likely null user object in session creation
- Started occurring after PR #789 merged

## Fix Approach
1. Add null check in AuthController::login()
2. Return proper 401 error if user not found
3. Add unit test for invalid credentials
4. Add integration test for full login flow

## Test Strategy
**Unit**: Test AuthController::login with null user
**Integration**: Full login workflow with invalid creds
**Regression**: Ensure PR #789 functionality still works

## Dependencies
None

Labels: type: bug, priority: high, status: approved
Assigned: @Issue-Handler
```

## Expected Output

**Triage Report**:
```markdown
## Issues Triaged: 10

### Critical (1)
- #501: Production database connection failing ⚠️ URGENT
  Assigned: @Issue-Handler
  Labels: type: bug, priority: critical, status: in-progress

### High Priority (3)
- #502: User authentication broken
- #503: Payment processing errors
- #504: Email delivery failing

### Medium Priority (4)
- #505: Improve search performance
- #506: Add export functionality
- #507: Update documentation
- #508: Refactor service layer

### Low Priority (2)
- #509: Add dark mode theme
- #510: Polish UI animations

### Duplicates Closed (2)
- #511 → Duplicate of #502
- #512 → Duplicate of #505
```

## Duplicate Detection Examples

**Search Patterns**:
```
Title: "Login not working"
Search: is:issue is:open "login" "not working" OR "login fails"

Title: "Slow database queries"
Search: is:issue is:open "database" "slow" OR "performance"

Title: "Email sending fails"
Search: is:issue is:open "email" "fail" OR "not sending"
```

## Integration with Other Skills

- **Planning**: Hands complex issues to [task-planning](./task-planning/SKILL.md)
- **Execution**: Routes ready issues to [task-execution](./task-execution/SKILL.md)
- **Architecture**: Escalates to [architecture-design](./architecture-design/SKILL.md)

## Configuration

**Label Taxonomy** (must exist in repo):
```
Types: feature, bug, refactor, maintenance, architecture, testing, documentation
Priorities: critical, high, medium, low
Statuses: pending, approved, in-progress, blocked, review, testing
Agents: auto-zen, zen-planner, testing-agent, plan-agent, issue-handler
```

**Auto-Assignment Rules**:
```yaml
- labels: [type: bug, priority: critical]
  assign: Issue-Handler
- labels: [type: architecture]
  assign: Plan-Agent
- labels: [type: testing]
  assign: Testing-Agent
```

**Stale Issue Criteria**:
```
Warn: Open >7 days, no activity
Close: Open >30 days, no activity, label: wont-fix
```

## References

- `.github/ISSUE_TEMPLATE/` - Issue templates
- `.github/copilot-instructions.md` - Issue Handler agent docs
- GitHub Issues API documentation
