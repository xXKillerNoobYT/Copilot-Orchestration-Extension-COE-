/**
 * Handler for copilot_orchestrator_get_workspace_config tool
 * Returns workspace configuration from environment variables
 * Note: In MCP server context, configuration comes from environment, not VS Code settings
 */
import { MCPHandlerBase } from './MCPHandlerBase';
class GetWorkspaceConfigHandler extends MCPHandlerBase {
    /**
     * Get workspace configuration from environment variables
     */
    async execute(args) {
        const { includeAgentProfiles = false } = args || {};
        return this.executeWithRetry(async () => {
            // Build workspace configuration from environment variables
            const workspaceConfig = {
                workspace: {
                    taskRoots: (process.env.WORKSPACE_TASK_ROOTS || '_ZENTASKS').split(','),
                    issueFolder: process.env.WORKSPACE_ISSUE_FOLDER || '.vscode/github-issues',
                    toolRegistryPath: process.env.WORKSPACE_TOOL_REGISTRY || '.github/copilot-tools.json',
                    rootPath: process.env.WORKSPACE_ROOT || process.cwd(),
                },
                mcp: {
                    baseUrl: process.env.MCP_BASE_URL || 'http://localhost:8000',
                    authToken: process.env.MCP_AUTH_TOKEN ? '***' : undefined, // Don't expose actual token
                    timeout: parseInt(process.env.MCP_TIMEOUT || '30000'),
                    localServerEnabled: process.env.MCP_LOCAL_SERVER_ENABLED !== 'false',
                    dockerGatewayEnabled: process.env.MCP_DOCKER_GATEWAY_ENABLED === 'true',
                },
                llm: {
                    baseUrl: process.env.LLM_BASE_URL || 'http://localhost:1234/v1',
                    model: process.env.LLM_MODEL || 'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF',
                    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                    timeout: parseInt(process.env.LLM_TIMEOUT || '30000'),
                },
                websocket: {
                    driver: this.validateWebSocketDriver(process.env.WEBSOCKET_DRIVER),
                    host: process.env.WEBSOCKET_HOST || 'localhost',
                    port: parseInt(process.env.WEBSOCKET_PORT || '6001'),
                    enabled: process.env.WEBSOCKET_ENABLED !== 'false',
                },
                github: {
                    syncEnabled: process.env.GITHUB_SYNC_ENABLED !== 'false',
                    syncInterval: parseInt(process.env.GITHUB_SYNC_INTERVAL || '300000'), // 5 minutes
                    rateLimit: parseInt(process.env.GITHUB_RATE_LIMIT || '5000'),
                },
                project: {
                    id: process.env.MCP_PROJECT_ID || 'default',
                    name: process.env.PROJECT_NAME || 'Untitled Project',
                },
            };
            // Load agent profiles if requested
            if (includeAgentProfiles) {
                workspaceConfig.agentProfiles = this.getDefaultAgentProfiles();
            }
            return this.formatSuccess(workspaceConfig);
        }, 'handleGetWorkspaceConfig', args);
    }
    /**
     * Validate WebSocket driver environment variable
     * @returns Valid driver name or default 'soketi'
     */
    validateWebSocketDriver(value) {
        const validDrivers = ['soketi', 'pusher', 'redis'];
        if (value && validDrivers.includes(value)) {
            return value;
        }
        if (value) {
            console.warn(`[GetWorkspaceConfig] Invalid WEBSOCKET_DRIVER value: "${value}". Falling back to "soketi".`);
        }
        return 'soketi';
    }
    /**
     * Get default agent profiles
     */
    getDefaultAgentProfiles() {
        return {
            'Auto Zen': {
                role: 'Autonomous code execution',
                tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'github/*'],
                maxDepth: 5,
            },
            'Zen Planner': {
                role: 'Strategic task decomposition',
                tools: ['read', 'mcp_docker/search', 'agent', 'edit/createJupyterNotebook'],
                maxDepth: 3,
            },
            'Testing Agent': {
                role: 'Quality assurance & coverage',
                tools: ['execute', 'read', 'github-mcp-server-*'],
                maxDepth: 2,
            },
            'Verification Agent': {
                role: 'Visual and automated verification',
                tools: ['execute', 'read', 'vscode/*'],
                maxDepth: 2,
            },
        };
    }
}
// Create singleton instance
const handler = new GetWorkspaceConfigHandler();
/**
 * Export handler function for MCP server
 */
export async function handleGetWorkspaceConfig(args) {
    return handler.execute(args);
}
