/**
 * LLM Request Queue Service
 * 
 * Manages request queueing when multiple agents use different LLMs
 * - Queues requests when models are switching
 * - Applies configurable wait times between responses
 * - Prevents queue overflow
 * - Provides queue status and estimates
 */

import { readLlmTimeoutConfig, getQueueWaitEstimate, LlmTimeoutConfig } from '../config/llmTimeouts';

export interface QueuedRequest<T = any> {
    id: string;
    agentId: string;
    modelName: string;
    priority: number;
    timestamp: number;
    execute: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
}

export interface QueueStatus {
    queueDepth: number;
    currentModel: string | null;
    isProcessing: boolean;
    estimatedWaitTime: string;
    requestsProcessed: number;
    requestsFailed: number;
}

export class LlmRequestQueue {
    private queue: QueuedRequest[] = [];
    private isProcessing: boolean = false;
    private currentModel: string | null = null;
    private timeoutConfig: LlmTimeoutConfig;
    private requestsProcessed: number = 0;
    private requestsFailed: number = 0;
    private lastProcessedTime: number = 0;

    constructor() {
        const config = readLlmTimeoutConfig();
        this.timeoutConfig = config.config;
    }

    /**
     * Queue a request for execution
     */
    async enqueue<T>(request: Omit<QueuedRequest<T>, 'resolve' | 'reject' | 'timestamp'>): Promise<T> {
        // Check queue depth limit
        if (this.queue.length >= this.timeoutConfig.maxQueueDepth) {
            throw new Error(
                `Queue full: ${this.queue.length}/${this.timeoutConfig.maxQueueDepth} requests. ` +
                `Estimated wait time: ${getQueueWaitEstimate(this.queue.length, this.timeoutConfig)}`
            );
        }

        return new Promise<T>((resolve, reject) => {
            const queuedRequest: QueuedRequest<T> = {
                ...request,
                timestamp: Date.now(),
                resolve: resolve as (value: any) => void,
                reject,
            };

            // Insert based on priority (higher priority first)
            const insertIndex = this.queue.findIndex(r => r.priority < request.priority);
            if (insertIndex === -1) {
                this.queue.push(queuedRequest);
            } else {
                this.queue.splice(insertIndex, 0, queuedRequest);
            }

            // Start processing if not already running
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process queued requests with appropriate wait times
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const request = this.queue.shift()!;
            const needsModelSwitch = this.currentModel !== null && this.currentModel !== request.modelName;

            try {
                // Apply model switch delay if needed
                if (needsModelSwitch) {
                    const switchTime = this.timeoutConfig.modelSwitchMs;
                    console.log(`[LLM Queue] Model switch: ${this.currentModel} → ${request.modelName} (waiting ${switchTime}ms)`);
                    await this.delay(switchTime);
                }

                // Apply queued response delay if there are more requests waiting
                // and we've processed at least one request
                if (this.lastProcessedTime > 0 && this.queue.length > 0) {
                    const timeSinceLastRequest = Date.now() - this.lastProcessedTime;
                    const waitTime = this.timeoutConfig.queuedResponseMs - timeSinceLastRequest;

                    if (waitTime > 0) {
                        console.log(`[LLM Queue] Waiting ${waitTime}ms between responses (${this.queue.length} remaining)`);
                        await this.delay(waitTime);
                    }
                }

                // Execute the request
                console.log(`[LLM Queue] Executing request ${request.id} for agent ${request.agentId} (model: ${request.modelName})`);
                const result = await Promise.race([
                    request.execute(),
                    this.createTimeoutPromise(request),
                ]);

                // Update state
                this.currentModel = request.modelName;
                this.lastProcessedTime = Date.now();
                this.requestsProcessed++;

                request.resolve(result);
            } catch (error) {
                this.requestsFailed++;
                request.reject(error as Error);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Create a timeout promise for request execution
     */
    private createTimeoutPromise(request: QueuedRequest): Promise<never> {
        const timeout = this.timeoutConfig.requestMs;
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(
                    `Request timeout after ${timeout}ms for agent ${request.agentId} (model: ${request.modelName})`
                ));
            }, timeout);
        });
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get queue status
     */
    getStatus(): QueueStatus {
        return {
            queueDepth: this.queue.length,
            currentModel: this.currentModel,
            isProcessing: this.isProcessing,
            estimatedWaitTime: getQueueWaitEstimate(this.queue.length, this.timeoutConfig),
            requestsProcessed: this.requestsProcessed,
            requestsFailed: this.requestsFailed,
        };
    }

    /**
     * Clear the queue
     */
    clear(): void {
        const pendingRequests = [...this.queue];
        this.queue = [];

        // Reject all pending requests
        pendingRequests.forEach(req => {
            req.reject(new Error('Queue cleared'));
        });
    }

    /**
     * Update timeout configuration
     */
    refreshConfig(): void {
        const config = readLlmTimeoutConfig();
        this.timeoutConfig = config.config;
    }

    /**
     * Singleton instance
     */
    private static instance: LlmRequestQueue;

    static getInstance(): LlmRequestQueue {
        if (!LlmRequestQueue.instance) {
            LlmRequestQueue.instance = new LlmRequestQueue();
        }
        return LlmRequestQueue.instance;
    }
}
