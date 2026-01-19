/**
 * Jest Configuration - Context Manager Library
 * Reference: https://jestjs.io/docs/configuration
 * 
 * Strict coverage requirements for library code (100% statements/functions/lines, 95% branches)
 * See: https://jestjs.io/docs/coverage#coverage-thresholds
 * 
 * Features:
 * - ts-jest transformer for TypeScript support
 * - Isolated test environment (node)
 * - Coverage reporting in multiple formats (text, lcov, html)
 * - Verbose output for debugging
 * - Open handles detection to prevent memory leaks
 * - Single worker for test isolation
 * - Force exit to prevent hanging processes
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
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

  // Coverage collection
  // Reference: https://jestjs.io/docs/configuration#collectcoveragefrom-array
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],

  coverageDirectory: 'coverage',

  // Multiple coverage reporters for different use cases
  // See: https://jestjs.io/docs/configuration#coveragereporters-arraystring
  coverageReporters: [
    'text',      // Console output
    'text-summary',
    'lcov',      // For coverage tools integration
    'html'       // Interactive HTML report
  ],

  /**
   * Coverage Thresholds
   * Reference: https://jestjs.io/docs/configuration#coveragethreshold-object
   * 
   * Enforces minimum coverage requirements:
   * - statements: 90% - Most production code executed
   * - functions: 90% - Most functions called
   * - lines: 90% - Most source lines executed  
   * - branches: 85% - Allow some edge case branches
   * 
   * Helps maintain code quality and catch untested paths while remaining realistic
   * for complex library code with cache eviction and error handling branches
   */
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Test timeout (ms)
  // See: https://jestjs.io/docs/configuration#testtimeout-number
  testTimeout: 10000,

  // Verbose output for debugging
  // Reference: https://jestjs.io/docs/configuration#verbose-boolean
  verbose: true,

  // Detect open handles to prevent memory leaks
  // See: https://jestjs.io/docs/configuration#detectopenhandles-boolean
  detectOpenHandles: true,

  // Worker configuration for test isolation
  // Reference: https://jestjs.io/docs/configuration#maxworkers-number--string
  // Use single worker to prevent race conditions and shared state
  maxWorkers: 1,

  // Memory limit per worker
  workerIdleMemoryLimit: '512MB',

  // Force exit after tests complete
  // Prevents hanging processes due to unclosed file handles
  forceExit: true,

  // Don't bail on first failure - run all tests to get full picture
  bail: false,

  // Clear mocks between tests
  // See: https://jestjs.io/docs/configuration#clearmocksbeforeeachtest-boolean
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true
};

