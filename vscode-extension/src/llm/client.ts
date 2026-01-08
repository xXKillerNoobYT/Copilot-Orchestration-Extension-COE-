/**
 * LLM Transport Client Request Builder
 *
 * Builds OpenAI-compatible /v1/chat/completions requests from CopilotDispatcher.PromptPayload.
 * Provides request body construction, header management, and payload transformation.
 */

import { LlmConfig } from '../config/llmConfig';
import { PromptPayload, PromptMessage } from '../copilotDispatcher';

/**
 * OpenAI Chat Completions Request Body
 * @see https://platform.openai.com/docs/api-reference/chat/create
 */
export interface ChatCompletionsRequest {
  model: string;
  messages: PromptMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  user?: string;
  [key: string]: unknown;
}

/**
 * Request builder options
 */
export interface RequestBuilderOptions {
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  userId?: string;
}

/**
 * Request metadata for correlation and logging
 */
export interface RequestMetadata {
  taskId: string;
  agentName: string;
  timestamp: string;
  contextFileCount: number;
  memoryCount: number;
  messageCount: number;
  totalCharacters: number;
}

/**
 * Transport request with metadata
 */
export interface TransportRequest {
  body: ChatCompletionsRequest;
  headers: Record<string, string>;
  metadata: RequestMetadata;
}

/**
 * Build headers for LLM request
 * @param config LLM configuration with API key
 * @param options Optional header customization
 * @returns Headers object ready for fetch/axios
 */
export function buildRequestHeaders(
  config: LlmConfig,
  options?: { includeTaskId?: boolean; taskId?: string; agentName?: string }
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add API key if configured
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  // Add custom headers for correlation (optional)
  if (options?.includeTaskId && options?.taskId) {
    headers['X-Task-Id'] = options.taskId;
  }

  if (options?.agentName) {
    headers['X-Agent-Name'] = options.agentName;
  }

  // Add user-agent
  headers['User-Agent'] = 'CopilotOrchestrator/1.0';

  return headers;
}

/**
 * Build request body for chat completions
 * @param payload PromptPayload from CopilotDispatcher
 * @param config LLM configuration
 * @param options Builder options for additional parameters
 * @returns ChatCompletionsRequest body
 */
export function buildRequestBody(
  payload: PromptPayload,
  config: LlmConfig,
  options?: RequestBuilderOptions
): ChatCompletionsRequest {
  // Use payload model if available, fall back to config default
  const model = config.defaultModel;

  // Use payload temperature if available, fall back to config
  const temperature = config.temperature !== undefined ? config.temperature : 0.7;

  // Build base request
  const request: ChatCompletionsRequest = {
    model,
    messages: payload.messages,
    temperature,
  };

  // Add optional parameters
  if (options?.maxTokens !== undefined) {
    request.max_tokens = options.maxTokens;
  }

  if (options?.topP !== undefined) {
    request.top_p = options.topP;
  }

  if (options?.frequencyPenalty !== undefined) {
    request.frequency_penalty = options.frequencyPenalty;
  }

  if (options?.presencePenalty !== undefined) {
    request.presence_penalty = options.presencePenalty;
  }

  if (options?.stop !== undefined) {
    request.stop = options.stop;
  }

  if (options?.userId !== undefined) {
    request.user = options.userId;
  }

  // Add task ID as user context if available
  if (payload.taskId) {
    request.user = `task:${payload.taskId}`;
  }

  return request;
}

/**
 * Calculate request metadata for logging and correlation
 * @param payload PromptPayload from CopilotDispatcher
 * @returns RequestMetadata for diagnostics
 */
export function buildRequestMetadata(payload: PromptPayload): RequestMetadata {
  // Count total characters in payload
  let totalCharacters = 0;
  payload.messages.forEach((msg) => {
    totalCharacters += msg.content.length;
  });
  if (payload.context?.files) {
    payload.context.files.forEach((file) => {
      totalCharacters += file.content.length;
    });
  }

  return {
    taskId: payload.taskId,
    agentName: payload.agent.name,
    timestamp: new Date().toISOString(),
    contextFileCount: payload.metadata?.contextFileCount || 0,
    memoryCount: payload.metadata?.memoryCount || 0,
    messageCount: payload.messages.length,
    totalCharacters,
  };
}

/**
 * Validate request body against OpenAI API requirements
 * @param request ChatCompletionsRequest to validate
 * @throws Error if validation fails
 */
export function validateRequestBody(request: ChatCompletionsRequest): void {
  // Validate model
  if (!request.model) {
    throw new Error('ChatCompletionsRequest: model is required');
  }

  // Validate messages
  if (!Array.isArray(request.messages)) {
    throw new Error('ChatCompletionsRequest: messages must be an array');
  }

  if (request.messages.length === 0) {
    throw new Error('ChatCompletionsRequest: messages array cannot be empty');
  }

  // Validate each message
  for (let i = 0; i < request.messages.length; i++) {
    const msg = request.messages[i];

    if (!msg.role) {
      throw new Error(`ChatCompletionsRequest: messages[${i}] missing role`);
    }

    const validRoles = ['system', 'user', 'assistant', 'function'];
    if (!validRoles.includes(msg.role)) {
      throw new Error(`ChatCompletionsRequest: messages[${i}] invalid role '${msg.role}'`);
    }

    if (!msg.content && msg.role !== 'function') {
      throw new Error(`ChatCompletionsRequest: messages[${i}] missing content`);
    }
  }

  // Validate temperature if present
  if (request.temperature !== undefined) {
    if (typeof request.temperature !== 'number') {
      throw new Error('ChatCompletionsRequest: temperature must be a number');
    }
    if (request.temperature < 0 || request.temperature > 2) {
      throw new Error('ChatCompletionsRequest: temperature must be between 0 and 2');
    }
  }

  // Validate max_tokens if present
  if (request.max_tokens !== undefined) {
    if (typeof request.max_tokens !== 'number' || request.max_tokens <= 0) {
      throw new Error('ChatCompletionsRequest: max_tokens must be a positive number');
    }
  }

  // Validate top_p if present
  if (request.top_p !== undefined) {
    if (typeof request.top_p !== 'number') {
      throw new Error('ChatCompletionsRequest: top_p must be a number');
    }
    if (request.top_p < 0 || request.top_p > 1) {
      throw new Error('ChatCompletionsRequest: top_p must be between 0 and 1');
    }
  }
}

/**
 * Build complete transport request from dispatcher payload
 * This is the main entry point for building requests
 *
 * @param payload PromptPayload from CopilotDispatcher.composePrompt()
 * @param config LLM configuration
 * @param options Optional request customization
 * @returns Complete TransportRequest ready for sending
 * @throws Error if payload or request is invalid
 */
export function buildTransportRequest(
  payload: PromptPayload,
  config: LlmConfig,
  options?: RequestBuilderOptions & { includeCorrelationHeaders?: boolean }
): TransportRequest {
  // Build request body
  const body = buildRequestBody(payload, config, options);

  // Validate request body
  try {
    validateRequestBody(body);
  } catch (error) {
    throw new Error(`Invalid request body: ${(error as Error).message}`);
  }

  // Build headers
  const headers = buildRequestHeaders(config, {
    includeTaskId: options?.includeCorrelationHeaders,
    taskId: payload.taskId,
    agentName: payload.agent.name,
  });

  // Build metadata
  const metadata = buildRequestMetadata(payload);

  return {
    body,
    headers,
    metadata,
  };
}

/**
 * Estimate token count for request (rough approximation)
 * Uses simple heuristic: ~4 characters per token (OpenAI standard)
 *
 * @param request ChatCompletionsRequest
 * @returns Estimated token count
 */
export function estimateTokenCount(request: ChatCompletionsRequest): number {
  let totalCharacters = 0;

  // Count message characters
  request.messages.forEach((msg) => {
    totalCharacters += msg.content.length;
  });

  // Add overhead for formatting
  totalCharacters += request.messages.length * 50; // Rough formatting overhead

  // Rough approximation: 4 characters per token
  return Math.ceil(totalCharacters / 4);
}

/**
 * Create request with estimated token count
 * Useful for monitoring and cost estimation
 *
 * @param payload PromptPayload
 * @param config LLM configuration
 * @param options Builder options
 * @returns TransportRequest with estimated token cost
 */
export function buildTransportRequestWithEstimate(
  payload: PromptPayload,
  config: LlmConfig,
  options?: RequestBuilderOptions & { includeCorrelationHeaders?: boolean }
): TransportRequest & { estimatedTokens: number } {
  const request = buildTransportRequest(payload, config, options);
  const estimatedTokens = estimateTokenCount(request.body);

  return {
    ...request,
    estimatedTokens,
  };
}

/**
 * Format request for logging (with sensitive data redacted)
 *
 * @param request TransportRequest
 * @returns Formatted string for logging
 */
export function formatRequestForLogging(request: TransportRequest): string {
  const { body, metadata } = request;

  // Redact message content for logging (truncate)
  const messagesPreview = body.messages.map((msg) => ({
    role: msg.role,
    contentLength: msg.content.length,
    contentPreview: msg.content.length > 100 ? `${msg.content.substring(0, 100)}...` : msg.content,
  }));

  return `
ChatCompletionsRequest:
  Model: ${body.model}
  Temperature: ${body.temperature}
  Messages: ${body.messages.length}
  Tasks ID: ${metadata.taskId}
  Agent: ${metadata.agentName}
  Context Files: ${metadata.contextFileCount}
  Memory Entries: ${metadata.memoryCount}
  Total Characters: ${metadata.totalCharacters}
  Messages Preview:
${messagesPreview.map((m) => `    - ${m.role}: ${m.contentLength} chars (${m.contentPreview})`).join('\n')}
`;
}
