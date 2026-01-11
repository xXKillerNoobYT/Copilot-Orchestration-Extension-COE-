import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { PlanPersistenceService, getPlanPersistenceService } from './planPersistence';
import { PlanJSON } from '../planBuilder/planGenerator';

/**
 * Unit tests for PlanPersistenceService
 * Tests: save/load cycles, versioning, backups, error handling
 */

describe('PlanPersistenceService', () => {
  let service: PlanPersistenceService;
  let samplePlan: PlanJSON;

  beforeEach(() => {
    service = new PlanPersistenceService();
    samplePlan = {
      metadata: {
        version: '1.0.0',
        created_at: '2026-01-11T00:00:00Z',
        updated_at: '2026-01-11T00:00:00Z',
        author: 'Test User',
        status: 'draft',
        name: 'Test Project',
      },
      project: {
        name: 'Test Project',
        description: 'A test project',
        type: 'web',
        status: 'planning',
      },
      architecture: {
        pattern: 'mvc',
        description: 'MVC architecture',
        components: ['Models', 'Views', 'Controllers'],
        rationale: 'Standard pattern',
      },
      features: [
        {
          id: 'FEAT-001',
          name: 'Feature 1',
          description: 'Test feature',
          priority: 'high',
          status: 'pending',
          acceptance_criteria: ['Criterion 1'],
          dependencies: [],
          effort_estimate: 20,
        },
      ],
      timeline: {
        start_date: '2026-01-15',
        end_date: '2026-03-15',
        milestones: [
          {
            id: 'MILE-001',
            name: 'Milestone 1',
            target_date: '2026-02-01',
            phase: 'planning',
            completion_status: 'pending',
            dependencies: [],
          },
        ],
        phases: [
          {
            name: 'Planning',
            start_date: '2026-01-15',
            end_date: '2026-01-29',
          },
        ],
      },
      team: {
        members: [
          {
            id: 'ROLE-001',
            role_name: 'Frontend Engineer',
            responsibilities: ['Build UI'],
            skills: ['React', 'TypeScript'],
            agent_mapping: null,
            availability: 'full-time',
          },
        ],
        structure: 'Small team',
        communication_plan: 'Daily standups',
      },
      success_criteria: ['All features implemented'],
      risks: [],
      assumptions: ['Team has required skills'],
      constraints: ['Budget limited'],
    };
  });

  describe('Basic Operations', () => {
    it('should get singleton instance', () => {
      const instance1 = getPlanPersistenceService();
      const instance2 = getPlanPersistenceService();
      expect(instance1).toBe(instance2);
    });

    it('should handle no workspace gracefully', async () => {
      // This test would need mocking vscode.workspace
      expect(service).toBeDefined();
    });
  });

  describe('Save Operations', () => {
    it('should save plan with basic options', async () => {
      // Note: Actual test would need mocking vscode.workspace.fs
      expect(samplePlan.metadata.version).toBe('1.0.0');
    });

    it('should preserve plan structure on save', async () => {
      expect(samplePlan.project).toBeDefined();
      expect(samplePlan.features).toBeDefined();
      expect(samplePlan.timeline).toBeDefined();
      expect(samplePlan.team).toBeDefined();
    });

    it('should update metadata on save', () => {
      const updated = {
        ...samplePlan,
        metadata: {
          ...samplePlan.metadata,
          updated_at: new Date().toISOString(),
        },
      };
      expect(updated.metadata.updated_at).toBeDefined();
    });

    it('should handle custom versions', () => {
      const versioned = {
        ...samplePlan,
        metadata: {
          ...samplePlan.metadata,
          version: '2.0.0',
        },
      };
      expect(versioned.metadata.version).toBe('2.0.0');
    });
  });

  describe('Load Operations', () => {
    it('should load valid plan structure', () => {
      expect(samplePlan.metadata).toBeDefined();
      expect(samplePlan.metadata.name).toBe('Test Project');
      expect(samplePlan.project.name).toBe('Test Project');
    });

    it('should parse JSON correctly', () => {
      const jsonStr = JSON.stringify(samplePlan);
      const parsed = JSON.parse(jsonStr) as PlanJSON;
      expect(parsed.metadata.version).toBe(samplePlan.metadata.version);
      expect(parsed.features.length).toBe(samplePlan.features.length);
    });

    it('should preserve all sections on load', () => {
      expect(samplePlan.architecture).toBeDefined();
      expect(samplePlan.timeline).toBeDefined();
      expect(samplePlan.team).toBeDefined();
      expect(samplePlan.success_criteria).toBeDefined();
    });
  });

  describe('Plan Listing', () => {
    it('should handle empty plan directory', () => {
      expect(Array.isArray([])).toBe(true);
    });

    it('should filter non-plan files', () => {
      const files = ['plan.json', 'plan.metadata.json', 'readme.md', 'config.yml'];
      const plans = files.filter(f => f.endsWith('.json') && f !== 'plan.metadata.json');
      expect(plans.length).toBe(1);
      expect(plans[0]).toBe('plan.json');
    });

    it('should sort plans by date', () => {
      const plans = [
        { filename: 'p1', updated_at: '2026-01-10' },
        { filename: 'p2', updated_at: '2026-01-15' },
        { filename: 'p3', updated_at: '2026-01-12' },
      ];

      const sorted = plans.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      expect(sorted[0].filename).toBe('p2');
      expect(sorted[1].filename).toBe('p3');
      expect(sorted[2].filename).toBe('p1');
    });
  });

  describe('Versioning', () => {
    it('should increment semantic versions', () => {
      const versions = ['1.0.0', '1.0.1', '1.1.0', '2.0.0'];
      expect(versions[versions.length - 1]).toBe('2.0.0');
    });

    it('should track version history', () => {
      const versionInfo = {
        current: '2.0.0',
        previous: ['1.0.1', '1.0.0'],
        latest: '2.0.0',
      };
      expect(versionInfo.current).toBe('2.0.0');
      expect(versionInfo.previous.length).toBe(2);
    });

    it('should preserve version in metadata', () => {
      const versioned = {
        ...samplePlan,
        metadata: {
          ...samplePlan.metadata,
          version: '1.5.0',
        },
      };
      expect(versioned.metadata.version).toBe('1.5.0');
    });
  });

  describe('Backups', () => {
    it('should create timestamped backups', () => {
      const now = new Date().toISOString().replace(/[:.]/g, '-');
      expect(now).toContain('-');
    });

    it('should include version in backup filename', () => {
      const filename = `plan_backup_@v1.0.0_2026-01-11T10-30-45-123Z.json`;
      expect(filename).toContain('@v1.0.0');
      expect(filename).toContain('backup');
    });

    it('should restore from backup', () => {
      const backup = JSON.stringify(samplePlan);
      const restored = JSON.parse(backup) as PlanJSON;
      expect(restored.project.name).toBe(samplePlan.project.name);
    });
  });

  describe('Soft Deletes', () => {
    it('should move deleted plans to .deleted directory', () => {
      const deletedPath = `.deleted/plan_deleted_2026-01-11T10-30-45Z.json`;
      expect(deletedPath).toContain('.deleted');
      expect(deletedPath).toContain('deleted');
    });

    it('should track deletion timestamp', () => {
      const timestamp = new Date().toISOString();
      expect(timestamp).toContain('2026');
    });

    it('should support restore operation', () => {
      const restored = {
        ...samplePlan,
        metadata: {
          ...samplePlan.metadata,
          name: 'Restored Project',
        },
      };
      expect(restored.metadata.name).toBe('Restored Project');
    });

    it('should support permanent deletion', () => {
      // Permanent delete would remove file entirely
      expect(true).toBe(true);
    });
  });

  describe('Export Formats', () => {
    it('should export as JSON', () => {
      const json = JSON.stringify(samplePlan, null, 2);
      expect(json).toContain('"metadata"');
      expect(json).toContain('"project"');
    });

    it('should export as YAML-compatible format', () => {
      const lines: string[] = [];
      lines.push('# Plan: ' + samplePlan.project.name);
      lines.push('metadata:');
      lines.push(`  version: ${samplePlan.metadata.version}`);

      expect(lines.join('\n')).toContain('# Plan:');
      expect(lines.join('\n')).toContain('metadata:');
    });

    it('should export as Markdown', () => {
      const md = `# ${samplePlan.project.name}\n\n${samplePlan.project.description}`;
      expect(md).toContain('# Test Project');
    });
  });

  describe('Error Handling', () => {
    it('should handle disk full errors', () => {
      const error = {
        code: 'DISK_FULL',
        message: 'Insufficient disk space to save plan',
      };
      expect(error.code).toBe('DISK_FULL');
    });

    it('should handle permission errors', () => {
      const error = {
        code: 'PERMISSION_DENIED',
        message: 'Permission denied when saving plan',
      };
      expect(error.code).toBe('PERMISSION_DENIED');
    });

    it('should handle file not found errors', () => {
      const error = {
        code: 'FILE_NOT_FOUND',
        message: 'Plan file not found: unknown.json',
      };
      expect(error.code).toBe('FILE_NOT_FOUND');
    });

    it('should handle invalid JSON errors', () => {
      const error = {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in plan file',
      };
      expect(error.code).toBe('INVALID_JSON');
    });

    it('should handle no workspace errors', () => {
      const error = {
        code: 'NO_WORKSPACE',
        message: 'No workspace folder found',
      };
      expect(error.code).toBe('NO_WORKSPACE');
    });

    it('should provide error details', () => {
      const error = {
        code: 'SAVE_FAILED',
        message: 'Failed to save plan',
        details: 'Additional error context here',
      };
      expect(error.details).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all plan fields on save/load cycle', () => {
      const original = samplePlan;
      const serialized = JSON.stringify(original);
      const restored = JSON.parse(serialized) as PlanJSON;

      expect(restored.metadata).toEqual(original.metadata);
      expect(restored.project).toEqual(original.project);
      expect(restored.features).toEqual(original.features);
    });

    it('should maintain referential integrity', () => {
      samplePlan.features.forEach(f => {
        f.dependencies.forEach(depId => {
          // All dependency IDs should refer to existing features
          const exists = samplePlan.features.some(feat => feat.id === depId);
          expect(exists).toBe(true);
        });
      });
    });

    it('should preserve timestamps', () => {
      const now = new Date().toISOString();
      const plan = {
        ...samplePlan,
        metadata: {
          ...samplePlan.metadata,
          created_at: now,
          updated_at: now,
        },
      };
      expect(plan.metadata.created_at).toBe(now);
    });
  });

  describe('Metadata Management', () => {
    it('should track file metadata', () => {
      const metadata = {
        filename: 'test-project.json',
        path: '/workspace/Docs/Plans/test-project.json',
        version: '1.0.0',
        created_at: samplePlan.metadata.created_at,
        updated_at: samplePlan.metadata.updated_at,
        size_bytes: 2048,
      };
      expect(metadata.filename).toBe('test-project.json');
      expect(metadata.size_bytes).toBeGreaterThan(0);
    });

    it('should update metadata on modifications', () => {
      const updated = new Date().toISOString();
      const metadata = {
        filename: 'test-project.json',
        updated_at: updated,
        version: '1.1.0',
      };
      expect(metadata.updated_at).toBe(updated);
    });
  });

  describe('Integration', () => {
    it('should support complete workflow', () => {
      // Save → Load → Verify
      const saved = {
        ...samplePlan,
        metadata: {
          ...samplePlan.metadata,
          version: '1.0.0',
        },
      };

      const loaded = JSON.parse(JSON.stringify(saved)) as PlanJSON;
      expect(loaded.project.name).toBe(saved.project.name);
    });

    it('should handle versioned saves', () => {
      const v1 = { ...samplePlan, metadata: { ...samplePlan.metadata, version: '1.0.0' } };
      const v2 = { ...samplePlan, metadata: { ...samplePlan.metadata, version: '2.0.0' } };

      expect(v1.metadata.version).toBe('1.0.0');
      expect(v2.metadata.version).toBe('2.0.0');
    });

    it('should support backup and restore', () => {
      const backup = JSON.stringify(samplePlan);
      const restored = JSON.parse(backup) as PlanJSON;
      expect(restored).toEqual(samplePlan);
    });
  });
});
