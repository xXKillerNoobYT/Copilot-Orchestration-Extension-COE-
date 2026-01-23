import * as vscode from 'vscode';
import {
  runExecuteLlmTests,
  createTestExecutionContext,
  validateExecutionContext,
  mockLlmResponses,
  MockCopilotDispatcher
} from '../executeLLMTest';

jest.mock('vscode');
jest.mock('../../llm/client');

describe('executeLLMTest Module', () => {
  let mockContext: vscode.ExtensionContext;
  let mockOutputChannel: vscode.OutputChannel;

  beforeEach(() => {
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    } as any;

    mockContext = {
      subscriptions: [],
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Mock LLM Responses', () => {
    it('should have success response with correct structure', () => {
      expect(mockLlmResponses.success).toBeDefined();
      expect(mockLlmResponses.success.id).toBeDefined();
      expect(mockLlmResponses.success.choices).toHaveLength(1);
      expect(mockLlmResponses.success.choices[0].message.role).toBe('assistant');
      expect(mockLlmResponses.success.choices[0].message.content).toBeDefined();
      expect(mockLlmResponses.success.choices[0].finish_reason).toBe('stop');
    });

    it('should have error response with correct structure', () => {
      expect(mockLlmResponses.error).toBeDefined();
      expect(mockLlmResponses.error.error).toBeDefined();
      expect(mockLlmResponses.error.error.message).toBe('Invalid request');
      expect(mockLlmResponses.error.error.type).toBe('invalid_request_error');
    });
  });

  describe('MockCopilotDispatcher', () => {
    it('should create dispatcher instance', () => {
      const dispatcher = new MockCopilotDispatcher();
      expect(dispatcher).toBeDefined();
      expect(typeof dispatcher.composePrompt).toBe('function');
    });

    it('should compose prompt with task ID', async () => {
      const dispatcher = new MockCopilotDispatcher();
      const result = await dispatcher.composePrompt('test-task-123');

      expect(result).toBeDefined();
      expect(result.taskId).toBe('test-task-123');
      expect(result.agent).toBeDefined();
      expect(result.agent.name).toBe('coder');
      expect(result.task).toBeDefined();
      expect(result.task.id).toBe('test-task-123');
    });
  });

  describe('createTestExecutionContext', () => {
    it('should create execution context with defaults', () => {
      const context = createTestExecutionContext();

      expect(context).toBeDefined();
      expect(context.taskId).toBeDefined();
      expect(context.startTime).toBeDefined();
      expect(typeof context.startTime).toBe('number');
    });

    it('should accept overrides', () => {
      const customTaskId = 'custom-task-456';
      const context = createTestExecutionContext({ taskId: customTaskId });

      expect(context.taskId).toBe(customTaskId);
    });

    it('should include timing information', () => {
      const startTime = Date.now();
      const endTime = startTime + 5000;
      const context = createTestExecutionContext({ startTime, endTime });

      expect(context.startTime).toBe(startTime);
      expect(context.endTime).toBe(endTime);
      if (context.endTime) {
        expect(context.endTime - context.startTime).toBe(5000);
      }
    });
  });

  describe('validateExecutionContext', () => {
    it('should validate valid context', () => {
      const context = createTestExecutionContext();
      const errors = validateExecutionContext(context);

      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(0);
    });

    it('should detect missing taskId', () => {
      const context = createTestExecutionContext({ taskId: '' });
      const errors = validateExecutionContext(context);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('taskId'))).toBe(true);
    });
  });

  describe('runExecuteLlmTests', () => {
    it('should be defined as a function', () => {
      expect(typeof runExecuteLlmTests).toBe('function');
    });

    it('should execute without throwing', () => {
      // Mock console methods to avoid test output pollution
      const originalLog = console.log;
      const originalError = console.error;
      const originalAssert = console.assert;

      console.log = jest.fn();
      console.error = jest.fn();
      console.assert = jest.fn();

      expect(() => runExecuteLlmTests()).not.toThrow();

      // Restore console methods
      console.log = originalLog;
      console.error = originalError;
      console.assert = originalAssert;
    });
  });
});
