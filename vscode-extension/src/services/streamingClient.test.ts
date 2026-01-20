/**
 * Tests for StreamingClient
 * 
 * Tests SSE streaming functionality with mock servers
 * Note: WebSocket tests are not included as WebSocket support is not yet implemented
 */

import { StreamingClient, createStreamingClient, StreamChunk, StreamCallbacks } from './streamingClient';
import { LlmConfig } from '../config/llmConfig';

// Mock fetch for SSE testing
global.fetch = jest.fn();

describe('StreamingClient', () => {
  let config: LlmConfig;
  let client: StreamingClient;

  beforeEach(() => {
    config = {
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'test-api-key',
      defaultModel: 'gpt-3.5-turbo',
      customModel: '',
      temperature: 0.7,
      timeoutMs: 30000,
      taskRoots: ['_ZENTASKS'],
    };
    client = createStreamingClient(config);
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.cancel();
  });

  describe('SSE Streaming', () => {
    it('should stream chat messages successfully', async () => {
      const mockResponseChunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      // Mock ReadableStream
      const mockStream = {
        getReader: () => {
          let index = 0;
          return {
            read: async () => {
              if (index >= mockResponseChunks.length) {
                return { done: true, value: undefined };
              }
              const chunk = mockResponseChunks[index++];
              const encoder = new TextEncoder();
              return { done: false, value: encoder.encode(chunk) };
            },
            releaseLock: jest.fn(),
          };
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
      });

      const chunks: StreamChunk[] = [];
      const callbacks: StreamCallbacks = {
        onChunk: (chunk) => chunks.push(chunk),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      await client.streamChat(
        [{ role: 'user', content: 'Test message' }],
        callbacks
      );

      // Verify chunks received
      expect(chunks.filter(c => c.type === 'text').length).toBeGreaterThan(0);
      expect(chunks.some(c => c.type === 'done')).toBe(true);

      // Verify completion callback
      expect(callbacks.onComplete).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();

      // Verify full response
      const fullResponse = client.getAccumulatedResponse();
      expect(fullResponse).toBe('Hello world!');
    });

    it('should handle stream errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const callbacks: StreamCallbacks = {
        onChunk: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      await expect(
        client.streamChat([{ role: 'user', content: 'Test' }], callbacks)
      ).rejects.toThrow('Network error');

      expect(callbacks.onError).toHaveBeenCalled();
      expect(callbacks.onComplete).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors (non-200 status)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const callbacks: StreamCallbacks = {
        onChunk: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      await expect(
        client.streamChat([{ role: 'user', content: 'Test' }], callbacks)
      ).rejects.toThrow('HTTP 500');

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should handle timeout correctly', async () => {
      const mockStream = {
        getReader: () => ({
          read: async () => {
            // Simulate slow response
            await new Promise(resolve => setTimeout(resolve, 100));
            return { done: false, value: new Uint8Array() };
          },
          releaseLock: jest.fn(),
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
      });

      const callbacks: StreamCallbacks = {
        onChunk: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      await expect(
        client.streamChat(
          [{ role: 'user', content: 'Test' }],
          callbacks,
          { timeoutMs: 50 } // Very short timeout
        )
      ).rejects.toThrow();

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should support cancellation', async () => {
      const mockStream = {
        getReader: () => ({
          read: async () => {
            // Simulate long-running stream
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { done: false, value: new Uint8Array() };
          },
          releaseLock: jest.fn(),
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
      });

      const callbacks: StreamCallbacks = {
        onChunk: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
        onCancel: jest.fn(),
      };

      // Start streaming
      const streamPromise = client.streamChat(
        [{ role: 'user', content: 'Test' }],
        callbacks
      );

      // Cancel after 100ms
      setTimeout(() => client.cancel(), 100);

      await streamPromise;

      expect(callbacks.onCancel).toHaveBeenCalled();
      expect(callbacks.onComplete).not.toHaveBeenCalled();
    });

    it('should accumulate response text correctly', async () => {
      const mockResponseChunks = [
        'data: {"choices":[{"delta":{"content":"Part 1"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" Part 2"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" Part 3"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      const mockStream = {
        getReader: () => {
          let index = 0;
          return {
            read: async () => {
              if (index >= mockResponseChunks.length) {
                return { done: true, value: undefined };
              }
              const chunk = mockResponseChunks[index++];
              const encoder = new TextEncoder();
              return { done: false, value: encoder.encode(chunk) };
            },
            releaseLock: jest.fn(),
          };
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
      });

      await client.streamChat(
        [{ role: 'user', content: 'Test' }],
        { onChunk: jest.fn(), onComplete: jest.fn() }
      );

      expect(client.getAccumulatedResponse()).toBe('Part 1 Part 2 Part 3');
    });

    it('should parse SSE data correctly with metadata', async () => {
      const mockResponseChunks = [
        'data: {"model":"gpt-3.5-turbo","choices":[{"delta":{"content":"Test"},"finish_reason":null}]}\n\n',
        'data: {"model":"gpt-3.5-turbo","choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
      ];

      const mockStream = {
        getReader: () => {
          let index = 0;
          return {
            read: async () => {
              if (index >= mockResponseChunks.length) {
                return { done: true, value: undefined };
              }
              const chunk = mockResponseChunks[index++];
              const encoder = new TextEncoder();
              return { done: false, value: encoder.encode(chunk) };
            },
            releaseLock: jest.fn(),
          };
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
      });

      const chunks: StreamChunk[] = [];
      await client.streamChat(
        [{ role: 'user', content: 'Test' }],
        {
          onChunk: (chunk) => chunks.push(chunk),
          onComplete: jest.fn()
        }
      );

      // Verify metadata is captured
      const textChunks = chunks.filter(c => c.type === 'text');
      expect(textChunks.length).toBeGreaterThan(0);
      expect(textChunks[0].metadata).toBeDefined();
      expect(textChunks[0].metadata?.model).toBe('gpt-3.5-turbo');
    });

    it('should handle incomplete SSE messages in buffer', async () => {
      const mockResponseChunks = [
        'data: {"choices":[{"delta":{"co',  // Incomplete
        'ntent":"Hello"}}]}\n\n',          // Completion
        'data: [DONE]\n\n',
      ];

      const mockStream = {
        getReader: () => {
          let index = 0;
          return {
            read: async () => {
              if (index >= mockResponseChunks.length) {
                return { done: true, value: undefined };
              }
              const chunk = mockResponseChunks[index++];
              const encoder = new TextEncoder();
              return { done: false, value: encoder.encode(chunk) };
            },
            releaseLock: jest.fn(),
          };
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
      });

      await client.streamChat(
        [{ role: 'user', content: 'Test' }],
        { onChunk: jest.fn(), onComplete: jest.fn() }
      );

      // Should successfully parse complete message
      expect(client.getAccumulatedResponse()).toBe('Hello');
    });
  });

  describe('Client State', () => {
    it('should report streaming status correctly', () => {
      expect(client.isStreaming()).toBe(false);
    });

    it('should initialize with empty accumulated response', () => {
      expect(client.getAccumulatedResponse()).toBe('');
    });

    it('should prevent concurrent streams on same client instance', async () => {
      const mockStream = {
        getReader: () => ({
          read: async () => {
            // Simulate long-running stream
            await new Promise(resolve => setTimeout(resolve, 100));
            return { done: false, value: new Uint8Array() };
          },
          releaseLock: jest.fn(),
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
      });

      // Start first stream
      const firstStream = client.streamChat(
        [{ role: 'user', content: 'Test' }],
        { onChunk: jest.fn(), onComplete: jest.fn() }
      );

      // Try to start second stream while first is active
      await expect(
        client.streamChat(
          [{ role: 'user', content: 'Test 2' }],
          { onChunk: jest.fn(), onComplete: jest.fn() }
        )
      ).rejects.toThrow('StreamingClient is already active');

      // Cancel first stream to cleanup
      client.cancel();
      await firstStream.catch(() => { }); // Ignore cancellation error
    });
  });

  describe('Factory Function', () => {
    it('should create client with config', () => {
      const newClient = createStreamingClient(config);
      expect(newClient).toBeInstanceOf(StreamingClient);
    });
  });
});
