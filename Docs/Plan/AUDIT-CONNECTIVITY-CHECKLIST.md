# Audit Connectivity Checklist
**Purpose:** Self-diagnostic guide for developers to audit LLM/MCP connectivity, configuration, and multi-agent state  
**Last Updated:** January 16, 2026  
**Audience:** Developers, DevOps, Extension Users

---

## 1. Pre-Audit Setup

### 1.1 Environment Information (Gather First)
- [ ] OS: Windows / macOS / Linux
- [ ] VS Code version: _______________
- [ ] Extension version: _______________
- [ ] LM Studio version (if used): _______________
- [ ] Network type: Home / Corporate / VPN / Other: _______________
- [ ] Proxy configured: Yes / No
- [ ] Firewall enabled: Yes / No

### 1.2 Locate Configuration
- [ ] Find VS Code `settings.json` location:
  - Windows: `%APPDATA%\Code\User\settings.json`
  - macOS: `~/Library/Application Support/Code/User/settings.json`
  - Linux: `~/.config/Code/User/settings.json`
- [ ] Locate `.env` file in workspace root (if present)
- [ ] Locate global `.env` in home directory (if present)

---

## 2. LLM Endpoint Connectivity

### 2.1 Check Endpoint Configuration
- [ ] Open Settings → Search "copilot-orchestrator"
- [ ] Verify `llm.baseUrl` is configured
- [ ] Current value: `_______________________________________`
- [ ] Is it a valid URL? (starts with http:// or https://)
- [ ] Is it localhost/127.0.0.1 or public IP? _______________

### 2.2 Detect Common Address Issues
- [ ] Is IP in APIPA range (169.254.x.x)? 
  - If YES: ⚠️ DHCP failure detected. See **Troubleshooting: APIPA Addresses**
- [ ] Is protocol HTTPS for local server (localhost, 192.168.x.x)?
  - If YES: ⚠️ May cause TLS errors. See **Troubleshooting: Protocol Mismatch**
- [ ] Is protocol HTTP for public/remote server?
  - If YES: ⚠️ Security risk. Consider HTTPS or VPN.

### 2.3 Network Connectivity Test
```bash
# Test from terminal/PowerShell
curl -v http://<LLM_IP>:1234/v1/models
# or
Invoke-WebRequest -Uri "http://<LLM_IP>:1234/v1/models" -Verbose
```
- [ ] Response code: _______ (should be 200)
- [ ] Can reach endpoint: Yes / No / Timeout

### 2.4 LLM Service Status Check
- [ ] Open LM Studio / Ollama directly
- [ ] Is service running? Yes / No
- [ ] Is server listening on configured port?
  - Windows: `netstat -ano | findstr :1234`
  - macOS/Linux: `lsof -i :1234`
- [ ] Output shows process: _______________

### 2.5 Firewall & Network Rules
- [ ] Firewall allows outbound on port 1234? Yes / No / Unknown
- [ ] Corporate proxy interfering? Yes / No / Unknown
- [ ] VPN active? Yes / No
  - If VPN: Does VPN allow access to LLM server IP?

---

## 3. MCP Endpoint Connectivity

### 3.1 MCP Endpoint Configuration
- [ ] Find `copilot-orchestrator.mcp.baseUrl` setting
- [ ] Current value: `_______________________________________`
- [ ] MCP server running? Yes / No
- [ ] MCP server port open? (default 8000)

### 3.2 Test MCP Endpoints
```bash
# Test MCP availability
curl -v http://<MCP_IP>:8000/api/v1/mcp/health
# or
curl -v http://<MCP_IP>:8000/mcp/nextTask
```
- [ ] Response code: _______ (should be 200 or 204)
- [ ] Can reach MCP: Yes / No / Timeout

### 3.3 Endpoint Path Consistency Check
- [ ] Are all MCP paths prefixed with `/api/v1/mcp/`?
- [ ] Or all prefixed with `/mcp/` (without api/v1)?
- [ ] Inconsistency detected? Yes / No
  - If YES: ⚠️ See **Error Diagnosis: 404 Errors from MCP**

### 3.4 MCP Server Status
- [ ] Check MCP server logs for errors
- [ ] Is MCP connected to LLM? Yes / No
- [ ] Is MCP connected to GitHub? Yes / No
- [ ] Any "connection refused" errors? Yes / No

---

## 4. Extension Configuration Validation

### 4.1 Required Settings Present
- [ ] `copilot-orchestrator.llm.baseUrl` present? Yes / No
- [ ] `copilot-orchestrator.mcp.baseUrl` present? Yes / No
- [ ] `copilot-orchestrator.github.token` present? Yes / No (if GitHub integration enabled)
- [ ] `copilot-orchestrator.agent.mode` present? Yes / No

### 4.2 Environment Variables Override
```bash
# Check environment variables
echo %COPILOT_LLM_BASE_URL%          # Windows
echo $COPILOT_LLM_BASE_URL           # macOS/Linux
echo %COPILOT_MCP_BASE_URL%          # Windows
echo $COPILOT_MCP_BASE_URL           # macOS/Linux
```
- [ ] LLM env var set? Yes / No / Value: _______________
- [ ] MCP env var set? Yes / No / Value: _______________
- [ ] Are env vars overriding settings correctly?

### 4.3 Configuration Scope
- [ ] Settings in Workspace scope (best practice)? Yes / No
- [ ] Settings in User scope (affects all workspaces)? Yes / No
- [ ] Settings in Local Machine scope? Yes / No
- [ ] Which scope takes precedence? _______________

### 4.4 Cache Invalidation Test
1. [ ] Note current `llm.baseUrl` value
2. [ ] Change it in settings panel
3. [ ] Open test panel in extension
4. [ ] Does test use NEW URL? Yes / No
   - If NO: ⚠️ Cache not invalidated. See **Troubleshooting: Stale Cache**
5. [ ] Reload VS Code window: `Cmd/Ctrl+Shift+P` → "Reload Window"
6. [ ] Does it now use new URL? Yes / No

---

## 5. Error Message Diagnosis

### 5.1 Capture Error Context
- [ ] Error message text: `_________________________________________________`
- [ ] When did error occur? (click, startup, etc): _______________
- [ ] Is error reproducible? Always / Sometimes / Never
- [ ] First occurrence: _______________
- [ ] Last occurrence: _______________

### 5.2 Check Application Logs
**VS Code Extension Logs:**
```
Help → Toggle Developer Tools → Console tab
```
- [ ] Any `ERROR`, `WARN`, `TypeError` messages?
- [ ] Copy/paste errors here: `_________________________________________________`

**MCP Server Logs:**
- [ ] Check MCP server console output
- [ ] Any connection failures? Yes / No
- [ ] Any timeout errors? Yes / No

**LLM Server Logs:**
- [ ] Check LM Studio / Ollama console
- [ ] Any "connection refused"? Yes / No
- [ ] Any TLS/SSL errors? Yes / No

### 5.3 Network Diagnostic
```bash
# Windows PowerShell
Test-NetConnection -ComputerName <IP> -Port 1234
Test-NetConnection -ComputerName <IP> -Port 8000

# macOS/Linux
nc -zv <IP> 1234
nc -zv <IP> 8000
```
- [ ] Port 1234 reachable? Yes / No / Timeout
- [ ] Port 8000 reachable? Yes / No / Timeout

---

## 6. Network Topology Testing

### 6.1 Network Diagram (Sketch Your Setup)
```
Developer Machine (VS Code Extension)
    ↓ (Network connection)
    ?
    ↓
LLM Server (LM Studio)
   AND
MCP Server
   AND (if configured)
GitHub API
```

### 6.2 Connection Chain Verification
- [ ] Can reach LLM server directly? Yes / No
- [ ] Can reach MCP server directly? Yes / No
- [ ] Can reach GitHub API? Yes / No

### 6.3 Latency & Performance Check
```bash
# Measure round-trip time
ping <LLM_IP>
ping <MCP_IP>
```
- [ ] LLM server latency: _______ ms (should be < 100ms)
- [ ] MCP server latency: _______ ms (should be < 100ms)
- [ ] Any packet loss? Yes / No

### 6.4 Certificate & Security
- [ ] For HTTPS endpoints: Are certificates valid? Yes / No / Unknown
```bash
curl -v https://<endpoint> 2>&1 | grep -i "certificate\|ssl\|error"
```
- [ ] Any certificate errors? Yes / No
- [ ] Self-signed certificate? Yes / No
  - If YES: Add to trusted store or use `--insecure` for curl

---

## 7. Multi-Agent State Verification

### 7.1 Agent Mode Enabled?
- [ ] Is Agent Mode active? Yes / No
- [ ] Setting: `copilot-orchestrator.agent.mode` = _______________

### 7.2 Agent Coordination Test
1. [ ] Open Agent Mode panel
2. [ ] View active agents: Planner, Coder, Tester
3. [ ] All three running? Yes / No / Some: _______________
4. [ ] Any agent errors? Yes / No
5. [ ] Task state consistent across agents? Yes / No
   - If NO: ⚠️ See **Troubleshooting: Multi-Agent Race Conditions**

### 7.3 Task Status Verification
- [ ] Create a test task
- [ ] Monitor task status transitions: pending → in-progress → done
- [ ] Does status flicker or jump? Yes / No
  - If YES: ⚠️ Possible race condition
- [ ] Does GitHub issue status match? Yes / No

### 7.4 Context Bundle Integrity
- [ ] Context bundle loads without errors? Yes / No
- [ ] All context files present? Yes / No
- [ ] Agent profile matches assigned role? Yes / No
  - If NO: Profile mismatch detected

### 7.5 Agent Tool Availability
- [ ] Agent can call MCP tools? Yes / No
- [ ] Any "tool not found" errors? Yes / No
- [ ] Are tools listed in agent profile? Yes / No

---

## 8. GitHub Integration Verification

### 8.1 GitHub Connection
- [ ] GitHub token configured? Yes / No
- [ ] Token valid & not expired? Yes / No
- [ ] Can list repositories? Yes / No

### 8.2 Issue Synchronization
- [ ] Can create test issue? Yes / No
- [ ] Issue created successfully? Yes / No
- [ ] Can update issue? Yes / No
- [ ] Updates reflected in GitHub? Yes / No

### 8.3 Webhook Status (if configured)
- [ ] Webhook URL configured? Yes / No
- [ ] Webhook receiving events? Yes / No
- [ ] Any signature validation errors? Yes / No

---

## 9. Logging & Debug Output

### 9.1 Enable Debug Logging
1. [ ] Open User Settings
2. [ ] Add: `"copilot-orchestrator.logging.level": "DEBUG"`
3. [ ] Reload extension
4. [ ] Reproduce issue

### 9.2 Collect Logs
- [ ] Open Developer Tools: `Help → Toggle Developer Tools`
- [ ] Go to Console tab
- [ ] Copy all ERROR/WARN messages
- [ ] Save to file: `audit-logs.txt`

### 9.3 MCP Debug Output
- [ ] Enable MCP server debug logging
- [ ] Run operation
- [ ] Capture MCP server logs
- [ ] Look for: connection errors, timeouts, 404s

---

## 10. Checklist Summary

### Issues Found
- [ ] LLM connectivity issue: _______________
- [ ] MCP connectivity issue: _______________
- [ ] Configuration issue: _______________
- [ ] Cache/staleness issue: _______________
- [ ] Multi-agent coordination issue: _______________
- [ ] Other issue: _______________

### Next Steps
1. [ ] Compare findings with **ERROR-CATALOG.md** → likely root causes
2. [ ] Follow remediation steps in **CONFIGURATION-REFERENCE.md**
3. [ ] If issue persists, create GitHub issue with template: **audit-connectivity.md**

### Resources
- **Configuration Help:** `Docs/CONFIGURATION-REFERENCE.md`
- **Error Diagnosis:** `Docs/ERROR-CATALOG.md`
- **MCP API Details:** `Docs/MCP-API-CONTRACTS.md`
- **Report Issue:** Use template at `.github/ISSUE_TEMPLATE/audit-connectivity.md`

---

## Troubleshooting Quick Links

### Symptom Index
- **"LLM service is unreachable"** → See Section 2.2-2.5
- **"MCP request failed: HTTP 404"** → See Section 3.3
- **"APIPA address detected"** → See **Troubleshooting: APIPA Addresses** below
- **"Protocol mismatch (HTTPS on localhost)"** → See **Troubleshooting: Protocol Mismatch** below
- **"Stale configuration after change"** → See **Troubleshooting: Stale Cache** below
- **"Task status flickering"** → See **Troubleshooting: Race Conditions** below

### Troubleshooting: APIPA Addresses
**Symptom:** IP address shows `169.254.x.x` in configuration

**Root Cause:** DHCP failure; address is not routable

**Steps:**
1. Check network connection: Is it connected?
2. Restart network adapter or reconnect to WiFi
3. Or use static IP: `192.168.x.x` (replace x with your local network range)
4. Or use `localhost` or `127.0.0.1` for local servers

### Troubleshooting: Protocol Mismatch
**Symptom:** Configuration shows `https://localhost:1234` but LM Studio uses HTTP

**Root Cause:** HTTPS selected for local server (no certificates)

**Steps:**
1. Open settings
2. Change `llm.baseUrl` from `https://...` to `http://...`
3. Test connection

### Troubleshooting: Stale Cache
**Symptom:** Changed `llm.baseUrl` but extension still uses old value

**Root Cause:** Configuration cache not invalidated on change

**Steps:**
1. Reload VS Code: `Cmd/Ctrl+Shift+P` → "Reload Window"
2. Or fully close and restart VS Code

### Troubleshooting: Race Conditions
**Symptom:** Task status flickers between states or changes unexpectedly

**Root Cause:** Multiple agents updating same task simultaneously without locking

**Steps:**
1. Check if Agent Mode is enabled
2. Verify task assignment (only one agent should own task at a time)
3. Check MCP server logs for concurrent update errors
4. Restart Agent Mode

---

**End of Checklist**
