// ./errorHandler.web.spec.ts
import { CircuitBreaker } from '../errorHandler.ts';

/** @aiContributed-2026-01-23 */
describe('CircuitBreaker - getState', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker();
  });

  /** @aiContributed-2026-01-23 */
    it('should return "closed" when the state is closed', () => {
    (circuitBreaker as any).state = 'closed';
    expect(circuitBreaker.getState()).toBe('closed');
  });

  /** @aiContributed-2026-01-23 */
    it('should return "open" when the state is open', () => {
    (circuitBreaker as any).state = 'open';
    expect(circuitBreaker.getState()).toBe('open');
  });

  /** @aiContributed-2026-01-23 */
    it('should return "half-open" when the state is half-open', () => {
    (circuitBreaker as any).state = 'half-open';
    expect(circuitBreaker.getState()).toBe('half-open');
  });
});