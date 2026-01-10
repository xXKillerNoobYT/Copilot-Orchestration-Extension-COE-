/**
 * Provider Factory and Transport Manager
 */

import { LLMProvider, ProviderConfig } from './llmTransport';
import { OpenAIProvider } from './openaiProvider';
import { AzureOpenAIProvider } from './azureProvider';
import { LMStudioProvider } from './lmstudioProvider';

export type ProviderType = 'openai' | 'azure' | 'lmstudio';

export interface TransportConfig {
  providerType: ProviderType;
  config: ProviderConfig & { deploymentName?: string; apiVersion?: string };
  fallbackProviders?: Array<{
    providerType: ProviderType;
    config: ProviderConfig & { deploymentName?: string; apiVersion?: string };
  }>;
}

/**
 * Provider Factory
 */
export class ProviderFactory {
  static createProvider(
    type: ProviderType,
    config: ProviderConfig & { deploymentName?: string; apiVersion?: string }
  ): LLMProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'azure':
        if (!config.deploymentName) {
          throw new Error('Azure provider requires deploymentName');
        }
        return new AzureOpenAIProvider(config as ProviderConfig & { deploymentName: string });
      case 'lmstudio':
        return new LMStudioProvider(config);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

/**
 * Transport Manager with automatic fallback
 */
export class TransportManager {
  private primaryProvider: LLMProvider;
  private fallbackProviders: LLMProvider[];

  constructor(config: TransportConfig) {
    this.primaryProvider = ProviderFactory.createProvider(config.providerType, config.config);

    this.fallbackProviders = (config.fallbackProviders || []).map((fallback) =>
      ProviderFactory.createProvider(fallback.providerType, fallback.config)
    );
  }

  /**
   * Send chat with automatic fallback
   */
  async sendChat(...args: Parameters<LLMProvider['sendChat']>): Promise<ReturnType<LLMProvider['sendChat']>> {
    const providers = [this.primaryProvider, ...this.fallbackProviders];

    let lastError: Error | undefined;
    for (const provider of providers) {
      try {
        return await provider.sendChat(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Provider ${provider.getName()} failed, trying next...`);
      }
    }

    throw lastError || new Error('All providers failed');
  }

  /**
   * Send streaming chat with automatic fallback
   */
  async sendChatStream(
    ...args: Parameters<LLMProvider['sendChatStream']>
  ): Promise<ReturnType<LLMProvider['sendChatStream']>> {
    const providers = [this.primaryProvider, ...this.fallbackProviders];

    let lastError: Error | undefined;
    for (const provider of providers) {
      try {
        return await provider.sendChatStream(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Provider ${provider.getName()} failed, trying next...`);
      }
    }

    throw lastError || new Error('All providers failed');
  }

  /**
   * Test connection for all providers
   */
  async testAllConnections(): Promise<{ provider: string; connected: boolean }[]> {
    const providers = [this.primaryProvider, ...this.fallbackProviders];
    const results = await Promise.all(
      providers.map(async (provider) => ({
        provider: provider.getName(),
        connected: await provider.testConnection(),
      }))
    );
    return results;
  }

  /**
   * Get primary provider
   */
  getPrimaryProvider(): LLMProvider {
    return this.primaryProvider;
  }

  /**
   * Get all providers
   */
  getAllProviders(): LLMProvider[] {
    return [this.primaryProvider, ...this.fallbackProviders];
  }
}
