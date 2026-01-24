/**
 * Jest Global Setup
 * 
 * Provides global mocks for VS Code APIs and test environment configuration.
 * This file is referenced in jest.config.js via setupFilesAfterEnv.
 * 
 * Features:
 * - Mock vscode.workspace.getConfiguration for all tests
 * - Provide default values for backend URLs and LLM config
 * - Set up global test utilities
 */

// Mock process.env for tests
process.env.NODE_ENV = 'test';

// Suppress console output in tests unless DEBUG env var is set
if (!process.env.DEBUG) {
    const noop = () => { };
    global.console.log = noop;
    global.console.debug = noop;
    global.console.info = noop;
    // Keep warn and error for important messages
}

// Note: vscode mocking is handled by jest.config.js moduleNameMapper
// pointing to src/__mocks__/vscode.ts
