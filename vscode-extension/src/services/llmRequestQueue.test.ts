/**
 * Tests for LLM Request Queue Service
 */

import { LlmRequestQueue } from './llmRequestQueue';

// Mock the timeout config
jest.mock('../config/llmTimeouts', () => ({
    readLlmTimeoutConfig: () => ({
        config: {
            coldLoadMs: 600000,
            modelSwitchMs: 100, // Short for testing
            testConnectionMs: 120000,
            requestMs: 1000, // Short for testing
            queuedResponseMs: 100, // Short for testing
            agentActivationMs: 900000,
            agentDeactivationMs: 300000,
            maxQueueDepth: 5, // Small for testing
        },
        issues: [],
        isValid: true,
    }),
    getQueueWaitEstimate: (depth: number, config: any) => `${depth} requests`,
}));

describe('LlmRequestQueue', () => {
    let queue: LlmRequestQueue;

    beforeEach(() => {
        queue = new LlmRequestQueue();
        jest.clearAllTimers();
        jest.useFakeTimers();
    });

    afterEach(() => {
        queue.clear({ rejectPending: false });
        jest.useRealTimers();
    });

    describe('enqueue', () => {
        it('should enqueue and execute a request', async () => {
            const mockExecute = jest.fn().mockResolvedValue('result');

            const promise = queue.enqueue({
                id: 'req-1',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: mockExecute,
            });

            // Fast-forward through all timers
            await jest.runAllTimersAsync();

            const result = await promise;

            expect(mockExecute).toHaveBeenCalled();
            expect(result).toBe('result');
        });

        it('should reject when queue is full', async () => {
            jest.useFakeTimers();

            // Fill queue to max depth (5)
            const promises: Promise<any>[] = [];
            for (let i = 0; i < 5; i++) {
                const p = queue.enqueue({
                    id: `req-${i}`,
                    agentId: 'agent-1',
                    modelName: 'model-a',
                    priority: 1,
                    execute: () => new Promise(() => { }), // Never resolves
                });
                promises.push(p);
            }

            // Process queue (but won't complete since execute never resolves)
            // Note: intentionally do not advance timers to avoid triggering request timeouts

            // Try to add one more - should reject immediately
            const overflowPromise = queue.enqueue({
                id: 'req-overflow',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: () => Promise.resolve('result'),
            });

            await expect(overflowPromise).rejects.toThrow('Queue full');

            jest.useRealTimers();
        });

        it('should process requests in priority order', async () => {
            const executionOrder: string[] = [];

            // Use fake timers to prevent immediate processing
            jest.useFakeTimers();

            // Enqueue low priority first
            queue.enqueue({
                id: 'low',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: async () => {
                    executionOrder.push('low');
                    return 'low-result';
                },
            });

            // Enqueue high priority second (higher number = higher priority in insertion logic)
            queue.enqueue({
                id: 'high',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 10,
                execute: async () => {
                    executionOrder.push('high');
                    return 'high-result';
                },
            });

            // Process queue - high priority should be sorted first before execution
            await jest.runAllTimersAsync();

            // High priority (10) should execute before low priority (1)
            expect(executionOrder).toEqual(['high', 'low']);

            jest.useRealTimers();
        });

        it('should apply model switch delay when switching models', async () => {
            const firstExecute = jest.fn().mockResolvedValue('first');
            const secondExecute = jest.fn().mockResolvedValue('second');

            // First request with model-a
            queue.enqueue({
                id: 'req-1',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: firstExecute,
            });

            // Wait for first to complete
            await jest.runAllTimersAsync();

            // Second request with model-b (different model)
            queue.enqueue({
                id: 'req-2',
                agentId: 'agent-2',
                modelName: 'model-b',
                priority: 1,
                execute: secondExecute,
            });

            await jest.runAllTimersAsync();

            expect(firstExecute).toHaveBeenCalled();
            expect(secondExecute).toHaveBeenCalled();

            // Should have waited for model switch
            const status = queue.getStatus();
            expect(status.currentModel).toBe('model-b');
        });

        it('should timeout requests that exceed requestMs', async () => {
            jest.useFakeTimers();

            const slowExecute = () => new Promise<string>((resolve) => {
                setTimeout(() => resolve('result'), 5000); // Longer than requestMs (1000ms)
            });

            const promise = queue.enqueue({
                id: 'req-slow',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: slowExecute,
            });

            const expectation = expect(promise).rejects.toThrow('Request timeout');

            // Fast-forward all timers to trigger the queue timeout immediately
            await jest.runAllTimersAsync();

            await expectation;

            jest.useRealTimers();
        }, 10000);
    });

    describe('getStatus', () => {
        it('should return queue status', () => {
            queue.enqueue({
                id: 'req-1',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: () => new Promise(() => { }),
            });

            const status = queue.getStatus();

            expect(status.queueDepth).toBeGreaterThan(0);
            expect(status.requestsProcessed).toBe(0);
            expect(status.requestsFailed).toBe(0);
        });

        it('should track processed requests', async () => {
            queue.enqueue({
                id: 'req-1',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: () => Promise.resolve('result'),
            });

            await jest.runAllTimersAsync();

            const status = queue.getStatus();
            expect(status.requestsProcessed).toBe(1);
            expect(status.requestsFailed).toBe(0);
        });

        it('should track failed requests', async () => {
            jest.useFakeTimers();
            const promise = queue.enqueue({
                id: 'req-fail',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: () => Promise.reject(new Error('Failure')),
            });

            const expectation = expect(promise).rejects.toThrow('Failure');

            await jest.runAllTimersAsync();
            await expectation;

            const status = queue.getStatus();
            expect(status.requestsFailed).toBe(1);
            jest.useRealTimers();
        });
    });

    describe('clear', () => {
        it('should clear all pending requests', async () => {
            // Add some requests
            for (let i = 0; i < 3; i++) {
                queue.enqueue({
                    id: `req-${i}`,
                    agentId: 'agent-1',
                    modelName: 'model-a',
                    priority: 1,
                    execute: () => new Promise(() => { }),
                });
            }

            const statusBefore = queue.getStatus();
            expect(statusBefore.queueDepth).toBe(3);

            queue.clear({ rejectPending: false });

            const statusAfter = queue.getStatus();
            expect(statusAfter.queueDepth).toBe(0);
        });

        it('should reject cleared requests', async () => {
            const promise = queue.enqueue({
                id: 'req-1',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: () => new Promise(() => { }),
            });

            queue.clear();

            await expect(promise).rejects.toThrow('Queue cleared');
        });
    });

    describe('refreshConfig', () => {
        it('should update timeout configuration', () => {
            const statusBefore = queue.getStatus();

            queue.refreshConfig();

            const statusAfter = queue.getStatus();

            // Status should still be accessible
            expect(statusAfter).toBeDefined();
        });
    });

    describe('singleton pattern', () => {
        it('should return same instance', () => {
            const instance1 = LlmRequestQueue.getInstance();
            const instance2 = LlmRequestQueue.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('edge cases', () => {
        it('should handle empty queue processing', async () => {
            // No requests enqueued
            const status = queue.getStatus();

            expect(status.queueDepth).toBe(0);
            expect(status.isProcessing).toBe(false);
        });

        it('should handle same model requests without delay', async () => {
            const firstExecute = jest.fn().mockResolvedValue('first');
            const secondExecute = jest.fn().mockResolvedValue('second');

            queue.enqueue({
                id: 'req-1',
                agentId: 'agent-1',
                modelName: 'model-a',
                priority: 1,
                execute: firstExecute,
            });

            await jest.runAllTimersAsync();

            queue.enqueue({
                id: 'req-2',
                agentId: 'agent-2',
                modelName: 'model-a', // Same model
                priority: 1,
                execute: secondExecute,
            });

            await jest.runAllTimersAsync();

            const status = queue.getStatus();
            expect(status.currentModel).toBe('model-a');
        });

        it('should handle rapid sequential requests', async () => {
            const promises = [];

            for (let i = 0; i < 3; i++) {
                promises.push(
                    queue.enqueue({
                        id: `req-${i}`,
                        agentId: 'agent-1',
                        modelName: 'model-a',
                        priority: 1,
                        execute: () => Promise.resolve(`result-${i}`),
                    })
                );
            }

            await jest.runAllTimersAsync();

            const results = await Promise.all(promises);
            expect(results).toEqual(['result-0', 'result-1', 'result-2']);
        });
    });
});
