/**
 * JSON storage adapter implementation
 */

import { ContextData } from '../types';
import { BaseStorageAdapter } from './base';
import * as fs from 'fs/promises';

/**
 * JSON storage adapter with serialization safety
 */
export class JsonStorageAdapter extends BaseStorageAdapter {
  /**
   * Save context data as JSON
   */
  async save(key: string, data: ContextData): Promise<void> {
    await this.ensureDataDir();
    await this.ensureParentDir(key);
    
    const filePath = this.getFilePath(key);
    
    // Serialize with custom replacer for Date objects
    const json = JSON.stringify(data, this.jsonReplacer, 2);
    
    await fs.writeFile(filePath, json, 'utf-8');
  }

  /**
   * Load context data from JSON
   */
  async load(key: string): Promise<ContextData | null> {
    try {
      const filePath = this.getFilePath(key);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Parse with custom reviver for Date objects
      const data = JSON.parse(content, (k, v) => this.jsonReviver(k, v));
      
      return data as ContextData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Custom JSON replacer for serialization
   */
  private jsonReplacer(_key: string, value: any): any {
    // Let JSON.stringify handle values; Dates will become ISO strings.
    return value;
  }

  /**
   * Custom JSON reviver for deserialization
   */
  private jsonReviver(_key: string, value: any): any {
    // Convert ISO date strings back to Date objects
    if (typeof value === 'string' && JsonStorageAdapter.isISODateString(value)) {
      return new Date(value);
    }
    return value;
  }

  /**
   * Check if a string is an ISO date string
   */
  private static isISODateString(str: string): boolean {
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoPattern.test(str);
  }
}
