# Visual Documentation Map

**Date**: January 21, 2026  
**Purpose**: At-a-glance visual guide to all AI Teams documentation  

---

## 🗺️ Full Documentation Hierarchy

```
Docs/Plans/AI-Teams-Documentation/
│
├── 📖 START HERE
│   ├── AI-TEAMS-DOCUMENTATION-INDEX.md ⭐ MASTER INDEX
│   ├── QUICK-REFERENCE-CARD.md         Quick lookup
│   └── DOCUMENTATION-TRANSFER-SUMMARY.md  What was transferred
│
├── 📘 PLANNING PHASE (v4.4-4.8)
│   └── PLANNING-WIZARD-SPECIFICATION.md
│       │
│       ├── [v4.4] Adaptive Wizard Paths
│       │   ├── Triage questions (scale, focus)
│       │   ├── Dynamic path selection (MVP/Frontend/Backend/Full/Custom)
│       │   ├── Question skipping logic
│       │   └── Time savings: 15-25 min
│       │
│       ├── [v4.5] Real-Time Impact Simulator
│       │   ├── Task count & breakdown
│       │   ├── Timeline & effort estimates
│       │   ├── Risk & trade-off flags
│       │   ├── Mermaid dependency graphs
│       │   └── <400ms responsiveness
│       │
│       ├── [v4.7] Backend/AI Focus Enhancements
│       │   ├── AI/LLM usage level triage
│       │   ├── Backend-specific questions (DB, API, LLM)
│       │   ├── Backend simulator metrics (LLM calls/day)
│       │   └── Suggested tech stacks
│       │
│       └── [v4.8] Human + AI + Backend Builder
│           ├── Planning style selection
│           ├── Human guardrails (domain, constraints)
│           ├── AI-augmented questions
│           ├── P1 decision lock-in
│           └── Backend-first task ordering
│
├── ⚙️ EXECUTION PHASE (v4.9)
│   └── MODULAR-EXECUTION-PHILOSOPHY.md
│       │
│       ├── Core Principle: "One Thing at a Time"
│       ├── 5-Criteria Atomic Tasks
│       │   ├── 1. Single Responsibility
│       │   ├── 2. Atomic Completion
│       │   ├── 3. Time Box (15-45 min)
│       │   ├── 4. Verification Closure
│       │   └── 5. Token Safety
│       │
│       ├── Enforcement Levels
│       │   ├── Soft (Planning recommendation)
│       │   ├── Medium (TO_DO rejection)
│       │   ├── Hard (Orchestrator refusal)
│       │   └── Strict (Boss AI block)
│       │
│       └── User Experience
│           ├── Active Task card
│           ├── Blocked Tasks queue
│           └── Force Unlock (emergency)
│
├── 🔄 UPDATE PHASE (v5.0)
│   └── PLAN-UPDATING-PROCESS.md
│       │
│       ├── Stage 1: Trigger Detection (0.5-2s)
│       │   ├── User-initiated
│       │   ├── Drift detection
│       │   ├── Critic patterns
│       │   ├── Low queue auto-gen
│       │   ├── Priority shifts
│       │   └── Error/events
│       │
│       ├── Stage 2: Proposal Generation (1-5s)
│       │   ├── LM-assisted content
│       │   ├── AutoGen refinement
│       │   └── JSON proposal structure
│       │
│       ├── Stage 3: UV Validation (2-10s)
│       │   ├── Verify need
│       │   ├── Simulate impact
│       │   ├── Check constraints
│       │   ├── Boss RL decision
│       │   └── Human gate (if P1/major)
│       │
│       ├── Stage 4: Application (1-3s)
│       │   ├── Backup current plan
│       │   ├── Apply diff atomically
│       │   ├── Re-decompose modules
│       │   ├── Re-queue tasks
│       │   └── Version bump + notify
│       │
│       └── Stage 5: Monitoring (1-5 min)
│           ├── Post-verify cycle
│           ├── Critic rating
│           ├── Rollback if needed
│           ├── RL training
│           └── User feedback poll
│
├── 🗓️ ROADMAP (v5.1)
│   └── PROJECT-ROADMAP-DETAILED.md
│       │
│       ├── Phase 1: Planning Wizard (Jan 11-28)
│       │   ├── Sprint 1.1: Triage & Paths
│       │   ├── Sprint 1.2: Simulator
│       │   └── Sprint 1.3: Guardrails
│       │
│       ├── Phase 2: Backend/AI + Modular (Jan 28-Feb 11)
│       │   ├── Sprint 2.1: Backend questions
│       │   └── Sprint 2.2: Atomic enforcement
│       │
│       ├── Phase 3: Agents & MCP (Feb 11-25)
│       │   ├── Sprint 3.1: MCP tools
│       │   └── Sprint 3.2: Copilot delegation
│       │
│       ├── Phase 4: Updates & Evolution (Feb 25-Mar 11)
│       │   ├── Sprint 4.1: Update lifecycle
│       │   └── Sprint 4.2: Pattern evolution
│       │
│       ├── Phase 5: Context & RL (Mar 11-25)
│       │   ├── Sprint 5.1: Context breaking
│       │   └── Sprint 5.2: RL + polish
│       │
│       ├── Phase 6: Testing & Beta (Mar 25-Apr 8)
│       │   └── 90%+ coverage + private beta
│       │
│       └── 🚀 Launch: Apr 8-15, 2026
│
├── 🌱 LIFECYCLE (v5.2)
│   └── PROGRAM-LIFECYCLE-MODEL.md
│       │
│       ├── Birth Phase (Weeks 1-4)
│       │   ├── Plan finalized → v1.0
│       │   ├── TO_DO queue init (P1 first)
│       │   ├── Single-task execution loop
│       │   └── P1 completion gate
│       │
│       ├── Growth Phase (Weeks 2-12+)
│       │   ├── Queue management (Boss + TO_DO)
│       │   ├── Task hand-off to Copilot
│       │   ├── Continuous feedback loop
│       │   └── Checkpoint & release (every 5-10 tasks)
│       │
│       ├── Evolution Phase (Week 3+)
│       │   ├── Signal collection (7 sources)
│       │   ├── Pattern aggregation (Critic)
│       │   ├── Proposal generation (LM)
│       │   ├── UV task execution (Boss)
│       │   └── Reward & learning (RL)
│       │
│       └── Refinement Phase (Week 6+)
│           ├── User feedback collection
│           ├── RL reward tuning
│           ├── Template evolution
│           └── Performance optimization
│
├── 🧬 EVOLUTION DEEP DIVE (v5.3)
│   └── EVOLUTION-PHASE-DEEP-DIVE.md
│       │
│       ├── Sub-Process 1: Signal Collection
│       │   ├── MCP tool calls
│       │   ├── Task executions
│       │   ├── Context breaking
│       │   ├── Plan drifts
│       │   ├── User feedback
│       │   ├── RL rewards
│       │   └── Copilot delegations
│       │
│       ├── Sub-Process 2: Pattern Detection
│       │   ├── Generate signature
│       │   ├── Group by signature
│       │   ├── Calculate metrics
│       │   ├── Assign category
│       │   ├── Compute score
│       │   └── Filter by threshold
│       │
│       ├── Sub-Process 3: Proposal Generation
│       │   ├── LM prompt (token-limited <1500)
│       │   ├── AutoGen refinement
│       │   └── Prioritize (P1 first, max 3/cycle)
│       │
│       ├── Sub-Process 4: UV Execution
│       │   ├── Verify pattern evidence
│       │   ├── Simulate fix impact
│       │   ├── Check disruption
│       │   ├── Boss RL pre-score
│       │   └── Human gate (if P1)
│       │
│       ├── Sub-Process 5: Post-Monitoring
│       │   ├── 24-48h monitoring window
│       │   ├── Metrics: recurrence, success, perf
│       │   ├── Calculate reward
│       │   ├── Rollback if <0.2
│       │   └── RL dataset update
│       │
│       └── User Controls
│           ├── Evolution dashboard
│           ├── Aggressiveness slider
│           ├── Opt-in gates
│           └── Manual trigger button
│
└── 💬 TICKET SYSTEM (v5.4-5.5)
    └── TICKET-SYSTEM-SPECIFICATION.md
        │
        ├── Core Components
        │   ├── Ticket structure (JSON schema)
        │   ├── Clarity Agent (high-priority sub-agent)
        │   ├── Ticket DB (SQLite)
        │   └── Webview messages (TypeScript interfaces)
        │
        ├── Ticket Lifecycle
        │   ├── 1. Creation (AI→Human or Human→AI)
        │   ├── 2. Reply Loop (iterative refinement)
        │   ├── 3. Clarity Review (score 0-100)
        │   ├── 4. Follow-ups (if <85)
        │   └── 5. Resolution (≥85 + close)
        │
        ├── Clarity Agent
        │   ├── YAML template (checklists + prompts)
        │   ├── LM assessment (clarity/completeness/accuracy)
        │   ├── Score calculation
        │   ├── Follow-up generation
        │   └── Max 5 iterations
        │
        └── UI Prototypes (6 mockups)
            ├── 1. Main sidebar (collapsed list)
            ├── 2. Expanded ticket card
            ├── 3. New ticket form
            ├── 4. Notification banner
            ├── 5. Reply thread with Clarity feedback
            └── 6. Settings panel
```

---

## 📊 Version → Document Mapping

| Version | Document | Core Innovation |
|---------|----------|----------------|
| v4.4 | Planning Wizard Spec | Adaptive question paths |
| v4.5 | Planning Wizard Spec | Real-time impact simulator |
| v4.6 | Planning Wizard Spec | User-side flow refinement |
| v4.7 | Planning Wizard Spec | Backend/AI focus |
| v4.8 | Planning Wizard Spec | Human + AI hybrid builder |
| v4.9 | Modular Execution | "One thing at a time" |
| v5.0 | Plan Updating Process | 5-stage update workflow |
| v5.1 | Project Roadmap | 6-phase 12-week plan |
| v5.2 | Program Lifecycle | Birth → Growth → Evolution → Refinement |
| v5.3 | Evolution Deep Dive | Self-healing engine |
| v5.4 | Ticket System | Structured AI-human interaction |
| v5.5 | Ticket System | UI prototypes |

---

## 🎯 Key Flows Visualized

### Planning Flow (v4.4-4.8)
```
User starts wizard
    ↓
Triage (2-3 questions)
    ↓
Path selected (MVP/Frontend/Backend/Full/Custom)
    ↓
Dynamic questions (3-10, adaptive)
    ↓
Real-time impact shown (<500ms)
    ↓
Review & adjust
    ↓
Generate plan (P1-first)
```

### Execution Flow (v4.9)
```
Plan ready
    ↓
TO_DO queue (P1 first)
    ↓
Boss: Select 1 P1 task (atomic)
    ↓
Orchestrator → Copilot Workspace
    ↓
Code/Test/Verify (single concern)
    ↓
Pass? → Commit, unlock next
Fail? → Stay on task, ask/report
```

### Update Flow (v5.0)
```
Trigger detected
    ↓
Classify (minor/incremental/major/rebuild)
    ↓
LM generates proposal
    ↓
UV validates (simulate + check)
    ↓
Human approves (if P1/major)
    ↓
Apply atomically (backup first)
    ↓
Monitor 24-48h
    ↓
Reward → RL dataset
```

### Evolution Flow (v5.3)
```
Signals collected (7 sources)
    ↓
Critic scans every 15-60 min
    ↓
Patterns detected (grouped by signature)
    ↓
Scored (count × severity × impact / interval)
    ↓
Top 3 → LM proposals
    ↓
UV execution
    ↓
Post-monitor 24-48h
    ↓
Success? → Log + RL
Failed? → Rollback + counter-proposal
```

### Ticket Flow (v5.4-5.5)
```
AI needs clarification OR user has question
    ↓
Create ticket (auto-title, P1-3)
    ↓
Notify (sidebar alert if P1)
    ↓
User/AI replies
    ↓
Clarity Agent reviews (LM scores 0-100)
    ↓
Score ≥85? → Resolve
Score <85? → Auto-reply with follow-ups (max 5)
    ↓
Resolved → AI acts on answer
    ↓
Log to history → Feed to Critic patterns
```

---

## 🔗 Integration Points

```
Planning Wizard (v4.4-4.8)
    ├── Generates → Program Lifecycle (v5.2)
    ├── Uses → Priority System (v2.9)
    ├── Breaks context → Context Management (v3.2)
    └── Validates → UV Tasks (v3.0)

Modular Execution (v4.9)
    ├── Enforces → Planning Wizard outputs
    ├── Hands off to → Copilot Workspace
    └── Verified by → Verification Team

Plan Updating (v5.0)
    ├── Triggered by → Evolution patterns (v5.3)
    ├── Validated by → UV Tasks (v3.0)
    ├── Feeds → RL System (v3.6)
    └── Updates → PRD.json/PRD.md (v2.6)

Evolution (v5.3)
    ├── Monitors → All phases (Birth/Growth/Evolution/Refinement)
    ├── Generates → Plan Updates (v5.0)
    ├── Uses → Critic (v4.2)
    └── Trains → 14B LM (RL)

Ticket System (v5.4-5.5)
    ├── Handles → AI-human interactions (all phases)
    ├── Clarity Agent → Like UV validation
    ├── Patterns feed → Evolution (v5.3)
    └── Respects → Priority System (v2.9)
```

---

## 📈 Metrics Dashboard

| Phase | Key Metric | Target | Document |
|-------|------------|--------|----------|
| Planning | Completion time | <25 min | Planning Wizard Spec |
| Planning | Simulator speed | <500 ms | Planning Wizard Spec |
| Planning | User satisfaction | ≥4.2/5 | Planning Wizard Spec |
| Execution | Atomic compliance | >95% | Modular Execution |
| Execution | P1 enforcement | 100% | Modular Execution |
| Execution | User overwhelm | ≤2/5 | Modular Execution |
| Updating | Success rate | >95% | Plan Updating Process |
| Updating | Avg update time | <15 sec | Plan Updating Process |
| Updating | Rollback rate | <5% | Plan Updating Process |
| Evolution | Error recurrence | <5% | Evolution Deep Dive |
| Evolution | Critic proposals | ≥1/week | Evolution Deep Dive |
| Evolution | Success rate | ≥70% | Evolution Deep Dive |
| Tickets | Clarity iterations | <2.5 avg | Ticket System Spec |
| Tickets | Resolution time | <15 min P1 | Ticket System Spec |
| Tickets | Clarity accuracy | ≥85% | Ticket System Spec |
| Overall | Test coverage | ≥90% | Project Roadmap |
| Overall | Beta satisfaction | ≥4.5/5 | Project Roadmap |

---

## 🚀 Next Actions

1. **This Week (Jan 21-28)**:
   - Sprint 1.1: Implement triage & adaptive paths
   - Review: All teams read relevant docs

2. **Next Week (Jan 28-Feb 4)**:
   - Sprint 1.2: Build real-time simulator
   - Prototype: Planning wizard UI

3. **Month 1 Goal**:
   - Phase 1 complete: Functional planning wizard
   - 90%+ test coverage on Phase 1

4. **Launch Target**:
   - **April 8-15, 2026**: VS Code Marketplace

---

**Last Updated**: January 21, 2026  
**Total Documents**: 10 (8 specs + 1 index + 1 summary)  
**Total Content**: ~30,700 words  
**Status**: ✅ Ready for Implementation
