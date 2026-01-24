// ./Q4TestJestAdapter.web.spec.ts
import { Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter.ts';

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - getRelativeImportPath', () => {
  let adapter: any;

  beforeEach(() => {
    adapter = new Q4TestJestAdapter();
  });

  /** @aiContributed-2026-01-24 */
    it('should return a relative path starting with "./" for a file in the same directory', () => {
    const result = adapter.getRelativeImportPath('file.ts');
    expect(result).toBe('./file');
  });

  /** @aiContributed-2026-01-24 */
    it('should return a relative path starting with "../" for a file in a parent directory', () => {
    const result = adapter.getRelativeImportPath('../path/to/file.ts');
    expect(result).toBe('../path/to/file');
  });

  /** @aiContributed-2026-01-24 */
    it('should normalize backslashes to forward slashes', () => {
    const result = adapter.getRelativeImportPath('C:\\path\\to\\file.ts');
    expect(result).toBe('./C:/path/to/file');
  });

  /** @aiContributed-2026-01-24 */
    it('should remove the .ts extension from the file path', () => {
    const result = adapter.getRelativeImportPath('./path/to/file.ts');
    expect(result).toBe('././path/to/file');
  });

  /** @aiContributed-2026-01-24 */
    it('should handle paths without "../" or "./" correctly', () => {
    const result = adapter.getRelativeImportPath('path/to/file.ts');
    expect(result).toBe('./path/to/file');
  });
});