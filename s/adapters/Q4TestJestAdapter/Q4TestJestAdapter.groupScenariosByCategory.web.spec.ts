import { Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter.ts';

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - groupScenariosByCategory', () => {
  /** @aiContributed-2026-01-24 */
    it('should group scenarios by their category', () => {
    const adapter = new Q4TestJestAdapter();
    const scenarios = [
      { category: 'critical', name: 'Critical Test 1' },
      { category: 'logical', name: 'Logical Test 1' },
      { category: 'error', name: 'Error Test 1' },
      { category: 'edge', name: 'Edge Test 1' },
      { category: 'critical', name: 'Critical Test 2' },
    ];

    const result = (adapter as any).groupScenariosByCategory(scenarios);

    expect(result).toEqual({
      critical: [
        { category: 'critical', name: 'Critical Test 1' },
        { category: 'critical', name: 'Critical Test 2' },
      ],
      logical: [{ category: 'logical', name: 'Logical Test 1' }],
      error: [{ category: 'error', name: 'Error Test 1' }],
      edge: [{ category: 'edge', name: 'Edge Test 1' }],
    });
  });

  /** @aiContributed-2026-01-24 */
    it('should return empty arrays for all categories if no scenarios are provided', () => {
    const adapter = new Q4TestJestAdapter();
    const scenarios: any[] = [];

    const result = (adapter as any).groupScenariosByCategory(scenarios);

    expect(result).toEqual({
      critical: [],
      logical: [],
      error: [],
      edge: [],
    });
  });

  /* it('should handle scenarios with unknown categories gracefully', () => {
        const adapter = new Q4TestJestAdapter();
        const scenarios = [
          { category: 'critical', name: 'Critical Test 1' },
          { category: 'unknown', name: 'Unknown Test 1' },
        ];

        const result = (adapter as any).groupScenariosByCategory(scenarios);

        expect(result).toEqual({
          critical: [{ category: 'critical', name: 'Critical Test 1' }],
          logical: [],
          error: [],
          edge: [],
          unknown: [{ category: 'unknown', name: 'Unknown Test 1' }],
        });
      }); */
});