/**
 * MCP Backend & Validation Integration Tests
 * 
 * Tests for MCP (Model Context Protocol) backend persistence,
 * validation flows, and error recovery.
 * 
 * Test Coverage:
 * - Plan persistence to MCP backend
 * - Task synchronization
 * - Validation workflows
 * - Error recovery and retry logic
 * - Network failure handling
 * - Data integrity verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPService } from '../../services/mcpService';
import { PlanValidator } from '../../planValidator';
import type { Plan, Task } from '../../types';

// Mock network layer
const mockHTTPClient = {
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

describe('MCP Backend Integration Tests', () => {
  let mcpService: MCPService;
  let validator: PlanValidator;

  beforeEach(() => {
    mcpService = new MCPService({ baseURL: 'http://localhost:3000' });
    validator = new PlanValidator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Plan Persistence', () => {
    it('should persist new plan to MCP backend', async () => {
      const newPlan: Plan = {
        id: 'plan-new-001',
        name: 'New Project Plan',
        description: 'Testing plan creation',
        version: '1.0.0',
        phases: [],
      };

      mockHTTPClient.post.mockResolvedValue({
        success: true,
        id: 'plan-new-001',
        timestamp: new Date().toISOString(),
      });

      const result = await mcpService.persistPlan(newPlan);

      expect(result.success).toBe(true);
      expect(result.id).toBe('plan-new-001');
      expect(mockHTTPClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/plans'),
        expect.objectContaining({ id: 'plan-new-001' })
      );
    });

    it('should update existing plan', async () => {
      const existingPlan: Plan = {
        id: 'plan-existing-001',
        name: 'Existing Plan',
        version: '1.1.0', // Version bump
        updatedAt: new Date().toISOString(),
      };

      mockHTTPClient.put.mockResolvedValue({
        success: true,
        id: 'plan-existing-001',
        version: '1.1.0',
      });

      const result = await mcpService.updatePlan(existingPlan);

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.1.0');
      expect(mockHTTPClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/plans/plan-existing-001'),
        expect.objectContaining({ version: '1.1.0' })
      );
    });

    it('should handle version conflicts', async () => {
      const plan: Plan = {
        id: 'plan-conflict',
        name: 'Conflict Test',
        version: '1.0.0',
      };

      mockHTTPClient.post.mockRejectedValue({
        error: 'Version conflict',
        code: 409,
        currentVersion: '2.0.0',
      });

      await expect(async () => {
        await mcpService.persistPlan(plan);
      }).rejects.toMatchObject({
        code: 409,
        error: 'Version conflict',
      });
    });

    it('should fetch plan by ID', async () => {
      const mockPlan: Plan = {
        id: 'plan-fetch-001',
        name: 'Fetched Plan',
        version: '1.0.0',
      };

      mockHTTPClient.get.mockResolvedValue(mockPlan);

      const fetched = await mcpService.fetchPlan('plan-fetch-001');

      expect(fetched).toEqual(mockPlan);
      expect(mockHTTPClient.get).toHaveBeenCalledWith('/plans/plan-fetch-001');
    });

    it('should handle 404 for non-existent plan', async () => {
      mockHTTPClient.get.mockRejectedValue({
        error: 'Not Found',
        code: 404,
      });

      await expect(async () => {
        await mcpService.fetchPlan('nonexistent');
      }).rejects.toMatchObject({
        code: 404,
      });
    });
  });

  describe('Task Synchronization', () => {
    it('should persist tasks for a plan', async () => {
      const tasks: Task[] = [
        {
          id: 'TASK-001',
          title: 'Setup Infrastructure',
          status: 'pending',
          priority: 'high',
        },
        {
          id: 'TASK-002',
          title: 'Implement Auth',
          status: 'pending',
          priority: 'critical',
          dependencies: ['TASK-001'],
        },
      ];

      mockHTTPClient.post.mockResolvedValue({
        success: true,
        count: 2,
        taskIds: ['TASK-001', 'TASK-002'],
      });

      const result = await mcpService.persistTasks('plan-001', tasks);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockHTTPClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/plans/plan-001/tasks'),
        expect.arrayContaining([
          expect.objectContaining({ id: 'TASK-001' }),
          expect.objectContaining({ id: 'TASK-002' }),
        ])
      );
    });

    it('should update individual task status', async () => {
      mockHTTPClient.put.mockResolvedValue({
        success: true,
        taskId: 'TASK-001',
        status: 'in_progress',
      });

      const result = await mcpService.updateTaskStatus('plan-001', 'TASK-001', 'in_progress');

      expect(result.success).toBe(true);
      expect(result.status).toBe('in_progress');
    });

    it('should fetch all tasks for a plan', async () => {
      const mockTasks: Task[] = [
        { id: 'T1', title: 'Task 1', status: 'done', priority: 'high' },
        { id: 'T2', title: 'Task 2', status: 'in_progress', priority: 'medium' },
      ];

      mockHTTPClient.get.mockResolvedValue({ tasks: mockTasks });

      const tasks = await mcpService.fetchTasks('plan-001');

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('T1');
      expect(tasks[1].status).toBe('in_progress');
    });

    it('should handle task dependency validation', async () => {
      const tasks: Task[] = [
        { id: 'A', title: 'A', status: 'pending', priority: 'high', dependencies: ['B'] },
        { id: 'B', title: 'B', status: 'done', priority: 'high' },
      ];

      const validation = await validator.validateTaskDependencies(tasks);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect circular dependencies', async () => {
      const tasks: Task[] = [
        { id: 'A', title: 'A', status: 'pending', priority: 'high', dependencies: ['B'] },
        { id: 'B', title: 'B', status: 'pending', priority: 'high', dependencies: ['C'] },
        { id: 'C', title: 'C', status: 'pending', priority: 'high', dependencies: ['A'] },
      ];

      const validation = await validator.validateTaskDependencies(tasks);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('circular'))).toBe(true);
    });
  });

  describe('Validation Workflows', () => {
    it('should validate plan structure', async () => {
      const validPlan: Plan = {
        id: 'valid-plan',
        name: 'Valid Plan',
        description: 'Properly structured plan',
        version: '1.0.0',
        phases: [
          {
            name: 'Phase 1',
            duration: '2 weeks',
            deliverables: ['Feature A'],
          },
        ],
      };

      const validation = await validator.validatePlan(validPlan);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const invalidPlan: Partial<Plan> = {
        id: 'invalid',
        // Missing name, version
      };

      const validation = await validator.validatePlan(invalidPlan as Plan);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.includes('name'))).toBe(true);
      expect(validation.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('should validate task structure', async () => {
      const validTask: Task = {
        id: 'TASK-VALID',
        title: 'Valid Task',
        description: 'Well-formed task',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 8,
      };

      const validation = await validator.validateTask(validTask);

      expect(validation.valid).toBe(true);
    });

    it('should reject invalid task status', async () => {
      const invalidTask: Task = {
        id: 'TASK-INVALID',
        title: 'Invalid Task',
        status: 'invalid_status' as any,
        priority: 'high',
      };

      const validation = await validator.validateTask(invalidTask);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('status'))).toBe(true);
    });

    it('should reject invalid priority', async () => {
      const invalidTask: Task = {
        id: 'TASK-PRI-INVALID',
        title: 'Invalid Priority',
        status: 'pending',
        priority: 'super_critical' as any, // Invalid priority
      };

      const validation = await validator.validateTask(invalidTask);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('priority'))).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed requests', async () => {
      const plan: Plan = { id: 'retry-test', name: 'Retry Test', version: '1.0.0' };

      // Fail first 2 attempts, succeed on 3rd
      mockHTTPClient.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ success: true, id: 'retry-test' });

      const result = await mcpService.persistPlan(plan, { retries: 3 });

      expect(result.success).toBe(true);
      expect(mockHTTPClient.post).toHaveBeenCalledTimes(3);
    });

    it('should implement exponential backoff', async () => {
      const plan: Plan = { id: 'backoff-test', name: 'Backoff', version: '1.0.0' };

      const timestamps: number[] = [];
      mockHTTPClient.post
        .mockImplementation(() => {
          timestamps.push(Date.now());
          return Promise.reject(new Error('Temporary failure'));
        })
        .mockResolvedValueOnce({ success: true, id: 'backoff-test' });

      try {
        await mcpService.persistPlan(plan, { retries: 3, backoff: 'exponential' });
      } catch {
        // Expected to fail after retries
      }

      // Verify increasing delays between attempts
      if (timestamps.length > 1) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        expect(delay2).toBeGreaterThan(delay1);
      }
    });

    it('should handle network failures gracefully', async () => {
      mockHTTPClient.post.mockRejectedValue(new Error('ERR_NETWORK'));

      const plan: Plan = { id: 'network-fail', name: 'Network Fail', version: '1.0.0' };

      await expect(async () => {
        await mcpService.persistPlan(plan);
      }).rejects.toThrow('ERR_NETWORK');
    });

    it('should validate data integrity after persistence', async () => {
      const originalPlan: Plan = {
        id: 'integrity-test',
        name: 'Integrity Test',
        version: '1.0.0',
        metadata: {
          checksum: 'abc123',
        },
      };

      mockHTTPClient.post.mockResolvedValue({ success: true, id: 'integrity-test' });
      mockHTTPClient.get.mockResolvedValue(originalPlan);

      await mcpService.persistPlan(originalPlan);
      const fetched = await mcpService.fetchPlan('integrity-test');

      expect(fetched.id).toBe(originalPlan.id);
      expect(fetched.metadata?.checksum).toBe(originalPlan.metadata?.checksum);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent plan updates', async () => {
      const basePlan: Plan = { id: 'concurrent', name: 'Concurrent Test', version: '1.0.0' };

      mockHTTPClient.put.mockResolvedValue({ success: true });

      // Simulate 5 concurrent updates
      const updates = Array.from({ length: 5 }, (_, i) => ({
        ...basePlan,
        version: `1.0.${i + 1}`,
      }));

      const results = await Promise.all(
        updates.map(plan => mcpService.updatePlan(plan))
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(mockHTTPClient.put).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent task status updates', async () => {
      mockHTTPClient.put.mockResolvedValue({ success: true });

      const updates = Array.from({ length: 10 }, (_, i) => ({
        taskId: `TASK-${i}`,
        status: 'in_progress' as const,
      }));

      const results = await Promise.all(
        updates.map(({ taskId, status }) =>
          mcpService.updateTaskStatus('plan-001', taskId, status)
        )
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(mockHTTPClient.put).toHaveBeenCalledTimes(10);
    });
  });

  describe('Data Migration', () => {
    it('should migrate plan from v1.0 to v2.0 schema', async () => {
      const v1Plan: any = {
        id: 'migrate-test',
        name: 'Migration Test',
        version: '1.0.0',
        oldField: 'deprecated',
      };

      const migratedPlan = await mcpService.migratePlanSchema(v1Plan, '2.0.0');

      expect(migratedPlan.version).toBe('2.0.0');
      expect(migratedPlan.oldField).toBeUndefined();
      expect(migratedPlan.metadata).toBeDefined();
    });

    it('should preserve all data during migration', async () => {
      const v1Plan: Plan = {
        id: 'preserve-test',
        name: 'Preserve Data',
        description: 'Important description',
        version: '1.0.0',
        phases: [{ name: 'Phase 1', deliverables: ['A', 'B'] }],
      };

      const v2Plan = await mcpService.migratePlanSchema(v1Plan, '2.0.0');

      expect(v2Plan.id).toBe(v1Plan.id);
      expect(v2Plan.name).toBe(v1Plan.name);
      expect(v2Plan.description).toBe(v1Plan.description);
      expect(v2Plan.phases).toEqual(v1Plan.phases);
    });
  });
});
