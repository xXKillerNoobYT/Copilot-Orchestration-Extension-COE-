/**
 * Base class for MCP Server Handlers
 * Provides common functionality for backend integration, error handling, and WebSocket broadcasting
 */
import { getAuditLogger } from '../auditLogger';
/**
 * Default error handling configuration
 * - 30 second timeout per request
 * - 3 retry attempts with exponential backoff
 */
export const DEFAULT_ERROR_CONFIG = {
    timeout: 30000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    useExponentialBackoff: true,
};
/**
 * Simple bounded queue implementation to prevent unbounded growth
 * of the dead letter queue in long-running processes.
 */
class BoundedQueue extends Array {
    constructor(maxSize) {
        super();
        this.maxSize = maxSize;
    }
    push(...items) {
        const newLength = super.push(...items);
        if (this.maxSize > 0 && this.length > this.maxSize) {
            const overflow = this.length - this.maxSize;
            // Remove the oldest entries to enforce the maximum size
            this.splice(0, overflow);
        }
        return newLength;
    }
}
/**
 * Base handler class with common backend integration functionality
 */
export class MCPHandlerBase {
    constructor(errorConfig = DEFAULT_ERROR_CONFIG, maxDeadLetterQueueSize = 1000) {
        this.errorConfig = errorConfig;
        this.deadLetterQueue = new BoundedQueue(maxDeadLetterQueueSize);
    }
    /**
     * Execute a request with timeout, retry, and dead-letter queue handling
     */
    async executeWithRetry(operation, handlerName, args) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        let lastError = null;
        for (let attempt = 0; attempt < this.errorConfig.retryAttempts; attempt++) {
            try {
                // Wrap operation with timeout
                const result = await this.withTimeout(operation(), this.errorConfig.timeout);
                // Log successful execution
                const duration_ms = Date.now() - startTime;
                const logger = getAuditLogger();
                logger.log({
                    timestamp,
                    action: 'tool_call_success',
                    toolName: handlerName,
                    args,
                    result,
                    duration_ms,
                    metadata: { attempt: attempt + 1 }
                });
                return result;
            }
            catch (error) {
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
        this.addToDeadLetterQueue(handlerName, args, lastError);
        // Log failure
        const duration_ms = Date.now() - startTime;
        const logger = getAuditLogger();
        logger.log({
            timestamp,
            action: 'tool_call_failed',
            toolName: handlerName,
            args,
            error: lastError?.message,
            duration_ms,
            metadata: { retryAttempts: this.errorConfig.retryAttempts }
        });
        throw new Error(`${handlerName} failed after ${this.errorConfig.retryAttempts} attempts: ${lastError?.message}`);
    }
    /**
     * Wrap a promise with timeout
     */
    withTimeout(promise, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            promise.then((value) => {
                clearTimeout(timeoutId);
                resolve(value);
            }, (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    /**
     * Calculate retry delay with exponential backoff
     */
    calculateRetryDelay(attemptNumber) {
        if (!this.errorConfig.useExponentialBackoff) {
            return this.errorConfig.retryDelayMs;
        }
        // Exponential backoff: 1s, 2s, 4s, 8s, ...
        return this.errorConfig.retryDelayMs * Math.pow(2, attemptNumber);
    }
    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Add failed request to dead letter queue
     */
    addToDeadLetterQueue(handler, args, error) {
        const entry = {
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
    formatSuccess(data) {
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
    formatError(error, context) {
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
    getDeadLetterQueue() {
        return [...this.deadLetterQueue];
    }
    /**
     * Clear dead letter queue
     */
    clearDeadLetterQueue() {
        this.deadLetterQueue.length = 0; // Clear array while keeping BoundedQueue instance
    }
}
