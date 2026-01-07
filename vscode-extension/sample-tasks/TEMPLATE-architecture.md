---
id: ADR-XXX
title: [Architecture decision title]
type: architecture
priority: medium
status: pending
dependencies: []
assignees: [architect]
labels: [architecture, adr, design]
estimate: "3h"
format_version: "1.0"
---

## Context

[Background information, problem statement, and motivations for this architectural decision]

## Decision

[The architectural choice being documented - be specific and clear]

## Rationale

[Why this approach was selected over alternatives]

### Key Benefits

- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

### Alignment with Goals

[How this decision supports project objectives, constraints, or requirements]

## Alternatives Considered

### Option 1: [Alternative approach name]

**Pros:**

- [Advantage 1]
- [Advantage 2]

**Cons:**

- [Disadvantage 1]
- [Disadvantage 2]

**Rejection Reason:** [Why this was not chosen]

### Option 2: [Another alternative]

**Pros:**

- [Advantage 1]

**Cons:**

- [Disadvantage 1]

**Rejection Reason:** [Why this was not chosen]

## Consequences

### Positive

- [Positive consequence 1]
- [Positive consequence 2]

### Negative

- [Negative consequence 1 / trade-off]
- [Negative consequence 2 / limitation]

### Neutral

- [Trade-off or neutral impact]

## Implementation Notes

[Guidance for developers implementing this decision]

- [Implementation guideline 1]
- [Implementation guideline 2]
- [Code patterns to follow]
- [Patterns to avoid]

## Related Decisions

[Links to related ADRs, superseded decisions, or dependent choices]

- [Related ADR-001: Database selection]
- [Supersedes: ADR-015 (old caching strategy)]

## Validation

- [ ] [Validation criterion 1 - how to verify this decision is working]
- [ ] [Validation criterion 2]

## AI Prompt (for agents)

- **Goal:** [One-liner objective for the AI]
- **Context:** [System/domain context and constraints relevant to the ADR]
- **Acceptance Criteria (bullet list):**
  - [Criterion 1]
  - [Criterion 2]
- **Expected Outputs:** [e.g., ADR summary, decision table, diagrams, action items]
- **Constraints/Guardrails:** [non-negotiables such as security, latency, cost ceilings]

---

**Template Notes:**

- Use `ADR-` prefix for Architecture Decision Records (e.g., `ADR-007`)
- ADRs should be **immutable** once approved - create new ADRs to revise decisions
- Assign to `architect` agent for design authority
- Set `priority`:
  - `critical`: Foundational decisions affecting entire system
  - `high`: Major subsystem or integration decisions
  - `medium`: Module-level or pattern decisions
  - `low`: Nice-to-have standardizations
- Include diagrams in implementation notes (use Mermaid, PlantUML, or image links)
- Tag with affected areas: `frontend`, `backend`, `database`, `deployment`, `security`
- Link to related tasks that depend on or implement this decision
- Consider creating follow-up implementation tasks
- Update this ADR if consequences change during implementation (add "## Updates" section)
