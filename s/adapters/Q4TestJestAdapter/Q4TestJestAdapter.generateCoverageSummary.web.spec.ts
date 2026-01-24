// ./Q4TestJestAdapter.web.spec.ts
import { Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter.ts';

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - generateCoverageSummary', () => {
  let adapter: Q4TestJestAdapter;

  beforeEach(() => {
    adapter = new Q4TestJestAdapter();
  });

  /** @aiContributed-2026-01-24 */
    it('should return a summary with no test suites when metadata is empty', () => {
    (adapter as any).metadata = new Map();

    const result = adapter.generateCoverageSummary();

    expect(result).toBe(
      '# Q4Test Generated Test Coverage Summary\n\nGenerated 0 test suites\n\n'
    );
  });

  /** @aiContributed-2026-01-24 */
    it('should return a summary with test suites and average coverage', () => {
    (adapter as any).metadata = new Map([
      [
        'file1.ts',
        {
          sourceFile: 'file1.ts',
          estimatedCoverage: 80,
          scenarios: [{}, {}, {}],
        },
      ],
      [
        'file2.ts',
        {
          sourceFile: 'file2.ts',
          estimatedCoverage: 60,
          scenarios: [{}, {}],
        },
      ],
    ]);

    const result = adapter.generateCoverageSummary();

    expect(result).toBe(
      '# Q4Test Generated Test Coverage Summary\n\n' +
        'Generated 2 test suites\n\n' +
        '- file1.ts: 80% (3 scenarios)\n' +
        '- file2.ts: 60% (2 scenarios)\n\n' +
        '**Average Estimated Coverage: 70%**\n'
    );
  });

  /** @aiContributed-2026-01-24 */
    it('should handle rounding of average coverage correctly', () => {
    (adapter as any).metadata = new Map([
      [
        'file1.ts',
        {
          sourceFile: 'file1.ts',
          estimatedCoverage: 75,
          scenarios: [{}],
        },
      ],
      [
        'file2.ts',
        {
          sourceFile: 'file2.ts',
          estimatedCoverage: 76,
          scenarios: [{}],
        },
      ],
    ]);

    const result = adapter.generateCoverageSummary();

    expect(result).toBe(
      '# Q4Test Generated Test Coverage Summary\n\n' +
        'Generated 2 test suites\n\n' +
        '- file1.ts: 75% (1 scenarios)\n' +
        '- file2.ts: 76% (1 scenarios)\n\n' +
        '**Average Estimated Coverage: 76%**\n'
    );
  });
});