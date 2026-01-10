import { TasksSource, createTasksSource } from './tasksSource';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

let testDir = '';

async function setupTestDir(): Promise<string> {
  testDir = path.join(os.tmpdir(), `zen-tasks-test-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

async function cleanupTestDir(): Promise<void> {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

async function writeTasksFile(filePath: string, content: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
}

function createTestSource(filePath: string): TasksSource {
  const source = new TasksSource(['test-tasks']);
  // Override the file path resolution
  (source as any).filePath = filePath;
  return source;
}

async function testLoadValidTasks(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const validTasks = {
    tasks: [
      {
        id: 'task-1',
        title: 'Test Task 1',
        description: 'A test task',
        status: 'pending',
        priority: 'high',
        dependencies: [],
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        description: 'Another test task',
        status: 'in-progress',
        priority: 'medium',
        dependencies: ['task-1'],
      },
    ],
  };

  await writeTasksFile(tasksFile, validTasks);

  const source = createTestSource(tasksFile);
  const state = await source.load();

  console.assert(state.isValid === true, 'Should be valid');
  console.assert(state.tasks.length === 2, 'Should load 2 tasks');
  console.assert(state.tasks[0].id === 'task-1', 'First task should have id task-1');
  console.assert(state.tasks[1].dependencies.length === 1, 'Second task should have 1 dependency');
  console.assert(state.issues.length === 0, 'Should have no issues');

  await cleanupTestDir();
}

async function testLoadMissingFile(): Promise<void> {
  const tasksFile = path.join(os.tmpdir(), `missing-${Date.now()}`, 'tasks.json');

  const source = createTestSource(tasksFile);
  const state = await source.load();

  console.assert(state.isValid === false, 'Should be invalid');
  console.assert(state.tasks.length === 0, 'Should have no tasks');
  console.assert(state.issues.length > 0, 'Should have issues');
  console.assert(state.issues[0].includes('Failed to read'), 'Should report read failure');
}

async function testLoadInvalidJson(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const dir = path.dirname(tasksFile);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tasksFile, '{invalid json]', 'utf-8');

  const source = createTestSource(tasksFile);
  const state = await source.load();

  console.assert(state.isValid === false, 'Should be invalid');
  console.assert(state.tasks.length === 0, 'Should have no tasks');
  console.assert(state.issues.length > 0, 'Should have issues');
  console.assert(state.issues[0].includes('Invalid JSON'), 'Should report JSON error');

  await cleanupTestDir();
}

async function testLoadInvalidStructure(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  await writeTasksFile(tasksFile, { notTasks: [] });

  const source = createTestSource(tasksFile);
  const state = await source.load();

  console.assert(state.isValid === false, 'Should be invalid');
  console.assert(state.issues.length > 0, 'Should have issues');
  console.assert(state.issues[0].includes('tasks'), 'Should report missing tasks array');

  await cleanupTestDir();
}

async function testLoadMissingRequiredFields(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const tasksWithMissing = {
    tasks: [
      {
        id: 'task-1',
        title: 'Task with missing description',
        // Missing description
        status: 'pending',
        priority: 'high',
        dependencies: [],
      },
    ],
  };

  await writeTasksFile(tasksFile, tasksWithMissing);

  const source = createTestSource(tasksFile);
  const state = await source.load();

  console.assert(state.isValid === false, 'Should be invalid due to missing fields');
  console.assert(state.issues.length > 0, 'Should report missing fields');

  await cleanupTestDir();
}

async function testLoadInvalidStatus(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const tasksWithBadStatus = {
    tasks: [
      {
        id: 'task-1',
        title: 'Task with bad status',
        description: 'Description',
        status: 'invalid-status',
        priority: 'high',
        dependencies: [],
      },
    ],
  };

  await writeTasksFile(tasksFile, tasksWithBadStatus);

  const source = createTestSource(tasksFile);
  const state = await source.load();

  console.assert(state.isValid === false, 'Should be invalid due to bad status');
  console.assert(state.issues.length > 0, 'Should report bad status');

  await cleanupTestDir();
}

async function testLoadInvalidPriority(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const tasksWithBadPriority = {
    tasks: [
      {
        id: 'task-1',
        title: 'Task with bad priority',
        description: 'Description',
        status: 'pending',
        priority: 'urgent',
        dependencies: [],
      },
    ],
  };

  await writeTasksFile(tasksFile, tasksWithBadPriority);

  const source = createTestSource(tasksFile);
  const state = await source.load();

  console.assert(state.isValid === false, 'Should be invalid due to bad priority');
  console.assert(state.issues.length > 0, 'Should report bad priority');

  await cleanupTestDir();
}

async function testLoadWithOptionalFields(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const tasksWithOptional = {
    tasks: [
      {
        id: 'task-1',
        title: 'Task with optional fields',
        description: 'Description',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        type: 'feature',
        details: 'Implementation details',
        testStrategy: 'Unit tests',
        createdAt: '2026-01-07T00:00:00Z',
        updatedAt: '2026-01-07T12:00:00Z',
      },
    ],
  };

  await writeTasksFile(tasksFile, tasksWithOptional);

  const source = createTestSource(tasksFile);
  const state = await source.load();

  console.assert(state.isValid === true, 'Should be valid');
  console.assert(state.tasks.length === 1, 'Should load 1 task');
  const task = state.tasks[0];
  console.assert(task.type === 'feature', 'Should preserve type');
  console.assert(task.details === 'Implementation details', 'Should preserve details');
  console.assert(task.testStrategy === 'Unit tests', 'Should preserve testStrategy');

  await cleanupTestDir();
}

async function testGetCached(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const validTasks = {
    tasks: [
      {
        id: 'task-1',
        title: 'Test Task',
        description: 'A test',
        status: 'pending',
        priority: 'high',
        dependencies: [],
      },
    ],
  };

  await writeTasksFile(tasksFile, validTasks);

  const source = createTestSource(tasksFile);

  // Before load, should return empty
  let cached = source.getCached();
  console.assert(cached.tasks.length === 0, 'Should be empty before load');
  console.assert(!cached.isValid, 'Should be invalid before load');

  // After load, should return cached data
  await source.load();
  cached = source.getCached();
  console.assert(cached.tasks.length === 1, 'Should have 1 cached task');
  console.assert(cached.isValid, 'Should be valid after load');

  await cleanupTestDir();
}

async function testRefresh(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const initialTasks = {
    tasks: [
      {
        id: 'task-1',
        title: 'Initial Task',
        description: 'Initial',
        status: 'pending',
        priority: 'high',
        dependencies: [],
      },
    ],
  };

  await writeTasksFile(tasksFile, initialTasks);

  const source = createTestSource(tasksFile);
  let state = await source.load();
  console.assert(state.tasks.length === 1, 'Should load 1 initial task');

  // Modify file
  const updatedTasks = {
    tasks: [
      {
        id: 'task-1',
        title: 'Initial Task',
        description: 'Initial',
        status: 'pending',
        priority: 'high',
        dependencies: [],
      },
      {
        id: 'task-2',
        title: 'New Task',
        description: 'New',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
      },
    ],
  };

  await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure mtime changes
  await writeTasksFile(tasksFile, updatedTasks);

  state = await source.refresh();
  console.assert(state.tasks.length === 2, 'Should refresh and find 2 tasks');

  await cleanupTestDir();
}

async function testExists(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const source = createTestSource(tasksFile);

  let exists = await source.exists();
  console.assert(exists === false, 'Should not exist before creation');

  await writeTasksFile(tasksFile, { tasks: [] });

  exists = await source.exists();
  console.assert(exists === true, 'Should exist after creation');

  await cleanupTestDir();
}

async function testGetTaskFilePath(): Promise<void> {
  const testDir = await setupTestDir();
  const tasksFile = path.join(testDir, 'test-tasks', 'tasks.json');

  const source = createTestSource(tasksFile);
  const filePath = source.getTaskFilePath();

  console.assert(filePath === tasksFile, 'Should return correct file path');

  await cleanupTestDir();
}

async function runTasksSourceTests(): Promise<void> {
  console.log('=== TasksSource Tests ===');

  try {
    await testLoadValidTasks();
    console.log('✓ Load valid tasks');
  } catch (error) {
    console.error('✗ Load valid tasks:', error);
  }

  try {
    await testLoadMissingFile();
    console.log('✓ Load missing file');
  } catch (error) {
    console.error('✗ Load missing file:', error);
  }

  try {
    await testLoadInvalidJson();
    console.log('✓ Load invalid JSON');
  } catch (error) {
    console.error('✗ Load invalid JSON:', error);
  }

  try {
    await testLoadInvalidStructure();
    console.log('✓ Load invalid structure');
  } catch (error) {
    console.error('✗ Load invalid structure:', error);
  }

  try {
    await testLoadMissingRequiredFields();
    console.log('✓ Load missing required fields');
  } catch (error) {
    console.error('✗ Load missing required fields:', error);
  }

  try {
    await testLoadInvalidStatus();
    console.log('✓ Load invalid status');
  } catch (error) {
    console.error('✗ Load invalid status:', error);
  }

  try {
    await testLoadInvalidPriority();
    console.log('✓ Load invalid priority');
  } catch (error) {
    console.error('✗ Load invalid priority:', error);
  }

  try {
    await testLoadWithOptionalFields();
    console.log('✓ Load with optional fields');
  } catch (error) {
    console.error('✗ Load with optional fields:', error);
  }

  try {
    await testGetCached();
    console.log('✓ Get cached');
  } catch (error) {
    console.error('✗ Get cached:', error);
  }

  try {
    await testRefresh();
    console.log('✓ Refresh');
  } catch (error) {
    console.error('✗ Refresh:', error);
  }

  try {
    await testExists();
    console.log('✓ Exists');
  } catch (error) {
    console.error('✗ Exists:', error);
  }

  try {
    await testGetTaskFilePath();
    console.log('✓ Get task file path');
  } catch (error) {
    console.error('✗ Get task file path:', error);
  }

  console.log('=== TasksSource Tests Complete ✓ ===');
}

if (require.main === module) {
  runTasksSourceTests().catch((error) => {
    console.error('TasksSource tests failed:', error);
    process.exit(1);
  });
}

export { runTasksSourceTests };
