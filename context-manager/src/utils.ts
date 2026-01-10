/**
 * Utility functions for context management
 */

import * as crypto from 'crypto';
import { ContextType } from './types';

/**
 * Generate a unique context ID
 */
export function generateContextId(taskId: string, type: ContextType): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${taskId}-${type}-${timestamp}-${random}`;
}

/**
 * Generate a storage key for a context
 */
export function generateStorageKey(
  taskId: string,
  contextId: string,
  format: 'json' | 'yaml'
): string {
  return `${taskId}/${contextId}.${format}`;
}

/**
 * Parse a storage key
 */
export function parseStorageKey(key: string): {
  taskId: string;
  contextId: string;
  format: string;
} | null {
  const match = key.match(/^(.+?)\/(.+?)\.(.+)$/);
  if (!match) {
    return null;
  }
  
  return {
    taskId: match[1],
    contextId: match[2],
    format: match[3]
  };
}

/**
 * Calculate size of an object in bytes
 */
export function calculateSize(obj: any): number {
  const json = JSON.stringify(obj);
  return Buffer.byteLength(json, 'utf-8');
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  // Use structuredClone if available to preserve special types like Date
  // Node.js 18+ supports structuredClone
  // @ts-ignore
  if (typeof (globalThis as any).structuredClone === 'function') {
    // @ts-ignore
    return (globalThis as any).structuredClone(obj);
  }
  // Fallback to JSON clone (may not preserve Date)
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a date is expired
 */
export function isExpired(expiresAt?: Date): boolean {
  if (!expiresAt) {
    return false;
  }
  return expiresAt < new Date();
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sanitize a string for use in file names
 */
export function sanitizeFileName(str: string): string {
  return str.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}
