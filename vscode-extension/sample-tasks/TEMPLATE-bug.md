---
id: BUG-XXX
title: [Concise bug description]
type: bug
priority: high
status: pending
dependencies: []
assignees: [coder, tester]
labels: [bug]
estimate: "2h"
github_issue_id: 0
github_issue_url: ""
format_version: "1.0"
---

## Problem

[Clear description of the defect or unexpected behavior]

## Steps to Reproduce

1. [First step]
2. [Second step]
3. [Third step]
4. [Observe the error/unexpected behavior]

## Expected Behavior

[What should happen under normal circumstances]

## Actual Behavior

[What currently happens that is incorrect]

## Root Cause

[Analysis of the underlying issue - can be filled in during investigation]

## Fix Approach

[Proposed solution and implementation strategy]

## Testing Plan

- [ ] [Test case 1 to verify fix]
- [ ] [Test case 2 to prevent regression]
- [ ] [Edge case validation]

---

**Template Notes:**

- Use `BUG-` prefix for bug task IDs (e.g., `BUG-015`)
- Set `priority` based on severity:
  - `critical`: Production down, data loss, security breach
  - `high`: Major feature broken, significant UX degradation
  - `medium`: Minor feature broken, workaround available
  - `low`: Cosmetic issues, low-impact quirks
- Link to GitHub Issue using `github_issue_id` and `github_issue_url` if applicable
- Include `tester` in `assignees` for verification
- Add reproduction environment details in labels (e.g., `production`, `chrome`, `mobile`)
- Provide browser/OS/version info in `labels` if relevant
- Root cause analysis can be updated as investigation progresses
