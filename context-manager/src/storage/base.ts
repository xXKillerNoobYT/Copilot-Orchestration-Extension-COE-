/**
 * Base storage adapter interface implementation
 */

import { ContextData } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Abstract base storage adapter
 */
export abstract class BaseStorageAdapter {
  protected dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  /**
   * Ensure data directory exists
   */
  protected async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get full file path for a key
   */
  protected getFilePath(key: string): string {
    return path.join(this.dataDir, key);
  }

  /**
   * Ensure parent directory for a key exists
   */
  protected async ensureParentDir(key: string): Promise<void> {
    const dir = path.dirname(this.getFilePath(key));
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(key));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async getSize(key: string): Promise<number> {
    try {
      const stats = await fs.stat(this.getFilePath(key));
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Delete a file
   */
  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(key));
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List files matching pattern
   */
  async list(pattern?: string): Promise<string[]> {
    await this.ensureDataDir();

    try {
      const files: string[] = [];

      // Recursively list files and include relative paths
      async function walk(dir: string, relativeBase: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.join(relativeBase, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath, relPath);
          } else {
            files.push(relPath.replace(/\\/g, '/'));
          }
        }
      }

      await walk(this.dataDir, '');

      if (!pattern) {
        return files;
      }

      // Simple pattern matching (supports * wildcard)
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return files.filter(file => regex.test(file));
    } catch {
      return [];
    }
  }

  abstract save(key: string, data: ContextData): Promise<void>;
  abstract load(key: string): Promise<ContextData | null>;
}
