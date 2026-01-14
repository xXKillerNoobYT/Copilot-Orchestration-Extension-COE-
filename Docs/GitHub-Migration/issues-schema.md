# GitHub Issues Schema Specification

**Created**: 2026-01-13  
**Version**: 1.0  
**Status**: Active  
**Parent Epic**: #22

---

## 🎯 Overview

This document defines the comprehensive GitHub Issues schema that maps all _ZENTASKS task fields to GitHub's native features and custom fields. This schema serves as the foundation for migrating from the legacy task.json system to GitHub Issues as the single source of truth.

---

## 📊 Field Mapping: task.json → GitHub Issues

### Core Fields

| Current Field | GitHub Equivalent | Implementation | Notes |
|---------------|-------------------|----------------|-------|
| `id` | Issue number + custom field | Issue number (auto), `original-task-id` custom field | Issue # is primary, custom field for traceability |
| `title` | Issue title | Native GitHub field | Direct 1:1 mapping |
| `description` | Issue body (Summary section) | Markdown section in body | First section of issue body |
| `details` | Issue body (Details section) | Markdown section in body | Main content section |
| `testStrategy` | Issue body (Test Strategy section) | Markdown section in body | Checklist format recommended |
| `status` | Labels + Issue state | Labels: `status: *` | See Status Labels section |
| `priority` | Labels | Labels: `priority: *` | See Priority Labels section |
| `dependencies` | Issue body + sub-issues | "Depends on #123" syntax | Parsed from body, use sub-issues feature |
| `createdAt` | Issue created timestamp | Native GitHub field | Auto-populated by GitHub |
| `updatedAt` | Issue updated timestamp | Native GitHub field | Auto-populated by GitHub |
| `completionSummary` | Issue comment | Final comment before close | Added when closing issue |
| `assignedAgent` | Labels + Assignee | Labels: `agent: *`, assignee field | Agent label + GitHub assignee |
| `estimatedEffort` | Custom field | Dropdown custom field | 1h, 2h, 4h, 8h, 16h, 32h |
| `epicLink` | Custom field + body | Link in body, custom field | Link to parent epic issue |
| `tags` | Labels | GitHub labels | Additional categorization |

---

## 🏷️ Label Taxonomy

### Type Labels (Required - One per issue)

Defines the nature of work to be done.

| Label | Description | Color | Use Case |
|-------|-------------|-------|----------|
| `type: feature` | Feature implementation | `#0E8A16` (green) | New functionality, enhancements |
| `type: bug` | Bug fix | `#D73A4A` (red) | Defect fixes, error corrections |
| `type: refactor` | Code refactoring | `#FBCA04` (yellow) | Code improvements without changing behavior |
| `type: maintenance` | Maintenance tasks | `#7057FF` (purple) | Dependency updates, cleanup, housekeeping |
| `type: architecture` | Architecture decisions | `#0052CC` (blue) | Design decisions, system architecture |
| `type: testing` | Test creation/improvement | `#1D76DB` (dark blue) | Test suite additions, coverage improvements |
| `type: documentation` | Documentation updates | `#006B75` (teal) | Docs, guides, README updates |

**Usage Rules**:
- Every issue MUST have exactly one type label
- Applied at issue creation
- Can be changed during triage if misclassified

---

### Priority Labels (Required - One per issue)

Defines the urgency and importance of the work.

| Label | Description | Color | When to Use |
|-------|-------------|-------|-------------|
| `priority: critical` | Blocking all work | `#B60205` (dark red) | Production down, security vulnerability, all work blocked |
| `priority: high` | Critical path | `#D93F0B` (orange-red) | Time-sensitive, unblocks multiple tasks, critical path item |
| `priority: medium` | Standard work | `#FBCA04` (yellow) | Standard feature work, normal improvements |
| `priority: low` | Nice-to-have | `#0E8A16` (green) | Tech debt, nice-to-have features, future enhancements |

**Usage Rules**:
- Every issue MUST have exactly one priority label
- Applied at issue creation by Zen Planner
- Can be elevated/reduced based on changing circumstances
- Auto Zen queries by priority: critical → high → medium → low

**Priority Assignment Logic**:
```
IF blocks all other work OR security issue OR production down:
  priority: critical
ELSE IF on critical path OR unblocks 3+ tasks OR time-sensitive:
  priority: high
ELSE IF standard feature work OR normal improvement:
  priority: medium
ELSE:
  priority: low
```

---

### Status Labels (Workflow - One per issue)

Defines the current state of the work.

| Label | Description | Color | GitHub State | Assignee |
|-------|-------------|-------|--------------|----------|
| `status: pending` | Not started, needs triage | `#EDEDED` (light gray) | `open` | None |
| `status: approved` | Ready for work | `#BFD4F2` (light blue) | `open` | None |
| `status: in-progress` | Active work | `#FEF2C0` (light yellow) | `open` | Required |
| `status: blocked` | Waiting on dependency | `#E99695` (light red) | `open` | Optional |
| `status: review` | Awaiting code review | `#C5DEF5` (pale blue) | `open` | Required |
| `status: testing` | In testing phase | `#D4C5F9` (lavender) | `open` | Required |
| `status: done` | Completed successfully | N/A | `closed` | Optional |

**Special Status Labels** (for closed issues):
| Label | Description | Color | GitHub State |
|-------|-------------|-------|--------------|
| `status: failed` | Work attempted but failed | `#D73A4A` (red) | `closed` |
| `status: cancelled` | Intentionally stopped | `#6A737D` (gray) | `closed` |

**Workflow State Machine**:
```
pending → approved → in-progress → [review] → [testing] → done (closed)
                            ↓
                        blocked → (back to in-progress when unblocked)
```

**Usage Rules**:
- Every open issue MUST have exactly one status label
- `status: in-progress` REQUIRES assignee (Auto Zen assigns self)
- `status: blocked` REQUIRES comment explaining blocker
- When closing issue as done, remove status label (implicit via closed state)
- Use `status: failed` or `status: cancelled` for non-done closures

---

### Agent Labels (Optional - Assignment tracking)

Indicates which agent is responsible for or best suited to handle the issue.

| Label | Description | Color | Agent Profile |
|-------|-------------|-------|---------------|
| `agent: auto-zen` | Auto Zen tasks | `#C2E0C6` (pale green) | Autonomous code executor |
| `agent: zen-planner` | Planning tasks | `#BFD4F2` (pale blue) | Strategic task architect |
| `agent: testing-agent` | Testing tasks | `#D4C5F9` (lavender) | Quality assurance specialist |
| `agent: plan-agent` | Architecture tasks | `#FFD1DC` (pale pink) | System architecture & constraints |
| `agent: dependency-agent` | Dependency management | `#FFE4B5` (pale orange) | Relationship & workflow manager |
| `agent: issue-handler` | Issue triage | `#E1D5E7` (pale purple) | Bug triage & resolution |

**Usage Rules**:
- Optional but recommended
- Applied by Zen Planner during task creation
- Can have multiple agent labels if collaboration needed
- Used for filtering and agent-specific queries

---

## 🔧 Custom Fields (GitHub Projects Beta)

GitHub Projects (Beta) supports custom fields that can be added to issues.

### Recommended Custom Fields

| Field Name | Type | Options | Description | Required |
|------------|------|---------|-------------|----------|
| **Estimate** | Dropdown | 1h, 2h, 4h, 8h, 16h, 32h | Time estimate | No |
| **Agent Assigned** | Single select | Auto Zen, Zen Planner, Testing Agent, Plan Agent, Dependency Agent, Issue Handler | Primary agent responsible | No |
| **Epic Link** | URL | - | Link to parent epic issue | No |
| **Original Task ID** | Text | - | For migration traceability (e.g., TASK-xyz) | No |
| **Test Coverage** | Number | 0-100 | Test coverage percentage | No |
| **Complexity** | Dropdown | Low, Medium, High, Very High | Complexity rating | No |

**Implementation Notes**:
- Custom fields are per-project, not per-repository
- Requires GitHub Projects (Beta) setup
- Can be added incrementally
- Optional for Phase 1 migration (labels are sufficient)

---

## 📝 Issue Body Structure

### Standard Template

```markdown
## Description
[Clear description of what needs to be done and why]

## Scope
**Included**:
- Item 1
- Item 2

**Excluded**:
- Item 1
- Item 2

## Dependencies
- Depends on #123 (must complete first)
- Depends on #124 (must complete first)
- Related to #125 (soft dependency, informational)

## Test Strategy
- [ ] Unit tests for component X
- [ ] Integration tests for flow Y
- [ ] Manual verification of feature Z
- [ ] Coverage target: 80%+

## Acceptance Criteria
- [ ] Code compiles without errors
- [ ] All tests pass (100%)
- [ ] Code coverage >80%
- [ ] Documentation updated
- [ ] No new lint/type errors
- [ ] Manual testing complete

## Files Likely Affected
- `app/Services/ExampleService.php`
- `tests/Unit/Services/ExampleServiceTest.php`
- `docs/README.md`

## Technical Approach
[Brief description of implementation approach]

1. Step 1
2. Step 2
3. Step 3

## Estimated Effort
**Time**: 2-4 hours  
**Complexity**: Medium

## Agent Notes
[Any special instructions for the executing agent]

## Related Documentation
- [Link to design doc]
- [Link to API spec]
```

---

## 🔗 Dependency Handling

### Syntax

Use standardized syntax in the issue body:

```markdown
## Dependencies

### Hard Dependencies (Blocking)
- Depends on #123 - Must complete feature X first
- Depends on #124 - Requires API endpoint

### Soft Dependencies (Informational)
- Related to #125 - Similar work in parallel
- Blocks #126 - This must complete before #126 starts
```

### Sub-Issues Feature

GitHub's native sub-issues feature (currently in beta) can be used:
- Create parent issue (epic)
- Create child issues linked as sub-issues
- Parent shows progress automatically

### Dependency Validation

A GitHub Action can validate dependencies:
```yaml
# .github/workflows/validate-dependencies.yml
# Checks that:
# - All referenced issues exist
# - No circular dependencies
# - Blocked issues don't start before dependencies complete
```

---

## 📄 Issue Templates

Templates will be created in `.github/ISSUE_TEMPLATE/` directory.

### Template 1: feature-task.md

For feature implementation tasks.

**Filename**: `.github/ISSUE_TEMPLATE/feature-task.md`

**Labels**: `type: feature`, `status: pending`

**Content**: See Issue Templates section below

---

### Template 2: bug-task.md

For bug fixes and defect resolution.

**Filename**: `.github/ISSUE_TEMPLATE/bug-task.md`

**Labels**: `type: bug`, `status: pending`

**Content**: See Issue Templates section below

---

### Template 3: architecture-task.md

For architecture decisions and design work.

**Filename**: `.github/ISSUE_TEMPLATE/architecture-task.md`

**Labels**: `type: architecture`, `status: pending`

**Content**: See Issue Templates section below

---

### Template 4: testing-task.md

For test creation and coverage improvements.

**Filename**: `.github/ISSUE_TEMPLATE/testing-task.md`

**Labels**: `type: testing`, `status: pending`

**Content**: See Issue Templates section below

---

## 🔄 Migration Mapping Schema

### JSON Schema for task.json → GitHub Issue Conversion

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Task to GitHub Issue Mapping",
  "description": "Schema for converting _ZENTASKS task.json to GitHub Issues",
  "type": "object",
  "properties": {
    "taskId": {
      "type": "string",
      "description": "Original task ID (e.g., TASK-xyz)",
      "pattern": "^TASK-[a-z0-9]+-[a-z0-9]+$"
    },
    "githubIssue": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Issue title (from task.title)",
          "maxLength": 256
        },
        "body": {
          "type": "string",
          "description": "Issue body in Markdown (composed from description, details, testStrategy)"
        },
        "labels": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "type: feature", "type: bug", "type: refactor", "type: maintenance",
              "type: architecture", "type: testing", "type: documentation",
              "priority: critical", "priority: high", "priority: medium", "priority: low",
              "status: pending", "status: approved", "status: in-progress", "status: blocked",
              "status: review", "status: testing",
              "agent: auto-zen", "agent: zen-planner", "agent: testing-agent",
              "agent: plan-agent", "agent: dependency-agent", "agent: issue-handler"
            ]
          },
          "minItems": 2,
          "description": "At least one type and one priority label required"
        },
        "assignees": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "GitHub usernames to assign"
        },
        "milestone": {
          "type": "string",
          "description": "Milestone title or number"
        }
      },
      "required": ["title", "body", "labels"]
    },
    "customFields": {
      "type": "object",
      "properties": {
        "originalTaskId": {
          "type": "string",
          "description": "Original task ID for traceability"
        },
        "estimate": {
          "type": "string",
          "enum": ["1h", "2h", "4h", "8h", "16h", "32h"],
          "description": "Time estimate"
        },
        "agentAssigned": {
          "type": "string",
          "enum": ["Auto Zen", "Zen Planner", "Testing Agent", "Plan Agent", "Dependency Agent", "Issue Handler"]
        },
        "epicLink": {
          "type": "string",
          "format": "uri",
          "description": "URL to parent epic"
        }
      }
    },
    "dependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "taskId": {
            "type": "string",
            "description": "Dependent task ID"
          },
          "issueNumber": {
            "type": "integer",
            "description": "GitHub issue number (if already migrated)"
          },
          "type": {
            "type": "string",
            "enum": ["depends_on", "blocks", "related_to"],
            "description": "Dependency type"
          }
        },
        "required": ["taskId", "type"]
      }
    },
    "migrationMetadata": {
      "type": "object",
      "properties": {
        "migratedAt": {
          "type": "string",
          "format": "date-time"
        },
        "migratedBy": {
          "type": "string"
        },
        "migrationVersion": {
          "type": "string"
        },
        "validationStatus": {
          "type": "string",
          "enum": ["pending", "validated", "failed"]
        }
      }
    }
  },
  "required": ["taskId", "githubIssue"]
}
```

### Example Mapping

```json
{
  "taskId": "TASK-mk7jzjst-kmidr",
  "githubIssue": {
    "title": "PHASE 3: Plan Builder - Integration with MCP Backend",
    "body": "## Description\n\nWire Plan Builder to MCP backend...\n\n## Dependencies\n- Depends on #15\n\n## Test Strategy\n- [ ] Unit tests...",
    "labels": [
      "type: feature",
      "priority: high",
      "status: pending",
      "agent: auto-zen"
    ],
    "assignees": [],
    "milestone": "Phase 3"
  },
  "customFields": {
    "originalTaskId": "TASK-mk7jzjst-kmidr",
    "estimate": "4h",
    "agentAssigned": "Auto Zen"
  },
  "dependencies": [
    {
      "taskId": "TASK-mk7jzlhj-kozt7",
      "issueNumber": 15,
      "type": "depends_on"
    }
  ],
  "migrationMetadata": {
    "migratedAt": "2026-01-13T00:00:00Z",
    "migratedBy": "migration-script",
    "migrationVersion": "1.0",
    "validationStatus": "validated"
  }
}
```

---

## 🚀 Migration Strategy

### Phase 1: Label Creation
1. Run label creation script
2. Verify all labels created with correct colors
3. Document label usage in wiki

### Phase 2: Template Setup
1. Create issue templates
2. Test each template
3. Update repository settings

### Phase 3: Bulk Migration
1. Export tasks from tasks.json
2. For each task:
   - Map fields using schema
   - Create GitHub issue
   - Apply labels
   - Set custom fields
   - Link dependencies
3. Validate migration
4. Archive _ZENTASKS

### Phase 4: Validation
1. Verify all tasks migrated
2. Check dependency links
3. Validate label consistency
4. Test agent workflows
5. Archive legacy system

---

## ✅ Success Criteria

- [ ] Complete field mapping documented
- [ ] All 24 labels defined with colors
- [ ] 4 issue templates created
- [ ] Migration JSON schema validated
- [ ] Dependency syntax documented
- [ ] Custom fields specification complete
- [ ] Migration strategy documented
- [ ] Schema reviewed and approved

---

## 📚 References

- [GitHub Issues API](https://docs.github.com/en/rest/issues)
- [GitHub Labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels)
- [GitHub Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
- [GitHub Projects (Beta)](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
- [Migration Roadmap](./MIGRATION-ROADMAP.md)
- [Tool Mapping Guide](../GitHub-Migration-Tool-Mapping.md)

---

**Version**: 1.0  
**Last Updated**: 2026-01-13  
**Status**: Active  
**Next Review**: After migration completion
