/**
 * Multi-provider LLM Transport Layer
 * Abstract interface for multiple LLM providers with retry, rate limiting, and streaming
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  timeout?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finishReason?: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finishReason?: string | null;
  }>;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

/**
 * Abstract LLM Provider interface
 */
export abstract class LLMProvider {
  protected config: ProviderConfig;
  protected retryPolicy: RetryPolicy;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.retryPolicy = {
      maxRetries: config.maxRetries || 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryableStatusCodes: [429, 500, 502, 503, 504],
    };
  }

  /**
   * Send a chat request
   */
  abstract sendChat(messages: ChatMessage[], options?: ChatRequestOptions): Promise<ChatResponse>;

  /**
   * Send a streaming chat request
   */
  abstract sendChatStream(
    messages: ChatMessage[],
    options?: ChatRequestOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<ChatResponse>;

  /**
   * Test connection to the provider
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get provider name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.retryPolicy.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryPolicy.initialDelayMs;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable || attempt === retries) {
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        await this.sleep(delay);
        delay = Math.min(delay * this.retryPolicy.backoffMultiplier, this.retryPolicy.maxDelayMs);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout') || message.includes('network') || message.includes('econnreset')) {
        return true;
      }
    }

    // Check for HTTP status codes (simplified - would need better error typing in production)
    const errorString = String(error);
    for (const code of this.retryPolicy.retryableStatusCodes) {
      if (errorString.includes(String(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter for API requests
 */
export class RateLimiter {
  private requestTimestamps: number[] = [];
  private tokenCounts: Array<{ timestamp: number; tokens: number }> = [];
  private requestsPerMinute: number;
  private tokensPerMinute: number;

  constructor(requestsPerMinute: number, tokensPerMinute: number) {
    this.requestsPerMinute = requestsPerMinute;
    this.tokensPerMinute = tokensPerMinute;
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(estimatedTokens: number = 0): Promise<boolean> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneMinuteAgo);
    this.tokenCounts = this.tokenCounts.filter((t) => t.timestamp > oneMinuteAgo);

    // Check request limit
    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      return false;
    }

    // Check token limit
    const recentTokens = this.tokenCounts.reduce((sum, t) => sum + t.tokens, 0);
    if (recentTokens + estimatedTokens > this.tokensPerMinute) {
      return false;
    }

    return true;
  }

  /**
   * Record a request
   */
  recordRequest(tokens: number = 0): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    if (tokens > 0) {
      this.tokenCounts.push({ timestamp: now, tokens });
    }
  }

  /**
   * Wait until rate limit allows request
   */
  async waitForLimit(estimatedTokens: number = 0): Promise<void> {
    while (!(await this.checkLimit(estimatedTokens))) {
      await this.sleep(1000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Token counter utility
 */
export class TokenCounter {
  /**
   * Estimate token count (simplified - in production would use tiktoken)
   */
  static estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for messages
   */
  static estimateMessagesTokens(messages: ChatMessage[]): number {
    return messages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);
  }
}
