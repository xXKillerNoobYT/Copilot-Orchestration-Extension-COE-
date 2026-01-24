/**
 * Centralized Error Handler for VS Code Extension
 * Provides retry logic, exponential backoff, and user-friendly error messages
 */

import * as vscode from 'vscode';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        console.log(`[ErrorHandler] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(private options: CircuitBreakerOptions = {}) {
    this.options.failureThreshold = options.failureThreshold ?? 5;
    this.options.resetTimeout = options.resetTimeout ?? 60000; // 1 minute
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure >= this.options.resetTimeout!) {
        console.log('[CircuitBreaker] Attempting to close circuit (half-open state)');
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN. Service unavailable.');
      }
    }
    
    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        console.log('[CircuitBreaker] Circuit closed successfully');
        this.state = 'closed';
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold!) {
      console.log(`[CircuitBreaker] Circuit opened after ${this.failureCount} failures`);
      this.state = 'open';
    }
  }
  
  reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
    console.log('[CircuitBreaker] Circuit manually reset');
  }
  
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
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
 * Convert error to user-friendly message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      return 'Unable to connect to the server. Please ensure it is running.';
    }
    
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return 'Request timed out. Please try again.';
    }
    
    if (error.message.includes('ENOTFOUND')) {
      return 'Server not found. Please check the URL configuration.';
    }
    
    // HTTP errors
    if (error.message.includes('404')) {
      return 'Resource not found.';
    }
    
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'Authentication failed. Please check your credentials.';
    }
    
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    
    // Circuit breaker
    if (error.message.includes('Circuit breaker')) {
      return 'Service temporarily unavailable. Please wait a moment and try again.';
    }
    
    // Generic error with clean message
    return error.message.replace(/^Error: /, '');
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Show error message to user
 */
export function showErrorMessage(error: unknown, context?: string): void {
  const message = getUserFriendlyErrorMessage(error);
  const fullMessage = context ? `${context}: ${message}` : message;
  
  vscode.window.showErrorMessage(fullMessage);
  
  // Log full error for debugging
  console.error('[ErrorHandler] Error:', error);
}

/**
 * Log error with context
 */
export function logError(error: unknown, context: string, additionalInfo?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${timestamp}] [${context}] Error:`, errorMessage);
  
  if (stackTrace) {
    console.error('Stack trace:', stackTrace);
  }
  
  if (additionalInfo) {
    console.error('Additional info:', JSON.stringify(additionalInfo, null, 2));
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retry handler with logging
 */
export function createRetryHandler(context: string): RetryOptions {
  return {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => {
      console.log(`[${context}] Retry attempt ${attempt}: ${error.message}`);
    },
  };
}
