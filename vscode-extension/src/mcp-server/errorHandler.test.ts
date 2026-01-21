/**
 * Unit tests for MCPErrorHandler
 * Tests retry logic, timeout handling, and dead-letter queue integration
 */

import Database from 'better-sqlite3';
import { MCPErrorHandler, DEFAULT_RETRY_CONFIG } from './errorHandler';
import { DeadLetterQueueService } from '../services/deadLetterQueue';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

describe('MCPErrorHandler', () => {
  let db: Database.Database;
  let dlq: DeadLetterQueueService;
  let handler: MCPErrorHandler;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary database for each test
    tempDir = mkdtempSync(join(tmpdir(), 'mcp-error-test-'));
    db = new Database(join(tempDir, 'test.db'));
    dlq = new DeadLetterQueueService(db);
    handler = new MCPErrorHandler(dlq);
  });

  afterEach(() => {
    // Clean up
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(DEFAULT_RETRY_CONFIG.maxRetries);
      expect(config.initialDelay).toBe(DEFAULT_RETRY_CONFIG.initialDelay);
      expect(config.maxDelay).toBe(DEFAULT_RETRY_CONFIG.maxDelay);
      expect(config.backoffMultiplier).toBe(DEFAULT_RETRY_CONFIG.backoffMultiplier);
      expect(config.timeout).toBe(DEFAULT_RETRY_CONFIG.timeout);
    });

    it('should allow custom configuration', () => {
      const customHandler = new MCPErrorHandler(dlq, {
        maxRetries: 5,
        timeout: 60000,
      });

      const config = customHandler.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.timeout).toBe(60000);
    });

    it('should allow configuration updates', () => {
      handler.updateConfig({ maxRetries: 10 });

      const config = handler.getConfig();
      expect(config.maxRetries).toBe(10);
    });
  });

  describe('executeWithRetry', () => {
    it('should return result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await handler.executeWithRetry(
        operation,
        'msg-001',
        'task_request',
        {},
        'testHandler'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const result = await handler.executeWithRetry(
        operation,
        'msg-001',
        'task_request',
        {},
        'testHandler'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff between retries', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();

      await handler.executeWithRetry(
        operation,
        'msg-001',
        'task_request',
        {},
        'testHandler'
      );

      const totalTime = Date.now() - startTime;

      // Should have waited at least 1000ms + 2000ms = 3000ms
      // (initial delay + second delay with backoff multiplier 2)
      expect(totalTime).toBeGreaterThanOrEqual(2900); // Allow small margin
    });

    it('should add to dead-letter queue after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const messageId = 'msg-001';
      const payload = { taskId: 'task-001' };

      await expect(
        handler.executeWithRetry(
          operation,
          messageId,
          'task_request',
          payload,
          'testHandler'
        )
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(3);

      // Check dead-letter queue
      const entries = await dlq.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].messageId).toBe(messageId);
      expect(entries[0].retryCount).toBe(3);
      expect(entries[0].handlerName).toBe('testHandler');
    });

    it('should timeout long-running operations', async () => {
      const customHandler = new MCPErrorHandler(dlq, { timeout: 100, maxRetries: 1 });

      const operation = () => new Promise(resolve => setTimeout(resolve, 500));

      await expect(
        customHandler.executeWithRetry(
          operation,
          'msg-001',
          'task_request',
          {},
          'testHandler'
        )
      ).rejects.toThrow('timeout');
    });

    it('should not timeout fast operations', async () => {
      const operation = () => new Promise(resolve => setTimeout(() => resolve('done'), 50));

      const result = await handler.executeWithRetry(
        operation,
        'msg-001',
        'task_request',
        {},
        'testHandler'
      );

      expect(result).toBe('done');
    });
  });

  describe('handleError', () => {
    it('should add message to DLQ after max retries', async () => {
      const messageId = 'msg-001';
      const messageType = 'task_request';
      const payload = { taskId: 'task-001', action: 'test' };
      const error = new Error('Test error');
      const handlerName = 'getTaskStatus';

      await handler.handleError(
        messageId,
        messageType,
        payload,
        error,
        handlerName,
        3
      );

      const entries = await dlq.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].messageId).toBe(messageId);
      expect(entries[0].messageType).toBe(messageType);
      expect(entries[0].errorMessage).toBe('Test error');
      expect(entries[0].handlerName).toBe(handlerName);
    });

    it('should not add to DLQ before max retries', async () => {
      await handler.handleError(
        'msg-001',
        'task_request',
        {},
        new Error('Test'),
        'handler',
        1 // Less than max retries
      );

      const entries = await dlq.getEntries();
      expect(entries.length).toBe(0);
    });

    it('should extract taskId from payload', async () => {
      const payload = { taskId: 'task-123', other: 'data' };

      await handler.handleError(
        'msg-001',
        'task_request',
        payload,
        new Error('Test'),
        'handler',
        3
      );

      const entries = await dlq.getEntries();
      expect(entries[0].taskId).toBe('task-123');
    });

    it('should handle errors gracefully when DLQ fails', async () => {
      db.close(); // Force DLQ to fail

      await expect(
        handler.handleError(
          'msg-001',
          'task_request',
          {},
          new Error('Test'),
          'handler',
          3
        )
      ).resolves.not.toThrow(); // Should not throw even if DLQ fails
    });
  });

  describe('WebSocket Event Emission', () => {
    it('should emit dead-letter event when message added to DLQ', async () => {
      const mockEmit = jest.fn();
      (global as any).wsServer = { emit: mockEmit };

      await handler.handleError(
        'msg-001',
        'task_request',
        {},
        new Error('Test error'),
        'testHandler',
        3
      );

      expect(mockEmit).toHaveBeenCalledWith('deadLetterAdded', {
        messageId: 'msg-001',
        handlerName: 'testHandler',
        error: 'Test error',
        timestamp: expect.any(String),
      });

      delete (global as any).wsServer;
    });

    it('should not throw if WebSocket server not available', async () => {
      delete (global as any).wsServer;

      await expect(
        handler.handleError(
          'msg-001',
          'task_request',
          {},
          new Error('Test'),
          'handler',
          3
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Retry Delay Calculation', () => {
    it('should calculate exponential backoff correctly', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();

      await handler.executeWithRetry(
        operation,
        'msg-001',
        'task_request',
        {},
        'testHandler'
      );

      const elapsed = Date.now() - startTime;

      // Expected delays: 1000ms (first retry), 2000ms (second retry)
      // Total should be at least 3000ms
      expect(elapsed).toBeGreaterThanOrEqual(2900);
    });

    it('should respect maximum delay', async () => {
      const customHandler = new MCPErrorHandler(dlq, {
        initialDelay: 1000,
        maxDelay: 2000,
        backoffMultiplier: 10, // Would normally cause large delays
        maxRetries: 3,
      });

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();

      await customHandler.executeWithRetry(
        operation,
        'msg-001',
        'task_request',
        {},
        'testHandler'
      );

      const elapsed = Date.now() - startTime;

      // Even with high multiplier, delays should be capped at maxDelay (2000ms)
      // First retry: 1000ms, second retry: min(10000, 2000) = 2000ms
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('Error Messages and Logging', () => {
    let consoleWarnSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log retry attempts', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      await handler.executeWithRetry(
        operation,
        'msg-001',
        'task_request',
        {},
        'testHandler'
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('testHandler'),
        expect.stringContaining('Fail')
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying testHandler')
      );
    });

    it('should log when message added to DLQ', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        handler.executeWithRetry(
          operation,
          'msg-001',
          'task_request',
          {},
          'testHandler'
        )
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('added to dead-letter queue'),
        expect.anything()
      );
    });

    it('should log configuration updates', () => {
      handler.updateConfig({ maxRetries: 10 });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('configuration updated'),
        expect.anything()
      );
    });
  });

  describe('Integration with DeadLetterQueueService', () => {
    it('should successfully integrate with DLQ for persistence', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        handler.executeWithRetry(
          operation,
          'msg-001',
          'task_request',
          { taskId: 'task-001' },
          'testHandler'
        )
      ).rejects.toThrow();

      // Verify entry in database
      const entries = await dlq.getEntries();
      expect(entries.length).toBe(1);

      // Verify can replay
      await dlq.replayMessage(entries[0].id);
      const replayed = await dlq.getEntry(entries[0].id);
      expect(replayed!.status).toBe('replayed');
    });
  });
});
