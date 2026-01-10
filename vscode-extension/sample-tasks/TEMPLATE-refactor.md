---
id: REFACTOR-XXX
title: [Refactoring objective]
type: refactor
priority: medium
status: pending
dependencies: []
assignees: [architect, coder, tester]
labels: [refactor, tech-debt]
estimate: "6h"
format_version: "1.0"
subtasks:
  - [Analyze current code structure]
  - [Design new architecture]
  - [Implement refactoring in phases]
  - [Update tests]
  - [Verify no behavioral changes]
---

## Current State

[Description of existing code structure, architecture, or patterns]

## Problems

- [Technical debt issue 1]
- [Technical debt issue 2]
- [Code smell or maintainability concern]
- [Performance bottleneck]

## Proposed Changes

[Refactoring strategy, architectural improvements, design pattern applications]

## Migration Path

[How to transition existing code without breaking functionality]

1. [Phase 1 - Preparation]
2. [Phase 2 - Core refactoring]
3. [Phase 3 - Cleanup and optimization]

## Success Metrics

- [ ] [Code complexity reduced (e.g., cyclomatic complexity < 10)]
- [ ] [Test coverage maintained or improved]
- [ ] [Performance benchmarks met or improved]
- [ ] [No behavioral changes (all existing tests pass)]
- [ ] [Code review approval]

## Risks

[Potential issues during refactoring, rollback plan, areas requiring extra caution]

## AI Prompt (for agents)

- **Goal:** [One-liner objective for the AI]
- **Context:** [Relevant system/domain context the AI must consider]
- **Acceptance Criteria (bullet list):**
  - [Criterion 1]
  - [Criterion 2]
- **Expected Outputs:** [e.g., refactor commits, migration notes, updated tests]
- **Constraints/Guardrails:** [no behavior change, perf/SLOs, style guides, safety checks]

---

**Template Notes:**

- Use `REFACTOR-` prefix for refactoring task IDs
- Include `architect` in `assignees` for design review
- Set priority based on urgency:
  - `high`: Blocking new features, severe maintainability issues
  - `medium`: Improving code quality, reducing tech debt
  - `low`: Nice-to-have optimizations
- Add specific code areas in `labels` (e.g., `parser`, `database`, `auth-layer`)
- Estimates typically higher than features due to testing overhead
- **Critical**: Ensure all existing tests pass before and after refactoring
- Consider feature flags for gradual rollout of refactored code
- Document any API or interface changes for consumers
