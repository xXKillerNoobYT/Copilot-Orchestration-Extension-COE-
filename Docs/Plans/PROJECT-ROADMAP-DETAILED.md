# Project Roadmap: Super-Detailed Execution & Development

**Version**: 5.1  
**Date**: January 21, 2026  
**Status**: Comprehensive Multi-Phase Roadmap  

## Overview

This roadmap provides a detailed execution plan for the Code Master extension (COE), structured into phases, sprints, milestones, deliverables, dependencies, risks, test gates, user validation points, and success metrics. It respects the modular "one feature / one thing / one task / one area at a time" philosophy (v4.9) and aligns with current progress markers.

**Timeline Assumption**: Small team (1–3 core contributors) working full-time in Jackson, WY (MST timezone).

---

## Overall Timeline Summary

| Phase | Time Window              | Duration | Focus Theme                              | Completion Gate                          |
|-------|--------------------------|----------|------------------------------------------|------------------------------------------|
| Phase 1 | Jan 11 – Jan 28, 2026   | ~2.5 weeks | Planning Wizard & Core UX Foundation     | Functional interactive wizard + simulator |
| Phase 2 | Jan 28 – Feb 11, 2026   | 2 weeks  | Backend/AI Planning Depth + Modular Lock | Backend/AI path fully working + atomic enforcement |
| Phase 3 | Feb 11 – Feb 25, 2026   | 2 weeks  | Agent Teams, MCP Tools & Copilot Integration | All core MCP tools + Copilot Workspace delegation |
| Phase 4 | Feb 25 – Mar 11, 2026   | 2 weeks  | Plan Updating, Error Handling & Evolution | Full plan update lifecycle + self-improvement loop |
| Phase 5 | Mar 11 – Mar 25, 2026   | 2 weeks  | Context Management, RL & Polish          | Token-aware breaking + RL reward pipeline |
| Phase 6 | Mar 25 – Apr 8, 2026    | 2 weeks  | Testing, Beta & Launch Readiness         | 90%+ test coverage + private beta |
| Launch | Apr 8–15, 2026          | 1 week   | Marketplace Submission & Day-1 Support   | Public release (VS Code Marketplace)     |

**Total to MVP Launch**: ~12 weeks (mid-Jan to mid-Apr 2026)

---

## Phase 1 – Planning Wizard & Core UX Foundation (Jan 11 – Jan 28)

### Goal
Deliver a highly usable, adaptive planning interface that feels intelligent and fast.

### Sprint 1.1 – Triage & Adaptive Paths (Jan 11–18)

**Deliverables**:
- Triage questions (scale, focus, planning style)
- Dynamic question skipping/reordering logic (Vue computed)
- Basic path modes: MVP, Frontend, Backend, Full, Custom
- Sidebar "Active Path" indicator

**Dependencies**: 
- VS Code webview + Vue setup stable

**Test Gates**: 
- 8 E2E paths (MVP-backend, large-full, etc.)

**User Validation**: 
- Internal test – time to first plan <12 min

**Risks**: 
- Logic bugs in skip rules → mitigated by unit tests

### Sprint 1.2 – Real-Time Impact Simulator (Jan 18–25)

**Deliverables**:
- Rule-based simulator (tasks, timeline, risks)
- LM enrichment toggle + throttling
- Mermaid graph rendering with priority coloring
- Sidebar progress bar during simulation ("Calculating impact…")

**Dependencies**: 
- Token estimator (tiktoken) + embedding service (MiniLM)

**Test Gates**: 
- 20+ unit tests, 6 E2E sim scenarios

**User Validation**: 
- Beta users rate "helpfulness of simulator" ≥4/5

**Risks**: 
- LM latency → fallback to rules + cache

### Sprint 1.3 – Human Guardrails & Review (Jan 25–28)

**Deliverables**:
- Guardrail questions (domain entities, constraints)
- Stage 3 review screen with lock-in
- Undo/redo stack (local storage)
- Export: JSON + Markdown

**Dependencies**: 
- All prior sprints

**Test Gates**: 
- Full wizard E2E (backend/AI path)

**User Validation**: 
- "Did you feel in control?" survey

### Phase 1 Exit Criteria
- Wizard completes in <25 min for backend/AI users
- Simulator updates <500 ms
- ≥90% test coverage on wizard logic
- No critical UX bugs in triage/adaptation

---

## Phase 2 – Backend/AI Planning Depth + Modular Lock (Jan 28 – Feb 11)

### Goal
Make backend/AI planning exceptionally strong and enforce strict modularity.

### Sprint 2.1 – Backend/AI Question Expansion (Jan 28–Feb 4)

**Deliverables**:
- LLM config questions (deployment, context window, orchestration style)
- DB + vector store choices
- API/auth style selection
- Backend-specific simulator metrics (LLM calls/day, token pressure)

**Dependencies**: 
- Phase 1 simulator

**Test Gates**: 
- Backend path E2E, LLM question visibility

### Sprint 2.2 – Atomic Task Enforcement (Feb 4–11)

**Deliverables**:
- Task size validator (Planning + TO_DO)
- P1 single-active lock (Boss gate)
- Sidebar "Active Task" card + blocked queue
- One-task Copilot Workspace scoping

**Dependencies**: 
- TO_DO service + Orchestrator prompt templates

**Test Gates**: 
- Reject >45 min tasks, verify single-task handoff

**User Validation**: 
- "Did you feel overwhelmed?" score ≤2/5

### Phase 2 Exit Criteria
- Backend/AI path completes in <20 min
- 100% atomic task enforcement in tests
- No multi-concern tasks reach Coding AI

---

## Phase 3 – Agent Teams, MCP Tools & Copilot Integration (Feb 11 – Feb 25)

### Sprint 3.1 – MCP Tool Suite (Feb 11–18)

**Deliverables**:
- Full schemas + error handling for all tools (askQuestion, reportObservation, etc.)
- Copilot-compatible wrappers (SKILL.md + MCP call syntax)
- Non-immediate vs immediate tool distinction

**Dependencies**: 
- Phase 2 modular lock

### Sprint 3.2 – Agent & Copilot Delegation (Feb 18–25)

**Deliverables**:
- Boss + teams orchestration
- Delegation to Copilot for low-risk tasks
- Token brakes + user "Continue" button
- Next Action Window with tool-call prompts

**Test Gates**: 
- End-to-end delegation + report loop

### Phase 3 Exit Criteria
- All MCP tools pass validation + error paths
- Copilot Workspace delegation works for P3 tasks

---

## Phase 4 – Plan Updating, Error Handling & Evolution (Feb 25 – Mar 11)

### Sprint 4.1 – Full Plan Update Lifecycle (Feb 25–Mar 4)

**Deliverables**:
- Trigger detection + classification
- LM proposal + UV validation
- Safe apply + rollback
- Sidebar diff viewer

**Dependencies**: 
- Phase 3 agents

### Sprint 4.2 – Error Patterns & Self-Evolution (Mar 4–11)

**Deliverables**:
- Pattern detection engine
- Automatic UV proposals from patterns
- RL reward logging for updates

**Test Gates**: 
- Simulate 10 error patterns → UV generation

### Phase 4 Exit Criteria
- Full update cycle passes without manual fixes
- Critic proposes at least one valid template update

---

## Phase 5 – Context Management, RL & Polish (Mar 11 – Mar 25)

### Sprint 5.1 – Advanced Context Breaking (Mar 11–18)

**Deliverables**:
- Tiktoken + MiniLM integration
- All breaking strategies implemented
- Sidebar progress bar during breaking

**Test Gates**: 
- 10k token overflow sims

### Sprint 5.2 – RL Reward & Polish (Mar 18–25)

**Deliverables**:
- Reward function + logging
- Sidebar polish (error patterns panel, active task card)
- Beta-ready stability

**User Validation**: 
- Beta cohort feedback

### Phase 5 Exit Criteria
- Context never overflows in sims
- RL dataset generation started

---

## Phase 6 – Testing, Beta & Launch Readiness (Mar 25 – Apr 8)

### Deliverables
- 90%+ test coverage (unit + E2E)
- Private beta (5–10 users, including Jackson locals)
- Marketplace submission prep
- Day-1 support docs

### Launch Target
**April 8–15, 2026**

---

## Success Metrics by Phase

### Phase 1
- Planning wizard completion time: <25 min
- Simulator responsiveness: <500 ms
- User satisfaction: ≥4.2/5

### Phase 2
- Backend/AI path completion: <20 min
- Atomic task compliance: >95%
- P1 single-active enforcement: 100%

### Phase 3
- MCP tool validation pass rate: 100%
- Copilot delegation success: ≥85%

### Phase 4
- Plan update cycle completion: >95% without manual intervention
- Error recurrence reduction: >50% after evolution

### Phase 5
- Token overflow incidents: 0
- RL dataset quality score: ≥0.7

### Phase 6
- Test coverage: ≥90%
- Beta user satisfaction: ≥4.5/5
- Critical bugs before launch: 0

---

## Risk Management

### High Risks
1. **LM Performance**: 14B model latency/quality issues
   - **Mitigation**: Rule-based fallbacks, caching, prompt optimization

2. **Copilot API Changes**: Breaking changes from GitHub
   - **Mitigation**: Version pinning, regular API monitoring

3. **Scope Creep**: Feature additions during development
   - **Mitigation**: Strict PRD adherence, atomic task enforcement

### Medium Risks
1. **User Adoption**: Complex UI overwhelming users
   - **Mitigation**: Extensive UX testing, adaptive flows

2. **Integration Complexity**: VS Code + Copilot + MCP coordination
   - **Mitigation**: Modular architecture, thorough testing

---

## Resource Allocation

### Team Composition (Assumed)
- 1 Lead Developer (full-stack + AI)
- 1 Frontend/UX Developer
- 1 Backend/AI Specialist (part-time)
- 1 QA/Testing (part-time)

### Time Allocation by Phase
- Phase 1: 40% planning, 30% implementation, 30% testing
- Phase 2-4: 30% planning, 50% implementation, 20% testing
- Phase 5-6: 20% planning, 30% implementation, 50% testing

---

## Dependencies & Prerequisites

### Infrastructure
- VS Code Extension Development Environment
- Node.js 18+
- PHP 8.2+ (for Laravel backend)
- SQLite/PostgreSQL databases
- 14B LLM (local or cloud)

### External Services
- GitHub API (for Copilot integration)
- Optional: Cloud LLM APIs (Grok, OpenAI)

---

## References

- v5.1: Roadmap specification
- v4.9: Modular execution philosophy
- v4.4-4.8: Planning wizard specifications
- v5.0: Plan updating process
- PRD.json: Feature requirements
