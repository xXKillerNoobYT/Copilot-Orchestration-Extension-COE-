/**
 * Custom Jest Reporter for VS Code Problems Integration
 * 
 * This reporter ensures that skipped tests and failures are reported
 * in a format that VS Code can pick up and display in the Problems panel.
 * 
 * Reference: https://jestjs.io/docs/reporters
 */

class SkipAndFailureReporter {
    constructor(globalConfig, options) {
        this.globalConfig = globalConfig;
        this.options = options;
    }

    onTestResult(test, testResult, aggregatedResult) {
        // Report failures
        if (testResult.failureMessage) {
            console.error(`[TEST FAILURE] ${testResult.testFilePath}`);
            console.error(testResult.failureMessage);
        }

        // Report skipped tests as problems
        if (testResult.testResults) {
            const skippedTests = testResult.testResults.filter(
                (result) => result.status === 'skipped'
            );

            for (const skipped of skippedTests) {
                console.warn(
                    `[TEST SKIPPED] ${testResult.testFilePath}:${skipped.title}`
                );
                console.warn(
                    `This test is skipped. Skipped tests should be documented with ` +
                    `an issue link and timeline. Mark it with: ${skipped.fullName}`
                );
            }
        }
    }

    onRunComplete(contexts, results) {
        // Summary of skipped tests
        if (results.numTotalTests > 0) {
            const numSkipped = results.numTotalTests - results.numPassedTests - results.numFailedTests;
            if (numSkipped > 0) {
                console.warn(
                    `\n⏭️  SKIPPED TESTS DETECTED: ${numSkipped} test(s) skipped\n` +
                    `Skipped tests must be documented in the test file with:\n` +
                    `  - Reason for skip\n` +
                    `  - GitHub issue number\n` +
                    `  - Expected timeline for fix\n`
                );
            }

            if (results.numFailedTests > 0) {
                console.error(
                    `\n❌ FAILING TESTS DETECTED: ${results.numFailedTests} test(s) failed\n` +
                    `Failing tests block PR approval and must be fixed immediately.\n`
                );
            }
        }
    }
}

module.exports = SkipAndFailureReporter;
