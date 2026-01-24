// ./errorHandler.web.spec.ts
import { CircuitBreaker } from '../errorHandler.ts';

/** @aiContributed-2026-01-23 */
describe('CircuitBreaker - execute', () => {
  let circuitBreaker: CircuitBreaker;
  const mockOptions = { resetTimeout: 5000 };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z').getTime());
    circuitBreaker = new CircuitBreaker(mockOptions as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** @aiContributed-2026-01-23 */
    it('should throw an error if the circuit is open and reset timeout has not elapsed', async () => {
    (circuitBreaker as any).state = 'open';
    (circuitBreaker as any).lastFailureTime = Date.now();

    await expect(
      circuitBreaker.execute(() => Promise.resolve('success'))
    ).rejects.toThrow('Circuit breaker is OPEN. Service unavailable.');
  });

  /** @aiContributed-2026-01-23 */
    it('should transition to half-open state if reset timeout has elapsed', async () => {
    (circuitBreaker as any).state = 'open';
    (circuitBreaker as any).lastFailureTime = Date.now() - 6000;

    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(mockFn);

    expect(result).toBe('success');
    expect((circuitBreaker as any).state).toBe('closed');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  /** @aiContributed-2026-01-23 */
    it('should close the circuit if the function succeeds in half-open state', async () => {
    (circuitBreaker as any).state = 'half-open';

    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(mockFn);

    expect(result).toBe('success');
    expect((circuitBreaker as any).state).toBe('closed');
    expect((circuitBreaker as any).failureCount).toBe(0);
  });

  /** @aiContributed-2026-01-23 */
    it('should record a failure and throw an error if the function fails', async () => {
    (circuitBreaker as any).state = 'closed';
    const recordFailureSpy = jest.spyOn(circuitBreaker as any, 'recordFailure');

    const mockFn = jest.fn().mockRejectedValue(new Error('Function failed'));
    await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Function failed');

    expect(recordFailureSpy).toHaveBeenCalled();
    expect((circuitBreaker as any).state).toBe('closed');
  });
});