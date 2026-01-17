/**
 * Context Bundle Size Validation Tests
 * Tests for MAX_FILES_PER_BUNDLE validation and file list size constraints
 */

import { validateContextBundleSize } from './taskInteractionAPI';
import { MAX_FILES_PER_BUNDLE, BUNDLE_WARNING_THRESHOLD } from './orchestratorPanel';

describe('TaskInteractionAPI - Context Bundle Size Validation', () => {
  describe('validateContextBundleSize', () => {
    it('should accept bundle with file count well within limit', () => {
      const files = Array.from({ length: 50 }, (_, i) => `file${i}.ts`);
      const result = validateContextBundleSize(files);
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle null input gracefully', () => {
      const result = validateContextBundleSize(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid context bundle');
      expect(result.error).toContain('must be an array');
    });

    it('should handle undefined input gracefully', () => {
      const result = validateContextBundleSize(undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid context bundle');
    });

    it('should handle non-array input gracefully', () => {
      const result = validateContextBundleSize('not an array' as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('must be an array');
    });

    it('should warn when bundle approaches warning threshold', () => {
      const fileCount = Math.ceil(MAX_FILES_PER_BUNDLE * BUNDLE_WARNING_THRESHOLD) + 1;
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

    it('should accept bundle just below the warning threshold', () => {
      const fileCount = Math.floor(MAX_FILES_PER_BUNDLE * BUNDLE_WARNING_THRESHOLD);
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

  describe('BUNDLE_WARNING_THRESHOLD constant', () => {
    it('should be defined and be a reasonable threshold', () => {
      expect(BUNDLE_WARNING_THRESHOLD).toBeDefined();
      expect(typeof BUNDLE_WARNING_THRESHOLD).toBe('number');
      expect(BUNDLE_WARNING_THRESHOLD).toBeGreaterThan(0);
      expect(BUNDLE_WARNING_THRESHOLD).toBeLessThan(1);
    });

    it('should be 0.8 (80%) as implemented', () => {
      expect(BUNDLE_WARNING_THRESHOLD).toBe(0.8);
    });
  });
});
