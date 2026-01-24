// ./errorHandler.web.spec.ts
import { createRetryHandler } from '../errorHandler';
import * as vscode from 'vscode';

/** @aiContributed-2026-01-23 */
describe('createRetryHandler', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** @aiContributed-2026-01-23 */
    it('should return retry options with correct default values', () => {
    const context = 'TestContext';
    const retryHandler = createRetryHandler(context);

    expect(retryHandler.maxRetries).toBe(3);
    expect(retryHandler.initialDelay).toBe(1000);
    expect(retryHandler.maxDelay).toBe(10000);
    expect(retryHandler.backoffMultiplier).toBe(2);
    expect(typeof retryHandler.onRetry).toBe('function');
  });

  /** @aiContributed-2026-01-23 */
    it('should log retry attempts with the correct context and error message', () => {
    const context = 'TestContext';
    const retryHandler = createRetryHandler(context);
    const error = new Error('Test error');

    retryHandler.onRetry?.(1, error);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      `[${context}] Retry attempt 1: ${error.message}`
    );
  });
});
