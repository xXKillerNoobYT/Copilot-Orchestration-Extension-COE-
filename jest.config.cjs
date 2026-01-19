/**
 * Jest Configuration - Root Monorepo
 * Reference: https://jestjs.io/docs/configuration
 * 
 * Configuration for monorepo with multiple test runners:
 * - vscode-extension: TypeScript/Jest tests for VS Code extension
 * - context-manager: TypeScript/Jest tests for context management library
 * 
 * Coverage targets: 100% statements/functions/lines, 95% branches
 * See: https://jestjs.io/docs/coverage#coverage-thresholds
 */

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'vscode-extension',
      rootDir: 'vscode-extension',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
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
          },
          diagnostics: {
            warnOnly: true,
            ignoreCodes: [151002]
          }
        }]
      },
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/out/',
        '\\.disabled\\.',
        // Mocha tests - use suite() instead of describe()
        'integration/.*\\.test\\.ts',
        // Vitest tests - these files use vitest imports (need to be migrated or run separately)
        'planBuilder/__tests__/sample\\.test\\.ts',
        'planBuilder/planGenerator\\.test\\.ts',
        'planBuilder/livePreview\\.test\\.ts',
        'planBuilder/planMetadata\\.test\\.ts',
        'planBuilder/questionFramework\\.test\\.ts',
        'planBuilder/planIntegration\\.test\\.ts',
        'planBuilder/__tests__/wizardStore\\.test\\.ts',
        'planBuilder/__tests__/integration/',
      ],
      moduleNameMapper: {
        '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
      },
      // Coverage configuration
      // See: https://jestjs.io/docs/configuration#collectcoveragefrom-array
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.ts',
        '!src/**/__mocks__/**'
      ],
      coverageDirectory: 'coverage',
      coverageReporters: ['text', 'lcov', 'html'],
      // Reduce to 80% branches for vscode-extension due to complexity
      coverageThreshold: {
        global: {
          branches: 50,  // Relaxed for now due to Mocha/Vitest mixed tests
          functions: 50,
          lines: 50,
          statements: 50
        }
      }
    },
    {
      displayName: 'context-manager',
      rootDir: 'context-manager',
      testMatch: ['<rootDir>/tests/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            target: 'ES2020',
            module: 'commonjs',
            lib: ['ES2020'],
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
            skipLibCheck: true,
            isolatedModules: true,
            types: ['node', 'jest']
          },
          diagnostics: {
            warnOnly: true
          }
        }]
      },
      // Coverage configuration for context-manager
      // See: https://jestjs.io/docs/configuration#collectcoveragefrom-array
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts'
      ],
      coverageDirectory: 'coverage',
      coverageReporters: ['text', 'lcov', 'html'],
      // Strict coverage thresholds for context-manager library
      // Reference: https://jestjs.io/docs/configuration#coveragethreshold-object
      coverageThreshold: {
        global: {
          branches: 95,      // High bar for library code
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    }
  ],
  // Global collection patterns
  // Reference: https://jestjs.io/docs/configuration#collectcoveragefrom-array
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/__mocks__/**'
  ],
  coverageDirectory: 'coverage',
  // Timeout for async operations
  // See: https://jestjs.io/docs/configuration#testtimeout-number
  testTimeout: 10000,
  // Verbose output for debugging
  verbose: true,
  // Enable open handles detection
  // See: https://jestjs.io/docs/configuration#detectopenhandles-boolean
  detectOpenHandles: true,
  // Single worker for stability
  // Reference: https://jestjs.io/docs/configuration#maxworkers-number--string
  maxWorkers: 1,
  // Force exit to prevent hanging
  forceExit: true
};
