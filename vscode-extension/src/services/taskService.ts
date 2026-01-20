/**
 * Task Service
 * Service for fetching and managing tasks from the Laravel backend API
 */

import * as vscode from 'vscode';

export interface Task {
  id: string;
  project_id: string;
  parent_task_id?: string;
  github_issue_id?: number;
  github_issue_url?: string;
  name: string;
  description?: string;
  task_type: 'feature' | 'bug' | 'refactor' | 'maintenance' | 'architecture' | 'testing' | 'documentation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'in_progress' | 'testing' | 'review' | 'completed' | 'failed' | 'blocked' | 'cancelled';
  assigned_agent?: string;
  assigned_github_agent?: string;
  branch_name?: string;
  context_bundle_path?: string;
  estimated_effort?: number; // in minutes
  actual_effort?: number; // in minutes
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Relationships
  dependencies?: TaskDependency[];
  subtasks?: Task[];
  dependencyCount?: number;
  subtaskCount?: number;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'blocks' | 'relates_to' | 'duplicates';
  created_at: string;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  task_type?: string;
  assigned_agent?: string;
}

export class TaskService {
  private baseUrl!: string;
  private authToken?: string;
  private cache: Map<string, { tasks: Task[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private static instance: TaskService;

  private constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from VS Code settings
   */
  private loadConfig(): void {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    this.baseUrl = config.get<string>('backendUrl', 'http://localhost:8000');
    this.authToken = config.get<string>('authToken') || process.env.COPILOT_AUTH_TOKEN;
  }

  static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  /**
   * Invalidate cache and reload configuration when config changes
   */
  static invalidateInstance(): void {
    if (TaskService.instance) {
      TaskService.instance.clearCache();
      TaskService.instance.loadConfig();
    }
  }

  /**
   * Get tasks for a project with optional filters
   */
  async getTasks(projectId: string, filters?: TaskFilters): Promise<Task[]> {
    const cacheKey = `${projectId}-${JSON.stringify(filters || {})}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.tasks;
    }

    try {
      const url = new URL(`${this.baseUrl}/api/v1/projects/${projectId}/tasks`);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            url.searchParams.append(key, value);
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      const tasks = data.data || [];

      // Enrich tasks with counts
      const enrichedTasks = tasks.map((task: Task) => ({
        ...task,
        dependencyCount: task.dependencies?.length || 0,
        subtaskCount: task.subtasks?.length || 0,
      }));

      // Update cache
      this.cache.set(cacheKey, { tasks: enrichedTasks, timestamp: Date.now() });

      return enrichedTasks;
    } catch (error) {
      console.error('[TaskService] Failed to fetch tasks:', error);
      vscode.window.showErrorMessage(
        `Failed to fetch tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return [];
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      console.error('[TaskService] Failed to fetch task:', error);
      return null;
    }
  }

  /**
   * Get tasks by category (maps to status filters)
   */
  async getTasksByCategory(projectId: string, category: string): Promise<Task[]> {
    const statusFilters = this.getCategoryStatusFilters(category);
    
    // For categories that map to multiple statuses, we need to fetch and combine
    if (statusFilters.length > 1) {
      const taskPromises = statusFilters.map(status => 
        this.getTasks(projectId, { status })
      );
      const taskArrays = await Promise.all(taskPromises);
      return taskArrays.flat();
    } else if (statusFilters.length === 1) {
      return this.getTasks(projectId, { status: statusFilters[0] });
    }
    
    return [];
  }

  /**
   * Map category to status filters
   */
  private getCategoryStatusFilters(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'ready': ['pending', 'approved'],
      'in-progress': ['in_progress'],
      'blocked': ['blocked'],
      'testing': ['testing', 'review'],
      'completed': ['completed'],
    };

    return categoryMap[category] || [];
  }

  /**
   * Get current project ID from workspace
   * Falls back to a default project if not configured
   */
  getProjectId(): string {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    return config.get<string>('projectId', 'default-project-id');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Refresh cache for a specific project
   */
  async refreshProject(projectId: string): Promise<void> {
    // Clear all cache entries for this project
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(projectId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));

    // Fetch fresh data for common categories sequentially to avoid overwhelming the backend
    const categories = ['ready', 'in-progress', 'blocked', 'testing', 'completed'];
    for (const category of categories) {
      try {
        await this.getTasksByCategory(projectId, category);
      } catch (error) {
        console.error(`[TaskService] Failed to refresh category "${category}" for project ${projectId}:`, error);
        // Continue with other categories even if one fails
      }
    }
  }
}
