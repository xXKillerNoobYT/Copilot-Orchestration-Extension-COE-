# Troubleshooting Guide

This guide helps you diagnose and fix common issues with the Copilot Orchestrator extension.

## Table of Contents

1. [Backend Connectivity Issues](#backend-connectivity-issues)
2. [MCP Server Connection Issues](#mcp-server-connection-issues)
3. [Agent Loop Failures](#agent-loop-failures)
4. [Plans Not Found](#plans-not-found)
5. [General Troubleshooting Steps](#general-troubleshooting-steps)

---

## Backend Connectivity Issues

### Symptom: "Could not fetch checklist from backend"

**Error Message:**
```
⚠️ Checklist Loading Failed

Could not fetch task checklist from backend:
  - Attempted: http://localhost:8000/api/v1/verification/checklist
  - Error: ECONNREFUSED

Possible causes:
  ✓ Laravel backend not running
  ✓ Incorrect backend URL in settings
  ✓ Network connectivity issue

Solutions:
  1. Start backend: php artisan serve
  2. Check settings: copilot-orchestrator.backendUrl
  3. Verify: curl http://localhost:8000/api/v1/verification/checklist
```

**Solutions:**

1. **Start the Laravel Backend**
   ```bash
   cd /path/to/project
   php artisan serve
   ```
   Default URL: `http://localhost:8000`

2. **Check Backend URL Settings**
   - Open VS Code Settings (Ctrl+,)
   - Search for "copilot-orchestrator.backendUrl"
   - Verify it matches your backend URL (default: http://localhost:8000)

3. **Verify Backend is Running**
   ```bash
   curl http://localhost:8000/api/v1/verification/checklist
   ```
   Expected: JSON response with checklist data

4. **Check Firewall Rules**
   - Ensure port 8000 is not blocked by firewall
   - On Linux: `sudo ufw status`
   - On Windows: Check Windows Firewall settings

5. **Check Laravel Logs**
   ```bash
   tail -f storage/logs/laravel.log
   ```

---

## MCP Server Connection Issues

### Symptom: "MCP Request Failed: Unable to connect to server"

**Error Message:**
```
⚠️ MCP Request Failed

Could not connect to MCP server:
  - Attempted: http://localhost:8000/api/v1/mcp/nextTask
  - Error: ECONNREFUSED

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
```

**Solutions:**

1. **Start MCP Server with Docker**
   ```bash
   docker-compose up -d
   ```

2. **Check MCP URL Settings**
   - Open VS Code Settings
   - Search for "copilot-orchestrator.mcp.baseUrl"
   - Default: `http://localhost:8000`

3. **Verify Docker Containers**
   ```bash
   docker ps
   ```
   Look for running containers related to MCP

4. **Check Docker Logs**
   ```bash
   docker-compose logs -f
   ```

5. **Verify Port Configuration**
   - Ensure MCP server port matches settings
   - Check `docker-compose.yml` for port mappings
   - Default: Port 8000 for HTTP, Port 3000 for WebSocket

---

## Agent Loop Failures

### Symptom: "Failed to start agent loop: Start loop failed: fetch failed"

**Error Message:**
```
⚠️ Start Agent Loop Failed

Could not start the agent switching loop:
  - Attempted: http://localhost:8000/api/v1/agent-loop/start
  - Error: ECONNREFUSED

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

**Solutions:**

1. **Verify Backend is Running**
   ```bash
   curl http://localhost:8000/api/v1/agent-loop/status
   ```

2. **Check Agent Loop Configuration**
   - Ensure agent loop routes are defined in `routes/api.php`
   - Check `AgentLoopController` is properly registered

3. **Restart Backend**
   ```bash
   php artisan serve
   ```

4. **Check for Initialization Errors**
   ```bash
   tail -f storage/logs/laravel.log
   ```

5. **Test Single Agent Cycle**
   - Use "Execute Single Cycle" command first
   - This helps isolate configuration issues

---

## Plans Not Found

### Symptom: "No plans found in workspace"

**Error Message:**
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

**Solutions:**

1. **Create Plans Directory**
   ```bash
   mkdir -p Docs/Plans
   # or
   mkdir -p .vscode/plans
   ```

2. **Create Your First Plan**
   - Press Ctrl+Shift+P
   - Run command: "Copilot Orchestrator: Open Plan Builder"
   - Follow the wizard to create a plan
   - Save the plan to `Docs/Plans/`

3. **Verify Workspace Folder**
   - Ensure you have a workspace folder open
   - File > Open Folder
   - Select the root directory of your project

4. **Check Existing Plans**
   ```bash
   ls -la Docs/Plans/*.json
   ls -la .vscode/plans/*.json
   ```

---

## General Troubleshooting Steps

### Viewing Error Logs

All errors are logged to the **Copilot Orchestrator** output channel:

1. Open Output Panel: View > Output (Ctrl+Shift+U)
2. Select "Copilot Orchestrator" from the dropdown
3. Review error messages with timestamps and stack traces

### Common Solutions

#### 1. Restart Backend Services

```bash
# Stop all services
docker-compose down
php artisan serve --stop

# Start services
docker-compose up -d
php artisan serve
```

#### 2. Clear Extension Cache

```bash
# In VS Code
# Press Ctrl+Shift+P
# Run: Developer: Reload Window
```

#### 3. Check Settings

Essential settings to verify:
- `copilot-orchestrator.backendUrl` - Backend API URL (default: http://localhost:8000)
- `copilot-orchestrator.mcp.baseUrl` - MCP server URL (default: http://localhost:8000)
- `copilot-orchestrator.llm.baseUrl` - LLM server URL (default: http://localhost:1234)

#### 4. Verify Network Connectivity

```bash
# Test backend connectivity
curl http://localhost:8000/api/v1/health

# Test MCP connectivity
curl http://localhost:8000/api/v1/mcp/nextTask

# Test LLM connectivity
curl http://localhost:1234/v1/models
```

#### 5. Check Required Services

Ensure all required services are running:

| Service | Port | Command to Start | Status Check |
|---------|------|------------------|--------------|
| Laravel Backend | 8000 | `php artisan serve` | `curl http://localhost:8000` |
| MCP Server | 8000 | `docker-compose up -d` | `docker ps` |
| LLM Studio | 1234 | Open LM Studio | `curl http://localhost:1234/v1/models` |
| WebSocket | 3000 | Included with backend | `curl http://localhost:3000` |

### Getting More Help

1. **Check Output Channel**
   - View > Output > "Copilot Orchestrator"
   - Contains detailed error messages and stack traces

2. **Enable Debug Logging**
   - Settings > copilot-orchestrator.logging.level
   - Set to "debug" for verbose logs

3. **Check GitHub Issues**
   - Visit the repository's Issues page
   - Search for similar problems
   - Create a new issue with error logs

4. **Run Diagnostics**
   ```bash
   # Test all connections
   npm run diagnostics
   
   # Or manually test each service
   curl http://localhost:8000/api/v1/health
   curl http://localhost:8000/api/v1/mcp/nextTask
   curl http://localhost:1234/v1/models
   ```

### Preventing Spam Errors

Error messages are designed to:
- Show once per operation (not repeatedly)
- Log to Output Channel for review
- Include "Show Details" button to view full logs
- Avoid modal dialogs that interrupt workflow

If you see repeated errors:
1. Fix the underlying issue using this guide
2. Restart the extension (Developer: Reload Window)
3. Check Output Channel for error patterns

---

## Quick Reference

### Connection Test Commands

```bash
# Test Backend
curl http://localhost:8000/api/v1/health

# Test MCP
curl http://localhost:8000/api/v1/mcp/nextTask

# Test LLM
curl http://localhost:1234/v1/models

# Test Docker
docker ps

# View Laravel logs
tail -f storage/logs/laravel.log
```

### Common Port Assignments

- **8000**: Laravel Backend & MCP Server
- **1234**: LM Studio (LLM)
- **3000**: WebSocket Server
- **80/443**: Production (with reverse proxy)

### Important File Locations

- **Settings**: `.vscode/settings.json`
- **Plans**: `Docs/Plans/` or `.vscode/plans/`
- **Logs**: `storage/logs/laravel.log`
- **Output**: VS Code Output Channel "Copilot Orchestrator"

---

**Last Updated**: 2026-01-19
