# MCP Error Handling & Agent Evolution

**Version**: 4.3 (Complete Error & Evolution System)  
**Date**: January 20, 2026  
**Status**: Production-Ready Specifications  
**Source**: AI Teams Documentation v4.0-4.3  
**Synced with**: 05-MCP-API-Reference.md, 02-Agent-Role-Definitions.md

---

## Overview

This document provides comprehensive error handling specifications for all MCP tools, error codes registry, error modal UI, retry policies, agent evolution via error patterns, and implementation roadmaps.

---

## I. Global Error Handling Design Principles

All MCP tools follow a consistent error response schema:

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object | null",
    "severity": "enum",
    "retryable": "boolean",
    "retry_after_seconds": "integer | null",
    "fallback_suggested": "boolean",
    "priority_impact": "enum",
    "log_level": "enum"
  },
  "context": {
    "task_id": "string | null",
    "agent_name": "string | null",
    "timestamp": "string (ISO)"
  }
}
```

### Severity Levels & Escalation

| Severity   | Action Path                                  | Notification Level          | Auto-Recovery Attempt |
|------------|----------------------------------------------|-----------------------------|-----------------------|
| LOW        | Log only                                     | None                        | No                    |
| MEDIUM     | Log + retry (if allowed)                     | Sidebar warning badge       | Yes (limited)         |
| HIGH       | Log + retry + escalate to Boss               | Sidebar persistent banner   | Yes (full)            |
| CRITICAL   | Immediate pause + user modal + log           | Full modal + sound (opt-in) | No – manual required  |

### Priority Impact

- **P1_BLOCKED**: Pause entire P1 workflow until resolved
- **P2_DELAYED**: Continue P1, delay P2 tasks
- **P3_IGNORABLE**: Continue all workflows, log only

---

## II. Global Error Code Registry

| Code                        | Severity   | Retryable | Retry Delay | Priority Impact      | User-Facing Message Template                                      | Handling Guidelines                                      |
|-----------------------------|------------|-----------|-------------|----------------------|-------------------------------------------------------------------|----------------------------------------------------------|
| INVALID_PARAM               | MEDIUM     | false     | N/A         | P1_BLOCKED           | "Invalid parameter: {field} {reason}"                             | Reject call. Log details. Critic proposes schema evolution |
| TOKEN_LIMIT_EXCEEDED        | HIGH       | true      | 5–30s       | P1_BLOCKED           | "Context exceeded token limit ({current} / {limit})"              | Trigger context breaker. If fails → recovery.             |
| TIMEOUT                     | HIGH       | true      | 10–60s      | P2_DELAYED           | "Request timed out after {waited}s"                               | Retry exponential backoff. If persistent → user modal    |
| INTERNAL_ERROR              | CRITICAL   | false     | N/A         | P1_BLOCKED           | "Internal system error – please report this"                      | Pause system. Log full stack. Manual review required     |
| RATE_LIMIT                  | MEDIUM     | true      | Header or 60s | P2_DELAYED         | "Rate limit reached. Try again in {retry_after}s"                 | Wait & retry. If frequent → Critic proposes increase    |
| INVALID_STATE               | MEDIUM     | false     | N/A         | P1_BLOCKED           | "Invalid call state: {reason}"                                    | Reject. Check context. May indicate orchestration bug    |
| RESOURCE_NOT_FOUND          | LOW        | false     | N/A         | P3_IGNORABLE         | "Resource not found: {resource_id}"                               | Log warning. Continue if non-critical.                   |
| AUTH_ERROR                  | CRITICAL   | false     | N/A         | P1_BLOCKED           | "Authentication failed – check Copilot / API token"               | Immediate pause. User must re-authenticate.              |
| SCHEMA_VALIDATION_FAILED    | MEDIUM     | false     | N/A         | P2_DELAYED           | "Input failed schema validation: {field} {issue}"                 | Reject call. Log validation details for evolution.       |
| RECOVERY_TRIGGERED          | HIGH       | true      | 10s         | P1_BLOCKED           | "Context recovery triggered – restarting conversation"            | Auto fresh start. Archive old context. Notify user.      |
| BREAKER_FAILED              | HIGH       | false     | N/A         | P1_BLOCKED           | "Context breaker could not reduce below minimum limit"            | Force recovery. Critic proposes new chain.               |
| TOOL_NOT_FOUND              | MEDIUM     | false     | N/A         | P2_DELAYED           | "Requested tool not found: {tool_name}"                           | Reject. Check registry. Possible version mismatch.       |
| DELEGATION_FAILED           | MEDIUM     | true      | 15s         | P2_DELAYED           | "Failed to delegate task to Copilot Workspace"                    | Retry delegation. Fallback to local agent.               |

---

## III. Error Modal UI Specification (VS Code)

**Appearance**:
- Title: "Critical Error – Action Required" (red)
- Icon: Error octagon with white X
- **Top Section** – Error Summary:
  ```
  [ERROR CODE] – {message}
  Severity: CRITICAL   Priority Impact: P1 BLOCKED
  Task: {task_id}   Agent: {agent_name}
  ```
- **Middle Section** – Details (collapsible):
  - Full error description
  - LM-generated suggested action
  - Technical details (code, timestamp, retry info)
- **Bottom Buttons**:
  1. **Yes – Retry** (green) – Retry with backoff
  2. **No – Skip** (yellow) – Mark failed, continue workflow
  3. **Details** (blue) – Open error log in editor
  4. **Report to Copilot** (purple) – Copy prompt to clipboard
  5. **Pause System** (red) – Full halt until user resumes

**Behavior**:
- Modal blocks VS Code until dismissed
- Auto-focus on "Retry" for P1 errors
- 30s timeout → defaults to "Skip" + logs
- Optional error sound (user-configurable)

**Accessibility**:
- ARIA labels on all buttons
- High-contrast mode support
- Screen reader: "Critical error {code}. Task blocked. Choose action."

---

## IV. Retry Policy Configuration

```yaml
context_config:
  # ... other fields ...
  retry_policies:
    default:
      max_attempts: 3
      backoff_base_seconds: 5
      max_delay_seconds: 60
    per_tool:
      askQuestion:
        max_attempts: 4
        backoff_base_seconds: 10
        max_delay_seconds: 120
        conditions:
          - code: TIMEOUT → retry
          - code: RATE_LIMIT → respect retry_after_seconds
      reportObservation:
        max_attempts: 2
        backoff_base_seconds: 30
      getImmediateAnswer:
        max_attempts: 1
        fallback: "escalate_to_user"
    global_overrides:
      priority_1:  # P1 tasks get more retries
        multiplier: 1.5
      on_critical_error: "pause_system"
```

**Backoff Formula**: `delay = attempt × backoff_base_seconds` (capped at max_delay)

---

## V. Test Suite Expansion Plan (15+ Error Cases)

### Test Categories & Examples

1. **Param Validation (5 tests)**
   - Missing required field → INVALID_PARAM
   - Wrong type (string vs. number) → INVALID_PARAM
   - Enum violation → INVALID_PARAM
   - Max length exceeded → INVALID_PARAM
   - Negative confidence → INVALID_PARAM

2. **Token & Limit Errors (4 tests)**
   - Input > limit → TOKEN_LIMIT_EXCEEDED + breaker triggered
   - Breaker fails → RECOVERY_TRIGGERED
   - Post-break still over min → RECOVERY_TRIGGERED + fresh start
   - P1 task over limit → priority_impact: P1_BLOCKED

3. **Timeout & Rate Limit (3 tests)**
   - Simulated 35s delay → TIMEOUT + retry_after
   - Rate limit header → RATE_LIMIT + correct delay
   - Persistent timeout after retries → escalate modal

4. **State & Resource (3 tests)**
   - No active task → INVALID_STATE
   - Invalid task_id → RESOURCE_NOT_FOUND
   - Missing auth → AUTH_ERROR + pause

**Coverage Goal**: 95% on error paths in breaker code

---

## VI. Error Flow Charts (Long-Chain Visualization)

### Complete Error Handling Lifecycle

```
Tool Call
   ↓
Valid Params? ──No──► INVALID_PARAM ──► Log + Reject
   ↓ Yes
Token Check
   ├─ Over Warning ──► Context Breaker
   │                     ├─ Success ──► Execute Tool ──► Return Result
   │                     └─ Failed ──► RECOVERY_TRIGGERED ──► Fresh Start
   └─ OK ──► Execute Tool
               ├─ Success ──► Return Result
               └─ Error ──► Classify (Code/Severity)
                              ↓
                          Build Error Response
                              ↓
                          Log to errors.db
                              ↓
                          Retryable?
                            ├─ Yes ──► Backoff + Retry ──► Still Fails? ──► Escalation
                            └─ No ──► Escalation Path
                                        ├─ CRITICAL/P1_BLOCKED ──► User Modal
                                        │   └─ User Action: Retry/Skip/Pause
                                        ├─ HIGH ──► Boss Review + UV Task
                                        ├─ MEDIUM ──► Sidebar Warning + Continue
                                        └─ LOW ──► Log Only
```

---

## VII. Agent Evolution via Error Patterns

### Pattern Categories & Detection Rules

| Category                          | Example Pattern                                                                 | Detection Criteria (last 24h)                          | Severity Weight |
|-----------------------------------|----------------------------------------------------------------------------------|--------------------------------------------------------|------------------|
| Tool Parameter Errors             | Repeated INVALID_PARAM on same field/tool                                       | ≥4 calls, same field/tool                              | Medium           |
| Token Management Failures         | Frequent TOKEN_LIMIT_EXCEEDED even after breaking                               | ≥3 overflows despite breaker success                   | High             |
| Timeout & Rate Limit Loops        | Same tool hits TIMEOUT or RATE_LIMIT ≥5 times                                   | ≥5 in window, same tool                                | High             |
| Delegation to Copilot Failures    | Repeated DELEGATION_FAILED when offloading to Workspace                         | ≥3 failures in 1h                                      | Medium-High      |
| Recovery Overuse                  | Forced fresh starts (RECOVERY_TRIGGERED) ≥4 times                               | ≥4 in 24h                                              | High             |
| Low Coherence After Breaking      | Post-break coherence score <0.65 (embedding similarity)                         | ≥3 cases with delta > -0.35                            | Medium           |
| Priority Mismatch                 | P1 task delayed/blocked while P3 tasks proceed                                  | ≥2 occurrences in 12h                                  | High             |

### Pattern Detection Engine (Pseudocode)

```typescript
interface ErrorPattern {
  category: string;
  signature: string;
  count: number;
  priorityImpactCount: number;
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
    let pattern = patterns.get(key) || {
      category: categorizeError(log.error.code),
      signature: key,
      count: 0,
      priorityImpactCount: 0,
      avgSeverity: 0,
      firstSeen: log.timestamp,
      lastSeen: log.timestamp,
      evidence: []
    };

    pattern.count++;
    if (log.error.priority_impact !== "NONE") pattern.priorityImpactCount++;
    pattern.avgSeverity = (pattern.avgSeverity * (pattern.count - 1) + scoreSeverity(log.error.severity)) / pattern.count;
    pattern.lastSeen = log.timestamp;
    pattern.evidence.push(log);

    patterns.set(key, pattern);
  }

  return Array.from(patterns.values())
    .filter(p => p.count >= minCountForCategory(p.category))
    .sort((a, b) => b.priorityImpactCount - a.priorityImpactCount || b.count - a.count);
}

function minCountForCategory(category: string): number {
  if (category.includes("Timeout")) return 5;
  if (category.includes("Token")) return 3;
  return 5;
}
```

### Pattern → UV Task Proposal Flow

1. Critic detects pattern (e.g., linting misses 7x in P1)
2. Boss generates UV task with proposed fix
3. User approves via sidebar or modal
4. Updating Tool applies fix (e.g., add checklist item)
5. Post-update test cycle validates
6. RL feedback: Pattern count drops → positive reward

**Example UV Task**:
```yaml
task_id: UV-042
type: Update Verification
proposed_change:
  type: add_checklist
  id: V5
  desc: "Run full ESLint scan with --max-warnings=0 on P1 files"
  priority: 1
reason: "Pattern: Linting failures repeated 7 times in P1 tasks in 18h"
evidence_count: 7
```

### UI Visibility

- **Sidebar – Error Patterns Panel** (collapsible, when patterns ≥3)
  - Top 5 active patterns (color-coded: red P1, orange P2, yellow P3)
  - Click → evidence logs + "View proposed UV task" button
  - "Approve All" for non-critical patterns
- **Notification**: High-impact pattern detected → banner + sound (opt-in)

---

## VIII. Copilot Error Prompt Templates (Ready-to-Copy)

Generated dynamically in Next Action Window (v3.7), can be pasted into Copilot Workspace:

1. **Basic Error Report**
   ```
   /agent @support-agent Report MCP error in COE extension:
   Code: {error.code}
   Message: {error.message}
   Task: {task_id}
   Priority Impact: {error.priority_impact}
   Full details: {json_error}
   ```

2. **Token Overflow Report**
   ```
   /agent @context-agent Token limit hit in COE MCP call.
   Tool: {tool_name}
   Current tokens: {current} / Limit: {limit}
   Error: {error.message}
   Please suggest recovery or context reduction strategy.
   ```

3. **Critical Escalation**
   ```
   /agent @boss-agent CRITICAL MCP error in COE:
   {error.code} - {error.message}
   Severity: CRITICAL
   Priority: P1 BLOCKED
   Task ID: {task_id}
   Please investigate and propose fix.
   ```

---

## IX. Copilot Brakes for Token Issues

**Mechanism**: Pause Copilot on token near-hits; user "Report & Continue" button resumes with under-rated tokens.

**Features**:
- Detection: Pre-prompt token check in Workspace
- User Button: Sidebar "Report & Continue" – logs issue, resumes
- Under-Rating: Auto-adjust est (e.g., -20% buffer); user-customizable
- Continuous Workflow: No full stops – queue tasks, notify sidebar

**Flow**:
```
Copilot Prompt Prep → [Token Check]
  ├─ Safe (Under Est) → Proceed Continuous
  └─ Near/Hit → Brake: Pause + Sidebar Button
      └─ User "Report & Continue" → Under-Rate + Resume
```

---

## X. Implementation Roadmaps

### Error Handling (4.0-4.1)
- Standardize error response schema (2-3 hours)
- Create error codes registry (Docs/MCP-ERROR-CODES.md) (4-6 hours)
- Design error modal UI (6-8 hours)
- Implement retry policies in config (3-5 hours)
- Add 15+ error sim tests to Jest suite (8-12 hours)
- Total: 23-34 hours; Timeline: Weeks 4-5 (Feb 4-11)

### Agent Evolution (4.2)
- Implement pattern detection engine (8-10 hours)
- Extend Critic template with rules (4-6 hours)
- UV task auto-generation (6-8 hours)
- RL reward feedback loop (6-8 hours)
- Sidebar error patterns UI (6-8 hours)
- Total: 30-40 hours; Timeline: Week 5-6 (Feb 11-18)

---

## Recommended Next Steps

1. Create `Docs/MCP-ERROR-CODES.md` with full registry
2. Prototype error modal UI in VS Code
3. Implement pattern detection in Critic
4. Add error sim tests to Jest suite
5. Copilot error prompt templates to Next Action Window
6. User beta testing on error handling

---

**End of MCP Error Handling & Agent Evolution Documentation**
