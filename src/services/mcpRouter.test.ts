/**
 * Tests for MCP Router
 * Tests intelligent tool routing and provider selection
 */

import { MCPRouter, ToolRoute, ToolExecutionContext, ToolRoutingConfig } from './mcpRouter';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock modules
jest.mock('vscode');
jest.mock('fs');
jest.mock('path');

describe('MCPRouter', () => {
  let router: MCPRouter;
  let mockToolRegistry: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    (MCPRouter as any).instance = undefined;

    // Mock workspace configuration
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'toolRegistry.path') return '.github/copilot-tools.json';
        return defaultValue;
      }),
    });

    // Mock workspace folders
    (vscode.workspace as any).workspaceFolders = [
      {
        uri: {
          fsPath: '/workspace',
        },
      },
    ];

    // Mock tool registry file
    mockToolRegistry = {
      tools: [
        {
          name: 'github_search',
          provider: 'local',
          server: 'local-mcp',
          tags: ['local', 'fast'],
          enabled: true,
        },
        {
          name: 'github_search',
          provider: 'docker',
          server: 'docker-gateway',
          tags: ['authenticated'],
          enabled: true,
        },
        {
          name: 'execute_code',
          provider: 'docker',
          server: 'docker-gateway',
          tags: ['sandboxed'],
          enabled: true,
        },
        {
          name: 'task_manager',
          provider: 'local',
          server: 'local-mcp',
          tags: ['local'],
          enabled: false,
        },
      ],
    };

    (path.join as jest.Mock).mockReturnValue('/workspace/.github/copilot-tools.json');
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToolRegistry));

    router = MCPRouter.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MCPRouter.getInstance();
      const instance2 = MCPRouter.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should load tool registry on initialization', () => {
      expect(fs.readFileSync).toHaveBeenCalledWith('/workspace/.github/copilot-tools.json', 'utf-8');
    });
  });

  describe('Tool Registry Loading', () => {
    it('should parse and group tools by name', () => {
      const providers = router.getProviders('github_search');

      expect(providers).toHaveLength(2);
      expect(providers[0].provider).toBe('local');
      expect(providers[1].provider).toBe('docker');
    });

    it('should handle missing tool registry file', () => {
      (MCPRouter as any).instance = undefined;
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      router = MCPRouter.getInstance();
      const providers = router.getProviders('unknown_tool');

      expect(providers).toHaveLength(0);
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Tool registry not found'));

      consoleWarn.mockRestore();
    });

    it('should handle missing workspace folder', () => {
      (MCPRouter as any).instance = undefined;
      (vscode.workspace as any).workspaceFolders = [];

      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      router = MCPRouter.getInstance();

      expect(consoleWarn).toHaveBeenCalledWith('No workspace folder found for tool registry');

      consoleWarn.mockRestore();
    });

    it('should handle JSON parse error', () => {
      (MCPRouter as any).instance = undefined;
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json{');

      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      router = MCPRouter.getInstance();
      const providers = router.getProviders('any_tool');

      expect(providers).toHaveLength(0);
      expect(consoleError).toHaveBeenCalledWith('Failed to load tool registry:', expect.any(Error));

      consoleError.mockRestore();
    });

    it('should store enabled flag for tools', () => {
      const providers = router.getProviders('task_manager');

      expect(providers).toHaveLength(1);
      expect(providers[0].enabled).toBe(false);
    });
  });

  describe('Tool Routing - Single Provider', () => {
    it('should route to single provider directly', async () => {
      const context: ToolExecutionContext = {
        toolName: 'execute_code',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: true,
      };

      const route = await router.routeToolCall(context);

      expect(route.name).toBe('execute_code');
      expect(route.provider).toBe('docker');
      expect(route.server).toBe('docker-gateway');
    });

    it('should fallback to github-copilot-default for unknown tools', async () => {
      const context: ToolExecutionContext = {
        toolName: 'unknown_tool',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: true,
      };

      const route = await router.routeToolCall(context);

      expect(route.name).toBe('unknown_tool');
      expect(route.provider).toBe('github-copilot-default');
      expect(route.server).toBe('github-copilot');
      expect(route.tags).toEqual([]);
      expect(route.enabled).toBe(true);
    });
  });

  describe('Tool Routing - Multiple Providers', () => {
    it('should prefer local provider by default', async () => {
      const context: ToolExecutionContext = {
        toolName: 'github_search',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: true,
      };

      const route = await router.routeToolCall(context);

      expect(route.provider).toBe('local');
      expect(route.server).toBe('local-mcp');
    });

    it('should skip docker provider when not authenticated', async () => {
      const context: ToolExecutionContext = {
        toolName: 'github_search',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: false,
      };

      const route = await router.routeToolCall(context);

      expect(route.provider).toBe('local');
    });

    it('should filter by local tag when network unavailable', async () => {
      const context: ToolExecutionContext = {
        toolName: 'github_search',
        arguments: {},
        networkAvailable: false,
        dockerAuthenticated: true,
      };

      const route = await router.routeToolCall(context);

      expect(route.provider).toBe('local');
      expect(route.tags).toContain('local');
    });

    it('should fallback when all candidates filtered out', async () => {
      // Add tool with only docker provider (no local tag)
      mockToolRegistry.tools.push({
        name: 'docker_only_tool',
        provider: 'docker',
        server: 'docker-gateway',
        tags: [],
        enabled: true,
      });

      (MCPRouter as any).instance = undefined;
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToolRegistry));
      router = MCPRouter.getInstance();

      const context: ToolExecutionContext = {
        toolName: 'docker_only_tool',
        arguments: {},
        networkAvailable: false,
        dockerAuthenticated: false,
      };

      const route = await router.routeToolCall(context);

      // Should fallback to first provider even though it doesn't meet constraints
      expect(route.provider).toBe('docker');
    });

    it('should return first provider when all disabled', async () => {
      // Make both github_search providers disabled
      mockToolRegistry.tools[0].enabled = false;
      mockToolRegistry.tools[1].enabled = false;

      (MCPRouter as any).instance = undefined;
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToolRegistry));
      router = MCPRouter.getInstance();

      const context: ToolExecutionContext = {
        toolName: 'github_search',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: true,
      };

      const route = await router.routeToolCall(context);

      expect(route.provider).toBe('local'); // First one
    });
  });

  describe('Custom Routing Rules', () => {
    it('should apply custom rule when defined', async () => {
      // Add custom rule to prefer docker for specific agent
      router.addCustomRule('github_search', (context) => {
        return context.agentName === 'TestAgent' ? 'docker' : 'local';
      });

      const context: ToolExecutionContext = {
        toolName: 'github_search',
        arguments: {},
        agentName: 'TestAgent',
        networkAvailable: true,
        dockerAuthenticated: true,
      };

      const route = await router.routeToolCall(context);

      expect(route.provider).toBe('docker');
    });

    it('should fallback if custom rule returns invalid provider', async () => {
      router.addCustomRule('github_search', () => 'invalid-provider' as any);

      const context: ToolExecutionContext = {
        toolName: 'github_search',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: true,
      };

      const route = await router.routeToolCall(context);

      // Should fallback to precedence rules
      expect(route.provider).toBe('local');
    });

    it('should use performance metrics in custom rule', async () => {
      router.addCustomRule('github_search', (context) => {
        const localLatency = context.performanceMetrics?.get('local-latency') || 0;
        const dockerLatency = context.performanceMetrics?.get('docker-latency') || 0;
        return localLatency < dockerLatency ? 'local' : 'docker';
      });

      const metricsMap = new Map<string, number>();
      metricsMap.set('local-latency', 500);
      metricsMap.set('docker-latency', 100);

      const context: ToolExecutionContext = {
        toolName: 'github_search',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: true,
        performanceMetrics: metricsMap,
      };

      const route = await router.routeToolCall(context);

      expect(route.provider).toBe('docker'); // Lower latency
    });
  });

  describe('Precedence Rules', () => {
    it('should follow default precedence order', async () => {
      // Add github-copilot-default provider
      mockToolRegistry.tools.push({
        name: 'mixed_tool',
        provider: 'github-copilot-default',
        server: 'github',
        tags: [],
        enabled: true,
      });
      mockToolRegistry.tools.push({
        name: 'mixed_tool',
        provider: 'docker',
        server: 'docker-gateway',
        tags: [],
        enabled: true,
      });
      mockToolRegistry.tools.push({
        name: 'mixed_tool',
        provider: 'local',
        server: 'local-mcp',
        tags: [],
        enabled: true,
      });

      (MCPRouter as any).instance = undefined;
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToolRegistry));
      router = MCPRouter.getInstance();

      const context: ToolExecutionContext = {
        toolName: 'mixed_tool',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: true,
      };

      const route = await router.routeToolCall(context);

      // Default precedence: local > docker > github-copilot-default
      expect(route.provider).toBe('local');
    });
  });

  describe('Provider Queries', () => {
    it('should return all providers for a tool', () => {
      const providers = router.getProviders('github_search');

      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.provider)).toContain('local');
      expect(providers.map(p => p.provider)).toContain('docker');
    });

    it('should return empty array for unknown tool', () => {
      const providers = router.getProviders('nonexistent_tool');

      expect(providers).toEqual([]);
    });
  });

  describe('Registry Reload', () => {
    it('should reload tool registry from disk', () => {
      // Initial load
      expect(router.getProviders('github_search')).toHaveLength(2);

      // Modify mock registry
      const newRegistry = {
        tools: [
          {
            name: 'new_tool',
            provider: 'local',
            server: 'local-mcp',
            tags: [],
            enabled: true,
          },
        ],
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(newRegistry));

      // Reload
      router.reload();

      // Old tools should be gone
      expect(router.getProviders('github_search')).toHaveLength(0);

      // New tool should be available
      expect(router.getProviders('new_tool')).toHaveLength(1);
    });

    it('should clear registry before reloading', () => {
      const providers1 = router.getProviders('github_search');
      expect(providers1).toHaveLength(2);

      // Reload with empty registry
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ tools: [] }));
      router.reload();

      const providers2 = router.getProviders('github_search');
      expect(providers2).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tools with missing tags field', () => {
      mockToolRegistry.tools.push({
        name: 'no_tags_tool',
        provider: 'local',
        server: 'local-mcp',
        enabled: true,
        // tags missing
      });

      (MCPRouter as any).instance = undefined;
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToolRegistry));
      router = MCPRouter.getInstance();

      const providers = router.getProviders('no_tags_tool');

      expect(providers).toHaveLength(1);
      expect(providers[0].tags).toEqual([]);
    });

    it('should handle tools with enabled undefined (default to enabled)', () => {
      mockToolRegistry.tools.push({
        name: 'default_enabled_tool',
        provider: 'local',
        server: 'local-mcp',
        tags: [],
        // enabled missing
      });

      (MCPRouter as any).instance = undefined;
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToolRegistry));
      router = MCPRouter.getInstance();

      const providers = router.getProviders('default_enabled_tool');

      expect(providers).toHaveLength(1);
      expect(providers[0].enabled).toBe(true);
    });

    it('should handle empty tool registry', () => {
      (MCPRouter as any).instance = undefined;
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ tools: [] }));
      router = MCPRouter.getInstance();

      const providers = router.getProviders('any_tool');

      expect(providers).toEqual([]);
    });

    it('should handle registry with no tools field', () => {
      (MCPRouter as any).instance = undefined;
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({}));

      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      router = MCPRouter.getInstance();

      // Should not crash
      const providers = router.getProviders('any_tool');
      expect(providers).toEqual([]);

      consoleLog.mockRestore();
    });

    it('should handle context with all optional fields missing', async () => {
      const context: ToolExecutionContext = {
        toolName: 'github_search',
        arguments: {},
        networkAvailable: true,
        dockerAuthenticated: true,
        // agentName, performanceMetrics missing
      };

      const route = await router.routeToolCall(context);

      expect(route).toBeDefined();
      expect(route.name).toBe('github_search');
    });
  });
});
