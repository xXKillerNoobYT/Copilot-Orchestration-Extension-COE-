/**
 * Tests for Transport Manager and Provider Factory
 * Coverage for provider creation, switching, and fallback logic
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
    ProviderFactory,
    TransportManager,
    TransportConfig,
    ProviderType,
} from '../transportManager';
import { LLMProvider, ChatMessage, ChatResponse, ProviderConfig } from '../llmTransport';
import { OpenAIProvider } from '../openaiProvider';
import { AzureOpenAIProvider } from '../azureProvider';
import { LMStudioProvider } from '../lmstudioProvider';

// Mock the provider modules
jest.mock('../openaiProvider');
jest.mock('../azureProvider');
jest.mock('../lmstudioProvider');

describe('ProviderFactory', () => {
    let mockConfig: ProviderConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfig = {
            name: 'test-provider',
            baseUrl: 'http://localhost:1234/v1',
            apiKey: 'test-key',
            defaultModel: 'gpt-4',
            timeout: 30000,
        };
    });

    describe('createProvider', () => {
        it('should create OpenAI provider', () => {
            const provider = ProviderFactory.createProvider('openai', mockConfig);

            expect(OpenAIProvider).toHaveBeenCalledWith(mockConfig);
            expect(provider).toBeInstanceOf(OpenAIProvider);
        });

        it('should create Azure provider with deployment name', () => {
            const azureConfig = {
                ...mockConfig,
                deploymentName: 'gpt-4-deployment',
                apiVersion: '2024-02-01',
            };

            const provider = ProviderFactory.createProvider('azure', azureConfig);

            expect(AzureOpenAIProvider).toHaveBeenCalledWith(azureConfig);
            expect(provider).toBeInstanceOf(AzureOpenAIProvider);
        });

        it('should throw error for Azure without deployment name', () => {
            expect(() => {
                ProviderFactory.createProvider('azure', mockConfig);
            }).toThrow('Azure provider requires deploymentName');
        });

        it('should create LM Studio provider', () => {
            const provider = ProviderFactory.createProvider('lmstudio', mockConfig);

            expect(LMStudioProvider).toHaveBeenCalledWith(mockConfig);
            expect(provider).toBeInstanceOf(LMStudioProvider);
        });

        it('should throw error for unknown provider type', () => {
            expect(() => {
                ProviderFactory.createProvider('unknown' as ProviderType, mockConfig);
            }).toThrow('Unknown provider type: unknown');
        });
    });
});

describe('TransportManager', () => {
    let mockPrimaryProvider: jest.Mocked<LLMProvider>;
    let mockFallbackProvider: jest.Mocked<LLMProvider>;
    let config: TransportConfig;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock providers
        mockPrimaryProvider = {
            getName: jest.fn().mockReturnValue('primary-provider'),
            sendChat: jest.fn(),
            sendChatStream: jest.fn(),
            testConnection: jest.fn(),
        } as any;

        mockFallbackProvider = {
            getName: jest.fn().mockReturnValue('fallback-provider'),
            sendChat: jest.fn(),
            sendChatStream: jest.fn(),
            testConnection: jest.fn(),
        } as any;

        // Mock ProviderFactory
        (OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>).mockImplementation(
            () => mockPrimaryProvider as any
        );
        (LMStudioProvider as jest.MockedClass<typeof LMStudioProvider>).mockImplementation(
            () => mockFallbackProvider as any
        );

        config = {
            providerType: 'openai',
            config: {
                name: 'primary',
                baseUrl: 'http://localhost:1234/v1',
                apiKey: 'test-key',
            },
        };
    });

    describe('constructor', () => {
        it('should initialize with primary provider only', () => {
            const manager = new TransportManager(config);

            expect(manager.getPrimaryProvider()).toBe(mockPrimaryProvider);
            expect(manager.getAllProviders()).toEqual([mockPrimaryProvider]);
        });

        it('should initialize with fallback providers', () => {
            config.fallbackProviders = [
                {
                    providerType: 'lmstudio',
                    config: {
                        name: 'fallback',
                        baseUrl: 'http://localhost:5678/v1',
                    },
                },
            ];

            const manager = new TransportManager(config);

            expect(manager.getAllProviders()).toHaveLength(2);
            expect(manager.getAllProviders()[0]).toBe(mockPrimaryProvider);
            expect(manager.getAllProviders()[1]).toBe(mockFallbackProvider);
        });
    });

    describe('sendChat', () => {
        it('should use primary provider successfully', async () => {
            const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
            const expectedResponse: ChatResponse = {
                id: 'test-id',
                model: 'gpt-4',
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content: 'Hi!' },
                    finishReason: 'stop',
                }],
            };

            mockPrimaryProvider.sendChat.mockResolvedValue(expectedResponse);

            const manager = new TransportManager(config);
            const response = await manager.sendChat(messages);

            expect(response).toEqual(expectedResponse);
            expect(mockPrimaryProvider.sendChat).toHaveBeenCalledWith(messages);
        });

        it('should fallback to secondary provider on primary failure', async () => {
            config.fallbackProviders = [
                {
                    providerType: 'lmstudio',
                    config: { name: 'fallback', baseUrl: 'http://localhost:5678/v1' },
                },
            ];

            const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
            const expectedResponse: ChatResponse = {
                id: 'fallback-id',
                model: 'llama-2',
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content: 'Hi from fallback!' },
                    finishReason: 'stop',
                }],
            };

            mockPrimaryProvider.sendChat.mockRejectedValue(new Error('Primary failed'));
            mockFallbackProvider.sendChat.mockResolvedValue(expectedResponse);

            const manager = new TransportManager(config);
            const response = await manager.sendChat(messages);

            expect(response).toEqual(expectedResponse);
            expect(mockPrimaryProvider.sendChat).toHaveBeenCalled();
            expect(mockFallbackProvider.sendChat).toHaveBeenCalledWith(messages);
        });

        it('should throw error when all providers fail', async () => {
            config.fallbackProviders = [
                {
                    providerType: 'lmstudio',
                    config: { name: 'fallback', baseUrl: 'http://localhost:5678/v1' },
                },
            ];

            mockPrimaryProvider.sendChat.mockRejectedValue(new Error('Primary failed'));
            mockFallbackProvider.sendChat.mockRejectedValue(new Error('Fallback failed'));

            const manager = new TransportManager(config);
            const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

            await expect(manager.sendChat(messages)).rejects.toThrow('Fallback failed');
        });

        it('should pass options to provider', async () => {
            const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
            const options = { temperature: 0.7, maxTokens: 100 };

            mockPrimaryProvider.sendChat.mockResolvedValue({} as any);

            const manager = new TransportManager(config);
            await manager.sendChat(messages, options);

            expect(mockPrimaryProvider.sendChat).toHaveBeenCalledWith(messages, options);
        });
    });

    describe('sendChatStream', () => {
        it('should use primary provider for streaming', async () => {
            const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
            const expectedResponse: ChatResponse = {
                id: 'stream-id',
                model: 'gpt-4',
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content: 'Streamed response' },
                    finishReason: 'stop',
                }],
            };

            mockPrimaryProvider.sendChatStream.mockResolvedValue(expectedResponse);

            const manager = new TransportManager(config);
            const response = await manager.sendChatStream(messages);

            expect(response).toEqual(expectedResponse);
            expect(mockPrimaryProvider.sendChatStream).toHaveBeenCalledWith(messages);
        });

        it('should fallback on streaming failure', async () => {
            config.fallbackProviders = [
                {
                    providerType: 'lmstudio',
                    config: { name: 'fallback', baseUrl: 'http://localhost:5678/v1' },
                },
            ];

            const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
            const expectedResponse: ChatResponse = {
                id: 'fallback-stream-id',
                model: 'llama-2',
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content: 'Fallback stream' },
                    finishReason: 'stop',
                }],
            };

            mockPrimaryProvider.sendChatStream.mockRejectedValue(new Error('Stream failed'));
            mockFallbackProvider.sendChatStream.mockResolvedValue(expectedResponse);

            const manager = new TransportManager(config);
            const response = await manager.sendChatStream(messages);

            expect(response).toEqual(expectedResponse);
            expect(mockFallbackProvider.sendChatStream).toHaveBeenCalled();
        });

        it('should pass onChunk callback to provider', async () => {
            const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
            const onChunk = jest.fn();

            mockPrimaryProvider.sendChatStream.mockResolvedValue({} as any);

            const manager = new TransportManager(config);
            await manager.sendChatStream(messages, {}, onChunk);

            expect(mockPrimaryProvider.sendChatStream).toHaveBeenCalledWith(
                messages,
                {},
                onChunk
            );
        });
    });

    describe('testAllConnections', () => {
        it('should test primary provider only', async () => {
            mockPrimaryProvider.testConnection.mockResolvedValue(true);

            const manager = new TransportManager(config);
            const results = await manager.testAllConnections();

            expect(results).toEqual([
                { provider: 'primary-provider', connected: true },
            ]);
        });

        it('should test all providers including fallbacks', async () => {
            config.fallbackProviders = [
                {
                    providerType: 'lmstudio',
                    config: { name: 'fallback', baseUrl: 'http://localhost:5678/v1' },
                },
            ];

            mockPrimaryProvider.testConnection.mockResolvedValue(true);
            mockFallbackProvider.testConnection.mockResolvedValue(false);

            const manager = new TransportManager(config);
            const results = await manager.testAllConnections();

            expect(results).toEqual([
                { provider: 'primary-provider', connected: true },
                { provider: 'fallback-provider', connected: false },
            ]);
        });

        it('should handle connection test failures gracefully', async () => {
            mockPrimaryProvider.testConnection.mockRejectedValue(new Error('Test failed'));

            const manager = new TransportManager(config);

            // The promise should reject but not crash
            await expect(manager.testAllConnections()).rejects.toThrow();
        });
    });

    describe('getPrimaryProvider', () => {
        it('should return primary provider', () => {
            const manager = new TransportManager(config);
            const primary = manager.getPrimaryProvider();

            expect(primary).toBe(mockPrimaryProvider);
            expect(primary.getName()).toBe('primary-provider');
        });
    });

    describe('getAllProviders', () => {
        it('should return all providers in order', () => {
            config.fallbackProviders = [
                {
                    providerType: 'lmstudio',
                    config: { name: 'fallback', baseUrl: 'http://localhost:5678/v1' },
                },
            ];

            const manager = new TransportManager(config);
            const providers = manager.getAllProviders();

            expect(providers).toHaveLength(2);
            expect(providers[0]).toBe(mockPrimaryProvider);
            expect(providers[1]).toBe(mockFallbackProvider);
        });

        it('should return only primary when no fallbacks configured', () => {
            const manager = new TransportManager(config);
            const providers = manager.getAllProviders();

            expect(providers).toHaveLength(1);
            expect(providers[0]).toBe(mockPrimaryProvider);
        });
    });
});
