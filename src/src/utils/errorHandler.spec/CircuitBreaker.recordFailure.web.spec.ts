// ./errorHandler.web.spec.ts
import { CircuitBreaker } from '../errorHandler.ts';

/** @aiContributed-2026-01-23 */
describe('CircuitBreaker - recordFailure', () => {
  let circuitBreaker: any;
  const mockOptions = { failureThreshold: 3 };

  beforeEach(() => {
    circuitBreaker = new (CircuitBreaker as any)(mockOptions);
    circuitBreaker.failureCount = 0;
    circuitBreaker.lastFailureTime = 0;
    circuitBreaker.state = 'closed';
  });

  /** @aiContributed-2026-01-23 */
    it('should increment failureCount and update lastFailureTime', () => {
    const mockDateNow = jest.spyOn(global.Date, 'now').mockReturnValue(1680000000000);

    (circuitBreaker as any).recordFailure();

    expect(circuitBreaker.failureCount).toBe(1);
    expect(circuitBreaker.lastFailureTime).toBe(1680000000000);

    mockDateNow.mockRestore();
  });

  /** @aiContributed-2026-01-23 */
    it('should open the circuit when failureCount exceeds failureThreshold', () => {
    const mockDateNow = jest.spyOn(global.Date, 'now').mockReturnValue(1680000000000);

    circuitBreaker.failureCount = 2; // Set just below the threshold
    (circuitBreaker as any).recordFailure();

    expect(circuitBreaker.failureCount).toBe(3);
    expect(circuitBreaker.state).toBe('open');

    mockDateNow.mockRestore();
  });

  /** @aiContributed-2026-01-23 */
    it('should not open the circuit if failureCount is below failureThreshold', () => {
    const mockDateNow = jest.spyOn(global.Date, 'now').mockReturnValue(1680000000000);

    circuitBreaker.failureCount = 1; // Below the threshold
    (circuitBreaker as any).recordFailure();

    expect(circuitBreaker.failureCount).toBe(2);
    expect(circuitBreaker.state).toBe('closed');

    mockDateNow.mockRestore();
  });
});