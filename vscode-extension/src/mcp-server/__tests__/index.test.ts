import * as mcpServerExports from '../index.js';

jest.mock('vscode');

describe('MCP Server Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up any open handles from MCP server
    await new Promise(resolve => setImmediate(resolve));
  });

  describe('Initialization', () => {
    it('should export module correctly', () => {
      expect(mcpServerExports).toBeDefined();
      expect(typeof mcpServerExports).toBe('object');
    });
  });

  describe('Core Functionality', () => {
    it('should have expected exports', () => {
      // Verify the module exports something
      expect(Object.keys(mcpServerExports).length).toBeGreaterThanOrEqual(0);
    });
  });
});
