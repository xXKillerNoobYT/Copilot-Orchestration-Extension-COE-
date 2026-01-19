/**
 * Jest sanity-check
 *
 * Purpose:
 * - Verify Jest is actually running in this workspace
 * - Ensure VS Code Problems panel surfaces both skipped and failing tests
 * - If either test does NOT appear in Problems/output, the test pipeline is broken
 */

describe('Jest sanity check', () => {
    test.skip('should appear as a skipped test in Problems', () => {
        // This is intentionally skipped. If you do NOT see a skipped-test entry
        // in the VS Code Problems panel or Jest output, the test runner plumbing
        // is not reporting skips correctly.
    });

    test('should fail intentionally to prove failure reporting works', () => {
        const pipelineIsReportingFailures = false;

        // If this does not surface as a failing test in Problems/Jest output,
        // the test pipeline or VS Code integration is broken and needs attention.
        expect(pipelineIsReportingFailures).toBe(true);
    });
});