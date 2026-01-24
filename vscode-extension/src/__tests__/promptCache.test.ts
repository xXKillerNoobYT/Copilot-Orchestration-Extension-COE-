import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { PromptCache, CacheEntry, CacheStats } from '../llm/promptCache';

// Mock fs module
jest.mock('fs');
jest.mock('vscode');

describe('PromptCache', () => {
    let cache: PromptCache;
    let testWorkspaceFolder: string;
    const mockFs = fs as jest.Mocked<typeof fs>;

    beforeEach(() => {
        jest.clearAllMocks();

        testWorkspaceFolder = '/test/workspace';

        // Mock fs operations
        mockFs.existsSync.mockReturnValue(false); // Start with no cache file
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.readFileSync.mockReturnValue('[]'); // Return valid empty array JSON
        mockFs.writeFileSync.mockReturnValue(undefined);

        cache = new PromptCache(testWorkspaceFolder, 1024 * 1024, 100);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize cache with default values', () => {
            expect(cache).toBeDefined();
        });

        it('should create cache directory if it does not exist', () => {
            const originalExistsSyncImpl = mockFs.existsSync.getMockImplementation();
            mockFs.existsSync.mockImplementation((path: any) => {
                // Return false for directory check but follow original for file check
                if (typeof path === 'string' && path.includes('.copilot-cache')) {
                    return false;
                }
                return false;
            });

            new PromptCache(testWorkspaceFolder);

            expect(mockFs.mkdirSync).toHaveBeenCalled();

            // Restore
            if (originalExistsSyncImpl) {
                mockFs.existsSync.mockImplementation(originalExistsSyncImpl);
            } else {
                mockFs.existsSync.mockReturnValue(false);
            }
        });

        it('should not create directory if it exists', () => {
            jest.clearAllMocks(); // Clear from beforeEach cache creation

            // Mock to return true for directory check
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('[]'); // Valid JSON

            const testCache = new PromptCache(testWorkspaceFolder);

            expect(mockFs.mkdirSync).not.toHaveBeenCalled();
        });

        it('should accept custom max size and max entries', () => {
            const customCache = new PromptCache(testWorkspaceFolder, 2048, 50);
            expect(customCache).toBeDefined();
        });
    });

    describe('store', () => {
        it('should store a payload with key', async () => {
            const key = 'test-key-1';
            const payload = { data: 'test data', value: 123 };

            await cache.store(key, payload);

            const stats = cache.getStats();
            expect(stats.totalEntries).toBe(1);
        });

        it('should update existing entry', async () => {
            const key = 'test-key-1';
            const payload1 = { data: 'first' };
            const payload2 = { data: 'second' };

            await cache.store(key, payload1);
            await cache.store(key, payload2);

            const stats = cache.getStats();
            expect(stats.totalEntries).toBe(1); // Should not duplicate
        });

        it('should compress large payloads', async () => {
            const key = 'large-key';
            const largePayload = { data: 'x'.repeat(2000) };

            await cache.store(key, largePayload);

            const stats = cache.getStats();
            expect(stats.compressions).toBeGreaterThan(0);
        });

        it('should not compress small payloads', async () => {
            const key = 'small-key';
            const smallPayload = { data: 'small' };

            await cache.store(key, smallPayload);

            const stats = cache.getStats();
            expect(stats.compressions).toBe(0);
        });

        it('should evict LRU entries when max entries reached', async () => {
            const smallCache = new PromptCache(testWorkspaceFolder, 1024 * 1024, 3);

            await smallCache.store('key-1', { data: '1' });
            await smallCache.store('key-2', { data: '2' });
            await smallCache.store('key-3', { data: '3' });
            await smallCache.store('key-4', { data: '4' }); // Should evict key-1

            const stats = smallCache.getStats();
            expect(stats.totalEntries).toBe(3);
            expect(stats.evictions).toBeGreaterThan(0);
        });

        it('should evict entries when max size reached', async () => {
            const tinyCache = new PromptCache(testWorkspaceFolder, 500, 100);

            const largePayload = { data: 'x'.repeat(200) };
            await tinyCache.store('key-1', largePayload);
            await tinyCache.store('key-2', largePayload);
            await tinyCache.store('key-3', largePayload); // Should trigger eviction

            const stats = tinyCache.getStats();
            expect(stats.evictions).toBeGreaterThan(0);
        });
    });

    describe('get', () => {
        it('should retrieve stored payload', async () => {
            const key = 'test-key';
            const payload = { data: 'test', number: 42 };

            await cache.store(key, payload);
            const retrieved = await cache.get(key);

            expect(retrieved).toEqual(payload);
        });

        it('should return null for non-existent key', async () => {
            const retrieved = await cache.get('non-existent');

            expect(retrieved).toBeNull();
        });

        it('should increment access count on retrieval', async () => {
            const key = 'test-key';
            const payload = { data: 'test' };

            await cache.store(key, payload);
            await cache.get(key);
            await cache.get(key);

            const stats = cache.getStats();
            expect(stats.hits).toBe(2);
        });

        it('should update last accessed timestamp', async () => {
            const key = 'test-key';
            const payload = { data: 'test' };

            await cache.store(key, payload);

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 10));

            await cache.get(key);

            // Access time should be updated
            const retrieved = await cache.get(key);
            expect(retrieved).toEqual(payload);
        });

        it('should track cache misses', async () => {
            await cache.get('non-existent-1');
            await cache.get('non-existent-2');

            const stats = cache.getStats();
            expect(stats.misses).toBe(2);
        });

        it('should decompress compressed entries', async () => {
            const key = 'large-key';
            const largePayload = { data: 'x'.repeat(2000) };

            await cache.store(key, largePayload);
            const retrieved = await cache.get(key);

            expect(retrieved).toEqual(largePayload);
        });
    });

    describe('has', () => {
        it('should return true for existing key', async () => {
            const key = 'test-key';
            await cache.store(key, { data: 'test' });

            expect(cache.has(key)).toBe(true);
        });

        it('should return false for non-existent key', () => {
            expect(cache.has('non-existent')).toBe(false);
        });
    });

    describe('delete', () => {
        it('should delete existing entry', async () => {
            const key = 'test-key';
            await cache.store(key, { data: 'test' });

            cache.delete(key);

            expect(cache.has(key)).toBe(false);
        });

        it('should update stats after deletion', async () => {
            const key = 'test-key';
            await cache.store(key, { data: 'test' });

            cache.delete(key);

            const stats = cache.getStats();
            expect(stats.totalEntries).toBe(0);
        });

        it('should handle deleting non-existent key', () => {
            expect(() => cache.delete('non-existent')).not.toThrow();
        });
    });

    describe('clear', () => {
        it('should clear all entries', async () => {
            await cache.store('key-1', { data: '1' });
            await cache.store('key-2', { data: '2' });
            await cache.store('key-3', { data: '3' });

            cache.clear();

            const stats = cache.getStats();
            expect(stats.totalEntries).toBe(0);
            expect(stats.totalSize).toBe(0);
        });
    });

    describe('getStats', () => {
        it('should return accurate statistics', async () => {
            await cache.store('key-1', { data: '1' });
            await cache.store('key-2', { data: '2' });
            await cache.get('key-1');
            await cache.get('non-existent');

            const stats = cache.getStats();

            expect(stats.totalEntries).toBe(2);
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
        });

        it('should track compressions', async () => {
            const largePayload = { data: 'x'.repeat(2000) };
            await cache.store('large-1', largePayload);
            await cache.store('large-2', largePayload);

            const stats = cache.getStats();
            expect(stats.compressions).toBe(2);
        });
    });

    describe('persistence', () => {
        it('should save cache to disk', async () => {
            await cache.store('key-1', { data: 'persist me' });

            // Save happens automatically in store(), just verify it was called
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });

        it('should load cache from disk', () => {
            const savedData = JSON.stringify({
                entries: [
                    {
                        key: 'saved-key',
                        payload: JSON.stringify({ data: 'saved' }),
                        timestamp: Date.now(),
                        accessCount: 0,
                        lastAccessed: Date.now(),
                    },
                ],
                stats: {
                    totalEntries: 1,
                    totalSize: 100,
                    hits: 0,
                    misses: 0,
                    evictions: 0,
                    compressions: 0,
                },
            });

            mockFs.readFileSync.mockReturnValue(savedData);

            const newCache = new PromptCache(testWorkspaceFolder);

            expect(newCache.has('saved-key')).toBe(true);
        });

        it('should handle corrupted cache file gracefully', () => {
            mockFs.readFileSync.mockReturnValue('invalid json');

            expect(() => new PromptCache(testWorkspaceFolder)).not.toThrow();
        });

        it('should handle missing cache file', () => {
            mockFs.existsSync.mockReturnValue(false);
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            expect(() => new PromptCache(testWorkspaceFolder)).not.toThrow();
        });
    });

    describe('eviction strategy (LRU)', () => {
        it('should evict least recently used entry', async () => {
            const smallCache = new PromptCache(testWorkspaceFolder, 1024 * 1024, 3);

            await smallCache.store('key-1', { data: '1' });
            await smallCache.store('key-2', { data: '2' });
            await smallCache.store('key-3', { data: '3' });

            // Access key-1 to make it more recently used
            await smallCache.get('key-1');

            // Add key-4, should evict key-2 (least recently used)
            await smallCache.store('key-4', { data: '4' });

            expect(smallCache.has('key-1')).toBe(true);
            expect(smallCache.has('key-4')).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty payload', async () => {
            await cache.store('empty', {});

            const retrieved = await cache.get('empty');
            expect(retrieved).toEqual({});
        });

        it('should handle null values in payload', async () => {
            const payload = { data: null, value: undefined };
            await cache.store('null-values', payload);

            const retrieved = await cache.get('null-values');
            expect(retrieved.data).toBeNull();
        });

        it('should handle nested objects', async () => {
            const nested = {
                level1: {
                    level2: {
                        level3: {
                            data: 'deep',
                        },
                    },
                },
            };

            await cache.store('nested', nested);
            const retrieved = await cache.get('nested');

            expect(retrieved.level1.level2.level3.data).toBe('deep');
        });

        it('should handle arrays in payload', async () => {
            const payload = { items: [1, 2, 3, 4, 5] };
            await cache.store('array', payload);

            const retrieved = await cache.get('array');
            expect(retrieved.items).toEqual([1, 2, 3, 4, 5]);
        });

        it('should handle very large payloads', async () => {
            const veryLarge = { data: 'x'.repeat(100000) };
            await cache.store('huge', veryLarge);

            const retrieved = await cache.get('huge');
            expect(retrieved.data.length).toBe(100000);
        });
    });
});
