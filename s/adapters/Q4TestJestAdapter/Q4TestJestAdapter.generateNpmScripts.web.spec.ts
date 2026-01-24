// ./Q4TestJestAdapter.web.spec.ts
import { Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter';

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - generateNpmScripts', () => {
  let adapter: Q4TestJestAdapter;

  beforeEach(() => {
    adapter = new Q4TestJestAdapter();
  });

  /** @aiContributed-2026-01-24 */
    it('should return the correct npm scripts', () => {
    const expectedScripts = {
      'test:q4test': 'jest --config jest-q4test.config.js',
      'test:q4test:watch': 'jest --config jest-q4test.config.js --watch',
      'test:q4test:coverage': 'jest --config jest-q4test.config.js --coverage',
      'test:q4test:debug': 'node --inspect-brk ./node_modules/jest/bin/jest.js --config jest-q4test.config.js',
      'q4test:validate': 'node scripts/validate-q4test.js',
      'q4test:merge-coverage': 'node scripts/merge-coverage.js',
    };

    const result = adapter.generateNpmScripts();

    expect(result).toEqual(expectedScripts);
  });
});