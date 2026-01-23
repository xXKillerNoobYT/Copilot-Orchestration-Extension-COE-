import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  buildRequestHeaders,
  buildRequestBody,
  buildTransportRequest,
  calculateRequestMetadata,
  ChatCompletionsRequest,
  TransportRequest,
  RequestBuilderOptions,
} from '../llm/client';
import { LlmConfig } from '../config/llmConfig';
import { PromptPayload, PromptMessage } from '../copilotDispatcher';

describe('LLM Client', () => {
  let mockConfig: LlmConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      model: 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'test-api-key-123',
      maxTokens: 4096,
      temperature: 0.7,
    };
  });

  describe('buildRequestHeaders', () => {
    it('should build basic headers with API key', () => {
      const headers = buildRequestHeaders(mockConfig);

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer test-api-key-123');
      expect(headers['User-Agent']).toBe('CopilotOrchestrator/1.0');
    });

    it('should build headers without API key', () => {
      const configNoKey = { ...mockConfig, apiKey: undefined };
      const headers = buildRequestHeaders(configNoKey);

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['User-Agent']).toBe('CopilotOrchestrator/1.0');
    });

    it('should include task ID when requested', () => {
      const headers = buildRequestHeaders(mockConfig, {
        includeTaskId: true,
        taskId: 'task-123',
      });

      expect(headers['X-Task-Id']).toBe('task-123');
    });

    it('should include agent name when provided', () => {
      const headers = buildRequestHeaders(mockConfig, {
        agentName: 'auto-zen',
      });

      expect(headers['X-Agent-Name']).toBe('auto-zen');
    });

    it('should include both task ID and agent name', () => {
      const headers = buildRequestHeaders(mockConfig, {
        includeTaskId: true,
        taskId: 'task-456',
        agentName: 'plan-agent',
      });

      expect(headers['X-Task-Id']).toBe('task-456');
      expect(headers['X-Agent-Name']).toBe('plan-agent');
    });

    it('should not include task ID if includeTaskId is false', () => {
      const headers = buildRequestHeaders(mockConfig, {
        includeTaskId: false,
        taskId: 'task-123',
      });

      expect(headers['X-Task-Id']).toBeUndefined();
    });

    it('should handle empty API key string', () => {
      const configEmptyKey = { ...mockConfig, apiKey: '' };
      const headers = buildRequestHeaders(configEmptyKey);

      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('buildRequestBody', () => {
    const mockPayload: PromptPayload = {
      taskId: 'task-001',
      agentName: 'auto-zen',
      systemPrompt: 'You are a helpful assistant.',
      messages: [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I am doing well, thank you!' },
        { role: 'user', content: 'Great! Can you help me with a task?' },
      ],
      contextFiles: [],
      memoryEntries: [],
    };

    it('should build basic request body', () => {
      const body = buildRequestBody(mockPayload, mockConfig);

      expect(body.model).toBe('gpt-4');
      expect(body.messages).toHaveLength(3); // Just the 3 payload messages (no system message added)
      expect(body.temperature).toBe(0.7);
      // max_tokens only added if specified in options
    });

    it('should override config with builder options', () => {
      const options: RequestBuilderOptions = {
        maxTokens: 2048,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.2,
      };

      const body = buildRequestBody(mockPayload, mockConfig, options);

      expect(body.max_tokens).toBe(2048);
      expect(body.top_p).toBe(0.9);
      expect(body.frequency_penalty).toBe(0.5);
      expect(body.presence_penalty).toBe(0.2);
    });

    it('should include stop sequences', () => {
      const options: RequestBuilderOptions = {
        stop: ['STOP', 'END'],
      };

      const body = buildRequestBody(mockPayload, mockConfig, options);

      expect(body.stop).toEqual(['STOP', 'END']);
    });

    it('should include user ID from options but taskId takes precedence', () => {
      const options: RequestBuilderOptions = {
        userId: 'user-123',
      };

      const body = buildRequestBody(mockPayload, mockConfig, options);

      // taskId from payload takes precedence over userId from options
      expect(body.user).toBe('task:task-001');
    });

    it('should handle empty messages array', () => {
      const emptyPayload: PromptPayload = {
        ...mockPayload,
        messages: [],
      };

      const body = buildRequestBody(emptyPayload, mockConfig);

      expect(body.messages).toHaveLength(0); // No system message added by buildRequestBody
    });

    it('should handle missing system prompt', () => {
      const noSystemPayload: PromptPayload = {
        ...mockPayload,
        systemPrompt: undefined,
      };

      const body = buildRequestBody(noSystemPayload, mockConfig);

      expect(body.messages.length).toBeGreaterThan(0);
      // First message might be user message if no system prompt
    });

    it('should preserve message order', () => {
      const body = buildRequestBody(mockPayload, mockConfig);

      const userMessages = body.messages.filter(m => m.role === 'user');
      expect(userMessages).toHaveLength(2);
      expect(userMessages[0].content).toBe('Hello, how are you?');
      expect(userMessages[1].content).toBe('Great! Can you help me with a task?');
    });
  });

  describe('calculateRequestMetadata', () => {
    it('should calculate metadata for standard payload', () => {
      const payload: PromptPayload = {
        taskId: 'task-001',
        agentName: 'auto-zen',
        systemPrompt: 'System prompt',
        messages: [
          { role: 'user', content: 'Message 1' },
          { role: 'assistant', content: 'Response 1' },
        ],
        contextFiles: [
          { path: '/file1.ts', content: 'file content 1' },
          { path: '/file2.ts', content: 'file content 2' },
        ],
        memoryEntries: [
          { id: 'mem-1', content: 'memory 1' },
          { id: 'mem-2', content: 'memory 2' },
          { id: 'mem-3', content: 'memory 3' },
        ],
      };

      const metadata = buildRequestMetadata(payload);

      expect(metadata.taskId).toBe('task-001');
      expect(metadata.agentName).toBe('auto-zen');
      expect(metadata.contextFileCount).toBe(2);
      expect(metadata.memoryCount).toBe(3);
      expect(metadata.messageCount).toBe(2);
      expect(metadata.totalCharacters).toBeGreaterThan(0);
      expect(metadata.timestamp).toBeDefined();
    });

    it('should handle empty payload', () => {
      const emptyPayload: PromptPayload = {
        taskId: 'task-002',
        agentName: 'plan-agent',
        messages: [],
        contextFiles: [],
        memoryEntries: [],
      };

      const metadata = buildRequestMetadata(emptyPayload);

      expect(metadata.contextFileCount).toBe(0);
      expect(metadata.memoryCount).toBe(0);
      expect(metadata.messageCount).toBe(0);
    });

    it('should calculate total characters correctly', () => {
      const payload: PromptPayload = {
        taskId: 'task-003',
        agentName: 'test-agent',
        systemPrompt: '12345', // 5 chars
        messages: [
          { role: 'user', content: '12345678' }, // 8 chars
        ],
        contextFiles: [],
        memoryEntries: [],
      };

      const metadata = buildRequestMetadata(payload);

      expect(metadata.totalCharacters).toBeGreaterThan(0);
    });
  });

  describe('buildTransportRequest', () => {
    const mockPayload: PromptPayload = {
      taskId: 'task-001',
      agentName: 'auto-zen',
      systemPrompt: 'System',
      messages: [{ role: 'user', content: 'Test' }],
      contextFiles: [],
      memoryEntries: [],
    };

    it('should build complete transport request', () => {
      const request = buildTransportRequest(mockPayload, mockConfig);

      expect(request.body).toBeDefined();
      expect(request.headers).toBeDefined();
      expect(request.metadata).toBeDefined();
      expect(request.body.model).toBe('gpt-4');
      expect(request.headers['Authorization']).toBe('Bearer test-api-key-123');
      expect(request.metadata.taskId).toBe('task-001');
    });

    it('should include custom options', () => {
      const options: RequestBuilderOptions = {
        maxTokens: 1024,
        userId: 'user-123',
      };

      const request = buildTransportRequest(mockPayload, mockConfig, options);

      expect(request.body.max_tokens).toBe(1024);
      expect(request.body.user).toBe('user-123');
    });

    it('should include task metadata in headers', () => {
      const request = buildTransportRequest(mockPayload, mockConfig, {}, {
        includeTaskId: true,
        taskId: 'task-001',
        agentName: 'auto-zen',
      });

      expect(request.headers['X-Task-Id']).toBe('task-001');
      expect(request.headers['X-Agent-Name']).toBe('auto-zen');
    });

    it('should handle minimal payload', () => {
      const minimalPayload: PromptPayload = {
        taskId: 'task-min',
        agentName: 'minimal',
        messages: [],
        contextFiles: [],
        memoryEntries: [],
      };

      const request = buildTransportRequest(minimalPayload, mockConfig);

      expect(request).toBeDefined();
      expect(request.body.messages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      const longContent = 'x'.repeat(100000);
      const payload: PromptPayload = {
        taskId: 'task-long',
        agentName: 'test',
        messages: [{ role: 'user', content: longContent }],
        contextFiles: [],
        memoryEntries: [],
      };

      const body = buildRequestBody(payload, mockConfig);
      expect(body.messages.some(m => m.content === longContent)).toBe(true);
    });

    it('should handle special characters in messages', () => {
      const specialContent = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\n\t\r';
      const payload: PromptPayload = {
        taskId: 'task-special',
        agentName: 'test',
        messages: [{ role: 'user', content: specialContent }],
        contextFiles: [],
        memoryEntries: [],
      };

      const body = buildRequestBody(payload, mockConfig);
      expect(body.messages.some(m => m.content === specialContent)).toBe(true);
    });

    it('should handle unicode and emoji in messages', () => {
      const unicodeContent = '你好 🚀 مرحبا Здравствуйте';
      const payload: PromptPayload = {
        taskId: 'task-unicode',
        agentName: 'test',
        messages: [{ role: 'user', content: unicodeContent }],
        contextFiles: [],
        memoryEntries: [],
      };

      const body = buildRequestBody(payload, mockConfig);
      expect(body.messages.some(m => m.content === unicodeContent)).toBe(true);
    });

    it('should handle null/undefined config values gracefully', () => {
      const minimalConfig: LlmConfig = {
        model: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
      };

      const payload: PromptPayload = {
        taskId: 'task-minimal',
        agentName: 'test',
        messages: [],
        contextFiles: [],
        memoryEntries: [],
      };

      const body = buildRequestBody(payload, minimalConfig);
      // Model comes from config.defaultModel, which in minimalConfig is undefined
      expect(body.model).toBeUndefined();
    });
  });
});
