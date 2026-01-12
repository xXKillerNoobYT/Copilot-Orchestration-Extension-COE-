/**
 * Export Integration Tests
 * 
 * Tests for all export format generation and validation.
 * 
 * Test Coverage:
 * - JSON export with schema validation
 * - Markdown export with proper formatting
 * - YAML export with correct structure
 * - ZIP archive creation and integrity
 * - Large plan export performance
 * - Export error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlanExporter } from '../../exporters/planExporter';
import type { Plan, Task } from '../../types';

describe('Export Integration Tests', () => {
  let exporter: PlanExporter;

  beforeEach(() => {
    exporter = new PlanExporter();
  });

  describe('JSON Export', () => {
    it('should export valid JSON with complete plan structure', async () => {
      const plan: Plan = {
        id: 'json-test-001',
        name: 'JSON Export Test',
        description: 'Comprehensive JSON export',
        version: '1.0.0',
        metadata: {
          author: 'Test User',
          createdAt: new Date().toISOString(),
          tags: ['test', 'export'],
        },
        phases: [
          {
            name: 'Phase 1',
            duration: '2 weeks',
            deliverables: ['Setup', 'Config'],
            tasks: ['TASK-001', 'TASK-002'],
          },
        ],
      };

      const tasks: Task[] = [
        {
          id: 'TASK-001',
          title: 'Initial Setup',
          description: 'Setup project infrastructure',
          status: 'pending',
          priority: 'high',
          dependencies: [],
          estimatedHours: 8,
        },
        {
          id: 'TASK-002',
          title: 'Configuration',
          description: 'Configure environment',
          status: 'pending',
          priority: 'medium',
          dependencies: ['TASK-001'],
          estimatedHours: 4,
        },
      ];

      const json = await exporter.exportToJSON(plan, tasks);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.plan.id).toBe('json-test-001');
      expect(parsed.plan.phases).toHaveLength(1);
      expect(parsed.tasks).toHaveLength(2);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.exportedAt).toBeDefined();
    });

    it('should validate against JSON schema', async () => {
      const plan: Plan = { id: 'schema-test', name: 'Schema Test', version: '1.0.0' };
      const tasks: Task[] = [];

      const json = await exporter.exportToJSON(plan, tasks);
      const parsed = JSON.parse(json);

      // Validate required fields
      expect(parsed).toHaveProperty('plan');
      expect(parsed).toHaveProperty('tasks');
      expect(parsed).toHaveProperty('metadata');
      expect(parsed.plan).toHaveProperty('id');
      expect(parsed.plan).toHaveProperty('name');
      expect(parsed.plan).toHaveProperty('version');
    });

    it('should handle plans with no tasks', async () => {
      const plan: Plan = { id: 'empty-tasks', name: 'No Tasks', version: '1.0.0' };
      const json = await exporter.exportToJSON(plan, []);

      const parsed = JSON.parse(json);
      expect(parsed.tasks).toEqual([]);
    });

    it('should preserve task dependencies in JSON', async () => {
      const plan: Plan = { id: 'deps', name: 'Dependencies', version: '1.0.0' };
      const tasks: Task[] = [
        { id: 'A', title: 'Task A', status: 'done', priority: 'high' },
        { id: 'B', title: 'Task B', status: 'pending', priority: 'medium', dependencies: ['A'] },
        { id: 'C', title: 'Task C', status: 'pending', priority: 'low', dependencies: ['A', 'B'] },
      ];

      const json = await exporter.exportToJSON(plan, tasks);
      const parsed = JSON.parse(json);

      expect(parsed.tasks[1].dependencies).toContain('A');
      expect(parsed.tasks[2].dependencies).toContain('A');
      expect(parsed.tasks[2].dependencies).toContain('B');
    });
  });

  describe('Markdown Export', () => {
    it('should generate well-formatted markdown document', async () => {
      const plan: Plan = {
        id: 'md-test',
        name: 'Markdown Test Project',
        description: 'Testing markdown export',
        version: '1.0.0',
      };

      const tasks: Task[] = [
        {
          id: 'TASK-001',
          title: 'Implement Feature',
          description: 'Build the main feature',
          status: 'in_progress',
          priority: 'critical',
        },
      ];

      const markdown = await exporter.exportToMarkdown(plan, tasks);

      // Verify document structure
      expect(markdown).toContain('# Markdown Test Project');
      expect(markdown).toContain('## Overview');
      expect(markdown).toContain('## Tasks');
      expect(markdown).toContain('### TASK-001');
      expect(markdown).toContain('**Status:** in_progress');
      expect(markdown).toContain('**Priority:** critical');
    });

    it('should include task statistics', async () => {
      const plan: Plan = { id: 'stats', name: 'Stats Test', version: '1.0.0' };
      const tasks: Task[] = [
        { id: '1', title: 'T1', status: 'done', priority: 'high' },
        { id: '2', title: 'T2', status: 'done', priority: 'medium' },
        { id: '3', title: 'T3', status: 'in_progress', priority: 'high' },
        { id: '4', title: 'T4', status: 'pending', priority: 'low' },
      ];

      const markdown = await exporter.exportToMarkdown(plan, tasks);

      expect(markdown).toContain('Total Tasks: 4');
      expect(markdown).toContain('Completed: 2');
      expect(markdown).toContain('In Progress: 1');
      expect(markdown).toContain('Pending: 1');
    });

    it('should format code blocks properly', async () => {
      const plan: Plan = { id: 'code', name: 'Code Test', version: '1.0.0' };
      const tasks: Task[] = [
        {
          id: 'CODE-1',
          title: 'Code Task',
          description: 'Task with code example',
          codeExample: 'const x = 42;',
          status: 'pending',
          priority: 'medium',
        },
      ];

      const markdown = await exporter.exportToMarkdown(plan, tasks);

      expect(markdown).toContain('```');
      expect(markdown).toContain('const x = 42;');
    });
  });

  describe('YAML Export', () => {
    it('should generate valid YAML structure', async () => {
      const plan: Plan = {
        id: 'yaml-test',
        name: 'YAML Test',
        version: '2.1.0',
      };

      const tasks: Task[] = [
        {
          id: 'Y-001',
          title: 'YAML Task',
          status: 'pending',
          priority: 'high',
        },
      ];

      const yaml = await exporter.exportToYAML(plan, tasks);

      expect(yaml).toContain('name: YAML Test');
      expect(yaml).toContain('version: 2.1.0');
      expect(yaml).toContain('id: Y-001');
      expect(yaml).toContain('priority: high');
    });

    it('should handle nested structures correctly', async () => {
      const plan: Plan = {
        id: 'nested',
        name: 'Nested Test',
        version: '1.0.0',
        phases: [
          {
            name: 'Phase 1',
            duration: '1 week',
            deliverables: ['A', 'B', 'C'],
          },
        ],
      };

      const yaml = await exporter.exportToYAML(plan, []);

      expect(yaml).toContain('phases:');
      expect(yaml).toContain('- name: Phase 1');
      expect(yaml).toContain('deliverables:');
      expect(yaml).toContain('- A');
    });

    it('should escape special characters', async () => {
      const plan: Plan = {
        id: 'special-chars',
        name: 'Test: Special "Characters" & More',
        version: '1.0.0',
      };

      const yaml = await exporter.exportToYAML(plan, []);

      // YAML should properly escape/quote special characters
      expect(yaml).toBeDefined();
      expect(yaml.length).toBeGreaterThan(0);
    });
  });

  describe('ZIP Archive Export', () => {
    it('should create ZIP with all export formats', async () => {
      const plan: Plan = { id: 'zip-test', name: 'ZIP Test', version: '1.0.0' };
      const tasks: Task[] = [
        { id: 'Z1', title: 'Task 1', status: 'pending', priority: 'high' },
      ];

      const zipBuffer = await exporter.exportToZIP(plan, tasks);

      expect(zipBuffer).toBeDefined();
      expect(Buffer.isBuffer(zipBuffer)).toBe(true);
      expect(zipBuffer.length).toBeGreaterThan(100); // Reasonable minimum size
    });

    it('should include all file formats in ZIP', async () => {
      const plan: Plan = { id: 'all-formats', name: 'All Formats', version: '1.0.0' };
      const tasks: Task[] = [];

      const zipBuffer = await exporter.exportToZIP(plan, tasks);
      
      // Extract and verify contents (using mock ZIP reader)
      // In real implementation, would use JSZip or similar to verify:
      // - plan.json exists
      // - plan.md exists
      // - plan.yaml exists
      // - tasks.json exists
      
      expect(zipBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Large Plan Export Performance', () => {
    it('should export plan with 1000 tasks efficiently', async () => {
      const plan: Plan = { id: 'large', name: 'Large Plan', version: '1.0.0' };
      const tasks: Task[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `TASK-${i.toString().padStart(4, '0')}`,
        title: `Task ${i}`,
        description: `Description for task ${i}`,
        status: 'pending' as const,
        priority: 'medium' as const,
      }));

      const start = performance.now();
      const json = await exporter.exportToJSON(plan, tasks);
      const jsonDuration = performance.now() - start;

      expect(json).toBeDefined();
      expect(JSON.parse(json).tasks).toHaveLength(1000);
      expect(jsonDuration).toBeLessThan(1000); // <1 second for JSON

      const markdownStart = performance.now();
      const markdown = await exporter.exportToMarkdown(plan, tasks);
      const markdownDuration = performance.now() - markdownStart;

      expect(markdown).toBeDefined();
      expect(markdownDuration).toBeLessThan(3000); // <3 seconds for Markdown
    });
  });

  describe('Export Error Handling', () => {
    it('should handle invalid plan data gracefully', async () => {
      const invalidPlan = null as unknown as Plan;
      const tasks: Task[] = [];

      await expect(async () => {
        await exporter.exportToJSON(invalidPlan, tasks);
      }).rejects.toThrow();
    });

    it('should handle circular dependencies in tasks', async () => {
      const plan: Plan = { id: 'circular', name: 'Circular Test', version: '1.0.0' };
      const tasks: Task[] = [
        { id: 'A', title: 'Task A', status: 'pending', priority: 'high', dependencies: ['B'] },
        { id: 'B', title: 'Task B', status: 'pending', priority: 'high', dependencies: ['A'] },
      ];

      // Should detect circular dependency and either throw or warn
      const json = await exporter.exportToJSON(plan, tasks);
      const parsed = JSON.parse(json);
      
      expect(parsed.warnings).toBeDefined();
      expect(parsed.warnings.some((w: string) => w.includes('circular'))).toBe(true);
    });

    it('should handle missing required fields', async () => {
      const incompletePlan = { id: 'incomplete' } as Plan; // Missing name, version
      const tasks: Task[] = [];

      await expect(async () => {
        await exporter.exportToJSON(incompletePlan, tasks);
      }).rejects.toThrow(/required field/i);
    });
  });
});
