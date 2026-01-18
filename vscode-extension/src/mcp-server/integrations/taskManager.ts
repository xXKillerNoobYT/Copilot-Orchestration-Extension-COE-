/**
 * Task Manager Integration
 * Integrates MCP server with the actual task management system
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

// Local type definitions to avoid external dependencies
interface Task {
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

export interface TaskWithContext extends Task {
  context?: {
    relatedFiles?: string[];
    relatedIssues?: Array<{ number: number; url: string; title: string }>;
    techStack?: string[];
  };
  acceptanceCriteria?: string[];
  estimatedEffort?: string;
  assignedTo?: string;
}

export class TaskManager {
  private workspaceRoot: string;
  private tasksFilePath: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || process.cwd();
    this.tasksFilePath = path.join(this.workspaceRoot, '_ZENTASKS', 'tasks.json');
  }

  /**
   * Load tasks from file
   */
  private async loadTasks(): Promise<Task[]> {
    try {
      const content = await fs.readFile(this.tasksFilePath, 'utf-8');
      const data = JSON.parse(content);
      return data.tasks || [];
    } catch (error) {
      // Return empty array if file doesn't exist or is invalid
      return [];
    }
  }

  /**
   * Save tasks to file
   */
  private async saveTasks(tasks: Task[]): Promise<void> {
    await fs.mkdir(path.dirname(this.tasksFilePath), { recursive: true });
    await fs.writeFile(
      this.tasksFilePath,
      JSON.stringify({ tasks }, null, 2),
      'utf-8'
    );
  }

  /**
   * Get the next highest-priority task matching filters
   */
  async getNextTask(options?: {
    filter?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    agentType?: string;
  }): Promise<TaskWithContext | null> {
    const tasks = await this.loadTasks();
    
    if (tasks.length === 0) {
      return null;
    }

    // Filter tasks by status (pending or in-progress)
    let availableTasks = tasks.filter(
      (task) => task.status === 'pending' || task.status === 'in-progress'
    );

    // Apply priority filter if specified
    if (options?.priority) {
      availableTasks = availableTasks.filter((task) => task.priority === options.priority);
    }

    // Apply text filter if specified
    if (options?.filter) {
      const filterLower = options.filter.toLowerCase();
      availableTasks = availableTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(filterLower) ||
          task.description.toLowerCase().includes(filterLower)
      );
    }

    // Sort by priority (high > medium > low) and then by creation date
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    availableTasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Sort by creation date if available
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    });

    // Return the highest priority task
    if (availableTasks.length > 0) {
      return this.enrichTaskWithContext(availableTasks[0]);
    }

    return null;
  }

  /**
   * Update task status and progress
   */
  async updateTaskStatus(
    taskId: string,
    status: Task['status'],
    progress?: number,
    observations?: string,
    blockers?: string[]
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const tasks = await this.loadTasks();
      const taskIndex = tasks.findIndex((t) => t.id === taskId);

      if (taskIndex === -1) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      const task = tasks[taskIndex];
      const previousStatus = task.status;

      // Update task properties
      task.status = status;
      task.updatedAt = new Date().toISOString();

      // Save updated tasks back to file
      await this.saveTasks(tasks);

      // Log the status change
      await this.logActivity({
        type: 'task_status_update',
        taskId,
        previousStatus,
        newStatus: status,
        progress,
        observations,
        blockers,
        timestamp: new Date().toISOString(),
      });

      return { success: true, task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<TaskWithContext | null> {
    const tasks = await this.loadTasks();
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      return null;
    }

    return this.enrichTaskWithContext(task);
  }

  /**
   * Get queue depth (number of pending tasks)
   */
  async getQueueDepth(): Promise<number> {
    const tasks = await this.loadTasks();
    return tasks.filter((t) => t.status === 'pending').length;
  }

  /**
   * Enrich task with additional context
   */
  private enrichTaskWithContext(task: Task): TaskWithContext {
    // Extract tech stack from description or type
    const techStack: string[] = [];
    if (task.description.toLowerCase().includes('typescript')) techStack.push('TypeScript');
    if (task.description.toLowerCase().includes('react')) techStack.push('React');
    if (task.description.toLowerCase().includes('node')) techStack.push('Node.js');

    return {
      ...task,
      context: {
        relatedFiles: [],
        relatedIssues: [],
        techStack,
      },
      acceptanceCriteria: task.testStrategy ? [task.testStrategy] : [],
    };
  }

  /**
   * Log agent activity
   */
  async logActivity(activity: Record<string, any>): Promise<void> {
    try {
      const logDir = path.join(this.workspaceRoot, '.orchestrator-output', 'logs');
      await fs.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, 'agent-activity.jsonl');
      const logEntry = JSON.stringify(activity) + '\n';

      await fs.appendFile(logFile, logEntry, 'utf-8');
    } catch (error) {
      // Log errors to stderr but don't fail the operation
      console.error('Failed to log activity:', error);
    }
  }
}
