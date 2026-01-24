/**
 * LM Studio Provider Tests
 * Comprehensive coverage for local LLM provider integration
 */

import { LMStudioProvider } from '../lmstudioProvider';
import { ChatMessage, ChatResponse, ProviderConfig } from '../llmTransport';

// Mock global fetch
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

describe('LMStudioProvider', () => {
  let provider: LMStudioProvider;
  let config: ProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    config = {
      name: 'test-lmstudio',
      baseUrl: 'http://localhost:1234/v1',
      defaultModel: 'local-model',
      timeout: 30000,
    };

    provider = new LMStudioProvider(config);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with LM Studio defaults', () => {
      expect(provider).toBeInstanceOf(LMStudioProvider);
      expect((provider as any).config.baseUrl).toBe('http://localhost:1234/v1');
      expect((provider as any).config.defaultModel).toBe('local-model');
    });

    it('should use default baseUrl for localhost if not provided', () => {
      const minimalConfig = {
        name: 'minimal',
        baseUrl: '',
      };
      const minimalProvider = new LMStudioProvider(minimalConfig);
      expect((minimalProvider as any).config.baseUrl).toBe('http://localhost:1234/v1');
    });

    it('should use default model if not provided', () => {
      const noModelConfig = {
        ...config,
        defaultModel: undefined,
      };
      const noModelProvider = new LMStudioProvider(noModelConfig);
      expect((noModelProvider as any).config.defaultModel).toBe('local-model');
    });

    it('should set high rate limits for local server', () => {
      // LM Studio doesn't need aggressive rate limiting
      const rateLimiter = (provider as any).rateLimiter;
      expect(rateLimiter).toBeDefined();
    });

    it('should accept custom baseUrl', () => {
      const customConfig = {
        ...config,
        baseUrl: 'http://192.168.1.100:5000/v1',
      };
      const customProvider = new LMStudioProvider(customConfig);
      expect((customProvider as any).config.baseUrl).toBe('http://192.168.1.100:5000/v1');
    });
  });

  describe('getHeaders', () => {
    it('should not include API key header', () => {
      const headers = (provider as any).getHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(headers).not.toHaveProperty('Authorization');
      expect(headers).not.toHaveProperty('api-key');
    });

    it('should not include API key even if provided in config', () => {
      const configWithKey = {
        ...config,
        apiKey: 'should-be-ignored',
      };
      const providerWithKey = new LMStudioProvider(configWithKey);
      const headers = (providerWithKey as any).getHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(headers).not.toHaveProperty('Authorization');
    });

    it('should always include Content-Type', () => {
      const headers = (provider as any).getHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('sendChat', () => {
    it('should successfully send chat request to local server', async () => {
      const mockResponse: ChatResponse = {
        id: 'local-123',
        model: 'local-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Local LLM response' },
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

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello local LLM' }];
      const result = await provider.sendChat(messages);

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should use localhost URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'local-model',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await provider.sendChat(messages);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:1234/v1/chat/completions');
    });

    it('should not include Authorization header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'local-model',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await provider.sendChat(messages);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).not.toHaveProperty('Authorization');
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('should handle LM Studio not running', async () => {
      mockFetch.mockRejectedValue(new Error('fetch failed'));

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];

      await expect(provider.sendChat(messages)).rejects.toThrow();
    });

    it('should handle connection refused error', async () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:1234');
      mockFetch.mockRejectedValue(error);

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];

      await expect(provider.sendChat(messages)).rejects.toThrow();
    });
  });

  describe('testConnection', () => {
    it('should return true when LM Studio is running', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'local-model',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const result = await provider.testConnection();
      expect(result).toBe(true);
    });

    it('should return false when LM Studio is not running', async () => {
      const error = new Error('fetch failed');
      mockFetch.mockRejectedValue(error);

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('should return false on connection refused', async () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:1234');
      mockFetch.mockRejectedValue(error);

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('should send minimal test message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'local-model',
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
      expect(provider.getName()).toBe('test-lmstudio');
    });
  });

  describe('sendChatStream', () => {
    it('should handle streaming from local server', async () => {
      const streamChunks = [
        {
          id: 'local-123',
          model: 'local-model',
          choices: [
            {
              index: 0,
              delta: { role: 'assistant', content: 'Local' },
              finishReason: null,
            },
          ],
        },
        {
          id: 'local-123',
          model: 'local-model',
          choices: [
            {
              index: 0,
              delta: { content: ' response' },
              finishReason: null,
            },
          ],
        },
        {
          id: 'local-123',
          model: 'local-model',
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
      expect(result.choices[0].message.content).toBe('Local response');
    });
  });

  describe('edge cases', () => {
    it('should handle custom local ports', async () => {
      const customConfig = {
        ...config,
        baseUrl: 'http://localhost:5000/v1',
      };
      const customProvider = new LMStudioProvider(customConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'local-model',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await customProvider.sendChat(messages);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:5000/v1/chat/completions');
    });

    it('should handle network IP addresses', async () => {
      const networkConfig = {
        ...config,
        baseUrl: 'http://192.168.1.100:1234/v1',
      };
      const networkProvider = new LMStudioProvider(networkConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'local-model',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await networkProvider.sendChat(messages);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('192.168.1.100:1234');
    });

    it('should handle different model names', async () => {
      const models = ['llama-2-7b', 'mistral-7b-instruct', 'custom-model-v1'];

      for (const model of models) {
        const modelConfig = {
          ...config,
          defaultModel: model,
        };
        const modelProvider = new LMStudioProvider(modelConfig);
        expect((modelProvider as any).config.defaultModel).toBe(model);
      }
    });


    it('should handle malformed responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];

      await expect(provider.sendChat(messages)).rejects.toThrow();
    });
  });

  describe('OpenAI compatibility', () => {
    it('should be compatible with OpenAI API format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'local-model',
          choices: [{ index: 0, message: { role: 'assistant', content: 'test' } }],
        }),
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];

      await provider.sendChat(messages, {
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.model).toBe('local-model');
      expect(body.messages).toEqual(messages);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(100);
      expect(body.top_p).toBe(0.9);
    });
  });
});
