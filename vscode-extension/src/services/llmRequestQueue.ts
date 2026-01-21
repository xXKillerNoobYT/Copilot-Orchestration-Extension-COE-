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
    private inFlightCount: number = 0;
    private currentRequest: QueuedRequest | null = null;
    private processingPromise: Promise<void> | null = null;
    private activeTimeoutCancel: (() => void) | null = null;

    constructor() {
        const config = readLlmTimeoutConfig();
        this.timeoutConfig = config.config;
    }

    /**
     * Queue a request for execution
     */
    async enqueue<T>(request: Omit<QueuedRequest<T>, 'resolve' | 'reject' | 'timestamp'>): Promise<T> {
        // Check queue depth limit (include in-flight work)
        const activeDepth = this.queue.length + this.inFlightCount;
        if (activeDepth >= this.timeoutConfig.maxQueueDepth) {
            throw new Error(
                `Queue full: ${activeDepth}/${this.timeoutConfig.maxQueueDepth} requests. ` +
                `Estimated wait time: ${getQueueWaitEstimate(activeDepth, this.timeoutConfig)}`
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
            if (!this.processingPromise) {
                this.processingPromise = this.processQueue().finally(() => {
                    this.processingPromise = null;
                });
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

        // Use setImmediate to allow synchronous enqueue calls to batch together
        // before processing starts
        await new Promise(resolve => setImmediate(resolve));

        while (this.queue.length > 0) {
            const request = this.queue.shift()!;
            this.inFlightCount++;
            this.currentRequest = request;
            const needsModelSwitch = this.currentModel !== null && this.currentModel !== request.modelName;

            let timeout: { promise: Promise<never>; cancel: () => void } | null = null;
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
                timeout = this.createTimeoutPromise(request);
                this.activeTimeoutCancel = timeout.cancel;
                const result = await Promise.race([
                    request.execute(),
                    timeout.promise,
                ]);

                // Update state
                this.currentModel = request.modelName;
                this.lastProcessedTime = Date.now();
                this.requestsProcessed++;

                request.resolve(result);
            } catch (error) {
                this.requestsFailed++;
                request.reject(error as Error);
            } finally {
                if (timeout) {
                    timeout.cancel();
                }
                this.activeTimeoutCancel = null;
                this.inFlightCount = Math.max(0, this.inFlightCount - 1);
                this.currentRequest = null;
            }
        }

        this.isProcessing = false;
    }

    /**
     * Create a timeout promise for request execution
     */
    private createTimeoutPromise(request: QueuedRequest): { promise: Promise<never>; cancel: () => void } {
        const timeout = this.timeoutConfig.requestMs;
        let timeoutId: NodeJS.Timeout | null = null;

        const promise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(
                    `Request timeout after ${timeout}ms for agent ${request.agentId} (model: ${request.modelName})`
                ));
            }, timeout);
        });

        return {
            promise,
            cancel: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            },
        };
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
        const activeDepth = this.queue.length + this.inFlightCount;
        return {
            queueDepth: activeDepth,
            currentModel: this.currentModel,
            isProcessing: this.isProcessing,
            estimatedWaitTime: getQueueWaitEstimate(activeDepth, this.timeoutConfig),
            requestsProcessed: this.requestsProcessed,
            requestsFailed: this.requestsFailed,
        };
    }

    /**
     * Wait until the queue has finished processing all pending items
     */
    async waitForIdle(): Promise<void> {
        if (this.processingPromise) {
            await this.processingPromise;
        }
    }

    /**
     * Clear the queue
     */
    clear(options?: { rejectPending?: boolean }): void {
        const { rejectPending = true } = options || {};
        const pendingRequests = [...this.queue];
        this.queue = [];
        this.inFlightCount = 0;
        this.currentRequest = null;
        this.isProcessing = false;
        this.processingPromise = null;
        if (this.activeTimeoutCancel) {
            this.activeTimeoutCancel();
            this.activeTimeoutCancel = null;
        }

        // Reject all pending requests when requested (used for explicit cancellation)
        if (rejectPending) {
            pendingRequests.forEach(req => {
                req.reject(new Error('Queue cleared'));
            });
            this.requestsFailed += pendingRequests.length;
        }
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
