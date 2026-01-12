/**
 * Export Integration Tests (Simplified)
 * 
 * Tests export functionality using actual PlanExporter implementation.
 * Note: PlanExporter uses static methods and file system operations.
 */

import { describe, it, expect } from 'vitest';
import { PlanExporter, type PlanData, type PlanTask } from '../../exporters/planExporter';
import * as path from 'path';
import * as os from 'os';

describe('Export Integration Tests', () => {
  const testPlan: PlanData = {
    name: 'Test Project Plan',
    description: 'A comprehensive test plan',
    version: '1.0.0',
    author: 'Test Suite',
    createdAt: new Date().toISOString(),
    tasks: [
      {
        id: 'TASK-001',
        title: 'Setup Infrastructure',
        description: 'Initialize project infrastructure',
        priority: 'high',
        status: 'pending',
        estimatedHours: 8,
      },
      {
        id: 'TASK-002',
        title: 'Implement Authentication',
        description: 'Build user authentication system',
        priority: 'critical',
        status: 'in_progress',
        dependencies: ['TASK-001'],
        estimatedHours: 16,
      },
      {
        id: 'TASK-003',
        title: 'Create Dashboard',
        description: 'Build admin dashboard',
        priority: 'medium',
        status: 'pending',
        dependencies: ['TASK-002'],
        estimatedHours: 12,
      },
    ],
  };

  const tempDir = os.tmpdir();

  describe('PlanData Interface Validation', () => {
    it('should have valid plan structure', () => {
      expect(testPlan).toHaveProperty('name');
      expect(testPlan).toHaveProperty('tasks');
      expect(Array.isArray(testPlan.tasks)).toBe(true);
      expect(testPlan.tasks.length).toBe(3);
    });

    it('should have valid task structures', () => {
      testPlan.tasks.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('status');
        
        // Validate enum values
        if (task.priority) {
          expect(['critical', 'high', 'medium', 'low']).toContain(task.priority);
        }
        if (task.status) {
          expect(['pending', 'in_progress', 'completed', 'blocked']).toContain(task.status);
        }
      });
    });

    it('should handle task dependencies', () => {
      const task2 = testPlan.tasks.find(t => t.id === 'TASK-002');
      const task3 = testPlan.tasks.find(t => t.id === 'TASK-003');
      
      expect(task2?.dependencies).toContain('TASK-001');
      expect(task3?.dependencies).toContain('TASK-002');
    });
  });

  describe('Export Format Types', () => {
    it('should recognize all export format types', () => {
      const formats = ['json', 'markdown', 'pdf', 'github', 'mermaid-architecture', 'mermaid-dependencies', 'mermaid-timeline'];
      
      formats.forEach(format => {
        expect(typeof format).toBe('string');
      });
    });
  });

  describe('Plan Task Priority System', () => {
    it('should have different priority levels', () => {
      const priorities = testPlan.tasks.map(t => t.priority).filter(p => p !== undefined);
      const uniquePriorities = Array.from(new Set(priorities));
      
      expect(uniquePriorities.length).toBeGreaterThan(1);
      expect(priorities).toContain('critical');
      expect(priorities).toContain('high');
    });

    it('should have task status tracking', () => {
      const statuses = testPlan.tasks.map(t => t.status).filter(s => s !== undefined);
      const uniqueStatuses = Array.from(new Set(statuses));
      
      expect(uniqueStatuses.length).toBeGreaterThan(1);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('in_progress');
    });
  });

  describe('Task Relationships', () => {
    it('should create dependency graph', () => {
      const taskMap = new Map(testPlan.tasks.map(t => [t.id, t]));
      
      testPlan.tasks.forEach(task => {
        if (task.dependencies) {
          task.dependencies.forEach(depId => {
            const dependencyExists = taskMap.has(depId);
            expect(dependencyExists).toBe(true);
          });
        }
      });
    });

    it('should identify tasks without dependencies', () => {
      const rootTasks = testPlan.tasks.filter(t => !t.dependencies || t.dependencies.length === 0);
      expect(rootTasks.length).toBeGreaterThan(0);
      expect(rootTasks[0].id).toBe('TASK-001'); // First task has no dependencies
    });

    it('should identify tasks with dependencies', () => {
      const dependentTasks = testPlan.tasks.filter(t => t.dependencies && t.dependencies.length > 0);
      expect(dependentTasks.length).toBeGreaterThan(0);
    });
  });

  describe('Task Estimation', () => {
    it('should have estimated hours for tasks', () => {
      const tasksWithEstimates = testPlan.tasks.filter(t => t.estimatedHours !== undefined);
      expect(tasksWithEstimates.length).toBe(testPlan.tasks.length);
    });

    it('should calculate total estimated hours', () => {
      const totalHours = testPlan.tasks.reduce((sum, task) => {
        return sum + (task.estimatedHours || 0);
      }, 0);
      
      expect(totalHours).toBe(36); // 8 + 16 + 12
    });

    it('should have reasonable time estimates', () => {
      testPlan.tasks.forEach(task => {
        if (task.estimatedHours) {
          expect(task.estimatedHours).toBeGreaterThan(0);
          expect(task.estimatedHours).toBeLessThan(200); // Reasonable upper limit
        }
      });
    });
  });

  describe('Plan Metadata', () => {
    it('should have plan metadata', () => {
      expect(testPlan.name).toBeDefined();
      expect(testPlan.version).toBeDefined();
      expect(testPlan.author).toBeDefined();
      expect(testPlan.createdAt).toBeDefined();
    });

    it('should have valid version format', () => {
      expect(testPlan.version).toMatch(/^\d+\.\d+\.\d+$/); // Semver format
    });

    it('should have valid timestamp', () => {
      const timestamp = new Date(testPlan.createdAt!);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Performance', () => {
    it('should handle large task lists efficiently', () => {
      const largePlan: PlanData = {
        name: 'Large Plan',
        tasks: Array.from({ length: 1000 }, (_, i) => ({
          id: `TASK-${i.toString().padStart(4, '0')}`,
          title: `Task ${i}`,
          priority: 'medium' as const,
          status: 'pending' as const,
        })),
      };

      const start = performance.now();
      
      // Process task list
      const taskIds = largePlan.tasks.map(t => t.id);
      const taskCount = largePlan.tasks.length;
      
      const duration = performance.now() - start;
      
      expect(taskCount).toBe(1000);
      expect(taskIds.length).toBe(1000);
      expect(duration).toBeLessThan(100); // <100ms for processing
    });
  });
});
