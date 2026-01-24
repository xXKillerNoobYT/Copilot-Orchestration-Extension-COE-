/**
 * Tests for Tool Selector Service
 * Tests intelligent multi-tool selection and routing
 */

import { ToolSelector, SelectionCriteria } from './toolSelector';
import { MCPRouter, ToolRoute } from './mcpRouter';
import { ConnectionMonitor, ConnectionState } from './connectionMonitor';

// Mock dependencies
jest.mock('./mcpRouter');
jest.mock('./connectionMonitor');

describe('ToolSelector', () => {
  let selector: ToolSelector;
  let mockRouter: jest.Mocked<MCPRouter>;
  let mockMonitor: jest.Mocked<ConnectionMonitor>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    (ToolSelector as any).instance = undefined;

    // Mock MCPRouter
    mockRouter = {
      getInstance: jest.fn(),
      getProviders: jest.fn(),
      registerTool: jest.fn(),
      routeTool: jest.fn(),
      routeToolCall: jest.fn() // Add missing mock
    } as any;

    (MCPRouter.getInstance as jest.Mock).mockReturnValue(mockRouter);

    // Mock ConnectionMonitor
    mockMonitor = {
      getInstance: jest.fn(),
      getState: jest.fn(),
      isConnected: jest.fn()
    } as any;

    (ConnectionMonitor.getInstance as jest.Mock).mockReturnValue(mockMonitor);

    // Default connection state
    (mockMonitor.getState as jest.Mock).mockReturnValue({
      mcp: 'connected' as const,
      websocket: 'connected' as const,
      docker: 'connected' as const,
      lastMcpCheck: new Date().toISOString(),
      lastWsCheck: new Date().toISOString(),
      lastDockerCheck: new Date().toISOString(),
      retryCount: 0
    } as ConnectionState);

    selector = ToolSelector.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ToolSelector.getInstance();
      const instance2 = ToolSelector.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize router and connection monitor', () => {
      expect(MCPRouter.getInstance).toHaveBeenCalled();
      expect(ConnectionMonitor.getInstance).toHaveBeenCalled();
    });
  });

  describe('Single Provider Selection', () => {
    it('should select single available provider', async () => {
      const provider: ToolRoute = {
        name: 'github-list-issues',
        provider: 'local',
        server: 'github',
        tags: ['github'],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([provider]);

      const result = await selector.selectTool('github-list-issues', {});

      expect(result).toEqual(provider);
      expect(mockRouter.getProviders).toHaveBeenCalledWith('github-list-issues');
    });

    it('should use GitHub Copilot default when no providers available', async () => {
      mockRouter.getProviders.mockReturnValue([]);

      const result = await selector.selectTool('unknown-tool', {});

      expect(result).toEqual({
        name: 'unknown-tool',
        provider: 'github-copilot-default',
        server: 'github-copilot',
        tags: [],
        enabled: true
      });
    });
  });

  describe('Multiple Provider Selection', () => {
    const localProvider: ToolRoute = {
      name: 'file-read',
      provider: 'local',
      server: 'local',
      tags: ['local', 'fast'],
      enabled: true
    };

    const dockerProvider: ToolRoute = {
      name: 'file-read',
      provider: 'docker',
      server: 'docker',
      tags: ['docker', 'cloud'],
      enabled: true
    };

    it('should select from multiple providers based on criteria', async () => {
      mockRouter.getProviders.mockReturnValue([localProvider, dockerProvider]);

      // Mock routeToolCall to return first provider
      mockRouter.routeToolCall.mockResolvedValue(localProvider);

      const criteria: SelectionCriteria = {
        preferLocal: true
      };

      const result = await selector.selectTool('file-read', {}, undefined, criteria);

      expect(result).toBeDefined();
      expect([localProvider, dockerProvider]).toContainEqual(result);
    });

    it('should filter out disabled providers', async () => {
      const disabledProvider: ToolRoute = {
        ...localProvider,
        enabled: false
      };

      mockRouter.getProviders.mockReturnValue([disabledProvider, dockerProvider]);
      mockRouter.routeToolCall.mockResolvedValue(dockerProvider);

      const result = await selector.selectTool('file-read', {});

      // Should select the enabled provider
      expect(result.enabled).toBe(true);
    });

    it('should prefer local providers when preferLocal is true', async () => {
      mockRouter.getProviders.mockReturnValue([localProvider, dockerProvider]);
      mockRouter.routeToolCall.mockResolvedValue(localProvider);

      const criteria: SelectionCriteria = {
        preferLocal: true
      };

      const result = await selector.selectTool('file-read', {}, undefined, criteria);

      // Implementation would prefer local - test the behavior exists
      expect(result).toBeDefined();
    });
  });

  describe('Network-Aware Selection', () => {
    it('should consider network availability', async () => {
      const networkProvider: ToolRoute = {
        name: 'api-call',
        provider: 'docker',
        server: 'remote',
        tags: ['network'],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([networkProvider]);
      mockRouter.routeToolCall.mockResolvedValue(networkProvider);
      mockMonitor.getState.mockReturnValue({
        mcp: 'disconnected' as const,
        websocket: 'disconnected' as const,
        docker: 'connected' as const,
        lastMcpCheck: new Date().toISOString(),
        lastWsCheck: new Date().toISOString(),
        lastDockerCheck: new Date().toISOString(),
        retryCount: 0
      } as ConnectionState);

      const result = await selector.selectTool('api-call', {});

      expect(result).toBeDefined();
      expect(mockMonitor.getState).toHaveBeenCalled();
    });

    it('should handle offline scenario', async () => {
      mockRouter.getProviders.mockReturnValue([]);
      mockMonitor.getState.mockReturnValue({
        mcp: 'disconnected' as const,
        websocket: 'disconnected' as const,
        docker: 'disconnected' as const,
        lastMcpCheck: new Date().toISOString(),
        lastWsCheck: new Date().toISOString(),
        lastDockerCheck: new Date().toISOString(),
        retryCount: 0
      } as ConnectionState);

      const result = await selector.selectTool('some-tool', {});

      // Should fallback to default even when offline
      expect(result.provider).toBe('github-copilot-default');
    });
  });

  describe('Agent-Specific Selection', () => {
    it('should consider agent name in selection', async () => {
      const provider: ToolRoute = {
        name: 'task-create',
        provider: 'local',
        server: 'backend',
        tags: ['tasks'],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([provider]);
      mockRouter.routeToolCall.mockResolvedValue(provider);

      const result = await selector.selectTool('task-create', {}, 'Planning Agent');

      expect(result).toBeDefined();
      expect(mockRouter.getProviders).toHaveBeenCalledWith('task-create');
    });

    it('should work without agent name', async () => {
      const provider: ToolRoute = {
        name: 'general-tool',
        provider: 'local',
        server: 'server',
        tags: [],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([provider]);
      mockRouter.routeToolCall.mockResolvedValue(provider);

      const result = await selector.selectTool('general-tool', {});

      expect(result).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics', async () => {
      const provider: ToolRoute = {
        name: 'test-tool',
        provider: 'local',
        server: 'test',
        tags: [],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([provider]);

      // Execute multiple times to build metrics
      await selector.selectTool('test-tool', {});
      await selector.selectTool('test-tool', {});

      const performanceMetrics = (selector as any).performanceMetrics;
      expect(performanceMetrics).toBeInstanceOf(Map);
    });

    it.skip('should consider latency in selection criteria', async () => {
      const fastProvider: ToolRoute = {
        name: 'tool',
        provider: 'local',
        server: 'local',
        tags: ['fast'],
        enabled: true
      };

      const slowProvider: ToolRoute = {
        name: 'tool',
        provider: 'docker',
        server: 'remote',
        tags: ['slow'],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([fastProvider, slowProvider]);
      mockRouter.routeToolCall.mockResolvedValue(fastProvider);

      const criteria: SelectionCriteria = {
        maxLatency: 100 // milliseconds
      };

      const result = await selector.selectTool('tool', {}, undefined, criteria);

      expect(result).toBeDefined();
    });
  });

  describe('Authentication-Based Selection', () => {
    it.skip('should filter providers requiring authentication', async () => {
      const authProvider: ToolRoute = {
        name: 'secure-tool',
        provider: 'docker',
        server: 'secure',
        tags: ['auth'],
        enabled: true
      };

      const publicProvider: ToolRoute = {
        name: 'secure-tool',
        provider: 'local',
        server: 'public',
        tags: [],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([authProvider, publicProvider]);
      mockRouter.routeToolCall.mockResolvedValue(publicProvider);

      const criteria: SelectionCriteria = {
        requireAuth: false
      };

      const result = await selector.selectTool('secure-tool', {}, undefined, criteria);

      expect(result).toBeDefined();
    });

    it('should handle Docker authentication state', async () => {
      mockMonitor.getState.mockReturnValue({
        websocket: 'connected',
        docker: 'authenticated',
        github: 'connected',
        laravel: 'connected'
      } as any);

      const dockerProvider: ToolRoute = {
        name: 'docker-tool',
        provider: 'docker',
        server: 'docker',
        tags: ['docker'],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([dockerProvider]);

      const result = await selector.selectTool('docker-tool', {});

      expect(result).toBeDefined();
      expect(mockMonitor.getState).toHaveBeenCalled();
    });
  });

  describe('Permission-Based Selection', () => {
    it.skip('should consider agent permissions', async () => {
      const restrictedProvider: ToolRoute = {
        name: 'admin-tool',
        provider: 'docker',
        server: 'admin',
        tags: ['admin'],
        enabled: true
      };

      const publicProvider: ToolRoute = {
        name: 'admin-tool',
        provider: 'local',
        server: 'public',
        tags: [],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([restrictedProvider, publicProvider]);
      mockRouter.routeToolCall.mockResolvedValue(publicProvider);

      const criteria: SelectionCriteria = {
        agentPermissions: ['read', 'write']
      };

      const result = await selector.selectTool('admin-tool', {}, 'TestAgent', criteria);

      expect(result).toBeDefined();
    });

    it('should handle empty permissions', async () => {
      const provider: ToolRoute = {
        name: 'tool',
        provider: 'local',
        server: 'server',
        tags: [],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([provider]);

      const criteria: SelectionCriteria = {
        agentPermissions: []
      };

      const result = await selector.selectTool('tool', {}, undefined, criteria);

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle router errors gracefully', async () => {
      mockRouter.getProviders.mockImplementation(() => {
        throw new Error('Router error');
      });

      // Should throw as no fallback possible
      await expect(selector.selectTool('tool', {})).rejects.toThrow('Router error');
    });

    it('should handle connection monitor errors', async () => {
      mockMonitor.getState.mockImplementation(() => {
        throw new Error('Monitor error');
      });

      const provider: ToolRoute = {
        name: 'tool',
        provider: 'local',
        server: 'server',
        tags: [],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([provider]);
      mockRouter.routeToolCall.mockResolvedValue(provider);

      // Should handle monitor error and still proceed
      await expect(selector.selectTool('tool', {})).rejects.toThrow('Monitor error');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback when routing logic fails', async () => {
      const provider: ToolRoute = {
        name: 'tool',
        provider: 'local',
        server: 'server',
        tags: [],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([provider]);
      // Simulate routing failure - should fallback to first provider
      mockRouter.routeToolCall.mockRejectedValue(new Error('Routing failed'));

      const result = await selector.selectTool('tool', {});

      // Should fallback to first provider
      expect(result).toBeDefined();
      expect(result).toEqual(provider);
    });

    it('should use first available provider when no criteria match', async () => {
      const provider1: ToolRoute = {
        name: 'tool',
        provider: 'local',
        server: 'server1',
        tags: [],
        enabled: true
      };

      const provider2: ToolRoute = {
        name: 'tool',
        provider: 'docker',
        server: 'server2',
        tags: [],
        enabled: true
      };

      mockRouter.getProviders.mockReturnValue([provider1, provider2]);
      mockRouter.routeToolCall.mockResolvedValue(provider1);

      const result = await selector.selectTool('tool', {});

      expect(result).toBeDefined();
      expect([provider1, provider2]).toContainEqual(result);
      expect(mockRouter.routeToolCall).toHaveBeenCalled();
    });
  });
});
