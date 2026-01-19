/**
 * Streaming Client for LLM Execution
 * 
 * Provides real-time streaming of LLM responses using Server-Sent Events (SSE)
 * or WebSocket connections for live feedback during AI operations.
 * 
 * Features:
 * - SSE/WebSocket streaming support
 * - Progress tracking and cancellation
 * - Automatic reconnection on failure
 * - Token-by-token response delivery
 */

import * as vscode from 'vscode';
import { LlmConfig } from '../config/llmConfig';
import { ChatMessage } from '../llm/openaiClient';

export interface StreamingOptions {
  /** Stream transport: SSE (Server-Sent Events) or WebSocket */
  transport?: 'sse' | 'websocket';
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
   * Stream LLM response using SSE or WebSocket
   * @param messages Chat messages to send
   * @param callbacks Callbacks for stream events
   * @param options Streaming options
   */
  async streamChat(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: StreamingOptions
  ): Promise<void> {
    const transport = options?.transport || 'sse';
    
    if (transport === 'sse') {
      await this.streamWithSSE(messages, callbacks, options);
    } else {
      await this.streamWithWebSocket(messages, callbacks, options);
    }
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
      });

      clearTimeout(timeoutId);

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
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Stream using WebSocket connection
   * For custom streaming servers that prefer WebSocket over SSE
   */
  private async streamWithWebSocket(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: StreamingOptions
  ): Promise<void> {
    this.isActive = true;
    this.accumulatedResponse = '';

    return new Promise((resolve, reject) => {
      const baseUrl = this.config.baseUrl.replace(/^http/, 'ws').replace(/\/$/, '');
      const wsUrl = `${baseUrl}/stream`;

      const ws = new WebSocket(wsUrl);
      let connectionTimeout: NodeJS.Timeout;

      // Setup timeout
      const timeoutMs = options?.timeoutMs ?? this.config.timeoutMs;
      connectionTimeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, timeoutMs);

      // Listen for cancellation
      if (options?.cancellationToken) {
        options.cancellationToken.onCancellationRequested(() => {
          ws.close();
          callbacks.onCancel?.();
          resolve();
        });
      }

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('[StreamingClient] WebSocket connected');

        // Send request
        const model = this.config.defaultModel === 'custom'
          ? this.config.customModel
          : this.config.defaultModel;

        ws.send(JSON.stringify({
          type: 'chat',
          model,
          messages,
          temperature: options?.temperature ?? this.config.temperature,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'chunk' && data.content) {
            this.accumulatedResponse += data.content;
            
            callbacks.onChunk?.({
              type: 'text',
              content: data.content,
              metadata: data.metadata,
            });
          } else if (data.type === 'progress') {
            callbacks.onChunk?.({
              type: 'progress',
              progress: data.progress,
            });
          } else if (data.type === 'done') {
            callbacks.onChunk?.({ type: 'done' });
            this.isActive = false;
            callbacks.onComplete?.(this.accumulatedResponse);
            ws.close();
            resolve();
          } else if (data.type === 'error') {
            const error = new Error(data.error || 'Stream error');
            callbacks.onError?.(error);
            ws.close();
            reject(error);
          }
        } catch (parseError) {
          console.warn('[StreamingClient] Failed to parse WebSocket message:', event.data);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        const wsError = new Error('WebSocket error - check server connection');
        callbacks.onError?.(wsError);
        reject(wsError);
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.isActive = false;

        if (!event.wasClean) {
          const closeError = new Error(`WebSocket closed unexpectedly: ${event.reason}`);
          callbacks.onError?.(closeError);
          reject(closeError);
        } else if (this.accumulatedResponse) {
          // Normal close with response
          callbacks.onComplete?.(this.accumulatedResponse);
          resolve();
        } else {
          resolve();
        }
      };
    });
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
