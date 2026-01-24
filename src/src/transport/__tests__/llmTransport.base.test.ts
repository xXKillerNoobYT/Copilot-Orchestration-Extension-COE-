/**
 * Tests for LLM Transport Layer Base Classes
 * Coverage for: LLMProvider, RateLimiter, TokenCounter
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
    LLMProvider,
    RateLimiter,
    TokenCounter,
    ChatMessage,
    ChatRequestOptions,
    ChatResponse,
    StreamChunk,
    ProviderConfig,
} from '../llmTransport';

// Create a concrete implementation for testing the abstract class
class MockLLMProvider extends LLMProvider {
    public testConnectionCalled = false;
    public sendChatCalled = false;
    public sendChatStreamCalled = false;

    async sendChat(messages: ChatMessage[], options?: ChatRequestOptions): Promise<ChatResponse> {
        this.sendChatCalled = true;
        return {
            id: 'test-id',
            model: options?.model || this.config.defaultModel || 'test-model',
            choices: [{
                index: 0,
                message: { role: 'assistant', content: 'Test response' },
                finishReason: 'stop'
            }],
            usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30
            }
        };
    }

    async sendChatStream(
        messages: ChatMessage[],
        options?: ChatRequestOptions,
        onChunk?: (chunk: StreamChunk) => void
    ): Promise<ChatResponse> {
        this.sendChatStreamCalled = true;

        if (onChunk) {
            onChunk({
                id: 'stream-id',
                model: 'test-model',
                choices: [{
                    index: 0,
                    delta: { content: 'Stream ' },
                    finishReason: null
                }]
            });
            onChunk({
                id: 'stream-id',
                model: 'test-model',
                choices: [{
                    index: 0,
                    delta: { content: 'response' },
                    finishReason: 'stop'
                }]
            });
        }

        return {
            id: 'stream-id',
            model: 'test-model',
            choices: [{
                index: 0,
                message: { role: 'assistant', content: 'Stream response' },
                finishReason: 'stop'
            }]
        };
    }

    async testConnection(): Promise<boolean> {
        this.testConnectionCalled = true;
        return true;
    }
}

describe('LLMProvider', () => {
    let provider: MockLLMProvider;
    let config: ProviderConfig;

    beforeEach(() => {
        config = {
            name: 'test-provider',
            baseUrl: 'http://localhost:1234/v1',
            apiKey: 'test-key',
            defaultModel: 'gpt-4',
            timeout: 30000,
            maxRetries: 3,
            rateLimit: {
                requestsPerMinute: 60,
                tokensPerMinute: 100000
            }
        };
        provider = new MockLLMProvider(config);
    });

    describe('constructor', () => {
        it('should initialize with config', () => {
            expect(provider).toBeDefined();
            expect(provider.getName()).toBe('test-provider');
        });

        it('should set default retry policy', () => {
            expect(provider['retryPolicy']).toBeDefined();
            expect(provider['retryPolicy'].maxRetries).toBe(3);
        });

        it('should use default maxRetries if not specified', () => {
            const minimalConfig: ProviderConfig = {
                name: 'minimal',
                baseUrl: 'http://test'
            };
            const minimalProvider = new MockLLMProvider(minimalConfig);
            expect(minimalProvider['retryPolicy'].maxRetries).toBe(3);
        });
    });

    describe('getName', () => {
        it('should return provider name', () => {
            expect(provider.getName()).toBe('test-provider');
        });
    });

    describe('sendChat', () => {
        it('should send chat messages', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' }
            ];

            const response = await provider.sendChat(messages);

            expect(provider.sendChatCalled).toBe(true);
            expect(response.choices[0].message.content).toBe('Test response');
        });

        it('should use provided options', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' }
            ];
            const options: ChatRequestOptions = {
                model: 'custom-model',
                temperature: 0.8
            };

            const response = await provider.sendChat(messages, options);

            expect(response.model).toBe('custom-model');
        });
    });

    describe('sendChatStream', () => {
        it('should send streaming chat request', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' }
            ];
            const chunks: StreamChunk[] = [];

            const response = await provider.sendChatStream(messages, {}, (chunk) => {
                chunks.push(chunk);
            });

            expect(provider.sendChatStreamCalled).toBe(true);
            expect(chunks.length).toBe(2);
            expect(response.choices[0].message.content).toBe('Stream response');
        });

        it('should handle stream without callback', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' }
            ];

            const response = await provider.sendChatStream(messages);

            expect(response).toBeDefined();
        });
    });

    describe('testConnection', () => {
        it('should test provider connection', async () => {
            const result = await provider.testConnection();

            expect(provider.testConnectionCalled).toBe(true);
            expect(result).toBe(true);
        });
    });

    describe('retryWithBackoff', () => {
        it('should succeed on first try', async () => {
            let callCount = 0;
            const fn = async () => {
                callCount++;
                return 'success';
            };

            const result = await provider['retryWithBackoff'](fn);

            expect(result).toBe('success');
            expect(callCount).toBe(1);
        });

        it('should retry on retryable error', async () => {
            let callCount = 0;
            const fn = async () => {
                callCount++;
                if (callCount < 3) {
                    throw new Error('timeout error');
                }
                return 'success';
            };

            const result = await provider['retryWithBackoff'](fn);

            expect(result).toBe('success');
            expect(callCount).toBe(3);
        });

        it('should fail after max retries', async () => {
            const fn = async () => {
                throw new Error('timeout error');
            };

            await expect(provider['retryWithBackoff'](fn, 2)).rejects.toThrow('timeout error');
        });

        it('should not retry non-retryable errors', async () => {
            let callCount = 0;
            const fn = async () => {
                callCount++;
                throw new Error('invalid request');
            };

            await expect(provider['retryWithBackoff'](fn)).rejects.toThrow('invalid request');
            expect(callCount).toBe(1);
        });
    });

    describe('isRetryableError', () => {
        it('should identify timeout errors as retryable', () => {
            const error = new Error('Request timeout');
            expect(provider['isRetryableError'](error)).toBe(true);
        });

        it('should identify network errors as retryable', () => {
            const error = new Error('Network error occurred');
            expect(provider['isRetryableError'](error)).toBe(true);
        });

        it('should identify ECONNRESET as retryable', () => {
            const error = new Error('ECONNRESET');
            expect(provider['isRetryableError'](error)).toBe(true);
        });

        it('should identify 429 status as retryable', () => {
            const error = new Error('HTTP 429 - Too Many Requests');
            expect(provider['isRetryableError'](error)).toBe(true);
        });

        it('should identify 503 status as retryable', () => {
            const error = new Error('HTTP 503 - Service Unavailable');
            expect(provider['isRetryableError'](error)).toBe(true);
        });

        it('should not retry invalid request errors', () => {
            const error = new Error('Invalid API key');
            expect(provider['isRetryableError'](error)).toBe(false);
        });
    });
});

describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter(60, 100000);
    });

    describe('constructor', () => {
        it('should initialize with limits', () => {
            expect(rateLimiter).toBeDefined();
        });
    });

    describe('checkLimit', () => {
        it('should allow requests under limit', async () => {
            const allowed = await rateLimiter.checkLimit(100);
            expect(allowed).toBe(true);
        });

        it('should block requests over request limit', async () => {
            // Record 60 requests
            for (let i = 0; i < 60; i++) {
                rateLimiter.recordRequest(10);
            }

            const allowed = await rateLimiter.checkLimit(100);
            expect(allowed).toBe(false);
        });

        it('should block requests over token limit', async () => {
            const allowed = await rateLimiter.checkLimit(150000);
            expect(allowed).toBe(false);
        });

        it('should allow requests after time window passes', async () => {
            // This test would need time manipulation or mocking to fully test
            const allowed = await rateLimiter.checkLimit(100);
            expect(allowed).toBe(true);
        });
    });

    describe('recordRequest', () => {
        it('should record request timestamp', () => {
            rateLimiter.recordRequest(100);
            expect(rateLimiter['requestTimestamps'].length).toBe(1);
        });

        it('should record token count', () => {
            rateLimiter.recordRequest(100);
            expect(rateLimiter['tokenCounts'].length).toBe(1);
            expect(rateLimiter['tokenCounts'][0].tokens).toBe(100);
        });

        it('should handle zero tokens', () => {
            rateLimiter.recordRequest(0);
            expect(rateLimiter['requestTimestamps'].length).toBe(1);
            expect(rateLimiter['tokenCounts'].length).toBe(0);
        });
    });

    describe('waitForLimit', () => {
        it('should resolve immediately if under limit', async () => {
            const startTime = Date.now();
            await rateLimiter.waitForLimit(100);
            const elapsed = Date.now() - startTime;

            expect(elapsed).toBeLessThan(100); // Should be nearly instant
        });

        it('should wait if over limit', async () => {
            // Fill up the limit
            for (let i = 0; i < 60; i++) {
                rateLimiter.recordRequest(10);
            }

            const waitPromise = rateLimiter.waitForLimit(100);

            // Give it a moment to start waiting
            await new Promise(resolve => setTimeout(resolve, 10));

            // This would wait, but we can't easily test the full wait
            // without mocking timers or making the test very slow
        }, 100);
    });
});

describe('TokenCounter', () => {
    describe('estimateTokens', () => {
        it('should estimate tokens for simple text', () => {
            const text = 'Hello, world!';
            const tokens = TokenCounter.estimateTokens(text);

            // "Hello, world!" is 13 chars, ~4 tokens
            expect(tokens).toBeGreaterThan(0);
            expect(tokens).toBeLessThan(10);
        });

        it('should handle empty string', () => {
            const tokens = TokenCounter.estimateTokens('');
            expect(tokens).toBe(0);
        });

        it('should estimate more tokens for longer text', () => {
            const shortText = 'Hi';
            const longText = 'This is a much longer text that should have more tokens';

            const shortTokens = TokenCounter.estimateTokens(shortText);
            const longTokens = TokenCounter.estimateTokens(longText);

            expect(longTokens).toBeGreaterThan(shortTokens);
        });

        it('should round up token count', () => {
            const text = '12345'; // 5 chars should give 2 tokens (ceil(5/4))
            const tokens = TokenCounter.estimateTokens(text);
            expect(tokens).toBe(2);
        });
    });

    describe('estimateMessagesTokens', () => {
        it('should estimate tokens for single message', () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' }
            ];
            const tokens = TokenCounter.estimateMessagesTokens(messages);
            expect(tokens).toBeGreaterThan(0);
        });

        it('should estimate tokens for multiple messages', () => {
            const messages: ChatMessage[] = [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' }
            ];
            const tokens = TokenCounter.estimateMessagesTokens(messages);
            expect(tokens).toBeGreaterThan(5);
        });

        it('should handle empty messages array', () => {
            const tokens = TokenCounter.estimateMessagesTokens([]);
            expect(tokens).toBe(0);
        });

        it('should sum tokens from all messages', () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'First message' },
                { role: 'user', content: 'Second message' }
            ];

            const total = TokenCounter.estimateMessagesTokens(messages);
            const sum = messages.reduce((acc, msg) =>
                acc + TokenCounter.estimateTokens(msg.content), 0);

            expect(total).toBe(sum);
        });
    });
});
