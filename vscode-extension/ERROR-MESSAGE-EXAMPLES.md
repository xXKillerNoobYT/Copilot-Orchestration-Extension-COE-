# Error Message Examples

This document shows examples of the improved error messages before and after the enhancements.

## 1. Checklist Loading Failure

### Before (BAD ❌)
```
Could not fetch checklist from backend. Using default checklist.
```
*No indication of what URL was tried, why it failed, or what to do*

### After (GOOD ✅)
```
⚠️ Checklist Loading Failed

Could not fetch task checklist from backend:
  - Attempted: http://localhost:8000/api/v1/verification/checklist?taskId=TASK-123
  - Error: ECONNREFUSED (Connection refused)

Possible causes:
  ✓ Laravel backend not running
  ✓ Incorrect backend URL in settings
  ✓ Network connectivity issue

Solutions:
  1. Start backend: php artisan serve
  2. Check settings: copilot-orchestrator.backendUrl
  3. Verify: curl http://localhost:8000/api/v1/verification/checklist

Using default checklist as fallback.
```

**User can click "Show Details" to see:**
- Full error log with timestamp
- Stack trace (if available)
- All error context in Output Channel

---

## 2. MCP Connection Failure

### Before (BAD ❌)
```
MCP Request Failed: Unable to connect to server
```
*Generic error with no actionable information*

### After (GOOD ✅)
```
⚠️ MCP Request Failed

Could not connect to MCP server:
  - Attempted: http://localhost:8000/api/v1/mcp/nextTask
  - Error: ECONNREFUSED (Connection refused)

Possible causes:
  ✓ MCP server not running
  ✓ WebSocket/MCP server port mismatch
  ✓ Incorrect MCP URL in settings
  ✓ Docker container not started

Solutions:
  1. Start MCP server: docker-compose up -d
  2. Check settings: copilot-orchestrator.mcp.baseUrl
  3. Verify MCP server: curl http://localhost:8000/api/v1/mcp/nextTask
  4. Check Docker: docker ps

Method: GET
```

---

## 3. Agent Loop Start Failure

### Before (BAD ❌)
```
Failed to start agent loop: Start loop failed: fetch failed
```
*Nested error messages that are hard to understand*

### After (GOOD ✅)
```
⚠️ Start Agent Loop Failed

Could not start the agent switching loop:
  - Attempted: http://localhost:8000/api/v1/agent-loop/start
  - Error: ECONNREFUSED (Connection refused)

Possible causes:
  ✓ Laravel backend not running
  ✓ Incorrect backend URL in settings
  ✓ Agent loop service not initialized
  ✓ Network connectivity issue

Solutions:
  1. Start backend: php artisan serve
  2. Check settings: copilot-orchestrator.backendUrl
  3. Verify backend: curl http://localhost:8000/api/v1/agent-loop/status
  4. Check Laravel logs for errors
```

---

## 4. Plans Not Found

### Before (BAD ❌)
```
No plans found in workspace
```
*No information about where we looked or what to do*

### After (GOOD ✅)
```
⚠️ Load Plans Failed

No plans found in workspace

Searched locations:
  - /workspace/Docs/Plans
  - /workspace/.vscode/plans

Possible causes:
  ✓ Plans directory does not exist
  ✓ No plan files created yet
  ✓ Searching in wrong workspace folder

Solutions:
  1. Create your first plan using the Plan Builder
  2. Ensure plans are saved in Docs/Plans/ or .vscode/plans/
  3. Open the correct workspace folder
  4. Run: copilot-orchestrator.openPlanBuilder
```

---

## Output Channel Logging

All errors are logged to the **Copilot Orchestrator** output channel with:

```
[2026-01-19T06:45:23.456Z] ⚠️ Checklist Loading Failed

Could not fetch task checklist from backend:
  - Attempted: http://localhost:8000/api/v1/verification/checklist?taskId=TASK-123
  - Error: ECONNREFUSED (Connection refused)

Possible causes:
  ✓ Laravel backend not running
  ✓ Incorrect backend URL in settings
  ✓ Network connectivity issue

Solutions:
  1. Start backend: php artisan serve
  2. Check settings: copilot-orchestrator.backendUrl
  3. Verify: curl http://localhost:8000/api/v1/verification/checklist

Using default checklist as fallback.

Stack trace:
Error: ECONNREFUSED
    at fetch (...)
    at fetchChecklist (visualVerificationPanel.ts:311)
    ...
```

---

## Key Improvements

### 1. Clear Structure
- **Operation** - What was being attempted
- **URL** - Exact endpoint that failed
- **Error** - Clean error code (ECONNREFUSED, ETIMEDOUT, etc.)

### 2. Diagnostic Information
- **Possible Causes** - Why it might have failed
- **Solutions** - Step-by-step fixes with commands

### 3. User Experience
- **No Spam** - One error per operation
- **Show Details Button** - Optional full logs
- **Output Channel** - Persistent log for debugging
- **Timestamps** - Track when errors occurred

### 4. Developer-Friendly
- **Stack Traces** - Available in Output Channel
- **Context** - Additional information when available
- **Verified Commands** - Copy-paste ready solutions

---

## Impact

### Before ❌
- Users confused about what went wrong
- No actionable guidance
- Support burden high
- Development velocity reduced

### After ✅
- Users can self-diagnose issues
- Clear step-by-step solutions
- Support burden reduced
- Development velocity improved
- Better developer experience

---

## Testing Coverage

All error scenarios are covered by 18 passing unit tests:

1. ✅ Complete error message structure
2. ✅ Errors without URL
3. ✅ Connection refused errors
4. ✅ Timeout errors
5. ✅ Host not found errors
6. ✅ Backend-specific messages
7. ✅ MCP-specific messages
8. ✅ Plans not found messages
9. ✅ Output channel initialization
10. ✅ Logging with timestamps
11. ✅ Output channel reuse
12. ✅ Proper disposal
13. ✅ Actionable solutions
14. ✅ No cryptic jargon
15. ✅ Verification steps
16. ✅ Error categorization
17. ✅ Timeout detection
18. ✅ Non-Error object handling
