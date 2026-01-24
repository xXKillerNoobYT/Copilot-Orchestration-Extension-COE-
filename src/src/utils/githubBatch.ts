export interface BatchRequest {
    type: 'create' | 'update' | 'comment';
    payload: any;
    key?: string; // for deduplication
}

export class GitHubBatcher {
    private queue: BatchRequest[] = [];
    private batchSize = 50;
    private flushInterval = 5000; // ms
    private lastFlush = 0;

    enqueue(request: BatchRequest): void {
        // Deduplicate by key when provided
        if (request.key) {
            const existingIndex = this.queue.findIndex(r => r.key === request.key);
            if (existingIndex >= 0) {
                this.queue[existingIndex] = request;
                return;
            }
        }
        this.queue.push(request);
    }

    /**
     * Flush queued requests in batches (returns batches for execution layer).
     */
    flush(): BatchRequest[][] {
        const now = Date.now();
        if (now - this.lastFlush < this.flushInterval && this.queue.length < this.batchSize) {
            // Not time yet and not full
            return [];
        }
        this.lastFlush = now;

        const batches: BatchRequest[][] = [];
        while (this.queue.length > 0) {
            batches.push(this.queue.splice(0, this.batchSize));
        }
        return batches;
    }
}
