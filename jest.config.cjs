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
        // Vitest tests - these files use vitest imports
        'planGenerator\\.test\\.ts',
        'livePreview\\.test\\.ts',
        'planMetadata\\.test\\.ts',
        'questionFramework\\.test\\.ts',
        'taskDecomposition\\.test\\.ts',
        'planIntegration\\.test\\.ts',
        '__tests__/wizardStore\\.test\\.ts',
        '__tests__/integration/',
        'components/preview/.*\\.test\\.ts',
        'services/planPersistence\\.test\\.ts',
        'services/taskDecomposition\\.test\\.ts',
        'llm/promptCache\\.test\\.ts',
        'panels/.*\\.test\\.ts',
        'designSystem/.*\\.test\\.ts',
        'copilotDispatcher\\.test\\.ts',
        'extension\\.agentLoop\\.test\\.ts',
        'taskFileSupport\\.test\\.ts',
      ],
      moduleNameMapper: {
        '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
      },
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
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node',
            resolveJsonModule: true,
            skipLibCheck: true,
            isolatedModules: true,
          }
        }]
      },
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts'
      ],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  testTimeout: 10000,
  verbose: true,
};
