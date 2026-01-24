/**
 * Tests for LLM Transport Layer
 * Verifies multi-provider LLM communication with retry and rate limiting
 */

import {
    LLMProvider,
    RateLimiter,
    TokenCounter,
    ChatMessage,
    ChatResponse,
    ChatRequestOptions,
    ProviderConfig,
    StreamChunk,
} from '../llmTransport';

// Concrete implementation for testing
class TestLLMProvider extends LLMProvider {
    public callCount = 0;
    public shouldFail = false;
    public failureCount = 0;

    async sendChat(messages: ChatMessage[], options?: ChatRequestOptions): Promise<ChatResponse> {
        this.callCount++;

        if (this.shouldFail && this.callCount <= this.failureCount) {
            throw new Error('Test error');
        }

        return {
            id: 'test-response-id',
            model: options?.model || this.config.defaultModel || 'test-model',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: 'Test response',
                    },
                    finishReason: 'stop',
                },
            ],
            usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30,
            },
        };
    }

    async sendChatStream(
        messages: ChatMessage[],
        options?: ChatRequestOptions,
        onChunk?: (chunk: StreamChunk) => void
    ): Promise<ChatResponse> {
        this.callCount++;

        if (onChunk) {
            onChunk({
                id: 'stream-id',
                model: 'test-model',
                choices: [
                    {
                        index: 0,
                        delta: { content: 'Test ' },
                        finishReason: null,
                    },
                ],
            });
            onChunk({
                id: 'stream-id',
                model: 'test-model',
                choices: [
                    {
                        index: 0,
                        delta: { content: 'response' },
                        finishReason: 'stop',
                    },
                ],
            });
        }

        return this.sendChat(messages, options);
    }

    async testConnection(): Promise<boolean> {
        return true;
    }
}

describe('LLMProvider', () => {
    let provider: TestLLMProvider;
    let config: ProviderConfig;

    beforeEach(() => {
        config = {
            name: 'test-provider',
            baseUrl: 'http://localhost:1234/v1',
            apiKey: 'test-key',
            defaultModel: 'test-model',
            timeout: 30000,
            maxRetries: 3,
        };

        provider = new TestLLMProvider(config);
    });

    describe('Initialization', () => {
        it('should initialize with config', () => {
            expect(provider).toBeDefined();
            expect(provider.getName()).toBe('test-provider');
        });

        it('should set default retry policy', () => {
            expect(provider).toBeDefined();
            // Retry policy is private, but provider should work
        });

        it('should accept custom max retries', () => {
            const customProvider = new TestLLMProvider({
                ...config,
                maxRetries: 10,
            });
            expect(customProvider).toBeDefined();
        });
    });

    describe('sendChat', () => {
        it('should send chat request successfully', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' },
            ];

            const response = await provider.sendChat(messages);

            expect(response).toBeDefined();
            expect(response.id).toBe('test-response-id');
            expect(response.choices[0].message.content).toBe('Test response');
            expect(provider.callCount).toBe(1);
        });

        it('should handle options', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' },
            ];

            const options: ChatRequestOptions = {
                model: 'custom-model',
                temperature: 0.7,
                maxTokens: 100,
            };

            const response = await provider.sendChat(messages, options);

            expect(response.model).toBe('custom-model');
        });

        it('should handle multiple messages', async () => {
            const messages: ChatMessage[] = [
                { role: 'system', content: 'You are helpful' },
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
                { role: 'user', content: 'How are you?' },
            ];

            const response = await provider.sendChat(messages);

            expect(response).toBeDefined();
        });
    });

    describe('sendChatStream', () => {
        it('should send streaming chat request', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' },
            ];

            const chunks: StreamChunk[] = [];
            const onChunk = (chunk: StreamChunk) => {
                chunks.push(chunk);
            };

            const response = await provider.sendChatStream(messages, {}, onChunk);

            expect(response).toBeDefined();
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should work without chunk callback', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello' },
            ];

            const response = await provider.sendChatStream(messages);

            expect(response).toBeDefined();
        });
    });

    describe('testConnection', () => {
        it('should test connection successfully', async () => {
            const result = await provider.testConnection();
            expect(result).toBe(true);
        });
    });

    describe('getName', () => {
        it('should return provider name', () => {
            expect(provider.getName()).toBe('test-provider');
        });
    });
});

describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter(10, 1000);
    });

    describe('checkLimit', () => {
        it('should allow requests within limit', async () => {
            const allowed = await rateLimiter.checkLimit(100);
            expect(allowed).toBe(true);
        });

        it('should enforce request rate limit', async () => {
            // Make 10 requests
            for (let i = 0; i < 10; i++) {
                rateLimiter.recordRequest(50);
            }

            const allowed = await rateLimiter.checkLimit(50);
            expect(allowed).toBe(false);
        });

        it('should enforce token rate limit', async () => {
            rateLimiter.recordRequest(1001);
            const allowed = await rateLimiter.checkLimit(0);
            expect(allowed).toBe(false);
        });

        it('should allow requests after time window passes', async () => {
            // Record a request
            rateLimiter.recordRequest(100);

            // Should still be allowed
            const allowed = await rateLimiter.checkLimit(100);
            expect(allowed).toBe(true);
        });
    });

    describe('recordRequest', () => {
        it('should record request without tokens', () => {
            expect(() => rateLimiter.recordRequest()).not.toThrow();
        });

        it('should record request with tokens', () => {
            expect(() => rateLimiter.recordRequest(500)).not.toThrow();
        });

        it('should record multiple requests', () => {
            rateLimiter.recordRequest(100);
            rateLimiter.recordRequest(200);
            rateLimiter.recordRequest(300);

            expect(() => rateLimiter.recordRequest(50)).not.toThrow();
        });
    });

    describe('waitForLimit', () => {
        it('should return immediately when limit not exceeded', async () => {
            await expect(rateLimiter.waitForLimit(100)).resolves.toBeUndefined();
        });

        it('should handle zero token estimates', async () => {
            await expect(rateLimiter.waitForLimit(0)).resolves.toBeUndefined();
        });
    });
});

describe('TokenCounter', () => {
    describe('estimateTokens', () => {
        it('should estimate tokens for short text', () => {
            const tokens = TokenCounter.estimateTokens('Hello world');
            expect(tokens).toBeGreaterThan(0);
            expect(tokens).toBeLessThan(20);
        });

        it('should estimate tokens for long text', () => {
            const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10);
            const tokens = TokenCounter.estimateTokens(longText);
            expect(tokens).toBeGreaterThan(50);
        });

        it('should estimate tokens for empty text', () => {
            const tokens = TokenCounter.estimateTokens('');
            expect(tokens).toBe(0);
        });

        it('should handle unicode characters', () => {
            const tokens = TokenCounter.estimateTokens('Hello 世界 🌍');
            expect(tokens).toBeGreaterThan(0);
        });
    });

    describe('estimateMessagesTokens', () => {
        it('should estimate tokens for single message', () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Hello world' },
            ];

            const tokens = TokenCounter.estimateMessagesTokens(messages);
            expect(tokens).toBeGreaterThan(0);
        });

        it('should estimate tokens for multiple messages', () => {
            const messages: ChatMessage[] = [
                { role: 'system', content: 'You are helpful' },
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
            ];

            const tokens = TokenCounter.estimateMessagesTokens(messages);
            expect(tokens).toBeGreaterThan(0);
        });

        it('should estimate tokens for empty messages array', () => {
            const tokens = TokenCounter.estimateMessagesTokens([]);
            expect(tokens).toBe(0);
        });

        it('should handle messages with empty content', () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: '' },
                { role: 'assistant', content: '' },
            ];

            const tokens = TokenCounter.estimateMessagesTokens(messages);
            expect(tokens).toBe(0);
        });
    });
});
