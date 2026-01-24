/**
 * VS Code Diagnostic Reporter for Jest Tests
 * 
 * This script creates VS Code-compatible diagnostic messages for test failures and skips.
 * Diagnostics appear in the Problems panel and can be accessed via get_errors.
 */

const fs = require('fs');
const path = require('path');

const resultsFile = path.join(__dirname, '..', 'test-results.json');

if (!fs.existsSync(resultsFile)) {
    console.error(`Test results file not found: ${resultsFile}`);
    process.exit(0); // Exit gracefully if no results yet
}

const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
const diagnostics = [];

// Parse test results into VS Code diagnostic format
if (results.testResults) {
    for (const suite of results.testResults) {
        const filePath = suite.name;

        if (suite.assertionResults) {
            for (const test of suite.assertionResults) {
                if (test.status === 'failed') {
                    diagnostics.push({
                        file: filePath,
                        line: test.location?.line || 1,
                        column: 1,
                        severity: 'error',
                        message: `❌ FAILING TEST: ${test.fullName}`,
                        detail: test.failureMessages?.[0]?.split('\n')[0] || 'Test failed'
                    });
                }

                if (test.status === 'pending') {
                    diagnostics.push({
                        file: filePath,
                        line: test.location?.line || 1,
                        column: 1,
                        severity: 'warning',
                        message: `⏭️  SKIPPED TEST: ${test.fullName}`,
                        detail: 'Skipped tests must be documented with GitHub issue and timeline'
                    });
                }
            }
        }
    }
}

// Output in VS Code diagnostic format (stderr for problems)
for (const diag of diagnostics) {
    if (diag.severity === 'error') {
        console.error(
            `${diag.file}:${diag.line}:${diag.column}: error ${diag.message}`
        );
    } else {
        console.warn(
            `${diag.file}:${diag.line}:${diag.column}: warning ${diag.message}`
        );
    }
}

// Also write to a file that VS Code can read
const diagnosticsPath = path.join(__dirname, '..', '.vscode-diagnostics.json');
fs.writeFileSync(diagnosticsPath, JSON.stringify(diagnostics, null, 2));

process.exit(diagnostics.some(d => d.severity === 'error') ? 1 : 0);
