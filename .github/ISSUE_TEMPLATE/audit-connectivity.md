---
name: Audit Connectivity Issue
description: Report LLM/MCP connectivity, configuration, or multi-agent coordination issues
title: "[AUDIT] "
labels: ["connectivity", "audit", "needs-triage"]
assignees: []
---

## Issue Summary

**Brief description of the connectivity issue:**

---

## Environment Details

### System Information
- **OS:** Windows / macOS / Linux / Other: ___________
- **VS Code Version:** ___________
- **Extension Version:** ___________
- **Node.js Version (if applicable):** ___________

### Network Environment
- **Network Type:** Home / Corporate / VPN / Cloud / Other: ___________
- **Proxy Configured:** Yes / No
- **Behind Firewall:** Yes / No
- **On Same Network as LLM Server:** Yes / No / Unknown

### Endpoint Configuration
- **LLM Base URL:** `___________`
- **MCP Base URL:** `___________`
- **Is LLM Server Running:** Yes / No / Unknown
- **Is MCP Server Running:** Yes / No / Unknown

---

## Error Messages

### Primary Error
```
[Paste the exact error message here]
```

### Secondary Errors (if any)
```
[Paste additional error messages]
```

### When Did Error Occur?
- [ ] On startup/extension activation
- [ ] During test panel connectivity check
- [ ] During Agent Mode execution
- [ ] When changing configuration
- [ ] Other: ___________

---

## Reproduction Steps

1. [First step to reproduce]
2. [Second step]
3. [Continue...]

### Is Issue Reproducible?
- [ ] Always (100% of the time)
- [ ] Sometimes (intermittent)
- [ ] Once (hasn't happened again)

### Frequency
- First occurred: ___________
- Last occurred: ___________
- How many times: ___________

---

## Diagnostic Information

### Configuration Check
- [ ] I verified `copilot-orchestrator.llm.baseUrl` is configured
- [ ] I verified `copilot-orchestrator.mcp.baseUrl` is configured
- [ ] I verified the URLs use correct protocol (http/https)
- [ ] I verified the URLs point to accessible addresses

### Network Connectivity Tests
```bash
# Test LLM connectivity
curl -v http://<LLM_IP>:<PORT>/v1/models

# Test MCP connectivity
curl -v http://<MCP_IP>:<PORT>/mcp/nextTask
```
- [ ] LLM endpoint reachable: Yes / No / Timeout
- [ ] MCP endpoint reachable: Yes / No / Timeout

### Address Validation
- [ ] LLM URL contains APIPA (169.254.x.x): Yes / No
- [ ] LLM URL uses HTTPS on localhost: Yes / No
- [ ] Hard-coded IP detected: Yes / No

### Logs & Debug Output

**VS Code Developer Console Output:**
```
[Paste relevant console errors/warnings here]
Help → Toggle Developer Tools → Console tab
```

**MCP Server Logs:**
```
[Paste MCP server console output]
```

**LLM Server Logs:**
```
[Paste LM Studio / Ollama logs]
```

**Extension Debug Logs:**
```
[If debug logging enabled, paste DEBUG level logs]
```

---

## Steps Already Tried

- [ ] Restarted VS Code
- [ ] Restarted LLM server (LM Studio / Ollama)
- [ ] Restarted MCP server
- [ ] Changed `copilot-orchestrator.llm.baseUrl` to `http://localhost:1234/v1`
- [ ] Verified network connectivity with `ping` / `curl`
- [ ] Checked firewall/network settings
- [ ] Reviewed logs for error details
- [ ] Cleared extension cache/data
- [ ] Reinstalled extension
- [ ] Other: ___________

---

## Related Issues & Documentation

### Self-Diagnostic Resources
- [ ] I read **AUDIT-CONNECTIVITY-CHECKLIST.md**
- [ ] I checked **ERROR-CATALOG.md** for my error signature
- [ ] I reviewed **CONFIGURATION-REFERENCE.md** for config help
- [ ] I checked **MCP-API-CONTRACTS.md** for API details

### Relevant Errors (from audit)
Check `Docs/ERROR-CATALOG.md` for these issue categories:

| Issue # | Category | Matches My Error |
|---------|----------|------------------|
| #1 | CRITICAL - Race condition | [ ] |
| #2 | HIGH - Hard-coded IP | [ ] |
| #3 | HIGH - Stale cache | [ ] |
| #4 | HIGH - 404 endpoints | [ ] |
| #5 | HIGH - Profile mismatch | [ ] |
| #6 | HIGH - APIPA detection | [ ] |
| #7 | MEDIUM - Protocol mismatch | [ ] |
| #8 | MEDIUM - File size cap | [ ] |
| #9 | MEDIUM - Cache invalidation | [ ] |
| #10 | MEDIUM - Path validation | [ ] |
| #11 | MEDIUM - Memory pruning | [ ] |

---

## Additional Context

### What I Expected to Happen
[Describe expected behavior]

### What Actually Happened
[Describe actual behavior]

### Impact
- [ ] Blocking: Cannot use extension
- [ ] Major: Core feature broken
- [ ] Minor: Feature partially works
- [ ] Cosmetic: Visual/messaging issue

### Workaround (if found)
[Describe any temporary workaround you found]

---

## Attachments

### Logs or Config Files
- [ ] I can share VS Code developer console logs
- [ ] I can share LLM server logs
- [ ] I can share MCP server logs
- [ ] I can share settings.json (sanitized for secrets)

### Screenshots
[Attach screenshots showing error/configuration if helpful]

---

## Questions for Troubleshooting

**For Connectivity Issues:**
- Can you reach the LLM/MCP server from terminal? (ping/curl)
- Are LLM and MCP running on the same machine?
- Are they on the same network?
- What firewall software is running?

**For Configuration Issues:**
- Have you changed configuration recently?
- Is the configuration in workspace scope or user scope?
- Have you reloaded VS Code after changing config?

**For Multi-Agent Issues:**
- Is Agent Mode enabled?
- How many agents are running?
- Are tasks assigned correctly?
- What's the task state sequence?

---

## Checklist Before Submission

- [ ] I've provided the exact error message
- [ ] I've tried at least 3 troubleshooting steps
- [ ] I've checked relevant documentation
- [ ] I've included environment/network details
- [ ] I've included logs or debug output
- [ ] I'm not duplicating an existing issue

---

**Reference:** See `Docs/AUDIT-CONNECTIVITY-CHECKLIST.md` for step-by-step diagnostic guide.
