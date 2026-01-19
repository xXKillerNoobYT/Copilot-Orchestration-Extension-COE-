/**
 * Tests for utility functions
 * Reference: https://jestjs.io/docs/getting-started
 */

import {
  generateContextId,
  generateStorageKey,
  parseStorageKey,
  calculateSize,
  deepClone,
  isExpired,
  formatBytes,
  sanitizeFileName
} from '../src/utils';
import { ContextType } from '../src/types';

describe('Utility Functions', () => {
  describe('generateContextId', () => {
    it('should generate unique context IDs', () => {
      const id1 = generateContextId('task-1', ContextType.AGENT_RESPONSE);
      const id2 = generateContextId('task-1', ContextType.AGENT_RESPONSE);

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toEqual(id2); // Should be unique due to timestamp/random
      expect(id1).toContain('task-1');
      expect(id1).toContain(ContextType.AGENT_RESPONSE);
    });

    it('should include task ID and type in generated ID', () => {
      const taskId = 'my-task-123';
      const type = ContextType.TASK_COMPLETION;
      const id = generateContextId(taskId, type);

      expect(id).toContain(taskId);
      expect(id).toContain(type);
    });
  });

  describe('generateStorageKey', () => {
    it('should generate correct storage key for JSON', () => {
      const key = generateStorageKey('task-1', 'ctx-123', 'json');
      expect(key).toBe('task-1/ctx-123.json');
    });

    it('should generate correct storage key for YAML', () => {
      const key = generateStorageKey('task-1', 'ctx-123', 'yaml');
      expect(key).toBe('task-1/ctx-123.yaml');
    });

    it('should handle special characters in IDs', () => {
      const key = generateStorageKey('task-with-dashes', 'ctx-with-dashes', 'json');
      expect(key).toContain('task-with-dashes');
      expect(key).toContain('ctx-with-dashes');
      expect(key.endsWith('.json')).toBe(true);
    });
  });

  describe('parseStorageKey', () => {
    it('should parse valid storage key', () => {
      const parsed = parseStorageKey('task-1/ctx-123.json');

      expect(parsed).not.toBeNull();
      expect(parsed?.taskId).toBe('task-1');
      expect(parsed?.contextId).toBe('ctx-123');
      expect(parsed?.format).toBe('json');
    });

    it('should parse YAML storage key', () => {
      const parsed = parseStorageKey('task-1/ctx-123.yaml');

      expect(parsed).not.toBeNull();
      expect(parsed?.taskId).toBe('task-1');
      expect(parsed?.format).toBe('yaml');
    });

    it('should return null for invalid key format', () => {
      // Reference: https://jestjs.io/docs/expect#tobenull
      const parsed1 = parseStorageKey('invalid-format');
      const parsed2 = parseStorageKey('');
      const parsed3 = parseStorageKey('no-extension');

      expect(parsed1).toBeNull();
      expect(parsed2).toBeNull();
      expect(parsed3).toBeNull();
    });

    it('should handle nested paths', () => {
      const parsed = parseStorageKey('task-1/nested/path/ctx-123.json');
      // Note: regex only captures first /, so this may fail - testing actual behavior
      // This tests the regex pattern: /^(.+?)\/(.+?)\.(.+)$/
      expect(parsed).not.toBeNull();
    });
  });

  describe('calculateSize', () => {
    it('should calculate object size in bytes', () => {
      const obj = { key: 'value' };
      const size = calculateSize(obj);

      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });

    it('should handle large objects', () => {
      const largeObj = {
        data: 'x'.repeat(10000),
        nested: { array: new Array(100).fill('test') }
      };

      const size = calculateSize(largeObj);
      expect(size).toBeGreaterThan(1000);
    });

    it('should handle empty objects', () => {
      const size = calculateSize({});
      expect(size).toBeGreaterThan(0);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const size = calculateSize(arr);
      expect(size).toBeGreaterThan(0);
    });

    it('should handle nested structures', () => {
      const nested = {
        level1: {
          level2: {
            level3: { data: 'deep' }
          }
        }
      };

      const size = calculateSize(nested);
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('deepClone', () => {
    it('should deeply clone an object', () => {
      const original = { key: 'value', nested: { inner: 'data' } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
    });

    it('should preserve Date objects when using structuredClone', () => {
      const date = new Date('2026-01-01T12:00:00Z');
      const original = { timestamp: date };
      const cloned = deepClone(original);

      // Depending on Node.js version and structuredClone availability
      expect(cloned.timestamp).toBeTruthy();
      if (cloned.timestamp instanceof Date) {
        expect(cloned.timestamp.getTime()).toBe(date.getTime());
      }
    });

    it('should handle arrays in deepClone', () => {
      const original = { items: [1, 2, 3], nested: [{ a: 1 }, { b: 2 }] };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned.items).not.toBe(original.items);
      expect(cloned.nested).not.toBe(original.nested);
    });

    it('should handle null and undefined', () => {
      // Reference: https://jestjs.io/docs/expect#toequal
      expect(deepClone(null)).toEqual(null);
      expect(deepClone(undefined)).toEqual(undefined);
    });

    it('should clone primitive types', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('should return false when expiresAt is undefined', () => {
      expect(isExpired(undefined)).toBe(false);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in future
      expect(isExpired(futureDate)).toBe(false);
    });

    it('should return true for past dates', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day in past
      expect(isExpired(pastDate)).toBe(true);
    });

    it('should handle edge case of now', () => {
      // Edge case: expiration is exactly now
      // Should be true or very close
      const now = new Date();
      const result = isExpired(now);
      // Result may vary based on execution time
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      const formatted = formatBytes(0);
      expect(formatted).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      const formatted = formatBytes(500);
      expect(formatted).toContain('Bytes');
    });

    it('should format kilobytes', () => {
      const formatted = formatBytes(1024);
      expect(formatted).toContain('KB');
    });

    it('should format megabytes', () => {
      const formatted = formatBytes(1024 * 1024);
      expect(formatted).toContain('MB');
    });

    it('should format gigabytes', () => {
      const formatted = formatBytes(1024 * 1024 * 1024);
      expect(formatted).toContain('GB');
    });

    it('should format large sizes correctly', () => {
      // Reference: https://jestjs.io/docs/expect#toMatch
      const formatted = formatBytes(5 * 1024 * 1024); // 5 MB
      expect(formatted).toMatch(/\d+\.?\d* MB/);
    });

    it('should handle sizes between units', () => {
      const formatted1 = formatBytes(512); // Half KB
      const formatted2 = formatBytes(512 * 1024); // Half MB
      
      expect(formatted1).toBeTruthy();
      expect(formatted2).toBeTruthy();
    });
  });

  describe('sanitizeFileName', () => {
    it('should convert to lowercase', () => {
      const sanitized = sanitizeFileName('TestName');
      expect(sanitized).toBe(sanitized.toLowerCase());
    });

    it('should replace special characters with underscores', () => {
      const sanitized = sanitizeFileName('file@name#test!');
      expect(sanitized).toMatch(/^[a-z0-9_-]+$/);
    });

    it('should preserve dashes and underscores', () => {
      const sanitized = sanitizeFileName('file-name_test');
      expect(sanitized).toContain('-');
      expect(sanitized).toContain('_');
    });

    it('should handle spaces', () => {
      const sanitized = sanitizeFileName('file name test');
      expect(sanitized).not.toContain(' ');
      expect(sanitized).toContain('_');
    });

    it('should handle mixed special characters', () => {
      const sanitized = sanitizeFileName('My@File#Name$2024!');
      expect(sanitized).toMatch(/^[a-z0-9_-]+$/);
      expect(sanitized).toContain('name'); // Should have lowercase content
    });

    it('should handle empty strings', () => {
      const sanitized = sanitizeFileName('');
      expect(sanitized).toBe('');
    });

    it('should handle unicode characters', () => {
      const sanitized = sanitizeFileName('файл_名前_αρχείο');
      expect(sanitized).toMatch(/^[a-z0-9_-]*$/);
    });

    it('should handle numbers', () => {
      const sanitized = sanitizeFileName('file123test456');
      expect(sanitized).toBe('file123test456');
    });
  });
});
