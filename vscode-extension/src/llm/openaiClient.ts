import { LlmConfig, redactSecret } from '../config/llmConfig';

type HeadersInit = Record<string, string>;
type FetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
};

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestOptions {
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

export interface OpenAIChatResponse {
  id: string;
  choices: Array<{ message: ChatMessage; finish_reason?: string }>;
}

export interface LlmClient {
  sendChat(messages: ChatMessage[], options?: ChatRequestOptions): Promise<OpenAIChatResponse>;
  testConnection(): Promise<void>;
}

export function createOpenAIClient(config: LlmConfig): LlmClient {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const fetchFn: typeof fetch | undefined = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
  if (!fetchFn) {
    throw new Error('Global fetch is not available in this environment.');
  }
  const fetchSafe = fetchFn;

  async function doFetch(path: string, body: unknown, timeoutMs: number): Promise<FetchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      const res = (await fetchSafe(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })) as FetchResponse;
      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function sendChat(messages: ChatMessage[], options?: ChatRequestOptions): Promise<OpenAIChatResponse> {
    const body = {
      model: options?.model ?? config.defaultModel,
      messages,
      temperature: options?.temperature ?? config.temperature,
    };
    const timeoutMs = options?.timeoutMs ?? config.timeoutMs;

    const res = await doFetch('/chat/completions', body, timeoutMs);
    if (!res.ok) {
      const text = await safeText(res);
      throw toLlmError(res.status, text, config.apiKey);
    }
    const json = (await res.json()) as OpenAIChatResponse;
    return json;
  }

  async function testConnection(): Promise<void> {
    const pingMessages: ChatMessage[] = [
      { role: 'system', content: 'ping' },
      { role: 'user', content: 'ping' },
    ];
    await sendChat(pingMessages, { temperature: 0, timeoutMs: Math.min(5000, config.timeoutMs) });
  }

  return {
    sendChat,
    testConnection,
  };
}

function toLlmError(status: number, body: string, apiKey: string): Error {
  const redacted = redactSecret(apiKey);
  let hint = '';
  if (status === 401) {
    hint = 'Unauthorized (401). Check API key or endpoint auth.';
  } else if (status === 404) {
    hint = 'Not found (404). Confirm base URL path (expected /v1/chat/completions).';
  } else if (status === 429) {
    hint = 'Rate limited (429). Retry later or lower request rate.';
  }
  const msg = [`LLM request failed (status ${status})`, hint, body ? `Body: ${body}` : '', redacted ? `API key: ${redacted}` : '']
    .filter(Boolean)
    .join(' | ');
  return new Error(msg);
}

async function safeText(res: FetchResponse): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}