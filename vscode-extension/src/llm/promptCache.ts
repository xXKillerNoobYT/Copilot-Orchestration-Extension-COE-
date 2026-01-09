import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface CacheEntry {
  key: string;
  payload: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
  originalSize?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hits: number;
  misses: number;
  evictions: number;
  compressions: number;
}

export class PromptCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private maxEntries: number;
  private workspaceFolder: string;
  private cacheFile: string;
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0
  };

  constructor(
    workspaceFolder: string,
    maxSize: number = 50 * 1024 * 1024, // 50MB default
    maxEntries: number = 1000
  ) {
    this.workspaceFolder = workspaceFolder;
    this.maxSize = maxSize;
    this.maxEntries = maxEntries;
    this.cacheFile = path.join(workspaceFolder, '.copilot-cache', 'prompts.json');

    // Ensure cache directory exists
    const cacheDir = path.dirname(this.cacheFile);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    this.loadCache();
  }

  /**
   * Store a prompt payload with the given key
   */
  async store(key: string, payload: any): Promise<void> {
    const now = Date.now();
    let serializedPayload = JSON.stringify(payload);
    let compressed = false;
    let originalSize = serializedPayload.length;

    // Compress if payload is large (>1KB)
    if (serializedPayload.length > 1024) {
      try {
        // Simple compression using base64 encoding for now
        // In a real implementation, you'd use a proper compression library
        serializedPayload = Buffer.from(serializedPayload).toString('base64');
        compressed = true;
        this.stats.compressions++;
      } catch (error) {
        // If compression fails, use original
        compressed = false;
      }
    }

    const entrySize = serializedPayload.length + key.length + 100; // Rough estimate including metadata

    // Check if we need to evict entries
    while (this.cache.size >= this.maxEntries || this.stats.totalSize + entrySize > this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      payload: serializedPayload,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      compressed,
      originalSize
    };

    this.cache.set(key, entry);
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize += entrySize;

    await this.saveCache();
  }

  /**
   * Retrieve a cached payload by key
   */
  async retrieve(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    // Decompress if needed
    let payload = entry.payload;
    if (entry.compressed) {
      try {
        payload = Buffer.from(payload, 'base64').toString('utf-8');
      } catch (error) {
        console.error('Failed to decompress cache entry:', error);
        return null;
      }
    }

    try {
      return JSON.parse(payload);
    } catch (error) {
      console.error('Failed to parse cached payload:', error);
      return null;
    }
  }

  /**
   * Evict entries older than the specified TTL
   */
  async evictByAge(ttlMs: number): Promise<number> {
    const now = Date.now();
    const toEvict: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttlMs) {
        toEvict.push(key);
      }
    }

    for (const key of toEvict) {
      this.cache.delete(key);
      this.stats.evictions++;
    }

    this.stats.totalEntries = this.cache.size;
    await this.saveCache();

    return toEvict.length;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      compressions: 0
    };

    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
      }
    } catch (error) {
      console.error('Failed to delete cache file:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  private evictLRU(): void {
    if (this.cache.size === 0) return;

    let lruKey = '';
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      const entry = this.cache.get(lruKey);
      if (entry) {
        const entrySize = JSON.stringify(entry).length;
        this.stats.totalSize -= entrySize;
        this.stats.evictions++;
      }
      this.cache.delete(lruKey);
    }
  }

  private async loadCache(): Promise<void> {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        const entries: CacheEntry[] = JSON.parse(data);

        for (const entry of entries) {
          this.cache.set(entry.key, entry);
        }

        this.stats.totalEntries = this.cache.size;
        // Recalculate size
        this.stats.totalSize = entries.reduce((size, entry) =>
          size + JSON.stringify(entry).length, 0);
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
      // Start with empty cache if loading fails
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const entries = Array.from(this.cache.values());
      const data = JSON.stringify(entries, null, 2);
      fs.writeFileSync(this.cacheFile, data);
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }
}

// Global cache instance
let globalCache: PromptCache | null = null;

export function getPromptCache(): PromptCache {
  if (!globalCache) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      throw new Error('No workspace folder available for cache');
    }
    globalCache = new PromptCache(workspaceFolder);
  }
  return globalCache;
}