import * as vscode from 'vscode';
import { TasksViewProvider, TaskItem } from './tasksViewProvider';
import { Task } from '../workspace/tasksSource';
import * as path from 'path';
import { promises as fs } from 'fs';
import * as os from 'os';

/**
 * Integration tests for TasksViewProvider
 * Tests the integration with TasksSource and real workspace data
 */

describe('TasksViewProvider', () => {
  let testDir: string;
  let tasksFilePath: string;
  let mockContext: vscode.ExtensionContext;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `tasks-view-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    tasksFilePath = path.join(testDir, '_ZENTASKS', 'tasks.json');

    // Create mock extension context
    mockContext = {
      subscriptions: [],
      workspaceState: {} as any,
      globalState: {} as any,
      extensionPath: testDir,
      asAbsolutePath: (p: string) => path.join(testDir, p),
      storagePath: testDir,
      globalStoragePath: testDir,
      logPath: testDir,
      extensionUri: vscode.Uri.file(testDir),
      environmentVariableCollection: {} as any,
      extensionMode: vscode.ExtensionMode.Test,
      storageUri: vscode.Uri.file(testDir),
      globalStorageUri: vscode.Uri.file(testDir),
      logUri: vscode.Uri.file(testDir),
      secrets: {} as any,
      extension: {} as any,
      languageModelAccessInformation: {} as any,
    };
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function createTasksFile(tasks: Task[]): Promise<void> {
    const dir = path.dirname(tasksFilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tasksFilePath, JSON.stringify({ tasks }, null, 2), 'utf-8');
  }

  test('should initialize without errors when no tasks file exists', () => {
    const provider = new TasksViewProvider(mockContext);
    expect(provider).toBeDefined();
    provider.dispose();
  });

  test('should return category items at root level', async () => {
    const provider = new TasksViewProvider(mockContext);
    const items = await provider.getChildren();

    expect(items).toHaveLength(4);
    expect(items[0].label).toBe('Ready Tasks');
    expect(items[1].label).toBe('In Progress');
    expect(items[2].label).toBe('Blocked Tasks');
    expect(items[3].label).toBe('Completed');

    provider.dispose();
  });

  // TODO: GitHub Issue #XXX - These integration tests require proper workspace mocking
  // They currently don't work reliably in headless test environment without a real workspace
  // Timeline: Q1 2026 - Implement proper vscode.workspace.workspaceFolders mocking
  test.skip('should load and display pending tasks in Ready category', async () => {
    const testTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Test Task 1',
        description: 'A pending task',
        status: 'pending',
        priority: 'high',
        dependencies: [],
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        description: 'Another pending task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
      },
    ];

    await createTasksFile(testTasks);

    const provider = new TasksViewProvider(mockContext);

    const categories = await provider.getChildren();
    const readyCategory = categories[0];

    // Get tasks for Ready category
    const readyTasks = await provider.getChildren(readyCategory);

    // In a real workspace, we would see the tasks
    expect(readyTasks.length).toBe(2);

    provider.dispose();
  });

  // TODO: GitHub Issue #XXX - These integration tests require proper workspace mocking
  // Timeline: Q1 2026 - Implement dependency injection for TasksSource or proper workspace mocking
  test.skip('should map in-progress tasks correctly', async () => {
    const testTasks: Task[] = [
      {
        id: 'task-1',
        title: 'In Progress Task',
        description: 'Currently working on this',
        status: 'in-progress',
        priority: 'high',
        dependencies: [],
      },
    ];

    await createTasksFile(testTasks);

    const provider = new TasksViewProvider(mockContext);

    const categories = await provider.getChildren();
    const inProgressCategory = categories[1];

    const inProgressTasks = await provider.getChildren(inProgressCategory);
    expect(inProgressTasks.length).toBe(1);

    provider.dispose();
  });

  // TODO: GitHub Issue #XXX - These integration tests require proper workspace mocking
  // Timeline: Q1 2026 - Implement dependency injection for TasksSource or proper workspace mocking
  test.skip('should map blocked tasks correctly', async () => {
    const testTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Blocked Task',
        description: 'This task is blocked',
        status: 'blocked',
        priority: 'high',
        dependencies: [],
      },
    ];

    await createTasksFile(testTasks);

    const provider = new TasksViewProvider(mockContext);

    const categories = await provider.getChildren();
    const blockedCategory = categories[2];

    const blockedTasks = await provider.getChildren(blockedCategory);
    expect(blockedTasks.length).toBe(1);

    provider.dispose();
  });

  // TODO: GitHub Issue #XXX - These integration tests require proper workspace mocking
  // Timeline: Q1 2026 - Implement dependency injection for TasksSource or proper workspace mocking
  test.skip('should map completed tasks correctly', async () => {
    const testTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Done Task',
        description: 'This task is complete',
        status: 'done',
        priority: 'medium',
        dependencies: [],
      },
      {
        id: 'task-2',
        title: 'Review Task',
        description: 'This task is in review',
        status: 'review',
        priority: 'low',
        dependencies: [],
      },
    ];

    await createTasksFile(testTasks);

    const provider = new TasksViewProvider(mockContext);

    const categories = await provider.getChildren();
    const completedCategory = categories[3];

    const completedTasks = await provider.getChildren(completedCategory);
    expect(completedTasks.length).toBe(2);

    provider.dispose();
  });

  // TODO: GitHub Issue #XXX - These integration tests require proper workspace mocking
  // Timeline: Q1 2026 - Implement dependency injection for TasksSource or proper workspace mocking
  test.skip('should add priority indicator for high priority tasks', async () => {
    const testTasks: Task[] = [
      {
        id: 'task-1',
        title: 'High Priority Task',
        description: 'Important task',
        status: 'pending',
        priority: 'high',
        dependencies: [],
      },
      {
        id: 'task-2',
        title: 'Normal Task',
        description: 'Regular task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
      },
    ];

    await createTasksFile(testTasks);

    const provider = new TasksViewProvider(mockContext);

    const categories = await provider.getChildren();
    const readyCategory = categories[0];
    const readyTasks = await provider.getChildren(readyCategory);

    // Verify high priority task has lightning bolt indicator
    const highPriorityTask = readyTasks.find(t => t.label.includes('⚡'));
    expect(highPriorityTask).toBeDefined();
    expect(highPriorityTask?.label).toContain('High Priority Task');

    provider.dispose();
  });

  test('should properly dispose resources', () => {
    const provider = new TasksViewProvider(mockContext);
    
    // Should not throw when disposing
    expect(() => provider.dispose()).not.toThrow();
    
    // Should be safe to dispose multiple times
    expect(() => provider.dispose()).not.toThrow();
  });

  test('should refresh tree data when refresh is called', () => {
    const provider = new TasksViewProvider(mockContext);
    
    // Mock the event emitter
    let eventFired = false;
    provider.onDidChangeTreeData(() => {
      eventFired = true;
    });

    provider.refresh();

    expect(eventFired).toBe(true);

    provider.dispose();
  });

  test('should return TreeItem for getTreeItem', async () => {
    const provider = new TasksViewProvider(mockContext);
    
    const testItem = new TaskItem(
      'Test Task',
      'task-1',
      vscode.TreeItemCollapsibleState.None,
      '$(play)',
      'Test tooltip'
    );

    const treeItem = provider.getTreeItem(testItem);
    
    expect(treeItem).toBe(testItem);
    expect(treeItem.label).toBe('Test Task');

    provider.dispose();
  });
});
