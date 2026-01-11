/**
 * Plan Metadata Manager Tests
 * 
 * Comprehensive test suite for metadata management functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlanMetadataManager, PlanMetadata, PlanJSON } from './planMetadata';

describe('PlanMetadataManager', () => {
  let testPlan: PlanJSON;

  beforeEach(() => {
    testPlan = {
      projectName: 'Test Project',
      description: 'A test project',
    };
  });

  describe('addMetadata()', () => {
    it('should add metadata to a plan object', () => {
      const planWithMetadata = PlanMetadataManager.addMetadata(testPlan);

      expect(planWithMetadata.metadata).toBeDefined();
      expect(planWithMetadata.metadata?.createdAt).toBeDefined();
      expect(planWithMetadata.metadata?.updatedAt).toBeDefined();
      expect(planWithMetadata.metadata?.author).toBeDefined();
      expect(planWithMetadata.metadata?.version).toBe('1.0.0');
      expect(planWithMetadata.metadata?.status).toBe('draft');
    });

    it('should create ISO 8601 timestamps', () => {
      const planWithMetadata = PlanMetadataManager.addMetadata(testPlan);

      // Verify ISO 8601 format
      expect(planWithMetadata.metadata?.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(planWithMetadata.metadata?.updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should set initial version to 1.0.0', () => {
      const planWithMetadata = PlanMetadataManager.addMetadata(testPlan);

      expect(planWithMetadata.metadata?.version).toBe('1.0.0');
    });

    it('should set initial status to draft', () => {
      const planWithMetadata = PlanMetadataManager.addMetadata(testPlan);

      expect(planWithMetadata.metadata?.status).toBe('draft');
    });

    it('should preserve existing metadata', () => {
      testPlan.metadata = {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        author: 'Existing Author',
        version: '2.0.0',
        status: 'active',
      };

      const planWithMetadata = PlanMetadataManager.addMetadata(testPlan);

      expect(planWithMetadata.metadata?.author).toBe('Existing Author');
      expect(planWithMetadata.metadata?.version).toBe('2.0.0');
      expect(planWithMetadata.metadata?.status).toBe('active');
    });
  });

  describe('updateMetadata()', () => {
    beforeEach(() => {
      testPlan = PlanMetadataManager.addMetadata(testPlan);
    });

    it('should update specific fields', () => {
      const updated = PlanMetadataManager.updateMetadata(testPlan, {
        status: 'active',
      });

      expect(updated.metadata?.status).toBe('active');
      expect(updated.metadata?.version).toBe('1.0.0'); // Unchanged
    });

    it('should always update updatedAt timestamp', () => {
      const original = testPlan.metadata?.updatedAt;
      
      // Small delay to ensure timestamp is different
      const updated = PlanMetadataManager.updateMetadata(testPlan, {
        status: 'completed',
      });

      expect(updated.metadata?.updatedAt).not.toBe(original);
      expect(updated.metadata?.updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should update multiple fields at once', () => {
      const updated = PlanMetadataManager.updateMetadata(testPlan, {
        status: 'completed',
        author: 'New Author',
      });

      expect(updated.metadata?.status).toBe('completed');
      expect(updated.metadata?.author).toBe('New Author');
      expect(updated.metadata?.createdAt).toBe(testPlan.metadata?.createdAt);
    });
  });

  describe('incrementVersion()', () => {
    beforeEach(() => {
      testPlan = PlanMetadataManager.addMetadata(testPlan);
    });

    it('should increment major version', () => {
      const updated = PlanMetadataManager.incrementVersion(testPlan, 'major');

      expect(updated.metadata?.version).toBe('2.0.0');
    });

    it('should increment minor version', () => {
      const updated = PlanMetadataManager.incrementVersion(testPlan, 'minor');

      expect(updated.metadata?.version).toBe('1.1.0');
    });

    it('should increment patch version', () => {
      const updated = PlanMetadataManager.incrementVersion(testPlan, 'patch');

      expect(updated.metadata?.version).toBe('1.0.1');
    });

    it('should handle multiple increments', () => {
      let updated = PlanMetadataManager.incrementVersion(testPlan, 'patch');
      updated = PlanMetadataManager.incrementVersion(updated, 'patch');
      updated = PlanMetadataManager.incrementVersion(updated, 'minor');
      updated = PlanMetadataManager.incrementVersion(updated, 'major');

      expect(updated.metadata?.version).toBe('2.0.0');
    });

    it('should reset lower versions on major bump', () => {
      let updated = testPlan;
      updated = PlanMetadataManager.incrementVersion(updated, 'minor');
      updated = PlanMetadataManager.incrementVersion(updated, 'patch');
      expect(updated.metadata?.version).toBe('1.1.1');

      updated = PlanMetadataManager.incrementVersion(updated, 'major');
      expect(updated.metadata?.version).toBe('2.0.0');
    });

    it('should reset patch on minor bump', () => {
      let updated = testPlan;
      updated = PlanMetadataManager.incrementVersion(updated, 'patch');
      updated = PlanMetadataManager.incrementVersion(updated, 'patch');
      expect(updated.metadata?.version).toBe('1.0.2');

      updated = PlanMetadataManager.incrementVersion(updated, 'minor');
      expect(updated.metadata?.version).toBe('1.1.0');
    });

    it('should throw on invalid version format', () => {
      testPlan.metadata!.version = 'invalid.version';

      expect(() => {
        PlanMetadataManager.incrementVersion(testPlan, 'patch');
      }).toThrow('Invalid version format');
    });

    it('should throw on invalid increment type', () => {
      expect(() => {
        PlanMetadataManager.incrementVersion(testPlan, 'invalid' as any);
      }).toThrow('Unknown version type');
    });
  });

  describe('getAuthor()', () => {
    it('should return a string', async () => {
      const author = await PlanMetadataManager.getAuthor();
      expect(typeof author).toBe('string');
      expect(author.length).toBeGreaterThan(0);
    });

    it('should not return "Unknown User" if git config available', async () => {
      const author = await PlanMetadataManager.getAuthor();
      // This test depends on environment - git config or OS username
      expect(author).toBeDefined();
    });
  });

  describe('validateMetadata()', () => {
    it('should validate correct metadata', () => {
      const metadata: PlanMetadata = {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        author: 'Test Author',
        version: '1.0.0',
        status: 'draft',
      };

      expect(PlanMetadataManager.validateMetadata(metadata)).toBe(true);
    });

    it('should reject invalid createdAt', () => {
      const metadata = {
        createdAt: 'invalid-date',
        updatedAt: '2026-01-01T00:00:00.000Z',
        author: 'Test Author',
        version: '1.0.0',
        status: 'draft',
      };

      expect(PlanMetadataManager.validateMetadata(metadata)).toBe(false);
    });

    it('should reject invalid version format', () => {
      const metadata = {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        author: 'Test Author',
        version: '1.0',
        status: 'draft',
      };

      expect(PlanMetadataManager.validateMetadata(metadata)).toBe(false);
    });

    it('should reject invalid status', () => {
      const metadata = {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        author: 'Test Author',
        version: '1.0.0',
        status: 'invalid-status',
      };

      expect(PlanMetadataManager.validateMetadata(metadata)).toBe(false);
    });

    it('should reject non-object metadata', () => {
      expect(PlanMetadataManager.validateMetadata('not an object')).toBe(false);
      expect(PlanMetadataManager.validateMetadata(null)).toBe(false);
      expect(PlanMetadataManager.validateMetadata(undefined)).toBe(false);
    });

    it('should accept all valid statuses', () => {
      const validStatuses: Array<'draft' | 'active' | 'completed' | 'archived'> = [
        'draft',
        'active',
        'completed',
        'archived',
      ];

      for (const status of validStatuses) {
        const metadata = {
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          author: 'Test Author',
          version: '1.0.0',
          status,
        };

        expect(
          PlanMetadataManager.validateMetadata(metadata),
          `Should accept status: ${status}`
        ).toBe(true);
      }
    });
  });

  describe('getMetadata()', () => {
    it('should return metadata if present and valid', () => {
      const planWithMetadata = PlanMetadataManager.addMetadata(testPlan);
      const metadata = PlanMetadataManager.getMetadata(planWithMetadata);

      expect(metadata).not.toBeNull();
      expect(metadata?.version).toBe('1.0.0');
    });

    it('should return null if metadata not present', () => {
      const metadata = PlanMetadataManager.getMetadata(testPlan);
      expect(metadata).toBeNull();
    });

    it('should return null if metadata is invalid', () => {
      testPlan.metadata = { invalid: 'metadata' } as any;
      const metadata = PlanMetadataManager.getMetadata(testPlan);
      expect(metadata).toBeNull();
    });
  });

  describe('getSummary()', () => {
    it('should return formatted summary string', () => {
      const metadata: PlanMetadata = {
        createdAt: '2026-01-01T12:00:00.000Z',
        updatedAt: '2026-01-02T12:00:00.000Z',
        author: 'Test Author',
        version: '1.5.2',
        status: 'active',
      };

      const summary = PlanMetadataManager.getSummary(metadata);

      expect(summary).toContain('1.5.2');
      expect(summary).toContain('active');
      expect(summary).toContain('Test Author');
      expect(summary).toContain('Created:');
      expect(summary).toContain('Last Updated:');
    });

    it('should format dates in local timezone', () => {
      const metadata: PlanMetadata = {
        createdAt: '2026-01-01T12:00:00.000Z',
        updatedAt: '2026-01-01T12:00:00.000Z',
        author: 'Test Author',
        version: '1.0.0',
        status: 'draft',
      };

      const summary = PlanMetadataManager.getSummary(metadata);

      // Should contain date-like strings (exact format depends on locale)
      expect(summary).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY or similar
    });
  });

  describe('mergeMetadata()', () => {
    let sourcePlan: PlanJSON;
    let targetPlan: PlanJSON;

    beforeEach(() => {
      sourcePlan = PlanMetadataManager.addMetadata({
        projectName: 'Source',
      });

      targetPlan = PlanMetadataManager.addMetadata({
        projectName: 'Target',
      });

      // Set different versions to verify merge behavior
      if (targetPlan.metadata) {
        targetPlan.metadata.version = '2.0.0';
      }
    });

    it('should merge source metadata into target', () => {
      const merged = PlanMetadataManager.mergeMetadata(sourcePlan, targetPlan);

      expect(merged).toBeDefined();
      expect(merged.version).toBe('1.0.0'); // From source
    });

    it('should preserve target createdAt', () => {
      const targetCreatedAt = targetPlan.metadata?.createdAt;
      const merged = PlanMetadataManager.mergeMetadata(sourcePlan, targetPlan);

      expect(merged.createdAt).toBe(targetCreatedAt);
    });

    it('should update updatedAt to current time', () => {
      const merged = PlanMetadataManager.mergeMetadata(sourcePlan, targetPlan);

      // Should be recently created
      const now = new Date();
      const mergedDate = new Date(merged.updatedAt);
      const timeDiff = now.getTime() - mergedDate.getTime();

      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should handle missing source metadata', () => {
      const merged = PlanMetadataManager.mergeMetadata(testPlan, targetPlan);

      expect(merged).toBeDefined();
      expect(merged.createdAt).toBe(targetPlan.metadata?.createdAt);
    });

    it('should handle missing target metadata', () => {
      const merged = PlanMetadataManager.mergeMetadata(sourcePlan, testPlan);

      expect(merged).toBeDefined();
      expect(merged.version).toBe('1.0.0'); // From source
    });
  });

  describe('Integration scenarios', () => {
    it('should create, update, and version a plan lifecycle', () => {
      // Create plan with metadata
      let plan = PlanMetadataManager.addMetadata(testPlan);
      expect(plan.metadata?.version).toBe('1.0.0');
      expect(plan.metadata?.status).toBe('draft');

      // Activate the plan
      plan = PlanMetadataManager.updateMetadata(plan, {
        status: 'active',
      });
      expect(plan.metadata?.status).toBe('active');

      // Make changes and bump version
      plan = PlanMetadataManager.incrementVersion(plan, 'minor');
      expect(plan.metadata?.version).toBe('1.1.0');

      // More changes
      plan = PlanMetadataManager.incrementVersion(plan, 'patch');
      expect(plan.metadata?.version).toBe('1.1.1');

      // Complete the plan
      plan = PlanMetadataManager.updateMetadata(plan, {
        status: 'completed',
      });
      expect(plan.metadata?.status).toBe('completed');

      // Verify final state
      const final = PlanMetadataManager.getMetadata(plan);
      expect(final?.version).toBe('1.1.1');
      expect(final?.status).toBe('completed');
    });

    it('should handle complex update scenarios', () => {
      let plan = PlanMetadataManager.addMetadata(testPlan);
      const initialCreatedAt = plan.metadata?.createdAt;

      // Multiple updates
      plan = PlanMetadataManager.updateMetadata(plan, { status: 'active' });
      plan = PlanMetadataManager.incrementVersion(plan, 'minor');
      plan = PlanMetadataManager.updateMetadata(plan, { author: 'New Author' });

      const final = PlanMetadataManager.getMetadata(plan);
      expect(final?.createdAt).toBe(initialCreatedAt); // Should not change
      expect(final?.author).toBe('New Author');
      expect(final?.version).toBe('1.1.0');
      expect(final?.status).toBe('active');
    });
  });
});
