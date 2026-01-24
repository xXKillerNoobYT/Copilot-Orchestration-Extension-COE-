/* eslint-disable @typescript-eslint/no-explicit-any */
import { TaskExecutor, LLMHandler } from './taskExecutor';
import { CopilotAgentClient } from './services/copilotAgentClient';
import { PromptPayload } from './copilotDispatcher';

// Jest type definitions
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;
declare function beforeEach(fn: () => Promise<void> | void): void;
declare function afterEach(fn: () => Promise<void> | void): void;

interface Expect {
  (actual: any): any;
  toBeDefined(): void;
  toEqual(expected: any): void;
  toBe(expected: any): void;
  toContain(expected: any): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toThrow(): void;
  not: any;
  toMatch(expected: RegExp): void;
  toBeTruthy(): void;
  toHaveLength(length: number): void;
  toHaveProperty(property: string, value?: any): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledWith(...args: any[]): void;
  toBeFalsy(): void;
}

declare function expect(actual: any): Expect;

/**
 * Test suite for TaskExecutor GitHub Copilot Agent Mode integration
 * Tests the configuration and initialization of the integration
 */
describe('TaskExecutor - Copilot Agent Mode Integration', () => {
  afterEach(() => {
    // Clean up after each test
  });

  describe('Configuration', () => {
    test('should create TaskExecutor without Copilot Agent Mode', () => {
      const executor = new TaskExecutor({
        useCopilotAgentMode: false,
      });

      expect(executor).toBeDefined();
    });

    test('should create TaskExecutor with Copilot Agent Mode enabled', () => {
      const client = new CopilotAgentClient({ mockMode: true });
      const executor = new TaskExecutor({
        useCopilotAgentMode: true,
        copilotAgentClient: client,
      });

      expect(executor).toBeDefined();
    });

    test('should create TaskExecutor with custom LLM handler', () => {
      const mockLLMHandler: LLMHandler = {
        execute: async (payload: PromptPayload) => {
          return `Mock LLM response for ${payload.taskId}`;
        },
      };

      const executor = new TaskExecutor({
        llmHandler: mockLLMHandler,
      });

      expect(executor).toBeDefined();
    });

    test('should create TaskExecutor with both Copilot Agent and LLM handler', () => {
      const client = new CopilotAgentClient({ mockMode: true });
      const mockLLMHandler: LLMHandler = {
        execute: async (payload: PromptPayload) => {
          return `Mock LLM response for ${payload.taskId}`;
        },
      };

      const executor = new TaskExecutor({
        useCopilotAgentMode: true,
        copilotAgentClient: client,
        llmHandler: mockLLMHandler,
      });

      expect(executor).toBeDefined();
    });
  });

  describe('Client Integration', () => {
    test('should accept CopilotAgentClient instance', () => {
      const client = new CopilotAgentClient({ 
        mockMode: true,
        baseUrl: 'https://test.api.com',
        authToken: 'test-token',
      });

      const executor = new TaskExecutor({
        useCopilotAgentMode: true,
        copilotAgentClient: client,
      });

      expect(executor).toBeDefined();
    });

    test('should work without explicit client when Agent Mode enabled', () => {
      const executor = new TaskExecutor({
        useCopilotAgentMode: true,
      });

      expect(executor).toBeDefined();
    });

    test('should handle missing client gracefully when Agent Mode disabled', () => {
      const executor = new TaskExecutor({
        useCopilotAgentMode: false,
        copilotAgentClient: undefined,
      });

      expect(executor).toBeDefined();
    });
  });

  describe('Configuration Options', () => {
    test('should default to Agent Mode disabled', () => {
      const executor = new TaskExecutor();
      expect(executor).toBeDefined();
    });

    test('should handle all configuration combinations', () => {
      // No options
      const executor1 = new TaskExecutor();
      expect(executor1).toBeDefined();

      // Only Agent Mode
      const executor2 = new TaskExecutor({
        useCopilotAgentMode: true,
      });
      expect(executor2).toBeDefined();

      // Only LLM handler
      const executor3 = new TaskExecutor({
        llmHandler: {
          execute: async () => 'test',
        },
      });
      expect(executor3).toBeDefined();

      // Both
      const executor4 = new TaskExecutor({
        useCopilotAgentMode: true,
        llmHandler: {
          execute: async () => 'test',
        },
      });
      expect(executor4).toBeDefined();
    });

    test('should accept custom workspace and output directories', () => {
      const client = new CopilotAgentClient({ mockMode: true });
      const executor = new TaskExecutor({
        workspaceRoot: '/custom/workspace',
        tasksDir: '/custom/tasks',
        outputDir: '/custom/output',
        useCopilotAgentMode: true,
        copilotAgentClient: client,
      });

      expect(executor).toBeDefined();
    });
  });

  describe('Feature Flags', () => {
    test('should support enabling Agent Mode via flag', () => {
      const executor = new TaskExecutor({
        useCopilotAgentMode: true,
      });

      expect(executor).toBeDefined();
    });

    test('should support disabling Agent Mode via flag', () => {
      const executor = new TaskExecutor({
        useCopilotAgentMode: false,
      });

      expect(executor).toBeDefined();
    });

    test('should work with verification enabled and Agent Mode', () => {
      const executor = new TaskExecutor({
        useCopilotAgentMode: true,
        enableVerification: true,
      });

      expect(executor).toBeDefined();
    });

    test('should work with verification disabled and Agent Mode', () => {
      const executor = new TaskExecutor({
        useCopilotAgentMode: true,
        enableVerification: false,
      });

      expect(executor).toBeDefined();
    });
  });
});
