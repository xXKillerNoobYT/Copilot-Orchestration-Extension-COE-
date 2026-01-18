# Docker MCP Toolkit Integration Guide

## Overview

This extension integrates with **Docker's MCP Toolkit** to provide access to a catalog of MCP servers for AI agents. This follows the official Docker MCP documentation.

**Official Documentation:**
- **Primary:** https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/
- **Get Started:** https://docs.docker.com/ai/mcp-catalog-and-toolkit/get-started/
- **Blog:** https://www.docker.com/blog/mcp-toolkit-mcp-servers-that-just-work/

## Prerequisites

1. **Docker Desktop** with MCP Toolkit enabled
2. **Docker CLI** version 27.0 or later
3. **VS Code** with this extension installed

## Installation Steps

### 1. Enable Docker MCP Toolkit

Open Docker Desktop → Settings → Enable "MCP Toolkit"

### 2. Verify Docker MCP CLI

```bash
docker mcp version
```

Expected output: `Docker MCP Toolkit v1.x.x`

### 3. Install Common MCP Servers

```bash
# GitHub MCP Server (for issue/PR operations)
docker mcp install @modelcontextprotocol/server-github

# Filesystem MCP Server (for file operations)
docker mcp install @modelcontextprotocol/server-filesystem

# Shell MCP Server (for terminal commands)
docker mcp install @modelcontextprotocol/server-shell
```

### 4. List Installed Servers

```bash
docker mcp list
```

### 5. Configure Extension

Add to your `.vscode/mcp-config.json`:

```json
{
  "mcpServers": {
    "docker-mcp-gateway": {
      "command": "docker",
      "args": ["mcp", "gateway", "run"],
      "type": "stdio"
    }
  }
}
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Extension                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            DockerMCPClient (stdio)                     │    │
│  │  - Spawns: docker mcp gateway run                      │    │
│  │  - Transport: stdin/stdout                             │    │
│  │  - Protocol: JSON-RPC 2.0                              │    │
│  └───────────────────┬────────────────────────────────────┘    │
└────────────────────  │  ──────────────────────────────────────┘
                       │ stdio
┌──────────────────────▼──────────────────────────────────────────┐
│                Docker MCP Gateway                               │
│  - Manages all installed MCP servers                            │
│  - Provides Dynamic MCP (auto-discovery)                        │
│  - Routes tool calls to appropriate servers                     │
└─────────────────┬────────────────┬──────────────────────────────┘
                  │                │
        ┌─────────▼─────┐  ┌───────▼────────┐  ┌─────────────┐
        │ GitHub MCP    │  │ Filesystem MCP │  │  Shell MCP  │
        │    Server     │  │     Server     │  │   Server    │
        └───────────────┘  └────────────────┘  └─────────────┘
```

### Connection Flow

1. **Extension Activation**: VS Code loads extension
2. **Lazy Initialization**: DockerMCPClient starts on first tool call
3. **Gateway Spawn**: `docker mcp gateway run` spawned as child process
4. **Stdio Communication**: JSON-RPC messages via stdin/stdout
5. **Tool Discovery**: Gateway returns list of all installed MCP tools
6. **Tool Execution**: Agent calls tool → Extension → Gateway → MCP Server

## Usage Examples

### List Available Tools

```typescript
import { DockerMCPClient } from './services/dockerMCPClient';

const client = DockerMCPClient.getInstance();
const tools = await client.listTools();

console.log('Available tools:', tools);
// Output: [
//   { name: 'github_create_issue', description: '...', inputSchema: {...} },
//   { name: 'filesystem_read', description: '...', inputSchema: {...} },
//   ...
// ]
```

### Call a Tool

```typescript
// Create GitHub issue via Docker MCP
const result = await client.callTool('github_create_issue', {
  owner: 'xXKillerNoobYT',
  repo: 'Copilot-Orchestration-Extension-COE-',
  title: 'New feature request',
  body: 'Feature description...'
});

console.log('Issue created:', result);
```

### Install New MCP Server

```typescript
// Dynamic MCP - install server on-demand
await client.installServer('@anthropic/mcp-server-slack');

// Server is now available
const tools = await client.listTools();
// Now includes Slack tools
```

## Dynamic MCP

Docker MCP Toolkit supports **Dynamic MCP**, allowing agents to:

1. **Discover** available MCP servers from Docker's catalog
2. **Request** installation of specific servers
3. **Use** newly installed tools immediately

### Enable Dynamic MCP

Already enabled in `.vscode/mcp-config.json`:

```json
{
  "dynamicMCP": {
    "enabled": true,
    "allowedPackageManagers": ["npm", "pip", "docker"]
  }
}
```

### Example Workflow

```typescript
// Agent discovers it needs Slack integration
const installedServers = await client.listInstalledServers();

if (!installedServers.includes('@anthropic/mcp-server-slack')) {
  // Install on-demand
  await client.installServer('@anthropic/mcp-server-slack');
}

// Use Slack tools
await client.callTool('slack_send_message', {
  channel: '#dev',
  text: 'Task completed!'
});
```

## Troubleshooting

### Error: "Docker MCP Toolkit not installed"

**Solution:**
1. Update Docker Desktop to latest version
2. Enable MCP Toolkit in Settings
3. Verify: `docker mcp version`

### Error: "unauthorized" or "permission denied"

**Solution:**
```bash
docker login
```

Then retry connection.

### Gateway Not Responding

**Solution:**
1. Check if Docker daemon is running
2. Restart Docker Desktop
3. Check logs: `docker mcp logs`

### Tools Not Discovered

**Solution:**
1. List installed servers: `docker mcp list`
2. Install missing server: `docker mcp install <server-name>`
3. Restart gateway

## Tool Routing

When multiple providers offer the same tool:

```
Priority: Local Extension Tools > Docker MCP Tools > GitHub Copilot Defaults
```

### Example

```typescript
// Tool: "read_file"
// Providers:
//   1. Local Extension (fastest, no network)
//   2. Docker MCP Filesystem Server (full features)
//   3. GitHub Copilot Default (fallback)

// Router selects LOCAL because:
// - Precedence: local > docker > fallback
// - No authentication required
// - Lower latency
```

## Security Considerations

### What Docker MCP Can Access

✅ **Allowed:**
- GitHub API (with user's OAuth token)
- Workspace files (read/write via Filesystem Server)
- Terminal commands (via Shell Server)
- Installed MCP servers

❌ **NOT Allowed:**
- Arbitrary Docker containers
- System files outside workspace
- Network requests to non-approved endpoints

### Authentication

Docker MCP uses:
- **GitHub OAuth** for GitHub MCP Server
- **Docker credentials** for private registries
- **User permission prompts** for sensitive operations

## Advanced Configuration

### Custom MCP Server

Create your own MCP server and install via Docker:

```bash
# Build custom MCP server Docker image
docker build -t my-custom-mcp-server .

# Install in Docker MCP
docker mcp install my-custom-mcp-server
```

### Multi-Agent Coordination

Configure different agents with different MCP server access:

```json
{
  "agents": {
    "Auto Zen": {
      "allowedMCPServers": ["github", "filesystem", "shell"]
    },
    "Zen Planner": {
      "allowedMCPServers": ["github"]
    },
    "Testing Agent": {
      "allowedMCPServers": ["github", "filesystem"]
    }
  }
}
```

## References

### Official Docker MCP Documentation
- **Docker MCP Toolkit:** https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/
- **Get Started Guide:** https://docs.docker.com/ai/mcp-catalog-and-toolkit/get-started/
- **Docker MCP Blog:** https://www.docker.com/blog/mcp-toolkit-mcp-servers-that-just-work/

### Official MCP Resources
- **MCP Specification:** https://modelcontextprotocol.io
- **MCP Servers Catalog:** https://github.com/modelcontextprotocol/servers
- **GitHub MCP Server:** https://github.com/github/mcp-server
- **MCP Registry:** https://github.com/github/mcp-registry

### Extension Documentation
- **Complete Reference:** [OFFICIAL-MCP-REFERENCE.md](./OFFICIAL-MCP-REFERENCE.md)
- **GitHub Copilot Setup:** [GITHUB-COPILOT-AGENT-SETUP.md](./GITHUB-COPILOT-AGENT-SETUP.md)

## Next Steps

1. ✅ Install Docker MCP Toolkit
2. ✅ Configure extension
3. ✅ Install common MCP servers
4. 🔄 Test tool discovery
5. 🔄 Integrate with agent workflows
6. 🔄 Build custom MCP servers (optional)

For questions or issues, see:
- **Docker MCP Issues:** https://github.com/docker/mcp-toolkit/issues
- **Extension Issues:** [GitHub repo issues]
