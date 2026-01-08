/**
 * Azure OpenAI Provider Implementation
 */

import { OpenAIProvider } from './openaiProvider';
import { ProviderConfig } from './llmTransport';

export class AzureOpenAIProvider extends OpenAIProvider {
  private deploymentName: string;
  private apiVersion: string;

  constructor(config: ProviderConfig & { deploymentName: string; apiVersion?: string }) {
    super({
      ...config,
      baseUrl: config.baseUrl,
      defaultModel: config.deploymentName,
    });

    this.deploymentName = config.deploymentName;
    this.apiVersion = config.apiVersion || '2024-02-01';
  }

  /**
   * Override to use Azure-specific URL format
   */
  protected getEndpointUrl(): string {
    return `${this.config.baseUrl}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;
  }

  /**
   * Override to use Azure-specific auth header
   */
  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['api-key'] = this.config.apiKey;
    }

    return headers;
  }
}
