#!/usr/bin/env node

/**
 * Q4Test Coverage Merge Script
 * 
 * Merges coverage reports from:
 * 1. Hand-written Jest tests (coverage/jest)
 * 2. Q4Test generated tests (coverage/q4test)
 * 
 * Produces combined coverage report in coverage/combined
 */

const fs = require('fs');
const path = require('path');

function loadCoverageReport(dir, name) {
    const reportPath = path.join(dir, 'coverage-final.json');

    if (!fs.existsSync(reportPath)) {
        console.warn(`⚠️  Coverage report not found: ${reportPath}`);
        return {};
    }

    const content = fs.readFileSync(reportPath, 'utf-8');
    console.log(`✅ Loaded ${name} coverage from ${reportPath}`);
    return JSON.parse(content);
}

function mergeCoverage(jestCoverage, q4testCoverage) {
    const merged = { ...jestCoverage };

    for (const [file, q4data] of Object.entries(q4testCoverage)) {
        if (merged[file]) {
            // File exists in both - merge line/branch/function coverage
            const jestData = merged[file];

            // Merge line coverage
            if (jestData.l && q4data.l) {
                for (const [line, count] of Object.entries(q4data.l)) {
                    if (jestData.l[line]) {
                        jestData.l[line] = Math.max(jestData.l[line], count);
                    } else {
                        jestData.l[line] = count;
                    }
                }
            }

            // Merge branch coverage
            if (jestData.b && q4data.b) {
                for (const [branch, counts] of Object.entries(q4data.b)) {
                    if (!jestData.b[branch]) {
                        jestData.b[branch] = counts;
                    }
                }
            }

            // Merge function coverage
            if (jestData.f && q4data.f) {
                for (const [func, count] of Object.entries(q4data.f)) {
                    if (jestData.f[func]) {
                        jestData.f[func] = Math.max(jestData.f[func], count);
                    } else {
                        jestData.f[func] = count;
                    }
                }
            }
        } else {
            // New file from Q4Test
            merged[file] = q4data;
        }
    }

    return merged;
}

function calculateMetrics(coverage) {
    let stmts = 0, stmtsCovered = 0;
    let lines = 0, linesCovered = 0;
    let fns = 0, fnsCovered = 0;
    let branches = 0, branchesCovered = 0;

    for (const fileData of Object.values(coverage)) {
        // Statements
        if (fileData.s) {
            for (const count of Object.values(fileData.s)) {
                stmts++;
                if (count > 0) stmtsCovered++;
            }
        }

        // Lines
        if (fileData.l) {
            for (const count of Object.values(fileData.l)) {
                lines++;
                if (count > 0) linesCovered++;
            }
        }

        // Functions
        if (fileData.f) {
            for (const count of Object.values(fileData.f)) {
                fns++;
                if (count > 0) fnsCovered++;
            }
        }

        // Branches
        if (fileData.b) {
            for (const counts of Object.values(fileData.b)) {
                if (Array.isArray(counts)) {
                    branches += counts.length;
                    branchesCovered += counts.filter(c => c > 0).length;
                }
            }
        }
    }

    return {
        statements: stmts > 0 ? Math.round((stmtsCovered / stmts) * 100) : 0,
        lines: lines > 0 ? Math.round((linesCovered / lines) * 100) : 0,
        functions: fns > 0 ? Math.round((fnsCovered / fns) * 100) : 0,
        branches: branches > 0 ? Math.round((branchesCovered / branches) * 100) : 0,
    };
}

function main() {
    console.log('📊 Merging Q4Test Coverage Reports\n');

    const jestCoverageDir = 'coverage/jest';
    const q4testCoverageDir = 'coverage/q4test';
    const combinedCoverageDir = 'coverage/combined';

    // Load coverage reports
    const jestCoverage = loadCoverageReport(jestCoverageDir, 'Jest');
    const q4testCoverage = loadCoverageReport(q4testCoverageDir, 'Q4Test');

    // Merge coverage
    const mergedCoverage = mergeCoverage(jestCoverage, q4testCoverage);

    // Calculate metrics
    const metrics = calculateMetrics(mergedCoverage);

    // Create output directory
    if (!fs.existsSync(combinedCoverageDir)) {
        fs.mkdirSync(combinedCoverageDir, { recursive: true });
    }

    // Write merged coverage
    fs.writeFileSync(
        path.join(combinedCoverageDir, 'coverage-final.json'),
        JSON.stringify(mergedCoverage, null, 2)
    );

    console.log('\n📈 Merged Coverage Metrics:');
    console.log(`   Statements: ${metrics.statements}%`);
    console.log(`   Lines: ${metrics.lines}%`);
    console.log(`   Functions: ${metrics.functions}%`);
    console.log(`   Branches: ${metrics.branches}%\n`);

    console.log(`✅ Merged coverage written to ${combinedCoverageDir}/coverage-final.json\n`);
}

main();
