/**
 * Tests for Plan Drift Detection
 */

import { describe, it, expect } from '@jest/globals';
import { PlanDriftDetector, createDriftDetector, hasPlanDrift, type TaskExecutionData } from './planDriftDetector';
import type { PlanJSON } from './planGenerator';

describe('PlanDriftDetector', () => {
  const mockPlan: PlanJSON = {
    metadata: {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: 'test',
      status: 'draft',
      name: 'Test Project',
    },
    project: {
      name: 'Test Project',
      description: 'Test',
      type: 'web',
      status: 'planning',
    },
    architecture: {
      pattern: 'MVC',
      description: 'MVC',
      components: [],
      rationale: 'Standard',
    },
    features: [
      {
        id: 'FEAT-001',
        name: 'Authentication',
        description: 'User auth',
        priority: 'high',
        status: 'pending',
        effort_estimate: 8,
        dependencies: [],
        acceptance_criteria: [],
      },
      {
        id: 'FEAT-002',
        name: 'Dashboard',
        description: 'User dashboard',
        priority: 'medium',
        status: 'pending',
        effort_estimate: 12,
        dependencies: [],
        acceptance_criteria: [],
      },
    ],
    timeline: {
      start_date: '2026-01-01',
      end_date: '2026-02-01',
      milestones: [],
      phases: [],
    },
    team: {
      members: [],
      structure: 'Agile',
      communication_plan: 'Daily',
    },
    success_criteria: [],
    risks: [],
    assumptions: [],
    constraints: [],
  };

  describe('Scope Drift Detection', () => {
    it('should detect no drift when execution matches plan', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 8,
        },
        {
          taskId: 'TASK-002',
          featureId: 'FEAT-002',
          status: 'in_progress',
          estimatedHours: 12,
          actualHours: 6,
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.metrics.scopeDrift.featuresAdded).toHaveLength(0);
      expect(result.metrics.scopeDrift.featuresRemoved).toHaveLength(0);
      expect(result.metrics.scopeDrift.driftPercentage).toBeLessThan(15);
    });

    it('should detect added features', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 8,
        },
        {
          taskId: 'TASK-003',
          featureId: 'FEAT-003',
          status: 'in_progress',
          estimatedHours: 10,
          actualHours: 5,
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.metrics.scopeDrift.featuresAdded).toContain('FEAT-003');
      expect(result.metrics.scopeDrift.driftPercentage).toBeGreaterThan(0);
    });

    it('should detect removed features', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 8,
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.metrics.scopeDrift.featuresRemoved).toContain('FEAT-002');
    });
  });

  describe('Effort Drift Detection', () => {
    it('should calculate effort variance', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 12, // 50% over
        },
        {
          taskId: 'TASK-002',
          featureId: 'FEAT-002',
          status: 'completed',
          estimatedHours: 12,
          actualHours: 14,
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.metrics.effortDrift.totalPlannedHours).toBe(20);
      expect(result.metrics.effortDrift.totalActualHours).toBe(26);
      expect(result.metrics.effortDrift.variancePercentage).toBeGreaterThan(0);
    });

    it('should identify underestimated features', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 16, // 100% over
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.metrics.effortDrift.underestimatedFeatures).toContain('FEAT-001');
    });
  });

  describe('Timeline Drift Detection', () => {
    it('should calculate days behind schedule', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 8,
          startedAt: new Date('2026-01-01'),
          completedAt: new Date('2026-01-02'),
        },
        {
          taskId: 'TASK-002',
          featureId: 'FEAT-002',
          status: 'in_progress',
          estimatedHours: 12,
          actualHours: 6,
          startedAt: new Date('2026-01-03'),
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.metrics.timelineDrift.plannedStartDate).toBeDefined();
      expect(result.metrics.timelineDrift.actualStartDate).toBeDefined();
    });
  });

  describe('Dependency Drift Detection', () => {
    it('should detect blocked tasks', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'blocked',
          estimatedHours: 8,
          blockedBy: ['TASK-003'],
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.metrics.dependencyDrift.newBlockers).toContain('TASK-001');
    });
  });

  describe('Overall Drift Assessment', () => {
    it('should calculate overall drift score', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 8,
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.metrics.overallDriftScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.overallDriftScore).toBeLessThanOrEqual(100);
      expect(result.metrics.driftSeverity).toBeDefined();
    });

    it('should mark high drift when significant variance exists', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 20,
        },
        {
          taskId: 'TASK-003',
          featureId: 'FEAT-003',
          status: 'in_progress',
          estimatedHours: 10,
        },
        {
          taskId: 'TASK-004',
          featureId: 'FEAT-004',
          status: 'blocked',
          estimatedHours: 5,
          blockedBy: ['TASK-005'],
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.hasDrift).toBe(true);
      expect(result.metrics.driftSeverity).toMatch(/medium|high|critical/);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations for drift', async () => {
      const executionData: TaskExecutionData[] = [
        {
          taskId: 'TASK-001',
          featureId: 'FEAT-001',
          status: 'completed',
          estimatedHours: 8,
          actualHours: 16,
        },
      ];

      const detector = new PlanDriftDetector(mockPlan);
      const result = await detector.detectDrift(executionData);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.suggestedActions).toBeInstanceOf(Array);
    });
  });

  describe('Factory Functions', () => {
    it('should create detector with factory function', () => {
      const detector = createDriftDetector(mockPlan);
      expect(detector).toBeInstanceOf(PlanDriftDetector);
    });

    it('should provide quick drift check', async () => {
      const executionData: TaskExecutionData[] = [];
      const result = await hasPlanDrift(mockPlan, executionData);
      expect(typeof result).toBe('boolean');
    });
  });
});
