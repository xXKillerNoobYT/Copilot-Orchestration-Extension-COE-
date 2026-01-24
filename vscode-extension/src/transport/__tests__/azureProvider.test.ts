/**
 * Azure OpenAI Provider Tests
 * Comprehensive coverage for Azure-specific URL formatting and auth headers
 */

import { AzureOpenAIProvider } from '../azureProvider';
import { ChatMessage, ChatResponse, ProviderConfig } from '../llmTransport';

// Mock global fetch
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

describe('AzureOpenAIProvider', () => {
  let provider: AzureOpenAIProvider;
  let config: ProviderConfig & { deploymentName: string; apiVersion?: string };

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      name: 'test-azure',
      baseUrl: 'https://test.openai.azure.com',
      apiKey: 'test-key-12345',
      deploymentName: 'gpt-4-deployment',
      apiVersion: '2024-02-01',
      defaultModel: 'gpt-4',
      timeout: 30000,
    };

    provider = new AzureOpenAIProvider(config);
  });

  describe('constructor', () => {
    it('should initialize with deployment name and API version', () => {
      expect(provider).toBeInstanceOf(AzureOpenAIProvider);
      expect((provider as any).deploymentName).toBe('gpt-4-deployment');
      expect((provider as any).apiVersion).toBe('2024-02-01');
    });

    it('should use default API version if not provided', () => {
      const configWithoutVersion = { ...config };
      delete configWithoutVersion.apiVersion;
      
      const providerWithDefault = new AzureOpenAIProvider(configWithoutVersion);
      expect((providerWithDefault as any).apiVersion).toBe('2024-02-01');
    });

    it('should set deployment name as default model', () => {
      expect((provider as any).config.defaultModel).toBe('gpt-4-deployment');
    });
  });

  describe('getEndpointUrl', () => {
    it('should format Azure-specific URL with deployment and API version', () => {
      const url = (provider as any).getEndpointUrl();
      expect(url).toBe(
        'https://test.openai.azure.com/openai/deployments/gpt-4-deployment/chat/completions?api-version=2024-02-01'
      );
    });

    it('should handle custom API version', () => {
      const customConfig = {
        ...config,
        apiVersion: '2023-12-01-preview',
      };
      const customProvider = new AzureOpenAIProvider(customConfig);
      const url = (customProvider as any).getEndpointUrl();
      
      expect(url).toContain('api-version=2023-12-01-preview');
    });

    it('should include deployment name in URL path', () => {
      const url = (provider as any).getEndpointUrl();
      expect(url).toContain('/deployments/gpt-4-deployment/');
    });
  });

  describe('getHeaders', () => {
    it('should use api-key header instead of Authorization', () => {
      const headers = (provider as any).getHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'api-key': 'test-key-12345',
      });
      expect(headers).not.toHaveProperty('Authorization');
    });

    it('should include api-key when provided', () => {
      const headers = (provider as any).getHeaders();
      expect(headers['api-key']).toBe('test-key-12345');
    });

    it('should not include api-key if not provided', () => {
      const configWithoutKey = { ...config };
      delete configWithoutKey.apiKey;
      
      const providerWithoutKey = new AzureOpenAIProvider(configWithoutKey);
      const headers = (providerWithoutKey as any).getHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(headers).not.toHaveProperty('api-key');
    });

    it('should always include Content-Type', () => {
      const headers = (provider as any).getHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('sendChat integration', () => {
    it('should handle Azure API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      await expect(provider.sendChat(messages)).rejects.toThrow();
    });
  });

  describe('testConnection', () => {
    it('should successfully test Azure connection', async () => {
      const mockResponse: ChatResponse = {
        id: 'test-id',
        model: 'gpt-4-deployment',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'test' },
            finishReason: 'stop',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('test-azure');
    });
  });

  describe('edge cases', () => {
    it('should handle different deployment name formats', () => {
      const deploymentNames = [
        'gpt-4',
        'gpt-35-turbo',
        'my-custom-model-v2',
        'model_with_underscores',
      ];

      deploymentNames.forEach((deploymentName) => {
        const testConfig = { ...config, deploymentName };
        const testProvider = new AzureOpenAIProvider(testConfig);
        const url = (testProvider as any).getEndpointUrl();
        
        expect(url).toContain(`/deployments/${deploymentName}/`);
      });
    });

    it('should handle different base URLs', () => {
      const baseUrls = [
        'https://test.openai.azure.com',
        'https://prod.openai.azure.com',
        'https://custom.azure.com',
      ];

      baseUrls.forEach((baseUrl) => {
        const testConfig = { ...config, baseUrl };
        const testProvider = new AzureOpenAIProvider(testConfig);
        const url = (testProvider as any).getEndpointUrl();
        
        expect(url).toContain(baseUrl);
      });
    });

    it('should maintain Azure format with various API versions', () => {
      const apiVersions = [
        '2023-05-15',
        '2023-12-01-preview',
        '2024-02-01',
        '2024-03-01-preview',
      ];

      apiVersions.forEach((apiVersion) => {
        const testConfig = { ...config, apiVersion };
        const testProvider = new AzureOpenAIProvider(testConfig);
        const url = (testProvider as any).getEndpointUrl();
        
        expect(url).toContain(`api-version=${apiVersion}`);
      });
    });
  });
});
