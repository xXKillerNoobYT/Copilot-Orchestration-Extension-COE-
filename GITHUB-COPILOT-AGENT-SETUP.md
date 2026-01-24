# Configuring Copilot Orchestrator MCP Server for GitHub Copilot Coding Agent

## Overview

This extension **provides an MCP server** that exposes orchestration tools to GitHub Copilot's coding agent. However, **the coding agent does not automatically discover extension-provided tools**. You must manually add the MCP server configuration to your repository settings.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  GitHub Copilot Coding Agent (runs on GitHub's servers)     │
└────────────┬─────────────────────────────────────────────────┘
             │ Reads MCP config from repository
             │
┌────────────▼─────────────────────────────────────────────────┐
│  Repository: .github/copilot-mcp.json                        │
│  {                                                            │
│    "mcpServers": {                                           │
│      "copilot-orchestrator": {                              │
│        "command": "node",                                    │
│        "args": ["path/to/mcp-server/index.js"]             │
│      }                                                        │
│    }                                                          │
│  }                                                            │
└────────────┬─────────────────────────────────────────────────┘
             │ stdio transport
             │
┌────────────▼─────────────────────────────────────────────────┐
│  VS Code Extension: Copilot Orchestrator                     │
│  • Bundles MCP server binary                                 │
│  • Provides 7 orchestration tools                            │
│  • Runs locally in VS Code                                   │
└──────────────────────────────────────────────────────────────┘
```

## Step-by-Step Setup

### 1. Install the Extension

Install "Copilot Orchestrator" from VS Code Marketplace or VSIX.

### 2. Locate the MCP Server Binary

After installation, the MCP server binary is located at:

```
Windows: %USERPROFILE%\.vscode\extensions\copilot-orchestrator-x.x.x\dist\mcp-server\index.js
macOS/Linux: ~/.vscode/extensions/copilot-orchestrator-x.x.x/dist/mcp-server/index.js
```

Or use the extension command to copy the path:

```
Command Palette → Copilot Orchestrator: Copy MCP Server Path
```

### 3. Create Repository MCP Configuration

Create `.github/copilot-mcp.json` in your repository root:

```json
{
  "mcpServers": {
    "copilot-orchestrator": {
      "command": "node",
      "args": [
        "/absolute/path/to/vscode/extensions/copilot-orchestrator-x.x.x/dist/mcp-server/index.js"
      ],
      "description": "Copilot Orchestrator - Task management and feedback tools for coding agents"
    }
  }
}
```

**Important:** Use the **absolute path** to the MCP server binary.

### 4. Commit and Push

```bash
git add .github/copilot-mcp.json
git commit -m "Configure Copilot Orchestrator MCP server"
git push
```

### 5. Verify Configuration

When you assign an issue to GitHub Copilot coding agent, check that tools are available:

- The agent should see 7 new tools prefixed with `copilot_orchestrator_*`
- Look for tool discovery logs in the agent's workflow

## Alternative Configuration Methods

### Method A: Using Extension Command (Recommended)

The extension provides a command that generates the correct configuration:

1. Command Palette → `Copilot Orchestrator: Generate MCP Config for Coding Agent`
2. Copy the generated JSON
3. Paste into `.github/copilot-mcp.json`
4. Commit and push

### Method B: Workspace-Relative Path (Portable)

If you commit the extension to your repo (not recommended):

```json
{
  "mcpServers": {
    "copilot-orchestrator": {
      "command": "node",
      "args": [
        "${workspaceFolder}/node_modules/copilot-orchestrator/dist/mcp-server/index.js"
      ]
    }
  }
}
```

### Method C: npx (If Published to npm)

```json
{
  "mcpServers": {
    "copilot-orchestrator": {
      "command": "npx",
      "args": [
        "copilot-orchestrator-mcp"
      ]
    }
  }
}
```

## Available Tools

Once configured, the coding agent has access to:

| Tool | Description | Use Case |
|------|-------------|----------|
| `copilot_orchestrator_get_task_status` | Get task status by ID | Check progress on assigned tasks |
| `copilot_orchestrator_list_active_tasks` | List all active tasks | See queue, plan work |
| `copilot_orchestrator_get_agent_state` | Get agent orchestration state | Understand system load |
| `copilot_orchestrator_report_observation` | Report discovery/issue | Flag problems for review |
| `copilot_orchestrator_request_verification` | Request human verification | Get approval for UI changes |
| `copilot_orchestrator_ask_user_question` | Ask user a question | Clarify requirements |
| `copilot_orchestrator_get_workspace_config` | Get workspace config | Understand project setup |

## Example Workflow

### 1. User Assigns Issue to Copilot

```
Issue #42: "Add login page validation"
Assigned to: @copilot
```

### 2. Coding Agent Discovers Tools

Agent reads `.github/copilot-mcp.json` and discovers `copilot_orchestrator_*` tools.

### 3. Agent Checks Task Status

```typescript
// Coding agent calls:
copilot_orchestrator_list_active_tasks({ status: "pending" })

// Returns:
{
  tasks: [
    { id: "TASK-042", title: "Add login page validation", status: "assigned" }
  ]
}
```

### 4. Agent Implements Solution

Agent writes code, creates PR.

### 5. Agent Requests Verification

```typescript
// Coding agent calls:
copilot_orchestrator_request_verification({
  taskId: "TASK-042",
  verificationType: "visual",
  checklist: [
    "Login form displays correctly",
    "Validation errors show inline",
    "Submit button disabled when invalid"
  ]
})

// VS Code extension shows notification to user
```

### 6. User Verifies

User sees VS Code notification, tests the changes, approves.

## Troubleshooting

### Issue: "Tool not found" in Coding Agent

**Cause:** MCP server not configured in repository.

**Solution:**
1. Verify `.github/copilot-mcp.json` exists
2. Check path to MCP server binary is absolute
3. Push changes to remote
4. Reassign issue to coding agent

### Issue: "Command failed: node ..."

**Cause:** Incorrect path or Node.js not available.

**Solution:**
1. Verify Node.js installed: `node --version`
2. Test MCP server manually: `node /path/to/index.js`
3. Check for typos in path
4. Use `which node` (Unix) or `where node` (Windows) to get full path to Node

### Issue: "MCP server crashed"

**Cause:** Extension not running or MCP server error.

**Solution:**
1. Ensure VS Code is running with extension active
2. Check extension logs: View → Output → Copilot Orchestrator
3. Restart VS Code
4. File issue on GitHub repo

### Issue: Tools work in VS Code but not in Coding Agent

**Cause:** Repository MCP config not synced.

**Solution:**
1. Verify `.github/copilot-mcp.json` pushed to remote
2. Coding agent reads from **remote**, not local
3. Wait a few minutes for GitHub to sync config
4. Reassign issue to coding agent

## Security Considerations

### What the Coding Agent Can Access

✅ **Allowed (Read-Only):**
- Task status and metadata
- Agent orchestration state
- Workspace configuration

❌ **NOT Allowed:**
- File system access (no read/write files)
- Terminal command execution
- Code modification
- Extension settings modification

### Authentication

- Coding agent runs on GitHub's servers
- MCP server runs locally in VS Code
- Communication over stdio (secure by default)
- No credentials passed to coding agent

## Advanced Configuration

### Multi-Repository Setup

For organizations with multiple repositories:

1. Create organization-level MCP config template
2. Deploy to all repos via GitHub Actions
3. Update extension path per developer environment

### Custom Agent YAML (Enterprise)

GitHub Enterprise supports custom agent YAML with MCP tool restrictions:

```yaml
# .github/copilot-agents/restricted-agent.yml
name: Restricted Agent
tools:
  - copilot_orchestrator_get_task_status
  - copilot_orchestrator_list_active_tasks
  # Excludes verification and question tools
```

### Dynamic Path Resolution

Use environment variables in MCP config:

```json
{
  "mcpServers": {
    "copilot-orchestrator": {
      "command": "node",
      "args": ["${COPILOT_ORCHESTRATOR_MCP_PATH}"]
    }
  }
}
```

Set in user's `.bashrc` or `.zshrc`:
```bash
export COPILOT_ORCHESTRATOR_MCP_PATH="$HOME/.vscode/extensions/copilot-orchestrator-1.0.0/dist/mcp-server/index.js"
```

## References

### Official GitHub Documentation
- **Using MCP with Copilot:** https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp
- **About MCP:** https://docs.github.com/copilot/concepts/context/mcp
- **Copilot Coding Agent:** https://docs.github.com/en/copilot/coding-agent
- **GitHub MCP Server Setup:** https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/set-up-the-github-mcp-server

### Official MCP Resources
- **MCP Specification:** https://modelcontextprotocol.io
- **MCP GitHub Org:** https://github.com/modelcontextprotocol
- **GitHub MCP Server:** https://github.com/github/mcp-server
- **MCP Registry:** https://github.com/github/mcp-registry
- **MCP Servers Index:** https://github.com/modelcontextprotocol/servers

### Extension Documentation
- **Complete Reference:** [OFFICIAL-MCP-REFERENCE.md](./OFFICIAL-MCP-REFERENCE.md)
- **Architecture Summary:** [MCP-ARCHITECTURE-SUMMARY.md](./MCP-ARCHITECTURE-SUMMARY.md)
- **Extension Repository:** [GitHub repo link]

## Next Steps

1. ✅ Install extension
2. ✅ Generate MCP config
3. ✅ Add to `.github/copilot-mcp.json`
4. ✅ Commit and push
5. 🔄 Assign issue to coding agent
6. 🔄 Verify tools are discovered
7. 🔄 Monitor agent using orchestration tools

For questions or issues:
- **Extension Issues:** [GitHub repo issues]
- **MCP Server Issues:** [GitHub repo MCP label]
- **General Copilot Questions:** https://github.com/orgs/community/discussions
