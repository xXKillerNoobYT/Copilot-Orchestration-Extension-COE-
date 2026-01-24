// ./Q4TestJestAdapter.web.spec.ts
import { default as Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter.ts';

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - getRelativeImportPath', () => {
  let adapter: any;

  beforeEach(() => {
    adapter = new Q4TestJestAdapter();
  });

  /** @aiContributed-2026-01-24 */
    it('should convert Windows-style paths to relative import paths', () => {
    const result = adapter.getRelativeImportPath('C:\\path\\to\\file.ts');
    expect(result).toBe('./C:/path/to/file');
  });

  /** @aiContributed-2026-01-24 */
    it('should remove the .ts extension from the path', () => {
    const result = adapter.getRelativeImportPath('/path/to/file.ts');
    expect(result).toBe('.//path/to/file');
  });

  /** @aiContributed-2026-01-24 */
    it('should prepend "./" if the path does not start with "../"', () => {
    const result = adapter.getRelativeImportPath('path/to/file.ts');
    expect(result).toBe('./path/to/file');
  });

  /** @aiContributed-2026-01-24 */
    it('should not modify paths that already start with "../"', () => {
    const result = adapter.getRelativeImportPath('../path/to/file.ts');
    expect(result).toBe('../path/to/file');
  });

  /** @aiContributed-2026-01-24 */
    it('should handle paths with mixed slashes correctly', () => {
    const result = adapter.getRelativeImportPath('C:/path\\to\\file.ts');
    expect(result).toBe('./C:/path/to/file');
  });
});