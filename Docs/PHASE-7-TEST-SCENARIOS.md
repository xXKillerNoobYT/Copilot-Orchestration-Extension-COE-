# Phase 7 Implementation Test Scenarios

## Overview

Test scenarios for Phase 7: Auto-Agent Switching & Continuous Execution

---

## Test Scenario 1: Basic State Transitions

**Goal:** Verify state machine transitions work correctly.

**Setup:**

1. Create a simple planning task in `_ZENTASKS/tasks.json`
2. Create a simple execution task ready to go

**Steps:**

1. Call `POST /api/v1/agent-loop/cycle` to execute one cycle
2. Verify state transitions: `idle` → `planning_ready` → `planning_done` → `execution_ready` → `execution_done` → `idle`
3. Check logs for transition messages

**Expected Result:**

```json
{
  "status": "success",
  "cycle_result": {
    "state": "planning_ready",
    "task_id": "TASK-xxxx",
    "message": "Transitioning to planning mode for TASK-xxxx"
  }
}
```

---

## Test Scenario 2: Planning Task Execution

**Goal:** Verify Zen Planner is invoked correctly for planning tasks.

**Setup:**

1. Create a planning task: title "Decompose feature X into subtasks"
2. Mock agent endpoint to respond with task tree

**Steps:**

1. Call `POST /api/v1/agent-loop/cycle`
2. Verify `AgentInvocationService::invokeZenPlanner` was called
3. Verify output was captured and stored in task context
4. State should transition to `planning_done`

**Expected Result:**

```
✓ Zen Planner invoked
✓ Output stored in task.context_data
✓ Tasks generated count > 0
✓ State transitioned to planning_done
```

---

## Test Scenario 3: Execution Task Completion

**Goal:** Verify Auto Zen completes tasks and posts comments.

**Setup:**

1. Create execution task with acceptance criteria
2. Mock agent endpoint to return completion summary

**Steps:**

1. Verify task status is `pending`
2. Call `POST /api/v1/agent-loop/cycle`
3. Verify `AgentInvocationService::invokeAutoZen` was called
4. Task status should change to `completed`
5. Post-task comment should be created

**Expected Result:**

```
✓ Auto Zen invoked
✓ Task status: pending → completed
✓ completion_summary captured
✓ Post-task comment created
✓ State transitioned to execution_done
```

---

## Test Scenario 4: Full Loop Execution

**Goal:** Verify complete planning → execution → next task cycle.

**Setup:**

1. Create 3 tasks: planning task, execution task 1, execution task 2
2. Set up mock agent responses

**Steps:**

1. Call `POST /api/v1/agent-loop/start` with `max_cycles: 3`
2. Wait for loop to complete all cycles
3. Verify all tasks were processed in order
4. Check stats: cycles_executed = 3, successes = 3, errors = 0

**Expected Result:**

```
✓ Cycle 1: Planning task processed
✓ Cycle 2: Execution task 1 completed
✓ Cycle 3: Execution task 2 completed
✓ Loop stopped gracefully
✓ Stats: 3 cycles, 3 successes, 0 errors
```

---

## Test Scenario 5: Error Handling & Retry

**Goal:** Verify exponential backoff and retries on agent failure.

**Setup:**

1. Mock agent endpoint to fail 2 times, then succeed
2. Configure `AGENT_MAX_RETRIES = 3`

**Steps:**

1. Call `POST /api/v1/agent-loop/cycle`
2. Verify retries occur with exponential backoff
3. Verify eventual success after 3rd attempt
4. Verify backoff delay increases exponentially

**Expected Result:**

```
✓ Retry 1: Failed, backoff = 2s
✓ Retry 2: Failed, backoff = 3s
✓ Retry 3: Success
✓ State transitions to next
✓ Backoff reset on success
```

---

## Test Scenario 6: Maintenance Mode

**Goal:** Verify system enters maintenance mode when no work available.

**Setup:**

1. Empty task queue (all tasks completed or blocked)

**Steps:**

1. Call `POST /api/v1/agent-loop/cycle` multiple times
2. Verify state transitions to `maintenance_mode`
3. Verify loop continues polling but with longer intervals
4. Add a new task to queue
5. Verify loop exits maintenance mode and processes new task

**Expected Result:**

```
✓ State: maintenance_mode after all tasks done
✓ Polling continues (longer interval)
✓ New task appears in queue
✓ Loop detects and transitions to execution_ready
✓ New task processed
```

---

## Test Scenario 7: Loop Start/Stop Control

**Goal:** Verify loop lifecycle (start, run, stop).

**Setup:**

- None

**Steps:**

1. Call `POST /api/v1/agent-loop/start` with `max_cycles: 0` (infinite)
2. Verify loop starts and cycles begin
3. Wait 2-3 cycles
4. Call `POST /api/v1/agent-loop/stop`
5. Verify loop stops gracefully
6. Call `GET /api/v1/agent-loop/status`
7. Verify stats show cycles executed and stopped state

**Expected Result:**

```
✓ Loop started
✓ Multiple cycles executed
✓ Stop signal sent
✓ Loop exited cleanly
✓ Status shows final stats
```

---

## Test Scenario 8: Concurrent Cycle Execution (Single-threaded)

**Goal:** Verify only one cycle runs at a time (no race conditions).

**Setup:**

- Loop running with slow agent (5s per call)

**Steps:**

1. Call `POST /api/v1/agent-loop/cycle` while loop is running
2. Verify second call is queued or rejected gracefully
3. Verify no duplicate processing of same task

**Expected Result:**

```
✓ Second call waits or returns "already running"
✓ No duplicate task processing
✓ No race conditions in state machine
```

---

## Test Scenario 9: Dependency Respect

**Goal:** Verify dependent tasks aren't executed out of order.

**Setup:**

1. Create task A with dependency on task B
2. Task B is not yet completed
3. Task A is ready but blocked by dependency

**Steps:**

1. Call `POST /api/v1/agent-loop/cycle`
2. Verify task A is NOT selected (dependency not met)
3. Complete task B
4. Call cycle again
5. Verify task A is now selected

**Expected Result:**

```
✓ Task A not selected (dependency blocked)
✓ Task A status: pending, awaiting task B
✓ Task B completed
✓ Task A now selected and executed
```

---

## Test Scenario 10: Metrics & Telemetry

**Goal:** Verify loop metrics are captured and reported.

**Setup:**

- Run 5 cycles with mixed success/error

**Steps:**

1. Call `GET /api/v1/agent-loop/status`
2. Verify stats captured:
   - cycles: 5
   - successes: X
   - errors: Y
   - avg_cycle_time: Z seconds
3. Verify log entries for each cycle

**Expected Result:**

```json
{
  "status": "success",
  "running": false,
  "stats": {
    "cycles": 5,
    "successes": 4,
    "errors": 1,
    "last_update": "2026-01-07T10:30:00Z"
  }
}
```

---

## Manual Integration Test

**Scenario:** End-to-end loop with real(ish) agents

**Steps:**

1. Set up local mock agent endpoints or use real Copilot API
2. Populate task queue with realistic tasks
3. Start loop: `POST /api/v1/agent-loop/start`
4. Observe cycles and log output
5. Verify tasks transition to completed
6. Check GitHub issues for comments (Phase 8 integration)

**Success Criteria:**

- At least 2 full cycles complete
- Tasks marked completed with summaries
- No unhandled exceptions
- Graceful shutdown on demand

---

## Performance Baselines

**Target Metrics for Phase 7:**

- Cycle latency: 30–120s (including agent call time)
- Planning cycle: 60–120s (Zen Planner response)
- Execution cycle: 120–300s (Auto Zen implementation)
- Success rate: >95% (retries counted as success if eventual)
- Memory: <100MB sustained

---

## Troubleshooting

If tests fail:

1. Check logs in `storage/logs/laravel.log`
2. Verify mock agent endpoints are responding
3. Verify cache is working (Redis or file-based)
4. Verify database migrations are up to date
5. Confirm Eloquent models have required fields

---

## Next Steps (After Phase 7 Passing)

- Integrate with Phase 8 (GitHub Issue Sync)
- Add dashboard for loop telemetry
- Tune loop interval and backoff parameters
- Add security validation for agent outputs
