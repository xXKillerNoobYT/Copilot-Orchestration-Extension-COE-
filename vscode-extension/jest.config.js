/**
 * Jest Configuration - VS Code Extension
 * Reference: https://jestjs.io/docs/configuration
 * 
 * Coverage targets: Relaxed due to mixed Mocha/Vitest/Jest test suite
 * Future goal: Consolidate on single test runner (Jest recommended)
 * 
 * Features:
 * - ts-jest transformer with TypeScript support
 * - VSCode mock for extension API testing
 * - Single worker for stability and isolation
 * - Open handles detection for memory leaks
 * - Force exit to prevent hanging processes
 * - Verbose logging for debugging
 * 
 * See: https://jestjs.io/docs/mock-functions for mocking strategies
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs',  // Override to CommonJS for Jest
        lib: ['ES2020', 'DOM'],
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        isolatedModules: true,
        types: ['node', 'jest'],  // Only Jest types, not Mocha
      },
      diagnostics: {
        warnOnly: true,
        ignoreCodes: [151002, 2403]  // 2403 = Subsequent variable declarations conflict
      }
    }]
  },

  /**
   * Coverage Collection
   * Reference: https://jestjs.io/docs/configuration#collectcoveragefrom-array
   * 
   * Patterns to include in coverage reports
   */
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  
  coverageDirectory: 'coverage/jest',
  
  /**
   * Multiple coverage reporters for analysis and CI/CD integration
   * See: https://jestjs.io/docs/configuration#coveragereporters-arraystring
   */
  coverageReporters: ['text', 'lcov', 'html'],
  
  /**
   * Mock for VSCode extension API
   * Reference: https://jestjs.io/docs/mock-functions#mocking-modules
   */
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
  },

  /**
   * Test Path Ignore Patterns
   * Reference: https://jestjs.io/docs/configuration#testpathignorepatterns-arraystring--string
   * 
   * Exclude tests from different runners (Mocha, Vitest) to prevent conflicts
   * Only Jest-compatible tests should run in this config
   */
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/out/',
    '\\.disabled\\.',
    // Exclude Mocha-based integration tests (they need mocha runtime, not Jest)
    'integration/',
    'extension\\.agentLoop\\.test\\.ts',
    // Exclude Vitest-specific test files (they import from 'vitest')
    '/src/__tests__/sample\\.test\\.ts',  // Vitest-based sample test
    'planBuilder/__tests__/integration',
    'planBuilder/__tests__/wizardStore\\.test\\.ts',
    'planBuilder/wizardContainer\\.test\\.ts',
    'planBuilder/questionFramework\\.test\\.ts',
    'planBuilder/planMetadata\\.test\\.ts',
    'planBuilder/planGenerator\\.test\\.ts',
    'planBuilder/planIntegration\\.test\\.ts',
    'planBuilder/livePreview\\.test\\.ts',
    'planBuilder/designHandoff\\.test\\.ts',
    'planBuilder/aiAssistanceService\\.test\\.ts',
    'services/planPersistence\\.test\\.ts',
    'copilotDispatcher\\.test\\.ts',
    'panels/visualVerificationPanel\\.test\\.ts',
    'panels/planAdjustmentWizard\\.test\\.ts',
    'panels/orchestratorPanel\\.test\\.ts',
    'panels/auditDashboardPanel\\.test\\.ts',
    'llm/promptCache\\.test\\.ts',
    // Exclude Mocha/assert-based tests
    'planBuilder/designSystem/validator\\.test\\.ts',
    'planBuilder/designSystem/tokenGenerator\\.test\\.ts',
  ],

  /**
   * Coverage Thresholds
   * Reference: https://jestjs.io/docs/configuration#coveragethreshold-object
   * 
   * NOTE: Relaxed thresholds for vscode-extension due to mixed test runners
   * When all tests are migrated to Jest, increase to: 
   *   branches: 90, functions: 95, lines: 95, statements: 95
   */
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  /**
   * Test Timeout Configuration
   * See: https://jestjs.io/docs/configuration#testtimeout-number
   * 
   * VS Code extension tests may need more time due to I/O operations
   */
  testTimeout: 30000,

  /**
   * Worker Configuration for Test Isolation
   * Reference: https://jestjs.io/docs/configuration#maxworkers-number--string
   * 
   * Use single worker to:
   * - Prevent race conditions with file system
   * - Isolate VSCode extension state
   * - Make tests more deterministic
   * - Catch state pollution issues
   * 
   * See: https://jestjs.io/docs/setup-teardown for state management
   */
  maxWorkers: 1,
  
  workerIdleMemoryLimit: '512MB',

  /**
   * Stability Improvements
   * Reference: https://jestjs.io/docs/troubleshooting
   */
  
  // Force exit after tests - prevents hanging from unclosed handles
  forceExit: true,

  // Detect unclosed file handles and network connections
  // See: https://jestjs.io/docs/configuration#detectopenhandles-boolean
  detectOpenHandles: true,

  // Continue running all tests even if some fail
  bail: false,

  // Clear mocks between tests
  // Reference: https://jestjs.io/docs/configuration#clearmocksbeforeeachtest-boolean
  clearMocks: true,

  // Restore mocks to original state after each test
  restoreMocks: true,

  /**
   * Logging
   * See: https://jestjs.io/docs/configuration#verbose-boolean
   */
  verbose: true,

  /**
   * Custom Reporter for Problems Integration
   * Reports skipped and failing tests so they appear in VS Code Problems panel
   */
  reporters: ['default', '<rootDir>/jest-problems-reporter.js'],
};


