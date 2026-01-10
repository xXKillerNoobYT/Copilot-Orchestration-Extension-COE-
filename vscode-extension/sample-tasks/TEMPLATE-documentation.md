---
id: DOC-XXX
title: [Documentation objective]
type: documentation
priority: medium
status: pending
dependencies: []
assignees: [documentation]
labels: [docs]
estimate: "3h"
format_version: "1.0"
subtasks:
  - [Research existing code/feature]
  - [Draft documentation content]
  - [Add code examples]
  - [Review for accuracy]
---

## Audience

[Who will use this documentation - developers, end users, DevOps, architects?]

## Scope

[What topics, features, APIs, or workflows to document]

- [Topic 1]
- [Topic 2]
- [Topic 3]

## Deliverables

- [ ] [API reference documentation]
- [ ] [User guide / tutorial]
- [ ] [Architecture diagrams]
- [ ] [Code examples / snippets]
- [ ] [Troubleshooting guide]
- [ ] [Changelog entry]

## Format

[Documentation format and location]

- **Format:** [Markdown, JSDoc, OpenAPI/Swagger, Storybook, etc.]
- **Location:** [e.g., `docs/`, inline comments, README, Wiki]
- **Style Guide:** [e.g., Microsoft Writing Style Guide, Google Developer Docs]

## Content Outline

### Section 1: [Introduction / Overview]

[What this section covers]

### Section 2: [Getting Started / Installation]

[Quick start guide, prerequisites, setup steps]

### Section 3: [Core Concepts / Usage]

[Main functionality, key features, common workflows]

### Section 4: [API Reference]

[Detailed API documentation, parameters, return values]

### Section 5: [Examples & Tutorials]

[Practical code samples, step-by-step walkthroughs]

### Section 6: [Advanced Topics]

[Edge cases, performance tuning, customization]

### Section 7: [Troubleshooting]

[Common errors, FAQ, debugging tips]

## Examples & Tutorials

[Code samples to include, use cases to demonstrate]

### Example 1: [Basic usage]

```typescript
// Code sample showing typical usage
```

### Example 2: [Advanced scenario]

```typescript
// Code sample for complex use case
```

## Success Criteria

- [ ] Documentation is accurate and up-to-date
- [ ] All code examples tested and functional
- [ ] Reviewed by subject matter expert
- [ ] Passes accessibility/readability checks
- [ ] Diagrams clear and properly labeled
- [ ] Links validated (no broken references)

## Review & Validation

[Who should review, validation checklist]

- **Technical Review:** [SME or code owner]
- **Editorial Review:** [Technical writer or docs team]
- **User Testing:** [Sample end-user validation if applicable]

## AI Prompt (for agents)

- **Goal:** [One-liner objective for the AI]
- **Context:** [Audience, product area, and source materials]
- **Acceptance Criteria (bullet list):**
  - [Criterion 1]
  - [Criterion 2]
- **Expected Outputs:** [e.g., doc sections, code samples, diagrams, changelog]
- **Constraints/Guardrails:** [style guide, reading level, link validation, accessibility]

---

**Template Notes:**

- Use `DOC-` prefix for documentation task IDs
- Assign to `documentation` agent
- Set `priority`:
  - `critical`: Security docs, compliance requirements, release blockers
  - `high`: New feature docs, public API changes
  - `medium`: Improvements, additional examples, refactoring docs
  - `low`: Nice-to-have guides, advanced topics
- Add specific doc type labels: `api-docs`, `user-guide`, `architecture`, `changelog`
- Link to related feature/refactor tasks in `dependencies`
- Include code examples that are **tested and functional**
- Consider audience technical level (beginner, intermediate, expert)
- Use diagrams for complex concepts (Mermaid, PlantUML, Lucidchart)
- Ensure docs are versioned with code (e.g., `/docs` in same repo)
- Follow consistent formatting and terminology
- **Best Practice:** Update docs in same PR as code changes
