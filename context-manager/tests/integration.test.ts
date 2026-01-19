/**
 * Integration tests for ContextManager edge cases and branch coverage
 * Reference: https://jestjs.io/docs/setup-teardown
 */

import { ContextManager } from '../src/context-manager';
import { ContextType, StorageFormat } from '../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DATA_DIR = path.join(__dirname, 'integration-test-data');

describe('ContextManager Integration - Branch Coverage', () => {
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
            maxMemoryCache: 10
        });
    });

    afterEach(async () => {
        try {
            await fs.rm(TEST_DATA_DIR, { recursive: true });
        } catch {
            // Ignore
        }
    });

    describe('queryContexts - branch coverage', () => {
        beforeEach(async () => {
            // Set up diverse test data
            await manager.saveAgentOutput('task-1', {
                agentId: 'agent-1',
                taskId: 'task-1',
                prompt: 'Prompt 1',
                response: 'Response 1',
                tokensUsed: 100
            });

            await manager.saveAgentOutput('task-1', {
                agentId: 'agent-2',
                taskId: 'task-1',
                prompt: 'Prompt 2',
                response: 'Response 2',
                tokensUsed: 150
            });

            await manager.saveTaskCompletion('task-1', {
                taskId: 'task-1',
                status: 'completed',
                duration: 5000
            });

            await manager.saveAgentOutput('task-2', {
                agentId: 'agent-3',
                taskId: 'task-2',
                prompt: 'Prompt 3',
                response: 'Response 3'
            });
        });

        it('should handle query with no filters', async () => {
            const results = await manager.queryContexts({});
            expect(results.length).toBeGreaterThan(0);
        });

        it('should filter by type and return matching contexts', async () => {
            const results = await manager.queryContexts({
                type: ContextType.TASK_COMPLETION
            });

            expect(results.length).toBe(1);
            expect(results[0].metadata.type).toBe(ContextType.TASK_COMPLETION);
        });

        it('should handle query with tags that dont exist', async () => {
            const results = await manager.queryContexts({
                tags: ['nonexistent-tag']
            });

            expect(results).toHaveLength(0);
        });

        it('should sort results by timestamp (newest first)', async () => {
            // Add a new context after a delay
            await new Promise(resolve => setTimeout(resolve, 10));

            await manager.saveAgentOutput('task-3', {
                agentId: 'agent-4',
                taskId: 'task-3',
                prompt: 'Newest',
                response: 'Response'
            });

            const results = await manager.queryContexts({});

            // First result should be from task-3 (newest)
            expect(results[0].metadata.taskId).toBe('task-3');
        });

        it('should truncate results to limit', async () => {
            const results = await manager.queryContexts({ limit: 2 });
            expect(results.length).toBeLessThanOrEqual(2);
        });
    });

    describe('loadContext - cache behavior', () => {
        it('should return cloned data from cache', async () => {
            const contextId = await manager.saveAgentOutput('task-cache', {
                agentId: 'agent-1',
                taskId: 'task-cache',
                prompt: 'Test',
                response: 'Response'
            });

            const first = await manager.loadContext(contextId);
            const second = await manager.loadContext(contextId);

            // Should be equal but not the same reference
            expect(first).toEqual(second);
            expect(first).not.toBe(second);
        });

        it('should return null for non-existent context', async () => {
            const result = await manager.loadContext('non-existent-id');
            expect(result).toBeNull();
        });
    });

    describe('deleteContext - edge cases', () => {
        it('should successfully delete an existing context', async () => {
            const contextId = await manager.saveAgentOutput('task-del', {
                agentId: 'agent-1',
                taskId: 'task-del',
                prompt: 'Delete me',
                response: 'Response'
            });

            const deleted = await manager.deleteContext(contextId);
            expect(deleted).toBe(true);

            const loaded = await manager.loadContext(contextId);
            expect(loaded).toBeNull();
        });

        it('should return false when context not found', async () => {
            const deleted = await manager.deleteContext('totally-fake-id-12345');
            expect(deleted).toBe(false);
        });

        it('should handle deletion and then retrieval of same task', async () => {
            const contextId1 = await manager.saveAgentOutput('task-multi-del', {
                agentId: 'agent-1',
                taskId: 'task-multi-del',
                prompt: 'First',
                response: 'Response 1'
            });

            const contextId2 = await manager.saveAgentOutput('task-multi-del', {
                agentId: 'agent-2',
                taskId: 'task-multi-del',
                prompt: 'Second',
                response: 'Response 2'
            });

            // Delete first
            await manager.deleteContext(contextId1);

            // Second should still exist
            const remaining = await manager.getContextForTask('task-multi-del');
            expect(remaining.length).toBe(1);
            expect(remaining[0].metadata.id).toBe(contextId2);
        });
    });

    describe('getContextForTask - filtering', () => {
        it('should exclude expired contexts', async () => {
            const contextId = await manager.saveAgentOutput('task-expire-test', {
                agentId: 'agent-1',
                taskId: 'task-expire-test',
                prompt: 'Will expire',
                response: 'Response'
            });

            const context = await manager.loadContext(contextId);
            if (context) {
                context.metadata.expiresAt = new Date(Date.now() - 1000);
                await manager.saveContext(context);
            }

            const results = await manager.getContextForTask('task-expire-test');

            // Should be filtered out
            expect(results).toHaveLength(0);
        });
    });

    describe('matchesQuery - all filter combinations', () => {
        it('should match contexts with specific type and date range', async () => {
            const contextId = await manager.saveAgentOutput('task-filter', {
                agentId: 'agent-1',
                taskId: 'task-filter',
                prompt: 'Test',
                response: 'Response'
            });

            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const results = await manager.queryContexts({
                type: ContextType.AGENT_RESPONSE,
                fromDate: yesterday,
                toDate: tomorrow
            });

            expect(results.length).toBeGreaterThanOrEqual(1);
        });

        it('should exclude contexts from outside date range', async () => {
            const contextId = await manager.saveAgentOutput('task-date-filter', {
                agentId: 'agent-1',
                taskId: 'task-date-filter',
                prompt: 'Test',
                response: 'Response'
            });

            // Query for tomorrow onwards (should exclude today's data)
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

            const results = await manager.queryContexts({
                fromDate: tomorrow,
                toDate: dayAfter
            });

            expect(results).toHaveLength(0);
        });
    });

    describe('getTaskReferences - structure verification', () => {
        it('should create valid reference structures', async () => {
            const contextId1 = await manager.saveAgentOutput('task-ref', {
                agentId: 'agent-1',
                taskId: 'task-ref',
                prompt: 'Test 1',
                response: 'Response 1'
            });

            const contextId2 = await manager.saveTaskCompletion('task-ref', {
                taskId: 'task-ref',
                status: 'completed'
            });

            const refs = await manager.getTaskReferences('task-ref');

            expect(refs).toHaveLength(2);

            refs.forEach(ref => {
                expect(ref).toHaveProperty('contextId');
                expect(ref).toHaveProperty('taskId');
                expect(ref).toHaveProperty('type');
                expect(ref).toHaveProperty('path');
                expect(ref).toHaveProperty('timestamp');
                expect(ref.taskId).toBe('task-ref');
            });
        });
    });

    describe('cache management', () => {
        it('should handle cache clear operation', async () => {
            // Add some data
            await manager.saveAgentOutput('task-cache-clear', {
                agentId: 'agent-1',
                taskId: 'task-cache-clear',
                prompt: 'Test',
                response: 'Response'
            });

            // Clear cache
            manager.clearCache();

            // Should still be able to access data (from storage)
            const contexts = await manager.getContextForTask('task-cache-clear');
            expect(contexts.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('saveContext - metadata handling', () => {
        it('should properly update metadata when saving', async () => {
            const agentOutput = {
                agentId: 'agent-1',
                taskId: 'task-metadata',
                prompt: 'Test',
                response: 'Response'
            };

            const contextId = await manager.saveAgentOutput('task-metadata', agentOutput);

            const loaded = await manager.loadContext(contextId);

            expect(loaded).toBeTruthy();
            expect(loaded?.metadata.id).toBe(contextId);
            expect(loaded?.metadata.taskId).toBe('task-metadata');
            expect(loaded?.metadata.type).toBe(ContextType.AGENT_RESPONSE);
            // Date may be serialized/deserialized, so check it's a valid date
            expect(loaded?.metadata.timestamp).toBeDefined();
            expect(loaded?.metadata.version).toBe('1.0.0');
        });
    });

    describe('multiple context types', () => {
        it('should distinguish between different context types', async () => {
            const taskId = 'task-types';

            const agentId = await manager.saveAgentOutput(taskId, {
                agentId: 'agent-1',
                taskId,
                prompt: 'P',
                response: 'R'
            });

            const compId = await manager.saveTaskCompletion(taskId, {
                taskId,
                status: 'completed'
            });

            const interId = await manager.saveIntermediateOutput(taskId, {
                taskId,
                step: 'planning',
                data: { key: 'value' },
                isPartial: false
            });

            const archId = await manager.saveArchitectureSnapshot(taskId, {
                components: [
                    {
                        name: 'component1',
                        type: 'service',
                        dependencies: [],
                        description: 'Test component'
                    }
                ],
                relationships: [
                    {
                        from: 'component1',
                        to: 'component2',
                        type: 'depends-on'
                    }
                ]
            });

            const contexts = await manager.getContextForTask(taskId);

            expect(contexts).toHaveLength(4);

            const types = contexts.map(c => c.metadata.type);
            expect(types).toContain(ContextType.AGENT_RESPONSE);
            expect(types).toContain(ContextType.TASK_COMPLETION);
            expect(types).toContain(ContextType.INTERMEDIATE_OUTPUT);
            expect(types).toContain(ContextType.ARCHITECTURE_SNAPSHOT);
        });
    });
});
