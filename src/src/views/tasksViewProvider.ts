import * as vscode from 'vscode';
import { TaskService } from '../services/taskService';
import { TaskTreeItem, CategoryTreeItem } from './taskTreeItem';
import { getWebSocketClient } from '../services/webSocketClient';

/**
 * Tree data provider for the Tasks view in the Copilot Orchestrator sidebar
 */
export class TasksViewProvider implements vscode.TreeDataProvider<TaskTreeItem | CategoryTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskTreeItem | CategoryTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private taskService: TaskService;
  private lastRefresh = 0;
  private readonly REFRESH_DEBOUNCE_MS = 1000; // Max 1 refresh per second
  private refreshTimeout?: NodeJS.Timeout;
  private wsSubscriptions: Array<{ channel: string; event: string; callback: (data: any) => void }> = [];

  constructor(private context: vscode.ExtensionContext) {
    this.taskService = TaskService.getInstance();
    this.setupWebSocketListeners();
  }

  /**
   * Set up WebSocket listeners for real-time task updates
   */
  private setupWebSocketListeners(): void {
    const wsClient = getWebSocketClient();
    if (!wsClient) {
      console.warn('[TasksViewProvider] WebSocket client not available. Real-time updates disabled.');
      return;
    }

    // Define event subscriptions
    const events = ['taskCreated', 'taskUpdated', 'taskCompleted', 'taskStatusChanged'];
    
    events.forEach(event => {
      const callback = () => this.debouncedRefresh();
      wsClient.subscribe('tasks', event, callback);
      this.wsSubscriptions.push({ channel: 'tasks', event, callback });
    });
    
    console.log('[TasksViewProvider] WebSocket listeners registered');
  }

  /**
   * Refresh with debouncing (max 1 refresh per second)
   */
  private debouncedRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    const timeSinceLastRefresh = Date.now() - this.lastRefresh;
    const delay = Math.max(0, this.REFRESH_DEBOUNCE_MS - timeSinceLastRefresh);

    this.refreshTimeout = setTimeout(() => {
      this.refresh();
    }, delay);
  }

  /**
   * Force refresh the tree view
   */
  refresh(): void {
    this.lastRefresh = Date.now();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Refresh and clear cache
   */
  async refreshWithClear(): Promise<void> {
    this.taskService.clearCache();
    const projectId = this.taskService.getProjectId();
    await this.taskService.refreshProject(projectId);
    this.refresh();
  }

  getTreeItem(element: TaskTreeItem | CategoryTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskTreeItem | CategoryTreeItem): Promise<(TaskTreeItem | CategoryTreeItem)[]> {
    if (!element) {
      // Root level - show task categories
      return [
        new CategoryTreeItem(
          'Ready Tasks',
          'ready',
          vscode.TreeItemCollapsibleState.Expanded,
          'check-all'
        ),
        new CategoryTreeItem(
          'In Progress',
          'in-progress',
          vscode.TreeItemCollapsibleState.Expanded,
          'sync~spin'
        ),
        new CategoryTreeItem(
          'Blocked Tasks',
          'blocked',
          vscode.TreeItemCollapsibleState.Collapsed,
          'error'
        ),
        new CategoryTreeItem(
          'Testing',
          'testing',
          vscode.TreeItemCollapsibleState.Collapsed,
          'beaker'
        ),
        new CategoryTreeItem(
          'Completed',
          'completed',
          vscode.TreeItemCollapsibleState.Collapsed,
          'pass'
        ),
      ];
    } else if (element instanceof CategoryTreeItem) {
      // Get tasks for this category
      return this.getTasksForCategory(element.categoryId);
    }
    
    // TaskTreeItem has no children
    return [];
  }

  /**
   * Get tasks for a specific category from the backend
   */
  private async getTasksForCategory(category: string): Promise<TaskTreeItem[]> {
    try {
      const projectId = this.taskService.getProjectId();
      const tasks = await this.taskService.getTasksByCategory(projectId, category);
      
      return tasks.map(task => 
        new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None)
      );
    } catch (error) {
      console.error(`[TasksViewProvider] Failed to load tasks for category ${category}:`, error);
      // Error messaging is handled in TaskService, just return empty list here
      return [];
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Unsubscribe from WebSocket events
    const wsClient = getWebSocketClient();
    if (wsClient) {
      this.wsSubscriptions.forEach(({ channel, event, callback }) => {
        wsClient.unsubscribe(channel, event, callback);
      });
      this.wsSubscriptions = [];
    }
  }
}
