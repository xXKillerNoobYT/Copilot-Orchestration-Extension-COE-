#!/usr/bin/env node

/**
 * Q4Test Jest Validation Script
 * 
 * Validates generated Q4Test files for Jest compatibility
 * Checks for:
 * - Proper Jest syntax (describe, it, expect)
 * - TypeScript compliance
 * - Mock configuration
 * - Import paths
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = '.q4testrc.json';

/**
 * Recursively find files matching pattern
 */
function findFiles(dir, pattern, files = []) {
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip node_modules, dist, out directories
            if (!['node_modules', 'dist', 'out', '.git'].includes(entry.name)) {
                findFiles(fullPath, pattern, files);
            }
        } else if (entry.isFile() && entry.name.match(pattern)) {
            files.push(fullPath);
        }
    }

    return files;
}

function loadConfig() {
    const configContent = fs.readFileSync(
        path.resolve(CONFIG_PATH),
        'utf-8'
    );
    return JSON.parse(configContent);
}

function validateTestFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const errors = [];
    const warnings = [];

    // Check: Jest imports
    const hasJestImports = /import\s+{.*describe.*}/.test(content) ||
        /import\s+{.*it.*}/.test(content) ||
        content.includes('describe(');

    if (!hasJestImports) {
        errors.push('Missing Jest imports or describe block');
    }

    // Check: describe blocks
    if (!content.includes('describe(')) {
        errors.push('Missing describe() block - required for Jest');
    }

    // Check: test cases
    const testCount = (content.match(/it\(/g) || []).length +
        (content.match(/test\(/g) || []).length;

    if (testCount === 0) {
        warnings.push('No test cases found (0 it/test blocks)');
    }

    // Check: assertions
    const assertionCount = (content.match(/expect\(/g) || []).length;

    if (assertionCount === 0) {
        warnings.push(`No assertions found in ${testCount} test case(s)`);
    } else if (assertionCount < testCount) {
        warnings.push(
            `Found ${testCount} test case(s) but only ${assertionCount} assertion(s) - incomplete tests?`
        );
    }

    // Check: VSCode mocks
    const mockCount = (content.match(/jest\.mock\(/g) || []).length;

    if (mockCount === 0) {
        warnings.push('No jest.mock() calls - ensure external APIs are properly mocked');
    }

    // Check: TypeScript types
    const typeAnnotations = (content.match(/:\s*[A-Z]/g) || []).length +
        (content.match(/<[A-Z]/g) || []).length;

    if (typeAnnotations === 0) {
        warnings.push('Few type annotations - consider adding for better type safety');
    }

    // Check: File naming convention
    const fileName = path.basename(filePath);
    const config = loadConfig();

    if (!fileName.includes(config.generatedTestPrefix) && !fileName.endsWith('.test.ts')) {
        warnings.push(`File doesn't follow naming convention: ${fileName}`);
    }

    return { errors, warnings, testCount, assertionCount, mockCount };
}

function main() {
    const config = loadConfig();
    const testDir = config.testDirectory || './src';
    const prefix = config.generatedTestPrefix || 'Q4TEST_GEN_';

    console.log('🔍 Validating Q4Test Generated Files...\n');
    console.log(`Configuration: ${CONFIG_PATH}`);
    console.log(`Test Directory: ${testDir}`);
    console.log(`Test Prefix: ${prefix}`);
    console.log(`Framework: ${config.testFramework}\n`);

    // Find files matching Q4TEST_GEN_*.test.ts pattern
    const pattern = new RegExp(`${prefix}.*\\.test\\.ts$`);
    const files = findFiles(testDir, pattern);

    if (files.length === 0) {
        console.log('⚠️  No generated test files found.\n');
        console.log(`Looking for files matching: ${prefix}*.test.ts in ${testDir}\n`);
        process.exit(0);
    }

    console.log(`Found ${files.length} generated test file(s):\n`);

    let totalErrors = 0;
    let totalWarnings = 0;
    let totalTests = 0;
    let totalAssertions = 0;

    for (const file of files) {
        const validation = validateTestFile(file);
        const fileName = path.relative(process.cwd(), file);

        console.log(`📄 ${fileName}`);

        if (validation.errors.length > 0) {
            totalErrors += validation.errors.length;
            validation.errors.forEach(err => {
                console.log(`   ❌ ${err}`);
            });
        }

        if (validation.warnings.length > 0) {
            totalWarnings += validation.warnings.length;
            validation.warnings.forEach(warn => {
                console.log(`   ⚠️  ${warn}`);
            });
        }

        totalTests += validation.testCount;
        totalAssertions += validation.assertionCount;

        if (validation.errors.length === 0 && validation.warnings.length === 0) {
            console.log(`   ✅ Valid (${validation.testCount} tests, ${validation.assertionCount} assertions)`);
        }

        console.log();
    }

    console.log('📊 Summary:');
    console.log(`   Total Files: ${files.length}`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Total Assertions: ${totalAssertions}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Warnings: ${totalWarnings}\n`);

    if (totalErrors > 0) {
        console.log(`❌ Validation failed with ${totalErrors} error(s)`);
        process.exit(1);
    } else if (totalWarnings > 0) {
        console.log(`⚠️  Validation passed with ${totalWarnings} warning(s)`);
        process.exit(0);
    } else {
        console.log('✅ All generated tests validated successfully!');
        process.exit(0);
    }
}

main();
