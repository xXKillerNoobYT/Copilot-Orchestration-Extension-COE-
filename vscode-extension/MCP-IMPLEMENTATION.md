# Three-Tier MCP Architecture Implementation

## Overview

The Copilot Orchestrator Extension implements a sophisticated **three-tier MCP (Model Context Protocol) architecture**:

1. **Local Extension MCP Server** - Built-in orchestration tools (read-only) exposed to GitHub Copilot coding agent
2. **Docker MCP Gateway** - 3rd-party authenticated services with dynamic tool installation for internal agents
3. **MCP Router & Tool Selector** - Intelligent routing between local, Docker, and fallback tools

**IMPORTANT:** GitHub Copilot's coding agent **does not automatically discover extension tools**. Users must manually configure the MCP server in their repository's `.github/copilot-mcp.json` file. See [GITHUB-COPILOT-AGENT-SETUP.md](./GITHUB-COPILOT-AGENT-SETUP.md) for complete setup instructions.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Copilot Coding Agent                  │
│                  (External - uses MCP protocol)                 │
└──────────────────┬──────────────────────────────────────────────┘
                   │ MCP stdio transport
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│             Local Extension MCP Server                          │
│  • copilot_orchestrator_get_task_status                        │
│  • copilot_orchestrator_list_active_tasks                       │
│  • copilot_orchestrator_get_agent_state                        │
│  • copilot_orchestrator_report_observation                     │
│  • copilot_orchestrator_request_verification                   │
│  • copilot_orchestrator_ask_user_question                      │
│  • copilot_orchestrator_get_workspace_config                   │
│                                                                  │
│  READ-ONLY: No file/terminal writing                           │
└─────────────────────────────────────────────────────────────────┘
                   
┌─────────────────────────────────────────────────────────────────┐
│                   Internal Agents (Auto Zen, etc.)              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                        MCP Router                               │
│  • Intelligent tool routing: Local > Docker > Fallback         │
│  • Multi-tool selection based on context                        │
│  • Performance tracking & metrics                               │
│  • Custom routing rules per agent                               │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
    ┌──────▼──────┐          ┌────────▼─────────┐
    │   Local     │          │  Docker Gateway  │
    │   Tools     │          │  (Port 3000)     │
    │             │          │                  │
    │ • Extension │          │ • GitHub API     │
    │   State     │          │ • Filesystem     │
    │ • Task Mgmt │          │ • Shell          │
    │ • Feedback  │          │ • Dynamic Tools  │
    └─────────────┘          └──────────────────┘
```

## Installation & Setup

### 1. Install Extension Dependencies

```bash
cd vscode-extension
npm install
npm run compile
```

### 2. Start Docker MCP Gateway

```bash
docker-compose up mcp-gateway
```

The gateway will:
- Pre-install common tools: `@modelcontextprotocol/server-github`, `@modelcontextprotocol/server-filesystem`, `@modelcontextprotocol/server-shell`
- Enable dynamic tool installation via npm/pip
- Expose port 3000 for health checks

### 3. Configure VS Code Settings

Add to your `.vscode/settings.json`:

```json
{
  "copilot-orchestrator.toolRegistry.path": ".github/copilot-tools.json",
  "copilot-orchestrator.mcp.localServerEnabled": true,
  "copilot-orchestrator.mcp.dockerGatewayEnabled": true
}
```

### 4. Enable MCP Server for GitHub Copilot

The extension exposes an MCP server that GitHub Copilot's external coding agent can discover and use. After installation, the tools will be automatically available when GitHub Copilot agent is assigned to issues.

## Tool Registry Format

The `.github/copilot-tools.json` file uses GitHub Copilot's global MCP tool list format:

```json
{
  "version": "1.0.0",
  "tools": [
    {
      "name": "copilot_orchestrator_get_task_status",
      "provider": "local",
      "server": "copilot-orchestrator-mcp",
      "description": "Get current status of a specific task",
      "category": "orchestration",
      "tags": ["task-management", "read-only", "local"],
      "enabled": true
    }
  ],
  "toolRouting": {
    "precedence": ["local", "docker", "github-copilot-default"]
  }
}
```

## Tool Routing & Selection

### Routing Rules

1. **Local > Docker** - Local tools take precedence when both exist
2. **Authenticated Required** - Docker tools require authentication
3. **Network Availability** - Local tools work offline
4. **Agent Permissions** - Filtered by agent yaml `tool_permissions`

### Example: Intelligent Tool Selection

```typescript
// Multiple providers for same capability
const fileReadTools = [
  { name: 'read_file', provider: 'local', tags: ['fast', 'local'] },
  { name: 'read_file', provider: 'docker', tags: ['authenticated', 'github'] }
];

// Router selects based on context
const selectedTool = await toolSelector.selectTool(
  'read_file',
  { path: '/workspace/file.ts' },
  'Auto Zen',
  { preferLocal: true, maxLatency: 100 }
);
// Result: Uses local provider (faster, no auth needed)
```

## Available MCP Tools

### Extension-Only Tools (Local Server)

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `copilot_orchestrator_get_task_status` | Get task status by ID | `{ taskId: string }` | Task details, status, progress |
| `copilot_orchestrator_list_active_tasks` | List filtered tasks | `{ status?, priority?, assignee? }` | Array of tasks |
| `copilot_orchestrator_get_agent_state` | Get agent orchestration state | `{ agentName? }` | Agent status, queue depth |
| `copilot_orchestrator_report_observation` | Report discovery/issue | `{ type, message, severity, createTask? }` | Observation ID |
| `copilot_orchestrator_request_verification` | Request human verification | `{ taskId, type, checklist }` | Verification request ID |
| `copilot_orchestrator_ask_user_question` | Ask user a question | `{ question, context?, timeout? }` | Question ID |
| `copilot_orchestrator_get_workspace_config` | Get workspace config | `{ includeAgentProfiles? }` | Config object |

### Docker Gateway Tools (3rd-Party)

- **GitHub MCP Server** - Issue management, PR operations, code search
- **Filesystem MCP Server** - Read/write files (not available to external agents)
- **Shell MCP Server** - Execute commands (restricted)
- **Dynamic Tools** - LLM can request additional tools via npm/pip

## Docker Authentication

When Docker gateway requires authentication, the extension shows a notification:

```
⚠️ Docker MCP Gateway requires authentication
[Login to Docker] [Dismiss]
```

Clicking "Login to Docker" opens a terminal with `docker login` command ready.

### Authentication Status

Check authentication status in unified status bar:

```
🚀 Orchestrator | 🔌 LLM | ✓ MCP | ✓ Docker
```

- ✓ (check) = Connected
- ⚠ (warning) = Degraded (auth required)
- ✗ (error) = Disconnected

## Performance Monitoring

The Tool Selector tracks performance metrics for each tool provider:

```typescript
// Record execution time
toolSelector.recordPerformance('local', 'get_task_status', 45); // 45ms

// Get average latency
const avgLatency = toolSelector.getPerformance('local', 'get_task_status');
// Returns: 42.5ms (rolling average of last 10 executions)
```

## Custom Routing Rules

Add custom routing logic for specific tools:

```typescript
const router = MCPRouter.getInstance();

// Always use Docker for GitHub operations
router.addCustomRule('github_create_issue', (context) => {
  return 'docker'; // Force Docker provider
});

// Use local tools for offline work
router.addCustomRule('read_workspace_config', (context) => {
  return context.networkAvailable ? 'docker' : 'local';
});
```

## Tool Capabilities Grouping

Group tools that provide the same functionality:

```typescript
const toolSelector = ToolSelector.getInstance();
const capabilities = toolSelector.groupByCapability();

// Example: File reading capability
const fileReadCapability = capabilities.get('file_read');
console.log(fileReadCapability);
/* Output:
{
  name: 'file_read',
  category: 'filesystem',
  tags: ['read', 'filesystem'],
  providers: [
    { name: 'read_file', provider: 'local', ... },
    { name: 'filesystem_read', provider: 'docker', ... }
  ]
}
*/
```

## Lazy Initialization

MCP servers start **on-demand** to minimize resource usage:

- **Local MCP Server**: Starts on first tool call
- **Docker Gateway**: Starts when agent requests 3rd-party tool
- **Connection Monitoring**: Runs on extension activation

## Debugging

### View Connection Status

Command Palette → `Copilot Orchestrator: Show Status Menu`

Shows detailed connection info:
- MCP Server status
- WebSocket status
- Docker Gateway status (with auth state)
- Last check timestamps
- Retry counts

### MCP Server Logs

MCP server logs to stderr (not stdout, which is reserved for protocol):

```bash
# View MCP server logs
node ./dist/mcp-server/index.js 2> mcp-server.log
```

### Tool Registry Reload

Reload tool registry without restarting extension:

```typescript
const router = MCPRouter.getInstance();
router.reload(); // Reloads .github/copilot-tools.json
```

## Example Workflows

### Workflow 1: GitHub Copilot Agent Uses Extension Tools

1. User assigns GitHub Issue to Copilot coding agent
2. Copilot agent discovers `copilot-orchestrator-mcp` server
3. Agent calls `copilot_orchestrator_get_task_status` to check progress
4. Agent calls `copilot_orchestrator_report_observation` when finding issues
5. Agent calls `copilot_orchestrator_request_verification` for UI changes
6. User verifies in VS Code notification

### Workflow 2: Internal Agent with Fallback

1. Auto Zen agent needs to read GitHub issue
2. Router checks `github_read_issue` tool providers:
   - Local: Not available
   - Docker: Available (requires auth)
   - GitHub Copilot: Fallback available
3. Docker authentication fails → Fallback to GitHub Copilot default tools
4. Issue successfully read using fallback

### Workflow 3: Dynamic Tool Installation

1. Agent requests specialized tool: `@modelcontextprotocol/server-python`
2. Router checks Docker gateway tool list
3. Tool not pre-installed → Triggers dynamic installation
4. `npm install @modelcontextprotocol/server-python` in Docker container
5. Tool becomes available for future requests

## Security Considerations

### Extension-Only Tools (Local Server)

- ✅ **READ-ONLY** - No file writing or terminal access
- ✅ **Isolated** - Runs in extension process, not accessible externally
- ✅ **Sandboxed** - Cannot modify code outside orchestration state

### Docker Gateway Tools

- ⚠️ **Authenticated** - Requires Docker login for 3rd-party services
- ⚠️ **Network-Dependent** - Requires internet connection
- ⚠️ **User-Controlled** - Docker Compose managed by user

### GitHub Copilot Tools

- ✅ **Microsoft-Managed** - Default Copilot tools are secure
- ✅ **GitHub-Authenticated** - Uses GitHub OAuth tokens
- ✅ **Fallback Safe** - Only used when local/Docker unavailable

## Troubleshooting

### "Docker MCP Gateway requires authentication"

**Solution**: Run `docker login` in terminal, then retry connection.

### "Tool not found" errors

**Solution**: 
1. Check `.github/copilot-tools.json` has tool registered
2. Verify tool provider is enabled: `"enabled": true`
3. Reload tool registry: `MCPRouter.getInstance().reload()`

### Slow tool execution

**Solution**:
1. Check performance metrics: `toolSelector.getPerformance('provider', 'tool')`
2. Set max latency criteria: `{ maxLatency: 100 }`
3. Prefer local tools: `{ preferLocal: true }`

### MCP server not discovered by GitHub Copilot

**Solution**:
1. Verify extension installed correctly
2. Check `package.json` has `"bin"` entry for `copilot-orchestrator-mcp`
3. Restart VS Code
4. Check GitHub Copilot settings for MCP server list

## Future Enhancements

- [ ] Hot-reload tool registry on file changes
- [ ] Tool usage analytics dashboard
- [ ] Cost tracking per tool execution
- [ ] Tool recommendation engine based on context
- [ ] Multi-agent tool sharing and coordination

## Contributing

When adding new MCP tools:

1. Add tool definition to `src/mcp-server/index.ts`
2. Create handler in `src/mcp-server/handlers/`
3. Register in `.github/copilot-tools.json`
4. Document in this README
5. Add tests for tool handler

## License

MIT - See LICENSE file for details.
