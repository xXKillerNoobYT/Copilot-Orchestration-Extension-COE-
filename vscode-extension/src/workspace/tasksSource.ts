import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Task schema interface for validation and typed access
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'review' | 'failed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  type?: string;
  dependencies: string[];
  details?: string;
  testStrategy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Tasks source state interface
 */
export interface TasksSourceState {
  tasks: Task[];
  issues: string[];
  isValid: boolean;
  lastLoadTime?: number;
}

/**
 * Tasks source API
 */
export interface ITasksSource {
  /**
   * Load tasks from workspace _ZENTASKS/tasks.json
   * Validates schema, handles missing/corrupted files gracefully
   */
  load(): Promise<TasksSourceState>;

  /**
   * Refresh tasks from disk (re-read from file)
   */
  refresh(): Promise<TasksSourceState>;

  /**
   * Get cached tasks (does not re-read from disk)
   */
  getCached(): TasksSourceState;

  /**
   * Check if tasks file exists at expected path
   */
  exists(): Promise<boolean>;

  /**
   * Get the full path to the tasks file
   */
  getTaskFilePath(): string;

  /**
   * Watch for changes to tasks.json file and trigger callback
   * Returns a dispose function to stop watching
   */
  watch(callback: (state: TasksSourceState) => void): () => void;
}

export class TasksSource implements ITasksSource {
  private cachedState: TasksSourceState | undefined;
  private filePath: string;
  private fileWatcher: ReturnType<typeof setTimeout> | undefined;
  private lastModified: number = 0;
  private watchers: Array<(state: TasksSourceState) => void> = [];

  constructor(private workspaceRoots: string[] = ['_ZENTASKS']) {
    this.filePath = this.resolveTaskFilePath();
  }

  /**
   * Resolve the path to tasks.json by checking workspace roots
   */
  private resolveTaskFilePath(): string {
    // Try to resolve from first available workspace root
    for (const root of this.workspaceRoots) {
      const candidatePath = path.join(process.cwd(), root, 'tasks.json');
      return candidatePath;
    }
    // Fallback to default
    return path.join(process.cwd(), '_ZENTASKS', 'tasks.json');
  }

  async exists(): Promise<boolean> {
    try {
      await fs.stat(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  getTaskFilePath(): string {
    return this.filePath;
  }

  async load(): Promise<TasksSourceState> {
    const issues: string[] = [];
    const tasks: Task[] = [];

    try {
      const fileContent = await fs.readFile(this.filePath, 'utf-8');

      // Try to parse JSON
      let data: unknown;
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        const err = parseError instanceof Error ? parseError.message : String(parseError);
        issues.push(`Invalid JSON in tasks.json: ${err}`);
        const state = { tasks: [], issues, isValid: false, lastLoadTime: Date.now() };
        this.cachedState = state;
        return state;
      }

      // Validate structure
      if (!data || typeof data !== 'object') {
        issues.push('tasks.json must contain a JSON object');
        const state = { tasks: [], issues, isValid: false, lastLoadTime: Date.now() };
        this.cachedState = state;
        return state;
      }

      const fileData = data as Record<string, unknown>;
      if (!Array.isArray(fileData.tasks)) {
        issues.push('tasks.json must have a "tasks" array');
        const state = { tasks: [], issues, isValid: false, lastLoadTime: Date.now() };
        this.cachedState = state;
        return state;
      }

      // Validate and collect tasks
      for (let i = 0; i < fileData.tasks.length; i++) {
        const taskData = fileData.tasks[i];
        const validation = this.validateTask(taskData, i);
        if (validation.task) {
          tasks.push(validation.task);
        }
        if (validation.issues.length > 0) {
          issues.push(...validation.issues);
        }
      }

      // Track file modification time
      const stat = await fs.stat(this.filePath);
      this.lastModified = stat.mtimeMs;

      const state = { tasks, issues, isValid: issues.length === 0, lastLoadTime: Date.now() };
      this.cachedState = state;
      return state;
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      issues.push(`Failed to read tasks.json: ${err}`);
      const state = { tasks: [], issues, isValid: false, lastLoadTime: Date.now() };
      this.cachedState = state;
      return state;
    }
  }

  /**
   * Validate a single task object
   */
  private validateTask(taskData: unknown, index: number): { task?: Task; issues: string[] } {
    const issues: string[] = [];

    if (!taskData || typeof taskData !== 'object') {
      issues.push(`Task at index ${index} is not an object`);
      return { issues };
    }

    const task = taskData as Record<string, unknown>;

    // Required fields
    const id = task.id;
    const title = task.title;
    const description = task.description;
    const status = task.status;
    const priority = task.priority;

    if (typeof id !== 'string' || !id.trim()) {
      issues.push(`Task at index ${index}: missing or invalid id`);
    }
    if (typeof title !== 'string' || !title.trim()) {
      issues.push(`Task at index ${index}: missing or invalid title`);
    }
    if (typeof description !== 'string') {
      issues.push(`Task at index ${index}: missing or invalid description`);
    }
    if (typeof status !== 'string' || !this.isValidStatus(status)) {
      issues.push(`Task at index ${index}: invalid status "${status}"`);
    }
    if (typeof priority !== 'string' || !this.isValidPriority(priority)) {
      issues.push(`Task at index ${index}: invalid priority "${priority}"`);
    }

    // Return early if there are validation errors for required fields
    if (issues.length > 0) {
      return { issues };
    }

    // Optional fields with defaults
    const dependencies = Array.isArray(task.dependencies)
      ? (task.dependencies as unknown[]).filter((dep) => typeof dep === 'string')
      : [];

    const validatedTask: Task = {
      id: id as string,
      title: title as string,
      description: description as string,
      status: status as Task['status'],
      priority: priority as Task['priority'],
      dependencies,
      type: typeof task.type === 'string' ? task.type : undefined,
      details: typeof task.details === 'string' ? task.details : undefined,
      testStrategy: typeof task.testStrategy === 'string' ? task.testStrategy : undefined,
      createdAt: typeof task.createdAt === 'string' ? task.createdAt : undefined,
      updatedAt: typeof task.updatedAt === 'string' ? task.updatedAt : undefined,
    };

    return { task: validatedTask, issues };
  }

  private isValidStatus(value: unknown): boolean {
    const valid = ['pending', 'in-progress', 'done', 'blocked', 'review', 'failed', 'cancelled'];
    return typeof value === 'string' && valid.includes(value);
  }

  private isValidPriority(value: unknown): boolean {
    const valid = ['high', 'medium', 'low'];
    return typeof value === 'string' && valid.includes(value);
  }

  getCached(): TasksSourceState {
    if (!this.cachedState) {
      return { tasks: [], issues: ['Tasks not yet loaded'], isValid: false };
    }
    return this.cachedState;
  }

  async refresh(): Promise<TasksSourceState> {
    return this.load();
  }

  watch(callback: (state: TasksSourceState) => void): () => void {
    this.watchers.push(callback);

    // Start file watcher if not already running
    if (!this.fileWatcher) {
      this.startFileWatcher();
    }

    // Return dispose function
    return () => {
      const index = this.watchers.indexOf(callback);
      if (index > -1) {
        this.watchers.splice(index, 1);
      }
      // Stop watcher if no more listeners
      if (this.watchers.length === 0) {
        this.stopFileWatcher();
      }
    };
  }

  private startFileWatcher(): void {
    // Poll every 1 second for file changes (Node.js fs.watch is unreliable on some systems)
    this.fileWatcher = setInterval(async () => {
      try {
        const stat = await fs.stat(this.filePath);
        if (stat.mtimeMs > this.lastModified) {
          const state = await this.load();
          this.watchers.forEach((callback) => callback(state));
        }
      } catch {
        // File deleted or inaccessible; notify watchers of error state
        const state: TasksSourceState = {
          tasks: [],
          issues: [`Tasks file no longer accessible at ${this.filePath}`],
          isValid: false,
        };
        this.watchers.forEach((callback) => callback(state));
      }
    }, 1000);
  }

  private stopFileWatcher(): void {
    if (this.fileWatcher) {
      clearInterval(this.fileWatcher);
      this.fileWatcher = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopFileWatcher();
    this.watchers = [];
  }
}

/**
 * Factory function to create a TasksSource with default workspace roots
 */
export function createTasksSource(workspaceRoots?: string[]): ITasksSource {
  return new TasksSource(workspaceRoots || ['_ZENTASKS']);
}
