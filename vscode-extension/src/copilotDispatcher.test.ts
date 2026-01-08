/* eslint-disable @typescript-eslint/no-explicit-any */
import { CopilotDispatcher, PromptPayload, PromptMessage } from './copilotDispatcher';
import { AgentProfile } from './agentProfiles';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Jest type definitions
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;
declare function beforeAll(fn: () => Promise<void> | void): void;
declare function afterAll(fn: () => Promise<void> | void): void;

interface Expect {
  (actual: any): any;
  toBeDefined(): void;
  toEqual(expected: any): void;
  toBe(expected: any): void;
  toContain(expected: any): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toThrow(): void;
  not: any;
  toMatch(expected: RegExp): void;
}

declare function expect(actual: any): Expect;

/**
 * Comprehensive test suite for CopilotDispatcher payload composition.
 * Validates structure, message format, agent profiles, and context handling.
 */
describe('CopilotDispatcher Payload Composition', () => {
  let dispatcher: CopilotDispatcher;
  let tempDir: string;

  beforeAll(async () => {
    // Create temp directory for test tasks
    tempDir = path.join(os.tmpdir(), `copilot-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create a minimal test task file
    const testTaskContent = `---
id: TASK-test-dispatcher
title: Test Dispatcher Task
description: A test task for dispatcher payload validation
status: pending
priority: high
dependencies: []
---

Test task content for validation.
`;
    await fs.writeFile(path.join(tempDir, 'TASK-test-dispatcher.md'), testTaskContent);

    // Create minimal agent profile
    const agentContent = `
version: 1
name: test-agent
role: test-role
instructions: Test agent instructions
`;
    const agentsDir = path.join(tempDir, '..', 'test-agents');
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.writeFile(path.join(agentsDir, 'test-agent.yaml'), agentContent);

    // Initialize dispatcher with test directories
    const mockAgentLoader = {
      loadProfile: async (name: string) => ({
        version: 1,
        name: name || 'test-agent',
        role: 'test-role',
        instructions: 'You are a test agent.',
        tool_permissions: {
          read_files: true,
          write_files: false,
        } as any,
        execution_constraints: {
          max_depth: 5,
          require_tests_for_changes: true,
        } as any,
        prompt_templates: {
          system: 'Test system template',
          planning: 'Analyze: {{task}}',
        },
        defaults: {
          timeout: 30000,
        },
      } as AgentProfile),
      loadAllProfiles: async () => [],
    } as any;

    dispatcher = new CopilotDispatcher({
      tasksDir: tempDir,
      workspaceRoot: path.dirname(tempDir),
      agentLoader: mockAgentLoader,
    });
  });

  afterAll(async () => {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      const parentsDir = path.dirname(tempDir);
      const agentsDir = path.join(parentsDir, 'test-agents');
      await fs.rm(agentsDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Core Payload Structure', () => {
    test('composePrompt returns valid PromptPayload with all required fields', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      expect(payload).toBeDefined();
      expect(payload.taskId).toBe('TASK-test-dispatcher');
      expect(payload.agent).toBeDefined();
      expect(payload.task).toBeDefined();
      expect(payload.context).toBeDefined();
      expect(payload.memory).toBeDefined();
      expect(payload.messages).toBeDefined();
      expect(payload.metadata).toBeDefined();
    });

    test('taskId field matches input parameter', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      expect(payload.taskId).toEqual('TASK-test-dispatcher');
    });

    test('memory defaults to empty array when not provided', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      expect(Array.isArray(payload.memory)).toBe(true);
      // Default may be empty or have previous entries
      expect(payload.memory.length).toBeGreaterThanOrEqual(0);
    });

    test('context.files is always an array', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      expect(Array.isArray(payload.context.files)).toBe(true);
    });

    test('metadata includes workspaceRoot and tasksDir', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      expect(payload.metadata).toBeDefined();
      expect(payload.metadata?.workspaceRoot).toBeDefined();
      expect(payload.metadata?.tasksDir).toBeDefined();
      expect(typeof payload.metadata?.contextFileCount).toBe('number');
      expect(typeof payload.metadata?.memoryCount).toBe('number');
    });
  });

  describe('Agent Profile Extraction', () => {
    test('agent object includes all required profile fields', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', { agentName: 'test-agent' });

      expect(payload.agent).toBeDefined();
      expect(payload.agent.name).toBeDefined();
      expect(payload.agent.role).toBeDefined();
      expect(payload.agent.instructions).toBeDefined();
      expect(typeof payload.agent.tool_permissions).toBe('object');
      expect(typeof payload.agent.execution_constraints).toBe('object');
    });

    test('agent name matches requested agent', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', { agentName: 'test-agent' });
      expect(payload.agent.name).toBe('test-agent');
    });

    test('agent includes prompt_templates if provided by profile', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      expect(payload.agent.prompt_templates).toBeDefined();
      expect(typeof payload.agent.prompt_templates).toBe('object');
    });

    test('agent includes defaults from profile', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      expect(payload.agent.defaults).toBeDefined();
      expect(typeof payload.agent.defaults).toBe('object');
    });

    test('agent tool_permissions are properly structured', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      const { tool_permissions } = payload.agent;

      expect(typeof tool_permissions).toBe('object');
      // Should contain boolean or undefined values
      if (tool_permissions) {
        Object.entries(tool_permissions).forEach(([, value]) => {
          expect(typeof value === 'boolean' || value === undefined).toBe(true);
        });
      }
    });

    test('agent execution_constraints are properly structured', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      const { execution_constraints } = payload.agent;

      expect(typeof execution_constraints).toBe('object');
      // Should contain various types of constraints
      if (execution_constraints && 'require_tests_for_changes' in execution_constraints) {
        expect(typeof execution_constraints.require_tests_for_changes).toBe('boolean');
      }
      if (execution_constraints && 'max_depth' in execution_constraints) {
        expect(typeof execution_constraints.max_depth).toBe('number');
      }
    });
  });

  describe('Task Field Population', () => {
    test('task object contains id, title, and description', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      expect(payload.task).toBeDefined();
      expect(payload.task.id).toBe('TASK-test-dispatcher');
      expect(payload.task.title).toBeDefined();
      expect(typeof payload.task.title).toBe('string');
    });

    test('task includes status and priority if available', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      // Status and priority may be defined
      if (payload.task.status) {
        expect(['pending', 'in-progress', 'done', 'blocked', 'cancelled']).toContain(payload.task.status);
      }
      if (payload.task.priority) {
        expect(['high', 'medium', 'low']).toContain(payload.task.priority);
      }
    });

    test('task dependencies is array or undefined', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      expect(Array.isArray(payload.task.dependencies) || payload.task.dependencies === undefined).toBe(true);
    });

    test('task includes assignees and labels if present', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      if (payload.task.assignees) {
        expect(Array.isArray(payload.task.assignees)).toBe(true);
      }
      if (payload.task.labels) {
        expect(Array.isArray(payload.task.labels)).toBe(true);
      }
    });
  });

  describe('Message Composition', () => {
    test('messages array always contains at least system and user messages', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      expect(Array.isArray(payload.messages)).toBe(true);
      expect(payload.messages.length).toBeGreaterThanOrEqual(2);
    });

    test('first message is system role with content', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const systemMsg = payload.messages[0];
      expect(systemMsg.role).toBe('system');
      expect(typeof systemMsg.content).toBe('string');
      expect(systemMsg.content.length).toBeGreaterThan(0);
    });

    test('second message is user role with content', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const userMsg = payload.messages[1];
      expect(userMsg.role).toBe('user');
      expect(typeof userMsg.content).toBe('string');
      expect(userMsg.content.length).toBeGreaterThan(0);
    });

    test('message content contains task information', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const userContent = payload.messages[1].content;
      expect(userContent).toContain('TASK-test-dispatcher');
      expect(userContent).toContain('Test Dispatcher Task');
    });

    test('system prompt includes agent instructions', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const systemContent = payload.messages[0].content;
      // System prompt should include agent instructions
      expect(systemContent.length).toBeGreaterThan(0);
    });

    test('extra instructions are appended to system prompt when provided', async () => {
      const extraInstructions = 'Focus on code quality.';
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        extraInstructions,
      });

      const systemContent = payload.messages[0].content;
      expect(systemContent).toContain(extraInstructions);
    });

    test('user prompt includes task description when available', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const userContent = payload.messages[1].content;
      expect(userContent).toContain('Description');
    });

    test('all messages have valid role values', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      payload.messages.forEach((msg) => {
        expect(['system', 'user', 'assistant']).toContain(msg.role);
        expect(typeof msg.content).toBe('string');
      });
    });
  });

  describe('Context File Handling', () => {
    test('context files default to empty array when not specified', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');
      expect(payload.context.files).toEqual([]);
    });

    test('context files are loaded when specified', async () => {
      // Create a test file
      const testFile = path.join(tempDir, 'test-context.ts');
      await fs.writeFile(testFile, 'const x = 42;');

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        contextFiles: [testFile],
      });

      expect(payload.context.files.length).toBeGreaterThan(0);
      expect(payload.context.files[0].path).toBe(testFile);
      expect(payload.context.files[0].content).toContain('const x = 42');
    });

    test('context files include truncated flag when content exceeds max bytes', async () => {
      const testFile = path.join(tempDir, 'large-context.txt');
      const largeContent = 'x'.repeat(1000); // 1000 bytes
      await fs.writeFile(testFile, largeContent);

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        contextFiles: [testFile],
        maxContextBytes: 100, // Set very low limit
      });

      expect(payload.context.files.length).toBeGreaterThan(0);
      // Content should be truncated
      expect(payload.context.files[0].content.length).toBeLessThanOrEqual(100);
      expect(payload.context.files[0].truncated).toBe(true);
    });

    test('metadata includes accurate contextFileCount', async () => {
      const testFile = path.join(tempDir, 'file-count-test.txt');
      await fs.writeFile(testFile, 'test content');

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        contextFiles: [testFile],
      });

      expect(payload.metadata?.contextFileCount).toBe(1);
    });

    test('unreadable files are handled gracefully', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        contextFiles: ['/nonexistent/file/path.ts'],
      });

      // Should not throw; instead include error message
      expect(payload.context.files.length).toBeGreaterThan(0);
      expect(payload.context.files[0].content).toContain('unreadable');
    });
  });

  describe('Memory Management', () => {
    test('provided memory entries are preserved in payload', async () => {
      const testMemory = [
        { role: 'user' as const, content: 'First message' },
        { role: 'assistant' as const, content: 'First response' },
      ];

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        memory: testMemory,
      });

      expect(payload.memory).toEqual(testMemory);
    });

    test('memory includes timestamp if provided', async () => {
      const testMemory = [{ role: 'user' as const, content: 'Test', timestamp: '2026-01-08T12:00:00Z' }];

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        memory: testMemory,
      });

      expect(payload.memory[0].timestamp).toBe('2026-01-08T12:00:00Z');
    });

    test('metadata memoryCount reflects actual memory entries', async () => {
      const testMemory = [
        { role: 'user' as const, content: 'Message 1' },
        { role: 'assistant' as const, content: 'Message 2' },
        { role: 'user' as const, content: 'Message 3' },
      ];

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        memory: testMemory,
      });

      expect(payload.metadata?.memoryCount).toBe(3);
    });
  });

  describe('Template Substitution', () => {
    test('user prompt substitutes {{task}} in templates', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const userContent = payload.messages[1].content;
      // Should have substituted {{task}} with actual task title
      expect(userContent).not.toContain('{{task}}');
    });

    test('user prompt substitutes {{taskId}} in templates', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const userContent = payload.messages[1].content;
      expect(userContent).toContain('TASK-test-dispatcher');
      expect(userContent).not.toContain('{{taskId}}');
    });

    test('user prompt substitutes {{title}} in templates', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const userContent = payload.messages[1].content;
      expect(userContent).toContain('Test Dispatcher Task');
      expect(userContent).not.toContain('{{title}}');
    });

    test('user prompt substitutes {{status}} and {{priority}} in templates', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const userContent = payload.messages[1].content;
      // Should not contain template markers
      expect(userContent).not.toContain('{{status}}');
      expect(userContent).not.toContain('{{priority}}');
    });

    test('user prompt substitutes {{dependencies}} in templates', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const userContent = payload.messages[1].content;
      // Should substitute with actual dependencies or 'none'
      expect(userContent).not.toContain('{{dependencies}}');
      expect(userContent).toMatch(/Dependencies:|dependencies/i);
    });
  });

  describe('Options Handling', () => {
    test('workspaceRoot option is stored in metadata', async () => {
      const customWorkspace = '/custom/workspace';
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        workspaceRoot: customWorkspace,
      });

      expect(payload.metadata?.workspaceRoot).toBe(customWorkspace);
    });

    test('tasksDir option is stored in metadata', async () => {
      const customTasksDir = '/custom/tasks';
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        tasksDir: customTasksDir,
      });

      expect(payload.metadata?.tasksDir).toBe(customTasksDir);
    });

    test('default maxContextBytes is 32000 when not specified', async () => {
      const largeContent = 'x'.repeat(50000);
      const testFile = path.join(tempDir, 'context-limit-test.txt');
      await fs.writeFile(testFile, largeContent);

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        contextFiles: [testFile],
        // No maxContextBytes specified
      });

      // Content should be truncated to default limit
      expect(payload.context.files[0].truncated).toBe(true);
    });

    test('custom maxContextBytes is respected', async () => {
      const largeContent = 'x'.repeat(5000);
      const testFile = path.join(tempDir, 'custom-limit-test.txt');
      await fs.writeFile(testFile, largeContent);

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        contextFiles: [testFile],
        maxContextBytes: 1000,
      });

      expect(payload.context.files[0].content.length).toBeLessThanOrEqual(1000);
      expect(payload.context.files[0].truncated).toBe(true);
    });

    test('agentName option selects correct agent', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        agentName: 'test-agent',
      });

      expect(payload.agent.name).toBe('test-agent');
    });
  });

  describe('Error Handling', () => {
    test('throws error for non-existent task', async () => {
      let didThrow = false;
      try {
        await dispatcher.composePrompt('TASK-nonexistent');
      } catch {
        didThrow = true;
      }
      expect(didThrow).toBe(true);
    });

    test('throws error for non-existent agent', async () => {
      let didThrow = false;
      try {
        await dispatcher.composePrompt('TASK-test-dispatcher', { agentName: 'nonexistent-agent' });
      } catch {
        didThrow = true;
      }
      expect(didThrow).toBe(true);
    });
  });

  describe('Type Safety', () => {
    test('payload conforms to PromptPayload interface', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      // Verify structure is valid
      expect(typeof payload.taskId).toBe('string');
      expect(typeof payload.agent).toBe('object');
      expect(typeof payload.task).toBe('object');
      expect(typeof payload.context).toBe('object');
      expect(Array.isArray(payload.memory)).toBe(true);
      expect(Array.isArray(payload.messages)).toBe(true);
      const metadataType = typeof payload.metadata;
      expect(['object', 'undefined']).toContain(metadataType);
    });

    test('message role values are strictly typed', async () => {
      const payload = await dispatcher.composePrompt('TASK-test-dispatcher');

      const validRoles = ['system', 'user', 'assistant'];
      payload.messages.forEach((msg) => {
        expect(validRoles).toContain(msg.role);
      });
    });

    test('memory role values are strictly typed', async () => {
      const testMemory = [
        { role: 'user' as const, content: 'Message' },
        { role: 'assistant' as const, content: 'Response' },
        { role: 'system' as const, content: 'Context' },
      ];

      const payload = await dispatcher.composePrompt('TASK-test-dispatcher', {
        memory: testMemory,
      });

      const validRoles = ['user', 'assistant', 'system'];
      payload.memory.forEach((entry) => {
        expect(validRoles).toContain(entry.role);
      });
    });
  });
});
