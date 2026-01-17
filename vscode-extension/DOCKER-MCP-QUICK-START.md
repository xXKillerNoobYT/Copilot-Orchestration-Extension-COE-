# Docker MCP Quick Setup

## ⚡ Quick Start (5 minutes)

### 1. Install Prerequisites
```bash
# Verify Docker Desktop with MCP Toolkit
docker mcp version
```

### 2. Install Essential MCP Servers
```bash
docker mcp install @modelcontextprotocol/server-github
docker mcp install @modelcontextprotocol/server-filesystem  
docker mcp install @modelcontextprotocol/server-shell
```

### 3. Verify Installation
```bash
docker mcp list
```

### 4. Test Connection
```typescript
// In VS Code extension
import { DockerMCPClient } from './services/dockerMCPClient';

const client = DockerMCPClient.getInstance();
await client.start(); // Spawns: docker mcp gateway run
const tools = await client.listTools();
console.log(`✓ Connected! Found ${tools.length} tools`);
```

## 🔧 Configuration Files

### `.vscode/mcp-config.json`
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

### `.github/copilot-tools.json`
```json
{
  "routing": {
    "precedence": ["local", "docker-mcp-gateway", "github-copilot-default"]
  },
  "dynamicMCP": {
    "enabled": true
  }
}
```

## 🎯 Key Concepts

| Concept | Description |
|---------|-------------|
| **stdio transport** | Docker MCP uses stdin/stdout, NOT HTTP |
| **Dynamic MCP** | Agents auto-discover and install tools |
| **Gateway** | Routes tools to appropriate MCP servers |
| **Tool precedence** | Local > Docker > Fallback |

## 🚀 Usage Patterns

### Pattern 1: List & Call Tools
```typescript
const client = DockerMCPClient.getInstance();

// Discover tools
const tools = await client.listTools();

// Call tool
const result = await client.callTool('github_create_issue', {
  owner: 'user',
  repo: 'repo',
  title: 'Issue title'
});
```

### Pattern 2: Dynamic Installation
```typescript
// Check if server installed
const servers = await client.listInstalledServers();

if (!servers.includes('@anthropic/mcp-server-slack')) {
  // Install on-demand
  await client.installServer('@anthropic/mcp-server-slack');
}
```

### Pattern 3: Connection Monitoring
```typescript
const monitor = ConnectionMonitor.getInstance();
const state = monitor.getState();

if (state.docker === 'connected') {
  console.log('✓ Docker MCP ready');
} else if (state.dockerAuthRequired) {
  console.log('⚠ Authentication required');
}
```

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "Docker MCP not installed" | Update Docker Desktop, enable MCP Toolkit |
| "unauthorized" | Run `docker login` |
| "Gateway not responding" | Restart Docker Desktop |
| "Tools not found" | `docker mcp install <server>` |

## 📚 Resources

### Official Documentation
- **Docker MCP Toolkit:** https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/
- **Get Started Guide:** https://docs.docker.com/ai/mcp-catalog-and-toolkit/get-started/
- **Docker MCP Blog:** https://www.docker.com/blog/mcp-toolkit-mcp-servers-that-just-work/
- **GitHub MCP Server:** https://github.com/github/mcp-server
- **MCP Specification:** https://modelcontextprotocol.io

### Extension Documentation
- **Complete Reference:** [OFFICIAL-MCP-REFERENCE.md](./OFFICIAL-MCP-REFERENCE.md)
- **Full Integration Guide:** [DOCKER-MCP-INTEGRATION.md](./DOCKER-MCP-INTEGRATION.md)
- **GitHub Copilot Setup:** [GITHUB-COPILOT-AGENT-SETUP.md](./GITHUB-COPILOT-AGENT-SETUP.md)
