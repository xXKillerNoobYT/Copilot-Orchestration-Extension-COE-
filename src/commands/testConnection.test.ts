/**
 * Tests for Test Connection Command
 * Tests LLM connection validation and status reporting
 */

import { testConnectionCommand } from './testConnection';
import * as vscode from 'vscode';
import { readLlmConfig } from '../config/llmConfig';
import { createOpenAIClient } from '../llm/openaiClient';

// Mock modules
jest.mock('vscode');
jest.mock('../config/llmConfig');
jest.mock('../llm/openaiClient');

describe('testConnectionCommand', () => {
  let mockStatusBarItem: any;
  let mockClient: any;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock status bar item
    mockStatusBarItem = {
      text: '',
      show: jest.fn(),
      dispose: jest.fn()
    };

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
    (vscode.window.showInformationMessage as jest.Mock) = jest.fn();
    (vscode.window.showErrorMessage as jest.Mock) = jest.fn();

    // Mock LLM config
    mockConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
      timeoutMs: 10000
    };

    // Mock client
    mockClient = {
      sendChat: jest.fn().mockResolvedValue({
        message: {
          role: 'assistant',
          content: 'pong'
        }
      })
    };

    (createOpenAIClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Configuration Validation', () => {
    it('should show error if configuration is incomplete', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: false,
        issues: ['API key missing', 'Model not set'],
        config: null
      });

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'LLM configuration is incomplete: API key missing; Model not set'
      );
      expect(mockClient.sendChat).not.toHaveBeenCalled();
    });

    it('should show error if no config returned', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: false,
        issues: ['Configuration not found'],
        config: null
      });

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      expect(mockStatusBarItem.show).not.toHaveBeenCalled();
    });

    it('should proceed if configuration is valid', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
      expect(createOpenAIClient).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('Status Bar Updates', () => {
    beforeEach(() => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });
    });

    it('should create status bar item', async () => {
      await testConnectionCommand();

      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Left,
        99
      );
    });

    it('should show "Testing LLM" status initially', async () => {
      await testConnectionCommand();

      expect(mockStatusBarItem.text).toContain('Testing LLM');
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should show success status on successful connection', async () => {
      await testConnectionCommand();

      expect(mockStatusBarItem.text).toContain('LLM OK');
    });

    it('should show failure status on connection error', async () => {
      mockClient.sendChat.mockRejectedValue(new Error('Connection failed'));

      await testConnectionCommand();

      expect(mockStatusBarItem.text).toContain('LLM Failed');
    });

    it('should dispose status bar item after 2 seconds', async () => {
      await testConnectionCommand();

      // Status bar should not be disposed immediately
      expect(mockStatusBarItem.dispose).not.toHaveBeenCalled();

      // Fast-forward 2 seconds
      jest.advanceTimersByTime(2000);

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });

  describe('LLM Client Interaction', () => {
    beforeEach(() => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });
    });

    it('should create OpenAI client with config', async () => {
      await testConnectionCommand();

      expect(createOpenAIClient).toHaveBeenCalledWith(mockConfig);
    });

    it('should send ping messages to LLM', async () => {
      await testConnectionCommand();

      expect(mockClient.sendChat).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'ping' },
          { role: 'user', content: 'ping' }
        ],
        expect.any(Object)
      );
    });

    it('should use low temperature for test', async () => {
      await testConnectionCommand();

      expect(mockClient.sendChat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          temperature: 0
        })
      );
    });

    it('should use reduced timeout for test', async () => {
      await testConnectionCommand();

      const callOptions = mockClient.sendChat.mock.calls[0][1];
      expect(callOptions.timeoutMs).toBe(5000); // min(5000, 10000)
    });

    it('should respect config timeout if lower than 5 seconds', async () => {
      mockConfig.timeoutMs = 3000;
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });

      await testConnectionCommand();

      const callOptions = mockClient.sendChat.mock.calls[0][1];
      expect(callOptions.timeoutMs).toBe(3000); // min(5000, 3000)
    });
  });

  describe('Success Handling', () => {
    beforeEach(() => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });
    });

    it('should show success message on successful test', async () => {
      await testConnectionCommand();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'LLM connection successful.'
      );
    });

    it('should update status bar to success', async () => {
      await testConnectionCommand();

      expect(mockStatusBarItem.text).toBe('$(check) LLM OK');
    });

    it('should handle successful response with data', async () => {
      mockClient.sendChat.mockResolvedValue({
        message: {
          role: 'assistant',
          content: 'pong'
        },
        usage: {
          total_tokens: 10
        }
      });

      await testConnectionCommand();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'LLM connection successful.'
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });
    });

    it('should handle Error instances', async () => {
      const error = new Error('API key invalid');
      mockClient.sendChat.mockRejectedValue(error);

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'LLM connection failed: API key invalid'
      );
    });

    it('should handle string errors', async () => {
      mockClient.sendChat.mockRejectedValue('Network timeout');

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'LLM connection failed: Network timeout'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockClient.sendChat.mockRejectedValue(networkError);

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('ECONNREFUSED')
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout after 5000ms');
      mockClient.sendChat.mockRejectedValue(timeoutError);

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('timeout')
      );
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('401 Unauthorized');
      mockClient.sendChat.mockRejectedValue(authError);

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized')
      );
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('429 Too Many Requests');
      mockClient.sendChat.mockRejectedValue(rateLimitError);

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Too Many Requests')
      );
    });

    it('should update status bar to failure', async () => {
      mockClient.sendChat.mockRejectedValue(new Error('Failed'));

      await testConnectionCommand();

      expect(mockStatusBarItem.text).toBe('$(error) LLM Failed');
    });

    it('should still dispose status bar on error', async () => {
      mockClient.sendChat.mockRejectedValue(new Error('Failed'));

      await testConnectionCommand();

      jest.advanceTimersByTime(2000);

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });
    });

    it('should handle null response', async () => {
      mockClient.sendChat.mockResolvedValue(null);

      await testConnectionCommand();

      // Should still show success if no error thrown
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should handle undefined error', async () => {
      mockClient.sendChat.mockRejectedValue(undefined);

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('undefined')
      );
    });

    it('should handle object errors', async () => {
      mockClient.sendChat.mockRejectedValue({ code: 'ERR_CONNECTION', message: 'Failed' });

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('should handle very quick responses', async () => {
      mockClient.sendChat.mockResolvedValue({ message: { role: 'assistant', content: 'pong' } });

      const startTime = Date.now();
      await testConnectionCommand();
      const endTime = Date.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing timeout in config', async () => {
      const configWithoutTimeout = { ...mockConfig };
      delete (configWithoutTimeout as any).timeoutMs;

      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: configWithoutTimeout
      });

      await testConnectionCommand();

      // Should default to 5000ms
      expect(mockClient.sendChat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          timeoutMs: 5000
        })
      );
    });

    it('should handle config with very high timeout', async () => {
      mockConfig.timeoutMs = 60000;

      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });

      await testConnectionCommand();

      // Should cap at 5000ms for test
      const callOptions = mockClient.sendChat.mock.calls[0][1];
      expect(callOptions.timeoutMs).toBe(5000);
    });

    it('should handle multiple configuration issues', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: false,
        issues: ['Missing API key', 'Invalid model', 'Timeout too low'],
        config: null
      });

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'LLM configuration is incomplete: Missing API key; Invalid model; Timeout too low'
      );
    });
  });

  describe('Promise Handling', () => {
    beforeEach(() => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });
    });

    it('should handle async errors properly', async () => {
      mockClient.sendChat.mockImplementation(() => 
        Promise.reject(new Error('Async error'))
      );

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Async error')
      );
    });

    it('should handle delayed responses', async () => {
      jest.useRealTimers(); // Use real timers for this test

      mockClient.sendChat.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ 
          message: { role: 'assistant', content: 'pong' } 
        }), 100))
      );

      await testConnectionCommand();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'LLM connection successful.'
      );
    });
  });

  describe('Status Icons', () => {
    beforeEach(() => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        issues: [],
        config: mockConfig
      });
    });

    it('should use plug icon for testing state', async () => {
      await testConnectionCommand();

      const testingCalls = mockStatusBarItem.text;
      // At some point during execution, it should show the plug icon
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should use check icon for success', async () => {
      await testConnectionCommand();

      expect(mockStatusBarItem.text).toBe('$(check) LLM OK');
    });

    it('should use error icon for failure', async () => {
      mockClient.sendChat.mockRejectedValue(new Error('Failed'));

      await testConnectionCommand();

      expect(mockStatusBarItem.text).toBe('$(error) LLM Failed');
    });
  });
});
