// ./Q4TestJestAdapter.web.spec.ts
import { Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter.ts';

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - trackGeneration', () => {
  let adapter: Q4TestJestAdapter;
  const mockEstimateCoverage = jest.fn();
  const mockDate = new Date('2023-01-01T00:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(mockDate);
  });

  beforeEach(() => {
    adapter = new Q4TestJestAdapter('.q4testrc.json') as any;
    adapter['estimateCoverage'] = mockEstimateCoverage;
    adapter['metadata'] = new Map();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  /** @aiContributed-2026-01-24 */
    it('should correctly track generation metadata', () => {
    const sourceFile = 'src/example.ts';
    const scenarios = [{ id: '1', description: 'Test scenario 1' }];
    const q4testVersion = '2.0.0';
    const jestVersion = '29.5.0';
    const estimatedCoverage = 85;

    mockEstimateCoverage.mockReturnValue(estimatedCoverage);

    adapter.trackGeneration(sourceFile, scenarios, q4testVersion, jestVersion);

    const metadata = adapter['metadata'].get(sourceFile);

    expect(metadata).toEqual({
      sourceFile,
      generatedAt: mockDate,
      scenarios,
      q4testVersion,
      jestVersion,
      estimatedCoverage,
    });
    expect(mockEstimateCoverage).toHaveBeenCalledWith(scenarios);
  });
});