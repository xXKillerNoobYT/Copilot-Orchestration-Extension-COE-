# Agent Orchestration Guide

## Complete Multi-Agent System for Copilot Orchestration Extension (COE)

This guide describes how the 6 specialized agents work together to coordinate the entire development lifecycle of the Copilot Orchestration Extension.

---

## Agent Overview

| Agent | Role | Key Responsibility | Invocation |
|-------|------|-------------------|-----------|
| **Zen Planner** | Strategist | Break requirements into tasks, map dependencies, assign priorities | `@Zen Planner analyze [requirements]` |
| **Plan Agent** | Architect | Design system structures, enforce architectural patterns | `@Plan Agent design [system aspect]` |
| **Auto Zen** | Executor | Implement tasks, run tests, create follow-up work | `@Auto Zen start` / `@Auto Zen continue` |
| **Testing Agent** | QA Specialist | Generate tests, validate coverage, verify completion | `@Testing Agent generate tests for [file]` |
| **Dependency Agent** | Dependency Manager | Monitor versions, detect drift, apply updates | `@Dependency Agent scan` |
| **Issue Handler** | Issue Manager | Sync GitHub issues, convert to tasks, manage lifecycle | `@Issue Handler check issues` |

---

## Master Orchestration Workflow

### Phase 1: Requirements Intake

```
GitHub Issue OR User Request
    ↓
Issue Handler (via polling or notification)
    ├─ Parse issue/request
    ├─ Categorize (bug|feature|question|task)
    ├─ Extract acceptance criteria
    └─ Forward to Zen Planner for task breakdown
```

### Phase 2: Strategic Planning

```
Issue Handler → Zen Planner
    ├─ Read `Docs/Plan/detailed project description` and `feature list`
    ├─ Analyze scope and complexity
    ├─ Break into atomic tasks
    ├─ Map dependencies
    ├─ Assign priorities
    ├─ Define test strategies
    └─ Create task tree in _ZENTASKS/tasks.json
         ↓
       (If architectural decisions needed)
         ↓
    Zen Planner → Plan Agent (request architecture review)
         ├─ Design decisions
         ├─ Enforce constraints
         ├─ Document architecture
         └─ Return to Zen Planner
         
    Zen Planner → Issue Handler (confirm task creation)
         └─ Link issue to task IDs
```

### Phase 3: Implementation

```
Zen Planner hands off to Auto Zen:

Auto Zen Continuous Loop:
    1. Load workflow context from _ZENTASKS/tasks.json
    2. Get next ready task (zen-tasks_next_task)
    3. Mark in-progress
    4. Implement task
    5. Run basic checks (compile, lint)
    6. Hand off to Testing Agent
         ↓
    Testing Agent (Test Execution):
         ├─ Verify test suite exists
         ├─ Generate missing tests
         ├─ Run all tests
         ├─ Measure coverage
         ├─ Report failures
         └─ Return to Auto Zen
         
    Auto Zen (Handle results):
         ├─ If tests pass:
         │   └─ Verify completion criteria
         │       └─ Mark task done
         │           └─ Observe for new work
         │               └─ Create follow-up tasks if needed
         │
         └─ If tests fail:
             ├─ Analyze failures
             ├─ Create investigation/fix task
             ├─ Mark current task blocked
             └─ Move to next task
```

### Phase 4: Quality Validation

```
During each Auto Zen implementation cycle:

Auto Zen → Testing Agent → Plan Agent
    │            │              │
    ├─ Code  ───►│ Test        │
    │            ├─ Validate   │
    │            │  coverage   │
    │            └─ Verify    ─►│ Check
    │               quality     │ architecture
    │◄────────────────────────◄─┤ compliance
    │                           │
    ├─ Observation checks:
    │   ├─ Dependency changes? (→ Dependency Agent)
    │   ├─ Architecture implications? (→ Plan Agent)
    │   ├─ Documentation gaps? (→ Follow-up task)
    │   └─ New issues found? (→ Follow-up task)
    │
    └─ Mark complete when:
        ✓ Tests pass
        ✓ Coverage acceptable
        ✓ Architecture verified
        ✓ No new lint errors
        ✓ Documentation updated
```

### Phase 5: Dependency Management

```
Dependency Agent (Continuous Background):
    
    Every 24 hours:
        ├─ Scan package manifests
        ├─ Check for security vulnerabilities (HIGH PRIORITY)
        ├─ Detect version updates available
        ├─ Analyze dependency drift
        ├─ Check for deprecated packages
        └─ Create tasks for:
            ├─ CRITICAL: Security vulnerabilities
            ├─ HIGH: Major updates with tests
            ├─ MEDIUM: Minor/patch updates
            └─ LOW: Dependency cleanup
    
    When Auto Zen implements new features:
        Auto Zen → Dependency Agent
            ├─ Any new dependencies added?
            └─ Check compatibility
                ├─ Version conflicts?
                ├─ Transitive dependencies OK?
                └─ Report findings
                    → Create tasks if issues
```

### Phase 6: Issue Lifecycle Closure

```
Auto Zen (Task Complete) → Issue Handler
    ├─ Task marked done
    ├─ PR merged
    ├─ Tests passing
    └─ Deployed

Issue Handler (Issue Closure):
    ├─ Verify acceptance criteria met
    ├─ Update GitHub issue status
    ├─ Post completion comment with:
    │   ├─ PR number
    │   ├─ Test results
    │   ├─ Deployment status
    │   └─ Any follow-up issues
    ├─ Close GitHub issue
    └─ Archive completed task
```

---

## Detailed Agent Collaboration Patterns

### Pattern 1: Task Execution Loop (Auto Zen ↔ Testing Agent)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Auto Zen Task Execution                      │
└─────────────────────────────────────────────────────────────────┘

START: Get next task
   ↓
   └─→ Mark in-progress
       ↓
       └─→ Implement changes
           ├─ Write code
           ├─ Update files
           ├─ Create/modify tests
           └─ Verify basic compile
           
           ↓
           
┌─────────────────────────────────────────────────────────────────┐
│                  Testing Agent Verification                      │
└─────────────────────────────────────────────────────────────────┘

           └─→ [HAND OFF TO TESTING AGENT]
               
               Testing Agent:
               ├─ Run full test suite
               ├─ Check coverage
               ├─ Verify no regressions
               ├─ Run security checks
               └─ Generate coverage report
               
               RESULTS: 
               ├─ All Tests Pass? ✓
               │   └─→ [HAND OFF BACK TO AUTO ZEN]
               │       ├─ Mark task complete ✓
               │       ├─ Commit changes
               │       ├─ Push to repository
               │       └─ Loop back for next task
               │
               └─ Tests Failed? ✗
                   └─→ [REPORT TO AUTO ZEN]
                       ├─ Mark task blocked
                       ├─ Create investigation task
                       ├─ Document failure
                       └─ Move to next task
```

### Pattern 2: Architectural Review (Auto Zen ↔ Plan Agent)

```
Auto Zen implementing structural code:
   ↓
   └─→ "This affects module boundaries"
       ├─ New service interface?
       ├─ Cross-module dependency?
       ├─ New layer being introduced?
       └─ Architectural pattern question?
       
       ↓
       
       [OBSERVE & CONSULT PLAN AGENT]
       
       Plan Agent:
       ├─ Review implementation approach
       ├─ Check against architectural constraints
       ├─ Validate pattern usage
       ├─ Check for circular dependencies
       └─ Provide guidance
       
       DECISION:
       ├─ Architecture compliant? ✓
       │   └─→ Auto Zen: Continue implementation
       │
       └─ Architecture violation? ✗
           └─→ Auto Zen: 
               ├─ Mark task blocked
               ├─ Create refactoring task
               └─ Consult with Plan Agent on fix
```

### Pattern 3: Security & Dependency Review (Auto Zen ↔ Dependency Agent)

```
Auto Zen adding new dependencies:
   ├─ npm install [new-package]
   ├─ Update package.json
   └─ Run tests
       ↓
       
[NOTIFY DEPENDENCY AGENT]

Dependency Agent checks:
├─ Known vulnerabilities? ✗
├─ Compatible versions? ✓
├─ License acceptable? ✓
├─ Performance impact? ~0.5MB
├─ Transitive deps OK? ✓
└─ No conflicts? ✓

RESULT: ✓ APPROVED
   └─→ Auto Zen: Can merge
   
OR

RESULT: ⚠️ WARNINGS
   ├─ Medium severity CVE: Create patch task
   ├─ Large bundle: Consider alternative
   └─ Auto Zen: Proceed with caution, create follow-up
```

### Pattern 4: Cross-Repo Issue Handling (Issue Handler → Multiple Agents)

```
GitHub Issue: "Add feature X to monorepo (affects 3 modules)"
   ↓
Issue Handler:
├─ Parse issue
├─ Identify affected repos/modules
├─ Create sub-issues for each module
├─ Cross-reference all issues
└─ Forward to Zen Planner
   
   ↓
Zen Planner:
├─ Plan implementation strategy
├─ Define inter-module dependencies
├─ Create coordinated task graph
├─ Ensure consistency across modules
└─ Forward to Auto Zen
   
   ↓
Auto Zen:
├─ Execute module 1 tasks
│   ├─ Implement
│   ├─ Test
│   └─ Mark complete
├─ Execute module 2 tasks
│   ├─ Implement (depends on module 1 changes)
│   ├─ Test integration
│   └─ Mark complete
├─ Execute module 3 tasks
│   ├─ Implement
│   ├─ Run cross-module tests
│   └─ Mark complete
└─ Integration test all modules together
   
   ↓
Testing Agent:
├─ Verify module isolation maintained
├─ Test cross-module APIs
├─ Performance across modules
└─ All tests passing ✓
   
   ↓
Issue Handler:
├─ Verify all sub-issues complete
├─ Update main GitHub issue
├─ Mark all issues closed
└─ Confirm deployed
```

### Pattern 5: Observation & Follow-up Work (Auto Zen → Zen Planner)

```
Auto Zen completing implementation task:
   
   Observations (during implementation):
   ├─ Found: Code duplication in 3 files
   ├─ Found: Untested error path in authentication
   ├─ Found: Missing type definitions for API response
   ├─ Found: Documentation outdated
   └─ Found: Performance issue in database query
   
   ↓
   [CREATE FOLLOW-UP TASKS]
   
   Auto Zen → Zen Planner:
   ├─ "Code duplication refactoring needed"
   │   └─ Priority: medium
   │
   ├─ "Add tests for authentication error paths"
   │   └─ Priority: high
   │
   ├─ "Add TypeScript types to API responses"
   │   └─ Priority: high
   │
   ├─ "Update authentication documentation"
   │   └─ Priority: medium
   │
   └─ "Optimize database query N+1 issue"
       └─ Priority: high
   
   ↓
Zen Planner:
├─ Review observations
├─ Estimate effort
├─ Assign priorities
├─ Create new task queue
└─ Link to original completed task
```

---

## Agent Handoff Protocol

### Handoff Format

When one agent hands off work to another:

```
HANDOFF FORMAT:

From Agent: [Name of agent doing handoff]
To Agent: [Name of agent receiving work]
Context:
  - Summary of completed work
  - Status of task(s)
  - Key findings/observations
  - Blockers if any
  
Deliverables:
  - Updated task file(s) in _ZENTASKS/
  - Documentation created/updated
  - Test results/reports
  - Branch/PR information if applicable
  
Expected Output from Recipient Agent:
  - Completion criteria
  - What to do if issues found
  - Timeline if known
  
Status:
  - Task ID(s): [TASK-xxx, TASK-yyy]
  - Current Status: [pending|in-progress|blocked|review]
  - Urgent?: [yes|no]
```

### Example Handoffs

**Auto Zen → Testing Agent:**

```
From: Auto Zen
To: Testing Agent
Context: Completed feature implementation in TASK-045
  - Added user authentication module
  - Created service layer and controller
  - Basic unit tests in place
  
Deliverables:
  - Branch: feature/user-auth
  - Files: src/Auth/AuthService.php (250 lines)
  - Existing tests: 12 unit tests
  
Expected: Full test coverage 80%+, all tests passing, integration tests added
Urgent: No (medium priority feature)
```

**Testing Agent → Auto Zen:**

```
From: Testing Agent
To: Auto Zen
Context: Test run results for TASK-045
  - 12 existing unit tests passing ✓
  - Coverage: 62% (below 80% target)
  - New integration tests created: 8
  - All tests passing ✓
  
Issues Found:
  - 3 error paths untested in AuthService
  - Password validation edge cases uncovered
  - Create TASK-046 to fix issues
  
Deliverables:
  - Test report: coverage-report.html
  - Failing test: test_password_edge_case
  - Investigation details
  
Expected: Auto Zen fixes issues in TASK-046, re-run tests
Status: TASK-045 marked as blocked, TASK-046 created
```

**Plan Agent → Auto Zen:**

```
From: Plan Agent
To: Auto Zen
Context: Architecture review of TASK-045 implementation
  - Created new AuthService with dependency injection ✓
  - Follows repository pattern ✓
  - New cross-module dependency detected ⚠️
  
Issues Found:
  - AuthService imports directly from UserModule
  - Should use published interface instead
  - Violates architecture constraint
  - Create TASK-047 to refactor
  
Deliverables:
  - Architecture review document
  - List of affected files
  - Recommended refactoring approach
  
Expected: Auto Zen creates fix task TASK-047, implements interface-based communication
Status: TASK-045 architecture review complete, 1 violation found
```

---

## Communication Flow Summary

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ISSUE INTAKE PHASE                             │
│                                                                        │
│  GitHub → Issue Handler → Zen Planner → Plan Agent ↔ Testing Agent   │
└────────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────────┐
│                       EXECUTION PHASE                                  │
│                                                                        │
│  Zen Planner → Auto Zen ↔ Testing Agent ↔ Plan Agent ↔ Dep Agent    │
│                 ↓                                                      │
│              Observations → New Tasks → Back to Planning              │
└────────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────────┐
│                       CLOSURE PHASE                                    │
│                                                                        │
│  Auto Zen → Testing Agent → Issue Handler → GitHub                   │
└────────────────────────────────────────────────────────────────────────┘

Legend:
  ↔ = Back and forth communication
  → = One-directional handoff
  ↓ = Continuation to next phase
```

---

## Status Reporting

Each agent provides status updates in this format:

```
Agent: [Name]
Status: [Brief status]
Active Tasks: [Count]
Completed: [Count]
Blocked: [Count]
Observations: [List of new findings]
Next Steps: [What comes next]
Urgent Items: [Any critical blockers]
```

---

## Error Recovery

When any agent encounters an error or blocker:

```
1. IMMEDIATE:
   - Mark task as blocked
   - Document blocker reason
   - Create investigation task with CRITICAL priority

2. NOTIFY:
   - Alert relevant agents about blocker
   - Provide context and details
   - Suggest possible resolutions

3. ESCALATE:
   - Create unblocking task for specialist agent
   - If architectural: escalate to Plan Agent
   - If testing: escalate to Testing Agent
   - If dependency: escalate to Dependency Agent

4. CONTINUE:
   - Move to next available task
   - Keep system moving
   - Return to blocked task when unblocked

5. DOCUMENT:
   - Log blocker in task details
   - Track time spent investigating
   - Capture learnings for future prevention
```

---

## Key Principles

1. **One task in-progress per agent** - Sequential execution for focus
2. **Hand off with context** - Provide full information for next agent
3. **Observe and report** - Report all findings for follow-up tasks
4. **Quality gates enforced** - No task marked done until verified
5. **Architecture maintained** - All code respects design constraints
6. **Tests comprehensive** - Coverage targets enforced
7. **Dependencies managed** - No security or version issues
8. **Issues tracked** - All work linked to source issues
9. **Communication clear** - Status updates and handoffs documented
10. **Continuous improvement** - Learn from observations and adjust

---

## Quick Reference: Who Does What

| Work Type | Responsible Agent | Consulted Agents |
|-----------|------------------|------------------|
| Break down requirements | Zen Planner | Plan Agent, Issue Handler |
| Design architecture | Plan Agent | Zen Planner, Testing Agent |
| Implement code | Auto Zen | Plan Agent, Testing Agent, Dependency Agent |
| Generate/run tests | Testing Agent | Plan Agent, Auto Zen |
| Update dependencies | Dependency Agent | Testing Agent, Auto Zen |
| Manage GitHub issues | Issue Handler | Zen Planner, Auto Zen |
| Create follow-up tasks | Auto Zen & Zen Planner | All agents |

---

This orchestration system ensures no single agent is overloaded, each agent focuses on its specialty, all work is coordinated, and the system continuously improves through observation and follow-up tasks.
