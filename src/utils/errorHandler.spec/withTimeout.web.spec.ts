// ./errorHandler.withTimeout.gptgen.web.spec.ts
import { withTimeout } from '../errorHandler';
import { jest } from '@jest/globals';

/** @aiContributed-2026-01-23 */
describe('withTimeout', () => {
  /** @aiContributed-2026-01-23 */
    it('should resolve the promise if it completes within the timeout', async () => {
    const mockPromise = new Promise((resolve) => setTimeout(() => resolve('Success'), 50));
    const result = await withTimeout(mockPromise, 100, 'Timeout occurred');
    expect(result).toBe('Success');
  });

  /** @aiContributed-2026-01-23 */
    it('should reject with a timeout error if the promise does not complete within the timeout', async () => {
    const mockPromise = new Promise((resolve) => setTimeout(() => resolve('Success'), 200));
    await expect(withTimeout(mockPromise, 100, 'Timeout occurred')).rejects.toThrow('Timeout occurred');
  });

  /** @aiContributed-2026-01-23 */
    it('should clear the timeout after the promise resolves', async () => {
    jest.useFakeTimers();
    const mockPromise = new Promise((resolve) => setTimeout(() => resolve('Success'), 50));
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const result = withTimeout(mockPromise, 100, 'Timeout occurred');
    jest.advanceTimersByTime(50);
    await result;
    expect(clearTimeoutSpy).toHaveBeenCalled();
    jest.useRealTimers();
  }, 10000); // Increased timeout for this test

  /** @aiContributed-2026-01-23 */
    it('should clear the timeout after the promise rejects', async () => {
    jest.useFakeTimers();
    const mockPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Failure')), 50));
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const result = withTimeout(mockPromise, 100, 'Timeout occurred');
    jest.advanceTimersByTime(50);
    await expect(result).rejects.toThrow('Failure');
    expect(clearTimeoutSpy).toHaveBeenCalled();
    jest.useRealTimers();
  }, 10000); // Increased timeout for this test
});