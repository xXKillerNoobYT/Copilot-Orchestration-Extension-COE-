/**
 * Q4Test Jest Configuration Adapter
 * 
 * This configuration bridges Q4Test (AI Test Generator) with Jest test runner.
 * Q4Test generates tests using Jest syntax while respecting your existing Jest setup.
 * 
 * Reference: .q4testrc.json for Q4Test settings
 * Reference: jest.config.js for base Jest configuration
 */

/** @type {import('jest').Config} */
module.exports = {
    displayName: 'q4test-generated',
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],

    // Match generated test files with Q4TEST_GEN_ prefix
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/?(*.)+(spec|test).ts',
        '**/Q4TEST_GEN_*.test.ts'
    ],

    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    // TypeScript transform with Q4Test compatibility
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                target: 'ES2020',
                module: 'commonjs',
                lib: ['ES2020', 'DOM'],
                moduleResolution: 'node',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                resolveJsonModule: true,
                skipLibCheck: true,
                isolatedModules: true,
                types: ['node', 'jest'],
                declaration: true,
                declarationMap: true,
                sourceMap: true
            },
            diagnostics: {
                warnOnly: true,
                ignoreCodes: [151002, 2403]
            },
            isolatedModules: true
        }]
    },

    // VSCode API mocking for generated tests
    moduleNameMapper: {
        '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },

    // Collection of generated test coverage
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.ts',
        '!src/**/__tests__/**',
        '!src/**/__mocks__/**'
    ],

    coverageDirectory: 'coverage/q4test',
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

    // Coverage thresholds for generated tests
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    },

    // Setup files for test environment
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    // Timeouts for Q4Test generation scenarios
    testTimeout: 30000,

    // Single worker for generated tests to prevent race conditions
    maxWorkers: 1,

    // Detect unclosed handles in generated tests
    detectOpenHandles: true,

    // Verbose output for debugging Q4Test generation
    verbose: true,

    // Force exit to clean up after generated tests
    forceExit: true,

    // No pass with no tests for Q4Test validation
    passWithNoTests: false,
};
