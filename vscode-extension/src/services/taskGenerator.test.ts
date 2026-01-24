/**
 * Tests for Task Generator Service
 * Tests orchestration of task decomposition, dependency inference, and priority assignment
 */

import { TaskGenerator, TaskGeneratorOptions, TaskGenerationResult } from './taskGenerator';
import { TaskDecompositionEngine } from './taskDecomposition';
import { DependencyInferenceEngine } from './dependencyInference';
import { PriorityAssignmentEngine } from './priorityAssignment';
import { PlanJSON } from '../planBuilder/planGenerator';
import * as fs from 'fs';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('./taskDecomposition');
jest.mock('./dependencyInference');
jest.mock('./priorityAssignment');
jest.mock('fs');
jest.mock('vscode');

describe('TaskGenerator', () => {
  let generator: TaskGenerator;
  let mockPlan: PlanJSON;
  let mockDecompositionEngine: jest.Mocked<TaskDecompositionEngine>;
  let mockDependencyEngine: jest.Mocked<DependencyInferenceEngine>;
  let mockPriorityEngine: jest.Mocked<PriorityAssignmentEngine>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock plan
    mockPlan = {
      projectName: 'Test Project',
      version: '1.0.0',
      features: [
        {
          id: 'F001',
          name: 'User Authentication',
          description: 'Implement user auth',
          priority: 'critical',
          estimatedHours: 20,
          category: 'feature',
          dependencies: []
        },
        {
          id: 'F002',
          name: 'Dashboard',
          description: 'Admin dashboard',
          priority: 'high',
          estimatedHours: 16,
          category: 'feature',
          dependencies: ['F001']
        }
      ],
      timeline: {
        phases: [],
        milestones: []
      },
      team: {
        roles: []
      }
    } as any;

    // Mock decomposition engine
    mockDecompositionEngine = {
      decompose: jest.fn().mockReturnValue({
        tasks: [
          {
            id: 'TASK-001',
            name: 'Setup auth',
            description: 'Auth setup',
            type: 'feature',
            priority: 'high',
            dependencies: [],
            subtasks: [],
            estimatedHours: 8,
            assignedAgent: 'implementation'
          }
        ],
        warnings: [],
        stats: { total: 1, byType: {}, byAgent: {} }
      })
    } as any;

    (TaskDecompositionEngine as jest.Mock).mockImplementation(() => mockDecompositionEngine);

    // Mock dependency engine
    mockDependencyEngine = {
      infer: jest.fn().mockReturnValue({
        tasks: [
          {
            id: 'TASK-001',
            name: 'Setup auth',
            description: 'Auth setup',
            type: 'feature',
            priority: 'high',
            dependencies: [],
            subtasks: [],
            estimatedHours: 8,
            assignedAgent: 'implementation'
          }
        ],
        inferredDependencies: new Map(),
        topologicalOrder: ['TASK-001'],
        cycles: [],
        warnings: []
      }),
      getCriticalPath: jest.fn().mockReturnValue(['TASK-001']),
      validateDependencies: jest.fn().mockReturnValue([])
    } as any;

    (DependencyInferenceEngine as jest.Mock).mockImplementation(() => mockDependencyEngine);

    // Mock priority engine
    mockPriorityEngine = {
      assignPriorities: jest.fn().mockReturnValue({
        tasks: [
          {
            id: 'TASK-001',
            name: 'Setup auth',
            description: 'Auth setup',
            type: 'feature',
            priority: 'critical',
            dependencies: [],
            subtasks: [],
            estimatedHours: 8,
            assignedAgent: 'implementation'
          }
        ],
        criticalPath: ['TASK-001'],
        priorityReasons: new Map([['TASK-001', 'On critical path']]),
        warnings: []
      }),
      propagatePriorities: jest.fn().mockImplementation((tasks) => tasks)
    } as any;

    (PriorityAssignmentEngine as jest.Mock).mockImplementation(() => mockPriorityEngine);

    // Mock workspace folders
    (vscode.workspace as any).workspaceFolders = [{
      uri: { fsPath: '/workspace' }
    }];

    // Mock fs
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

    generator = new TaskGenerator();
  });

  describe('Initialization', () => {
    it('should create generator with all engines', () => {
      expect(generator).toBeInstanceOf(TaskGenerator);
      expect(TaskDecompositionEngine).toHaveBeenCalled();
      expect(DependencyInferenceEngine).toHaveBeenCalled();
      expect(PriorityAssignmentEngine).toHaveBeenCalled();
    });
  });

  describe('Task Generation Pipeline', () => {
    it('should execute full generation pipeline', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace',
        validateSchema: true,
        autoCommit: false
      };

      const result = await generator.generate(mockPlan, options);

      expect(mockDecompositionEngine.decompose).toHaveBeenCalledWith(mockPlan);
      expect(mockDependencyEngine.infer).toHaveBeenCalled();
      expect(mockPriorityEngine.assignPriorities).toHaveBeenCalled();
      expect(mockPriorityEngine.propagatePriorities).toHaveBeenCalled();
    });

    it('should call engines in correct order', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const callOrder: string[] = [];

      mockDecompositionEngine.decompose.mockImplementation(() => {
        callOrder.push('decompose');
        return { tasks: [], warnings: [], stats: { total: 0, byType: {}, byAgent: {} } };
      });

      mockDependencyEngine.infer.mockImplementation(() => {
        callOrder.push('infer');
        return { tasks: [], inferredDependencies: new Map(), topologicalOrder: [], cycles: [], warnings: [] };
      });

      mockPriorityEngine.assign Priorities.mockImplementation(() => {
        callOrder.push('assign');
        return { tasks: [], criticalPath: [], priorityReasons: new Map(), warnings: [] };
      });

      await generator.generate(mockPlan, options);

      expect(callOrder).toEqual(['decompose', 'infer', 'assign']);
    });
  });

  describe('Output Generation', () => {
    it('should write tasks to file', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace',
        outputPath: '/test/tasks.json'
      };

      await generator.generate(mockPlan, options);

      expect(fs.promises.writeFile).toHaveBeenCalled();
      const writeCall = (fs.promises.writeFile as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toContain('tasks.json');
    });

    it('should use default output path when not specified', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      await generator.generate(mockPlan, options);

      expect(fs.promises.writeFile).toHaveBeenCalled();
      const writeCall = (fs.promises.writeFile as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toContain('_ZENTASKS');
    });

    it('should create directory if not exists', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace',
        outputPath: '/new/path/tasks.json'
      };

      await generator.generate(mockPlan, options);

      expect(fs.promises.mkdir).toHaveBeenCalled();
    });

    it('should format tasks as JSON', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      await generator.generate(mockPlan, options);

      const writeCall = (fs.promises.writeFile as jest.Mock).mock.calls[0];
      const jsonContent = writeCall[1];

      expect(() => JSON.parse(jsonContent)).not.toThrow();
    });
  });

  describe('Generation Modes', () => {
    it('should support replace mode', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result).toBeDefined();
    });

    it('should support merge mode', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'merge'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result).toBeDefined();
    });

    it('should support append mode', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'append'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result).toBeDefined();
    });
  });

  describe('Warnings and Errors Collection', () => {
    it('should collect warnings from all engines', async () => {
      mockDecompositionEngine.decompose.mockReturnValue({
        tasks: [],
        warnings: ['Decomposition warning'],
        stats: { total: 0, byType: {}, byAgent: {} }
      });

      mockDependencyEngine.infer.mockReturnValue({
        tasks: [],
        inferredDependencies: new Map(),
        topologicalOrder: [],
        cycles: [],
        warnings: ['Dependency warning']
      });

      mockPriorityEngine.assignPriorities.mockReturnValue({
        tasks: [],
        criticalPath: [],
        priorityReasons: new Map(),
        warnings: ['Priority warning']
      });

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('Decomposition warning');
      expect(result.warnings).toContain('Dependency warning');
      expect(result.warnings).toContain('Priority warning');
    });

    it('should collect circular dependency errors', async () => {
      mockDependencyEngine.infer.mockReturnValue({
        tasks: [],
        inferredDependencies: new Map(),
        topologicalOrder: [],
        cycles: [['TASK-A', 'TASK-B', 'TASK-A']],
        warnings: []
      });

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Circular dependency'))).toBe(true);
    });

    it('should collect validation errors', async () => {
      mockDependencyEngine.validateDependencies.mockReturnValue([
        'Invalid dependency: TASK-001 → TASK-999'
      ]);

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result.errors).toBeDefined();
    });
  });

  describe('Summary Generation', () => {
    it('should generate task summary', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result.summary).toBeDefined();
      expect(result.summary.total_tasks).toBeDefined();
      expect(result.summary.by_priority).toBeDefined();
      expect(result.summary.by_type).toBeDefined();
      expect(result.summary.total_estimated_hours).toBeDefined();
    });

    it('should count tasks by priority', async () => {
      mockPriorityEngine.assignPriorities.mockReturnValue({
        tasks: [
          { id: '1', priority: 'critical' } as any,
          { id: '2', priority: 'high' } as any,
          { id: '3', priority: 'critical' } as any
        ],
        criticalPath: [],
        priorityReasons: new Map(),
        warnings: []
      });

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result.summary.by_priority.get('critical')).toBe(2);
      expect(result.summary.by_priority.get('high')).toBe(1);
    });

    it('should count tasks by type', async () => {
      mockPriorityEngine.propagatePriorities.mockReturnValue([
        { id: '1', type: 'feature' } as any,
        { id: '2', type: 'testing' } as any,
        { id: '3', type: 'feature' } as any
      ]);

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result.summary.by_type.get('feature')).toBe(2);
      expect(result.summary.by_type.get('testing')).toBe(1);
    });

    it('should calculate total estimated hours', async () => {
      mockPriorityEngine.propagatePriorities.mockReturnValue([
        { id: '1', estimatedHours: 8 } as any,
        { id: '2', estimatedHours: 12 } as any,
        { id: '3', estimatedHours: 6 } as any
      ]);

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result.summary.total_estimated_hours).toBe(26);
    });
  });

  describe('Error Handling', () => {
    it('should handle decomposition errors gracefully', async () => {
      mockDecompositionEngine.decompose.mockImplementation(() => {
        throw new Error('Decomposition failed');
      });

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      await expect(generator.generate(mockPlan, options)).rejects.toThrow('Decomposition failed');
    });

    it('should handle file write errors', async () => {
      jest.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('Write failed'));

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      await expect(generator.generate(mockPlan, options)).rejects.toThrow();
    });

    it('should handle workspace not configured', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      // Should handle gracefully or throw appropriate error
      await expect(generator.generate(mockPlan, options)).rejects.toBeDefined();
    });
  });

  describe('Return Structure', () => {
    it('should return all expected fields', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('outputPath');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('summary');
    });

    it('should return valid tasks array', async () => {
      const options: TaskGeneratorOptions = {
        mode: 'replace'
      };

      const result = await generator.generate(mockPlan, options);

      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it('should return output path', async () => {
      const customPath = '/custom/path/tasks.json';
      const options: TaskGeneratorOptions = {
        mode: 'replace',
        outputPath: customPath
      };

      const result = await generator.generate(mockPlan, options);

      expect(result.outputPath).toBe(customPath);
    });
  });
});
