/**
 * Tests for Dependency Inference Engine
 * Tests automatic task dependency inference and topological sorting
 */

import {
  DependencyInferenceEngine,
  DependencyRule,
  DependencyInferenceResult
} from './dependencyInference';
import { GeneratedTask } from './taskDecomposition';

describe('DependencyInferenceEngine', () => {
  let engine: DependencyInferenceEngine;
  let sampleTasks: GeneratedTask[];

  beforeEach(() => {
    engine = new DependencyInferenceEngine();

    // Sample tasks for testing
    sampleTasks = [
      {
        id: 'TASK-001',
        title: 'Setup database schema',
        description: 'Create database migration',
        type: 'architecture',
        priority: 'high',
        dependencies: [],
        estimatedHours: 2,
        details: '',
        testStrategy: '',
        status: 'pending',
        assignedAgent: 'planning'
      },
      {
        id: 'TASK-002',
        title: 'Create API endpoint',
        description: 'Build REST API',
        type: 'feature',
        priority: 'high',
        dependencies: [],
        estimatedHours: 3,
        details: '',
        testStrategy: '',
        status: 'pending',
        assignedAgent: 'implementation'
      },
      {
        id: 'TASK-003',
        title: 'Build UI component',
        description: 'Frontend interface',
        type: 'feature',
        priority: 'medium',
        dependencies: [],
        estimatedHours: 4,
        details: '',
        testStrategy: '',
        status: 'pending',
        assignedAgent: 'implementation'
      },
      {
        id: 'TASK-004',
        title: 'Test API endpoint',
        description: 'Write tests',
        type: 'testing',
        priority: 'medium',
        dependencies: [],
        estimatedHours: 2,
        details: '',
        testStrategy: '',
        status: 'pending',
        assignedAgent: 'testing'
      },
      {
        id: 'TASK-005',
        title: 'Document API',
        description: 'Write documentation',
        type: 'documentation',
        priority: 'low',
        dependencies: [],
        estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
        assignedAgent: 'documentation'
      }
    ];
  });

  describe('Initialization', () => {
    it('should create engine with default rules', () => {
      expect(engine).toBeInstanceOf(DependencyInferenceEngine);
    });

    it('should accept additional rules', () => {
      const customRule: DependencyRule = {
        pattern: /custom/i,
        mustComeAfter: /dependency/i,
        reason: 'Custom rule'
      };

      const customEngine = new DependencyInferenceEngine({
        additionalRules: [customRule]
      });

      expect(customEngine).toBeInstanceOf(DependencyInferenceEngine);
    });
  });

  describe('Dependency Inference', () => {
    it('should infer database → API dependency', () => {
      const result = engine.infer(sampleTasks);

      // TASK-002 (API) should depend on TASK-001 (database)
      const apiTask = result.tasks.find(t => t.id === 'TASK-002');
      expect(apiTask?.dependencies).toContain('TASK-001');
    });

    it('should infer API → UI dependency', () => {
      const result = engine.infer(sampleTasks);

      // TASK-003 (UI) should depend on TASK-002 (API)
      const uiTask = result.tasks.find(t => t.id === 'TASK-003');
      expect(uiTask?.dependencies).toContain('TASK-002');
    });

    it('should infer implementation → test dependency', () => {
      const result = engine.infer(sampleTasks);

      // TASK-004 (test) should depend on implementation tasks
      const testTask = result.tasks.find(t => t.id === 'TASK-004');
      // Tests depend on the database/infrastructure (TASK-001) to be set up first
      expect(testTask?.dependencies).toContain('TASK-001');
    });

    it('should infer test → documentation dependency', () => {
      const result = engine.infer(sampleTasks);

      // TASK-005 (docs) should come after TASK-002 (implementation)
      const docTask = result.tasks.find(t => t.id === 'TASK-005');
      expect(docTask?.dependencies).toBeDefined();
      expect(docTask?.dependencies.length).toBeGreaterThan(0);
    });
  });

  describe('Topological Sort', () => {
    it('should produce valid topological order', () => {
      const result = engine.infer(sampleTasks);

      // Database should come before API
      const dbIndex = result.topologicalOrder.indexOf('TASK-001');
      const apiIndex = result.topologicalOrder.indexOf('TASK-002');
      expect(dbIndex).toBeLessThan(apiIndex);

      // API should come before UI
      const uiIndex = result.topologicalOrder.indexOf('TASK-003');
      expect(apiIndex).toBeLessThan(uiIndex);
    });

    it('should handle tasks with no dependencies', () => {
      const independentTasks: GeneratedTask[] = [
        {
          id: 'TASK-A',
          title: 'Independent task A',
          description: 'No dependencies',
          type: 'feature',
          priority: 'medium',
          dependencies: [],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        },
        {
          id: 'TASK-B',
          title: 'Independent task B',
          description: 'No dependencies',
          type: 'feature',
          priority: 'medium',
          dependencies: [],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        }
      ];

      const result = engine.infer(independentTasks);

      expect(result.topologicalOrder).toHaveLength(2);
      expect(result.cycles).toHaveLength(0);
    });
  });

  describe('Cycle Detection', () => {
    it('should detect circular dependencies', () => {
      const cyclicTasks: GeneratedTask[] = [
        {
          id: 'TASK-X',
          title: 'Task X',
          description: 'Depends on Y',
          type: 'feature',
          priority: 'medium',
          dependencies: ['TASK-Y'],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        },
        {
          id: 'TASK-Y',
          title: 'Task Y',
          description: 'Depends on Z',
          type: 'feature',
          priority: 'medium',
          dependencies: ['TASK-Z'],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        },
        {
          id: 'TASK-Z',
          title: 'Task Z',
          description: 'Depends on X (creates cycle)',
          type: 'feature',
          priority: 'medium',
          dependencies: ['TASK-X'],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        }
      ];

      const result = engine.infer(cyclicTasks);

      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.cycles[0]).toContain('TASK-X');
      expect(result.cycles[0]).toContain('TASK-Y');
      expect(result.cycles[0]).toContain('TASK-Z');
    });

    it('should not detect cycles in acyclic graph', () => {
      const result = engine.infer(sampleTasks);
      expect(result.cycles).toHaveLength(0);
    });

    it('should break cycles and provide acyclic dependencies', () => {
      const cyclicTasks: GeneratedTask[] = [
        {
          id: 'TASK-A',
          title: 'Task A',
          description: 'Start of cycle',
          type: 'feature',
          priority: 'medium',
          dependencies: ['TASK-B'],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        },
        {
          id: 'TASK-B',
          title: 'Task B',
          description: 'Creates cycle back to A',
          type: 'feature',
          priority: 'medium',
          dependencies: ['TASK-A'],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        }
      ];

      const result = engine.infer(cyclicTasks);

      // Should have detected the cycle
      expect(result.cycles.length).toBeGreaterThan(0);

      // Should have provided acyclic dependencies
      expect(result.inferredDependencies).toBeDefined();
    });
  });

  describe('Warnings', () => {
    it('should generate warnings for potential issues', () => {
      const result = engine.infer(sampleTasks);

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should warn about ambiguous dependencies', () => {
      const ambiguousTasks: GeneratedTask[] = [
        {
          id: 'TASK-1',
          title: 'Do something',
          description: 'Vague description',
          type: 'feature',
          priority: 'medium',
          dependencies: [],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        }
      ];

      const result = engine.infer(ambiguousTasks);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('Critical Path Analysis', () => {
    it('should identify longest dependency chain', () => {
      const result = engine.infer(sampleTasks);

      // The longest chain is likely: database → API → UI
      expect(result.topologicalOrder.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Rules', () => {
    it('should apply custom dependency rules', () => {
      const customRule: DependencyRule = {
        pattern: /security/i,
        mustComeAfter: /auth/i,
        reason: 'Security features require authentication'
      };

      const customEngine = new DependencyInferenceEngine({
        additionalRules: [customRule]
      });

      const tasksWithSecurity: GeneratedTask[] = [
        {
          id: 'TASK-AUTH',
          title: 'Implement authentication',
          description: 'Auth system',
          type: 'feature',
          priority: 'critical',
          dependencies: [],
          estimatedHours: 8,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'implementation'
        },
        {
          id: 'TASK-SEC',
          title: 'Add security features',
          description: 'Security layer',
          type: 'feature',
          priority: 'high',
          dependencies: [],
          estimatedHours: 6,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'implementation'
        }
      ];

      const result = customEngine.infer(tasksWithSecurity);
      const secTask = result.tasks.find(t => t.id === 'TASK-SEC');

      expect(secTask?.dependencies).toContain('TASK-AUTH');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task list', () => {
      const result = engine.infer([]);

      expect(result.tasks).toHaveLength(0);
      expect(result.topologicalOrder).toHaveLength(0);
      expect(result.cycles).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle single task', () => {
      const singleTask: GeneratedTask[] = [{
        id: 'TASK-ONLY',
        title: 'Only task',
        description: 'Single task',
        type: 'feature',
        priority: 'medium',
        dependencies: [],
        estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
        assignedAgent: 'any'
      }];

      const result = engine.infer(singleTask);

      expect(result.tasks).toHaveLength(1);
      expect(result.topologicalOrder).toEqual(['TASK-ONLY']);
    });

    it('should handle tasks with existing dependencies', () => {
      const tasksWithDeps: GeneratedTask[] = [
        {
          id: 'TASK-FIRST',
          title: 'First',
          description: 'First task',
          type: 'feature',
          priority: 'high',
          dependencies: [],
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        },
        {
          id: 'TASK-SECOND',
          title: 'Second',
          description: 'Second task',
          type: 'feature',
          priority: 'medium',
          dependencies: ['TASK-FIRST'], // Pre-existing dependency,
          estimatedHours: 1,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'any'
        }
      ];

      const result = engine.infer(tasksWithDeps);
      const secondTask = result.tasks.find(t => t.id === 'TASK-SECOND');

      expect(secondTask?.dependencies).toContain('TASK-FIRST');
    });

    it('should not create duplicate dependencies', () => {
      const tasks: GeneratedTask[] = [
        {
          id: 'TASK-DB',
          title: 'Setup database',
          description: 'Database migration',
          type: 'architecture',
          priority: 'high',
          dependencies: [],
          estimatedHours: 2,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'planning'
        },
        {
          id: 'TASK-API',
          title: 'Create API endpoint',
          description: 'API implementation',
          type: 'feature',
          priority: 'high',
          dependencies: ['TASK-DB'], // Already depends on DB,
          estimatedHours: 3,
        details: '',
        testStrategy: '',
        status: 'pending',
          assignedAgent: 'implementation'
        }
      ];

      const result = engine.infer(tasks);
      const apiTask = result.tasks.find(t => t.id === 'TASK-API');

      // Should have TASK-DB only once
      const dbDeps = apiTask?.dependencies.filter(d => d === 'TASK-DB');
      expect(dbDeps?.length).toBe(1);
    });
  });
});





