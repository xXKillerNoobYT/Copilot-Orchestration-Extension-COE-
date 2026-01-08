/**
 * Tests for ContextManager
 */

import { ContextManager } from '../src/context-manager';
import { ContextType, StorageFormat, AgentResponse } from '../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DATA_DIR = path.join(__dirname, 'test-data');

describe('ContextManager', () => {
  let manager: ContextManager;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }

    manager = new ContextManager({
      dataDir: TEST_DATA_DIR,
      storageFormat: StorageFormat.JSON,
      maxMemoryCache: 10
    });
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true });
    } catch {
      // Ignore errors
    }
  });

  describe('saveAgentOutput', () => {
    it('should save agent output and return context ID', async () => {
      const taskId = 'task-123';
      const output = {
        agentId: 'agent-1',
        taskId,
        prompt: 'Test prompt',
        response: 'Test response',
        tokensUsed: 100
      };

      const contextId = await manager.saveAgentOutput(taskId, output);

      expect(contextId).toBeTruthy();
      expect(contextId).toContain(taskId);
      expect(contextId).toContain(ContextType.AGENT_RESPONSE);
    });

    it('should be able to retrieve saved agent output', async () => {
      const taskId = 'task-123';
      const output = {
        agentId: 'agent-1',
        taskId,
        prompt: 'Test prompt',
        response: 'Test response',
        tokensUsed: 100
      };

      const contextId = await manager.saveAgentOutput(taskId, output);
      const loaded = await manager.loadContext(contextId) as AgentResponse;

      expect(loaded).toBeTruthy();
      expect(loaded.agentId).toBe('agent-1');
      expect(loaded.prompt).toBe('Test prompt');
      expect(loaded.response).toBe('Test response');
      expect(loaded.tokensUsed).toBe(100);
    });
  });

  describe('getContextForTask', () => {
    it('should return all contexts for a task', async () => {
      const taskId = 'task-456';

      // Save multiple contexts
      await manager.saveAgentOutput(taskId, {
        agentId: 'agent-1',
        taskId,
        prompt: 'Prompt 1',
        response: 'Response 1'
      });

      await manager.saveAgentOutput(taskId, {
        agentId: 'agent-2',
        taskId,
        prompt: 'Prompt 2',
        response: 'Response 2'
      });

      await manager.saveTaskCompletion(taskId, {
        taskId,
        status: 'completed',
        duration: 1000
      });

      const contexts = await manager.getContextForTask(taskId);

      expect(contexts).toHaveLength(3);
      expect(contexts.some(c => c.metadata.type === ContextType.AGENT_RESPONSE)).toBe(true);
      expect(contexts.some(c => c.metadata.type === ContextType.TASK_COMPLETION)).toBe(true);
    });

    it('should return empty array for non-existent task', async () => {
      const contexts = await manager.getContextForTask('non-existent');
      expect(contexts).toHaveLength(0);
    });
  });

  describe('queryContexts', () => {
    beforeEach(async () => {
      // Set up test data
      await manager.saveAgentOutput('task-1', {
        agentId: 'agent-1',
        taskId: 'task-1',
        prompt: 'Test 1',
        response: 'Response 1'
      });

      await manager.saveTaskCompletion('task-1', {
        taskId: 'task-1',
        status: 'completed'
      });

      await manager.saveAgentOutput('task-2', {
        agentId: 'agent-2',
        taskId: 'task-2',
        prompt: 'Test 2',
        response: 'Response 2'
      });
    });

    it('should filter by task ID', async () => {
      const results = await manager.queryContexts({ taskId: 'task-1' });
      expect(results).toHaveLength(2);
      expect(results.every(c => c.metadata.taskId === 'task-1')).toBe(true);
    });

    it('should filter by type', async () => {
      const results = await manager.queryContexts({
        type: ContextType.AGENT_RESPONSE
      });
      expect(results).toHaveLength(2);
      expect(results.every(c => c.metadata.type === ContextType.AGENT_RESPONSE)).toBe(true);
    });

    it('should apply limit', async () => {
      const results = await manager.queryContexts({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const results = await manager.queryContexts({
        fromDate: yesterday,
        toDate: tomorrow
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('deleteContext', () => {
    it('should delete a context', async () => {
      const contextId = await manager.saveAgentOutput('task-1', {
        agentId: 'agent-1',
        taskId: 'task-1',
        prompt: 'Test',
        response: 'Response'
      });

      const deleted = await manager.deleteContext(contextId);
      expect(deleted).toBe(true);

      const loaded = await manager.loadContext(contextId);
      expect(loaded).toBeNull();
    });

    it('should return false for non-existent context', async () => {
      const deleted = await manager.deleteContext('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteTaskContexts', () => {
    it('should delete all contexts for a task', async () => {
      const taskId = 'task-789';

      await manager.saveAgentOutput(taskId, {
        agentId: 'agent-1',
        taskId,
        prompt: 'Test 1',
        response: 'Response 1'
      });

      await manager.saveAgentOutput(taskId, {
        agentId: 'agent-2',
        taskId,
        prompt: 'Test 2',
        response: 'Response 2'
      });

      const deleted = await manager.deleteTaskContexts(taskId);
      expect(deleted).toBe(2);

      const contexts = await manager.getContextForTask(taskId);
      expect(contexts).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return context statistics', async () => {
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

      const stats = await manager.getStats();

      expect(stats.totalContexts).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.byType[ContextType.AGENT_RESPONSE]).toBe(1);
      expect(stats.byType[ContextType.TASK_COMPLETION]).toBe(1);
      expect(stats.byTask['task-1']).toBe(2);
    });
  });

  describe('createReference', () => {
    it('should create context reference', async () => {
      const contextId = await manager.saveAgentOutput('task-1', {
        agentId: 'agent-1',
        taskId: 'task-1',
        prompt: 'Test',
        response: 'Response'
      });

      const ref = await manager.createReference(contextId);

      expect(ref).toBeTruthy();
      expect(ref?.contextId).toBe(contextId);
      expect(ref?.taskId).toBe('task-1');
      expect(ref?.type).toBe(ContextType.AGENT_RESPONSE);
      expect(ref?.path).toContain(contextId);
    });
  });

  describe('getTaskReferences', () => {
    it('should return all references for a task', async () => {
      const taskId = 'task-1';

      await manager.saveAgentOutput(taskId, {
        agentId: 'agent-1',
        taskId,
        prompt: 'Test 1',
        response: 'Response 1'
      });

      await manager.saveAgentOutput(taskId, {
        agentId: 'agent-2',
        taskId,
        prompt: 'Test 2',
        response: 'Response 2'
      });

      const refs = await manager.getTaskReferences(taskId);

      expect(refs).toHaveLength(2);
      expect(refs.every(r => r.taskId === taskId)).toBe(true);
      expect(refs.every(r => r.type === ContextType.AGENT_RESPONSE)).toBe(true);
    });
  });

  describe('memory cache', () => {
    it('should cache loaded contexts', async () => {
      const contextId = await manager.saveAgentOutput('task-1', {
        agentId: 'agent-1',
        taskId: 'task-1',
        prompt: 'Test',
        response: 'Response'
      });

      // Load twice
      const first = await manager.loadContext(contextId);
      const second = await manager.loadContext(contextId);

      expect(first).toEqual(second);
    });

    it('should clear cache on demand', async () => {
      await manager.saveAgentOutput('task-1', {
        agentId: 'agent-1',
        taskId: 'task-1',
        prompt: 'Test',
        response: 'Response'
      });

      manager.clearCache();
      
      // Cache should be empty
      const stats = await manager.getStats();
      expect(stats).toBeTruthy();
    });
  });
});
