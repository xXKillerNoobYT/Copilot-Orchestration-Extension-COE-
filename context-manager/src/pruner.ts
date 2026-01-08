/**
 * Context pruning service for managing context lifecycle and storage limits
 */

import {
  ContextMetadata,
  ContextType,
  PruningPolicy,
  ContextStats
} from './types';
import { BaseStorageAdapter } from './storage';
import { isExpired } from './utils';

export class ContextPruner {
  private storage: BaseStorageAdapter;
  private policy: PruningPolicy;

  constructor(storage: BaseStorageAdapter, policy: PruningPolicy = {}) {
    this.storage = storage;
    this.policy = {
      maxAge: policy.maxAge || 30, // 30 days default
      maxSizePerTask: policy.maxSizePerTask || 100 * 1024 * 1024, // 100MB
      maxTotalSize: policy.maxTotalSize || 1024 * 1024 * 1024, // 1GB
      maxItemsPerTask: policy.maxItemsPerTask || 100,
      keepTypes: policy.keepTypes || []
    };
  }

  /**
   * Run pruning operation
   */
  async prune(): Promise<{
    removed: number;
    freedSpace: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let removed = 0;
    let freedSpace = 0;

    try {
      // Get all context files
      const files = await this.storage.list('*/*');
      const contexts: Array<{ key: string; metadata: ContextMetadata }> = [];

      // Load metadata for all contexts
      for (const file of files) {
        try {
          const data = await this.storage.load(file);
          if (data && data.metadata) {
            contexts.push({ key: file, metadata: data.metadata });
          }
        } catch (error) {
          errors.push(`Failed to load ${file}: ${error}`);
        }
      }

      // Prune expired contexts
      const expiredRemoved = await this.pruneExpired(contexts);
      removed += expiredRemoved.count;
      freedSpace += expiredRemoved.space;

      // Prune by age
      const ageRemoved = await this.pruneByAge(contexts);
      removed += ageRemoved.count;
      freedSpace += ageRemoved.space;

      // Prune by task limits
      const taskRemoved = await this.pruneByTaskLimits(contexts);
      removed += taskRemoved.count;
      freedSpace += taskRemoved.space;

      // Prune by total size
      const sizeRemoved = await this.pruneByTotalSize(contexts);
      removed += sizeRemoved.count;
      freedSpace += sizeRemoved.space;

    } catch (error) {
      errors.push(`Pruning error: ${error}`);
    }

    return { removed, freedSpace, errors };
  }

  /**
   * Prune expired contexts
   */
  private async pruneExpired(
    contexts: Array<{ key: string; metadata: ContextMetadata }>
  ): Promise<{ count: number; space: number }> {
    let count = 0;
    let space = 0;

    for (const context of contexts) {
      if (isExpired(context.metadata.expiresAt)) {
        const size = await this.storage.getSize(context.key);
        await this.storage.delete(context.key);
        count++;
        space += size;
      }
    }

    return { count, space };
  }

  /**
   * Prune contexts older than maxAge
   */
  private async pruneByAge(
    contexts: Array<{ key: string; metadata: ContextMetadata }>
  ): Promise<{ count: number; space: number }> {
    if (!this.policy.maxAge) {
      return { count: 0, space: 0 };
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() - this.policy.maxAge);

    let count = 0;
    let space = 0;

    for (const context of contexts) {
      // Skip if type should be kept
      if (this.policy.keepTypes?.includes(context.metadata.type)) {
        continue;
      }

      if (context.metadata.timestamp < maxDate) {
        const size = await this.storage.getSize(context.key);
        await this.storage.delete(context.key);
        count++;
        space += size;
      }
    }

    return { count, space };
  }

  /**
   * Prune contexts exceeding per-task limits
   */
  private async pruneByTaskLimits(
    contexts: Array<{ key: string; metadata: ContextMetadata }>
  ): Promise<{ count: number; space: number }> {
    const taskGroups = new Map<string, Array<{ key: string; metadata: ContextMetadata }>>();

    // Group by task
    for (const context of contexts) {
      const taskId = context.metadata.taskId;
      if (!taskGroups.has(taskId)) {
        taskGroups.set(taskId, []);
      }
      taskGroups.get(taskId)!.push(context);
    }

    let count = 0;
    let space = 0;

    // Check each task group
    for (const taskContexts of taskGroups.values()) {
      // Sort by timestamp (oldest first)
      taskContexts.sort((a, b) => 
        a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
      );

      // Prune by count
      if (this.policy.maxItemsPerTask && taskContexts.length > this.policy.maxItemsPerTask) {
        const toRemove = taskContexts.length - this.policy.maxItemsPerTask;
        for (let i = 0; i < toRemove; i++) {
          const size = await this.storage.getSize(taskContexts[i].key);
          await this.storage.delete(taskContexts[i].key);
          count++;
          space += size;
        }
      }

      // Prune by size
      if (this.policy.maxSizePerTask) {
        let taskSize = 0;
        const sizes = await Promise.all(
          taskContexts.map(c => this.storage.getSize(c.key))
        );

        for (let i = 0; i < taskContexts.length; i++) {
          taskSize += sizes[i];
          if (taskSize > this.policy.maxSizePerTask!) {
            await this.storage.delete(taskContexts[i].key);
            count++;
            space += sizes[i];
          }
        }
      }
    }

    return { count, space };
  }

  /**
   * Prune to stay under total size limit
   */
  private async pruneByTotalSize(
    contexts: Array<{ key: string; metadata: ContextMetadata }>
  ): Promise<{ count: number; space: number }> {
    if (!this.policy.maxTotalSize) {
      return { count: 0, space: 0 };
    }

    // Calculate total size
    let totalSize = 0;
    const contextSizes: Array<{ key: string; size: number; timestamp: Date }> = [];

    for (const context of contexts) {
      const size = await this.storage.getSize(context.key);
      totalSize += size;
      contextSizes.push({
        key: context.key,
        size,
        timestamp: context.metadata.timestamp
      });
    }

    // If under limit, nothing to do
    if (totalSize <= this.policy.maxTotalSize) {
      return { count: 0, space: 0 };
    }

    // Sort by timestamp (oldest first)
    contextSizes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let count = 0;
    let freedSpace = 0;
    let currentSize = totalSize;

    // Remove oldest until under limit
    for (const context of contextSizes) {
      if (currentSize <= this.policy.maxTotalSize) {
        break;
      }

      await this.storage.delete(context.key);
      count++;
      freedSpace += context.size;
      currentSize -= context.size;
    }

    return { count, space: freedSpace };
  }

  /**
   * Get context statistics
   */
  async getStats(): Promise<ContextStats> {
    const files = await this.storage.list('*/*');
    const stats: ContextStats = {
      totalContexts: 0,
      totalSize: 0,
      byType: {} as Record<ContextType, number>,
      byTask: {}
    };

    let oldestDate: Date | undefined;
    let newestDate: Date | undefined;

    for (const file of files) {
      try {
        const data = await this.storage.load(file);
        if (!data || !data.metadata) continue;

        stats.totalContexts++;
        
        const size = await this.storage.getSize(file);
        stats.totalSize += size;

        // Track by type
        const type = data.metadata.type;
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // Track by task
        const taskId = data.metadata.taskId;
        stats.byTask[taskId] = (stats.byTask[taskId] || 0) + 1;

        // Track dates
        const timestamp = data.metadata.timestamp;
        if (!oldestDate || timestamp < oldestDate) {
          oldestDate = timestamp;
        }
        if (!newestDate || timestamp > newestDate) {
          newestDate = timestamp;
        }
      } catch {
        // Skip invalid files
      }
    }

    stats.oldestContext = oldestDate;
    stats.newestContext = newestDate;

    return stats;
  }
}
