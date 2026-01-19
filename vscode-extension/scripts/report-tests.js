#!/usr/bin/env node

/**
 * Parse Jest test results and output them in VS Code Problems format
 * Processes test-results.json to show failures and skipped tests in Problems panel
 * 
 * Usage: npm run report:tests
 */

const fs = require('fs');
const path = require('path');

const resultsFile = path.join(path.dirname(__dirname), 'test-results.json');

if (!fs.existsSync(resultsFile)) {
    console.error(`❌ Test results file not found: ${resultsFile}`);
    console.error('Run: npm run test:jest -- --json --outputFile=test-results.json');
    process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

let problemCount = 0;

// Report test suite failures
if (results.testResults) {
    for (const suite of results.testResults) {
        const fileName = path.relative(process.cwd(), suite.name);

        // Report individual test failures
        if (suite.assertionResults) {
            for (const test of suite.assertionResults) {
                if (test.status === 'failed') {
                    console.error(
                        `${fileName}:${test.location?.line || 1}:1 - ` +
                        `error: ❌ FAILING TEST: ${test.fullName}`
                    );
                    if (test.failureMessages && test.failureMessages.length > 0) {
                        console.error(`  ${test.failureMessages[0].split('\n')[0]}`);
                    }
                    problemCount++;
                }

                if (test.status === 'pending') {
                    console.warn(
                        `${fileName}:${test.location?.line || 1}:1 - ` +
                        `warning: ⏭️  SKIPPED TEST: ${test.fullName}`
                    );
                    console.warn(`  Skipped tests must be documented with issue link and timeline`);
                    problemCount++;
                }
            }
        }
    }
}

// Summary
console.log('');
if (problemCount > 0) {
    console.error(`Found ${problemCount} test issue(s)`);
    process.exit(1);
} else {
    console.log('✅ All tests passing with no skips');
}

