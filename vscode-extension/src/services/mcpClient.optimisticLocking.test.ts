/**
 * Tests for MCPClient optimistic locking and version conflict handling
 * Focus: Task status updates with version checking and retry logic
 * 
 * Reference: https://jestjs.io/docs/timer-mocks
 * Reference: https://jestjs.io/docs/asynchronous for Promise and timer handling
 * See: https://jestjs.io/docs/setup-teardown for test lifecycle
 */

import { MCPClient } from './mcpClient';

// Mock global fetch
global.fetch = jest.fn();

describe('MCPClient - Optimistic Locking', () => {
  let mcpClient: MCPClient;

  beforeEach(() => {
    jest.clearAllMocks();
    MCPClient.invalidateInstance(); // Clear any previous instance
    mcpClient = MCPClient.initialize({ baseUrl: 'http://localhost:8000' });
    // Use fake timers for exponential backoff testing
    // Reference: https://jestjs.io/docs/timer-mocks#enable-fake-timers
    jest.useFakeTimers();
  });

  // Reference: https://jestjs.io/docs/setup-teardown#cleanup
  afterEach(() => {
    // CRITICAL: Clean up fake timers to prevent open handle errors
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('reportTaskStatus with version conflicts', () => {
    it('should include expectedVersion in request payload', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task-123',
        status: 'in_progress',
        version: 2,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await mcpClient.reportTaskStatus({
        taskId: 'task-123',
        status: 'in-progress',
        expectedVersion: 1,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mcp/reportTaskStatus'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"expectedVersion":1'),
        })
      );
    });

    it('should retry on 409 version conflict with exponential backoff', async () => {
      // Reference: https://jestjs.io/docs/timer-mocks#runalltimersasync
      
      const conflictResponse = {
        success: false,
        error: 'version_conflict',
        message: 'Task was modified by another agent',
        currentVersion: 2,
        expectedVersion: 1,
        currentStatus: 'in_progress',
      };

      const latestTaskResponse = {
        success: true,
        task: {
          taskId: 'task-123',
          version: 2,
          status: 'in_progress',
        },
      };

      const successResponse = {
        success: true,
        taskId: 'task-123',
        status: 'done',
        version: 3,
      };

      // First attempt: 409 conflict
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => conflictResponse,
      });

      // Fetch latest task version
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => latestTaskResponse,
      });

      // Second attempt: success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      });

      const resultPromise = mcpClient.reportTaskStatus({
        taskId: 'task-123',
        status: 'done',
        expectedVersion: 1,
      });

      // Fast-forward through backoff delay
      // See: https://jestjs.io/docs/timer-mocks#runalltimersasync
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.version).toBe(3);
      expect(global.fetch).toHaveBeenCalledTimes(3); // conflict + fetch latest + success
    });

    it('should throw error after max attempts on persistent conflicts', async () => {
      // Reference: https://jestjs.io/docs/asynchronous#promises
      
      const conflictResponse = {
        success: false,
        error: 'version_conflict',
        message: 'Task was modified by another agent',
        currentVersion: 2,
        expectedVersion: 1,
      };

      const latestTaskResponse = {
        success: true,
        task: {
          taskId: 'task-123',
          version: 2,
        },
      };

      // All attempts return 409
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => conflictResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => latestTaskResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({ ...conflictResponse, currentVersion: 3 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...latestTaskResponse, task: { ...latestTaskResponse.task, version: 3 } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({ ...conflictResponse, currentVersion: 4 }),
        });

      const resultPromise = mcpClient.reportTaskStatus({
        taskId: 'task-123',
        status: 'done',
        expectedVersion: 1,
      }, 3); // max 3 attempts

      await jest.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(/failed after 3 attempts/);

      jest.useRealTimers();
    });

    it('should throw non-conflict errors immediately without retry', async () => {
      const serverError = {
        success: false,
        error: 'Internal server error',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => serverError,
      });

      await expect(
        mcpClient.reportTaskStatus({
          taskId: 'task-123',
          status: 'done',
          expectedVersion: 1,
        })
      ).rejects.toThrow();

      // Should only try once (no retry on non-409 errors)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle version conflicts with correct backoff timing', async () => {
      jest.useFakeTimers();

      const conflictResponse = {
        success: false,
        error: 'version_conflict',
        message: 'Task was modified by another agent',
        currentVersion: 2,
      };

      const latestTaskResponse = {
        success: true,
        task: { taskId: 'task-123', version: 2 },
      };

      const successResponse = {
        success: true,
        taskId: 'task-123',
        version: 3,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => conflictResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => latestTaskResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => successResponse,
        });

      const resultPromise = mcpClient.reportTaskStatus({
        taskId: 'task-123',
        status: 'done',
        expectedVersion: 1,
      });

      // Should wait ~1000ms for first retry (2^(1-1) * 1000 = 2^0 * 1000 = 1000ms)
      await jest.advanceTimersByTimeAsync(1000);
      await resultPromise;

      jest.useRealTimers();
    });

    it('should work without expectedVersion for backward compatibility', async () => {
      const successResponse = {
        success: true,
        taskId: 'task-123',
        status: 'in_progress',
        version: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      });

      const result = await mcpClient.reportTaskStatus({
        taskId: 'task-123',
        status: 'in-progress',
        // No expectedVersion provided
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.not.stringContaining('"expectedVersion"'),
        })
      );
    });
  });

  describe('Error parsing for version conflicts', () => {
    it('should extract version conflict details from 409 response', async () => {
      const conflictResponse = {
        success: false,
        error: 'version_conflict',
        message: 'Task was modified by another agent. Please retry with the latest version.',
        currentVersion: 5,
        expectedVersion: 3,
        currentStatus: 'blocked',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => conflictResponse,
      });

      try {
        await mcpClient.reportTaskStatus({
          taskId: 'task-123',
          status: 'done',
          expectedVersion: 3,
        });
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.error).toBe('version_conflict');
        expect(error.currentVersion).toBe(5);
        expect(error.expectedVersion).toBe(3);
        expect(error.currentStatus).toBe('blocked');
      }
    });
  });
});
