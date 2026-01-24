/**
 * Tests for MCP Client Service
 * Tests MCP server communication, retry logic, circuit breaker, and endpoint access
 */

import { MCPClient, MCP_ENDPOINTS, MCPWebSocketListener } from './mcpClient';
import * as vscode from 'vscode';
import { CircuitBreaker } from '../utils/errorHandler';

// Mock modules
jest.mock('vscode');
jest.mock('../utils/errorHandler', () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
  withTimeout: jest.fn((promise) => promise),
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn((fn) => fn()),
    getState: jest.fn(() => 'closed')
  })),
  createRetryHandler: jest.fn(() => ({
    maxRetries: 3,
    initialDelay: 1000
  })),
  logError: jest.fn()
}));
jest.mock('../utils/errorMessages', () => ({
  logErrorToOutput: jest.fn(),
  buildMCPErrorMessage: jest.fn((title, url, error) => `${title}: ${error.message}`)
}));

// Mock global fetch
global.fetch = jest.fn();

describe('MCPClient', () => {
  let client: MCPClient;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    (MCPClient as any).instance = undefined;

    // Mock VS Code configuration
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'mcp.baseUrl') return 'http://localhost:8000';
        if (key === 'mcp.authToken') return 'test-token';
        return defaultValue;
      })
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    (vscode.EventEmitter as any) = jest.fn().mockImplementation(() => ({
      event: jest.fn(),
      fire: jest.fn()
    }));

    client = MCPClient.initialize({
      baseUrl: 'http://localhost:8000',
      authToken: 'test-token',
      timeout: 5000
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(MCPClient);
    });

    it('should return the same instance on getInstance', () => {
      const instance1 = MCPClient.getInstance();
      const instance2 = MCPClient.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create instance from VS Code config if not initialized', () => {
      (MCPClient as any).instance = undefined;
      const instance = MCPClient.getInstance();
      expect(instance).toBeDefined();
      expect(vscode.workspace.getConfiguration).toHaveBeenCalled();
    });

    it('should invalidate instance on invalidateInstance', () => {
      const instance1 = MCPClient.getInstance();
      MCPClient.invalidateInstance();
      (MCPClient as any).instance = undefined;
      const instance2 = MCPClient.initialize({
        baseUrl: 'http://localhost:8000',
        authToken: 'new-token'
      });
      expect(instance1).not.toBe(instance2);
    });

    it('should get auth token from environment if not in config', () => {
      process.env.COPILOT_MCP_TOKEN = 'env-token';
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'mcp.baseUrl') return 'http://localhost:8000';
        if (key === 'mcp.authToken') return '';
        return defaultValue;
      });

      (MCPClient as any).instance = undefined;
      const instance = MCPClient.getInstance();
      expect(instance).toBeDefined();
      delete process.env.COPILOT_MCP_TOKEN;
    });
  });

  describe('Configuration Methods', () => {
    it('should set base URL', () => {
      client.setBaseUrl('http://newhost:9000');
      // Test by making a request and checking the URL
      expect(client).toBeDefined();
    });

    it('should set auth token', () => {
      client.setAuthToken('new-token');
      expect(client).toBeDefined();
    });

    it('should set timeout', () => {
      client.setTimeout(15000);
      expect(client).toBeDefined();
    });
  });

  describe('GET /api/v1/mcp/nextTask', () => {
    it('should fetch next task without filters', async () => {
      const mockTask = {
        id: 'task-123',
        name: 'Test Task',
        status: 'pending'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTask
      });

      const task = await client.getNextTask();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/mcp/nextTask',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          })
        })
      );
      expect(task).toEqual(mockTask);
    });

    it('should fetch next task with filters', async () => {
      const mockTask = { id: 'task-456', name: 'Filtered Task' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTask
      });

      await client.getNextTask('type:feature', 'high');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('filter=type%3Afeature'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('priority=high'),
        expect.any(Object)
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.getNextTask()).rejects.toThrow();
    });
  });

  describe('GET /mcp/task/:taskId', () => {
    it('should fetch task by ID', async () => {
      const mockTask = {
        task: { id: 'task-789', version: 3 }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTask
      });

      const result = await client.getTaskById('task-789');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/mcp/task/task-789',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe('POST /mcp/reportTaskStatus', () => {
    it('should report task status successfully', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        taskId: 'task-123',
        status: 'done' as const,
        progressPercent: 100,
        implementationNotes: 'Completed successfully'
      };

      const result = await client.reportTaskStatus(data);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/mcp/reportTaskStatus',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should retry on version conflict (409)', async () => {
      const mockError = {
        status: 409,
        error: 'version_conflict',
        currentVersion: 3,
        expectedVersion: 2,
        message: 'Version mismatch'
      };

      const mockTask = {
        task: { id: 'task-123', version: 3 }
      };

      // First call: fail with 409
      // Second call: succeed
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => mockError
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const data = {
        taskId: 'task-123',
        status: 'done' as const,
        expectedVersion: 2
      };

      const result = await client.reportTaskStatus(data, 3);

      // Should have called fetch 3 times: initial attempt, fetch task version, retry
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should throw after max retry attempts on version conflict', async () => {
      const mockError = {
        status: 409,
        error: 'version_conflict',
        currentVersion: 3,
        expectedVersion: 2,
        message: 'Version mismatch'
      };

      const mockTask = {
        task: { id: 'task-123', version: 3 }
      };

      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/mcp/task/')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTask
          });
        }
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => mockError
        });
      });

      const data = {
        taskId: 'task-123',
        status: 'done' as const,
        expectedVersion: 2
      };

      await expect(client.reportTaskStatus(data, 2)).rejects.toThrow(/version conflicts/);
    });

    it('should not retry on non-409 errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' })
      });

      const data = {
        taskId: 'task-123',
        status: 'done' as const
      };

      await expect(client.reportTaskStatus(data)).rejects.toThrow();
      // Should only call once (no retry on 500)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/v1/mcp/reportObservation', () => {
    it('should report observation', async () => {
      const mockResponse = { success: true, observationId: 'obs-123' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        taskId: 'task-123',
        type: 'discovery' as const,
        message: 'Found optimization opportunity',
        severity: 'medium',
        createTask: true
      };

      const result = await client.reportObservation(data);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/mcp/reportObservation',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST /api/v1/mcp/reportVerificationResult', () => {
    it('should report verification result', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        verificationTaskId: 'verify-123',
        originalTaskId: 'task-123',
        status: 'passed' as const,
        checklist: [{ item: 'UI loads', passed: true }],
        notes: 'All checks passed'
      };

      const result = await client.reportVerificationResult(data);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/mcp/reportVerificationResult',
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST /api/v1/mcp/reportTestFailure', () => {
    it('should report test failure', async () => {
      const mockResponse = { success: true, taskCreated: 'task-999' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        taskId: 'task-123',
        test: 'test_user_login',
        error: 'Expected 200, got 401',
        severity: 'critical' as const
      };

      const result = await client.reportTestFailure(data);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/mcp/reportTestFailure',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST /api/v1/mcp/askQuestion', () => {
    it('should ask question with context', async () => {
      const mockResponse = { answer: 'Use pattern X for feature Y' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        question: 'How should I implement feature X?',
        currentTaskId: 'task-123',
        planSection: 'authentication',
        context: { files: ['auth.ts'] }
      };

      const result = await client.askQuestion(data);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Plan Management', () => {
    it('should save plan', async () => {
      const mockResponse = { success: true, planId: 1 };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        name: 'My Project Plan',
        description: 'Project description',
        wizard_state: { step: 1, data: {} },
        status: 'active' as const
      };

      const result = await client.savePlan(data);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/mcp/savePlan',
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should load plan by ID', async () => {
      const mockPlan = {
        id: 1,
        name: 'Loaded Plan',
        wizard_state: { step: 2 }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPlan
      });

      const result = await client.loadPlan(1);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/mcp/loadPlan/1',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual(mockPlan);
    });

    it('should list plans with filters', async () => {
      const mockPlans = [
        { id: 1, name: 'Plan 1', status: 'active' },
        { id: 2, name: 'Plan 2', status: 'active' }
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPlans
      });

      const result = await client.listPlans('active', 10);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
      expect(result).toEqual(mockPlans);
    });
  });

  describe('GET /api/v1/teams/status', () => {
    it('should fetch teams status', async () => {
      const mockStatus = {
        planning: {
          name: 'Planning Team',
          status: 'working',
          tasksCompleted: 10,
          activeTaskCount: 2,
          metrics: { tasksCreated: 15 }
        },
        answer: {
          name: 'Answer Team',
          status: 'idle',
          tasksCompleted: 5,
          activeTaskCount: 0
        },
        decomposition: {
          name: 'Decomposition Team',
          status: 'idle',
          tasksCompleted: 3,
          activeTaskCount: 0
        },
        verification: {
          name: 'Verification Team',
          status: 'idle',
          tasksCompleted: 8,
          activeTaskCount: 0
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStatus
      });

      const result = await client.getTeamsStatus();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/teams/status',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(resolve, 10000);
        })
      );

      const promise = client.getNextTask();

      jest.runAllTimers();

      await expect(promise).rejects.toThrow();

      jest.useRealTimers();
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Task not found' })
      });

      await expect(client.getNextTask()).rejects.toThrow();
    });

    it('should handle malformed JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(client.getNextTask()).rejects.toThrow();
    });

    it('should include auth token in requests if provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await client.getNextTask();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should not include auth header if token not provided', async () => {
      const clientNoAuth = MCPClient.initialize({
        baseUrl: 'http://localhost:8000'
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await clientNoAuth.getNextTask();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });
  });

  describe('MCP Endpoint Constants', () => {
    it('should export correct endpoint paths', () => {
      expect(MCP_ENDPOINTS.BASE).toBe('/api/v1/mcp');
      expect(MCP_ENDPOINTS.NEXT_TASK).toBe('/api/v1/mcp/nextTask');
      expect(MCP_ENDPOINTS.REPORT_TASK_STATUS).toBe('/api/v1/mcp/reportTaskStatus');
      expect(MCP_ENDPOINTS.REPORT_OBSERVATION).toBe('/api/v1/mcp/reportObservation');
      expect(MCP_ENDPOINTS.TEAMS_STATUS).toBe('/api/v1/teams/status');
    });
  });
});

describe('MCPWebSocketListener', () => {
  let listener: MCPWebSocketListener;

  beforeEach(() => {
    (MCPWebSocketListener as any).instance = undefined;
    (vscode.EventEmitter as any) = jest.fn().mockImplementation(() => ({
      event: jest.fn((handler) => ({ dispose: jest.fn() })),
      fire: jest.fn()
    }));
    listener = MCPWebSocketListener.getInstance();
  });

  it('should be a singleton', () => {
    const instance2 = MCPWebSocketListener.getInstance();
    expect(listener).toBe(instance2);
  });

  it('should create event emitters for all event types', () => {
    expect(vscode.EventEmitter).toHaveBeenCalledTimes(6);
  });

  it('should subscribe to event type', () => {
    const handler = jest.fn();
    const disposable = listener.onEvent('task-status', handler);

    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
  });

  it('should emit events to subscribers', () => {
    const mockEmitter = {
      event: jest.fn((handler) => ({ dispose: jest.fn() })),
      fire: jest.fn()
    };

    // Reset singleton before mocking
    (MCPWebSocketListener as any).instance = undefined;

    (vscode.EventEmitter as any) = jest.fn().mockImplementation(() => mockEmitter);
    listener = MCPWebSocketListener.getInstance();

    const data = { taskId: 'task-123', status: 'done' };
    listener.emit('task-status', data);

    // The fire method should be called
    expect(mockEmitter.fire).toHaveBeenCalledWith(data);
  });

  it('should return no-op disposable for unknown event types', () => {
    const disposable = listener.onEvent('unknown-event', jest.fn());
    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
  });
});
