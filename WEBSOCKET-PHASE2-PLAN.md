# Production WebSocket Broadcasting - Phase 2 Work Plan

**Task**: TASK-mk6z8d3p-ws-prod (Continuation)  
**Current Status**: Phase 1 Complete, Phase 2 Ready  
**Code Master Section**: 11.8-11.9  

---

## Phase 1 Complete ✅

- [x] WebSocket client service (multi-driver support)
- [x] Configuration manager (VS Code settings)
- [x] Extension commands (4 commands registered)
- [x] Docker Compose for Soketi
- [x] Dependencies installed
- [x] Documentation

**Result**: Extension can connect to Soketi, Pusher, or Redis WebSocket servers.

---

## Phase 2: Backend Integration & Real-Time Events

### Task 2.1: Backend Event Publishing Setup

**Goal**: Emit WebSocket events from Laravel when tasks/verifications change

**Steps**:

1. **Enable BroadcastServiceProvider** in `config/app.php`
   ```php
   App\Providers\BroadcastServiceProvider::class,
   ```

2. **Create event classes** for each event type:
   - `App\Events\TaskStatusUpdated`
   - `App\Events\TestFailureAlert`
   - `App\Events\VerificationCompleted`
   - `App\Events\ObservationLogged`
   - `App\Events\ServerStatusChanged`
   - `App\Events\AuditEvent`

3. **Implement ShouldBroadcast interface** for each event:
   ```php
   class TaskStatusUpdated implements ShouldBroadcast {
       public function broadcastOn(): Channel {
           return new Channel('mcp-events');
       }
       
       public function broadcastAs(): string {
           return 'task-status-updated';
       }
   }
   ```

4. **Configure Broadcasting** in `.env`
   ```env
   BROADCAST_DRIVER=pusher
   PUSHER_APP_ID=app-123
   PUSHER_APP_KEY=app-key-123
   PUSHER_APP_SECRET=app-secret-123
   PUSHER_HOST=localhost
   PUSHER_PORT=6001
   PUSHER_SCHEME=http
   ```

5. **Update services** to dispatch events
   ```php
   // In TaskService::updateStatus()
   TaskStatusUpdated::dispatch($task, $newStatus);
   ```

**Files to Create/Modify**:
- `app/Events/TaskStatusUpdated.php` (NEW)
- `app/Events/TestFailureAlert.php` (NEW)
- `app/Events/VerificationCompleted.php` (NEW)
- `app/Events/ObservationLogged.php` (NEW)
- `app/Events/ServerStatusChanged.php` (NEW)
- `app/Events/AuditEvent.php` (NEW)
- `config/app.php` (MODIFY - enable provider)
- `config/broadcasting.php` (MODIFY - set driver)
- `.env` (MODIFY - add broadcast config)
- `app/Services/TaskService.php` (MODIFY - dispatch events)
- `app/Services/VerificationService.php` (MODIFY - dispatch events)

**Est. Time**: 2-3 hours

---

### Task 2.2: MCP Client WebSocket Integration

**Goal**: Wire WebSocket into MCP client so panels receive real-time updates

**Steps**:

1. **Add WebSocket listener setup** to `MCPClient.initialize()`
   ```typescript
   private setupWebSocketListeners(): void {
     const ws = getWebSocketClient();
     if (!ws) return;
     
     ws.subscribe('mcp-events', 'task-status-updated', (data) => {
       this.emit('taskStatusChanged', data);
     });
     // ... other events
   }
   ```

2. **Emit MCP events** when WebSocket events received
   ```typescript
   this.emit('taskStatusChanged', {
     taskId: data.taskId,
     status: data.status,
     timestamp: data.timestamp
   });
   ```

3. **Update task cache** on status changes
   ```typescript
   // Keep local cache in sync with real-time updates
   const task = this.taskCache.get(data.taskId);
   if (task) {
     task.status = data.status;
   }
   ```

**Files to Modify**:
- `vscode-extension/src/services/mcpClient.ts` (ADD WebSocket setup)

**Est. Time**: 1-2 hours

---

### Task 2.3: Panel Event Listeners

**Goal**: Update each panel to listen for real-time events and refresh UI

**Panels to Update**:

#### A. Visual Verification Panel

```typescript
// In visualVerificationPanel.ts
private setupWebSocketListeners(): void {
  const ws = getWebSocketClient();
  
  ws?.subscribe('mcp-events', 'server-status-changed', (data) => {
    this.serverStatus = data.status;
    this.updateServerStatusUI();
  });
  
  ws?.subscribe('mcp-events', 'verification-completed', (data) => {
    this.verificationResult = data.result;
    this.updateVerificationUI();
  });
}
```

#### B. Audit Dashboard Panel

```typescript
// In auditDashboardPanel.ts
private setupWebSocketListeners(): void {
  const ws = getWebSocketClient();
  
  ws?.subscribe('mcp-events', 'audit-event', (data) => {
    this.auditLog.push(data);
    this.updateAuditDisplay();
  });
  
  ws?.subscribe('mcp-events', 'observation-logged', (data) => {
    this.observations.push(data);
    this.refreshObservationsList();
  });
}
```

#### C. Programming Orchestrator Tab

```typescript
// In programmingOrchestratorPanel.ts
private setupWebSocketListeners(): void {
  const ws = getWebSocketClient();
  
  ws?.subscribe('mcp-events', 'task-status-updated', (data) => {
    this.updateTaskStatus(data.taskId, data.status);
  });
  
  ws?.subscribe('mcp-events', 'test-failure-alert', (data) => {
    this.showTestFailure(data);
  });
}
```

**Files to Modify**:
- `vscode-extension/src/panels/visualVerificationPanel.ts`
- `vscode-extension/src/panels/auditDashboardPanel.ts`
- `vscode-extension/src/panels/programmingOrchestratorPanel.ts`
- `vscode-extension/src/panels/planAdjustmentWizard.ts` (optional)

**Est. Time**: 2-3 hours

---

### Task 2.4: Integration Testing

**Goal**: Test end-to-end: event publish → broadcast → extension receives → UI updates

**Test Scenarios**:

1. **Happy path**: Event published → Extension receives → UI updates
   ```gherkin
   Given Soketi running and extension connected
   When backend publishes 'task-status-updated' event
   Then extension receives event within 100ms
   And verification panel updates UI immediately
   ```

2. **Reconnection**: Connection drops → Auto-reconnect → Recover
   ```gherkin
   Given connected extension
   When WebSocket disconnected (network loss)
   Then extension attempts reconnect (exponential backoff)
   And auto-reconnects within 30 seconds
   And queued events processed
   ```

3. **Event ordering**: Multiple events → Proper sequence maintained
   ```gherkin
   Given connected extension
   When 10 events published in sequence
   Then extension receives all 10 events
   And events processed in correct order
   And no events lost
   ```

4. **Load testing**: 100+ events/second → Stable performance
   ```gherkin
   Given connected extension
   When 100 events/second published
   Then extension handles without lag
   And memory usage stable
   And no events dropped
   ```

**Test Files to Create**:
- `vscode-extension/src/services/webSocketClient.test.ts` (NEW)
- `vscode-extension/src/services/mcpClient.webSocket.test.ts` (NEW)
- `tests/Feature/WebSocketEventBroadcastingTest.php` (NEW - backend)
- `tests/Integration/ExtensionWebSocketIntegrationTest.ts` (NEW)

**Est. Time**: 3-4 hours

---

### Task 2.5: Production Deployment Guide

**Goal**: Document how to deploy WebSocket infrastructure to production

**Sections**:

1. **Server Setup**
   - Install Docker/Docker Compose
   - Deploy Soketi container
   - Configure TLS/SSL
   - Setup health checks

2. **Laravel Configuration**
   - .env for production
   - Broadcasting driver selection
   - Queue jobs for event publishing
   - Logging/monitoring setup

3. **VS Code Extension**
   - Configuration documentation
   - Deployment to marketplace
   - Auto-update mechanism

4. **Monitoring & Debugging**
   - Health check endpoints
   - Log aggregation
   - Performance metrics
   - Error alerting

5. **Scaling & Performance**
   - Load balancer setup
   - Horizontal scaling
   - Connection pooling
   - Memory optimization

**Files to Create**:
- `DEPLOYMENT-GUIDE.md` (NEW)
- `docs/monitoring-websockets.md` (NEW)
- `docs/scaling-soketi.md` (NEW)

**Est. Time**: 2-3 hours

---

## Phase 2 Timeline

| Task | Est. Time | Priority |
|------|-----------|----------|
| 2.1 Backend Event Publishing | 2-3h | HIGH |
| 2.2 MCP WebSocket Integration | 1-2h | HIGH |
| 2.3 Panel Event Listeners | 2-3h | HIGH |
| 2.4 Integration Testing | 3-4h | MEDIUM |
| 2.5 Production Deployment | 2-3h | MEDIUM |
| **TOTAL** | **10-15h** | - |

---

## Execution Order

1. **Day 1**: Task 2.1 (Backend setup) + Task 2.2 (MCP integration)
2. **Day 2**: Task 2.3 (Panel listeners) + Basic testing
3. **Day 3**: Task 2.4 (Full integration tests)
4. **Day 4**: Task 2.5 (Deployment guide) + Production validation

---

## Success Criteria

- [x] Phase 1: WebSocket client infrastructure
- [ ] Phase 2.1: Backend events publishing
- [ ] Phase 2.2: MCP client receiving events
- [ ] Phase 2.3: Panels updating from WebSocket events
- [ ] Phase 2.4: Integration tests passing (100% pass rate)
- [ ] Phase 2.5: Production deployment documented

**Final Verification**:
- ✓ Task created in backend → Event published to Soketi → Extension receives → UI updates (< 100ms)
- ✓ Verification result changes → Real-time update in extension
- ✓ Test failure → Error notification in extension
- ✓ Observation logged → Dashboard updates
- ✓ Reconnection after disconnect works automatically

---

## Known Dependencies

- **Backend**: BroadcastServiceProvider, Laravel broadcasting events
- **Broadcast Driver**: Soketi running (or Pusher/Redis configured)
- **Extension**: WebSocket connected and configured
- **Tests**: PHPUnit for backend, Mocha for frontend

---

## Rollback Plan

If WebSocket integration fails:
1. Disable event broadcasting (set `BROADCAST_DRIVER=log`)
2. Fall back to polling (MCP client polls server every 5 seconds)
3. Revert panel changes
4. Keep WebSocket client code for future use

---

## Notes

- WebSocket is **non-blocking** feature - pollingfallback ensures app works
- Prioritize **Backend Event Publishing** first (Task 2.1)
- **Load testing** important for production confidence
- Document **fallback behavior** for network disconnection

---

**Ready to start Phase 2?** Begin with Task 2.1: Backend Event Publishing Setup
