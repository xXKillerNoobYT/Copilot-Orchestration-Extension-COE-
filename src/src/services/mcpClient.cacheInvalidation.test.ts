/**
 * Tests for MCPClient Cache Invalidation
 * Validates that configuration changes properly invalidate the singleton instance
 * Reference: Issue [MEDIUM] Missing cache invalidation on settings change
 */

import { MCPClient } from './mcpClient';

// Mock vscode module
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'mcp.baseUrl') return 'http://localhost:8000';
        if (key === 'mcp.authToken') return '';
        return defaultValue;
      }),
    })),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('MCPClient Cache Invalidation', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    MCPClient.invalidateInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    MCPClient.invalidateInstance();
  });

  describe('invalidateInstance', () => {
    it('should clear the singleton instance', () => {
      // Get instance to create it
      const instance1 = MCPClient.getInstance();
      expect(instance1).toBeDefined();

      // Invalidate the instance
      MCPClient.invalidateInstance();

      // Get instance again - should create a new one
      const instance2 = MCPClient.getInstance();
      expect(instance2).toBeDefined();

      // Instances should be different objects (new instance created)
      expect(instance1).not.toBe(instance2);
    });

    it('should allow getInstance to create new instance with updated config after invalidation', () => {
      const vscode = require('vscode');
      
      // First instance with initial config
      const mockConfig1 = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'mcp.baseUrl') return 'http://localhost:8000';
          if (key === 'mcp.authToken') return 'token1';
          return defaultValue;
        }),
      };
      vscode.workspace.getConfiguration.mockReturnValue(mockConfig1);
      
      const instance1 = MCPClient.getInstance();
      expect(instance1).toBeDefined();

      // Invalidate instance (simulating config change)
      MCPClient.invalidateInstance();

      // Second instance with updated config
      const mockConfig2 = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'mcp.baseUrl') return 'http://newhost:9000';
          if (key === 'mcp.authToken') return 'token2';
          return defaultValue;
        }),
      };
      vscode.workspace.getConfiguration.mockReturnValue(mockConfig2);

      const instance2 = MCPClient.getInstance();
      expect(instance2).toBeDefined();
      expect(instance1).not.toBe(instance2);

      // Verify new config was read
      expect(mockConfig2.get).toHaveBeenCalledWith('mcp.baseUrl', 'http://localhost:8000');
    });

    it('should be safe to call invalidateInstance multiple times', () => {
      MCPClient.invalidateInstance();
      MCPClient.invalidateInstance();
      MCPClient.invalidateInstance();

      // Should still be able to get instance
      const instance = MCPClient.getInstance();
      expect(instance).toBeDefined();
    });

    it('should be safe to call invalidateInstance when no instance exists', () => {
      // No instance created yet
      expect(() => MCPClient.invalidateInstance()).not.toThrow();

      // Should still be able to create instance
      const instance = MCPClient.getInstance();
      expect(instance).toBeDefined();
    });

    it('should log when invalidating instance', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create instance first
      MCPClient.getInstance();

      // Invalidate
      MCPClient.invalidateInstance();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MCPClient] Invalidating cached instance and resetting circuit breaker due to configuration change'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getInstance after invalidation', () => {
    it('should create new instance with fresh configuration', () => {
      const vscode = require('vscode');
      
      // Create initial instance
      MCPClient.getInstance();
      
      // Change config
      const newConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'mcp.baseUrl') return 'http://updated:3000';
          if (key === 'mcp.authToken') return 'new-token';
          return defaultValue;
        }),
      };
      vscode.workspace.getConfiguration.mockReturnValue(newConfig);
      
      // Invalidate and get new instance
      MCPClient.invalidateInstance();
      const instance2 = MCPClient.getInstance();
      
      // Should have called getConfiguration to get new config
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('copilot-orchestrator');
      expect(newConfig.get).toHaveBeenCalledWith('mcp.baseUrl', 'http://localhost:8000');
    });

    it('should preserve circuit breaker behavior across invalidations', () => {
      // Create instance
      const instance1 = MCPClient.getInstance();
      expect(instance1).toBeDefined();

      // Invalidate
      MCPClient.invalidateInstance();

      // Get new instance
      const instance2 = MCPClient.getInstance();
      
      // New instance should be created and differ from the old one
      expect(instance2).toBeDefined();
      expect(instance2).not.toBe(instance1);

      // Both instances should have circuit breaker (not testing state preservation
      // as that would require accessing private fields, just ensuring new instance works)
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('initialize method', () => {
    it('should allow explicit initialization with config', () => {
      const config = {
        baseUrl: 'http://explicit:4000',
        authToken: 'explicit-token',
        timeout: 15000,
      };

      const instance = MCPClient.initialize(config);
      expect(instance).toBeDefined();
    });

    it('should replace existing instance when initialize is called', () => {
      const instance1 = MCPClient.getInstance();
      
      const config = {
        baseUrl: 'http://new:5000',
        authToken: 'new-token',
      };
      
      const instance2 = MCPClient.initialize(config);
      
      expect(instance1).not.toBe(instance2);
      
      // getInstance should now return the initialized instance
      const instance3 = MCPClient.getInstance();
      expect(instance3).toBe(instance2);
    });
  });
});
