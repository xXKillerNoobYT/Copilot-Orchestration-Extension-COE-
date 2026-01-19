/**
 * Base class for MCP Server Handlers
 * Provides common functionality for backend integration, error handling, and WebSocket broadcasting
 */

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  timeout: number; // 30 seconds default
  retryAttempts: number; // 3 attempts default
  retryDelayMs: number; // Initial delay in ms
  useExponentialBackoff: boolean;
}

/**
 * Default error handling configuration
 * - 30 second timeout per request
 * - 3 retry attempts with exponential backoff
 */
export const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelayMs: 1000,
  useExponentialBackoff: true,
};

/**
 * Dead letter queue entry for failed requests
 */
export interface DeadLetterEntry {
  handler: string;
  args: any;
  error: string;
  timestamp: string;
  retryCount: number;
}

/**
 * Base handler class with common backend integration functionality
 */
export abstract class MCPHandlerBase {
  protected errorConfig: ErrorHandlingConfig;
  protected deadLetterQueue: DeadLetterEntry[] = [];

  constructor(errorConfig: ErrorHandlingConfig = DEFAULT_ERROR_CONFIG) {
    this.errorConfig = errorConfig;
  }

  /**
   * Execute a request with timeout, retry, and dead-letter queue handling
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    handlerName: string,
    args: any
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.errorConfig.retryAttempts; attempt++) {
      try {
        // Wrap operation with timeout
        const result = await this.withTimeout(operation(), this.errorConfig.timeout);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[${handlerName}] Attempt ${attempt + 1} failed:`, lastError.message);

        // If this is the last attempt, don't delay
        if (attempt < this.errorConfig.retryAttempts - 1) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed - add to dead letter queue
    this.addToDeadLetterQueue(handlerName, args, lastError!);

    throw new Error(
      `${handlerName} failed after ${this.errorConfig.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Wrap a promise with timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attemptNumber: number): number {
    if (!this.errorConfig.useExponentialBackoff) {
      return this.errorConfig.retryDelayMs;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    return this.errorConfig.retryDelayMs * Math.pow(2, attemptNumber);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add failed request to dead letter queue
   */
  private addToDeadLetterQueue(handler: string, args: any, error: Error): void {
    const entry: DeadLetterEntry = {
      handler,
      args,
      error: error.message,
      timestamp: new Date().toISOString(),
      retryCount: this.errorConfig.retryAttempts,
    };

    this.deadLetterQueue.push(entry);
    console.error('[DeadLetterQueue] Added entry:', entry);

    // Note: Dead letter entries are currently stored in-memory only.
    // Future enhancement: persist to SQLite audit_log table (see GitHub issue #XXX)
  }

  /**
   * Format successful response for MCP protocol
   */
  protected formatSuccess(data: any): { content: Array<{ type: string; text: string }> } {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  /**
   * Format error response for MCP protocol
   */
  protected formatError(error: Error | string, context?: any): { content: Array<{ type: string; text: string }> } {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorData = {
      error: errorMessage,
      context,
      timestamp: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(errorData, null, 2),
        },
      ],
    };
  }

  /**
   * Get dead letter queue entries (for monitoring/debugging)
   */
  public getDeadLetterQueue(): DeadLetterEntry[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  public clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }
}
