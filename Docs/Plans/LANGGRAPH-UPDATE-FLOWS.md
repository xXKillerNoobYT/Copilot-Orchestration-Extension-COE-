# LangGraph Update Flows & Supervisor Patterns

**Version**: 3.1 (Complete Update & Orchestration)  
**Date**: January 20, 2026  
**Status**: Production-Ready Specifications  
**Source**: AI Teams Documentation v3.1, v2.4  
**Synced with**: 07-Complete-Agent-Teams.md, 02-Agent-Role-Definitions.md

---

## Overview

This document specifies LangGraph-based update flows for agent template evolution, supervisor patterns for hierarchical team coordination, and integration with CrewAI for role-based agent crews.

---

## Part I: LangGraph Supervisor Patterns

### Core Concept

LangGraph enables supervisor patterns where a central "supervisor" node (Boss AI) oversees sub-agent nodes via graph structures. This prevents chaos in multi-agent systems by enforcing structured flows with conditional edges, checkpoints, and RL-tuned routing.

### Supervisor Node Pattern

```typescript
import { StateGraph, END, MessagesState } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

interface COEState extends MessagesState {
  prd: PRD;
  todoQueue: Task[];
  fileTree: FileMetadata[];
  feedback: StatusMap;
  drift: number;          // 0-1 scale
  priority_areas: string[];
}

// Supervisor node: Boss AI
async function supervisorNode(state: COEState): Promise<Partial<COEState>> {
  // 1. Analyze state
  const drift_score = calculateDrift(state);
  
  // 2. Decide routing (RL-tuned)
  if (drift_score > 0.2) {
    return { next_agent: "verification", reason: "High drift detected" };
  } else if (state.todoQueue.length < 5) {
    return { next_agent: "planning", reason: "Low queue" };
  } else {
    return { next_agent: "orchestrator", reason: "Ready to code" };
  }
}

// Build graph
const workflow = new StateGraph<COEState>()
  .addNode("supervisor", supervisorNode)
  .addNode("planning", planningNode)
  .addNode("orchestrator", orchestratorNode)
  .addNode("verification", verificationNode)
  .addNode("critic", criticNode)
  
  // Edges from supervisor (conditional routing)
  .addConditionalEdges(
    "supervisor",
    (state) => state.next_agent,
    {
      "planning": "planning",
      "orchestrator": "orchestrator",
      "verification": "verification"
    }
  )
  
  // Fixed edges after execution
  .addEdge("planning", "supervisor")
  .addEdge("orchestrator", "supervisor")
  .addEdge("verification", "critic")
  .addEdge("critic", "supervisor")
  
  // End condition
  .addConditionalEdges(
    "supervisor",
    (state) => "end" if all_tasks_complete(state) else "continue"
  )
  .compile();
```

### Hierarchical State Management

```yaml
# Shared COEState structure (procedural memory for 14B efficiency)
state_schema:
  prd: object          # Product spec (immutable)
  todoQueue: array     # Task queue (mutable)
  fileTree: object     # File metadata tracking
  feedback: object     # Sidebar feedback accumulator
  metrics: object      # System-wide KPIs
  drift: number        # 0-1 drift score (triggers supervisor actions)
  priority_areas: array # Current P1-P3 focuses
  active_agents: array # Currently running agents
  checkpoint_id: string # For rollback/recovery

# Checkpoints: LangGraph automatically saves state at each node
# Enables resumption after crashes, rollbacks on failure
checkpoints:
  - id: "chkpt-001"
    node: "planning"
    state_snapshot: {...}
    timestamp: "2026-01-20T23:45:00Z"
```

### Conditional Edges with RL Tuning

```typescript
// Edges can be conditional (routed based on state)
// Supervisor uses RL to tune routing decisions

function supervisorRouter(state: COEState): string {
  // RL-tuned decision weights
  const weights = {
    drift_high: state.drift > 0.2 ? 5 : 0,
    queue_low: state.todoQueue.length < 5 ? 3 : 0,
    p1_blocked: state.priority_areas.some(a => a.status === 'blocked') ? 4 : 0,
  };
  
  const max_trigger = Object.entries(weights)
    .sort(([,a], [,b]) => b - a)[0];
  
  const routing = {
    "drift_high": "verification",    // Resolve drift
    "queue_low": "planning",          // Auto-gen tasks
    "p1_blocked": "researcher",       // Investigate blocker
  };
  
  return routing[max_trigger[0]] || "orchestrator";  // Default
}

// RL reward for routing decisions
function routingReward(state: COEState, outcome: ExecutionOutcome): number {
  let reward = 0;
  
  if (outcome.success) reward += 1.0;
  if (outcome.completed_p1_tasks > 0) reward += 0.5;
  if (outcome.drift_reduced) reward += 0.3;
  if (outcome.time_ms < 1000) reward += 0.2;  // Efficiency bonus
  
  return Math.max(-1, Math.min(2, reward));
}
```

---

## Part II: LangGraph Update Flows

### Update Flow Graph

```
Critic Detects Pattern
   └─ Generate UV Task
       └─ UV Task Node (Boss)
           ├─ Is Update Needed?
           │   ├─ No → Discard & Log
           │   └─ Yes → Proposal Node (AutoGen Chat)
           │       └─ Validate Node
           │           ├─ Validation Passed?
           │           │   ├─ No → Reject + Feedback
           │           │   └─ Yes → Human Gate?
           │           │       ├─ Yes → User Modal
           │           │       │   ├─ User Approves → Apply Update
           │           │       │   └─ User Denies → Discard
           │           │       └─ No / Auto → Apply Update
           │           │           └─ Post-Apply Verification
           │           │               ├─ Post-Verify OK?
           │           │               │   ├─ Yes → Commit
           │           │               │   └─ No → Rollback
           │           │               └─ RL Feedback Loop
           └─ Publish & Notify
               └─ Update sidebar, bump version, log success
```

### Detailed Nodes & Edges

| Node / Step                  | Framework Integration          | Safety / Validation Checks                                |
|------------------------------|--------------------------------|-----------------------------------------------------------|
| Critic Detection             | AutoGen chat trigger           | Pattern confidence >0.8 or priority impact >0              |
| Generate UV Task             | TO_DO AI + template             | Link to original evidence logs                            |
| UV Task Node (Boss)          | LangGraph stateful node         | Execute verification checklist from template              |
| Is Update Needed?            | Conditional edge (RL-tuned)     | Weighted scoring (P1 miss = high weight)                 |
| Proposal Node                | AutoGen group chat              | Message limit (max 8 turns) to prevent loops              |
| Validate Node                | LangGraph tool-calling node     | YAML schema + dry-run sim + perf impact <10%              |
| Human Gate?                  | Conditional edge                | Risk score > threshold → user modal (configurable)        |
| Apply Update                 | Updating Tool (MCP)             | Atomic write + automatic backup of old version            |
| Post-Apply Verification      | Sub-graph (Verification node)   | Coverage delta, error rate, latency change                |
| Commit / Rollback            | State update + checkpoint       | Auto rollback on failure; version bump on success         |
| RL Feedback Loop             | External logging hook           | Reward = reduced miss rate + no perf regression           |

### Example Update Flow: Adding Linting Check to Verification Template

```
1. Critic Detects Pattern
   Pattern: INVALID_PARAM "linting_skipped" × 7 in P1 tasks (To Do List)
   Confidence: 0.92 (high)

2. Generate UV Task (UV-047)
   Proposed: Add checklist item "V4: Run ESLint --max-warnings=0 on P1 files"
   Priority: 1 (P1 impact)
   Evidence: 7 error logs linked

3. UV Task Node
   Verify need: Log analysis confirms linting step missing in 7/7 cases → TRUE
   Assess impact: P1 = high weight
   RL routing: → Proposal

4. Proposal Node (AutoGen Chat)
   Turn 1 - Critic: "Add V4 as above; place after V1 (tests run first)"
   Turn 2 - Updater: "Agree. Config: priority=1, condition='priority_level<=2'"
   Turn 3 - Critic: "Approved. Generate proposal JSON"

5. Validate Node
   Schema: ✓ Valid YAML structure
   Dry-run: Mock Verification agent with V4 added
     - No syntax errors ✓
     - Est. execution time +8% (acceptable) ✓
     - No conflicts with other P1 rules ✓

6. Human Gate?
   Risk score: 0.3 (low - simple checklist add)
   User modal: Skipped (auto-approve)

7. Apply Update
   Updating Tool: Update verification-team.yaml
     - Add V4 to checklists section
     - Bump version 1.4 → 1.5
     - Create backup (verification-team.yaml.bak.1.4)
   Result: ✓ Updated

8. Post-Apply Verification
   Re-run last 3 failed cycles with new template:
     Case 1: Linting caught ✓ (was missed before)
     Case 2: Linting caught ✓
     Case 3: Linting caught ✓
   Coverage: 3/3 → 100%
   Result: ✓ No new failures

9. Commit & RL Feedback
   Success: Pattern count (7 → 1 in 24h post-update) ✓
   Reward: reduction_score × (severity + impact) = 0.86 × 0.76 = 0.65 ✓
   Notify sidebar: "Verification template evolved (v1.5) – linting check added"
```

### Loop & Breakage Prevention

- **Max turns in Proposal chat**: 8 (AutoGen configured)
- **Max validation attempts**: 3
- **Automatic rollback**: On post-verify failure
- **Circuit-breaker**: >3 failed updates in 24h → pause auto-updates for template
- **Full audit trail**: All changes checkpointed in SQLite

---

## Part III: CrewAI & LangGraph Hybridization

### Hybrid Architecture

```
LangGraph (Graph-level)
   └─ Orchestrates workflow structure & state
       ├─ Supervisor node (Boss)
       └─ Worker nodes → CrewAI crews (Team-level)
           ├─ Planning crew (@planning-agent + @planner-specialist)
           ├─ Coding crew (@coding-agent + @code-reviewer)
           ├─ Verification crew (@verifier-agent + @tester)
           └─ Evolution crew (@critic-agent + @updater-agent)
```

### CrewAI Crew Definition Example

```yaml
# crews/planning-crew.yaml
name: "Planning Crew"
description: "Decomposes plans into tasks with dependencies"

agents:
  - role: "Planning Lead"
    backstory: "Expert at breaking down complex requirements"
    goal: "Generate dependency-aware task trees"
    tools: [decompose, validate_dag, estimate_effort]
    
  - role: "Priority Specialist"
    backstory: "Ensures P1/P2/P3 alignment with user intent"
    goal: "Assign priorities correctly per PRD"
    tools: [analyze_prd, score_priority, flag_conflicts]

tasks:
  - description: "Decompose {plan_module}"
    assigned_to: "Planning Lead"
    expected_output: "Task tree JSON with dependencies"
    
  - description: "Prioritize tasks for {priority_level}"
    assigned_to: "Priority Specialist"
    expected_output: "P1/P2/P3 tagged tasks"

process: "hierarchical"  # Boss orchestrates; crew self-organizes within scope
```

### Integration: CrewAI as LangGraph Node

```typescript
// Create LangGraph node that runs a CrewAI crew

async function planningCrewNode(state: COEState): Promise<Partial<COEState>> {
  const crew = new Crew({
    agents: [planningLead, prioritySpecialist],
    tasks: [decomposeTask, prioritizeTask],
    process: "hierarchical",
    verbose: false
  });
  
  // Execute crew with inputs from state
  const result = await crew.kickoff({
    plan_module: state.prd.current_focus,
    priority_level: state.priority_areas[0],
  });
  
  // Update state with crew outputs
  return {
    todoQueue: [...state.todoQueue, ...result.tasks],
    feedback: {...state.feedback, planning_status: "completed"}
  };
}

// Add to graph
workflow
  .addNode("planning", planningCrewNode)
  .addEdge("planning", "orchestrator");
```

---

## Part IV: Workflow Protocols & Execution Patterns

### Strict Sequential Execution

```
Supervisor → Decision → Route → Execute Node (Crew or Agent)
                 ↓
            Update State
                 ↓
            Checkpoint
                 ↓
            Return to Supervisor
                 ↓
            Next Decision
```

### Error Handling & Recovery

```typescript
// LangGraph built-in error handling

workflow.on_error = async (node_name: string, error: Error, state: COEState) => {
  console.error(`Error in ${node_name}: ${error.message}`);
  
  // Determine recovery action based on error type
  if (error.code === "TOKEN_LIMIT_EXCEEDED") {
    // Trigger context breaker
    state.break_context = true;
    return "supervisor";  // Return to supervisor
  } else if (error.code === "RECOVERY_TRIGGERED") {
    // Fresh start
    state.fresh_start = true;
    return "recovery_node";
  } else {
    // Generic error: pause & notify user
    state.paused = true;
    return END;
  }
};
```

### Checkpoint Strategy

```yaml
checkpoint_config:
  mode: "full"  # Save complete state at each node
  interval_ms: 5000  # Checkpoint every 5 seconds
  retention_days: 30  # Keep 30 days of history
  
  rollback_policy:
    on_error: true       # Auto-rollback on failure
    on_recovery: true    # Rollback to fresh start
    on_user_request: true
    
  recovery_points:
    - after_planning: "Planning complete, tasks ready"
    - after_coding: "Code written, ready for verification"
    - after_verification: "Verified, ready to deploy"
```

---

## Part V: Performance Optimizations for 14B Models

### Efficient State Management

- **Procedural Memory**: Store core state (PRD, priorities, drift) for fast recall
- **Lazy Loading**: Load detailed context only when needed
- **Message Compression**: AutoGen chats limited to 512 tokens per turn
- **Batch Operations**: Combine multiple tool calls into single node execution

### RL Training for Supervisor

```yaml
rl_config:
  model: "qwen3-14b-int4"  # Quantized 14B
  training_data_source: "LangGraph checkpoints + execution outcomes"
  
  reward_signals:
    - drift_reduction: 0.4  # Weight on reducing drift
    - p1_completion: 0.3    # Weight on P1 task completion
    - time_efficiency: 0.2  # Weight on execution speed
    - error_prevention: 0.1 # Weight on avoiding errors
  
  training_frequency: "weekly"  # Fine-tune every week
  dataset_size_min: 1000  # Minimum samples before training
```

---

## References

- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/overview)
- [CrewAI Framework](https://docs.crewai.com/)
- [LangChain State Management](https://docs.langchain.com/oss/python/langgraph/state-management)
- [Supervisor Pattern Guide](https://docs.langchain.com/oss/python/langgraph/tutorials/agent_executor)

---

**End of LangGraph Update Flows & Supervisor Patterns Documentation**
