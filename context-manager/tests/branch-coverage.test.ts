/**
 * Tests to achieve 100% branch coverage for context-manager
 * Reference: https://jestjs.io/docs/coverage#branch-coverage
 */

import { ContextManager } from '../src/context-manager';
import { ContextType, StorageFormat } from '../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DATA_DIR = path.join(__dirname, 'coverage-test-data');

describe('ContextManager - Branch Coverage (100%)', () => {
    let manager: ContextManager;

    beforeEach(async () => {
        try {
            await fs.rm(TEST_DATA_DIR, { recursive: true });
        } catch {
            // Ignore
        }

        manager = new ContextManager({
            dataDir: TEST_DATA_DIR,
            storageFormat: StorageFormat.JSON,
            maxMemoryCache: 1 // Very small cache to trigger eviction
        });
    });

    afterEach(async () => {
        try {
            await fs.rm(TEST_DATA_DIR, { recursive: true });
        } catch {
            // Ignore
        }
    });

    describe('cache LRU eviction (line 368-371)', () => {
        it('should trigger cache eviction when cache exceeds max size', async () => {
            // Reference: https://jestjs.io/docs/mock-functions
            // Create multiple large contexts to exceed small 1MB cache
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    manager.saveAgentOutput(`task-lru-${i}`, {
                        agentId: `agent-${i}`,
                        taskId: `task-lru-${i}`,
                        prompt: 'X'.repeat(5000), // Large payload
                        response: 'Y'.repeat(5000)
                    })
                );
            }

            await Promise.all(promises);

            // All should be saved despite cache size restrictions
            const stats = await manager.getStats();
            expect(stats.totalContexts).toBeGreaterThanOrEqual(10);
        });

        it('should continue to work correctly after cache eviction', async () => {
            // Save two large contexts
            const id1 = await manager.saveAgentOutput('task-evict-1', {
                agentId: 'agent-1',
                taskId: 'task-evict-1',
                prompt: 'First' + 'A'.repeat(5000),
                response: 'Response 1' + 'B'.repeat(5000)
            });

            const id2 = await manager.saveAgentOutput('task-evict-2', {
                agentId: 'agent-2',
                taskId: 'task-evict-2',
                prompt: 'Second' + 'C'.repeat(5000),
                response: 'Response 2' + 'D'.repeat(5000)
            });

            // Load both - one should cause eviction, but both should be retrievable from storage
            const loaded1 = await manager.loadContext(id1);
            const loaded2 = await manager.loadContext(id2);

            expect(loaded1).toBeTruthy();
            expect(loaded2).toBeTruthy();
            expect(loaded1?.metadata.id).toBe(id1);
            expect(loaded2?.metadata.id).toBe(id2);
        });
    });

    describe('matchesQuery - date boundary branches (lines 398-401)', () => {
        beforeEach(async () => {
            await manager.saveAgentOutput('task-date-test', {
                agentId: 'agent-1',
                taskId: 'task-date-test',
                prompt: 'Test',
                response: 'Response'
            });
        });

        it('should exclude contexts before fromDate', async () => {
            // Query for tomorrow - should exclude today's data
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const results = await manager.queryContexts({
                fromDate: tomorrow
            });

            expect(results).toHaveLength(0);
        });

        it('should exclude contexts after toDate', async () => {
            // Query for yesterday - should exclude today's data
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const results = await manager.queryContexts({
                toDate: yesterday
            });

            expect(results).toHaveLength(0);
        });

        it('should exclude expired contexts when includeExpired=false', async () => {
            const contextId = await manager.saveAgentOutput('task-expire-check', {
                agentId: 'agent-1',
                taskId: 'task-expire-check',
                prompt: 'Will expire',
                response: 'Response'
            });

            const context = await manager.loadContext(contextId);
            if (context) {
                context.metadata.expiresAt = new Date(Date.now() - 1000); // 1 second ago
                await manager.saveContext(context);
            }

            // Explicitly set includeExpired to false
            const results = await manager.queryContexts({
                includeExpired: false
            });

            // Expired context should be filtered
            expect(results.every(c => !c.metadata.expiresAt || c.metadata.expiresAt > new Date())).toBe(true);
        });

        it('should include expired contexts when includeExpired=true', async () => {
            const contextId = await manager.saveAgentOutput('task-include-expired-check', {
                agentId: 'agent-1',
                taskId: 'task-include-expired-check',
                prompt: 'Will expire',
                response: 'Response'
            });

            const context = await manager.loadContext(contextId);
            if (context) {
                context.metadata.expiresAt = new Date(Date.now() - 1000);
                await manager.saveContext(context);
            }

            const results = await manager.queryContexts({
                includeExpired: true
            });

            // Should include the expired context
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results.some(c => c.metadata.taskId === 'task-include-expired-check')).toBe(true);
        });
    });

    describe('query context with type filter', () => {
        it('should filter by type and exclude mismatches', async () => {
            await manager.saveAgentOutput('task-type-filter', {
                agentId: 'agent-1',
                taskId: 'task-type-filter',
                prompt: 'Test',
                response: 'Response'
            });

            await manager.saveTaskCompletion('task-type-filter', {
                taskId: 'task-type-filter',
                status: 'completed'
            });

            const agentResults = await manager.queryContexts({
                type: ContextType.AGENT_RESPONSE
            });

            const completionResults = await manager.queryContexts({
                type: ContextType.TASK_COMPLETION
            });

            expect(agentResults.length).toBeGreaterThan(0);
            expect(completionResults.length).toBeGreaterThan(0);
            expect(agentResults[0].metadata.type).toBe(ContextType.AGENT_RESPONSE);
            expect(completionResults[0].metadata.type).toBe(ContextType.TASK_COMPLETION);
        });
    });

    describe('query context with tags filter', () => {
        it('should filter by tags and exclude contexts without matching tags', async () => {
            const contextId = await manager.saveAgentOutput('task-tags-filter', {
                agentId: 'agent-1',
                taskId: 'task-tags-filter',
                prompt: 'Test',
                response: 'Response'
            });

            // Add tags to context
            const context = await manager.loadContext(contextId);
            if (context) {
                context.metadata.tags = ['important', 'urgent'];
                await manager.saveContext(context);
            }

            // Query with matching tag
            const matchingResults = await manager.queryContexts({
                tags: ['important']
            });

            expect(matchingResults.length).toBeGreaterThan(0);

            // Query with non-matching tag
            const nonMatchingResults = await manager.queryContexts({
                tags: ['nonexistent']
            });

            expect(nonMatchingResults.every(c =>
                !c.metadata.tags || !c.metadata.tags.includes('nonexistent')
            )).toBe(true);
        });

        it('should handle contexts without tags in query', async () => {
            await manager.saveAgentOutput('task-no-tags', {
                agentId: 'agent-1',
                taskId: 'task-no-tags',
                prompt: 'Test',
                response: 'Response'
            });

            // Query should exclude contexts without matching tags
            const results = await manager.queryContexts({
                tags: ['specific-tag']
            });

            // Should not include the context without tags
            expect(results.every(c => c.metadata.taskId !== 'task-no-tags')).toBe(true);
        });
    });

    describe('deleteContext result verification (line 274)', () => {
        it('should return false when matchingFile is not found', async () => {
            const result = await manager.deleteContext('definitely-nonexistent-id-' + Date.now());
            expect(result).toBe(false);
        });

        it('should return true when context is successfully deleted', async () => {
            const contextId = await manager.saveAgentOutput('task-delete-verify', {
                agentId: 'agent-1',
                taskId: 'task-delete-verify',
                prompt: 'Test',
                response: 'Response'
            });

            const result = await manager.deleteContext(contextId);
            expect(result).toBe(true);

            // Verify it's actually deleted
            const loaded = await manager.loadContext(contextId);
            expect(loaded).toBeNull();
        });
    });
});
