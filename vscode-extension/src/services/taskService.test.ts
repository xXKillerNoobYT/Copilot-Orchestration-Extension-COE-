/**
 * Task Service Tests
 */

import { TaskService, Task, TaskFilters } from './taskService';
import * as vscode from 'vscode';

// Mock fetch globally
global.fetch = jest.fn();

// Mock vscode
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'backendUrl') return 'http://localhost:8000';
        if (key === 'projectId') return 'test-project-id';
        return defaultValue;
      }),
    })),
  },
  window: {
    showErrorMessage: jest.fn(),
  },
}));

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    // Reset singleton
    (TaskService as any).instance = undefined;
    taskService = TaskService.getInstance();
    taskService.clearCache();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = TaskService.getInstance();
      const instance2 = TaskService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getTasks', () => {
    const mockTasks: Task[] = [
      {
        id: 'task-1',
        project_id: 'test-project-id',
        name: 'Test Task 1',
        description: 'Description 1',
        task_type: 'feature',
        priority: 'high',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'task-2',
        project_id: 'test-project-id',
        name: 'Test Task 2',
        description: 'Description 2',
        task_type: 'bug',
        priority: 'medium',
        status: 'in_progress',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should fetch tasks from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const tasks = await taskService.getTasks('test-project-id');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/projects/test-project-id/tasks',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(tasks).toHaveLength(2);
      expect(tasks[0].name).toBe('Test Task 1');
    });

    it('should apply filters to API request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockTasks[0]] }),
      });

      const filters: TaskFilters = {
        status: 'pending',
        priority: 'high',
      };

      await taskService.getTasks('test-project-id', filters);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('priority=high'),
        expect.any(Object)
      );
    });

    it('should cache task results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      // First call
      await taskService.getTasks('test-project-id');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call (should use cache)
      await taskService.getTasks('test-project-id');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const tasks = await taskService.getTasks('test-project-id');

      expect(tasks).toEqual([]);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch tasks')
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const tasks = await taskService.getTasks('test-project-id');

      expect(tasks).toEqual([]);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('should enrich tasks with dependency and subtask counts', async () => {
      const tasksWithRelations: Task[] = [
        {
          ...mockTasks[0],
          dependencies: [
            { id: 'dep-1', task_id: 'task-1', depends_on_task_id: 'task-0', dependency_type: 'blocks', created_at: '2024-01-01T00:00:00Z' },
          ],
          subtasks: [
            { ...mockTasks[1], id: 'subtask-1', parent_task_id: 'task-1' },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: tasksWithRelations }),
      });

      const tasks = await taskService.getTasks('test-project-id');

      expect(tasks[0].dependencyCount).toBe(1);
      expect(tasks[0].subtaskCount).toBe(1);
    });
  });

  describe('getTaskById', () => {
    it('should fetch a specific task', async () => {
      const mockTask: Task = {
        id: 'task-1',
        project_id: 'test-project-id',
        name: 'Test Task',
        task_type: 'feature',
        priority: 'high',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTask }),
      });

      const task = await taskService.getTaskById('task-1');

      expect(task).toEqual(mockTask);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/tasks/task-1',
        expect.any(Object)
      );
    });

    it('should return null on error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const task = await taskService.getTaskById('nonexistent');
      expect(task).toBeNull();
    });
  });

  describe('getTasksByCategory', () => {
    it('should map ready category to pending and approved statuses', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [{ id: '1', status: 'pending' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [{ id: '2', status: 'approved' }] }),
        });

      const tasks = await taskService.getTasksByCategory('test-project-id', 'ready');

      expect(tasks).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should map in-progress category to in_progress status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await taskService.getTasksByCategory('test-project-id', 'in-progress');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=in_progress'),
        expect.any(Object)
      );
    });

    it('should map testing category to testing and review statuses', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      await taskService.getTasksByCategory('test-project-id', 'testing');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProjectId', () => {
    it('should return project ID from configuration', () => {
      const projectId = taskService.getProjectId();
      expect(projectId).toBe('test-project-id');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await taskService.getTasks('test-project-id');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      taskService.clearCache();

      await taskService.getTasks('test-project-id');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateInstance', () => {
    it('should reload config and clear cache without recreating instance', () => {
      const instance1 = TaskService.getInstance();
      TaskService.invalidateInstance();
      const instance2 = TaskService.getInstance();
      
      // Should be the same instance (not recreated)
      expect(instance1).toBe(instance2);
    });
  });

  describe('refreshProject', () => {
    it('should clear cache for project and fetch all categories', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      // Pre-populate cache
      await taskService.getTasks('test-project-id', { status: 'pending' });

      // Clear and refresh
      jest.clearAllMocks();
      await taskService.refreshProject('test-project-id');

      // Should have called for each category
      // ready (2 statuses), in-progress (1), blocked (1), testing (2), completed (1) = 7 total
      expect(global.fetch).toHaveBeenCalledTimes(7);
    });

    it('should handle errors gracefully when refreshing categories', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });
      });

      // Should not throw even if one category fails
      await expect(taskService.refreshProject('test-project-id')).resolves.not.toThrow();
    });

    it('should only clear cache for specified project', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      // Populate cache for two projects
      await taskService.getTasks('project-1', { status: 'pending' });
      await taskService.getTasks('project-2', { status: 'pending' });
      
      jest.clearAllMocks();

      // Refresh only project-1
      await taskService.refreshProject('project-1');

      // Should only fetch for project-1
      expect(global.fetch).toHaveBeenCalled();
      const calls = (global.fetch as jest.Mock).mock.calls;
      calls.forEach((call: any[]) => {
        expect(call[0]).toContain('project-1');
      });
    });
  });
});
