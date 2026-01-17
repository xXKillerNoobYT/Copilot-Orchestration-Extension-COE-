/**
 * Context Bundle Size Validation Tests
 * Tests for MAX_FILES_PER_BUNDLE validation and file list size constraints
 */

import { validateContextBundleSize } from './taskInteractionAPI';
import { MAX_FILES_PER_BUNDLE } from './orchestratorPanel';

describe('TaskInteractionAPI - Context Bundle Size Validation', () => {
  describe('validateContextBundleSize', () => {
    it('should accept bundle with file count well within limit', () => {
      const files = Array.from({ length: 50 }, (_, i) => `file${i}.ts`);
      const result = validateContextBundleSize(files);
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should warn when bundle approaches 80% of limit', () => {
      const fileCount = Math.ceil(MAX_FILES_PER_BUNDLE * 0.81);
      const files = Array.from({ length: fileCount }, (_, i) => `file${i}.ts`);
      const result = validateContextBundleSize(files);
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('approaching the limit');
      expect(result.warning).toContain(`${fileCount}/${MAX_FILES_PER_BUNDLE}`);
      expect(result.error).toBeUndefined();
    });

    it('should reject bundle exceeding maximum file limit', () => {
      const fileCount = MAX_FILES_PER_BUNDLE + 1;
      const files = Array.from({ length: fileCount }, (_, i) => `file${i}.ts`);
      const result = validateContextBundleSize(files);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('exceeds maximum file limit');
      expect(result.error).toContain(`${fileCount} files`);
      expect(result.error).toContain(`limit is ${MAX_FILES_PER_BUNDLE}`);
    });

    it('should reject bundle significantly exceeding limit', () => {
      const fileCount = MAX_FILES_PER_BUNDLE * 5; // 500 files if limit is 100
      const files = Array.from({ length: fileCount }, (_, i) => `file${i}.ts`);
      const result = validateContextBundleSize(files);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('exceeds maximum file limit');
      expect(result.error).toContain('memory issues');
      expect(result.error).toContain('WebSocket truncation');
      expect(result.error).toContain('MCP timeouts');
    });

    it('should accept empty bundle', () => {
      const result = validateContextBundleSize([]);
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should accept bundle at exactly the limit', () => {
      const files = Array.from({ length: MAX_FILES_PER_BUNDLE }, (_, i) => `file${i}.ts`);
      const result = validateContextBundleSize(files);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      // May have warning since it's at the limit
    });

    it('should accept bundle just below the 80% warning threshold', () => {
      const fileCount = Math.floor(MAX_FILES_PER_BUNDLE * 0.79);
      const files = Array.from({ length: fileCount }, (_, i) => `file${i}.ts`);
      const result = validateContextBundleSize(files);
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('MAX_FILES_PER_BUNDLE constant', () => {
    it('should be defined and be a reasonable limit', () => {
      expect(MAX_FILES_PER_BUNDLE).toBeDefined();
      expect(typeof MAX_FILES_PER_BUNDLE).toBe('number');
      expect(MAX_FILES_PER_BUNDLE).toBeGreaterThan(0);
      expect(MAX_FILES_PER_BUNDLE).toBeLessThanOrEqual(1000); // Sanity check
    });

    it('should be 100 as specified in the issue', () => {
      expect(MAX_FILES_PER_BUNDLE).toBe(100);
    });
  });
});
