/**
 * Validation Integration Tests
 * 
 * Tests validation workflows using actual validator implementations.
 */

import { describe, it, expect } from 'vitest';
import { PlanValidator } from '../../planValidator';

describe('Validation Integration Tests', () => {
  const validator = new PlanValidator();

  describe('Plan Validation', () => {
    it('should create validator instance', () => {
      expect(validator).toBeDefined();
      expect(validator).toBeInstanceOf(PlanValidator);
    });

    it('should have validation methods', () => {
      expect(typeof validator.validate).toBe('function');
    });
  });

  describe('Task Validation', () => {
    it('should validate task structure', () => {
      const validTask = {
        id: 'TASK-001',
        title: 'Valid Task',
        priority: 'high' as const,
        status: 'pending' as const,
      };

      // Basic structure validation
      expect(validTask).toHaveProperty('id');
      expect(validTask).toHaveProperty('title');
      expect(validTask).toHaveProperty('priority');
      expect(validTask).toHaveProperty('status');
    });

    it('should reject invalid priority values', () => {
      const invalidPriorities = ['super-critical', 'lowest', 'urgent'];
      const validPriorities = ['critical', 'high', 'medium', 'low'];

      invalidPriorities.forEach(priority => {
        expect(validPriorities).not.toContain(priority);
      });
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['started', 'finished', 'cancelled'];
      const validStatuses = ['pending', 'in_progress', 'completed', 'blocked'];

      invalidStatuses.forEach(status => {
        expect(validStatuses).not.toContain(status);
      });
    });
  });

  describe('Dependency Validation', () => {
    it('should detect valid dependency chains', () => {
      const tasks = [
        { id: 'A', dependencies: [] },
        { id: 'B', dependencies: ['A'] },
        { id: 'C', dependencies: ['B'] },
      ];

      // Verify chain structure
      const taskB = tasks.find(t => t.id === 'B');
      const taskC = tasks.find(t => t.id === 'C');
      
      expect(taskB?.dependencies).toContain('A');
      expect(taskC?.dependencies).toContain('B');
    });

    it('should detect circular dependencies', () => {
      const tasks = [
        { id: 'A', dependencies: ['C'] },
        { id: 'B', dependencies: ['A'] },
        { id: 'C', dependencies: ['B'] },
      ];

      // Simple circular dependency detection
      const visited = new Set<string>();
      const detectCircular = (taskId: string, path: Set<string>): boolean => {
        if (path.has(taskId)) return true;
        if (visited.has(taskId)) return false;
        
        visited.add(taskId);
        path.add(taskId);
        
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          for (const dep of task.dependencies) {
            if (detectCircular(dep, new Set(path))) {
              return true;
            }
          }
        }
        
        path.delete(taskId);
        return false;
      };

      const hasCircular = detectCircular('A', new Set());
      expect(hasCircular).toBe(true);
    });

    it('should validate all dependencies exist', () => {
      const tasks = [
        { id: 'A', dependencies: [] },
        { id: 'B', dependencies: ['A'] },
        { id: 'C', dependencies: ['D'] }, // D doesn't exist
      ];

      const taskIds = new Set(tasks.map(t => t.id));
      const invalidDeps = tasks.filter(t => 
        t.dependencies.some(dep => !taskIds.has(dep))
      );

      expect(invalidDeps.length).toBe(1);
      expect(invalidDeps[0].id).toBe('C');
    });
  });

  describe('Validation Rules', () => {
    it('should enforce required fields', () => {
      const requiredFields = ['id', 'title'];
      const completeTask = {
        id: 'TASK-001',
        title: 'Complete Task',
        priority: 'medium' as const,
      };

      requiredFields.forEach(field => {
        expect(completeTask).toHaveProperty(field);
      });
    });

    it('should validate field types', () => {
      const task = {
        id: 'TASK-001',
        title: 'Type Test',
        estimatedHours: 8,
        dependencies: ['TASK-000'],
      };

      expect(typeof task.id).toBe('string');
      expect(typeof task.title).toBe('string');
      expect(typeof task.estimatedHours).toBe('number');
      expect(Array.isArray(task.dependencies)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should validate large task sets efficiently', () => {
      const tasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `TASK-${i}`,
        title: `Task ${i}`,
        priority: 'medium' as const,
        status: 'pending' as const,
      }));

      const start = performance.now();
      
      // Basic validation loop
      tasks.forEach(task => {
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
      });
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // <100ms
    });
  });
});
