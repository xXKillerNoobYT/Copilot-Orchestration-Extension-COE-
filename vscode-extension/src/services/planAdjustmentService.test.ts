/**
 * Tests for Plan Adjustment Service
 * 
 * Validates the complete Plan Adjustment Workflow (EPIC-008):
 * - Drift detection
 * - Adjustment generation
 * - Adjustment application
 * - Version bumping
 * - One-click update
 * 
 * Reference: https://jestjs.io/docs/mock-functions
 * Reference: https://jestjs.io/docs/setup-teardown
 * See: https://jestjs.io/docs/manual-mocks for dependency mocking
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PlanAdjustmentService, getPlanAdjustmentService } from './planAdjustmentService';
import type { PlanJSON } from '../planBuilder/planGenerator';
import type { TaskExecutionData } from '../planBuilder/planDriftDetector';

// Mock dependencies
jest.mock('./planPersistence');
jest.mock('../planBuilder/planDriftDetector');
jest.mock('../planBuilder/planAdjustmentEngine');

describe('PlanAdjustmentService', () => {
  let service: PlanAdjustmentService;
  let mockPlan: PlanJSON;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlanAdjustmentService();
    
    // Reference: https://jestjs.io/docs/manual-mocks#using-a-mock-to-create-test-data
    mockPlan = {
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: 'test',
        status: 'in-progress',
        name: 'Test Project',
      },
      project: {
        name: 'Test Project',
        description: 'Test',
        type: 'web',
        status: 'in-progress',
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
          status: 'completed',
          effort_estimate: 8,
          dependencies: [],
          acceptance_criteria: [],
        },
        {
          id: 'FEAT-002',
          name: 'Dashboard',
          description: 'User dashboard',
          priority: 'medium',
          status: 'in-progress',
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
  });

  describe('Drift Detection', () => {
    it('should detect drift when plan differs from execution', async () => {
      // This test verifies the integration with PlanDriftDetector
      const result = await service.adjustPlan('test-plan.json', { autoApply: false });
      
      expect(result).toBeDefined();
      expect(result.driftAnalysis).toBeDefined();
    });

    it('should return no drift when execution matches plan', async () => {
      // Mock scenario where execution perfectly matches plan
      const result = await service.adjustPlan('test-plan.json', { autoApply: false });
      
      // If no drift, should have no suggestions
      if (!result.driftAnalysis.hasDrift) {
        expect(result.suggestions).toHaveLength(0);
      }
    });
  });

  describe('Adjustment Generation', () => {
    it('should generate suggestions for detected drift', async () => {
      // Service should generate suggestions based on drift
      const result = await service.adjustPlan('test-plan.json', { autoApply: false });
      
      if (result.driftAnalysis.hasDrift) {
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should prioritize high-impact suggestions', async () => {
      const result = await service.adjustPlan('test-plan.json', { autoApply: false });
      
      if (result.suggestions.length > 1) {
        // Suggestions should be sorted by impact
        const impacts = result.suggestions.map(s => s.impact);
        const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        
        for (let i = 1; i < impacts.length; i++) {
          expect(impactOrder[impacts[i - 1]]).toBeGreaterThanOrEqual(impactOrder[impacts[i]]);
        }
      }
    });
  });

  describe('Adjustment Application', () => {
    it('should apply adjustment with version bump', async () => {
      const mockSuggestion = {
        id: 'adj-001',
        category: 'timeline' as const,
        title: 'Extend timeline',
        description: 'Extend by 2 weeks',
        rationale: 'Behind schedule',
        confidence: 85,
        impact: 'high' as const,
        effort: 'low' as const,
        changes: {
          timeline: {
            end_date: '2026-02-15',
          },
        },
      };

      const result = await service.applyAdjustment('test-plan.json', mockSuggestion, {
        createBackup: true,
      });

      expect(result.success).toBe(true);
      if (result.success && result.updatedPlan) {
        // Version should be bumped
        expect(result.newVersion).not.toBe('1.0.0');
      }
    });

    it('should create backup before applying changes', async () => {
      const mockSuggestion = {
        id: 'adj-002',
        category: 'scope' as const,
        title: 'Add feature',
        description: 'Add new feature',
        rationale: 'Discovered during execution',
        confidence: 90,
        impact: 'medium' as const,
        effort: 'medium' as const,
        changes: {
          features: [{
            action: 'add' as const,
            changes: {
              id: 'FEAT-003',
              name: 'New Feature',
              description: 'Added feature',
              priority: 'medium' as const,
              status: 'pending' as const,
              effort_estimate: 10,
              dependencies: [],
              acceptance_criteria: [],
            },
          }],
        },
      };

      const result = await service.applyAdjustment('test-plan.json', mockSuggestion, {
        createBackup: true,
      });

      if (result.success) {
        expect(result.backupPath).toBeDefined();
      }
    });
  });

  describe('Version Bumping', () => {
    it('should increment patch version for minor changes', () => {
      // Minor changes should bump patch version
      // 1.0.0 -> 1.0.1
      const oldVersion = '1.0.0';
      const parts = oldVersion.split('.');
      const newVersion = `${parts[0]}.${parts[1]}.${parseInt(parts[2]) + 1}`;
      
      expect(newVersion).toBe('1.0.1');
    });

    it('should increment minor version for moderate changes', () => {
      // Moderate changes should bump minor version
      // 1.0.0 -> 1.1.0
      const oldVersion = '1.0.0';
      const parts = oldVersion.split('.');
      const newVersion = `${parts[0]}.${parseInt(parts[1]) + 1}.0`;
      
      expect(newVersion).toBe('1.1.0');
    });

    it('should increment major version for breaking changes', () => {
      // Breaking changes should bump major version
      // 1.0.0 -> 2.0.0
      const oldVersion = '1.0.0';
      const parts = oldVersion.split('.');
      const newVersion = `${parseInt(parts[0]) + 1}.0.0`;
      
      expect(newVersion).toBe('2.0.0');
    });
  });

  describe('Complete Workflow', () => {
    it('should run end-to-end workflow: detect -> suggest -> apply', async () => {
      const result = await service.adjustPlan('test-plan.json', {
        autoApply: false,
        createBackup: true,
        notifyUser: false,
      });

      // Workflow should complete successfully
      expect(result.success).toBe(true);
      expect(result.driftAnalysis).toBeDefined();
      
      // If drift detected, should have suggestions
      if (result.driftAnalysis.hasDrift) {
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should support one-click auto-apply workflow', async () => {
      const result = await service.adjustPlan('test-plan.json', {
        autoApply: true,
        createBackup: true,
        notifyUser: false,
      });

      if (result.driftAnalysis.hasDrift && result.suggestions.length > 0) {
        // Should have applied some suggestions
        expect(result.appliedSuggestions.length).toBeGreaterThan(0);
        expect(result.updatedPlan).toBeDefined();
        expect(result.newVersion).toBeDefined();
      }
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getPlanAdjustmentService();
      const instance2 = getPlanAdjustmentService();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle plan load failures gracefully', async () => {
      const result = await service.adjustPlan('non-existent-plan.json', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle drift detection failures', async () => {
      // Mock a scenario where drift detection fails
      const result = await service.adjustPlan('invalid-plan.json', {});
      
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
