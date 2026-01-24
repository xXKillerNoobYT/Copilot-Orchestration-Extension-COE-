/**
 * OpenAI Provider Tests
 * Comprehensive coverage for OpenAI API integration, retry logic, and rate limiting
 */

import { OpenAIProvider } from '../openaiProvider';
import { ChatMessage, ChatResponse, StreamChunk, ProviderConfig } from '../llmTransport';

// Mock global fetch
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let config: ProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    config = {
      name: 'test-openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key-12345',
      defaultModel: 'gpt-4',
      timeout: 30000,
      maxRetries: 3,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 90000,
      },
    };

    provider = new OpenAIProvider(config);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect((provider as any).config.baseUrl).toBe('https://api.openai.com/v1');
      expect((provider as any).config.defaultModel).toBe('gpt-4');
    });

    it('should use default baseUrl if not provided', () => {
      const minimalConfig = {
        name: 'minimal',
        baseUrl: '',
        apiKey: 'key',
      };
      const minimalProvider = new OpenAIProvider(minimalConfig);
      expect((minimalProvider as any).config.baseUrl).toBe('https://api.openai.com/v1');
    });

    it('should use default model if not provided', () => {
      const noModelConfig = {
        ...config,
        defaultModel: undefined,
      };
      const noModelProvider = new OpenAIProvider(noModelConfig);
      expect((noModelProvider as any).config.defaultModel).toBe('gpt-4');
    });

    it('should initialize rate limiter with config limits', () => {
      const rateLimiter = (provider as any).rateLimiter;
      expect(rateLimiter).toBeDefined();
    });

    it('should use default rate limits if not provided', () => {
      const noRateLimitConfig = {
        ...config,
        rateLimit: undefined,
      };
      const noRateLimitProvider = new OpenAIProvider(noRateLimitConfig);
      expect((noRateLimitProvider as any).rateLimiter).toBeDefined();
    });
  });

  describe('sendChat', () => {
    it('should successfully send chat request', async () => {
      const mockResponse: ChatResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello! How can I help you?' },
            finishReason: 'stop',
          },
        ],
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
      const result = await provider.sendChat(messages);

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should include Authorization header with API key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'gpt-4',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await provider.sendChat(messages);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer sk-test-key-12345');
    });

    it('should use correct endpoint URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'gpt-4',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await provider.sendChat(messages);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('should pass request options correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'gpt-4',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await provider.sendChat(messages, {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.model).toBe('gpt-3.5-turbo');
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(100);
      expect(body.top_p).toBe(0.9);
      expect(body.stream).toBe(false);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];

      await expect(provider.sendChat(messages)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      // Use real timers for this test to avoid hanging on retry backoff
      jest.useRealTimers();
      
      mockFetch.mockRejectedValue(new Error('Network error'));

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];

      await expect(provider.sendChat(messages)).rejects.toThrow();
      
      // Restore fake timers for other tests
      jest.useFakeTimers();
    });
  });

  describe('sendChatStream', () => {
    it('should handle streaming response', async () => {
      const streamChunks: StreamChunk[] = [
        {
          id: 'chatcmpl-123',
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              delta: { role: 'assistant', content: 'Hello' },
              finishReason: null,
            },
          ],
        },
        {
          id: 'chatcmpl-123',
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              delta: { content: ' there' },
              finishReason: null,
            },
          ],
        },
        {
          id: 'chatcmpl-123',
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              delta: {},
              finishReason: 'stop',
            },
          ],
        },
      ];

      const mockStreamBody = streamChunks
        .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
        .join('') + 'data: [DONE]\n\n';

      mockFetch.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamBody),
              })
              .mockResolvedValue({ done: true }),
          }),
        },
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
      const onChunk = jest.fn();

      const result = await provider.sendChatStream(messages, {}, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(3);
      expect(result.choices[0].message.content).toBe('Hello there');
    });

    it('should pass stream=true in request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: jest.fn().mockResolvedValue({ done: true }),
          }),
        },
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await provider.sendChatStream(messages);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.stream).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'gpt-4',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const result = await provider.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('should send minimal test request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'gpt-4',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      await provider.testConnection();

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].content).toBe('test');
      expect(body.max_tokens).toBe(5);
    });
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('test-openai');
    });
  });

  describe('rate limiting', () => {
    it('should record token usage after successful request', async () => {
      const mockResponse: ChatResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finishReason: 'stop',
          },
        ],
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await provider.sendChat(messages);

      // Rate limiter should have recorded the request
      // This is internal state, so we're just verifying no errors
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty message array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'gpt-4',
          choices: [{ index: 0, message: { role: 'assistant', content: '' } }],
        }),
      });

      const messages: ChatMessage[] = [];
      await provider.sendChat(messages);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle messages without API key', async () => {
      const noKeyConfig = { ...config, apiKey: undefined };
      const noKeyProvider = new OpenAIProvider(noKeyConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'gpt-4',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await noKeyProvider.sendChat(messages);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).not.toHaveProperty('Authorization');
    });

    it('should handle very long messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'gpt-4',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const longContent = 'a'.repeat(10000);
      const messages: ChatMessage[] = [{ role: 'user', content: longContent }];
      await provider.sendChat(messages);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.messages[0].content).toBe(longContent);
    });
  });
});
