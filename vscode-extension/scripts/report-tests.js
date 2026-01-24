#!/usr/bin/env node

/**
 * Parse Jest test results and output them in VS Code Problems format
 * Processes test-results.json to show failures and skipped tests in Problems panel
 * 
 * VS Code Problems format:
 * file(line,col): severity: message
 * OR
 * file:line:col - severity: message
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

let results;
try {
    results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
} catch (error) {
    console.error(`❌ Failed to parse test results: ${error.message}`);
    process.exit(1);
}

let problemCount = 0;
let failureCount = 0;
let skipCount = 0;

// Report test suite failures
if (results.testResults) {
    for (const suite of results.testResults) {
        const fileName = path.relative(process.cwd(), suite.name);

        // Report individual test failures
        if (suite.assertionResults) {
            for (const test of suite.assertionResults) {
                const line = test.location?.line || 1;
                const col = test.location?.column || 1;

                if (test.status === 'failed') {
                    // VS Code recognizes this format: file(line,col): severity: message
                    console.error(`${fileName}(${line},${col}): error: ❌ ${test.fullName}`);

                    // Extract and clean up error message
                    if (test.failureMessages && test.failureMessages.length > 0) {
                        const errorMsg = test.failureMessages[0]
                            .split('\n')[0]
                            .replace(/\u001b\[.*?m/g, '') // Remove ANSI color codes
                            .substring(0, 200); // Limit length
                        console.error(`  ${errorMsg}`);
                    }
                    failureCount++;
                    problemCount++;
                }

                if (test.status === 'pending' || test.status === 'todo') {
                    // Format for warnings
                    console.warn(`${fileName}(${line},${col}): warning: ⏭️  ${test.fullName} (skipped)`);
                    console.warn(`  Skipped tests must be documented with issue link and timeline`);
                    skipCount++;
                    problemCount++;
                }
            }
        }
    }
}

// Summary
console.log('');
console.log('='.repeat(60));
if (problemCount > 0) {
    console.error(`Found ${failureCount} failing test(s) and ${skipCount} skipped test(s)`);
    console.error(`Total: ${problemCount} test issue(s)`);
    console.log('='.repeat(60));
    process.exit(1);
} else {
    console.log('✅ All tests passing with no skips');
    console.log('='.repeat(60));
}

