---
id: TASK-XXX
title: [Concise feature title]
type: feature
priority: medium
status: pending
dependencies: []
assignees: [planner, coder]
labels: [feature]
estimate: "4h"
due: ""
format_version: "1.0"
subtasks:
  - id: TASK-XXX-A
    title: [Subtask 1 title]
    priority: medium
    estimate: "1h"
  - id: TASK-XXX-B
    title: [Subtask 2 title]
    priority: medium
    estimate: "2h"
---

## Goal

[Clear objective statement - what capability are we building and why?]

## Acceptance Criteria

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]
- [ ] [Specific, testable criterion 4]

## Technical Approach

[High-level implementation strategy, key design decisions, technologies to use]

## Dependencies & Risks

[External factors that could impact delivery, integration points, open questions]

## AI Prompt (for agents)

- **Goal:** [One-liner objective for the AI]
- **Context:** [Relevant system/domain context the AI must consider]
- **Acceptance Criteria (bullet list):**
  - [Criterion 1]
  - [Criterion 2]
- **Expected Outputs:** [e.g., code changes, tests, docs]
- **Constraints/Guardrails:** [style guides, perf/SLOs, security/privacy limits]

---

**Template Notes:**

- Replace `TASK-XXX` with actual task ID (e.g., `TASK-042`)
- Update `title` with concise feature description
- Set `priority` based on business urgency: `critical` | `high` | `medium` | `low`
- Update `status` as work progresses: `pending` → `approved` → `in_progress` → `testing` → `review` → `completed`
- List prerequisite task IDs in `dependencies` array
- Assign relevant agent types to `assignees`: `planner`, `architect`, `coder`, `tester`, `reviewer`, `documentation`
- Add descriptive `labels` for categorization (e.g., `backend`, `frontend`, `auth`, `api`)
- Provide realistic `estimate` in human-readable format (`2h`, `30m`, `3d`)
- Set `due` date if deadline exists (ISO 8601 format: `YYYY-MM-DD`)
- Break down into `subtasks` for complex features
- Keep `format_version` at `1.0` for compatibility
