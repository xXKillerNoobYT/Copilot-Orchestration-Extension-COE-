# Agent Evolution & Self-Improvement System

**Version**: 4.3 (Complete Evolution & Planning Enhancements)  
**Date**: January 20, 2026  
**Status**: Production-Ready Specifications  
**Source**: AI Teams Documentation v4.2-4.3  
**Synced with**: ERROR-HANDLING.md, 02-Agent-Role-Definitions.md, 07-Complete-Agent-Teams.md

---

## Overview

This document specifies how agents self-improve via error pattern detection, UV task proposals, template evolution, and planning phase user experience enhancements.

---

## PART I: Agent Evolution via Error Patterns

### Pattern Detection System (v4.2)

**Architecture**: Critic Team + LangGraph + RL

**Process**:
1. Error logs continuously fed to Critic via WebSocket
2. Critic analyzes patterns over rolling 24-hour windows
3. High-confidence patterns trigger UV task auto-generation
4. Boss reviews → approves → Updating Tool applies → test cycle validates

### Pattern Categories with Examples

| Category | Example | Detection (24h) | Severity | Outcome |
|----------|---------|-----------------|----------|---------|
| Tool Param Errors | INVALID_PARAM on "field_X" for "tool_Y" | ≥4 calls, same field | Medium | UV: Improve schema docs |
| Token Overflows | TOKEN_LIMIT_EXCEEDED despite breaker success | ≥3 overflows post-break | High | UV: Tighten breaking chain |
| Timeout Loops | TIMEOUT on "askQuestion" ≥5 times | ≥5 in 24h | High | UV: Increase timeout/retry |
| Copilot Delegation Fails | DELEGATION_FAILED to Workspace | ≥3 in 1h | Med-High | UV: Refine delegation prompt |
| Recovery Overuse | RECOVERY_TRIGGERED ≥4 times | ≥4 in 24h | High | UV: Adjust breaking strategy |
| Low Coherence | Post-break score <0.65 (embedding) | ≥3 cases, delta >-0.35 | Medium | UV: Improve prioritization |
| Priority Conflicts | P1 blocked while P3 proceeds | ≥2 in 12h | High | UV: Strengthen queue sort |

### Pattern Detection Pseudocode

```typescript
interface ErrorPattern {
  category: string;
  signature: string;  // e.g., "TOKEN_LIMIT_EXCEEDED:askQuestion"
  count: number;
  priorityImpactCount: number;  // P1/P2 errors
  avgSeverity: number;
  firstSeen: Date;
  lastSeen: Date;
  evidence: ErrorLog[];
}

function detectPatterns(logs: ErrorLog[], windowHours = 24): ErrorPattern[] {
  const patterns: Map<string, ErrorPattern> = new Map();

  for (const log of logs) {
    if (log.timestamp < Date.now() - windowHours * 3600 * 1000) continue;

    const key = `${log.error.code}:${log.tool_name}`;
    let pattern = patterns.get(key) || createPattern(key, log);
    
    pattern.count++;
    if (log.error.priority_impact !== "NONE") pattern.priorityImpactCount++;
    pattern.avgSeverity = updateAvgSeverity(pattern, log);
    pattern.lastSeen = log.timestamp;
    pattern.evidence.push(log);

    patterns.set(key, pattern);
  }

  return Array.from(patterns.values())
    .filter(p => p.count >= minCountForCategory(p.category))
    .sort((a, b) => b.priorityImpactCount - a.priorityImpactCount || b.count - a.count);
}

async function proposeUVTasks(patterns: ErrorPattern[]): Promise<UVTask[]> {
  const tasks: UVTask[] = [];

  for (const pattern of patterns) {
    if (pattern.priorityImpactCount > 0 || pattern.count >= thresholdForCategory(pattern.category)) {
      const task = generateUVTask(pattern);
      tasks.push(task);
    }
  }

  return tasks;
}

function generateUVTask(pattern: ErrorPattern): UVTask {
  return {
    task_id: `UV-${Date.now()}`,
    type: "Update Verification",
    proposed_change: getProposalForPattern(pattern),
    reason: `Pattern: ${pattern.signature} occurred ${pattern.count} times. Impact: ${pattern.priorityImpactCount} P1/P2 tasks.`,
    evidence_count: pattern.count,
    evidence_links: pattern.evidence.map(e => e.id),
  };
}
```

### From Pattern → UV Task Workflow

```
Error Pattern Detected
   ├─ High priorityImpactCount (>0 for P1) OR count ≥ threshold?
   │   ├─ Yes ──► Generate UV task (high priority)
   │   │           ├─ Proposal: {pattern_signature} fix
   │   │           └─ Trigger LM for detailed explanation
   │   └─ No ──► Log as observation
   │              └─ Accumulate; if ≥10 in 48h → promote to UV
   │
   └─ Boss reviews UV → Approve? ──Yes──► Updating Tool → Apply to YAML
                             │
                             └──No──► Log reject + note for RL training
```

### Example UV Task Generated

```yaml
task_id: UV-047
type: Update Verification
proposed_change:
  type: add_checklist_item
  target: "Verification Agent Template"
  id: V6
  desc: "Run ESLint --max-warnings=0 on P1-tagged files"
  priority: 1
  condition: "priority_level === 1"
  reference: "Linting failures in P1 tasks"

reason: "Pattern: Linting-related failures repeated 7 times in P1 To Do List tasks over last 18h. Evidence: 7 INVALID_STATE errors (code linting skipped), 0 recoveries."

evidence_count: 7
evidence_task_ids: ["TASK-1203", "TASK-1204", "TASK-1205", ...]

suggested_priority: 1  # P1 because P1 impact
confidence: 0.92  # High confidence in pattern

ui_feedback: "Linting checks detected as missing in P1. Propose adding mandatory check to Verification template."
```

### UI Visibility

**Sidebar – Error Patterns Panel** (Collapsible, appears when patterns ≥3)
- Top 5 active patterns (color-coded: 🔴 P1, 🟠 P2, 🟡 P3)
- Each pattern card:
  - Pattern signature + count ("INVALID_PARAM:tool_X occurred 4 times")
  - Priority impact badge ("P1 x3, P2 x1")
  - Click → expands to show evidence logs
  - "View Proposed UV Task" link
  - "Approve" / "Dismiss" buttons for proposals
- Bottom: "Approve All Proposals" button for batch actions

**Notifications**:
- High-impact pattern detected → persistent banner + optional sound
- Pattern fixed (count drops 75%+ post-update) → success banner with RL reward indicator

---

## PART II: Template Evolution & Updating Workflow

### Agent Template Structure (Updatable)

```yaml
# Example: verification-team.yaml
template_version: 1.5  # Auto-bumped on updates

agent_role: "Post-execution checker with 60s delay"

# Updatable checklist
checklists:
  - id: V1
    desc: "Run unit/integration tests (jest --coverage)"
    priority: 2
    updatable: true
  - id: V2
    desc: "Check linting (eslint --fix)"  # Added via UV task v1.4
    priority: 3
    updatable: true
  - id: V3
    desc: "Verify against PRD snippet {prd_ref}"
    priority: 1
    updatable: false  # Core, non-updatable

# Updatable prompts
prompts:
  - id: P1
    template: "Verify code in {file_path} against {criteria_list}. Priority: {priority_level}. Report coverage >{coverage_min}%."
    props:
      file_path: string
      criteria_list: array
      priority_level: 1-3 (default: 1)
      coverage_min: integer (default: 80)
    updatable: true

# Evolution rules
update_rules:
  threshold: "3+ errors of same type"
  validator: "YAML schema + simulation"
  approver: "Boss AI"

# Update history
update_history:
  - date: "2026-01-20"
    change: "Added V2 (linting check)"
    uv_task_id: "UV-047"
    reason: "Pattern: Linting failures in P1"
    verifier_task_id: "VERIFY-001"
    result: "Success – pattern count dropped 75%"
    rl_reward: 0.92
```

### Update Verification Task (UV Task)

**Type**: Special "Update Verification" task (auto-generated by Critic)

**Purpose**: Verify that an update is needed, validate it, apply it safely, and verify impact

**Steps**:
```
Step 1: Verify Need
  └─ Analyze logs for pattern recurrence
     └─ Query: "Linting misses >3 in P1 areas?"
     └─ Result: YES (7 occurrences) ✅

Step 2: Validate Update
  └─ Schema check: New checklist item valid JSON ✅
  └─ Dry-run simulation: Mock agent with new template
     └─ Result: No errors, +8% execution time (acceptable) ✅
  └─ Conflict check: No clashes with other P1 rules ✅

Step 3: Apply Update
  └─ Call Updating Tool: `updateTemplate("verification", {...})`
  └─ Result: YAML updated, version 1.4 → 1.5 ✅
  └─ Backup old version created ✅

Step 4: Post-Verify (Test Cycle)
  └─ Re-run last 3 failed verification cycles with new template
  └─ Result: Linting caught in 3/3 cases, no new failures ✅

Step 5: Publish & Log
  └─ Notify sidebar: "Verification template evolved (v1.5) – linting check added"
  └─ RL feedback: pattern_count (7 → 1), reward = 0.92
  └─ Update history: UV-047 → success
```

### RL Reward Signal

```typescript
function computePatternFixReward(pattern: ErrorPattern, postUpdateCount: number): number {
  const reduction = (pattern.count - postUpdateCount) / pattern.count;
  const severityWeight = pattern.avgSeverity / 3.0;
  const impactWeight = Math.min(pattern.priorityImpactCount / 5, 1.0);
  
  // Reward = reduction % * (severity + impact)
  const reward = reduction * (severityWeight * 0.4 + impactWeight * 0.6);
  
  return Math.max(-2, Math.min(2, reward));
}

// Example: 7 occurrences → 1 after update
// reduction = 6/7 = 0.857
// severity (HIGH) = 1.0, impact = 3/5 = 0.6
// reward = 0.857 * (1.0*0.4 + 0.6*0.6) = 0.857 * 0.76 = 0.65
```

---

## PART III: Planning Phase User Experience Improvements (v4.3)

### High-Impact Improvements (P1: Core Usability)

#### 1. Adaptive Wizard Paths Based on User Role/Expertise

**Rationale**: Fixed paths waste time for specialist users; adapt to role  
**Implementation**:
- Add initial question: "Primary Focus: UI/Frontend, Backend/Data, Full Stack, Custom?"
- Use LangGraph conditional edges to skip/reorder questions
- Backend role skips UI questions; jumps to data storage
- Reduces path from 45-60 min (Technical Architect) to 20-30 min (Backend specialist)

**Benefit**: 30-40% time reduction for specialized projects  
**Timeline**: 8-12 hours (Week 3: Jan 28)

#### 2. Real-Time Plan Impact Simulator in Preview Panel

**Rationale**: Show downstream effects immediately; avoid rework  
**Implementation**:
- Simulate metrics live (<200ms): "Estimated Tasks: 12 (P1: 8 for To Do List)"
- Flag warnings: "Low scalability for Calendar sync with local storage"
- Heatmap overlay: Green (aligned), Yellow (warnings)

**Benefit**: Early conflict detection, informed decisions  
**Timeline**: 10-15 hours (Week 4: Feb 4)

#### 3. Collaborative Plan Sharing & Import/Export

**Rationale**: Enable remote team workflow (e.g., Jackson team)  
**Implementation**:
- Export: JSON/Markdown with priorities ("To Do List: P1")
- Import: Wizard pre-fills from file/URL
- Sharing: GitHub Gist integration or COE cloud link

**Benefit**: Faster iterations, team alignment  
**Timeline**: 6-10 hours (Week 5: Feb 11)

### Medium-Impact Improvements (P2: Customization for Scale)

#### 1. Priority Heatmap & Dependency Visualizer

**Rationale**: Visual mapping of P1-P3 dependencies  
**Implementation**:
- Mermaid graph: Nodes colored by priority (🟢 P1, 🟡 P2, 🔴 P3)
- Hover: "Impact if changed: Delays Calendar by 2 tasks"
- Update in real-time (<500ms)

**Timeline**: 8-12 hours (Week 4: Feb 4)

#### 2. AI-Assisted Priority Auto-Suggestion

**Rationale**: Reduce decision fatigue  
**Implementation**:
- LM scans PRD for keywords ("critical", "core") → suggests priorities
- Modal: Show suggestions + rationale; user confirms

**Timeline**: 5-8 hours (Week 5: Feb 11)

#### 3. Undo/Redo Stack for Wizard Changes

**Rationale**: Allow experimentation without fear  
**Implementation**:
- Stack: Last 10 states
- UI: "Undo" / "Redo" buttons in wizard footer

**Timeline**: 4-6 hours (Week 3: Jan 28)

### Low-Impact Improvements (P3: Polish)

#### 1. Accessibility Enhancements
- Keyboard nav, screen reader support, high-contrast mode
- Timeline: 6-8 hours (Week 6: Feb 15)

#### 2. Template-Based Plan Starters
- Pre-fill wizard for common apps (5-10 templates)
- Timeline: 4-6 hours (Week 5: Feb 11)

#### 3. Post-Planning Summary Report
- Printable overview (tasks, priorities, timeline est)
- Timeline: 3-5 hours (Week 4: Feb 4)

---

## PART IV: Implementation Roadmap Summary

### Phase Breakdown

| Phase | Tasks | Hours | Timeline | Milestones |
|-------|-------|-------|----------|-----------|
| P1: Agent Evolution | Pattern detection, UV gen, Critic evolution, RL reward | 60-80 | Weeks 4-6 | Sidebar patterns UI, auto UV tasks |
| P2: Planning UX | Adaptive paths, impact sim, sharing | 30-40 | Weeks 3-5 | Role-based paths working, real-time preview |
| P3: Polish | Templates, accessibility, reports | 15-20 | Weeks 5-6 | Template library, keyboard nav |

### Total Effort: 105-140 hours across Phases 3-6 (Jan 28 - Feb 18)

---

## PART V: Reference Implementation Guide

### Critic Pattern Detection (Phase 1)

```
Week 4 (Feb 4): Implement error pattern detection in Critic
- Read error logs from central SQLite (errors.db)
- Group by code + tool_name + 24h window
- Score by count + priority impact + severity
- Filter for high-confidence patterns (≥3 threshold)
- Generate UV task proposals
- Present in sidebar Error Patterns panel
```

### Boss UV Task Approval (Phase 2)

```
Week 5 (Feb 11): Add Boss oversight to UV task approval
- Critic proposes → Boss reviews (confidence + impact)
- If confidence >0.8 → auto-approve; else → user modal
- LM generates detailed explanation for user
- On approval → Updating Tool applies change
- Post-apply → test cycle validation
```

### Planning Wizard Enhancements (Phase 1-2)

```
Week 3 (Jan 28): Add role selector, undo/redo
Week 4 (Feb 4): Add impact simulator, dependency viz
Week 5 (Feb 11): Add sharing, AI priority suggestions
```

---

## PART VI: Success Metrics

- **Error Pattern Detection**: Catch 90%+ of recurring issues within 24h
- **UV Task Accuracy**: 85%+ of proposed updates reduce pattern count >50%
- **Planning Efficiency**: 30-40% reduction in wizard time for specialist roles
- **Impact Simulation**: <200ms update time, <5% false positive warnings
- **RL Improvement**: 14B model fine-tuning improves Boss decisions by 15%+

---

## Recommended Next Steps

1. Implement Critic pattern detection engine (Week 4)
2. Create Error Patterns sidebar UI (Week 4)
3. Add adaptive wizard paths (Week 3)
4. Prototype impact simulator (Week 4)
5. Beta test with @WeirdTooLLC team (Jackson, WY) (Week 6)
6. Deploy Phase 1 (error patterns + UV tasks) (Feb 18)

---

**End of Agent Evolution & Planning Phase Documentation**
