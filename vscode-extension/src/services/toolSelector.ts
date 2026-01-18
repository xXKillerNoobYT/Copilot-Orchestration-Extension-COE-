/**
 * Tool Selector - Intelligent multi-tool selection based on context
 * 
 * When multiple tools provide the same capability, this service analyzes
 * the context and selects the optimal tool based on various criteria.
 */

import * as vscode from 'vscode';
import { MCPRouter, ToolRoute, ToolExecutionContext } from './mcpRouter';
import { ConnectionMonitor } from './connectionMonitor';

export interface ToolCapability {
  name: string;
  category: string;
  tags: string[];
  providers: ToolRoute[];
}

export interface SelectionCriteria {
  preferLocal?: boolean;
  requireAuth?: boolean;
  maxLatency?: number;
  agentPermissions?: string[];
}

/**
 * Tool Selector for intelligent multi-provider tool routing
 */
export class ToolSelector {
  private static instance: ToolSelector | undefined;
  private router: MCPRouter;
  private connectionMonitor: ConnectionMonitor;
  private performanceMetrics: Map<string, number> = new Map();

  private constructor() {
    this.router = MCPRouter.getInstance();
    this.connectionMonitor = ConnectionMonitor.getInstance();
  }

  static getInstance(): ToolSelector {
    if (!ToolSelector.instance) {
      ToolSelector.instance = new ToolSelector();
    }
    return ToolSelector.instance;
  }

  /**
   * Select best tool based on context and criteria
   */
  async selectTool(
    toolName: string,
    args: any,
    agentName?: string,
    criteria?: SelectionCriteria
  ): Promise<ToolRoute> {
    // Build execution context
    const connectionState = this.connectionMonitor.getState();
    const context: ToolExecutionContext = {
      toolName,
      arguments: args,
      agentName,
      networkAvailable: connectionState.websocket === 'connected',
      dockerAuthenticated: connectionState.docker === 'connected',
      performanceMetrics: this.performanceMetrics
    };

    // Get available providers for this tool
    const providers = this.router.getProviders(toolName);

    if (providers.length === 0) {
      // No registered providers - fallback to GitHub Copilot default
      return {
        name: toolName,
        provider: 'github-copilot-default',
        server: 'github-copilot',
        tags: [],
        enabled: true
      };
    }

    if (providers.length === 1) {
      // Single provider - use it
      return providers[0];
    }

    // Multiple providers - apply intelligent selection
    return this.selectFromMultipleProviders(providers, context, criteria);
  }

  /**
   * Intelligent selection when multiple tools provide same capability
   */
  private selectFromMultipleProviders(
    providers: ToolRoute[],
    context: ToolExecutionContext,
    criteria?: SelectionCriteria
  ): ToolRoute {
    let candidates = providers.filter(p => p.enabled);

    if (candidates.length === 0) {
      return providers[0]; // All disabled, return first anyway
    }

    // Apply criteria filters
    if (criteria?.preferLocal) {
      const localCandidates = candidates.filter(p => p.provider === 'local');
      if (localCandidates.length > 0) {
        candidates = localCandidates;
      }
    }

    if (criteria?.requireAuth && !context.dockerAuthenticated) {
      // Filter out Docker tools if not authenticated
      candidates = candidates.filter(p => p.provider !== 'docker');
    }

    if (criteria?.agentPermissions) {
      // Filter by agent's allowed tool categories
      candidates = candidates.filter(p => 
        p.tags.some(tag => criteria.agentPermissions?.includes(tag))
      );
    }

    // If filtering eliminated all candidates, reset to all providers
    if (candidates.length === 0) {
      candidates = providers;
    }

    // Apply performance-based selection
    if (criteria?.maxLatency) {
      candidates = this.filterByPerformance(candidates, criteria.maxLatency);
    }

    // Use router's routing logic to pick final candidate
    return this.router.routeToolCall(context).then(route => route).catch(() => candidates[0]) as any;
  }

  /**
   * Filter tools by performance metrics
   */
  private filterByPerformance(providers: ToolRoute[], maxLatency: number): ToolRoute[] {
    const filtered = providers.filter(p => {
      const avgLatency = this.performanceMetrics.get(`${p.provider}:${p.name}`);
      return !avgLatency || avgLatency <= maxLatency;
    });

    return filtered.length > 0 ? filtered : providers;
  }

  /**
   * Record tool execution performance
   */
  recordPerformance(provider: string, toolName: string, latencyMs: number): void {
    const key = `${provider}:${toolName}`;
    const current = this.performanceMetrics.get(key);
    
    // Calculate rolling average (last 10 executions)
    const newAvg = current 
      ? (current * 0.9 + latencyMs * 0.1) 
      : latencyMs;
    
    this.performanceMetrics.set(key, newAvg);
  }

  /**
   * Get performance metrics for a tool
   */
  getPerformance(provider: string, toolName: string): number | undefined {
    return this.performanceMetrics.get(`${provider}:${toolName}`);
  }

  /**
   * Group tools by capability (tools that do the same thing)
   */
  groupByCapability(): Map<string, ToolCapability> {
    const capabilities = new Map<string, ToolCapability>();
    
    // Example capability grouping - would be loaded from registry in production
    const fileReadTools = [
      'read_file',
      'filesystem_read',
      'vscode_read_document'
    ];

    for (const toolName of fileReadTools) {
      const providers = this.router.getProviders(toolName);
      if (providers.length > 0) {
        capabilities.set('file_read', {
          name: 'file_read',
          category: 'filesystem',
          tags: ['read', 'filesystem'],
          providers
        });
      }
    }

    return capabilities;
  }

  /**
   * Check if tool is available (at least one provider is enabled)
   */
  isToolAvailable(toolName: string): boolean {
    const providers = this.router.getProviders(toolName);
    return providers.some(p => p.enabled);
  }

  /**
   * Get fallback tool when primary tool is unavailable
   */
  getFallback(toolName: string): ToolRoute | null {
    const providers = this.router.getProviders(toolName);
    const enabled = providers.filter(p => p.enabled);
    
    if (enabled.length === 0) {
      return null;
    }

    // Return last provider in precedence order (likely the fallback)
    return enabled[enabled.length - 1];
  }
}
