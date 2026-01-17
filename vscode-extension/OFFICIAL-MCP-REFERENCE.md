# Official MCP & GitHub Copilot Reference

This document contains all official URLs and resources for Model Context Protocol (MCP), GitHub Copilot, and the Coding Agent.

## 📘 GitHub Copilot MCP Documentation (Official)

### Core MCP Documentation

| Resource | URL | Description |
|----------|-----|-------------|
| **Using Model Context Protocol (MCP)** | https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp | Main guide for using MCP with Copilot |
| **About Model Context Protocol (MCP)** | https://docs.github.com/copilot/concepts/context/mcp | Conceptual overview of MCP |
| **Setting up the GitHub MCP Server** | https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/set-up-the-github-mcp-server | Official GitHub MCP server setup |
| **Changing your MCP registry in your IDE** | https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp#changing-your-mcp-registry-in-your-ide | Configure MCP registry in VS Code |

### GitHub Copilot Coding Agent

| Resource | URL | Description |
|----------|-----|-------------|
| **Copilot Coding Agent Overview** | https://docs.github.com/en/copilot/coding-agent | Entry point for coding agent docs |
| **Configuring MCP Servers for Coding Agent** | https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp | MCP tool requirements and setup |

## 🔧 Official GitHub MCP Server

GitHub's own MCP server provides tools for issues, PRs, repositories, and the coding agent.

| Resource | URL | Description |
|----------|-----|-------------|
| **GitHub MCP Server Repository** | https://github.com/github/mcp-server | Official GitHub-maintained MCP server |
| **MCP Registry** | https://github.com/github/mcp-registry | Marketplace for discovering MCP servers |
| **MCP Servers Index** | https://github.com/modelcontextprotocol/servers | Curated list of available MCP servers |

## 🎯 Model Context Protocol (Standard)

Official MCP specification and organization.

| Resource | URL | Description |
|----------|-----|-------------|
| **MCP Specification** | https://modelcontextprotocol.io | Official protocol specification |
| **MCP GitHub Organization** | https://github.com/modelcontextprotocol | Official MCP org on GitHub |

## 📦 MCP Server Templates (Official)

Start building your own MCP server with official templates.

| Language | URL | Description |
|----------|-----|-------------|
| **Node.js Template** | https://github.com/modelcontextprotocol/node-template | TypeScript/JavaScript MCP server |
| **Python Template** | https://github.com/modelcontextprotocol/python-template | Python MCP server |
| **Rust Template** | https://github.com/modelcontextprotocol/rust-template | Rust MCP server |

## 🔌 VS Code Extensions with MCP Support

Examples of extensions that provide MCP servers.

| Extension | URL | Description |
|-----------|-----|-------------|
| **mcpsx.run** | https://marketplace.visualstudio.com/items?itemName=mcpsx.run | VS Code MCP server with SSE endpoint |
| **VS Copilot MCP** | https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-copilot-mcp | GitHub's official Copilot MCP extension |
| **Docker MCP Toolkit** | https://marketplace.visualstudio.com/items?itemName=docker.docker-mcp | Docker's MCP toolkit integration |

## 🚀 GitHub Copilot Extensions (General)

| Extension | URL | Description |
|-----------|-----|-------------|
| **GitHub Copilot for VS Code** | https://marketplace.visualstudio.com/items?itemName=GitHub.copilot | Main Copilot extension |
| **GitHub Copilot Chat** | https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat | Copilot chat interface |
| **GitHub Copilot for JetBrains** | https://plugins.jetbrains.com/plugin/17718-github-copilot | JetBrains IDE support |

## 🐳 Docker MCP Documentation

Official Docker MCP Toolkit documentation.

| Resource | URL | Description |
|----------|-----|-------------|
| **Docker MCP Toolkit** | https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/ | Main MCP toolkit page |
| **Get Started with Docker MCP** | https://docs.docker.com/ai/mcp-catalog-and-toolkit/get-started/ | Setup and installation guide |
| **Docker MCP Blog** | https://www.docker.com/blog/mcp-toolkit-mcp-servers-that-just-work/ | Deep dive on MCP toolkit |

## 📚 This Extension's Documentation

| Document | Description |
|----------|-------------|
| [MCP-ARCHITECTURE-SUMMARY.md](./MCP-ARCHITECTURE-SUMMARY.md) | High-level architecture overview |
| [GITHUB-COPILOT-AGENT-SETUP.md](./GITHUB-COPILOT-AGENT-SETUP.md) | Setup guide for coding agent |
| [DOCKER-MCP-INTEGRATION.md](./DOCKER-MCP-INTEGRATION.md) | Docker MCP for internal agents |
| [DOCKER-MCP-QUICK-START.md](./DOCKER-MCP-QUICK-START.md) | Quick reference guide |
| [MCP-IMPLEMENTATION.md](./MCP-IMPLEMENTATION.md) | Technical implementation details |

## 🎓 Key Concepts Reference

### MCP Server Types

| Type | Purpose | Configuration | Transport |
|------|---------|---------------|-----------|
| **Extension MCP Server** | Tools for GitHub Copilot coding agent | `.github/copilot-mcp.json` | stdio |
| **Docker MCP Gateway** | 3rd-party tools for internal agents | `.vscode/mcp-config.json` | stdio |
| **GitHub MCP Server** | GitHub API tools (issues, PRs) | MCP registry or manual | stdio/SSE |

### Configuration File Locations

| File | Purpose | Scope |
|------|---------|-------|
| `.github/copilot-mcp.json` | Coding agent MCP servers | Repository |
| `.vscode/mcp-config.json` | Internal agent MCP servers | Workspace |
| `.github/copilot-tools.json` | Tool registry (extension-specific) | Repository |

### Transport Types

| Transport | Usage | Example |
|-----------|-------|---------|
| **stdio** | Local MCP servers | `command: "node", args: ["server.js"]` |
| **SSE** | Remote MCP servers | `url: "https://api.example.com/mcp"` |
| **HTTP** | Legacy/custom servers | Not recommended for new servers |

## 🔍 Quick Lookup

### For GitHub Copilot Coding Agent

1. **Configuration:** `.github/copilot-mcp.json` (in repository)
2. **Official Docs:** https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp
3. **Supported:** Tools only (no resources or prompts)
4. **Transport:** stdio only
5. **Auth:** No OAuth remote servers

### For VS Code Extension Development

1. **Template:** https://github.com/modelcontextprotocol/node-template
2. **Spec:** https://modelcontextprotocol.io
3. **Examples:** mcpsx.run, VS Copilot MCP extensions
4. **Registry:** https://github.com/github/mcp-registry

### For Docker MCP Integration

1. **Docs:** https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/
2. **Command:** `docker mcp gateway run`
3. **Transport:** stdio (JSON-RPC 2.0)
4. **Install:** `docker mcp install <server-name>`

## 🛠️ Common Tasks

### Task: Configure MCP Server for Coding Agent

```bash
# 1. Generate config
Command Palette → "Copilot Orchestrator: Generate MCP Config for Coding Agent"

# 2. Create file
# Copy output to .github/copilot-mcp.json

# 3. Commit and push
git add .github/copilot-mcp.json
git commit -m "Add Copilot Orchestrator MCP server"
git push
```

### Task: Install Docker MCP Server

```bash
# 1. Verify Docker MCP available
docker mcp version

# 2. Browse available servers
docker mcp search

# 3. Install server
docker mcp install @modelcontextprotocol/server-github

# 4. List installed servers
docker mcp list
```

### Task: Test MCP Server Locally

```bash
# Extension MCP server
node /path/to/extension/dist/mcp-server/index.js

# Docker MCP gateway
docker mcp gateway run
```

## 📖 Learning Path

### 1. Understand MCP Basics
- Read: https://docs.github.com/copilot/concepts/context/mcp
- Read: https://modelcontextprotocol.io

### 2. Set Up GitHub MCP Server
- Follow: https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/set-up-the-github-mcp-server
- Install: https://github.com/github/mcp-server

### 3. Configure for Coding Agent
- Read: [GITHUB-COPILOT-AGENT-SETUP.md](./GITHUB-COPILOT-AGENT-SETUP.md)
- Create: `.github/copilot-mcp.json`

### 4. Add Docker MCP Tools
- Read: [DOCKER-MCP-INTEGRATION.md](./DOCKER-MCP-INTEGRATION.md)
- Install: Docker Desktop with MCP Toolkit

### 5. Build Custom MCP Server
- Choose template: Node.js, Python, or Rust
- Follow: https://github.com/modelcontextprotocol/node-template
- Publish: Submit to https://github.com/github/mcp-registry

## 🆘 Troubleshooting Reference

| Issue | Solution | Docs |
|-------|----------|------|
| Coding agent doesn't see tools | Check `.github/copilot-mcp.json` committed to remote | [Setup Guide](./GITHUB-COPILOT-AGENT-SETUP.md) |
| Docker MCP not available | Install Docker Desktop, enable MCP Toolkit | [Docker MCP Docs](https://docs.docker.com/ai/mcp-catalog-and-toolkit/get-started/) |
| MCP server crashes | Test locally with `node server.js`, check logs | [Implementation](./MCP-IMPLEMENTATION.md) |
| Tools not in registry | Manually configure or submit to registry | [MCP Registry](https://github.com/github/mcp-registry) |

## 📬 Support & Community

| Resource | URL |
|----------|-----|
| **MCP Discussions** | https://github.com/orgs/modelcontextprotocol/discussions |
| **Copilot Community** | https://github.com/orgs/community/discussions |
| **Extension Issues** | [Your repo issues link] |
| **MCP Specification Issues** | https://github.com/modelcontextprotocol/specification/issues |

## 📝 License

This extension and documentation are released under MIT License. See LICENSE file for details.

---

**Last Updated:** January 17, 2026  
**MCP Spec Version:** 1.0  
**GitHub Copilot API Version:** Latest
