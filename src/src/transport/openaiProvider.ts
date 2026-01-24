/**
 * OpenAI Provider Implementation
 */

import {
  LLMProvider,
  ChatMessage,
  ChatRequestOptions,
  ChatResponse,
  StreamChunk,
  ProviderConfig,
  RateLimiter,
  TokenCounter,
} from './llmTransport';

export class OpenAIProvider extends LLMProvider {
  private rateLimiter: RateLimiter;

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      defaultModel: config.defaultModel || 'gpt-4',
    });

    this.rateLimiter = new RateLimiter(
      config.rateLimit?.requestsPerMinute || 60,
      config.rateLimit?.tokensPerMinute || 90000
    );
  }

  async sendChat(messages: ChatMessage[], options?: ChatRequestOptions): Promise<ChatResponse> {
    return this.retryWithBackoff(async () => {
      // Check rate limit
      const estimatedTokens = TokenCounter.estimateMessagesTokens(messages);
      await this.rateLimiter.waitForLimit(estimatedTokens);

      const response = await this.makeRequest(messages, options);
      this.rateLimiter.recordRequest(response.usage?.totalTokens || estimatedTokens);

      return response;
    });
  }

  async sendChatStream(
    messages: ChatMessage[],
    options?: ChatRequestOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<ChatResponse> {
    return this.retryWithBackoff(async () => {
      const estimatedTokens = TokenCounter.estimateMessagesTokens(messages);
      await this.rateLimiter.waitForLimit(estimatedTokens);

      const response = await this.makeStreamRequest(messages, options, onChunk);
      this.rateLimiter.recordRequest(response.usage?.totalTokens || estimatedTokens);

      return response;
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const testMessage: ChatMessage = {
        role: 'user',
        content: 'test',
      };

      await this.sendChat([testMessage], { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }

  private async makeRequest(
    messages: ChatMessage[],
    options?: ChatRequestOptions
  ): Promise<ChatResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const body = {
      model: options?.model || this.config.defaultModel || 'gpt-4',
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      stream: false,
    };

    const fetchFn = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
    if (!fetchFn) {
      throw new Error('Fetch API not available');
    }

    const controller = new AbortController();
    const timeout = options?.timeout || this.config.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetchFn(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as ChatResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async makeStreamRequest(
    messages: ChatMessage[],
    options?: ChatRequestOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<ChatResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const body = {
      model: options?.model || this.config.defaultModel || 'gpt-4',
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      stream: true,
    };

    const fetchFn = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
    if (!fetchFn) {
      throw new Error('Fetch API not available');
    }

    const controller = new AbortController();
    const timeout = options?.timeout || this.config.timeout || 60000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetchFn(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      // Collect streamed chunks
      const chunks: StreamChunk[] = [];
      let fullContent = '';

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data) as StreamChunk;
                chunks.push(parsed);

                if (parsed.choices[0]?.delta?.content) {
                  fullContent += parsed.choices[0].delta.content;
                }

                if (onChunk) {
                  onChunk(parsed);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Convert streamed response to standard response
      const lastChunk = chunks[chunks.length - 1];
      return {
        id: lastChunk?.id || 'stream-response',
        model: lastChunk?.model || body.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: fullContent,
            },
            finishReason: 'stop',
          },
        ],
        usage: {
          promptTokens: TokenCounter.estimateMessagesTokens(messages),
          completionTokens: TokenCounter.estimateTokens(fullContent),
          totalTokens:
            TokenCounter.estimateMessagesTokens(messages) + TokenCounter.estimateTokens(fullContent),
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
