import { createOpenAIClient } from './llm/openaiClient';
import { LlmConfig } from './config/llmConfig';

type FetchCall = { url: string; options: any };

function mockFetch(response: { status?: number; body?: unknown; throwError?: Error }) {
  const calls: FetchCall[] = [];
  (globalThis as any).fetch = async (url: string, options: any) => {
    calls.push({ url, options });
    if (response.throwError) {
      throw response.throwError;
    }
    return {
      ok: (response.status ?? 200) >= 200 && (response.status ?? 200) < 300,
      status: response.status ?? 200,
      async json() {
        return response.body ?? { id: 'test', choices: [] };
      },
      async text() {
        return typeof response.body === 'string' ? response.body : JSON.stringify(response.body ?? {});
      },
    } as any;
  };
  return calls;
}

function baseConfig(): LlmConfig {
  return {
    baseUrl: 'http://localhost:1234/v1',
    apiKey: 'sk-test-key',
    defaultModel: 'gpt-4.1',
    temperature: 0.5,
    timeoutMs: 5000,
    taskRoots: ['_ZENTASKS'],
  };
}

async function testRequestBuild() {
  const calls = mockFetch({ body: { id: 'ok', choices: [] } });
  const client = createOpenAIClient(baseConfig());
  await client.sendChat([{ role: 'user', content: 'hi' }]);
  console.assert(calls.length === 1, 'Expected one fetch call');
  console.assert(calls[0].url.endsWith('/chat/completions'), 'URL should target /chat/completions');
  const headers = calls[0].options.headers;
  console.assert(headers['Authorization'] === 'Bearer sk-test-key', 'Authorization header missing');
  const body = JSON.parse(calls[0].options.body);
  console.assert(body.model === 'gpt-4.1', 'Model should default');
  console.assert(body.temperature === 0.5, 'Temperature should default');
}

async function testUnauthorized() {
  mockFetch({ status: 401, body: 'unauthorized' });
  const client = createOpenAIClient(baseConfig());
  let failed = false;
  try {
    await client.sendChat([{ role: 'user', content: 'hi' }]);
  } catch (err) {
    failed = true;
    const msg = String(err);
    console.assert(msg.includes('401'), 'Error should mention 401');
    console.assert(msg.includes('unauthorized'), 'Error should include body');
  }
  console.assert(failed, 'Unauthorized should throw');
}

async function testNotFound() {
  mockFetch({ status: 404, body: 'not found' });
  const client = createOpenAIClient(baseConfig());
  let failed = false;
  try {
    await client.sendChat([{ role: 'user', content: 'hi' }]);
  } catch (err) {
    failed = true;
    const msg = String(err);
    console.assert(msg.includes('404'), 'Error should mention 404');
  }
  console.assert(failed, '404 should throw');
}

async function runLlmClientTests() {
  console.log('=== LLM Client Tests ===');
  await testRequestBuild();
  await testUnauthorized();
  await testNotFound();
  console.log('=== LLM Client Tests Passed ✓ ===');
}

if (require.main === module) {
  runLlmClientTests().catch((err) => {
    console.error('LLM Client Tests failed:', err);
    process.exit(1);
  });
}

export { runLlmClientTests };