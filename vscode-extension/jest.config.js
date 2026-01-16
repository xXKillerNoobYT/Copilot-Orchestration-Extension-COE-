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
        types: ['node', 'jest'],
      },
      diagnostics: {
        warnOnly: true,
        ignoreCodes: [151002]
      }
    }]
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage/jest',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/out/',
    '\\.disabled\\.',
    // Exclude Vitest-specific test files (they import from 'vitest')
    '__tests__/sample\\.test\\.ts',  // Vitest-based sample test
    'planBuilder/__tests__/integration',
    'planBuilder/__tests__/wizardStore\\.test\\.ts',
    'planBuilder/wizardContainer\\.test\\.ts',
    'planBuilder/questionFramework\\.test\\.ts',
    'planBuilder/taskDecomposition\\.test\\.ts',
    'planBuilder/planMetadata\\.test\\.ts',
    'planBuilder/planGenerator\\.test\\.ts',
    'planBuilder/planIntegration\\.test\\.ts',
    'planBuilder/livePreview\\.test\\.ts',
    'planBuilder/designHandoff\\.test\\.ts',
    'planBuilder/aiAssistanceService\\.test\\.ts',
    'services/planPersistence\\.test\\.ts',
    'services/taskDecomposition\\.test\\.ts',
    // Preview tests ENABLED for Issue #56
    // 'components/preview/PreviewEngine\\.test\\.ts',
    // 'components/preview/WizardStateObserver\\.test\\.ts',
    'copilotDispatcher\\.test\\.ts',
    'panels/visualVerificationPanel\\.test\\.ts',
    'panels/planAdjustmentWizard\\.test\\.ts',
    'panels/orchestratorPanel\\.test\\.ts',
    'panels/auditDashboardPanel\\.test\\.ts',
    'llm/promptCache\\.test\\.ts',
    // Exclude Mocha/assert-based tests
    'extension\\.agentLoop\\.test\\.ts',
    'integration/.*\\.test\\.ts',
    'planBuilder/designSystem/validator\\.test\\.ts',
    'planBuilder/designSystem/tokenGenerator\\.test\\.ts',
  ],
  verbose: true,
  testTimeout: 10000,
};
