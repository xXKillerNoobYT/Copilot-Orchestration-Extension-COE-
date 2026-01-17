/* eslint-disable @typescript-eslint/no-explicit-any */
import { TaskExecutor } from './taskExecutor';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Jest type definitions
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;
declare function beforeEach(fn: () => Promise<void> | void): void;
declare function afterEach(fn: () => Promise<void> | void): void;
declare function beforeAll(fn: () => Promise<void> | void): void;
declare function afterAll(fn: () => Promise<void> | void): void;

interface Expect {
  (actual: any): any;
  toBeDefined(): void;
  toEqual(expected: any): void;
  toBe(expected: any): void;
  toContain(expected: any): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toThrow(): void;
  not: any;
  toMatch(expected: RegExp): void;
}

declare function expect(actual: any): Expect;

/**
 * Comprehensive test suite for TaskExecutor memory management.
 * Tests TTL-based pruning, periodic cleanup, and overflow protection.
 */
describe('TaskExecutor Memory Management', () => {
  let tempDir: string;
  let tasksDir: string;

  beforeAll(async () => {
    // Create temp directory for test tasks
    tempDir = path.join(os.tmpdir(), `task-executor-memory-test-${Date.now()}`);
    tasksDir = path.join(tempDir, '_ZENTASKS');
    await fs.mkdir(tasksDir, { recursive: true });

    // Create a minimal tasks.json file
    const tasksContent = {
      tasks: [
        {
          id: 'TASK-001',
          title: 'Test Task 1',
          description: 'Test task for memory management',
          status: 'pending',
          priority: 'medium',
          dependencies: [],
        },
      ],
    };
    await fs.writeFile(
      path.join(tasksDir, 'tasks.json'),
      JSON.stringify(tasksContent, null, 2)
    );
  });

  afterAll(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Memory Entry Timestamp Tracking', () => {
    test('should add timestamp to memory entries', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 50,
      });

      // Use type assertion to access private method for testing
      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      addToMemory('user', 'Test message');
      
      const memory = executor.getMemory();
      expect(memory.length).toBe(1);
      expect(memory[0].timestamp).toBeDefined();
      expect(memory[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should track timestamps for all entries', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 50,
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      addToMemory('user', 'Message 1');
      addToMemory('assistant', 'Response 1');
      addToMemory('user', 'Message 2');
      
      const memory = executor.getMemory();
      expect(memory.length).toBe(3);
      memory.forEach(entry => {
        expect(entry.timestamp).toBeDefined();
        expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });
  });

  describe('Periodic Memory Cleanup', () => {
    test('should track memory addition count', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 50,
        memoryCleanupInterval: 5,
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      // Add entries to trigger memory additions
      for (let i = 0; i < 3; i++) {
        addToMemory('user', `Message ${i}`);
      }
      
      const stats = executor.getStats();
      expect(stats.memoryAdditionCount).toBe(3);
    });

    test('should perform periodic cleanup every N memory additions', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 50,
        memoryCleanupInterval: 5,
        memoryTTLMinutes: 30,
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      // Add 12 entries (cleanup should trigger at memory additions 5 and 10)
      for (let i = 0; i < 12; i++) {
        addToMemory('user', `Message ${i}`);
      }
      
      const stats = executor.getStats();
      expect(stats.memoryAdditionCount).toBe(12);
      expect(stats.memoryConfig.cleanupInterval).toBe(5);
    });

    test('should expose memory configuration in stats', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 100,
        memoryCleanupInterval: 15,
        memoryTTLMinutes: 45,
      });

      const stats = executor.getStats();
      expect(stats.memoryConfig).toBeDefined();
      expect(stats.memoryConfig.limit).toBe(100);
      expect(stats.memoryConfig.cleanupInterval).toBe(15);
      expect(stats.memoryConfig.ttlMinutes).toBe(45);
    });
  });

  describe('TTL-Based Memory Pruning', () => {
    test('should prune entries older than TTL', async () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 50,
        memoryCleanupInterval: 2,
        memoryTTLMinutes: 0.001, // ~60ms TTL for testing
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      // Add first entry
      addToMemory('user', 'Old message');
      
      // Wait for entry to age beyond TTL
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add second entry to trigger cleanup (cycle 2)
      addToMemory('user', 'New message 1');
      addToMemory('user', 'New message 2');
      
      const memory = executor.getMemory();
      // Old message should be pruned, only new messages remain
      expect(memory.length).toBeLessThan(3);
      expect(memory.some(m => m.content === 'Old message')).toBe(false);
    });

    test('should keep recent entries within TTL', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 50,
        memoryCleanupInterval: 10,
        memoryTTLMinutes: 30, // Long TTL
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      // Add entries
      addToMemory('user', 'Recent message 1');
      addToMemory('user', 'Recent message 2');
      addToMemory('user', 'Recent message 3');
      
      const memory = executor.getMemory();
      expect(memory.length).toBe(3);
      expect(memory.every(m => m.content.startsWith('Recent'))).toBe(true);
    });
  });

  describe('Overflow Protection (Fallback)', () => {
    test('should enforce memory limit on overflow', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 5,
        memoryCleanupInterval: 100, // Large interval to avoid periodic cleanup
        memoryTTLMinutes: 1000, // Large TTL to avoid TTL pruning
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      // Add more entries than the limit
      for (let i = 0; i < 10; i++) {
        addToMemory('user', `Message ${i}`);
      }
      
      const memory = executor.getMemory();
      expect(memory.length).toBeLessThanOrEqual(5);
      
      // Should keep the most recent entries
      expect(memory[memory.length - 1].content).toBe('Message 9');
    });

    test('should preserve most recent entries during overflow', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 3,
        memoryCleanupInterval: 100,
        memoryTTLMinutes: 1000,
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      addToMemory('user', 'Message 1');
      addToMemory('user', 'Message 2');
      addToMemory('user', 'Message 3');
      addToMemory('user', 'Message 4');
      addToMemory('user', 'Message 5');
      
      const memory = executor.getMemory();
      expect(memory.length).toBe(3);
      expect(memory[0].content).toBe('Message 3');
      expect(memory[1].content).toBe('Message 4');
      expect(memory[2].content).toBe('Message 5');
    });
  });

  describe('Default Configuration', () => {
    test('should use default values when not specified', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
      });

      const stats = executor.getStats();
      expect(stats.memoryConfig.limit).toBe(50); // Default limit
      expect(stats.memoryConfig.cleanupInterval).toBe(10); // Default interval
      expect(stats.memoryConfig.ttlMinutes).toBe(30); // Default TTL
    });

    test('should allow custom configuration', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 75,
        memoryCleanupInterval: 20,
        memoryTTLMinutes: 60,
      });

      const stats = executor.getStats();
      expect(stats.memoryConfig.limit).toBe(75);
      expect(stats.memoryConfig.cleanupInterval).toBe(20);
      expect(stats.memoryConfig.ttlMinutes).toBe(60);
    });
  });

  describe('Memory Utility Methods', () => {
    test('getMemory should return copy of memory array', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      addToMemory('user', 'Test message');
      
      const memory1 = executor.getMemory();
      const memory2 = executor.getMemory();
      
      expect(memory1).not.toBe(memory2); // Different array references
      expect(memory1).toEqual(memory2); // Same content
    });

    test('clearMemory should remove all entries', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      addToMemory('user', 'Message 1');
      addToMemory('user', 'Message 2');
      addToMemory('user', 'Message 3');
      
      expect(executor.getMemory().length).toBe(3);
      
      executor.clearMemory();
      
      expect(executor.getMemory().length).toBe(0);
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should handle zero or negative cleanup interval gracefully', () => {
      const executor1 = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryCleanupInterval: 0, // Invalid, should default to 10
      });

      const executor2 = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryCleanupInterval: -5, // Invalid, should default to 10
      });

      const stats1 = executor1.getStats();
      const stats2 = executor2.getStats();

      expect(stats1.memoryConfig.cleanupInterval).toBe(10);
      expect(stats2.memoryConfig.cleanupInterval).toBe(10);
    });

    test('should handle Infinity values gracefully', () => {
      const executor1 = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryCleanupInterval: Infinity, // Invalid, should default to 10
      });

      const executor2 = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryTTLMinutes: Infinity, // Invalid, should default to 30
      });

      const stats1 = executor1.getStats();
      const stats2 = executor2.getStats();

      expect(stats1.memoryConfig.cleanupInterval).toBe(10);
      expect(stats2.memoryConfig.ttlMinutes).toBe(30);
    });

    test('should handle zero or negative TTL gracefully', () => {
      const executor1 = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryTTLMinutes: 0, // Invalid, should default to 30
      });

      const executor2 = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryTTLMinutes: -10, // Invalid, should default to 30
      });

      const stats1 = executor1.getStats();
      const stats2 = executor2.getStats();

      expect(stats1.memoryConfig.ttlMinutes).toBe(30);
      expect(stats2.memoryConfig.ttlMinutes).toBe(30);
    });

    test('should handle invalid timestamps gracefully', () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryCleanupInterval: 2,
        memoryTTLMinutes: 30,
      });

      // Manually inject entries with invalid timestamps
      const memory = (executor as any).memory;
      memory.push({ role: 'user', content: 'Valid entry', timestamp: new Date().toISOString() });
      memory.push({ role: 'user', content: 'Invalid timestamp 1', timestamp: 'not-a-date' });
      memory.push({ role: 'user', content: 'Invalid timestamp 2', timestamp: '' });
      memory.push({ role: 'user', content: 'Another valid', timestamp: new Date().toISOString() });

      // Trigger cleanup by adding entries
      const addToMemory = (executor as any).addToMemory.bind(executor);
      addToMemory('user', 'Trigger 1');
      addToMemory('user', 'Trigger 2'); // Cycle 2, cleanup should trigger

      const finalMemory = executor.getMemory();
      
      // Invalid timestamps should be kept (conservative approach)
      expect(finalMemory.some(m => m.content === 'Invalid timestamp 1')).toBe(true);
      expect(finalMemory.some(m => m.content === 'Invalid timestamp 2')).toBe(true);
    });
  });

  describe('Combined Cleanup Strategies', () => {
    test('should apply both TTL and periodic cleanup', async () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 50,
        memoryCleanupInterval: 3,
        memoryTTLMinutes: 0.001, // ~60ms TTL
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      // Add old entries
      addToMemory('user', 'Old message 1');
      addToMemory('user', 'Old message 2');
      
      // Wait for entries to age
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add new entries to trigger periodic cleanup at cycle 3
      addToMemory('user', 'New message 1');
      addToMemory('user', 'New message 2');
      addToMemory('user', 'New message 3');
      
      const memory = executor.getMemory();
      const stats = executor.getStats();
      
      // Old messages should be pruned
      expect(memory.every(m => m.content.startsWith('New'))).toBe(true);
      expect(stats.memoryAdditionCount).toBe(5);
    });

    test('should handle edge case with TTL and overflow together', async () => {
      const executor = new TaskExecutor({
        workspaceRoot: tempDir,
        tasksDir,
        memoryLimit: 3,
        memoryCleanupInterval: 2,
        memoryTTLMinutes: 0.001, // ~60ms TTL
      });

      const addToMemory = (executor as any).addToMemory.bind(executor);
      
      // Add entries that will age
      addToMemory('user', 'Message 1');
      addToMemory('user', 'Message 2');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add more entries than limit
      for (let i = 3; i <= 6; i++) {
        addToMemory('user', `Message ${i}`);
      }
      
      const memory = executor.getMemory();
      
      // Should enforce limit
      expect(memory.length).toBeLessThanOrEqual(3);
      
      // Old messages should be gone
      expect(memory.some(m => m.content === 'Message 1')).toBe(false);
      expect(memory.some(m => m.content === 'Message 2')).toBe(false);
    });
  });
});
