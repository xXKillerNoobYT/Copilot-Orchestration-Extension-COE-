/**
 * Comprehensive Unit Tests for TransportManager
 * Tests provider factory, fallback logic, message routing, and error handling
 */

import { TransportManager, ProviderFactory, ProviderType, TransportConfig } from './TransportManager';
import { OpenAIProvider } from './openaiProvider';
import { AzureOpenAIProvider } from './azureProvider';
import { LMStudioProvider } from './lmstudioProvider';
import { ChatMessage, ChatResponse, StreamChunk, ProviderConfig } from './llmTransport';

// Mock all provider implementations
jest.mock('./openaiProvider');
jest.mock('./azureProvider');
jest.mock('./lmstudioProvider');

describe('ProviderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Creation', () => {
    it('should create OpenAI provider', () => {
      const config: ProviderConfig = {
        name: 'test-openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        defaultModel: 'gpt-4'
      };

      const provider = ProviderFactory.createProvider('openai', config);

      expect(OpenAIProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Azure OpenAI provider with deployment name', () => {
      const config = {
        name: 'test-azure',
        baseUrl: 'https://test.openai.azure.com',
        apiKey: 'test-key',
        deploymentName: 'gpt-4-deployment',
        apiVersion: '2024-02-15-preview'
      };

      const provider = ProviderFactory.createProvider('azure', config);

      expect(AzureOpenAIProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(AzureOpenAIProvider);
    });

    it('should create LMStudio provider', () => {
      const config: ProviderConfig = {
        name: 'test-lmstudio',
        baseUrl: 'http://localhost:1234/v1',
        defaultModel: 'local-model'
      };

      const provider = ProviderFactory.createProvider('lmstudio', config);

      expect(LMStudioProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(LMStudioProvider);
    });

    it('should throw error for unknown provider type', () => {
      const config: ProviderConfig = {
        name: 'test-unknown',
        baseUrl: 'https://example.com'
      };

      expect(() => {
        ProviderFactory.createProvider('unknown' as ProviderType, config);
      }).toThrow('Unknown provider type: unknown');
    });

    it('should throw error for Azure provider without deployment name', () => {
      const config: ProviderConfig = {
        name: 'test-azure',
        baseUrl: 'https://test.openai.azure.com',
        apiKey: 'test-key'
      };

      expect(() => {
        ProviderFactory.createProvider('azure', config);
      }).toThrow('Azure provider requires deploymentName');
    });
  });
});

describe('TransportManager', () => {
  let mockOpenAIProvider: jest.Mocked<OpenAIProvider>;
  let mockAzureProvider: jest.Mocked<AzureOpenAIProvider>;
  let mockLMStudioProvider: jest.Mocked<LMStudioProvider>;

  const mockChatResponse: ChatResponse = {
    id: 'chatcmpl-123',
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'Test response'
        },
        finishReason: 'stop'
      }
    ],
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock provider instances
    mockOpenAIProvider = {
      sendChat: jest.fn(),
      sendChatStream: jest.fn(),
      testConnection: jest.fn(),
      getName: jest.fn().mockReturnValue('OpenAI Provider')
    } as any;

    mockAzureProvider = {
      sendChat: jest.fn(),
      sendChatStream: jest.fn(),
      testConnection: jest.fn(),
      getName: jest.fn().mockReturnValue('Azure Provider')
    } as any;

    mockLMStudioProvider = {
      sendChat: jest.fn(),
      sendChatStream: jest.fn(),
      testConnection: jest.fn(),
      getName: jest.fn().mockReturnValue('LMStudio Provider')
    } as any;

    // Configure mocks to return our instances
    (OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>).mockImplementation(() => mockOpenAIProvider);
    (AzureOpenAIProvider as jest.MockedClass<typeof AzureOpenAIProvider>).mockImplementation(() => mockAzureProvider);
    (LMStudioProvider as jest.MockedClass<typeof LMStudioProvider>).mockImplementation(() => mockLMStudioProvider);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with primary provider only', () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      };

      const manager = new TransportManager(config);

      expect(OpenAIProvider).toHaveBeenCalledWith(config.config);
      expect(manager.getPrimaryProvider()).toBe(mockOpenAIProvider);
      expect(manager.getAllProviders()).toHaveLength(1);
    });

    it('should initialize with primary and fallback providers', () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'azure',
            config: {
              name: 'fallback-azure',
              baseUrl: 'https://test.openai.azure.com',
              apiKey: 'azure-key',
              deploymentName: 'gpt-4-deployment'
            }
          },
          {
            providerType: 'lmstudio',
            config: {
              name: 'fallback-lmstudio',
              baseUrl: 'http://localhost:1234/v1'
            }
          }
        ]
      };

      const manager = new TransportManager(config);

      expect(OpenAIProvider).toHaveBeenCalledTimes(1);
      expect(AzureOpenAIProvider).toHaveBeenCalledTimes(1);
      expect(LMStudioProvider).toHaveBeenCalledTimes(1);
      expect(manager.getAllProviders()).toHaveLength(3);
    });

    it('should handle empty fallback providers array', () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: []
      };

      const manager = new TransportManager(config);

      expect(manager.getAllProviders()).toHaveLength(1);
    });
  });

  describe('sendChat - Message Routing', () => {
    let manager: TransportManager;
    const testMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    beforeEach(() => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      };
      manager = new TransportManager(config);
    });

    it('should send chat through primary provider successfully', async () => {
      mockOpenAIProvider.sendChat.mockResolvedValue(mockChatResponse);

      const response = await manager.sendChat(testMessages);

      expect(mockOpenAIProvider.sendChat).toHaveBeenCalledWith(testMessages);
      expect(response).toEqual(mockChatResponse);
    });

    it('should pass options to provider', async () => {
      const options = {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 1000
      };
      mockOpenAIProvider.sendChat.mockResolvedValue(mockChatResponse);

      await manager.sendChat(testMessages, options);

      expect(mockOpenAIProvider.sendChat).toHaveBeenCalledWith(testMessages, options);
    });

    it('should handle primary provider returning error response', async () => {
      const errorResponse: ChatResponse = {
        ...mockChatResponse,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Error occurred' },
          finishReason: 'error'
        }]
      };
      mockOpenAIProvider.sendChat.mockResolvedValue(errorResponse);

      const response = await manager.sendChat(testMessages);

      expect(response).toEqual(errorResponse);
    });
  });

  describe('sendChat - Fallback Logic', () => {
    let manager: TransportManager;
    const testMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    beforeEach(() => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'azure',
            config: {
              name: 'fallback-azure',
              baseUrl: 'https://test.openai.azure.com',
              apiKey: 'azure-key',
              deploymentName: 'gpt-4-deployment'
            }
          }
        ]
      };
      manager = new TransportManager(config);

      // Mock console.warn to avoid noise in test output
      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fallback to secondary provider on primary failure', async () => {
      mockOpenAIProvider.sendChat.mockRejectedValue(new Error('Primary failed'));
      mockAzureProvider.sendChat.mockResolvedValue(mockChatResponse);

      const response = await manager.sendChat(testMessages);

      expect(mockOpenAIProvider.sendChat).toHaveBeenCalled();
      expect(mockAzureProvider.sendChat).toHaveBeenCalled();
      expect(response).toEqual(mockChatResponse);
      expect(console.warn).toHaveBeenCalledWith('Provider OpenAI Provider failed, trying next...');
    });

    it('should attempt all providers before throwing error', async () => {
      const primaryError = new Error('Primary failed');
      const fallbackError = new Error('Fallback failed');

      mockOpenAIProvider.sendChat.mockRejectedValue(primaryError);
      mockAzureProvider.sendChat.mockRejectedValue(fallbackError);

      await expect(manager.sendChat(testMessages)).rejects.toThrow('Fallback failed');
      expect(mockOpenAIProvider.sendChat).toHaveBeenCalled();
      expect(mockAzureProvider.sendChat).toHaveBeenCalled();
    });

    it('should convert non-Error exceptions to Error objects', async () => {
      mockOpenAIProvider.sendChat.mockRejectedValue('String error');
      mockAzureProvider.sendChat.mockResolvedValue(mockChatResponse);

      const response = await manager.sendChat(testMessages);

      expect(response).toEqual(mockChatResponse);
      expect(console.warn).toHaveBeenCalledWith('Provider OpenAI Provider failed, trying next...');
    });

    it('should throw last error when all providers fail', async () => {
      const primaryError = new Error('Primary failed');
      const fallbackError = new Error('Fallback also failed');

      mockOpenAIProvider.sendChat.mockRejectedValue(primaryError);
      mockAzureProvider.sendChat.mockRejectedValue(fallbackError);

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await expect(manager.sendChat(messages)).rejects.toThrow('Fallback also failed');
      expect(mockOpenAIProvider.sendChat).toHaveBeenCalled();
      expect(mockAzureProvider.sendChat).toHaveBeenCalled();
    });
  });

  describe('sendChatStream - Streaming Message Routing', () => {
    let manager: TransportManager;
    const testMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    beforeEach(() => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      };
      manager = new TransportManager(config);
    });

    it('should send streaming chat through primary provider successfully', async () => {
      mockOpenAIProvider.sendChatStream.mockResolvedValue(mockChatResponse);

      const response = await manager.sendChatStream(testMessages);

      expect(mockOpenAIProvider.sendChatStream).toHaveBeenCalledWith(testMessages);
      expect(response).toEqual(mockChatResponse);
    });

    it('should pass options and onChunk callback to provider', async () => {
      const options = { temperature: 0.5 };
      const onChunk = jest.fn();
      mockOpenAIProvider.sendChatStream.mockResolvedValue(mockChatResponse);

      await manager.sendChatStream(testMessages, options, onChunk);

      expect(mockOpenAIProvider.sendChatStream).toHaveBeenCalledWith(testMessages, options, onChunk);
    });

    it('should handle streaming chunks via callback', async () => {
      const onChunk = jest.fn();
      const chunk: StreamChunk = {
        id: 'chunk-1',
        model: 'gpt-4',
        choices: [{
          index: 0,
          delta: { content: 'Test' },
          finishReason: null
        }]
      };

      mockOpenAIProvider.sendChatStream.mockImplementation(async (msgs, opts, callback) => {
        if (callback) {
          callback(chunk);
        }
        return mockChatResponse;
      });

      await manager.sendChatStream(testMessages, undefined, onChunk);

      expect(onChunk).toHaveBeenCalledWith(chunk);
    });
  });

  describe('sendChatStream - Fallback Logic', () => {
    let manager: TransportManager;
    const testMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    beforeEach(() => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'lmstudio',
            config: {
              name: 'fallback-lmstudio',
              baseUrl: 'http://localhost:1234/v1'
            }
          }
        ]
      };
      manager = new TransportManager(config);

      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fallback to secondary provider on streaming failure', async () => {
      mockOpenAIProvider.sendChatStream.mockRejectedValue(new Error('Stream failed'));
      mockLMStudioProvider.sendChatStream.mockResolvedValue(mockChatResponse);

      const response = await manager.sendChatStream(testMessages);

      expect(mockOpenAIProvider.sendChatStream).toHaveBeenCalled();
      expect(mockLMStudioProvider.sendChatStream).toHaveBeenCalled();
      expect(response).toEqual(mockChatResponse);
    });

    it('should throw error when all streaming providers fail', async () => {
      const streamError = new Error('All streams failed');
      mockOpenAIProvider.sendChatStream.mockRejectedValue(streamError);
      mockLMStudioProvider.sendChatStream.mockRejectedValue(streamError);

      await expect(manager.sendChatStream(testMessages)).rejects.toThrow('All streams failed');
    });

    it('should preserve onChunk callback across fallback attempts', async () => {
      const onChunk = jest.fn();
      const chunk: StreamChunk = {
        id: 'chunk-1',
        model: 'gpt-4',
        choices: [{
          index: 0,
          delta: { content: 'Fallback' },
          finishReason: null
        }]
      };

      mockOpenAIProvider.sendChatStream.mockRejectedValue(new Error('Primary stream failed'));
      mockLMStudioProvider.sendChatStream.mockImplementation(async (msgs, opts, callback) => {
        if (callback) {
          callback(chunk);
        }
        return mockChatResponse;
      });

      await manager.sendChatStream(testMessages, undefined, onChunk);

      expect(onChunk).toHaveBeenCalledWith(chunk);
    });
  });

  describe('testAllConnections - Connection Testing', () => {
    it('should test connection for primary provider only', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      };
      const manager = new TransportManager(config);

      mockOpenAIProvider.testConnection.mockResolvedValue(true);

      const results = await manager.testAllConnections();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        provider: 'OpenAI Provider',
        connected: true
      });
    });

    it('should test connections for all providers', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'azure',
            config: {
              name: 'fallback-azure',
              baseUrl: 'https://test.openai.azure.com',
              apiKey: 'azure-key',
              deploymentName: 'gpt-4'
            }
          },
          {
            providerType: 'lmstudio',
            config: {
              name: 'fallback-lmstudio',
              baseUrl: 'http://localhost:1234/v1'
            }
          }
        ]
      };
      const manager = new TransportManager(config);

      mockOpenAIProvider.testConnection.mockResolvedValue(true);
      mockAzureProvider.testConnection.mockResolvedValue(true);
      mockLMStudioProvider.testConnection.mockResolvedValue(false);

      const results = await manager.testAllConnections();

      expect(results).toHaveLength(3);
      expect(results).toEqual([
        { provider: 'OpenAI Provider', connected: true },
        { provider: 'Azure Provider', connected: true },
        { provider: 'LMStudio Provider', connected: false }
      ]);
    });

    it('should handle connection test failures gracefully', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      };
      const manager = new TransportManager(config);

      mockOpenAIProvider.testConnection.mockResolvedValue(false);

      const results = await manager.testAllConnections();

      expect(results[0].connected).toBe(false);
    });

    it('should test all connections in parallel', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'azure',
            config: {
              name: 'fallback-azure',
              baseUrl: 'https://test.openai.azure.com',
              apiKey: 'azure-key',
              deploymentName: 'gpt-4'
            }
          }
        ]
      };
      const manager = new TransportManager(config);

      // Add delays to verify parallel execution
      mockOpenAIProvider.testConnection.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      mockAzureProvider.testConnection.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      const startTime = Date.now();
      await manager.testAllConnections();
      const duration = Date.now() - startTime;

      // If run in parallel, should complete in ~100ms, not ~200ms
      expect(duration).toBeLessThan(150); // Allow some margin
    });
  });

  describe('Provider Access Methods', () => {
    let manager: TransportManager;

    beforeEach(() => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'azure',
            config: {
              name: 'fallback-azure',
              baseUrl: 'https://test.openai.azure.com',
              apiKey: 'azure-key',
              deploymentName: 'gpt-4'
            }
          }
        ]
      };
      manager = new TransportManager(config);
    });

    it('should return primary provider via getPrimaryProvider', () => {
      const primary = manager.getPrimaryProvider();

      expect(primary).toBe(mockOpenAIProvider);
    });

    it('should return all providers via getAllProviders', () => {
      const allProviders = manager.getAllProviders();

      expect(allProviders).toHaveLength(2);
      expect(allProviders[0]).toBe(mockOpenAIProvider);
      expect(allProviders[1]).toBe(mockAzureProvider);
    });

    it('should return providers in correct order (primary first)', () => {
      const allProviders = manager.getAllProviders();

      expect(allProviders[0]).toBe(manager.getPrimaryProvider());
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle providers that throw non-standard errors', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'azure',
            config: {
              name: 'fallback-azure',
              baseUrl: 'https://test.openai.azure.com',
              apiKey: 'azure-key',
              deploymentName: 'gpt-4'
            }
          }
        ]
      };
      const manager = new TransportManager(config);

      jest.spyOn(console, 'warn').mockImplementation();

      // Primary throws a number
      mockOpenAIProvider.sendChat.mockRejectedValue(404);
      mockAzureProvider.sendChat.mockResolvedValue(mockChatResponse);

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      const response = await manager.sendChat(messages);

      expect(response).toEqual(mockChatResponse);
      jest.restoreAllMocks();
    });

    it('should handle undefined error messages gracefully', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      };
      const manager = new TransportManager(config);

      jest.spyOn(console, 'warn').mockImplementation();

      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = '';
      mockOpenAIProvider.sendChat.mockRejectedValue(errorWithoutMessage);

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await expect(manager.sendChat(messages)).rejects.toThrow();

      jest.restoreAllMocks();
    });

    it('should handle empty messages array', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      };
      const manager = new TransportManager(config);

      mockOpenAIProvider.sendChat.mockResolvedValue(mockChatResponse);

      const emptyMessages: ChatMessage[] = [];
      await manager.sendChat(emptyMessages);

      expect(mockOpenAIProvider.sendChat).toHaveBeenCalledWith(emptyMessages);
    });

    it('should handle multiple consecutive failures and successes', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      };
      const manager = new TransportManager(config);

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];

      // First call fails
      mockOpenAIProvider.sendChat.mockRejectedValueOnce(new Error('Temporary failure'));
      await expect(manager.sendChat(messages)).rejects.toThrow('Temporary failure');

      // Second call succeeds
      mockOpenAIProvider.sendChat.mockResolvedValueOnce(mockChatResponse);
      const response = await manager.sendChat(messages);
      expect(response).toEqual(mockChatResponse);
    });
  });

  describe('Complex Fallback Scenarios', () => {
    it('should try all three providers in order', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'azure',
            config: {
              name: 'fallback-azure',
              baseUrl: 'https://test.openai.azure.com',
              apiKey: 'azure-key',
              deploymentName: 'gpt-4'
            }
          },
          {
            providerType: 'lmstudio',
            config: {
              name: 'fallback-lmstudio',
              baseUrl: 'http://localhost:1234/v1'
            }
          }
        ]
      };
      const manager = new TransportManager(config);

      jest.spyOn(console, 'warn').mockImplementation();

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];

      mockOpenAIProvider.sendChat.mockRejectedValue(new Error('OpenAI failed'));
      mockAzureProvider.sendChat.mockRejectedValue(new Error('Azure failed'));
      mockLMStudioProvider.sendChat.mockResolvedValue(mockChatResponse);

      const response = await manager.sendChat(messages);

      expect(mockOpenAIProvider.sendChat).toHaveBeenCalled();
      expect(mockAzureProvider.sendChat).toHaveBeenCalled();
      expect(mockLMStudioProvider.sendChat).toHaveBeenCalled();
      expect(response).toEqual(mockChatResponse);

      jest.restoreAllMocks();
    });

    it('should stop at first successful provider', async () => {
      const config: TransportConfig = {
        providerType: 'openai',
        config: {
          name: 'primary-openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        },
        fallbackProviders: [
          {
            providerType: 'azure',
            config: {
              name: 'fallback-azure',
              baseUrl: 'https://test.openai.azure.com',
              apiKey: 'azure-key',
              deploymentName: 'gpt-4'
            }
          },
          {
            providerType: 'lmstudio',
            config: {
              name: 'fallback-lmstudio',
              baseUrl: 'http://localhost:1234/v1'
            }
          }
        ]
      };
      const manager = new TransportManager(config);

      jest.spyOn(console, 'warn').mockImplementation();

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];

      mockOpenAIProvider.sendChat.mockRejectedValue(new Error('OpenAI failed'));
      mockAzureProvider.sendChat.mockResolvedValue(mockChatResponse);
      mockLMStudioProvider.sendChat.mockResolvedValue(mockChatResponse);

      const response = await manager.sendChat(messages);

      expect(mockOpenAIProvider.sendChat).toHaveBeenCalled();
      expect(mockAzureProvider.sendChat).toHaveBeenCalled();
      expect(mockLMStudioProvider.sendChat).not.toHaveBeenCalled(); // Should stop at Azure
      expect(response).toEqual(mockChatResponse);

      jest.restoreAllMocks();
    });
  });
});
