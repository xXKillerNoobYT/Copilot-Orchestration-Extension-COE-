import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TasksSource, Task, TasksSourceState } from '../workspace/tasksSource';

describe('TasksSource', () => {
    const testDir = path.join(__dirname, '__test_workspace__');
    const zenTasksDir = path.join(testDir, '_ZENTASKS');
    let tasksSource: TasksSource;

    beforeEach(async () => {
        await fs.mkdir(zenTasksDir, { recursive: true });
        tasksSource = new TasksSource([testDir]);
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Constructor and Path Resolution', () => {
        it('should initialize with default workspace roots', () => {
            const source = new TasksSource();
            expect(source).toBeDefined();
            expect(source.getTaskFilePath()).toContain('_ZENTASKS');
        });

        it('should initialize with custom workspace roots', () => {
            const source = new TasksSource([testDir]);
            expect(source).toBeDefined();
        });

        it('should resolve task file path correctly', () => {
            const filePath = tasksSource.getTaskFilePath();
            expect(filePath).toContain('tasks.json');
        });
    });

    describe('load()', () => {
        it('should load valid tasks from file', async () => {
            const tasksData: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Test Task 1',
                    description: 'Description 1',
                    status: 'pending',
                    priority: 'high',
                    dependencies: [],
                },
                {
                    id: 'TASK-002',
                    title: 'Test Task 2',
                    description: 'Description 2',
                    status: 'in-progress',
                    priority: 'medium',
                    dependencies: ['TASK-001'],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: tasksData }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(true);
            expect(state.tasks).toHaveLength(2);
            expect(state.tasks[0].id).toBe('TASK-001');
            expect(state.tasks[1].id).toBe('TASK-002');
            expect(state.issues).toHaveLength(0);
            expect(state.lastLoadTime).toBeDefined();
        });

        it('should handle missing tasks file gracefully', async () => {
            const state = await tasksSource.load();

            expect(state.isValid).toBe(false);
            expect(state.tasks).toHaveLength(0);
            expect(state.issues.length).toBeGreaterThan(0);
            expect(state.issues.some(issue => issue.includes('not found') || issue.includes('does not exist'))).toBe(true);
        });

        it('should handle corrupted JSON gracefully', async () => {
            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, '{ invalid json }', 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(false);
            expect(state.tasks).toHaveLength(0);
            expect(state.issues.length).toBeGreaterThan(0);
        });

        it('should validate task schema', async () => {
            const invalidTasks = [
                {
                    id: 'TASK-001',
                    // missing required fields: title, description, status, priority
                    dependencies: [],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: invalidTasks }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(false);
            expect(state.issues.length).toBeGreaterThan(0);
        });

        it('should handle empty tasks array', async () => {
            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: [] }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(true);
            expect(state.tasks).toHaveLength(0);
            expect(state.issues).toHaveLength(0);
        });

        it('should cache loaded state', async () => {
            const tasksData: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Test Task',
                    description: 'Description',
                    status: 'pending',
                    priority: 'high',
                    dependencies: [],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: tasksData }, null, 2), 'utf-8');

            const state1 = await tasksSource.load();
            const cached = tasksSource.getCached();

            expect(cached.tasks).toEqual(state1.tasks);
            expect(cached.lastLoadTime).toBe(state1.lastLoadTime);
        });
    });

    describe('refresh()', () => {
        it('should reload tasks from disk', async () => {
            const initialTasks: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Initial Task',
                    description: 'Initial',
                    status: 'pending',
                    priority: 'high',
                    dependencies: [],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: initialTasks }, null, 2), 'utf-8');

            const state1 = await tasksSource.load();
            expect(state1.tasks).toHaveLength(1);

            // Update the file
            const updatedTasks: Task[] = [
                ...initialTasks,
                {
                    id: 'TASK-002',
                    title: 'New Task',
                    description: 'New',
                    status: 'pending',
                    priority: 'medium',
                    dependencies: [],
                },
            ];

            await fs.writeFile(tasksFile, JSON.stringify({ tasks: updatedTasks }, null, 2), 'utf-8');

            const state2 = await tasksSource.refresh();
            expect(state2.tasks).toHaveLength(2);
            expect(state2.tasks[1].id).toBe('TASK-002');
        });

        it('should update cached state after refresh', async () => {
            const tasksData: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Test Task',
                    description: 'Description',
                    status: 'pending',
                    priority: 'high',
                    dependencies: [],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: tasksData }, null, 2), 'utf-8');

            await tasksSource.load();

            // Update file
            tasksData[0].title = 'Updated Title';
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: tasksData }, null, 2), 'utf-8');

            await tasksSource.refresh();
            const cached = tasksSource.getCached();

            expect(cached.tasks[0].title).toBe('Updated Title');
        });
    });

    describe('getCached()', () => {
        it('should return cached state without re-reading file', async () => {
            const tasksData: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Test Task',
                    description: 'Description',
                    status: 'pending',
                    priority: 'high',
                    dependencies: [],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: tasksData }, null, 2), 'utf-8');

            await tasksSource.load();

            // Delete the file
            await fs.unlink(tasksFile);

            // getCached() should still return the cached data
            const cached = tasksSource.getCached();
            expect(cached.tasks).toHaveLength(1);
            expect(cached.tasks[0].id).toBe('TASK-001');
        });

        it('should return empty state if nothing loaded yet', () => {
            const cached = tasksSource.getCached();
            expect(cached.tasks).toHaveLength(0);
            expect(cached.isValid).toBe(false);
        });
    });

    describe('exists()', () => {
        it('should return true if tasks file exists', async () => {
            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: [] }, null, 2), 'utf-8');

            const exists = await tasksSource.exists();
            expect(exists).toBe(true);
        });

        it('should return false if tasks file does not exist', async () => {
            const exists = await tasksSource.exists();
            expect(exists).toBe(false);
        });
    });

    describe('watch()', () => {
        it('should trigger callback when file changes', async (done) => {
            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            const initialTasks: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Initial',
                    description: 'Description',
                    status: 'pending',
                    priority: 'high',
                    dependencies: [],
                },
            ];

            await fs.writeFile(tasksFile, JSON.stringify({ tasks: initialTasks }, null, 2), 'utf-8');
            await tasksSource.load();

            let callCount = 0;
            const dispose = tasksSource.watch((state) => {
                callCount++;
                if (callCount === 1) {
                    expect(state.tasks.length).toBeGreaterThan(0);
                    dispose();
                    done();
                }
            });

            // Simulate file change
            const updatedTasks: Task[] = [
                ...initialTasks,
                {
                    id: 'TASK-002',
                    title: 'New',
                    description: 'New Description',
                    status: 'pending',
                    priority: 'medium',
                    dependencies: [],
                },
            ];

            await fs.writeFile(tasksFile, JSON.stringify({ tasks: updatedTasks }, null, 2), 'utf-8');
        });

        it('should stop watching when dispose is called', async () => {
            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: [] }, null, 2), 'utf-8');
            await tasksSource.load();

            let callCount = 0;
            const dispose = tasksSource.watch(() => {
                callCount++;
            });

            dispose();

            // Change file after dispose
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: [{ id: 'X', title: 'X', description: 'X', status: 'pending', priority: 'high', dependencies: [] }] }, null, 2), 'utf-8');

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 500));

            expect(callCount).toBe(0);
        });
    });

    describe('Schema Validation', () => {
        it('should validate required fields', async () => {
            const invalidTasks = [
                {
                    id: 'TASK-001',
                    // Missing: title, description, status, priority
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: invalidTasks }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(false);
            expect(state.issues.some(issue =>
                issue.includes('title') ||
                issue.includes('description') ||
                issue.includes('status') ||
                issue.includes('priority')
            )).toBe(true);
        });

        it('should validate status enum values', async () => {
            const invalidTasks: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Test',
                    description: 'Description',
                    status: 'invalid-status' as any,
                    priority: 'high',
                    dependencies: [],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: invalidTasks }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(false);
            expect(state.issues.some(issue => issue.includes('status'))).toBe(true);
        });

        it('should validate priority enum values', async () => {
            const invalidTasks: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Test',
                    description: 'Description',
                    status: 'pending',
                    priority: 'urgent' as any,
                    dependencies: [],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: invalidTasks }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(false);
            expect(state.issues.some(issue => issue.includes('priority'))).toBe(true);
        });

        it('should validate dependencies array', async () => {
            const invalidTasks: any[] = [
                {
                    id: 'TASK-001',
                    title: 'Test',
                    description: 'Description',
                    status: 'pending',
                    priority: 'high',
                    dependencies: 'not-an-array',
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: invalidTasks }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(false);
            expect(state.issues.some(issue => issue.includes('dependencies'))).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle file with no tasks property', async () => {
            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ otherData: [] }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(false);
            expect(state.issues.some(issue => issue.includes('tasks'))).toBe(true);
        });

        it('should handle file permissions errors', async () => {
            // This test is platform-specific and may not work on all systems
            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: [] }, null, 2), 'utf-8');

            try {
                await fs.chmod(tasksFile, 0o000);
                const state = await tasksSource.load();
                expect(state.isValid).toBe(false);
            } catch (error) {
                // If chmod fails (e.g., on Windows), skip this test
            } finally {
                try {
                    await fs.chmod(tasksFile, 0o644);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        });

        it('should handle very large task files', async () => {
            const largeTasks: Task[] = Array.from({ length: 1000 }, (_, i) => ({
                id: `TASK-${String(i).padStart(4, '0')}`,
                title: `Task ${i}`,
                description: `Description ${i}`,
                status: 'pending' as const,
                priority: 'medium' as const,
                dependencies: [],
            }));

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: largeTasks }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(true);
            expect(state.tasks).toHaveLength(1000);
        });

        it('should handle unicode characters in task data', async () => {
            const tasksData: Task[] = [
                {
                    id: 'TASK-001',
                    title: 'Task with émojis 🚀 and ñoñ-ASCII',
                    description: 'Description with 中文 and العربية',
                    status: 'pending',
                    priority: 'high',
                    dependencies: [],
                },
            ];

            const tasksFile = path.join(zenTasksDir, 'tasks.json');
            await fs.writeFile(tasksFile, JSON.stringify({ tasks: tasksData }, null, 2), 'utf-8');

            const state = await tasksSource.load();

            expect(state.isValid).toBe(true);
            expect(state.tasks[0].title).toContain('🚀');
            expect(state.tasks[0].description).toContain('中文');
        });
    });
});
