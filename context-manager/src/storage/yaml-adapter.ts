/**
 * YAML storage adapter implementation
 */

import { ContextData } from '../types';
import { BaseStorageAdapter } from './base';
import * as fs from 'fs/promises';
import YAML from 'yaml';

/**
 * YAML storage adapter with serialization safety
 */
export class YamlStorageAdapter extends BaseStorageAdapter {
  /**
   * Save context data as YAML
   */
  async save(key: string, data: ContextData): Promise<void> {
    await this.ensureDataDir();
    await this.ensureParentDir(key);
    
    const filePath = this.getFilePath(key);
    
    // Convert to YAML with custom options
    const yaml = YAML.stringify(data, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 20,
      aliasDuplicateObjects: false
    });
    
    await fs.writeFile(filePath, yaml, 'utf-8');
  }

  /**
   * Load context data from YAML
   */
  async load(key: string): Promise<ContextData | null> {
    try {
      const filePath = this.getFilePath(key);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Parse YAML
      const data = YAML.parse(content, {
        customTags: this.getCustomTags()
      });
      
      // Convert date strings back to Date objects
      this.restoreDates(data);
      
      return data as ContextData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Custom YAML tags for special types
   */
  private getCustomTags(): any[] {
    return [
      {
        identify: (value: any) => value instanceof Date,
        tag: '!date',
        resolve: (str: string) => new Date(str),
        stringify: (date: Date) => date.toISOString()
      }
    ];
  }

  /**
   * Recursively restore Date objects from ISO strings
   */
  private restoreDates(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const key in obj) {
      const value = obj[key];
      
      // Check if it's an ISO date string
      if (typeof value === 'string' && this.isISODateString(value)) {
        obj[key] = new Date(value);
      } else if (typeof value === 'object') {
        this.restoreDates(value);
      }
    }
  }

  /**
   * Check if a string is an ISO date string
   */
  private isISODateString(str: string): boolean {
    // Simple ISO 8601 date pattern
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoPattern.test(str);
  }
}
