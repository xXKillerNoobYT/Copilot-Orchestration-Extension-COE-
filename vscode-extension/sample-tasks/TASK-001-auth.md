---
id: TASK-001
title: Authentication flow skeleton
type: feature
priority: high
status: pending
dependencies: []
assignees: [planner]
labels: [auth, backend]
estimate: "4h"
subtasks:
  - id: TASK-001A
    title: Login form skeleton
    priority: medium
  - id: TASK-001B
    title: Session persistence wiring
    priority: medium
  - id: TASK-001C
    title: Basic validation and errors
    priority: medium
---

## Goal

Create the foundational authentication flow scaffolding so subsequent tasks can layer on security and UX.

## Acceptance

- Landing page links to Login
- Login form renders email/password inputs and submit button
- Fake submit handler logs payload to console for now
- Placeholder area for error display is present
- No backend integration yet (stub only)
