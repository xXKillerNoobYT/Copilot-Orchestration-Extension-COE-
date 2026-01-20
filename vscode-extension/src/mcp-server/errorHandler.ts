/**
 * MCP Error Handler
 * Handles MCP message failures with retry logic and dead-letter queue integration
 * 
 * Features:
 * - 30-second timeout per message
 * - 3 retry attempts with exponential backoff
 * - Dead-letter queue for failed messages after max retries
 * - WebSocket event emission for monitoring
 */

import { DeadLetterQueueService } from '../services/deadLetterQueue.js';

export interface MCPMessage {
  id: string;
  type: string;
  payload: object;
  taskId?: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  timeout: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  timeout: 30000,
};

export class MCPErrorHandler {
  private config: RetryConfig;

  constructor(
    private dlq: DeadLetterQueueService,
    config?: Partial<RetryConfig>
  ) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Handle error after all retries have failed
   */
  async handleError(
    messageId: string,
    messageType: string,
    payload: object,
    error: Error,
    handlerName: string,
    retryCount: number
  ): Promise<void> {
    try {
      // After max retries, add to dead-letter queue
      if (retryCount >= this.config.maxRetries) {
        const taskId = (payload as any).taskId;

        await this.dlq.addFailedMessage(
          messageId,
          messageType,
          payload,
          error,
          handlerName,
          taskId,
          retryCount
        );

        console.error(
          `[MCP] Message ${messageId} added to dead-letter queue after ${retryCount} retries`,
          {
            messageType,
            handlerName,
            error: error.message,
          }
        );

        // Emit event for monitoring
        this.emitDeadLetterEvent(messageId, handlerName, error);
      }
    } catch (dlqError) {
      console.error('[MCP] Failed to add message to dead-letter queue:', dlqError);
    }
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    messageId: string,
    messageType: string,
    payload: object,
    handlerName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Execute with timeout
        const result = await this.withTimeout(
          operation(),
          this.config.timeout,
          `Operation timeout after ${this.config.timeout}ms`
        );
        
        // Success - return result
        if (attempt > 0) {
          console.log(`[MCP] ${handlerName} succeeded on retry ${attempt + 1}`);
        }
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(
          `[MCP] ${handlerName} attempt ${attempt + 1}/${this.config.maxRetries} failed:`,
          lastError.message
        );

        // If this is not the last attempt, wait before retrying
        if (attempt < this.config.maxRetries - 1) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`[MCP] Retrying ${handlerName} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed - handle error and throw
    await this.handleError(
      messageId,
      messageType,
      payload,
      lastError!,
      handlerName,
      this.config.maxRetries
    );

    throw lastError;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Execute promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emit WebSocket event for monitoring
   */
  private emitDeadLetterEvent(messageId: string, handlerName: string, error: Error): void {
    try {
      // Check if global WebSocket server exists
      if (typeof global !== 'undefined' && (global as any).wsServer) {
        (global as any).wsServer.emit('deadLetterAdded', {
          messageId,
          handlerName,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (emitError) {
      console.error('[MCP] Failed to emit dead-letter event:', emitError);
    }
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[MCP] Error handler configuration updated:', this.config);
  }
}
