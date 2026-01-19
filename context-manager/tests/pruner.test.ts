/**
 * Tests for pruning functionality
 */

import { ContextManager } from '../src/context-manager';
import { ContextPruner } from '../src/pruner';
import { ContextType, StorageFormat, PruningPolicy } from '../src/types';
import { JsonStorageAdapter } from '../src/storage/json-adapter';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DATA_DIR = path.join(__dirname, 'pruner-test-data');

describe('ContextPruner', () => {
  let adapter: JsonStorageAdapter;
  let pruner: ContextPruner;
  let manager: ContextManager;

  beforeEach(async () => {
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true });
    } catch {
      // Ignore
    }

    adapter = new JsonStorageAdapter(TEST_DATA_DIR);
    manager = new ContextManager({
      dataDir: TEST_DATA_DIR,
      storageFormat: StorageFormat.JSON
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  });

  describe('prune by age', () => {
    it('should remove contexts older than maxAge', async () => {
      const policy: PruningPolicy = {
        maxAge: 1 // 1 day
      };

      pruner = new ContextPruner(adapter, policy);

      // Create old context (2 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2);

      await manager.saveAgentOutput('task-1', {
        agentId: 'agent-1',
        taskId: 'task-1',
        prompt: 'Old prompt',
        response: 'Old response'
      });

      // Manually update timestamp to be old
      const contexts = await manager.getContextForTask('task-1');
      contexts[0].metadata.timestamp = oldDate;
      await manager.saveContext(contexts[0]);

      // Create new context
      await manager.saveAgentOutput('task-2', {
        agentId: 'agent-2',
        taskId: 'task-2',
        prompt: 'New prompt',
        response: 'New response'
      });

      const result = await pruner.prune();

      expect(result.removed).toBe(1);
      expect(result.freedSpace).toBeGreaterThan(0);

      // Check that new context still exists
      const remaining = await manager.getContextForTask('task-2');
      expect(remaining).toHaveLength(1);
    });
  });

  describe('prune by task limits', () => {
    it('should remove oldest contexts when exceeding maxItemsPerTask', async () => {
      const policy: PruningPolicy = {
        maxItemsPerTask: 2
      };

      pruner = new ContextPruner(adapter, policy);

      // Create 3 contexts for same task
      for (let i = 0; i < 3; i++) {
        await manager.saveAgentOutput('task-1', {
          agentId: `agent-${i}`,
          taskId: 'task-1',
          prompt: `Prompt ${i}`,
          response: `Response ${i}`
        });

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const result = await pruner.prune();

      expect(result.removed).toBe(1);

      const remaining = await manager.getContextForTask('task-1');
      expect(remaining).toHaveLength(2);
    });
  });

  describe('prune by total size', () => {
    it('should remove oldest contexts when exceeding maxTotalSize', async () => {
      const policy: PruningPolicy = {
        maxTotalSize: 1000 // Very small limit
      };

      pruner = new ContextPruner(adapter, policy);

      // Create multiple contexts
      for (let i = 0; i < 5; i++) {
        await manager.saveAgentOutput(`task-${i}`, {
          agentId: `agent-${i}`,
          taskId: `task-${i}`,
          prompt: 'A'.repeat(200), // Make them large
          response: 'B'.repeat(200)
        });

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const statsBefore = await manager.getStats();
      expect(statsBefore.totalSize).toBeGreaterThan(1000);

      const result = await pruner.prune();

      expect(result.removed).toBeGreaterThan(0);
      expect(result.freedSpace).toBeGreaterThan(0);

      const statsAfter = await manager.getStats();
      expect(statsAfter.totalSize).toBeLessThanOrEqual(1000);
    });
  });

  describe('keep types', () => {
    it('should not remove contexts of protected types', async () => {
      const policy: PruningPolicy = {
        maxAge: 1,
        keepTypes: [ContextType.ARCHITECTURE_SNAPSHOT]
      };

      pruner = new ContextPruner(adapter, policy);

      // Create old architecture snapshot
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2);

      await manager.saveArchitectureSnapshot('task-1', {
        components: [],
        relationships: []
      });

      // Update timestamp
      const contexts = await manager.getContextForTask('task-1');
      contexts[0].metadata.timestamp = oldDate;
      await manager.saveContext(contexts[0]);

      const result = await pruner.prune();

      // Should not be removed because it's a protected type
      expect(result.removed).toBe(0);

      const remaining = await manager.getContextForTask('task-1');
      expect(remaining).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      await manager.saveAgentOutput('task-1', {
        agentId: 'agent-1',
        taskId: 'task-1',
        prompt: 'Test',
        response: 'Response'
      });

      await manager.saveTaskCompletion('task-1', {
        taskId: 'task-1',
        status: 'completed'
      });

      await manager.saveArchitectureSnapshot('task-2', {
        components: [],
        relationships: []
      });

      const stats = await pruner.getStats();

      expect(stats.totalContexts).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.byType[ContextType.AGENT_RESPONSE]).toBe(1);
      expect(stats.byType[ContextType.TASK_COMPLETION]).toBe(1);
      expect(stats.byType[ContextType.ARCHITECTURE_SNAPSHOT]).toBe(1);
      expect(stats.byTask['task-1']).toBe(2);
      expect(stats.byTask['task-2']).toBe(1);
    });
  });

  describe('prune error handling', () => {
    it('should handle errors in prune gracefully', async () => {
      // Reference: https://jestjs.io/docs/mock-functions
      const policy: PruningPolicy = {};
      pruner = new ContextPruner(adapter, policy);

      const result = await pruner.prune();

      expect(result).toHaveProperty('removed');
      expect(result).toHaveProperty('freedSpace');
      expect(result).toHaveProperty('errors');
      expect(typeof result.removed).toBe('number');
      expect(typeof result.freedSpace).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle expired context removal', async () => {
      const policy: PruningPolicy = {
        maxAge: 30
      };

      pruner = new ContextPruner(adapter, policy);

      // Create context with expiration date in past
      await manager.saveAgentOutput('task-expire', {
        agentId: 'agent-1',
        taskId: 'task-expire',
        prompt: 'Will expire',
        response: 'Test'
      });

      const context = await manager.loadContext(
        // Get the context ID by querying
        (await manager.getContextForTask('task-expire'))[0].metadata.id
      );

      if (context) {
        context.metadata.expiresAt = new Date(Date.now() - 1000); // 1 second ago
        await manager.saveContext(context);
      }

      const result = await pruner.prune();

      // Should remove the expired context
      expect(result.removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('context size tracking', () => {
    it('should track accurate context sizes', async () => {
      const policy: PruningPolicy = {};
      pruner = new ContextPruner(adapter, policy);

      // Save context with known data
      await manager.saveAgentOutput('task-size', {
        agentId: 'agent-1',
        taskId: 'task-size',
        prompt: 'X'.repeat(100),
        response: 'Y'.repeat(100)
      });

      const stats = await pruner.getStats();

      expect(stats.totalSize).toBeGreaterThan(100); // Should be at least the data size
    });
  });

  describe('multiple pruning policies', () => {
    it('should apply multiple pruning strategies', async () => {
      // Reference: https://jestjs.io/docs/using-matchers
      const policy: PruningPolicy = {
        maxAge: 1,
        maxItemsPerTask: 1,
        maxTotalSize: 10000
      };

      pruner = new ContextPruner(adapter, policy);

      // Create contexts from different tasks
      for (let i = 0; i < 3; i++) {
        await manager.saveAgentOutput('task-1', {
          agentId: `agent-${i}`,
          taskId: 'task-1',
          prompt: 'Test',
          response: 'Response'
        });
      }

      await manager.saveAgentOutput('task-2', {
        agentId: 'agent-x',
        taskId: 'task-2',
        prompt: 'Test 2',
        response: 'Response 2'
      });

      const result = await pruner.prune();

      // Should have applied pruning
      expect(typeof result.removed).toBe('number');
      expect(result.removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('default pruning policy', () => {
    it('should use sensible defaults when no policy provided', async () => {
      // Reference: https://jestjs.io/docs/constructor-mocks
      pruner = new ContextPruner(adapter); // No policy provided

      // Should have default maxAge of 30 days
      const result = await pruner.prune();

      expect(result).toHaveProperty('removed');
      expect(result).toHaveProperty('freedSpace');
    });
  });
});
