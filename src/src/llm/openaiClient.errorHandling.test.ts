/**
 * Tests for enhanced error handling in OpenAI client
 * Focus: Timeout and TLS error messages with protocol validation
 */

import { createOpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';

// Mock global fetch
global.fetch = jest.fn();

describe('OpenAI Client - Enhanced Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Timeout errors with protocol warnings', () => {
    it('should include protocol warning when timeout occurs with HTTPS on localhost', async () => {
      const config: LlmConfig = {
        baseUrl: 'https://localhost:1234/v1',
        apiKey: '',
        defaultModel: 'test-model',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      // Mock fetch to simulate timeout (AbortError)
      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        /Request timeout.*Local LLM servers.*typically use HTTP/
      );
    });

    it('should include protocol warning when timeout occurs with HTTPS on 127.0.0.1', async () => {
      const config: LlmConfig = {
        baseUrl: 'https://127.0.0.1:1234/v1',
        apiKey: '',
        defaultModel: 'test-model',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        /Request timeout.*Local LLM servers.*typically use HTTP/
      );
    });

    it('should NOT include protocol warning when timeout occurs with HTTP on localhost', async () => {
      const config: LlmConfig = {
        baseUrl: 'http://localhost:1234/v1',
        apiKey: '',
        defaultModel: 'test-model',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        /Request timeout.*Check that the server is running/
      );
      
      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.not.toThrow(
        /Local LLM servers.*typically use HTTP/
      );
    });

    it('should NOT include protocol warning when timeout occurs with HTTPS on public domain', async () => {
      const config: LlmConfig = {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        /Request timeout.*Check that the server is running/
      );
      
      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.not.toThrow(
        /Local LLM servers.*typically use HTTP/
      );
    });
  });

  describe('TLS/SSL error detection', () => {
    it('should enhance SSL errors with helpful guidance', async () => {
      const config: LlmConfig = {
        baseUrl: 'https://localhost:1234/v1',
        apiKey: '',
        defaultModel: 'test-model',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      // Mock fetch to simulate SSL error
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('SSL handshake failed: self-signed certificate')
      );

      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        /TLS\/SSL error.*Local LLM servers use HTTP.*reverse proxy/
      );
    });

    it('should enhance TLS errors with helpful guidance', async () => {
      const config: LlmConfig = {
        baseUrl: 'https://localhost:1234/v1',
        apiKey: '',
        defaultModel: 'test-model',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('TLS connection failed')
      );

      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        /TLS\/SSL error.*Local LLM servers use HTTP.*reverse proxy/
      );
    });

    it('should enhance certificate errors with helpful guidance', async () => {
      const config: LlmConfig = {
        baseUrl: 'https://192.168.1.100:1234/v1',
        apiKey: '',
        defaultModel: 'test-model',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('CERT_INVALID: certificate is not valid')
      );

      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        /TLS\/SSL error.*Local LLM servers use HTTP.*reverse proxy/
      );
    });

    it('should not enhance non-TLS errors', async () => {
      const config: LlmConfig = {
        baseUrl: 'http://localhost:1234/v1',
        apiKey: '',
        defaultModel: 'test-model',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error: connection refused')
      );

      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        'Network error: connection refused'
      );
      
      await expect(client.sendChat([{ role: 'user', content: 'test' }])).rejects.not.toThrow(
        /TLS\/SSL error/
      );
    });
  });

  describe('Successful requests', () => {
    it('should not modify successful responses', async () => {
      const config: LlmConfig = {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        customModel: '',
        temperature: 0.7,
        timeoutMs: 5000,
        taskRoots: [],
      };

      const client = createOpenAIClient(config);

      const mockResponse = {
        id: 'test-id',
        choices: [
          {
            message: { role: 'assistant' as const, content: 'Hello!' },
            finish_reason: 'stop',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.sendChat([{ role: 'user', content: 'Hi' }]);
      expect(result).toEqual(mockResponse);
    });
  });
});
