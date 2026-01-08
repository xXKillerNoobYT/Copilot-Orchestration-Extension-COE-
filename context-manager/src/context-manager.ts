/**
 * Main ContextManager class - central API for context management
 */

import {
  ContextData,
  ContextManagerConfig,
  ContextQuery,
  ContextType,
  ContextMetadata,
  ContextReference,
  ContextStats,
  AgentResponse,
  TaskCompletion,
  IntermediateOutput,
  ArchitectureSnapshot
} from './types';
import { StorageAdapterFactory, BaseStorageAdapter } from './storage';
import { ContextPruner } from './pruner';
import {
  generateContextId,
  generateStorageKey,
  calculateSize,
  deepClone,
  isExpired
} from './utils';

/**
 * Main ContextManager class
 */
export class ContextManager {
  private storage: BaseStorageAdapter;
  private pruner: ContextPruner;
  private config: ContextManagerConfig;
  private memoryCache: Map<string, ContextData>;
  private maxCacheSize: number;

  constructor(config: ContextManagerConfig) {
    this.config = config;
    this.storage = StorageAdapterFactory.create(
      config.storageFormat,
      config.dataDir
    );
    this.pruner = new ContextPruner(this.storage, config.pruningPolicy);
    this.memoryCache = new Map();
    this.maxCacheSize = (config.maxMemoryCache || 10) * 1024 * 1024; // Convert MB to bytes
  }

  /**
   * Get all contexts for a specific task
   */
  async getContextForTask(taskId: string): Promise<ContextData[]> {
    const pattern = `${taskId}/*`;
    const files = await this.storage.list(pattern);
    const contexts: ContextData[] = [];

    for (const file of files) {
      const data = await this.loadFromStorage(file);
      if (data && !isExpired(data.metadata.expiresAt)) {
        contexts.push(data);
      }
    }

    return contexts;
  }

  /**
   * Save agent output (convenience method)
   */
  async saveAgentOutput(
    taskId: string,
    output: Omit<AgentResponse, 'metadata'>
  ): Promise<string> {
    const contextId = generateContextId(taskId, ContextType.AGENT_RESPONSE);
    
    const agentResponse: AgentResponse = {
      metadata: this.createMetadata(contextId, taskId, ContextType.AGENT_RESPONSE),
      ...output
    };

    await this.saveContext(agentResponse);
    return contextId;
  }

  /**
   * Save task completion (convenience method)
   */
  async saveTaskCompletion(
    taskId: string,
    completion: Omit<TaskCompletion, 'metadata'>
  ): Promise<string> {
    const contextId = generateContextId(taskId, ContextType.TASK_COMPLETION);
    
    const taskCompletion: TaskCompletion = {
      metadata: this.createMetadata(contextId, taskId, ContextType.TASK_COMPLETION),
      ...completion
    };

    await this.saveContext(taskCompletion);
    return contextId;
  }

  /**
   * Save intermediate output (convenience method)
   */
  async saveIntermediateOutput(
    taskId: string,
    output: Omit<IntermediateOutput, 'metadata'>
  ): Promise<string> {
    const contextId = generateContextId(taskId, ContextType.INTERMEDIATE_OUTPUT);
    
    const intermediateOutput: IntermediateOutput = {
      metadata: this.createMetadata(contextId, taskId, ContextType.INTERMEDIATE_OUTPUT),
      ...output
    };

    await this.saveContext(intermediateOutput);
    return contextId;
  }

  /**
   * Save architecture snapshot (convenience method)
   */
  async saveArchitectureSnapshot(
    taskId: string,
    snapshot: Omit<ArchitectureSnapshot, 'metadata'>
  ): Promise<string> {
    const contextId = generateContextId(taskId, ContextType.ARCHITECTURE_SNAPSHOT);
    
    const architectureSnapshot: ArchitectureSnapshot = {
      metadata: this.createMetadata(contextId, taskId, ContextType.ARCHITECTURE_SNAPSHOT),
      ...snapshot
    };

    await this.saveContext(architectureSnapshot);
    return contextId;
  }

  /**
   * Save generic context data
   */
  async saveContext(data: ContextData): Promise<void> {
    const key = generateStorageKey(
      data.metadata.taskId,
      data.metadata.id,
      this.config.storageFormat
    );

    // Update size in metadata
    data.metadata.size = calculateSize(data);

    // Save to storage
    await this.storage.save(key, data);

    // Update cache
    this.updateCache(key, data);
  }

  /**
   * Load context by ID
   */
  async loadContext(contextId: string): Promise<ContextData | null> {
    // Try to find in any task directory
    const allFiles = await this.storage.list('*/*');
    const matchingFile = allFiles.find(file => file.includes(contextId));

    if (!matchingFile) {
      return null;
    }

    return this.loadFromStorage(matchingFile);
  }

  /**
   * Query contexts with filters
   */
  async queryContexts(query: ContextQuery): Promise<ContextData[]> {
    const pattern = query.taskId ? `${query.taskId}/*` : '*/*';
    const files = await this.storage.list(pattern);
    const results: ContextData[] = [];

    for (const file of files) {
      const data = await this.loadFromStorage(file);
      if (!data) continue;

      // Apply filters
      if (!this.matchesQuery(data, query)) {
        continue;
      }

      results.push(data);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => 
      b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime()
    );

    // Apply limit
    if (query.limit && results.length > query.limit) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Delete a context
   */
  async deleteContext(contextId: string): Promise<boolean> {
    const allFiles = await this.storage.list('*/*');
    const matchingFile = allFiles.find(file => file.includes(contextId));

    if (!matchingFile) {
      return false;
    }

    await this.storage.delete(matchingFile);
    this.memoryCache.delete(matchingFile);
    return true;
  }

  /**
   * Delete all contexts for a task
   */
  async deleteTaskContexts(taskId: string): Promise<number> {
    const pattern = `${taskId}/*`;
    const files = await this.storage.list(pattern);

    for (const file of files) {
      await this.storage.delete(file);
      this.memoryCache.delete(file);
    }

    return files.length;
  }

  /**
   * Prune old/large contexts
   */
  async prune(): Promise<{
    removed: number;
    freedSpace: number;
    errors: string[];
  }> {
    const result = await this.pruner.prune();
    
    // Clear cache after pruning
    this.memoryCache.clear();
    
    return result;
  }

  /**
   * Get context statistics
   */
  async getStats(): Promise<ContextStats> {
    return this.pruner.getStats();
  }

  /**
   * Create context reference
   */
  async createReference(contextId: string): Promise<ContextReference | null> {
    const allFiles = await this.storage.list('*/*');
    const matchingFile = allFiles.find(file => file.includes(contextId));

    if (!matchingFile) {
      return null;
    }

    const data = await this.loadFromStorage(matchingFile);
    if (!data) {
      return null;
    }

    return {
      contextId: data.metadata.id,
      taskId: data.metadata.taskId,
      type: data.metadata.type,
      path: matchingFile,
      timestamp: data.metadata.timestamp
    };
  }

  /**
   * Get references for a task
   */
  async getTaskReferences(taskId: string): Promise<ContextReference[]> {
    const contexts = await this.getContextForTask(taskId);
    const references: ContextReference[] = [];

    for (const context of contexts) {
      const key = generateStorageKey(
        context.metadata.taskId,
        context.metadata.id,
        this.config.storageFormat
      );

      references.push({
        contextId: context.metadata.id,
        taskId: context.metadata.taskId,
        type: context.metadata.type,
        path: key,
        timestamp: context.metadata.timestamp
      });
    }

    return references;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Private: Create metadata for a context
   */
  private createMetadata(
    id: string,
    taskId: string,
    type: ContextType
  ): ContextMetadata {
    return {
      id,
      taskId,
      type,
      timestamp: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Private: Load from storage with caching
   */
  private async loadFromStorage(key: string): Promise<ContextData | null> {
    // Check cache first
    if (this.memoryCache.has(key)) {
      return deepClone(this.memoryCache.get(key)!);
    }

    // Load from storage
    const data = await this.storage.load(key);
    if (data) {
      this.updateCache(key, data);
    }

    return data;
  }

  /**
   * Private: Update memory cache with size limit
   */
  private updateCache(key: string, data: ContextData): void {
    // Calculate current cache size
    let cacheSize = 0;
    for (const cachedData of this.memoryCache.values()) {
      cacheSize += calculateSize(cachedData);
    }

    // If adding this would exceed limit, clear oldest entries
    const dataSize = calculateSize(data);
    if (cacheSize + dataSize > this.maxCacheSize) {
      // Simple LRU: clear half the cache
      const entries = Array.from(this.memoryCache.entries());
      const toRemove = Math.ceil(entries.length / 2);
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }

    this.memoryCache.set(key, deepClone(data));
  }

  /**
   * Private: Check if context matches query
   */
  private matchesQuery(data: ContextData, query: ContextQuery): boolean {
    // Check type filter
    if (query.type && data.metadata.type !== query.type) {
      return false;
    }

    // Check tags filter
    if (query.tags && query.tags.length > 0) {
      const contextTags = data.metadata.tags || [];
      const hasMatchingTag = query.tags.some(tag => contextTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Check date range
    if (query.fromDate && data.metadata.timestamp < query.fromDate) {
      return false;
    }
    if (query.toDate && data.metadata.timestamp > query.toDate) {
      return false;
    }

    // Check expired
    if (!query.includeExpired && isExpired(data.metadata.expiresAt)) {
      return false;
    }

    return true;
  }
}
