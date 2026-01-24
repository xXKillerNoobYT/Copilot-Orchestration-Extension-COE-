import { CopilotDispatcher, MemoryEntry, PromptPayload } from '../copilotDispatcher';
import { AgentProfile, AgentProfileLoader } from '../agentProfiles';
import { ParsedTask } from '../taskParser';
import { promises as fs } from 'fs';
import * as path from 'path';

jest.mock('vscode');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

describe('CopilotDispatcher', () => {
  let dispatcher: CopilotDispatcher;
  let mockAgentLoader: jest.Mocked<AgentProfileLoader>;
  let mockAgent: AgentProfile;
  let mockTask: ParsedTask;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAgent = {
      name: 'test-coder',
      role: 'coder',
      instructions: 'You are a skilled developer. Write clean, tested code.',
      tool_permissions: ['read', 'write'],
      execution_constraints: {
        max_tokens: 4000,
        temperature: 0.7,
      },
      prompt_templates: {
        system: 'You are {{role}}. {{instructions}}',
        plan: 'Complete task: {{task}}',
      },
      defaults: {
        temperature: 0.7,
        max_tokens: 4000,
      },
    };

    mockTask = {
      id: 'TASK-123',
      title: 'Implement user authentication',
      description: 'Add JWT-based authentication to the API',
      type: 'feature',
      priority: 'high',
      status: 'pending',
      dependencies: ['TASK-100'],
      assignees: ['coder'],
      labels: ['backend', 'security'],
      subtasks: [],
      rawFrontMatter: {},
    };

    mockAgentLoader = {
      loadAgent: jest.fn().mockResolvedValue(mockAgent),
      listAgents: jest.fn().mockResolvedValue([mockAgent]),
      reloadAgents: jest.fn().mockResolvedValue(undefined),
    } as any;

    dispatcher = new CopilotDispatcher({
      agentLoader: mockAgentLoader,
      tasksDir: '/test/tasks',
      workspaceRoot: '/test',
    });
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultDispatcher = new CopilotDispatcher();
      expect(defaultDispatcher).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customDispatcher = new CopilotDispatcher({
        agentLoader: mockAgentLoader,
        tasksDir: '/custom/tasks',
        workspaceRoot: '/custom',
      });
      expect(customDispatcher).toBeDefined();
    });
  });

  describe('composePrompt', () => {
    beforeEach(() => {
      // Mock file system for task loading
      (fs.readdir as jest.Mock).mockResolvedValue(['TASK-123.md']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => false });
      (fs.readFile as jest.Mock).mockResolvedValue(`---
id: TASK-123
title: Implement user authentication
type: feature
priority: high
status: pending
dependencies:
  - TASK-100
assignees:
  - coder
labels:
  - backend
  - security
---

Add JWT-based authentication to the API`);
    });

    it('should compose a basic prompt payload', async () => {
      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
      });

      expect(payload).toBeDefined();
      expect(payload.taskId).toBe('TASK-123');
      expect(payload.agent.name).toBe('test-coder');
      expect(payload.task.id).toBe('TASK-123');
      expect(payload.messages).toHaveLength(2);
      expect(payload.messages[0].role).toBe('system');
      expect(payload.messages[1].role).toBe('user');
    });

    it('should include agent profile in payload', async () => {
      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
      });

      expect(payload.agent.role).toBe('coder');
      expect(payload.agent.instructions).toContain('skilled developer');
      expect(payload.agent.tool_permissions).toContain('read');
    });

    it('should build system prompt from agent template', async () => {
      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
      });

      const systemMessage = payload.messages.find(m => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage?.content).toContain('coder');
    });

    it('should include extra instructions in system prompt', async () => {
      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
        extraInstructions: 'Focus on security best practices.',
      });

      const systemMessage = payload.messages.find(m => m.role === 'system');
      expect(systemMessage?.content).toContain('security best practices');
    });

    it('should include context files in payload', async () => {
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.endsWith('TASK-123.md')) {
          return Promise.resolve(`---
id: TASK-123
title: Test Task
---
Description`);
        }
        if (path === '/test/context/auth.ts') {
          return Promise.resolve('export class AuthService {}');
        }
        return Promise.reject(new Error('File not found'));
      });

      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
        contextFiles: ['/test/context/auth.ts'],
      });

      expect(payload.context.files).toHaveLength(1);
      expect(payload.context.files[0].path).toBe('/test/context/auth.ts');
      expect(payload.context.files[0].content).toContain('AuthService');
    });

    it('should include memory entries in payload', async () => {
      const memory: MemoryEntry[] = [
        { role: 'user', content: 'Previous question', timestamp: '2026-01-22T10:00:00Z' },
        { role: 'assistant', content: 'Previous answer', timestamp: '2026-01-22T10:01:00Z' },
      ];

      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
        memory,
      });

      expect(payload.memory).toHaveLength(2);
      expect(payload.memory[0].role).toBe('user');
      expect(payload.memory[1].role).toBe('assistant');
    });

    it('should handle tasks with dependencies', async () => {
      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
      });

      const userMessage = payload.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('TASK-100');
      expect(userMessage?.content).toContain('Dependencies');
    });

    it('should truncate large context files', async () => {
      const largeContent = 'x'.repeat(100000);
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.endsWith('TASK-123.md')) {
          return Promise.resolve(`---
id: TASK-123
title: Test Task
---
Description`);
        }
        if (path === '/test/large-file.ts') {
          return Promise.resolve(largeContent);
        }
        return Promise.reject(new Error('File not found'));
      });

      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
        contextFiles: ['/test/large-file.ts'],
        maxContextBytes: 1000,
      });

      expect(payload.context.files[0].truncated).toBe(true);
      expect(payload.context.files[0].content.length).toBeLessThan(largeContent.length);
    });

    it('should handle unreadable context files gracefully', async () => {
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.endsWith('TASK-123.md')) {
          return Promise.resolve(`---
id: TASK-123
title: Test Task
---
Description`);
        }
        if (path === '/test/forbidden.ts') {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.reject(new Error('File not found'));
      });

      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
        contextFiles: ['/test/forbidden.ts'],
      });

      expect(payload.context.files).toHaveLength(1);
      expect(payload.context.files[0].content).toContain('unreadable');
      expect(payload.context.files[0].truncated).toBe(true);
    });

    it('should throw error when agent not found', async () => {
      mockAgentLoader.loadAgent.mockRejectedValue(new Error('Agent not found'));

      await expect(
        dispatcher.composePrompt('TASK-123', { agentName: 'nonexistent' })
      ).rejects.toThrow('Agent not found');
    });

    it('should throw error when task not found', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await expect(
        dispatcher.composePrompt('TASK-999', { agentName: 'test-coder' })
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      (fs.readdir as jest.Mock).mockResolvedValue(['TASK-123.md']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => false });
      (fs.readFile as jest.Mock).mockResolvedValue(`---
id: TASK-123
title: Test Task
---
Description`);
    });

    it('should handle agent without prompt templates', async () => {
      const agentWithoutTemplates = { ...mockAgent };
      delete (agentWithoutTemplates as any).prompt_templates;
      mockAgentLoader.loadAgent.mockResolvedValue(agentWithoutTemplates);

      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
      });

      expect(payload.messages).toHaveLength(2);
    });

    it('should handle task without description', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(`---
id: TASK-NODESC
title: Task Without Description
---`);

      const payload = await dispatcher.composePrompt('TASK-NODESC', {
        agentName: 'test-coder',
      });

      const userMessage = payload.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('no description');
    });

    it('should handle empty memory array', async () => {
      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
        memory: [],
      });

      expect(payload.memory).toHaveLength(0);
    });

    it('should handle empty context files array', async () => {
      const payload = await dispatcher.composePrompt('TASK-123', {
        agentName: 'test-coder',
        contextFiles: [],
      });

      expect(payload.context.files).toHaveLength(0);
    });
  });
});
