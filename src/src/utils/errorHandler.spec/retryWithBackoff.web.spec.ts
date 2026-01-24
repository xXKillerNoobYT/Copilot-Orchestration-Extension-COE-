// ./errorHandler.web.spec.ts
import { retryWithBackoff } from '../errorHandler';
import { jest } from '@jest/globals';

/** @aiContributed-2026-01-23 */
describe('retryWithBackoff', () => {
  const mockFn = jest.fn();
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /** @aiContributed-2026-01-23 */
    it('should resolve successfully on the first attempt', async () => {
    mockFn.mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  /** @aiContributed-2026-01-23 */
    it('should retry the specified number of times and eventually succeed', async () => {
    mockFn
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn, { maxRetries: 2, initialDelay: 10 });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  /** @aiContributed-2026-01-23 */
    it('should retry the specified number of times and throw the last error if all attempts fail', async () => {
    mockFn.mockRejectedValue(new Error('Persistent error'));

    await expect(
      retryWithBackoff(mockFn, { maxRetries: 2, initialDelay: 10 })
    ).rejects.toThrow('Persistent error');

    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  /** @aiContributed-2026-01-23 */
    it('should call the onRetry callback with the correct attempt number and error', async () => {
    const onRetry = jest.fn();
    mockFn
      .mockRejectedValueOnce(new Error('Retry error'))
      .mockResolvedValueOnce('success');

    await retryWithBackoff(mockFn, {
      maxRetries: 1,
      initialDelay: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /** @aiContributed-2026-01-23 */
    it('should respect the maximum delay', async () => {
    mockFn.mockRejectedValue(new Error('Error'));

    await expect(
      retryWithBackoff(mockFn, {
        maxRetries: 2,
        initialDelay: 10,
        maxDelay: 15,
        backoffMultiplier: 3,
      })
    ).rejects.toThrow();

    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  /** @aiContributed-2026-01-23 */
    it('should handle non-Error objects thrown by the function', async () => {
    mockFn.mockRejectedValue('Non-error object');

    await expect(
      retryWithBackoff(mockFn, { maxRetries: 1, initialDelay: 10 })
    ).rejects.toThrow('Non-error object');

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});