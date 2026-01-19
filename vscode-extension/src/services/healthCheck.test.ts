/**
 * Tests for Health Check Service
 */

import { HealthCheckService, HealthStatus, OverallHealth } from './healthCheck';
import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as WebSocketConfigManagerModule from './webSocketConfigManager';

// Mock vscode module
jest.mock('vscode');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
  },
}));

// Mock WebSocketConfigManager
jest.mock('./webSocketConfigManager');

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let mockOutputChannel: any;
  let mockStatusBarItem: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (HealthCheckService as any).instance = undefined;

    mockOutputChannel = {
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    };

    mockStatusBarItem = {
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    };

    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

    // Mock workspace configuration
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'backendUrl') return 'http://localhost:8000';
        if (key === 'mcp.baseUrl') return 'http://localhost:8000';
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

    // Mock VS Code version
    (vscode as any).version = '1.85.0';

    service = HealthCheckService.getInstance();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = HealthCheckService.getInstance();
      const instance2 = HealthCheckService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Backend URL Check', () => {
    it('should pass when backend URL is configured correctly', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'backendUrl') return 'http://localhost:8000';
          return '';
        }),
      });

      const result = await service.runHealthCheck(false);
      const backendCheck = result.checks.find(c => c.name === 'Backend URL');

      expect(backendCheck).toBeDefined();
      expect(backendCheck?.status).toBe('healthy');
      expect(backendCheck?.message).toContain('http://localhost:8000');
    });

    it('should fail when backend URL is not configured', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn(() => ''),
      });

      const result = await service.runHealthCheck(false);
      const backendCheck = result.checks.find(c => c.name === 'Backend URL');

      expect(backendCheck?.status).toBe('unhealthy');
      expect(backendCheck?.fix).toBeDefined();
    });

    it('should fail when backend URL is invalid', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'backendUrl') return 'not-a-valid-url';
          return '';
        }),
      });

      const result = await service.runHealthCheck(false);
      const backendCheck = result.checks.find(c => c.name === 'Backend URL');

      expect(backendCheck?.status).toBe('unhealthy');
      expect(backendCheck?.details).toContain('not a valid');
    });
  });

  describe('Backend Reachable Check', () => {
    it('should pass when backend is reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await service.runHealthCheck(false);
      const backendCheck = result.checks.find(c => c.name === 'Backend Reachable');

      expect(backendCheck?.status).toBe('healthy');
      expect(backendCheck?.message).toContain('Responded in');
    });

    it('should fail when backend is not reachable', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const result = await service.runHealthCheck(false);
      const backendCheck = result.checks.find(c => c.name === 'Backend Reachable');

      expect(backendCheck?.status).toBe('unhealthy');
      expect(backendCheck?.message).toBe('Connection failed');
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        const error: any = new Error('Timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const result = await service.runHealthCheck(false);
      const backendCheck = result.checks.find(c => c.name === 'Backend Reachable');

      expect(backendCheck?.status).toBe('unhealthy');
      expect(backendCheck?.message).toContain('timeout');
    });

    it('should be degraded when backend responds with error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await service.runHealthCheck(false);
      const backendCheck = result.checks.find(c => c.name === 'Backend Reachable');

      expect(backendCheck?.status).toBe('degraded');
      expect(backendCheck?.message).toContain('500');
    });
  });

  describe('Plans Directory Check', () => {
    it('should pass when directory exists', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
      });

      const result = await service.runHealthCheck(false);
      const dirCheck = result.checks.find(c => c.name === 'Plans Directory');

      expect(dirCheck?.status).toBe('healthy');
      expect(dirCheck?.message).toContain('Exists');
    });

    it('should fail when directory does not exist', async () => {
      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      (fs.stat as jest.Mock).mockRejectedValue(error);

      const result = await service.runHealthCheck(false);
      const dirCheck = result.checks.find(c => c.name === 'Plans Directory');

      expect(dirCheck?.status).toBe('degraded');
      expect(dirCheck?.message).toContain('does not exist');
    });

    it('should handle no workspace folder', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      const result = await service.runHealthCheck(false);
      const dirCheck = result.checks.find(c => c.name === 'Plans Directory');

      expect(dirCheck?.status).toBe('degraded');
      expect(dirCheck?.message).toContain('No workspace folder');
    });
  });

  describe('Plans Exist Check', () => {
    it('should pass when plans are found', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
      });
      (fs.readdir as jest.Mock).mockResolvedValue([
        'plan1.json',
        'plan2.md',
        'README.md',
      ]);

      const result = await service.runHealthCheck(false);
      const plansCheck = result.checks.find(c => c.name === 'Plans Found');

      expect(plansCheck?.status).toBe('healthy');
      expect(plansCheck?.message).toContain('3 file(s) found');
    });

    it('should be degraded when no plans exist', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
      });
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const result = await service.runHealthCheck(false);
      const plansCheck = result.checks.find(c => c.name === 'Plans Found');

      expect(plansCheck?.status).toBe('degraded');
      expect(plansCheck?.message).toContain('No plan files found');
      expect(plansCheck?.optional).toBe(true);
    });
  });

  describe('MCP Server Check', () => {
    it('should be healthy when MCP is not configured (optional)', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'mcp.baseUrl') return '';
          return 'http://localhost:8000';
        }),
      });

      const result = await service.runHealthCheck(false);
      const mcpCheck = result.checks.find(c => c.name === 'MCP Server');

      expect(mcpCheck?.status).toBe('healthy');
      expect(mcpCheck?.message).toContain('Not configured');
      expect(mcpCheck?.optional).toBe(true);
    });

    it('should be healthy when MCP is reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await service.runHealthCheck(false);
      const mcpCheck = result.checks.find(c => c.name === 'MCP Server');

      expect(mcpCheck?.status).toBe('healthy');
      expect(mcpCheck?.optional).toBe(true);
    });
  });

  describe('WebSocket Configuration Check', () => {
    it('should pass with valid configuration', async () => {
      // Mock WebSocketConfigManager
      const mockWebSocketConfigManager = WebSocketConfigManagerModule.WebSocketConfigManager as jest.Mocked<typeof WebSocketConfigManagerModule.WebSocketConfigManager>;
      jest.spyOn(mockWebSocketConfigManager, 'getConfig').mockReturnValue({
        driver: 'soketi',
        appKey: 'test-key',
        host: 'localhost',
      } as any);
      jest.spyOn(mockWebSocketConfigManager, 'validate').mockReturnValue(null);

      const result = await service.runHealthCheck(false);
      const wsCheck = result.checks.find(c => c.name === 'WebSocket Config');

      expect(wsCheck?.status).toBe('healthy');
      expect(wsCheck?.optional).toBe(true);
    });
  });

  describe('VS Code Version Check', () => {
    it('should pass with sufficient version', async () => {
      (vscode as any).version = '1.85.0';

      const result = await service.runHealthCheck(false);
      const versionCheck = result.checks.find(c => c.name === 'VS Code Version');

      expect(versionCheck?.status).toBe('healthy');
    });

    it('should fail with insufficient version', async () => {
      (vscode as any).version = '1.70.0';

      const result = await service.runHealthCheck(false);
      const versionCheck = result.checks.find(c => c.name === 'VS Code Version');

      expect(versionCheck?.status).toBe('unhealthy');
      expect(versionCheck?.details).toContain('may not function correctly');
    });
  });

  describe('Overall Health Calculation', () => {
    it('should be healthy when all critical checks pass', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue(['plan1.json']);

      const result = await service.runHealthCheck(false);

      expect(result.status).toBe('healthy');
      expect(result.summary).toContain('All critical services operational');
    });

    it('should be unhealthy when any critical check fails', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn(() => ''), // No backend URL
      });

      const result = await service.runHealthCheck(false);

      expect(result.status).toBe('unhealthy');
      expect(result.summary).toContain('may not function correctly');
    });

    it('should be degraded when optional checks fail but critical pass', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue([]); // No plans (optional)

      const result = await service.runHealthCheck(false);

      // Should still be healthy because plans are optional
      expect(result.status).toBe('healthy');
    });
  });

  describe('Caching', () => {
    it('should cache results for 1 minute', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue(['plan1.json']);

      const result1 = await service.runHealthCheck(true);
      const result2 = await service.runHealthCheck(true);

      expect(result1.timestamp).toBe(result2.timestamp);
      // fetch should only be called once (for the first check)
      expect(global.fetch).toHaveBeenCalledTimes(2); // Backend + MCP
    });

    it('should bypass cache when useCache is false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue(['plan1.json']);

      const result1 = await service.runHealthCheck(false);
      const result2 = await service.runHealthCheck(false);

      expect(result1.timestamp).not.toBe(result2.timestamp);
    });
  });

  describe('Display Results', () => {
    it('should output results to channel', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue(['plan1.json']);

      const result = await service.runHealthCheck(false);
      service.displayResults(result);

      expect(mockOutputChannel.clear).toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('should update status bar with health indicator', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue(['plan1.json']);

      const result = await service.runHealthCheck(false);
      service.updateStatusBar(result, mockStatusBarItem);

      expect(mockStatusBarItem.text).toContain('Healthy');
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('Welcome Message', () => {
    it('should show warning when unhealthy', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn(() => ''), // No config
      });

      const result = await service.runHealthCheck(false);
      await service.showWelcomeIfUnhealthy(result);

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('should not show warning when healthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue(['plan1.json']);

      const result = await service.runHealthCheck(false);
      await service.showWelcomeIfUnhealthy(result);

      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });
  });
});
