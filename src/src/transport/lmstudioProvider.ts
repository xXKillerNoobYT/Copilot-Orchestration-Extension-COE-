/**
 * LM Studio Provider Implementation
 * LM Studio uses OpenAI-compatible API but typically runs locally
 */

import { OpenAIProvider } from './openaiProvider';
import { ProviderConfig } from './llmTransport';

export class LMStudioProvider extends OpenAIProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'http://localhost:1234/v1',
      defaultModel: config.defaultModel || 'local-model',
      // LM Studio typically doesn't need rate limiting
      rateLimit: {
        requestsPerMinute: 1000,
        tokensPerMinute: 1000000,
      },
    });
  }

  /**
   * Override headers - LM Studio doesn't require API key
   */
  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Test connection with local-specific logic
   */
  async testConnection(): Promise<boolean> {
    try {
      // LM Studio might not be running, so use a shorter timeout
      const testMessage = {
        role: 'user' as const,
        content: 'test',
      };

      await this.sendChat([testMessage], { maxTokens: 5, timeout: 3000 });
      return true;
    } catch (error) {
      // Check if it's a connection refused error (LM Studio not running)
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      if (errorMessage.includes('fetch') || errorMessage.includes('econnrefused')) {
        return false;
      }
      // Other errors might indicate LM Studio is running but had an issue
      return false;
    }
  }
}
