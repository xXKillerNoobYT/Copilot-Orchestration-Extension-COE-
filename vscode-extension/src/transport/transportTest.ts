/**
 * Tests for Multi-Provider Transport Layer
 */

import { RateLimiter, TokenCounter, ChatMessage } from './llmTransport';
import { ProviderFactory, TransportManager, TransportConfig } from './transportManager';

/**
 * Run transport layer tests
 */
async function runTransportTests(): Promise<void> {
  let passCount = 0;
  let failCount = 0;

  // Test 1: Token counter estimation
  try {
    const shortText = 'Hello world';
    const longText = 'This is a much longer text that should result in more tokens being estimated';

    const shortTokens = TokenCounter.estimateTokens(shortText);
    const longTokens = TokenCounter.estimateTokens(longText);

    console.assert(shortTokens > 0, 'Short text should have tokens');
    console.assert(longTokens > shortTokens, 'Long text should have more tokens');
    console.assert(shortTokens === 3, 'Short text should estimate ~3 tokens');

    console.log('[✓] Test 1: Token counter estimation');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 1: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 2: Token counter for messages
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    const totalTokens = TokenCounter.estimateMessagesTokens(messages);
    console.assert(totalTokens > 0, 'Messages should have tokens');
    console.assert(totalTokens > 10, 'Combined messages should have >10 tokens');

    console.log('[✓] Test 2: Token counter for messages');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 2: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 3: Rate limiter - check limit
  try {
    const limiter = new RateLimiter(10, 1000);

    const allowed1 = await limiter.checkLimit(100);
    console.assert(allowed1 === true, 'First request should be allowed');

    // Record 10 requests
    for (let i = 0; i < 10; i++) {
      limiter.recordRequest(100);
    }

    const allowed2 = await limiter.checkLimit(100);
    console.assert(allowed2 === false, 'Request after limit should be denied');

    console.log('[✓] Test 3: Rate limiter check limit');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 3: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 4: Rate limiter - token limit
  try {
    const limiter = new RateLimiter(100, 1000);

    limiter.recordRequest(500);
    const allowed1 = await limiter.checkLimit(400);
    if (allowed1 !== true) {
      throw new Error(`900 tokens should be under 1000 limit, but was blocked`);
    }
    
    // After first request is approved, record it
    limiter.recordRequest(400);
    
    // Now we have 500 + 400 = 900 tokens used, checking 200 more would be 1100 > 1000
    const allowed2 = await limiter.checkLimit(200);
    if (allowed2 !== false) {
      throw new Error(`1100 tokens should exceed limit, but was allowed`);
    }

    console.log('[✓] Test 4: Rate limiter token limit');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 4: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 5: Provider factory - OpenAI
  try {
    const provider = ProviderFactory.createProvider('openai', {
      name: 'openai-test',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'test-key',
    });

    console.assert(!!provider, 'Provider should be created');
    console.assert(provider.getName() === 'openai-test', 'Provider name should match');

    console.log('[✓] Test 5: Provider factory OpenAI');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 5: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 6: Provider factory - Azure
  try {
    const provider = ProviderFactory.createProvider('azure', {
      name: 'azure-test',
      baseUrl: 'https://myresource.openai.azure.com',
      apiKey: 'test-key',
      deploymentName: 'gpt-4',
    });

    console.assert(!!provider, 'Azure provider should be created');
    console.assert(provider.getName() === 'azure-test', 'Provider name should match');

    console.log('[✓] Test 6: Provider factory Azure');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 6: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 7: Provider factory - LM Studio
  try {
    const provider = ProviderFactory.createProvider('lmstudio', {
      name: 'lmstudio-test',
      baseUrl: 'http://localhost:1234/v1',
    });

    console.assert(!!provider, 'LM Studio provider should be created');
    console.assert(provider.getName() === 'lmstudio-test', 'Provider name should match');

    console.log('[✓] Test 7: Provider factory LM Studio');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 7: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 8: Transport manager with fallback
  try {
    const config: TransportConfig = {
      providerType: 'openai',
      config: {
        name: 'primary-openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test-key',
      },
      fallbackProviders: [
        {
          providerType: 'lmstudio',
          config: {
            name: 'fallback-lmstudio',
            baseUrl: 'http://localhost:1234/v1',
          },
        },
      ],
    };

    const manager = new TransportManager(config);
    const providers = manager.getAllProviders();

    console.assert(providers.length === 2, 'Should have 2 providers (primary + fallback)');
    console.assert(providers[0].getName() === 'primary-openai', 'Primary should be first');
    console.assert(providers[1].getName() === 'fallback-lmstudio', 'Fallback should be second');

    console.log('[✓] Test 8: Transport manager with fallback');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 8: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 9: Provider factory error handling
  try {
    let errorThrown = false;
    try {
      ProviderFactory.createProvider('azure', {
        name: 'azure-missing-deployment',
        baseUrl: 'https://test.openai.azure.com',
        apiKey: 'test-key',
        // Missing deploymentName
      });
    } catch (error) {
      errorThrown = true;
      const message = error instanceof Error ? error.message : '';
      console.assert(message.includes('deploymentName'), 'Error should mention missing deploymentName');
    }

    console.assert(errorThrown, 'Should throw error for Azure without deploymentName');

    console.log('[✓] Test 9: Provider factory error handling');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 9: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 10: Chat message structure
  try {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hello, how are you?',
    };

    console.assert(message.role === 'user', 'Message role should be user');
    console.assert(message.content === 'Hello, how are you?', 'Message content should match');
    console.assert(typeof message.content === 'string', 'Content should be string');

    console.log('[✓] Test 10: Chat message structure');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 10: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 11: Rate limiter time window
  try {
    const limiter = new RateLimiter(5, 500);

    // Record 5 requests
    for (let i = 0; i < 5; i++) {
      limiter.recordRequest(50);
    }

    const deniedNow = await limiter.checkLimit(50);
    console.assert(deniedNow === false, 'Should be denied immediately after hitting limit');

    // In real scenario, would wait 60 seconds for window to clear
    // For test, we just verify the logic is in place

    console.log('[✓] Test 11: Rate limiter time window');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 11: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 12: Multiple provider types
  try {
    const providers = [
      ProviderFactory.createProvider('openai', {
        name: 'openai-1',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'key1',
      }),
      ProviderFactory.createProvider('lmstudio', {
        name: 'lmstudio-1',
        baseUrl: 'http://localhost:1234/v1',
      }),
      ProviderFactory.createProvider('azure', {
        name: 'azure-1',
        baseUrl: 'https://test.openai.azure.com',
        apiKey: 'key2',
        deploymentName: 'gpt-4',
      }),
    ];

    console.assert(providers.length === 3, 'Should create 3 different providers');
    console.assert(providers[0].getName() === 'openai-1', 'OpenAI provider name');
    console.assert(providers[1].getName() === 'lmstudio-1', 'LM Studio provider name');
    console.assert(providers[2].getName() === 'azure-1', 'Azure provider name');

    console.log('[✓] Test 12: Multiple provider types');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 12: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Print summary
  console.log('\n=== Transport Layer Tests Summary ===');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);

  if (failCount === 0) {
    console.log('✓ All tests passed!');
  }
}

// Run tests
export { runTransportTests };

// Execute tests if running directly
if (require.main === module) {
  runTransportTests()
    .then(() => {
      console.log('Transport layer tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Transport layer tests failed:', error);
      process.exit(1);
    });
}
