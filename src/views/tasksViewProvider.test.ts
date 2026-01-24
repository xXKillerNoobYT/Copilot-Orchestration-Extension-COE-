/**
 * Tasks View Provider Tests
 */

import { TasksViewProvider } from './tasksViewProvider';
import { TaskTreeItem, CategoryTreeItem } from './taskTreeItem';
import { TaskService, Task } from '../services/taskService';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
  TreeItem: class TreeItem {
    label: string;
    id?: string;
    tooltip?: string | any;
    description?: string;
    iconPath?: any;
    command?: any;
    contextValue?: string;
    collapsibleState?: any;
    
    constructor(label: string, collapsibleState?: any) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: class ThemeIcon {
    id: string;
    color?: any;
    constructor(id: string, color?: any) {
      this.id = id;
      this.color = color;
    }
  },
  ThemeColor: class ThemeColor {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
  },
  MarkdownString: class MarkdownString {
    value: string;
    constructor(value: string) {
      this.value = value;
    }
  },
  EventEmitter: class EventEmitter {
    private listeners: Function[] = [];
    event = (listener: Function) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    fire = (data?: any) => {
      this.listeners.forEach(listener => listener(data));
    };
  },
  window: {
    showErrorMessage: jest.fn(),
  },
}));

// Mock TaskService
jest.mock('../services/taskService');

// Mock WebSocket client
jest.mock('../services/webSocketClient', () => ({
  getWebSocketClient: jest.fn(() => ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
}));

describe('TasksViewProvider', () => {
  let provider: TasksViewProvider;
  let mockContext: vscode.ExtensionContext;
  let mockTaskService: jest.Mocked<TaskService>;

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      project_id: 'project-1',
      name: 'Ready Task 1',
      task_type: 'feature',
      priority: 'high',
      status: 'pending',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'task-2',
      project_id: 'project-1',
      name: 'In Progress Task',
      task_type: 'bug',
      priority: 'medium',
      status: 'in_progress',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'task-3',
      project_id: 'project-1',
      name: 'Completed Task',
      task_type: 'feature',
      priority: 'low',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    mockContext = {} as vscode.ExtensionContext;
    
    // Create mock TaskService instance
    mockTaskService = {
      getTasks: jest.fn(),
      getTaskById: jest.fn(),
      getTasksByCategory: jest.fn(),
      getProjectId: jest.fn().mockReturnValue('project-1'),
      clearCache: jest.fn(),
      refreshProject: jest.fn(),
    } as any;

    // Mock TaskService.getInstance
    (TaskService.getInstance as jest.Mock).mockReturnValue(mockTaskService);

    provider = new TasksViewProvider(mockContext);
  });

  afterEach(() => {
    provider.dispose();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with context', () => {
      expect(provider).toBeDefined();
    });

    it('should setup WebSocket listeners', () => {
      // Create a fresh provider to capture WebSocket subscription calls
      const mockWsClient = {
        subscribe: jest.fn(),
      };
      
      // Temporarily override the mock
      const { getWebSocketClient } = require('../services/webSocketClient');
      (getWebSocketClient as jest.Mock).mockReturnValueOnce(mockWsClient);
      
      // Create new provider
      const freshProvider = new TasksViewProvider(mockContext);
      
      // Verify subscriptions were registered
      expect(mockWsClient.subscribe).toHaveBeenCalledWith('tasks', 'taskCreated', expect.any(Function));
      expect(mockWsClient.subscribe).toHaveBeenCalledWith('tasks', 'taskUpdated', expect.any(Function));
      expect(mockWsClient.subscribe).toHaveBeenCalledWith('tasks', 'taskCompleted', expect.any(Function));
      expect(mockWsClient.subscribe).toHaveBeenCalledWith('tasks', 'taskStatusChanged', expect.any(Function));
      
      freshProvider.dispose();
    });
  });

  describe('getChildren', () => {
    it('should return category items at root level', async () => {
      const children = await provider.getChildren();

      expect(children).toHaveLength(5);
      expect(children[0]).toBeInstanceOf(CategoryTreeItem);
      expect((children[0] as CategoryTreeItem).label).toBe('Ready Tasks');
      expect((children[1] as CategoryTreeItem).label).toBe('In Progress');
      expect((children[2] as CategoryTreeItem).label).toBe('Blocked Tasks');
      expect((children[3] as CategoryTreeItem).label).toBe('Testing');
      expect((children[4] as CategoryTreeItem).label).toBe('Completed');
    });

    it('should return tasks for a category', async () => {
      mockTaskService.getTasksByCategory.mockResolvedValue([mockTasks[0]]);

      const category = new CategoryTreeItem(
        'Ready Tasks',
        'ready',
        vscode.TreeItemCollapsibleState.Expanded
      );

      const children = await provider.getChildren(category);

      expect(mockTaskService.getTasksByCategory).toHaveBeenCalledWith('project-1', 'ready');
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(TaskTreeItem);
      expect((children[0] as TaskTreeItem).task.name).toBe('Ready Task 1');
    });

    it('should return empty array for task items', async () => {
      const taskItem = new TaskTreeItem(mockTasks[0], vscode.TreeItemCollapsibleState.None);
      const children = await provider.getChildren(taskItem);

      expect(children).toEqual([]);
    });

    it('should handle errors when fetching tasks', async () => {
      mockTaskService.getTasksByCategory.mockRejectedValue(new Error('API Error'));

      const category = new CategoryTreeItem(
        'Ready Tasks',
        'ready',
        vscode.TreeItemCollapsibleState.Expanded
      );

      const children = await provider.getChildren(category);

      expect(children).toEqual([]);
    });
  });

  describe('getTreeItem', () => {
    it('should return the tree item as-is', () => {
      const taskItem = new TaskTreeItem(mockTasks[0], vscode.TreeItemCollapsibleState.None);
      const result = provider.getTreeItem(taskItem);

      expect(result).toBe(taskItem);
    });
  });

  describe('refresh', () => {
    it('should fire onDidChangeTreeData event', () => {
      const listener = jest.fn();
      provider.onDidChangeTreeData(listener);

      provider.refresh();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('refreshWithClear', () => {
    it('should clear cache and refresh project', async () => {
      mockTaskService.refreshProject.mockResolvedValue(undefined);

      const listener = jest.fn();
      provider.onDidChangeTreeData(listener);

      await provider.refreshWithClear();

      expect(mockTaskService.clearCache).toHaveBeenCalled();
      expect(mockTaskService.refreshProject).toHaveBeenCalledWith('project-1');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('debounced refresh', () => {
    jest.useFakeTimers();

    it('should debounce multiple rapid refresh calls', () => {
      const listener = jest.fn();
      provider.onDidChangeTreeData(listener);

      // Trigger multiple rapid refreshes
      (provider as any).debouncedRefresh();
      (provider as any).debouncedRefresh();
      (provider as any).debouncedRefresh();

      // Should not have fired yet
      expect(listener).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should have fired once
      expect(listener).toHaveBeenCalledTimes(1);
    });

    afterAll(() => {
      jest.useRealTimers();
    });
  });

  describe('WebSocket event handling', () => {
    it('should handle WebSocket events when client is available', () => {
      const { getWebSocketClient } = require('../services/webSocketClient');
      const mockWsClient = getWebSocketClient();
      
      // Verify the mock client is set up
      expect(mockWsClient).toBeDefined();
      expect(mockWsClient.subscribe).toBeDefined();
    });
  });

  describe('getTasksForCategory', () => {
    it('should fetch tasks for ready category', async () => {
      mockTaskService.getTasksByCategory.mockResolvedValue([mockTasks[0]]);

      const category = new CategoryTreeItem(
        'Ready Tasks',
        'ready',
        vscode.TreeItemCollapsibleState.Expanded
      );

      const result = await provider.getChildren(category);

      expect(mockTaskService.getTasksByCategory).toHaveBeenCalledWith('project-1', 'ready');
      expect(result).toHaveLength(1);
    });

    it('should fetch tasks for in-progress category', async () => {
      mockTaskService.getTasksByCategory.mockResolvedValue([mockTasks[1]]);

      const category = new CategoryTreeItem(
        'In Progress',
        'in-progress',
        vscode.TreeItemCollapsibleState.Expanded
      );

      await provider.getChildren(category);

      expect(mockTaskService.getTasksByCategory).toHaveBeenCalledWith('project-1', 'in-progress');
    });

    it('should fetch tasks for completed category', async () => {
      mockTaskService.getTasksByCategory.mockResolvedValue([mockTasks[2]]);

      const category = new CategoryTreeItem(
        'Completed',
        'completed',
        vscode.TreeItemCollapsibleState.Expanded
      );

      await provider.getChildren(category);

      expect(mockTaskService.getTasksByCategory).toHaveBeenCalledWith('project-1', 'completed');
    });
  });

  describe('dispose', () => {
    it('should clean up resources and unsubscribe from WebSocket', () => {
      const mockWsClient = {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };
      
      const { getWebSocketClient } = require('../services/webSocketClient');
      (getWebSocketClient as jest.Mock).mockReturnValueOnce(mockWsClient);
      
      const providerWithTimeout = new TasksViewProvider(mockContext);
      
      // Trigger debounced refresh to create a timeout
      (providerWithTimeout as any).debouncedRefresh();
      
      // Clear the mock to track dispose-time calls
      mockWsClient.unsubscribe.mockClear();
      
      // Mock the client for dispose
      (getWebSocketClient as jest.Mock).mockReturnValueOnce(mockWsClient);
      
      // Dispose should clear the timeout and unsubscribe from WebSocket
      providerWithTimeout.dispose();
      
      // Verify unsubscribe was called for each subscription
      expect(mockWsClient.unsubscribe).toHaveBeenCalled();
    });
  });
});
