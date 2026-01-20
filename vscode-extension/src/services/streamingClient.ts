/**
 * Streaming Client for LLM Execution
 * 
 * Provides real-time streaming of LLM responses using Server-Sent Events (SSE)
 * for live feedback during AI operations.
 * 
 * Features:
 * - SSE streaming support (WebSocket planned for future)
 * - Progress tracking and cancellation
 * - Token-by-token response delivery
 */

import * as vscode from 'vscode';
import { LlmConfig } from '../config/llmConfig';
import { ChatMessage } from '../llm/openaiClient';

export interface StreamingOptions {
  /** Stream transport: only SSE supported (WebSocket not implemented) */
  transport?: 'sse';
  /** Temperature for sampling (0-2) */
  temperature?: number;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Cancellation token for aborting stream */
  cancellationToken?: vscode.CancellationToken;
}

export interface StreamChunk {
  /** Chunk type: text, progress, error, done */
  type: 'text' | 'progress' | 'error' | 'done';
  /** Text content (for type='text') */
  content?: string;
  /** Progress percentage (0-100, for type='progress') */
  progress?: number;
  /** Error message (for type='error') */
  error?: string;
  /** Metadata (token count, model info, etc.) */
  metadata?: Record<string, any>;
}

export interface StreamCallbacks {
  /** Called when stream chunk is received */
  onChunk?: (chunk: StreamChunk) => void;
  /** Called when stream completes successfully */
  onComplete?: (fullResponse: string) => void;
  /** Called when stream encounters an error */
  onError?: (error: Error) => void;
  /** Called when stream is cancelled */
  onCancel?: () => void;
}

/**
 * Streaming client for real-time LLM execution
 */
export class StreamingClient {
  private abortController: AbortController | null = null;
  private accumulatedResponse: string = '';
  private isActive: boolean = false;

  constructor(private config: LlmConfig) {}

  /**
   * Stream LLM response using SSE
   * @param messages Chat messages to send
   * @param callbacks Callbacks for stream events
   * @param options Streaming options
   * @throws Error if client is already streaming
   */
  async streamChat(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: StreamingOptions
  ): Promise<void> {
    // Prevent concurrent streams on the same client instance
    if (this.isActive) {
      throw new Error('StreamingClient is already active. Create a new instance or wait for the current stream to complete.');
    }
    
    const transport = options?.transport || 'sse';
    
    if (transport !== 'sse') {
      throw new Error('Only SSE transport is currently supported. WebSocket support is planned for a future release.');
    }
    
    await this.streamWithSSE(messages, callbacks, options);
  }

  /**
   * Stream using Server-Sent Events (SSE)
   * Compatible with OpenAI-style streaming endpoints
   */
  private async streamWithSSE(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: StreamingOptions
  ): Promise<void> {
    this.isActive = true;
    this.accumulatedResponse = '';
    this.abortController = new AbortController();

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;
    
    const model = this.config.defaultModel === 'custom' 
      ? this.config.customModel 
      : this.config.defaultModel;

    const body = {
      model,
      messages,
      temperature: options?.temperature ?? this.config.temperature,
      stream: true, // Enable streaming
    };

    try {
      // Setup timeout
      const timeoutMs = options?.timeoutMs ?? this.config.timeoutMs;
      const timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, timeoutMs);

      // Listen for cancellation token
      if (options?.cancellationToken) {
        options.cancellationToken.onCancellationRequested(() => {
          this.cancel();
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null - streaming not supported');
      }

      // Process SSE stream
      await this.processSSEStream(response.body, callbacks);

      // Stream completed successfully
      this.isActive = false;
      callbacks.onComplete?.(this.accumulatedResponse);

    } catch (error: any) {
      this.isActive = false;

      // Check if cancelled
      if (error.name === 'AbortError') {
        callbacks.onCancel?.();
        return;
      }

      // Check for timeout
      if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
        const timeoutError = new Error('Stream timeout - check server connection');
        callbacks.onError?.(timeoutError);
        throw timeoutError;
      }

      // Other errors
      callbacks.onError?.(error);
      throw error;
    }
  }

  /**
   * Process Server-Sent Event stream
   */
  private async processSSEStream(
    body: ReadableStream<Uint8Array>,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (this.isActive) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream finished
          callbacks.onChunk?.({ type: 'done' });
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) {
            continue; // Skip empty lines and comments
          }

          if (line.startsWith('data: ')) {
            const data = line.substring(6);

            // Check for [DONE] marker
            if (data === '[DONE]') {
              callbacks.onChunk?.({ type: 'done' });
              this.isActive = false;
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                this.accumulatedResponse += content;
                
                callbacks.onChunk?.({
                  type: 'text',
                  content,
                  metadata: {
                    model: parsed.model,
                    finishReason: parsed.choices?.[0]?.finish_reason,
                  },
                });
              }

              // Check for completion
              if (parsed.choices?.[0]?.finish_reason) {
                callbacks.onChunk?.({ type: 'done' });
                this.isActive = false;
                break;
              }

            } catch (parseError) {
              console.warn('[StreamingClient] Failed to parse SSE data:', data);
              // Note: Individual parse errors are logged but don't fail the entire stream
              // as the server may send malformed chunks that can be safely ignored
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Cancel active stream
   */
  cancel(): void {
    if (this.isActive) {
      this.isActive = false;
      this.abortController?.abort();
      console.log('[StreamingClient] Stream cancelled');
    }
  }

  /**
   * Check if stream is currently active
   */
  isStreaming(): boolean {
    return this.isActive;
  }

  /**
   * Get accumulated response so far
   */
  getAccumulatedResponse(): string {
    return this.accumulatedResponse;
  }
}

/**
 * Create streaming client from config
 */
export function createStreamingClient(config: LlmConfig): StreamingClient {
  return new StreamingClient(config);
}
