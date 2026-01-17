/**
 * MCP Router - Intelligent tool routing and selection
 * 
 * Routes tool calls between Local MCP Server, Docker Gateway, and fallback to GitHub Copilot defaults.
 * Implements precedence rules and multi-tool selection logic.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ToolRoute {
  name: string;
  provider: 'local' | 'docker' | 'github-copilot-default';
  server: string;
  tags: string[];
  enabled: boolean;
}

export interface ToolRoutingConfig {
  precedence: string[];
  customRules?: Map<string, (context: ToolExecutionContext) => string>;
}

export interface ToolExecutionContext {
  toolName: string;
  arguments: any;
  agentName?: string;
  networkAvailable: boolean;
  dockerAuthenticated: boolean;
  performanceMetrics?: Map<string, number>;
}

/**
 * MCP Router singleton for managing tool routing
 */
export class MCPRouter {
  private static instance: MCPRouter | undefined;
  private toolRegistry: Map<string, ToolRoute[]> = new Map();
  private routingConfig: ToolRoutingConfig;
  private toolRegistryPath: string;

  private constructor() {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    this.toolRegistryPath = config.get('toolRegistry.path', '.github/copilot-tools.json');
    
    this.routingConfig = {
      precedence: ['local', 'docker', 'github-copilot-default'],
      customRules: new Map()
    };

    this.loadToolRegistry();
  }

  static getInstance(): MCPRouter {
    if (!MCPRouter.instance) {
      MCPRouter.instance = new MCPRouter();
    }
    return MCPRouter.instance;
  }

  /**
   * Load tool registry from workspace configuration file
   */
  private loadToolRegistry(): void {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        console.warn('No workspace folder found for tool registry');
        return;
      }

      const registryPath = path.join(workspaceFolders[0].uri.fsPath, this.toolRegistryPath);
      
      if (!fs.existsSync(registryPath)) {
        console.warn(`Tool registry not found at ${registryPath}`);
        return;
      }

      const registryContent = fs.readFileSync(registryPath, 'utf-8');
      const registry = JSON.parse(registryContent);

      // Build tool map grouped by tool name
      for (const tool of registry.tools || []) {
        if (!this.toolRegistry.has(tool.name)) {
          this.toolRegistry.set(tool.name, []);
        }
        this.toolRegistry.get(tool.name)!.push({
          name: tool.name,
          provider: tool.provider,
          server: tool.server,
          tags: tool.tags || [],
          enabled: tool.enabled !== false
        });
      }

      console.log(`Loaded ${this.toolRegistry.size} tools from registry`);
    } catch (error) {
      console.error('Failed to load tool registry:', error);
    }
  }

  /**
   * Route tool call to appropriate provider
   */
  async routeToolCall(context: ToolExecutionContext): Promise<ToolRoute> {
    const { toolName } = context;

    // Check if tool has multiple providers
    const providers = this.toolRegistry.get(toolName);

    if (!providers || providers.length === 0) {
      // Unknown tool - fallback to github-copilot-default
      return {
        name: toolName,
        provider: 'github-copilot-default',
        server: 'github-copilot',
        tags: [],
        enabled: true
      };
    }

    if (providers.length === 1) {
      // Single provider - direct route
      return providers[0];
    }

    // Multiple providers - apply intelligent selection
    return this.selectBestProvider(providers, context);
  }

  /**
   * Select best provider when multiple tools offer same capability
   */
  private selectBestProvider(providers: ToolRoute[], context: ToolExecutionContext): ToolRoute {
    const { agentName, networkAvailable, dockerAuthenticated, performanceMetrics } = context;

    // Filter enabled providers
    let candidates = providers.filter(p => p.enabled);

    if (candidates.length === 0) {
      // All disabled - return first one anyway
      return providers[0];
    }

    // Apply custom routing rules if defined
    const customRule = this.routingConfig.customRules?.get(context.toolName);
    if (customRule) {
      const preferredProvider = customRule(context);
      const match = candidates.find(p => p.provider === preferredProvider);
      if (match) {
        return match;
      }
    }

    // Filter by context constraints
    if (!dockerAuthenticated) {
      candidates = candidates.filter(p => p.provider !== 'docker');
    }

    if (!networkAvailable) {
      candidates = candidates.filter(p => p.tags.includes('local'));
    }

    if (candidates.length === 0) {
      // No candidates meet constraints - fallback to first provider
      return providers[0];
    }

    // Apply precedence rules
    for (const precedence of this.routingConfig.precedence) {
      const match = candidates.find(p => p.provider === precedence);
      if (match) {
        return match;
      }
    }

    // Default to first candidate
    return candidates[0];
  }

  /**
   * Add custom routing rule for specific tool
   */
  addCustomRule(toolName: string, rule: (context: ToolExecutionContext) => string): void {
    this.routingConfig.customRules?.set(toolName, rule);
  }

  /**
   * Get all available providers for a tool
   */
  getProviders(toolName: string): ToolRoute[] {
    return this.toolRegistry.get(toolName) || [];
  }

  /**
   * Reload tool registry from disk
   */
  reload(): void {
    this.toolRegistry.clear();
    this.loadToolRegistry();
  }
}
