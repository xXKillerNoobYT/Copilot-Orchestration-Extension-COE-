import { TasksSource, ITasksSource, Task, TasksSourceState } from './tasksSource';
import { ParsedTask, TaskStatus, TaskType } from '../taskParser';

/**
 * Map Zen Tasks status values to ParsedTask status values
 */
function mapStatusToTaskStatus(status: Task['status']): TaskStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'in-progress':
      return 'in_progress';
    case 'done':
      return 'completed';
    case 'review':
      return 'review';
    case 'blocked':
      return 'blocked';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

/**
 * Convert a Task from tasksSource to a ParsedTask for extension compatibility
 */
function taskToParseTask(task: Task): ParsedTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: mapStatusToTaskStatus(task.status),
    priority: task.priority === 'high' || task.priority === 'medium' || task.priority === 'low' ? task.priority : 'medium',
    type: (task.type && (task.type === 'feature' || task.type === 'bug' || task.type === 'refactor' || task.type === 'maintenance' || task.type === 'architecture' || task.type === 'testing' || task.type === 'documentation') ? task.type : undefined) as TaskType | undefined,
    dependencies: task.dependencies,
    subtasks: [], // Not available from tasks.json source
    assignees: [],
    labels: [],
    rawFrontMatter: task.details ? { details: task.details, testStrategy: task.testStrategy } : {},
    source: 'tasks.json',
  };
}

/**
 * Integrate tasksSource with the extension
 * Converts TasksSource tasks to ParsedTask format
 */
export class TasksSourceIntegration {
  private source: ITasksSource;

  constructor(workspaceRoots?: string[]) {
    this.source = new TasksSource(workspaceRoots || ['_ZENTASKS']);
  }

  /**
   * Load tasks from the workspace tasks.json source
   */
  async loadFromSource(): Promise<{
    tasks: ParsedTask[];
    issues: string[];
    isValid: boolean;
  }> {
    const state = await this.source.load();

    const tasks = state.tasks.map((task) => taskToParseTask(task));

    return {
      tasks,
      issues: state.issues,
      isValid: state.isValid,
    };
  }

  /**
   * Get cached tasks
   */
  getCached(): ParsedTask[] {
    const state = this.source.getCached();
    return state.tasks.map((task) => taskToParseTask(task));
  }

  /**
   * Refresh tasks from disk
   */
  async refresh(): Promise<ParsedTask[]> {
    const state = await this.source.refresh();
    return state.tasks.map((task) => taskToParseTask(task));
  }

  /**
   * Check if tasks source file exists
   */
  async exists(): Promise<boolean> {
    return this.source.exists();
  }

  /**
   * Get the file path to tasks.json
   */
  getFilePath(): string {
    return this.source.getTaskFilePath();
  }

  /**
   * Watch for changes and invoke callback
   * Returns a dispose function
   */
  watch(callback: (tasks: ParsedTask[], isValid: boolean) => void): () => void {
    return this.source.watch((state: TasksSourceState) => {
      const tasks = state.tasks.map((task) => taskToParseTask(task));
      callback(tasks, state.isValid);
    });
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    (this.source as any).dispose?.();
  }
}
