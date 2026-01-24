// ./errorHandler.web.spec.ts
import { CircuitBreaker } from '../errorHandler.ts';

/** @aiContributed-2026-01-23 */
describe('CircuitBreaker - reset', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker();
    (circuitBreaker as any).failureCount = 3;
    (circuitBreaker as any).state = 'open';
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** @aiContributed-2026-01-23 */
    it('should reset failureCount to 0 and state to "closed"', () => {
    circuitBreaker.reset();

    expect((circuitBreaker as any).failureCount).toBe(0);
    expect((circuitBreaker as any).state).toBe('closed');
  });

  /** @aiContributed-2026-01-23 */
    it('should log the reset action', () => {
    circuitBreaker.reset();

    expect(console.log).toHaveBeenCalledWith('[CircuitBreaker] Circuit manually reset');
  });
});