# GitHub Issues Migration - Tool Mapping Guide

**Created**: 2026-01-12  
**Purpose**: Complete mapping from zen-tasks_* tools to GitHub MCP tools  
**Status**: Active Migration Reference

---

## 🎯 Overview

This document provides the exact mapping from the old `zen-tasks_*` tool system to the new GitHub MCP server tools. Use this as the authoritative reference during agent migration.

---

## 📊 Tool Migration Mapping

### Core Workflow Tools

| Old Tool | New GitHub MCP Tool(s) | Notes |
|----------|------------------------|-------|
| `zen-tasks_000_workflow_context` | N/A - Remove | Load context from `Docs/Plan/` and GitHub Issues directly |
| `zen-tasks_list_tasks` | `github-mcp-server-list_issues` or `github-mcp-server-search_issues` | Use search_issues with filters for more control |
| `zen-tasks_get_task` | `github-mcp-server-issue_read` (method: get) | Returns full issue details |
| `zen-tasks_next_task` | `github-mcp-server-search_issues` with filters | Query with label filters for priority: `is:open label:"priority: high" sort:updated` or similar |
| `zen-tasks_add_task` | GitHub issue creation (via GitHub API) | Use appropriate GitHub tools to create issues |
| `zen-tasks_update_task` | GitHub issue update (via GitHub API) | Update issue body, labels, assignees, etc. |
| `zen-tasks_set_status` | GitHub issue state + labels | Use labels: `status: in-progress`, `status: blocked`, etc. |
| `zen-tasks_parse_requirements` | Custom logic + bulk issue creation | Parse requirements, then create multiple issues |

### Detailed Replacements

#### 1. `zen-tasks_000_workflow_context` → **REMOVE**

**Old Usage**:
```
Load Zen Tasks workflow context using zen-tasks_000_workflow_context
```

**New Approach**:
```
Load workflow context from:
- Docs/Plan/detailed project description
- Docs/Plan/feature list
- Query GitHub Issues for current state
```

**Implementation**:
- Read plan documents directly
- Use `github-mcp-server-list_issues` to get current task state
- No single "context loading" tool needed

---

#### 2. `zen-tasks_list_tasks` → `github-mcp-server-list_issues` or `github-mcp-server-search_issues`

**Old Usage**:
```
zen-tasks_list_tasks
```

**New Usage**:
```typescript
// List all issues in repository
github-mcp-server-list_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  state: "OPEN" | "CLOSED" | undefined,  // Optional filter
  labels: ["priority: high"],  // Optional filter
  perPage: 30,
  orderBy: "CREATED_AT",
  direction: "DESC"
})

// Or search with more control
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"type: feature\" label:\"priority: high\"",
  sort: "created",
  order: "desc"
})
```

---

#### 3. `zen-tasks_get_task` → `github-mcp-server-issue_read`

**Old Usage**:
```
zen-tasks_get_task(task_id)
```

**New Usage**:
```typescript
github-mcp-server-issue_read({
  method: "get",
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  issue_number: 123
})
```

**Returns**:
- Issue title, body, state, labels, assignees
- Comments, timestamps, metadata
- Sub-issues, dependencies (via body parsing)

---

#### 4. `zen-tasks_next_task` → `github-mcp-server-search_issues`

**Old Usage**:
```
zen-tasks_next_task  // Returns highest priority ready task
```

**New Usage**:
```typescript
// Get next ready task (highest priority, dependencies met, not blocked)
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open -label:\"status: blocked\" -label:\"status: in-progress\" sort:priority",
  perPage: 1
})

// Alternative: More specific filtering
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"status: approved\" label:\"priority: high\" -assignee:*",
  perPage: 1
})
```

**Logic**:
1. Query for open issues
2. Exclude blocked (`-label:"status: blocked"`)
3. Exclude in-progress (`-label:"status: in-progress"`)
4. Filter by priority labels (query critical first, then high, then medium, then low)
5. Return first result

---

#### 5. `zen-tasks_add_task` → GitHub Issue Creation

**Old Usage**:
```
zen-tasks_add_task({
  title: "Implement feature X",
  description: "...",
  priority: "high",
  dependencies: ["TASK-123"]
})
```

**New Usage**:
```typescript
// Note: Direct issue creation requires GitHub API call
// GitHub MCP may provide issue write tools or use GitHub API

// Create issue with proper labels and body structure
Create GitHub Issue:
  Title: "Implement feature X"
  Body: |
    ## Description
    [Feature description]
    
    ## Dependencies
    - Depends on #123
    - Depends on #124
    
    ## Test Strategy
    [Testing approach]
  
  Labels: ["type: feature", "priority: high", "status: pending"]
  Assignees: []
```

**Implementation Notes**:
- Use GitHub issue templates when available
- Embed dependencies in issue body (standardized format)
- Apply appropriate labels immediately
- Link to parent epic if applicable

---

#### 6. `zen-tasks_update_task` → GitHub Issue Update

**Old Usage**:
```
zen-tasks_update_task({
  task_id: "TASK-123",
  details: "Updated information",
  priority: "critical"
})
```

**New Usage**:
```typescript
// Update issue details
Update GitHub Issue #123:
  Body: [Updated description with new details]
  Labels: Add/Remove labels
  Assignees: Update assignee list
  State: open/closed
```

**Common Updates**:
- Add blocking information: Update body with blocker details
- Change priority: Remove old priority label, add new one
- Update progress: Add comment with status update
- Mark dependencies resolved: Update body, remove blocker label

---

#### 7. `zen-tasks_set_status` → GitHub Labels + State

**Old Usage**:
```
zen-tasks_set_status(task_id, "in_progress")
```

**New Usage**:
```typescript
// Status via labels and issue state
Update Issue #123:
  Labels: 
    - Remove: "status: pending"
    - Add: "status: in-progress"
  
  Assignee: @copilot (assign to self when in-progress)
```

**Status Label Mapping**:
| Old Status | GitHub State | GitHub Labels |
|------------|--------------|---------------|
| `pending` | `open` | `status: pending` |
| `approved` | `open` | `status: approved` |
| `in_progress` | `open` | `status: in-progress` + assignee |
| `blocked` | `open` | `status: blocked` |
| `review` | `open` | `status: review` |
| `testing` | `open` | `status: testing` |
| `completed` | `closed` | (none needed, state is closed) |
| `failed` | `closed` | `status: failed` |
| `cancelled` | `closed` | `status: cancelled` |

---

#### 8. `zen-tasks_parse_requirements` → Custom Logic + Bulk Creation

**Old Usage**:
```
zen-tasks_parse_requirements(requirements_text)
```

**New Usage**:
```
1. Parse requirements text manually or with AI assistance
2. Break down into individual tasks
3. Create GitHub issues for each task
4. Link related issues via dependencies
5. Apply proper labels and priorities
```

**Zen Planner Implementation**:
- Read requirements from user input or document
- Use AI to decompose into atomic tasks
- For each task: Create GitHub issue with proper structure
- Link dependencies in issue body
- Apply labels (type, priority, status)

---

## 🏷️ GitHub Labels Schema

### Type Labels (Required)
- `type: feature` - Feature implementation
- `type: bug` - Bug fix
- `type: refactor` - Code refactoring
- `type: maintenance` - Maintenance work
- `type: architecture` - Architecture decisions
- `type: testing` - Test creation/improvement
- `type: documentation` - Documentation updates

### Priority Labels (Required)
- `priority: critical` - Blocking all work, security, production down
- `priority: high` - Critical path, time-sensitive, unblocks multiple tasks
- `priority: medium` - Standard feature work, improvements
- `priority: low` - Nice-to-have, tech debt

### Status Labels (Workflow)
- `status: pending` - Not started (open issue, no assignee)
- `status: approved` - Ready to work (open, triaged)
- `status: in-progress` - Actively working (assignee set)
- `status: blocked` - Waiting on dependency
- `status: review` - Awaiting review
- `status: testing` - In testing phase
- `status: failed` - Closed - work attempted but failed or did not deliver as planned
- `status: cancelled` - Closed - work intentionally stopped or no longer needed

### Agent Labels (Optional)
- `agent: auto-zen` - Assigned to Auto Zen
- `agent: zen-planner` - Assigned to Zen Planner
- `agent: testing-agent` - Assigned to Testing Agent
- `agent: plan-agent` - Assigned to Plan Agent
- `agent: dependency-agent` - Assigned to Dependency Agent
- `agent: issue-handler` - Assigned to Issue Handler

---

## 📋 Issue Body Structure

### Standard Task Issue Template
```markdown
## Description
[What needs to be done and why]

## Scope
[What's included and what's excluded]

## Dependencies
- Depends on #123 (must complete first)
- Depends on #124 (must complete first)
- Related to #125 (soft dependency)

## Test Strategy
- [ ] Unit tests for X
- [ ] Integration tests for Y
- [ ] Manual verification of Z

## Acceptance Criteria
- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Coverage >80%
- [ ] Documentation updated
- [ ] No new lint errors

## Files Likely Affected
- `path/to/file1.ts`
- `path/to/file2.ts`

## Technical Approach
[Brief description of how to implement]

## Estimated Effort
[1-4 hours]

## Agent Notes
[Any special instructions for the executing agent]
```

---

## 🔄 Migration Patterns

### Pattern 1: Auto Zen Continuous Loop

**Old Pattern**:
```
1. Load workflow context (zen-tasks_000_workflow_context)
2. Get next task (zen-tasks_next_task)
3. Mark in-progress (zen-tasks_set_status)
4. Execute task
5. Mark done (zen-tasks_set_status)
6. Create follow-ups (zen-tasks_add_task)
7. Repeat
```

**New Pattern**:
```
1. Load plan context from Docs/Plan/
2. Query next task via github-mcp-server-search_issues
3. Update issue labels to in-progress + assign self
4. Execute task
5. Close issue (state: closed) or update labels
6. Create follow-up issues via GitHub
7. Repeat
```

### Pattern 2: Zen Planner Task Creation

**Old Pattern**:
```
1. Analyze requirements
2. Break into tasks
3. Use zen-tasks_add_task for each
4. Set dependencies
5. Assign priorities
```

**New Pattern**:
```
1. Analyze requirements (aligned with Docs/Plan/)
2. Break into atomic tasks
3. Create GitHub issues for each task
4. Link dependencies in issue body
5. Apply priority labels
6. Set status: pending or status: approved
```

### Pattern 3: Issue Handler Sync

**Old Pattern**:
```
GitHub Issue → Create zen-tasks task → Sync bidirectionally
```

**New Pattern**:
```
GitHub Issue IS the task → No sync needed → Direct management
```

---

## 🔍 Query Examples

### Get All Open Tasks
```typescript
github-mcp-server-list_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  state: "OPEN"
})
```

### Get High Priority Bugs
```typescript
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"type: bug\" label:\"priority: high\""
})
```

### Get My In-Progress Tasks
```typescript
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"status: in-progress\" assignee:@me"
})
```

### Get Blocked Tasks
```typescript
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"status: blocked\""
})
```

### Get Tasks Ready to Work
```typescript
// Note: Query by priority label, GitHub doesn't support sort:priority
github-mcp-server-search_issues({
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  query: "is:open label:\"status: approved\" label:\"priority: high\" -assignee:*"
})
```

---

## 📝 Agent-Specific Replacements

### Auto Zen
- **Primary tool**: `github-mcp-server-search_issues` (find next task)
- **Status updates**: Update labels via GitHub API
- **Follow-ups**: Create new issues
- **Context**: Read Docs/Plan/ directly + query issues

### Zen Planner
- **Primary tool**: Create GitHub issues in bulk
- **Dependencies**: Document in issue body
- **Priorities**: Apply as labels
- **Validation**: Query existing issues to avoid duplicates

### Testing Agent
- **Primary tool**: Create test-related issues
- **Tracking**: Update test coverage in issue body
- **Results**: Comment test results on issues

### Plan Agent
- **Primary tool**: Validate issues against Docs/Plan/
- **Architecture**: Comment on issues with guidance
- **Alignment**: Check issue body against plan

### Dependency Agent
- **Primary tool**: Parse issue bodies for dependencies
- **Analysis**: Create dependency visualization
- **Updates**: Create dependency update issues

### Issue Handler
- **Primary tool**: GitHub issues ARE the source
- **No sync needed**: Direct management
- **Triage**: Add labels and assignees

---

## ✅ Migration Checklist

For each agent file:
- [ ] Replace `zen-tasks_000_workflow_context` references
- [ ] Replace `zen-tasks_list_tasks` with `github-mcp-server-list_issues`
- [ ] Replace `zen-tasks_get_task` with `github-mcp-server-issue_read`
- [ ] Replace `zen-tasks_next_task` with search query logic
- [ ] Replace `zen-tasks_add_task` with issue creation
- [ ] Replace `zen-tasks_update_task` with issue update
- [ ] Replace `zen-tasks_set_status` with label updates
- [ ] Replace `zen-tasks_parse_requirements` with custom parsing
- [ ] Update workflow loop descriptions
- [ ] Update test suite sections
- [ ] Verify formatting and consistency

---

## 📚 References

- GitHub Issues API: https://docs.github.com/en/rest/issues
- GitHub Search Syntax: https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests
- GitHub Labels: https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels
- Original Task Format: `Docs/task-format-specification.md`

---

**Last Updated**: 2026-01-12  
**Status**: Migration In Progress
