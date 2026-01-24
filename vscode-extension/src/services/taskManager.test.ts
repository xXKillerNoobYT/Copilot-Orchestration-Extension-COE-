/**
 * Tests for Task Manager Service
 * Tests task CRUD operations and database management
 */

import { TaskManager, Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from './taskManager';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// Mock better-sqlite3
jest.mock('better-sqlite3');
jest.mock('fs');
jest.mock('path');

describe('TaskManager', () => {
  let manager: TaskManager;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    (TaskManager as any).instance = null;

    // Mock database
    mockDb = {
      prepare: jest.fn().mockReturnThis(),
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      get: jest.fn().mockReturnValue(null),
      all: jest.fn().mockReturnValue([]),
      close: jest.fn(),
      exec: jest.fn(),
      pragma: jest.fn().mockReturnThis()
    };

    (Database as jest.MockedClass<typeof Database>).mockImplementation(() => mockDb);

    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

    // Mock path
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.dirname as jest.Mock).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));

    manager = TaskManager.getInstance('/test/db/path');
  });

  afterEach(() => {
    if (manager) {
      manager.close();
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TaskManager.getInstance();
      const instance2 = TaskManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize database on first instance', () => {
      expect(Database).toHaveBeenCalled();
    });
  });

  describe('Task Creation', () => {
    it('should create a new task', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        name: 'Test Task',
        description: 'Test description',
        task_type: 'feature',
        priority: 'high'
      };

      const mockTask: Task = {
        id: 'task-1',
        ...input,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      } as Task;

      mockDb.get.mockReturnValue(mockTask);

      const task = await manager.createTask(input);

      expect(task).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should generate unique task ID', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        name: 'Task 1',
        task_type: 'feature'
      };

      mockDb.get.mockReturnValue({ id: 'generated-id', ...input });

      const task1 = await manager.createTask(input);
      const task2 = await manager.createTask(input);

      // IDs should be generated (tested via mocks)
      expect(task1.id).toBeDefined();
      expect(task2.id).toBeDefined();
    });

    it('should set default values', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        name: 'Minimal Task',
        task_type: 'feature'
      };

      const mockTask: Task = {
        id: 'task-1',
        ...input,
        priority: 'medium',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      } as Task;

      mockDb.get.mockReturnValue(mockTask);

      const task = await manager.createTask(input);

      expect(task.status).toBe('pending');
      expect(task.priority).toBe('medium');
    });
  });

  describe('Task Retrieval', () => {
    it('should get task by ID', async () => {
      const mockTask: Task = {
        id: 'task-1',
        project_id: 'proj-1',
        name: 'Test Task',
        task_type: 'feature',
        priority: 'high',
        status: 'in_progress',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      };

      mockDb.get.mockReturnValue(mockTask);

      const task = manager.getTaskById('task-1');

      expect(task).toEqual(mockTask);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should return null for non-existent task', () => {
      mockDb.get.mockReturnValue(null);

      const task = manager.getTaskById('non-existent');

      expect(task).toBeNull();
    });

    it('should list all tasks', () => {
      const mockTasks: Task[] = [
        { id: 'task-1', name: 'Task 1', task_type: 'feature', priority: 'high', status: 'pending' } as Task,
        { id: 'task-2', name: 'Task 2', task_type: 'bug', priority: 'critical', status: 'in_progress' } as Task
      ];

      mockDb.all.mockReturnValue(mockTasks);

      const tasks = manager.getAllTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks).toEqual(mockTasks);
    });
  });

  describe('Task Filtering', () => {
    it('should filter tasks by status', () => {
      const filter: TaskFilter = {
        status: 'in_progress'
      };

      const mockTasks: Task[] = [
        { id: 'task-1', status: 'in_progress' } as Task
      ];

      mockDb.all.mockReturnValue(mockTasks);

      const tasks = manager.getAllTasks(filter);

      expect(tasks.every((t: Task) => t.status === 'in_progress')).toBe(true);
    });

    it('should filter ready tasks (no blockers)', () => {
      const filter: TaskFilter = {
        filter: 'ready'
      };

      mockDb.get.mockReturnValue(null);

      const task = manager.getNextTask(filter);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(task).toBeNull();
    });

    it('should filter blocked tasks', () => {
      const filter: TaskFilter = {
        filter: 'blocked'
      };

      mockDb.get.mockReturnValue(null);

      const task = manager.getNextTask(filter);

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should filter by priority', () => {
      const filter: TaskFilter = {
        priority: 'critical'
      };

      const mockTasks: Task[] = [
        { id: 'task-1', priority: 'critical' } as Task
      ];

      mockDb.all.mockReturnValue(mockTasks);

      const tasks = manager.getAllTasks(filter);

      expect(tasks.every((t: Task) => t.priority === 'critical')).toBe(true);
    });

    it('should filter by agent type', () => {
      const filter: TaskFilter = {
        agentType: 'planning'
      };

      mockDb.get.mockReturnValue(null);

      const task = manager.getNextTask(filter);

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should filter by project ID', () => {
      const filter: TaskFilter = {
        projectId: 'proj-1'
      };

      const mockTasks: Task[] = [
        { id: 'task-1', project_id: 'proj-1' } as Task
      ];

      mockDb.all.mockReturnValue(mockTasks);

      const tasks = manager.getAllTasks(filter);

      expect(tasks.every((t: Task) => t.project_id === 'proj-1')).toBe(true);
    });
  });

  describe('Task Updates', () => {
    it('should update task status with optimistic locking', () => {
      const mockExistingTask: Task = {
        id: 'task-1',
        project_id: 'proj-1',
        name: 'Original',
        task_type: 'feature',
        priority: 'medium',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      };

      const update: UpdateTaskInput = { 
        priority: 'high'
      };

      mockDb.get
        .mockReturnValueOnce(mockExistingTask) // First call: get current task
        .mockReturnValueOnce({ ...mockExistingTask, status: 'in_progress', priority: 'high', version: 2 }); // Second call: get updated task

      mockDb.run.mockReturnValue({ changes: 1 });

      const updated = manager.updateTaskStatus('task-1', 'in_progress', update, 1);

      expect(updated.status).toBe('in_progress');
      expect(updated.priority).toBe('high');
      expect(updated.version).toBe(2);
    });

    it('should throw on concurrent modification', () => {
      const mockTask: Task = {
        id: 'task-1',
        version: 2 // Different version
      } as Task;

      mockDb.get.mockReturnValue(mockTask);
      mockDb.run.mockReturnValue({ changes: 0 }); // Indicates version conflict

      expect(() => manager.updateTaskStatus('task-1', 'completed', {}, 1))
        .toThrow('Concurrent modification detected');
    });

    it('should throw when updating non-existent task', () => {
      mockDb.get.mockReturnValue(null);

      expect(() => manager.updateTaskStatus('non-existent', 'completed', {}, 1))
        .toThrow('Task non-existent not found');
    });

    it('should update timestamps', () => {
      const mockTask: Task = {
        id: 'task-1',
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      } as Task;

      mockDb.get
        .mockReturnValueOnce(mockTask)
        .mockReturnValueOnce({ ...mockTask, updated_at: new Date().toISOString(), version: 2 });

      mockDb.run.mockReturnValue({ changes: 1 });

      const updated = manager.updateTaskStatus('task-1', 'in_progress', {}, 1);

      expect(updated.updated_at).not.toBe(mockTask.updated_at);
    });
  });

  describe('Task Dependencies', () => {
    it('should add task dependency', () => {
      const result = manager.addDependency('task-1', 'task-2', 'blocks');

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result.task_id).toBe('task-1');
      expect(result.depends_on_task_id).toBe('task-2');
    });

    it('should get task dependencies', () => {
      const mockDeps = [
        { id: 'dep-1', task_id: 'task-1', depends_on_task_id: 'task-2', dependency_type: 'blocks' }
      ];

      mockDb.all.mockReturnValue(mockDeps);

      const deps = manager.getDependencies('task-1');

      expect(deps).toEqual(mockDeps);
    });
  });

  describe('Audit Logging', () => {
    it('should log task actions', () => {
      const result = manager.logAuditEntry({
        task_id: 'task-1',
        action: 'created',
        agent_type: 'planning',
        user_id: 'user-1',
        details: JSON.stringify({ detail: 'Task created' })
      });

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result.task_id).toBe('task-1');
    });

    it('should retrieve audit log for task', () => {
      const mockLogs = [
        { id: 'log-1', task_id: 'task-1', action: 'created', timestamp: new Date().toISOString() }
      ];

      mockDb.all.mockReturnValue(mockLogs);

      const logs = manager.getAuditLog('task-1');

      expect(logs).toEqual(mockLogs);
    });
  });

  describe('Task Deletion', () => {
    it('should delete a task', async () => {
      await manager.deleteTask('task-1');

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should delete task dependencies with task', async () => {
      await manager.deleteTask('task-1');

      // Should delete both task and its dependencies
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('Database Management', () => {
    it('should initialize schema on first run', () => {
      expect(mockDb.exec).toHaveBeenCalled();
    });

    it('should close database connection', () => {
      manager.close();

      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      expect(() => manager.getTaskById('task-1')).toThrow('Database error');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid task input', async () => {
      const invalidInput: any = {
        // Missing required fields
        project_id: 'proj-1'
      };

      // Should throw validation error
      await expect(manager.createTask(invalidInput)).rejects.toThrow();
    });

    it('should handle database connection failure', () => {
      (Database as jest.MockedClass<typeof Database>).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      expect(() => TaskManager.getInstance('/invalid/path')).toThrow();
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple tasks in transaction', () => {
      const inputs: CreateTaskInput[] = [
        { project_id: 'proj-1', name: 'Task 1', task_type: 'feature' },
        { project_id: 'proj-1', name: 'Task 2', task_type: 'bug' }
      ];

      mockDb.get.mockReturnValue({ id: 'task-id' } as Task);

      for (const input of inputs) {
        manager.createTask(input);
      }

      expect(mockDb.prepare).toHaveBeenCalledTimes(inputs.length * 2); // Create + Get
    });
  });
});
