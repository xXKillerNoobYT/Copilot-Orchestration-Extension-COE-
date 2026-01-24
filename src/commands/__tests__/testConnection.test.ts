import * as vscode from 'vscode';
import { testConnectionCommand } from '../testConnection';
import { readLlmConfig } from '../../config/llmConfig';
import { createOpenAIClient } from '../../llm/openaiClient';

jest.mock('vscode');
jest.mock('../../config/llmConfig');
jest.mock('../../llm/openaiClient');

describe('testConnection Command', () => {
  let mockStatusBarItem: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock status bar item
    mockStatusBarItem = {
      text: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    };

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

    // Mock LLM client
    mockClient = {
      sendChat: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'pong' } }] }),
    };
    (createOpenAIClient as jest.Mock).mockReturnValue(mockClient);
  });

  describe('Successful Connection', () => {
    it('should show status bar during connection test', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        config: {
          apiKey: 'test-key',
          endpoint: 'https://api.openai.com',
          model: 'gpt-4',
          timeoutMs: 30000,
        },
        issues: [],
      });

      await testConnectionCommand();

      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Left,
        99
      );
      expect(mockStatusBarItem.show).toHaveBeenCalled();
      expect(mockStatusBarItem.text).toBe('$(check) LLM OK');
    });

    it('should show success message on successful connection', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        config: {
          apiKey: 'test-key',
          endpoint: 'https://api.openai.com',
          model: 'gpt-4',
          timeoutMs: 30000,
        },
        issues: [],
      });

      await testConnectionCommand();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'LLM connection successful.'
      );
    });

    it('should call LLM client with correct parameters', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        config: {
          apiKey: 'test-key',
          endpoint: 'https://api.openai.com',
          model: 'gpt-4',
          timeoutMs: 30000,
        },
        issues: [],
      });

      await testConnectionCommand();

      expect(mockClient.sendChat).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'ping' },
          { role: 'user', content: 'ping' },
        ],
        { temperature: 0, timeoutMs: 5000 }
      );
    });
  });

  describe('Configuration Issues', () => {
    it('should show error when configuration is incomplete', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: false,
        issues: ['API key is missing', 'Endpoint is not configured'],
      });

      await testConnectionCommand();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'LLM configuration is incomplete: API key is missing; Endpoint is not configured'
      );
      expect(mockStatusBarItem.show).not.toHaveBeenCalled();
    });
  });

  describe('Connection Failure', () => {
    it('should show error message on connection failure', async () => {
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        config: {
          apiKey: 'test-key',
          endpoint: 'https://api.openai.com',
          model: 'gpt-4',
          timeoutMs: 30000,
        },
        issues: [],
      });
      mockClient.sendChat.mockRejectedValue(new Error('Network error'));

      await testConnectionCommand();

      expect(mockStatusBarItem.text).toBe('$(error) LLM Failed');
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'LLM connection failed: Network error'
      );
    });

    it('should dispose status bar item after timeout', async () => {
      jest.useFakeTimers();
      (readLlmConfig as jest.Mock).mockReturnValue({
        isConfigured: true,
        config: {
          apiKey: 'test-key',
          endpoint: 'https://api.openai.com',
          model: 'gpt-4',
          timeoutMs: 30000,
        },
        issues: [],
      });

      await testConnectionCommand();

      expect(mockStatusBarItem.dispose).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2000);
      expect(mockStatusBarItem.dispose).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
