# WebSocket Commands Quick Reference

**Extension**: Copilot Orchestrator  
**Feature**: Production WebSocket Broadcasting  
**Status**: Phase 1 Complete ✅

---

## Commands

### 1. Configure WebSocket
**Command**: `copilot-orchestrator.configureWebSocket`

Opens interactive configuration wizard.

```
Command Palette (Cmd+Shift+P) → "Configure WebSocket"
```

**Steps**:
1. Select driver: `soketi`, `pusher`, or `redis`
2. Enter App Key
3. Enter Host (Soketi/Redis) or Cluster (Pusher)
4. Enter Port (Soketi/Redis)

**Result**: Configuration saved to `.vscode/settings.json`

---

### 2. Test WebSocket
**Command**: `copilot-orchestrator.testWebSocket`

Validates configuration and attempts connection.

```
Command Palette → "Test WebSocket"
```

**Feedback**:
- ✓ "Connected to soketi ✓" = Success
- ✗ "Configuration error: ..." = Fix settings and retry
- ✗ "Connection failed: ..." = Check server is running

---

### 3. Connect WebSocket
**Command**: `copilot-orchestrator.connectWebSocket`

Initializes WebSocket client and subscribes to common events.

```
Command Palette → "Connect WebSocket"
```

**Events Subscribed**:
- `task-status-updated` → Shows info notification
- `test-failure-alert` → Shows error notification
- `observation-logged` → Logs to console
- `verification-completed` → Shows info notification

**Feedback**: "Connected to soketi ✓" notification appears

---

### 4. Disconnect WebSocket
**Command**: `copilot-orchestrator.disconnectWebSocket`

Cleanly closes WebSocket connection.

```
Command Palette → "Disconnect WebSocket"
```

**Feedback**: "Disconnected ✓" notification appears

---

## Keyboard Shortcuts

**Linux/Windows**:
```
Ctrl + Shift + P   → Open Command Palette
Type command name  → Search for WebSocket command
```

**macOS**:
```
Cmd + Shift + P    → Open Command Palette
Type command name  → Search for WebSocket command
```

---

## VS Code Settings

### Location
`.vscode/settings.json` (workspace settings)

### Example Configuration
```json
{
  "copilotOrchestrator.webSocket": {
    "driver": "soketi",
    "appKey": "default-app-key",
    "host": "localhost",
    "port": 6001,
    "scheme": "http",
    "autoConnect": true,
    "reconnectAttempts": 10,
    "reconnectDelay": 1000
  }
}
```

### Manual Editing

**For Soketi**:
```json
{
  "copilotOrchestrator.webSocket": {
    "driver": "soketi",
    "appKey": "your-app-key",
    "host": "your-host",
    "port": 6001
  }
}
```

**For Pusher**:
```json
{
  "copilotOrchestrator.webSocket": {
    "driver": "pusher",
    "appKey": "pusher-app-key",
    "cluster": "mt1"
  }
}
```

**For Redis**:
```json
{
  "copilotOrchestrator.webSocket": {
    "driver": "redis",
    "appKey": "app-key",
    "host": "localhost",
    "port": 6001
  }
}
```

---

## Docker Commands

### Start Soketi
```bash
docker-compose -f docker-compose.soketi.yml up -d
```

### Stop Soketi
```bash
docker-compose -f docker-compose.soketi.yml down
```

### View Soketi Logs
```bash
docker-compose -f docker-compose.soketi.yml logs -f soketi
```

### Health Check
```bash
curl http://localhost:6001/ping
# Response: {"ok":true}
```

---

## Typical Workflow

### Step 1: Setup Soketi (First Time)
```bash
docker-compose -f docker-compose.soketi.yml up -d
curl http://localhost:6001/ping  # Verify running
```

### Step 2: Configure Extension (First Time)
```
Command Palette → "Configure WebSocket"
Select: soketi
App Key: default-app-key
Host: localhost
Port: 6001
```

### Step 3: Connect (Each Session)
```
Command Palette → "Connect WebSocket"
Wait for: "Connected to soketi ✓"
```

### Step 4: Use Extension
- Open Visual Verification Panel
- Open Audit Dashboard
- Panels now receive real-time events

### Step 5: Cleanup (When Done)
```bash
docker-compose -f docker-compose.soketi.yml down
```

Or use command:
```
Command Palette → "Disconnect WebSocket"
```

---

## Troubleshooting

### "Connection failed"
```bash
# Check if Soketi is running
docker ps | grep soketi

# If not running:
docker-compose -f docker-compose.soketi.yml up -d
```

### "Port 6001 already in use"
```bash
# Find what's using port
lsof -i :6001              # Mac/Linux
netstat -ano | grep 6001   # Windows

# Change port in docker-compose.soketi.yml or VS Code settings
```

### "Configuration error"
```
Command Palette → "Configure WebSocket"
Re-enter all settings carefully
Verify appKey matches Docker config
```

### "Events not received"
```
1. Verify extension is connected (Command Palette → "Test WebSocket")
2. Verify backend is publishing events (check backend logs)
3. Verify channel name is "mcp-events"
```

---

## Development vs Production

### Development (Local)
- Driver: Soketi
- Host: localhost
- Port: 6001
- Scheme: http
- Credentials: default-app-key

### Production
- Driver: Soketi (self-hosted) or Pusher (managed)
- Host: Production server domain
- Port: 6001 or 443
- Scheme: https
- Credentials: Production app credentials

See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) (Phase 2) for production setup.

---

## Event Types

**Channel**: `mcp-events`

| Event | Type | Handler |
|-------|------|---------|
| `task-status-updated` | Info Notification | Task status change |
| `test-failure-alert` | Error Notification | Test failure alert |
| `observation-logged` | Console Log | Observation logged |
| `verification-completed` | Info Notification | Verification result |
| `server-status-changed` | Custom Handler | Server status change |
| `audit-event` | Custom Handler | Audit log entry |

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Extension doesn't connect | Verify Soketi running: `curl http://localhost:6001/ping` |
| Port already in use | Stop other services or change port in config |
| "Reconnect in 1000ms" message | Normal - Soketi temporarily unavailable |
| Events not showing | Check backend is publishing events to `mcp-events` channel |
| High latency (>500ms) | Check network latency to Soketi server |
| Memory usage growing | Monitor event publishing rate (should be <100/sec) |

---

## Useful Commands for Development

### Check Soketi Status
```bash
curl -s http://localhost:6001/health | jq
```

### View WebSocket Stats
```bash
# In VS Code
// Press F1, open output panel
// Look for WebSocket logs
```

### Test Event Publishing (Backend)
```php
// In Laravel Tinker
event(new App\Events\TaskStatusUpdated($task, 'done', 'Manual test'));
```

### Monitor WebSocket Traffic (Advanced)
```bash
# Using websocat (install: cargo install websocat)
websocat ws://localhost:6001/app/app-key-123
```

---

## References

- **Main Guide**: [WEBSOCKET-PRODUCTION-SETUP.md](./WEBSOCKET-PRODUCTION-SETUP.md)
- **Quick Start**: [SOKETI-QUICKSTART.md](./SOKETI-QUICKSTART.md)
- **Phase 1 Report**: [WEBSOCKET-PRODUCTION-PHASE1-COMPLETE.md](./WEBSOCKET-PRODUCTION-PHASE1-COMPLETE.md)
- **Phase 2 Plan**: [WEBSOCKET-PHASE2-PLAN.md](./WEBSOCKET-PHASE2-PLAN.md)

---

## Support

For detailed information, see:
1. **Setup Issues**: [SOKETI-QUICKSTART.md](./SOKETI-QUICKSTART.md) → Troubleshooting
2. **Configuration**: [WEBSOCKET-PRODUCTION-SETUP.md](./WEBSOCKET-PRODUCTION-SETUP.md) → Configuration section
3. **Event Publishing**: [WEBSOCKET-PHASE2-PLAN.md](./WEBSOCKET-PHASE2-PLAN.md) → Task 2.1

**Last Updated**: 2026-01-09  
**Status**: Phase 1 Complete ✅
