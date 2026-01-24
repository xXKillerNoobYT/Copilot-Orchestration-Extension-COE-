// ./Q4TestJestAdapter.web.spec.ts
import { Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter.ts';

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - getDiagnostics', () => {
  /** @aiContributed-2026-01-24 */
    it('should return the metadata map', () => {
    const mockMetadata = new Map<string, GeneratedTestMetadata>([
      ['test1', { name: 'Test 1', description: 'Description 1' }],
      ['test2', { name: 'Test 2', description: 'Description 2' }],
    ]);

    const adapter = new Q4TestJestAdapter('.q4testrc.json') as any;
    adapter.metadata = mockMetadata;

    const result = adapter.getDiagnostics();
    expect(result).toEqual(mockMetadata);
  });
});