/**
 * Unit tests for MCPHandlerBase class
 * Tests retry logic, timeout, error handling, and dead-letter queue
 */

import { MCPHandlerBase, DEFAULT_ERROR_CONFIG } from '../MCPHandlerBase';

class TestHandler extends MCPHandlerBase {
  public async testExecuteWithRetry<T>(operation: () => Promise<T>, args: any): Promise<T> {
    return this.executeWithRetry(operation, 'TestHandler', args);
  }

  public testFormatSuccess(data: any) {
    return this.formatSuccess(data);
  }

  public testFormatError(error: Error | string, context?: any) {
    return this.formatError(error, context);
  }
}

describe('MCPHandlerBase', () => {
  let handler: TestHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new TestHandler({
      timeout: 1000,
      retryAttempts: 3,
      retryDelayMs: 100,
      useExponentialBackoff: true,
    });
  });

  describe('Retry Mechanism', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await handler.testExecuteWithRetry(mockOperation, {});

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result).toBe('success');
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const result = await handler.testExecuteWithRetry(mockOperation, {});

      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(result).toBe('success');
    });

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(handler.testExecuteWithRetry(mockOperation, {})).rejects.toThrow(
        'failed after 3 attempts'
      );

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff between retries', async () => {
      jest.useFakeTimers();

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      const promise = handler.testExecuteWithRetry(mockOperation, {});
      await jest.runAllTimersAsync();
      const endTime = Date.now();

      // With exponential backoff: 100ms + 200ms = 300ms minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockOperation).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
      await promise;
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running operations', async () => {
      jest.useFakeTimers();

      try {
        const slowOperation = jest.fn(
          () => new Promise((resolve) => setTimeout(() => resolve('too slow'), 35000))
        );

        const promise = handler.testExecuteWithRetry(slowOperation, {});
        const expectation = expect(promise).rejects.toThrow(/Operation timed out|failed after/);

        // Fast-forward all timers to trigger timeout and retries
        await jest.runAllTimersAsync();

        await expectation;
      } finally {
        jest.useRealTimers();
      }
    });

    it('should complete fast operations before timeout', async () => {
      jest.useFakeTimers();

      const fastOperation = () =>
        new Promise((resolve) => setTimeout(() => resolve('fast'), 100));

      const promise = handler.testExecuteWithRetry(fastOperation as any, {});
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('fast');

      jest.useRealTimers();
    });
  });

  describe('Dead Letter Queue', () => {
    it('should add failed requests to dead letter queue', async () => {
      jest.useFakeTimers();
      const mockOperation = jest.fn().mockRejectedValue(new Error('Fatal error'));

      const promise = handler.testExecuteWithRetry(mockOperation, { testArg: 'value' });
      const expectation = expect(promise).rejects.toThrow();
      await jest.runAllTimersAsync();
      await expectation;

      const deadLetterQueue = handler.getDeadLetterQueue();
      expect(deadLetterQueue.length).toBeGreaterThanOrEqual(1);
      const lastEntry = deadLetterQueue[deadLetterQueue.length - 1];
      expect(lastEntry).toMatchObject({
        handler: 'TestHandler',
        args: { testArg: 'value' },
        error: 'Fatal error',
        retryCount: 3,
      });
      jest.useRealTimers();
    });

    it('should clear dead letter queue', async () => {
      jest.useFakeTimers();
      const mockOperation = jest.fn().mockRejectedValue(new Error('Error'));

      const promise = handler.testExecuteWithRetry(mockOperation, {});
      const expectation = expect(promise).rejects.toThrow();
      await jest.runAllTimersAsync();
      await expectation;

      expect(handler.getDeadLetterQueue().length).toBeGreaterThanOrEqual(1);

      handler.clearDeadLetterQueue();
      expect(handler.getDeadLetterQueue()).toHaveLength(0);
      jest.useRealTimers();
    });
  });

  describe('Response Formatting', () => {
    it('should format success response correctly', () => {
      const data = { taskId: 'TASK-123', status: 'completed' };
      const result = handler.testFormatSuccess(data);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      });
    });

    it('should format error response correctly', () => {
      const error = new Error('Something went wrong');
      const result = handler.testFormatError(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Something went wrong'),
          },
        ],
      });

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.error).toBe('Something went wrong');
      expect(parsedResponse.timestamp).toBeDefined();
    });

    it('should format error with context', () => {
      const error = 'Custom error message';
      const context = { taskId: 'TASK-456', operation: 'update' };
      const result = handler.testFormatError(error, context);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.error).toBe('Custom error message');
      expect(parsedResponse.context).toEqual(context);
    });
  });

  describe('Configuration', () => {
    it('should use default error configuration', () => {
      const defaultHandler = new TestHandler();
      expect((defaultHandler as any).errorConfig).toEqual(DEFAULT_ERROR_CONFIG);
    });

    it('should accept custom error configuration', () => {
      const customConfig = {
        timeout: 60000,
        retryAttempts: 5,
        retryDelayMs: 2000,
        useExponentialBackoff: false,
      };

      const customHandler = new TestHandler(customConfig);
      expect((customHandler as any).errorConfig).toEqual(customConfig);
    });
  });
});

