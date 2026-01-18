# MCP Architecture Summary

## How Extensions Provide MCP Tools to GitHub Copilot Coding Agent

### ❌ What Does NOT Happen

- Extensions do NOT directly "plug into" the coding agent
- Extensions do NOT automatically register tools with Copilot
- The coding agent does NOT discover extension tools automatically

### ✅ What Actually Happens

1. **Extension provides an MCP server** (this extension does)
2. **User manually configures** the MCP server in `.github/copilot-mcp.json`
3. **Coding agent reads** the repository MCP configuration (from remote)
4. **Agent discovers and uses** the tools exposed by the MCP server

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Extension PROVIDES MCP Server                     │
│  Location: dist/mcp-server/index.js                        │
│  Transport: stdio (JSON-RPC 2.0)                           │
│  Tools: 7 orchestration tools (task status, feedback, etc) │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ User manually creates config
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: User CONFIGURES in Repository                     │
│  File: .github/copilot-mcp.json                            │
│  {                                                          │
│    "mcpServers": {                                         │
│      "copilot-orchestrator": {                            │
│        "command": "node",                                  │
│        "args": ["/path/to/extension/mcp-server/index.js"] │
│      }                                                      │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Commit & push to remote
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: GitHub Copilot Coding Agent DISCOVERS             │
│  - Reads .github/copilot-mcp.json from REMOTE              │
│  - Spawns MCP server process: node /path/to/index.js       │
│  - Connects via stdio                                       │
│  - Calls tools/list to discover available tools            │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Agent uses tools during task
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Agent USES Tools                                  │
│  - copilot_orchestrator_get_task_status                    │
│  - copilot_orchestrator_list_active_tasks                  │
│  - copilot_orchestrator_request_verification               │
│  - etc.                                                     │
└─────────────────────────────────────────────────────────────┘
```

## Key Differences: Internal Agents vs Coding Agent

### Internal Agents (Auto Zen, Zen Planner, etc.)

- Run inside VS Code extension process
- Use **MCPRouter** to route to Local/Docker/Fallback tools
- Access tools directly via extension APIs
- No repository configuration required

### GitHub Copilot Coding Agent

- Runs on **GitHub's servers** (not in VS Code)
- Reads MCP config from **repository** (not extension)
- Spawns MCP server as **subprocess**
- Communicates via **stdio** (not extension APIs)
- **User must manually configure** in `.github/copilot-mcp.json`

## Docker MCP vs Extension MCP

### Docker MCP Gateway

- **Purpose:** 3rd-party tools (GitHub API, filesystem, shell)
- **For:** Internal agents only
- **Transport:** `docker mcp gateway run` (stdio)
- **Configuration:** `.vscode/mcp-config.json`
- **Dynamic Installation:** Yes (npm, pip, docker)

### Extension MCP Server

- **Purpose:** Orchestration tools (task status, feedback)
- **For:** GitHub Copilot coding agent
- **Transport:** `node dist/mcp-server/index.js` (stdio)
- **Configuration:** `.github/copilot-mcp.json` (in repository)
- **Dynamic Installation:** No (bundled with extension)

## Setup Checklist

### For Internal Agents (Docker MCP)

- ✅ Install Docker Desktop with MCP Toolkit
- ✅ `docker mcp install @modelcontextprotocol/server-github`
- ✅ Configure `.vscode/mcp-config.json`
- ✅ Extension routes tools via DockerMCPClient

### For GitHub Copilot Coding Agent (Extension MCP)

- ✅ Install this extension
- ✅ Run: `Copilot Orchestrator: Generate MCP Config for Coding Agent`
- ✅ Create `.github/copilot-mcp.json` with generated config
- ✅ **Commit and push to remote**
- ✅ Assign issue to GitHub Copilot agent
- ✅ Verify agent discovers tools

## Common Mistakes

### ❌ Mistake 1: Expecting Automatic Discovery

**Wrong:** "I installed the extension, so Copilot agent should have the tools"

**Right:** "I installed the extension, created .github/copilot-mcp.json, committed it, and pushed to remote"

### ❌ Mistake 2: Using Local Config

**Wrong:** Adding MCP config to `.vscode/settings.json`

**Right:** Adding MCP config to `.github/copilot-mcp.json` (repository level)

### ❌ Mistake 3: Not Committing Config

**Wrong:** Creating `.github/copilot-mcp.json` locally only

**Right:** Committing and pushing to remote (agent reads from GitHub, not local)

### ❌ Mistake 4: Using Relative Paths

**Wrong:** `"args": ["./dist/mcp-server/index.js"]`

**Right:** `"args": ["/absolute/path/.vscode/extensions/copilot-orchestrator-1.0.0/dist/mcp-server/index.js"]`

## References

### Official Documentation (Authoritative)
- **GitHub Copilot MCP Guide:** https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp
- **About MCP (GitHub):** https://docs.github.com/copilot/concepts/context/mcp
- **Coding Agent Docs:** https://docs.github.com/en/copilot/coding-agent
- **Docker MCP Toolkit:** https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/
- **MCP Specification:** https://modelcontextprotocol.io
- **GitHub MCP Server:** https://github.com/github/mcp-server
- **MCP Registry:** https://github.com/github/mcp-registry

### Extension Documentation
- **Official MCP Reference:** [OFFICIAL-MCP-REFERENCE.md](./OFFICIAL-MCP-REFERENCE.md)
- **Setup Guide:** [GITHUB-COPILOT-AGENT-SETUP.md](./GITHUB-COPILOT-AGENT-SETUP.md)
- **Docker Integration:** [DOCKER-MCP-INTEGRATION.md](./DOCKER-MCP-INTEGRATION.md)
