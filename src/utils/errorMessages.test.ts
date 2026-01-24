/**
 * Tests for Enhanced Error Messages
 */

import {
  buildEnhancedErrorMessage,
  buildBackendErrorMessage,
  buildMCPErrorMessage,
  buildPlansNotFoundMessage,
  initializeErrorLogging,
  disposeErrorLogging,
  logErrorToOutput,
} from './errorMessages';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    })),
    showErrorMessage: jest.fn(() => Promise.resolve(undefined)),
  },
}));

describe('Enhanced Error Messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    disposeErrorLogging();
  });

  describe('buildEnhancedErrorMessage', () => {
    it('should throw error when operation parameter is empty', () => {
      expect(() => {
        buildEnhancedErrorMessage({
          operation: '',
          error: new Error('Test error'),
        });
      }).toThrow('Operation parameter is required and cannot be empty');
    });

    it('should throw error when operation parameter is whitespace only', () => {
      expect(() => {
        buildEnhancedErrorMessage({
          operation: '   ',
          error: new Error('Test error'),
        });
      }).toThrow('Operation parameter is required and cannot be empty');
    });

    it('should build a complete error message with all sections', () => {
      const message = buildEnhancedErrorMessage({
        operation: 'Test Operation',
        attemptedUrl: 'http://localhost:8000/api/test',
        error: new Error('ECONNREFUSED'),
        possibleCauses: ['Server not running', 'Wrong URL'],
        solutions: ['Start server', 'Check settings'],
        context: 'Additional context',
      });

      expect(message).toContain('⚠️ Test Operation Failed');
      expect(message).toContain('Additional context');
      expect(message).toContain('Attempted: http://localhost:8000/api/test');
      expect(message).toContain('Error: ECONNREFUSED');
      expect(message).toContain('Possible causes:');
      expect(message).toContain('✓ Server not running');
      expect(message).toContain('✓ Wrong URL');
      expect(message).toContain('Solutions:');
      expect(message).toContain('1. Start server');
      expect(message).toContain('2. Check settings');
    });

    it('should handle errors without URL', () => {
      const message = buildEnhancedErrorMessage({
        operation: 'Test Operation',
        error: new Error('Something went wrong'),
      });

      expect(message).toContain('⚠️ Test Operation Failed');
      expect(message).toContain('Error: Something went wrong');
      expect(message).not.toContain('Attempted:');
    });

    it('should extract clean error messages from connection errors', () => {
      const message = buildEnhancedErrorMessage({
        operation: 'Connect',
        error: new Error('fetch failed: ECONNREFUSED'),
      });

      expect(message).toContain('Error: ECONNREFUSED (Connection refused)');
    });

    it('should handle timeout errors', () => {
      const message = buildEnhancedErrorMessage({
        operation: 'Request',
        error: new Error('timeout after 5000ms'),
      });

      expect(message).toContain('Error: ETIMEDOUT (Connection timeout)');
    });

    it('should handle host not found errors', () => {
      const message = buildEnhancedErrorMessage({
        operation: 'Lookup',
        error: new Error('ENOTFOUND localhost'),
      });

      expect(message).toContain('Error: ENOTFOUND (Host not found)');
    });
  });

  describe('buildBackendErrorMessage', () => {
    it('should build backend-specific error message', () => {
      const message = buildBackendErrorMessage(
        'Load Tasks',
        'http://localhost:8000/api/v1/tasks',
        new Error('ECONNREFUSED')
      );

      expect(message).toContain('⚠️ Load Tasks Failed');
      expect(message).toContain('http://localhost:8000/api/v1/tasks');
      expect(message).toContain('Laravel backend not running');
      expect(message).toContain('Start backend: php artisan serve');
      expect(message).toContain('Check settings: copilot-orchestrator.backendUrl');
    });
  });

  describe('buildMCPErrorMessage', () => {
    it('should build MCP-specific error message', () => {
      const message = buildMCPErrorMessage(
        'Get Next Task',
        'http://localhost:8000/api/v1/mcp/nextTask',
        new Error('Connection refused')
      );

      expect(message).toContain('⚠️ Get Next Task Failed');
      expect(message).toContain('http://localhost:8000/api/v1/mcp/nextTask');
      expect(message).toContain('MCP server not running');
      expect(message).toContain('WebSocket/MCP server port mismatch');
      expect(message).toContain('docker-compose up -d');
      expect(message).toContain('Check settings: copilot-orchestrator.mcp.baseUrl');
    });
  });

  describe('buildPlansNotFoundMessage', () => {
    it('should build plans not found error message', () => {
      const locations = ['/workspace/Docs/Plans', '/workspace/.vscode/plans'];
      const message = buildPlansNotFoundMessage(locations);

      expect(message).toContain('⚠️ Load Plans Failed');
      expect(message).toContain('No plans found in workspace');
      expect(message).toContain('Searched locations:');
      expect(message).toContain('/workspace/Docs/Plans');
      expect(message).toContain('/workspace/.vscode/plans');
      expect(message).toContain('Plans directory does not exist');
      expect(message).toContain('Create your first plan using the Plan Builder');
      expect(message).toContain('copilot-orchestrator.openPlanBuilder');
    });
  });

  describe('Output Channel Integration', () => {
    it('should initialize output channel', () => {
      const vscode = require('vscode');
      const channel = initializeErrorLogging();
      
      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Copilot Orchestrator');
      expect(channel).toBeDefined();
    });

    it('should log errors to output channel with timestamp', () => {
      const channel = initializeErrorLogging();
      const mockAppendLine = jest.fn();
      (channel as any).appendLine = mockAppendLine;

      logErrorToOutput('Test error message', new Error('Test error'));

      expect(mockAppendLine).toHaveBeenCalledWith(expect.stringContaining('Test error message'));
      expect(mockAppendLine).toHaveBeenCalledWith(expect.stringContaining('Stack trace:'));
    });

    it('should reuse existing output channel', () => {
      const vscode = require('vscode');
      const channel1 = initializeErrorLogging();
      const channel2 = initializeErrorLogging();

      expect(channel1).toBe(channel2);
      expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);
    });

    it('should dispose output channel', () => {
      const channel = initializeErrorLogging();
      const mockDispose = jest.fn();
      (channel as any).dispose = mockDispose;

      disposeErrorLogging();

      expect(mockDispose).toHaveBeenCalled();
    });
  });

  describe('Error Message Quality', () => {
    it('should provide actionable solutions for ECONNREFUSED', () => {
      const message = buildBackendErrorMessage(
        'Test',
        'http://localhost:8000',
        new Error('ECONNREFUSED')
      );

      // Should have specific commands
      expect(message).toContain('php artisan serve');
      expect(message).toContain('curl http://localhost:8000');
      
      // Should explain the issue
      expect(message).toContain('Laravel backend not running');
      
      // Should provide multiple solutions
      expect(message).toContain('Solutions:');
      const solutionCount = (message.match(/\d+\./g) || []).length;
      expect(solutionCount).toBeGreaterThanOrEqual(3);
    });

    it('should avoid cryptic technical jargon', () => {
      const message = buildBackendErrorMessage(
        'Load Data',
        'http://localhost:8000',
        new Error('fetch failed')
      );

      // Should use clear language
      expect(message).toContain('backend not running');
      expect(message).not.toContain('TCP socket');
      expect(message).not.toContain('syscall');
    });

    it('should include verification steps', () => {
      const message = buildMCPErrorMessage(
        'Test',
        'http://localhost:8000',
        new Error('Test')
      );

      // Should include verification commands
      expect(message).toContain('Check');
      expect(message).toContain('Verify');
    });
  });

  describe('Error Categorization', () => {
    it('should detect connection refused errors', () => {
      const errors = [
        new Error('ECONNREFUSED'),
        new Error('connect ECONNREFUSED 127.0.0.1:8000'),
      ];

      errors.forEach(error => {
        const message = buildEnhancedErrorMessage({
          operation: 'Test',
          error,
        });
        expect(message).toContain('ECONNREFUSED');
      });
    });

    it('should detect connection refused via error code', () => {
      const error: any = new Error('Connection failed');
      error.code = 'ECONNREFUSED';
      
      const message = buildEnhancedErrorMessage({
        operation: 'Test',
        error,
      });
      
      expect(message).toContain('ECONNREFUSED (Connection refused)');
    });

    it('should detect timeout errors', () => {
      const errors = [
        new Error('ETIMEDOUT'),
        new Error('timeout after 5000ms'),
        new Error('Request timed out'),
      ];

      errors.forEach(error => {
        const message = buildEnhancedErrorMessage({
          operation: 'Test',
          error,
        });
        expect(message).toContain('ETIMEDOUT');
      });
    });

    it('should detect timeout via error code', () => {
      const error: any = new Error('Connection timeout');
      error.code = 'ETIMEDOUT';
      
      const message = buildEnhancedErrorMessage({
        operation: 'Test',
        error,
      });
      
      expect(message).toContain('ETIMEDOUT (Connection timeout)');
    });

    it('should detect host not found via error code', () => {
      const error: any = new Error('getaddrinfo failed');
      error.code = 'ENOTFOUND';
      
      const message = buildEnhancedErrorMessage({
        operation: 'Test',
        error,
      });
      
      expect(message).toContain('ENOTFOUND (Host not found)');
    });

    it('should detect network unreachable via error code', () => {
      const error: any = new Error('Network is unreachable');
      error.code = 'ENETUNREACH';
      
      const message = buildEnhancedErrorMessage({
        operation: 'Test',
        error,
      });
      
      expect(message).toContain('ENETUNREACH (Network unreachable)');
    });

    it('should detect connection reset via error code', () => {
      const error: any = new Error('Connection reset by peer');
      error.code = 'ECONNRESET';
      
      const message = buildEnhancedErrorMessage({
        operation: 'Test',
        error,
      });
      
      expect(message).toContain('ECONNRESET (Connection reset)');
    });

    it('should prioritize error code over message pattern', () => {
      const error: any = new Error('Some timeout message');
      error.code = 'ECONNREFUSED';
      
      const message = buildEnhancedErrorMessage({
        operation: 'Test',
        error,
      });
      
      // Should detect as ECONNREFUSED (from code) not ETIMEDOUT (from message)
      expect(message).toContain('ECONNREFUSED (Connection refused)');
      expect(message).not.toContain('ETIMEDOUT');
    });

    it('should handle non-Error objects', () => {
      const message = buildEnhancedErrorMessage({
        operation: 'Test',
        error: 'String error',
      });

      expect(message).toContain('String error');
    });
  });
});
