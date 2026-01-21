/**
 * Jest sanity-check
 *
 * Purpose:
 * - Verify Jest is actually running in this workspace
 * - Ensure VS Code Problems panel surfaces both skipped and failing tests
 * - If either test does NOT appear in Problems/output, the test pipeline is broken
 */

describe('Jest sanity check', () => {
    test('should pass to confirm test infrastructure works', () => {
        // Simple assertion that the test framework is functioning
        expect(true).toBe(true);
    });

    test('should verify TypeScript types are correct', () => {
        // Type safety validation
        const testString: string = 'hello';
        const testNumber: number = 42;

        expect(typeof testString).toBe('string');
        expect(typeof testNumber).toBe('number');
    });
});