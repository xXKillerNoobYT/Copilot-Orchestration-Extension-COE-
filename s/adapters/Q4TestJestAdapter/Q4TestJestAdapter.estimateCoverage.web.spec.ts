// ./Q4TestJestAdapter.web.spec.ts
import { Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter.ts';

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - estimateCoverage', () => {
  /** @aiContributed-2026-01-24 */
    it('should calculate coverage correctly based on scenario categories', () => {
    const adapter = new Q4TestJestAdapter('.q4testrc.json');
    const scenarios = [
      { category: 'critical' },
      { category: 'logical' },
      { category: 'error' },
      { category: 'edge' },
    ];

    const result = (adapter as any).estimateCoverage(scenarios);

    expect(result).toBe(100);
  });

  /** @aiContributed-2026-01-24 */
    it('should handle scenarios with unknown categories gracefully', () => {
    const adapter = new Q4TestJestAdapter('.q4testrc.json');
    const scenarios = [
      { category: 'critical' },
      { category: 'unknown' },
    ];

    const result = (adapter as any).estimateCoverage(scenarios);

    expect(result).toBe(30);
  });

  /** @aiContributed-2026-01-24 */
    it('should cap the coverage at 100%', () => {
    const adapter = new Q4TestJestAdapter('.q4testrc.json');
    const scenarios = Array(10).fill({ category: 'critical' });

    const result = (adapter as any).estimateCoverage(scenarios);

    expect(result).toBe(100);
  });

  /** @aiContributed-2026-01-24 */
    it('should return 0% coverage for an empty scenario list', () => {
    const adapter = new Q4TestJestAdapter('.q4testrc.json');
    const scenarios: any[] = [];

    const result = (adapter as any).estimateCoverage(scenarios);

    expect(result).toBe(0);
  });
});