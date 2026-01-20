# Error Catalog
**Complete reference for all audit-discovered errors**  
**Date:** January 16, 2026  
**Total Issues:** 11 (1 Critical, 5 High, 5 Medium)

---

## Issue #1: CRITICAL - Concurrent Task Status Updates Without Locking

### Error Signatures
```
"Task status flickers between states"
"GitHub issue status inconsistent with backend task state"
"Agent update overwrote previous status"
"Task stuck in intermediate state"
```

### Root Causes
1. **No optimistic locking** in task status updates
2. **No version field** to detect concurrent modifications
3. **Last-write-wins semantics** on backend (no conflict detection)
4. **No task lease/lock mechanism** during agent execution
5. Multiple agents (Planner, Coder, Tester) can call `reportTaskStatus()` simultaneously without coordination

### Diagnostic Steps

**Check 1: Monitor Agent Activity**
```
Open Agent Mode panel → Watch task state transitions
Expected: pending → in-progress → done (smooth)
Problem: State flickers, jumps backward, or changes unexpectedly
```

**Check 2: Review Server Logs**
```
Check MCP server logs for concurrent POST requests to /mcp/reportTaskStatus
Look for pattern: Multiple status updates within milliseconds
Indicates race condition
```

**Check 3: Verify Agent Coordination**
```
Enable DEBUG logging: copilot-orchestrator.logging.level = DEBUG
Look for: "[Agent] reportTaskStatus(..." messages
Verify: Only one agent per task is updating status
```

### Recommended Fixes

**Short-term (Workaround):**
- Disable Agent Mode (use Classic mode)
- Run agents sequentially (not concurrently)

**Long-term (Fix):**
1. Add `expectedVersion` field to status update payload
2. Implement optimistic locking (compare-and-swap)
3. Return HTTP 409 Conflict if version mismatch
4. Add exponential backoff retry logic in client
5. Document task ownership semantics

### Implementation Reference
- **File:** `vscode-extension/src/services/mcpClient.ts` (lines 123-133)
- **Method:** `reportTaskStatus()`
- **Backend:** MCP `/mcp/reportTaskStatus` endpoint

---

## Issue #2: HIGH - Hard-Coded LM Studio IP Address Not Portable

### Error Signatures
```
"LLM service is unreachable when run on different network"
"HTTP Error: connect ECONNREFUSED localhost:1234"
"Cannot reach LM Studio at configured address"
"LLM endpoint returns Connection Refused"
```

### Root Causes
1. **LM Studio not running** - Server not started on port 1234
2. **Wrong port configuration** - LM Studio running on different port
3. **Firewall blocking connection** - Local firewall rules preventing access
4. **Model not loaded** - LM Studio running but no model loaded
5. **Wrong base URL** - Incorrect endpoint configuration

### Diagnostic Steps

**Check 1: Inspect Current Configuration**
```
Open Settings → Search "copilot-orchestrator.llm.baseUrl"
Current value: _______________
Default: http://localhost:1234/v1
Is it correct for your environment?
```

**Check 2: Test Connectivity**
```bash
curl -v http://localhost:1234/v1/models
# Expected: 200 OK + model list
# Actual error: Connection refused / Timeout
```

**Check 3: Check Environment**
```bash
# Is LM Studio running?
# Check if port 1234 is listening
netstat -an | grep 1234
# Or on Windows:
netstat -an | findstr 1234
```

### Recommended Fixes

**Immediate (Workaround):**
1. Ensure LM Studio is running with a model loaded
2. Verify port 1234 is the correct port in LM Studio settings
3. Check firewall settings allow localhost connections
4. If using remote server, set `COPILOT_LLM_BASE_URL=http://your-server:1234/v1`

**Configuration:**
1. Default is now `localhost` (portable across all environments)
2. Use environment variable for CI/CD: `export COPILOT_LLM_BASE_URL=http://server:1234/v1`
3. For remote servers, update setting: `copilot-orchestrator.llm.baseUrl = http://remote-ip:1234/v1`
4. APIPA addresses (169.254.x.x) will show a warning - reconfigure your network

### Environment Variable Override
```bash
# Set environment variable (takes priority over settings)
export COPILOT_LLM_BASE_URL="http://my-server:1234/v1"

# Or add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
echo 'export COPILOT_LLM_BASE_URL="http://my-server:1234/v1"' >> ~/.bashrc
```

### Configuration Help
See: `Docs/CONFIGURATION-REFERENCE.md` → `copilot-orchestrator.llm.baseUrl`

### Implementation Reference
- **File:** `vscode-extension/src/config/llmConfig.ts` (line 26)
- **File:** `vscode-extension/src/transport/lmstudioProvider.ts` (line 13)

---

## Issue #3: HIGH - Extension Caches Stale LLM Config in globalState

### Error Signatures
```
"LLM unreachable error after changing settings"
"Settings changed but extension still uses old URL"
"New configuration not taking effect"
"Test panel works with new URL, but Agent Mode still uses old URL"
"Extension must be restarted to pick up changes"
```

### Root Causes
1. **globalState cache** not invalidated on config change
2. **No onDidChangeConfiguration event listener**
3. Cache read in `llmIPMonitor.ts` returns stale value
4. Singleton created once with old config
5. No refresh mechanism until extension reload

### Diagnostic Steps

**Check 1: Reproduce Stale Cache**
1. Note current `copilot-orchestrator.llm.baseUrl` value
2. Open Settings → Change to different URL
3. Open test panel → Try new URL → ✅ Works
4. Open Agent Mode → Try using agent → ❌ Still uses old URL?
5. Reload VS Code: `Cmd/Ctrl+Shift+P` → "Reload Window" → ✅ Works

**Check 2: Check Extension Logs**
```
Help → Toggle Developer Tools → Console tab
Look for: Cache hit messages or old URL references
```

### Recommended Fixes

**Immediate (Workaround):**
- Restart VS Code after changing settings

**Permanent (Fix):**
1. Remove globalState caching or add TTL
2. Listen to `vscode.workspace.onDidChangeConfiguration` event
3. Clear/reload cache when config changes
4. Test that settings take effect immediately

### Implementation Reference
- **File:** `vscode-extension/src/services/llmIPMonitor.ts` (line 339)
- **Method/Field:** `globalState.get('llmConfig')`

---

## Issue #4: HIGH - Inconsistent MCP Endpoint Paths Cause 404s

### Error Signatures
```
"MCP request failed: HTTP 404 Not Found"
"Failed to save plan: plan endpoint not found"
"Failed to load plan: endpoint not found"
"MCP tool not found"
"Some MCP operations work (nextTask), others fail (savePlan)"
```

### Root Causes
1. **Mixed endpoint patterns:** `/mcp/nextTask` vs `/api/v1/mcp/savePlan`
2. **Backend enforces one pattern** - half the endpoints return 404
3. **Copy-paste errors** during development
4. **No validation** that paths match backend schema

### Diagnostic Steps

**Check 1: Inspect Code Paths**
- Look at `vscode-extension/src/services/mcpClient.ts`
- Search for `fetchWithRetry` calls
- Check prefix: Is it `/mcp/` or `/api/v1/mcp/`?

**Check 2: Test MCP Endpoints**
```bash
# Test path 1
curl -v http://localhost:8000/api/v1/mcp/nextTask

# Test path 2
curl -v http://localhost:8000/mcp/nextTask

# One should return 404
```

**Check 3: Review Server Logs**
```
Check MCP server logs for 404 responses
Note which paths are being hit
```

### Recommended Fixes

**Short-term (Workaround):**
- Identify which pattern backend uses
- Update client to match backend schema
- Either all `/api/v1/mcp/*` or all `/mcp/*`

**Long-term (Fix):**
1. Document canonical endpoint schema
2. Update all client methods to use consistent pattern
3. Add integration test for all endpoints
4. Add path validation in client

### Implementation Reference
- **File:** `vscode-extension/src/services/mcpClient.ts` (lines 206-225)
- **Methods:** `savePlan()`, `loadPlan()`, `listPlans()`, `reportTaskStatus()`, etc.

---

## Issue #5: HIGH - Agent Profile Mismatch in Context Bundle

### Error Signatures
```
"Agent tool not found"
"Cannot call tool XYZ with current agent profile"
"Agent role changed; tool unavailable"
"Agent assigned as Coder but executing as Reviewer"
"Tool routing failure"
```

### Root Causes
1. **Context bundle missing agent profile** information
2. **No profile version/checksum** in bundle
3. **Profile can change** between task assignment and execution
4. **No validation** that runtime profile matches context
5. Agent executes with wrong tools/capabilities

### Diagnostic Steps

**Check 1: Review Context Bundle**
- Open Agent Mode panel
- Export context bundle (if available)
- Check: Does it include `agentProfile` field?
- Check: Is there a `profileVersion`?

**Check 2: Monitor Agent Execution**
```
Enable DEBUG logging
Look for: Agent profile at task assignment vs execution
Are they the same?
```

**Check 3: Tool Availability**
```
Check: Can agent call expected tools?
Error messages: "tool not found"?
```

### Recommended Fixes

1. Add `agentProfile` field to ContextBundle
2. Add `profileVersion` to detect staleness
3. Validate profile at execution time
4. Log warning if profiles don't match
5. Reject execution if profile mismatch

### Implementation Reference
- **File:** `vscode-extension/src/orchestratorPanel.ts` (ContextBundle interface, line 13-17)

---

## Issue #6: HIGH - No Validation for APIPA Addresses Blocking Connectivity

### Error Signatures
```
"LLM service is unreachable. Configure IP address manually?"
"Cannot connect to 169.254.x.x (APIPA address)"
"Network configuration issue detected"
"Address is not resolvable"
```

### Root Causes
1. **Extension doesn't detect APIPA** (169.254.x.x range)
2. **APIPA indicates DHCP failure** - address not routable
3. **No user-friendly error message** explaining APIPA
4. User unaware that address is not resolvable

### Diagnostic Steps

**Check 1: Inspect LLM Base URL**
```
Settings → copilot-orchestrator.llm.baseUrl
Does it contain: 169.254.x.x?
If YES: APIPA address detected
```

**Check 2: Network Check**
```bash
# On Windows
ipconfig
# On macOS/Linux
ifconfig
# Look for 169.254.x.x (Automatic Private IP)
```

**Check 3: DHCP Status**
```
Check if DHCP is working
Is device getting correct IP from network?
```

### Recommended Fixes

1. Add APIPA detection in URL validation
2. Extract IP from URL and check if 169.254.*.*
3. Provide user-friendly error: "Network IP is APIPA (169.254.x.x) indicating DHCP failure"
4. Suggest: "Set static IP or use localhost"
5. Add validation for reserved/private ranges

### Implementation Reference
- **File:** `vscode-extension/src/config/llmConfig.ts`
- **Function:** `isValidBaseUrl()`

---

## Issue #7: MEDIUM - No HTTP vs HTTPS Mismatch Detection

### Error Signatures
```
"Request timed out after 30000ms"
"LLM endpoint unreachable"
"Connection hangs indefinitely"
"TLS handshake failed" (in server logs)
"ERR_SSL_PROTOCOL_ERROR"
```

### Root Causes
1. **Protocol validation missing** (no check for HTTPS on localhost)
2. **Local servers (LM Studio, Ollama) run on HTTP**
3. User mistakes HTTPS for localhost (causes TLS failure)
4. **No clear error message** indicating protocol issue
5. Test panel timeout doesn't mention TLS

### Diagnostic Steps

**Check 1: Inspect Configuration**
```
Settings → copilot-orchestrator.llm.baseUrl
Is it: https://localhost:1234? (wrong)
Or: https://192.168.168.x? (private network, wrong)
Or: https://api.openai.com? (correct for remote)
```

**Check 2: Test Connection**
```bash
# This will fail with TLS error
curl -v https://localhost:1234/v1/models

# This will succeed
curl -v http://localhost:1234/v1/models
```

**Check 3: Server Certificates**
```
For HTTPS endpoints, check if certificates are valid
```

### Recommended Fixes

1. Add protocol validation: warn if HTTPS for localhost/private IPs
2. Add UI hint: "LM Studio runs on HTTP (not HTTPS)"
3. Improve timeout error messages to mention TLS issues
4. Document reverse proxy setup if HTTPS needed

### Implementation Reference
- **File:** `vscode-extension/src/webviews/settingsPanel.ts`
- **File:** `vscode-extension/src/llm/openaiClient.ts`

---

## Issue #8: MEDIUM - Context Files List Has No Size Cap

### Error Signatures
```
"MCP request failed: Request timed out after 30000ms"
"WebSocket message too large"
"Memory exhaustion during context bundle update"
"Cannot load context: too many files"
```

### Root Causes
1. **No MAX_FILES_PER_BUNDLE constant**
2. **File list unbounded** - can grow infinitely
3. **No validation** on context file list size
4. **No warning** when bundle exceeds threshold
5. Large bundles cause timeouts or OOM

### Diagnostic Steps

**Check 1: Inspect Context Bundle Size**
```
Open Agent Mode → Create context bundle
How many files? Check file list length
Is it in hundreds/thousands?
```

**Check 2: Check MCP Request Size**
```
Enable network logging
Measure size of context bundle requests
Are they very large (> 1MB)?
```

**Check 3: Monitor Performance**
```
Create large context bundle
Measure: response time, memory usage
Does performance degrade?
```

### Recommended Fixes

1. Add MAX_FILES_PER_BUNDLE constant (suggest: 100)
2. Validate file list size in ContextBundle creation
3. Log warning and truncate if exceeded
4. Document recommended context size
5. Add UI warning when approaching limit

### Implementation Reference
- **File:** `vscode-extension/src/orchestratorPanel.ts` (ContextBundle interface)

---

## Issue #9: MEDIUM - No Cache Invalidation on Settings Change

### Error Signatures
```
"Setting changed but extension uses old value"
"Configuration not taking effect"
"MCP request failed: wrong endpoint"
"Agent Mode still using old config"
"Must reload extension to apply changes"
```

### Root Causes
1. **No onDidChangeConfiguration listener** registered
2. **Singleton instances created once** and never refreshed
3. **Cache invalidation requires manual extension restart**
4. Multiple components cache configuration independently

### Diagnostic Steps

**Check 1: Test Config Change**
1. Note a configuration value
2. Change it in settings panel
3. Verify new value takes effect immediately
4. If not: cache not invalidated

**Check 2: Check Event Listeners**
```
Search code for: onDidChangeConfiguration
Count how many listeners registered
Are all singleton caches covered?
```

### Recommended Fixes

1. Add `vscode.workspace.onDidChangeConfiguration` listener
2. Invalidate MCPClient singleton on change
3. Invalidate LLM config cache on change
4. Re-initialize with new config
5. Document that settings changes take effect immediately

### Implementation Reference
- **File:** `vscode-extension/src/services/mcpClient.ts` (getInstance method)
- **File:** Multiple cache locations

---

## Issue #10: MEDIUM - No Validation of Context File Paths

### Error Signatures
```
"Context file not found"
"Invalid file path in context"
"Cannot read context file"
"File doesn't exist but no error logged during creation"
```

### Root Causes
1. **File paths not validated** in ContextBundle
2. **No file existence check** before adding
3. **No path normalization** (relative vs absolute)
4. Silent failure; hard to debug

### Diagnostic Steps

**Check 1: Create Context Bundle**
1. Add files to context
2. Include invalid path (non-existent file)
3. Check: Does it warn/error immediately?
4. Or: Silent acceptance?

**Check 2: Inspect Context Bundle**
```
Does context bundle contain invalid paths?
Can it detect corrupted bundles?
```

### Recommended Fixes

1. Validate file paths using vscode.Uri.file()
2. Check file existence before adding to bundle
3. Log error if path is invalid
4. Reject invalid paths
5. Provide user-friendly error message

### Implementation Reference
- **File:** `vscode-extension/src/orchestratorPanel.ts` (ContextBundle interface)

---

## Issue #11: MEDIUM - Passive Memory Pruning Only on Overflow

### Error Signatures
```
"Memory usage grows indefinitely"
"Agent responses become less accurate over time"
"Old irrelevant entries in context"
"Performance degrades after many cycles"
```

### Root Causes
1. **Memory entries pruned only on overflow** (reactive)
2. **No TTL or staleness check** on entries
3. **No active cleanup mechanism**
4. Old entries remain indefinitely until limit hit
5. Memory footprint increases linearly with cycles

### Diagnostic Steps

**Check 1: Monitor Memory Growth**
```
Enable DEBUG logging
Run agent for many cycles
Check: Memory.length grows linearly?
Does it ever decrease (except on overflow)?
```

**Check 2: Check Memory Content**
```
Review memory entries
Are they recent and relevant?
Or old and stale?
```

**Check 3: Performance Impact**
```
Compare response time: cycle 1 vs cycle 100
Does it degrade with more memory entries?
```

### Recommended Fixes

1. Implement active memory cleanup (e.g., every N cycles)
2. Add TTL/timestamp-based pruning
3. Remove entries older than configurable duration
4. Log when memory is cleaned
5. Document memory management strategy

### Implementation Reference
- **File:** `vscode-extension/src/taskExecutor.ts` (lines 396-397)
- **Method:** Memory pruning logic

---

## Error Quick Reference Table

| # | Issue | Severity | Error Signature | Quick Fix |
|---|-------|----------|-----------------|-----------|
| 1 | Race Condition | CRITICAL | Status flickers | Disable Agent Mode |
| 2 | Hard-coded IP | HIGH | Connection refused | Change to localhost |
| 3 | Stale Cache | HIGH | Old config persists | Reload extension |
| 4 | 404 Endpoints | HIGH | Not found error | Check path consistency |
| 5 | Profile Mismatch | HIGH | Tool not found | Update context bundle |
| 6 | APIPA Detection | HIGH | 169.254.x.x | Check DHCP |
| 7 | Protocol Mismatch | MEDIUM | TLS handshake fails | Use HTTP for localhost |
| 8 | File Size Cap | MEDIUM | Timeout | Limit context files |
| 9 | Cache Invalidation | MEDIUM | Old config used | Reload extension |
| 10 | Path Validation | MEDIUM | File not found | Check file paths |
| 11 | Memory Pruning | MEDIUM | Memory grows | Active cleanup needed |

---

## Dead Letter Queue (DLQ) Error Handling Pattern

**Version:** 1.0.1  
**Added:** January 19, 2026  
**Implementation:** `vscode-extension/src/mcp-server/errorHandler.ts`

### Overview

The Dead Letter Queue (DLQ) provides a robust error handling pattern for MCP message failures. After retry attempts are exhausted, failed messages are persisted to SQLite for debugging, replay, and audit purposes.

### Error Handling Flow

```
┌─────────────────┐
│  MCP Message    │
│  Sent           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Attempt 1      │──────┐
│  (30s timeout)  │      │ Success → Return Result
└────────┬────────┘      │
         │ Fail          ▼
         ▼          ┌─────────────┐
┌─────────────────┐│             │
│  Wait 1000ms    ││             │
│  (backoff)      ││             │
└────────┬────────┘│             │
         │         │             │
         ▼         │             │
┌─────────────────┐│             │
│  Attempt 2      │──────────────┘
│  (30s timeout)  │
└────────┬────────┘
         │ Fail
         ▼
┌─────────────────┐
│  Wait 2000ms    │
│  (backoff 2x)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Attempt 3      │──────┐
│  (30s timeout)  │      │ Success → Return Result
└────────┬────────┘      │
         │ Fail          ▼
         ▼          ┌─────────────┐
┌─────────────────┐│             │
│  Add to DLQ     ││             │
│  Persist SQLite ││             │
│  Emit WebSocket ││             │
└─────────────────┘└─────────────┘
```

### Configuration

```typescript
// Default retry configuration
const config = {
  maxRetries: 3,           // Total attempts (including first try)
  initialDelay: 1000,      // First retry delay (ms)
  maxDelay: 10000,         // Maximum retry delay (ms)
  backoffMultiplier: 2,    // Exponential backoff multiplier
  timeout: 30000           // Per-attempt timeout (ms)
};
```

### Error Types and Handling

#### 1. Network Timeout Errors
**Error Signature:** `Operation timeout after 30000ms`

**Cause:** MCP server not responding within 30 seconds

**DLQ Behavior:**
- Added to DLQ after 3 attempts (total 90 seconds waiting)
- Message type: Based on operation (e.g., `task_request`)
- Handler name: Recorded (e.g., `getNextTask`)

**Recovery:**
1. Check if MCP server is running
2. View failed message in DLQ panel
3. Fix server issues
4. Replay message from DLQ

#### 2. Connection Refused Errors
**Error Signature:** `connect ECONNREFUSED localhost:8000`

**Cause:** MCP server not running or wrong port

**DLQ Behavior:**
- Immediate failure (no retry on connection refused)
- Added to DLQ with full stack trace
- Error message includes connection details

**Recovery:**
1. Start MCP server
2. Verify `copilot-orchestrator.mcp.baseUrl` configuration
3. Replay failed messages from DLQ

#### 3. HTTP Error Responses
**Error Signature:** `HTTP 404`, `HTTP 500`, `HTTP 401`

**Cause:** Server endpoint missing, internal error, or auth failure

**DLQ Behavior:**
- Retries for 500-level errors (transient)
- No retry for 400-level errors (permanent)
- Full request/response logged in DLQ

**Recovery:**
- **404:** Check MCP API version compatibility
- **500:** Check server logs, wait for fix, replay
- **401:** Update auth token, replay

#### 4. Payload Validation Errors
**Error Signature:** `Invalid request payload`

**Cause:** Message doesn't match expected schema

**DLQ Behavior:**
- No retry (validation error is permanent)
- Original payload stored in DLQ for debugging
- Validation error details captured

**Recovery:**
1. Review original payload in DLQ
2. Identify schema mismatch
3. Fix code generating payload
4. Delete DLQ entry (cannot replay)

### DLQ Maintenance Procedures

#### Daily: Monitor DLQ Size
```typescript
// Get current counts
const counts = await dlqService.getCountByStatus();
console.log(`Failed: ${counts.failed}, Archived: ${counts.archived}`);

// Alert if high
if (counts.failed > 100) {
  console.error('⚠️ DLQ has 100+ failed messages!');
}
```

#### Weekly: Archive Old Entries
```typescript
// Archive entries older than 7 days
const archived = await dlqService.archiveOldEntries(7);
console.log(`Archived ${archived} old entries`);
```

#### Monthly: Cleanup Archived
```typescript
// Delete archived entries older than 30 days
const deleted = await dlqService.deleteArchivedEntries(30);
console.log(`Deleted ${deleted} archived entries`);
```

#### Ad-hoc: Replay After Fix
```typescript
// Get failed entries for specific handler
const entries = await dlqService.getEntries({
  status: 'failed',
  handlerName: 'getNextTask'
});

// Replay each
for (const entry of entries) {
  await dlqService.replayMessage(entry.id);
  // Re-send original message to MCP
  await mcpClient.processMessage(entry.originalPayload);
}
```

### Debugging with DLQ

#### View Failed Messages
1. Open Command Palette (`Cmd/Ctrl + Shift + P`)
2. Search: `Copilot Orchestrator: Show Dead Letter Queue`
3. Filter by handler, type, or date
4. Click entry to see full error details

#### Export for Analysis
1. Open DLQ panel
2. Apply filters (e.g., last 7 days)
3. Click "Export JSON" or "Export CSV"
4. Analyze patterns in external tool

#### Common Failure Patterns
- **Same handler failing repeatedly:** Likely server-side bug
- **Multiple handlers timing out:** Network or server overload
- **Validation errors for one message type:** Schema mismatch

### Integration with Monitoring

#### WebSocket Events
Subscribe to `deadLetterAdded` events for real-time alerting:

```typescript
wsClient.on('deadLetterAdded', (event) => {
  console.error(`❌ DLQ: ${event.handlerName} failed`);
  console.error(`   Message: ${event.messageId}`);
  console.error(`   Error: ${event.error}`);
  
  // Send to monitoring system
  metrics.increment('dlq.message_added', {
    handler: event.handlerName,
    message_type: event.messageType
  });
});
```

#### Metrics to Track
- **DLQ size** (total entries)
- **DLQ growth rate** (entries per hour)
- **Most common failure handlers**
- **Replay success rate**
- **Time to resolution** (first_failed_at to replayed)

### Operational Runbook

#### 🔴 High DLQ Growth (>50 entries/hour)

**Symptoms:** DLQ growing rapidly, multiple handlers failing

**Diagnosis:**
1. Check MCP server status
2. Review server logs for errors
3. Check network connectivity
4. Verify database connection

**Resolution:**
1. Fix underlying issue (server restart, network fix)
2. Wait 5 minutes for retries to settle
3. Review DLQ for remaining failures
4. Replay valid messages
5. Delete invalid messages

#### 🟡 Single Handler Failing Repeatedly

**Symptoms:** Same handler (e.g., `getTaskStatus`) failing 10+ times

**Diagnosis:**
1. Open DLQ panel, filter by handler
2. Export failures to JSON
3. Review error messages for pattern
4. Check if specific to certain payloads

**Resolution:**
1. If payload-specific: Fix payload generation
2. If server-side bug: File issue, wait for fix
3. Once fixed: Replay all failed messages
4. Monitor for recurrence

#### 🟢 Normal Operation

**Symptoms:** <10 DLQ entries, occasional timeouts

**Maintenance:**
- Archive weekly (automated)
- Delete monthly (automated)
- Review monthly for trends
- Export quarterly for audit

---

## Related Documentation

- **Audit Steps:** `Docs/AUDIT-CONNECTIVITY-CHECKLIST.md`
- **Configuration:** `Docs/CONFIGURATION-REFERENCE.md`
- **MCP API:** `Docs/MCP-API-CONTRACTS.md` (DLQ Schema section)
- **DLQ Service:** `vscode-extension/src/services/deadLetterQueue.ts`
- **Error Handler:** `vscode-extension/src/mcp-server/errorHandler.ts`
- **Create Issue:** Use `.github/ISSUE_TEMPLATE/audit-connectivity.md`

---

**End of Error Catalog**
