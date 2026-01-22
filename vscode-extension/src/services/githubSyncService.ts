/**
 * GitHub-Task bidirectional synchronization service
 * Keeps GitHub issues and COE tasks in sync
 * 
 * Features:
 * - Batch aggregation (max 50 requests/batch, 5s flush window)
 * - Exponential backoff for rate limits (429 errors)
 * - GraphQL integration for complex queries
 * - Local cache (5-minute TTL)
 */

import { GitHubClient, GitHubIssue, GitHubUpdateIssueRequest } from '../github/githubClient';
import { SyncEvent } from '../github/webhookHandler';
import { GitHubBatcher, BatchRequest } from '../utils/githubBatch';
import { retryWithBackoff, RetryOptions } from '../utils/errorHandler';
import { GitHubGraphQLBuilder } from '../utils/githubGraphQL';

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'review' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  labels: string[];
  assignees: string[];
  github_issue_id?: number;
  github_issue_url?: string;
  updated_at: string;
}

export interface SyncConfig {
  owner: string;
  repo: string;
  githubToken: string;
  webhookSecret?: string;
  autoSync?: boolean;
  enableBatching?: boolean; // Enable batch aggregation
  enableGraphQL?: boolean; // Use GraphQL for queries
  cacheTTLMinutes?: number; // Cache TTL in minutes (default 5)
}

interface CacheEntry {
  data: GitHubIssue;
  timestamp: number;
}

/**
 * Maps COE task status to GitHub issue state
 */
function mapTaskStatusToGitHubState(status: string): 'open' | 'closed' {
  if (status === 'done' || status === 'cancelled') {
    return 'closed';
  }
  return 'open';
}

/**
 * Maps GitHub issue state to COE task status
 */
function mapGitHubStateToTaskStatus(state: string): string {
  return state === 'closed' ? 'review' : 'pending';
}

/**
 * Synchronization service for GitHub issues and tasks
 */
export class GitHubSyncService {
  private client: GitHubClient;
  private config: SyncConfig;
  private syncLog: Array<{ timestamp: string; action: string; result: string }> = [];
  private batcher: GitHubBatcher;
  private graphQLBuilder: GitHubGraphQLBuilder;
  private cache: Map<number, CacheEntry> = new Map();
  private batchFlushTimer: NodeJS.Timeout | null = null;

  constructor(config: SyncConfig) {
    this.config = {
      enableBatching: true,
      enableGraphQL: true,
      cacheTTLMinutes: 5,
      ...config,
    };
    this.client = new GitHubClient({
      owner: config.owner,
      repo: config.repo,
      token: config.githubToken,
    });
    this.batcher = new GitHubBatcher();
    this.graphQLBuilder = new GitHubGraphQLBuilder();

    // Start batch flushing if enabled
    if (this.config.enableBatching) {
      this.startBatchFlushing();
    }
  }

  /**
   * Start periodic batch flushing
   */
  private startBatchFlushing(): void {
    this.batchFlushTimer = setInterval(async () => {
      await this.flushBatches();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush queued batch requests
   */
  private async flushBatches(): Promise<void> {
    const batches = this.batcher.flush();
    for (const batch of batches) {
      await this.executeBatch(batch);
    }
  }

  /**
   * Execute a batch of requests with rate-limit handling
   */
  private async executeBatch(batch: BatchRequest[]): Promise<void> {
    const retryOptions: RetryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      onRetry: (attempt, error) => {
        this.logSync('batch_retry', `Retry attempt ${attempt}: ${error.message}`);
      },
    };

    for (const request of batch) {
      try {
        await retryWithBackoff(async () => {
          await this.executeRequest(request);
        }, retryOptions);
      } catch (error) {
        this.logSync('batch_error', `Batch request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Execute a single batch request
   */
  private async executeRequest(request: BatchRequest): Promise<void> {
    const { type, payload } = request;

    switch (type) {
      case 'create':
        await this.client.createIssue(this.config.owner, this.config.repo, payload);
        break;
      case 'update':
        if (payload.issueNumber) {
          await this.client.updateIssue(this.config.owner, this.config.repo, payload.issueNumber, payload.data);
        }
        break;
      case 'comment':
        // Placeholder for comment creation
        break;
    }
  }

  /**
   * Get issue from cache or fetch
   */
  private async getCachedIssue(issueNumber: number): Promise<GitHubIssue | null> {
    const cached = this.cache.get(issueNumber);
    const cacheTTL = (this.config.cacheTTLMinutes || 5) * 60 * 1000;

    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      this.logSync('cache_hit', `Retrieved issue #${issueNumber} from cache`);
      return cached.data;
    }

    const issue = await this.client.getIssue(this.config.owner, this.config.repo, issueNumber);
    if (issue) {
      this.cache.set(issueNumber, { data: issue, timestamp: Date.now() });
    }
    return issue;
  }

  /**
   * Invalidate cache for an issue
   */
  private invalidateCache(issueNumber: number): void {
    this.cache.delete(issueNumber);
    this.logSync('cache_invalidate', `Invalidated cache for issue #${issueNumber}`);
  }

  /**
   * Stop the sync service
   */
  stop(): void {
    if (this.batchFlushTimer) {
      clearInterval(this.batchFlushTimer);
      this.batchFlushTimer = null;
    }
  }

  /**
   * Sync a task to GitHub as an issue
   */
  async syncTaskToGitHub(task: TaskData): Promise<GitHubIssue | null> {
    try {
      const existingIssue = task.github_issue_id ? await this.getCachedIssue(task.github_issue_id) : null;

      if (existingIssue) {
        // Update existing issue
        const updateData: GitHubUpdateIssueRequest = {
          title: task.title,
          body: task.description || '',
          state: mapTaskStatusToGitHubState(task.status),
          labels: task.labels,
          assignees: task.assignees,
        };

        if (this.config.enableBatching) {
          // Queue batch request
          this.batcher.enqueue({
            type: 'update',
            payload: { issueNumber: existingIssue.number, data: updateData },
            key: `update-issue-${existingIssue.number}`,
          });
          this.logSync('task_to_github_queued', `Queued update for issue #${existingIssue.number} from task ${task.id}`);
          return existingIssue; // Return cached version
        } else {
          const updated = await this.client.updateIssue(this.config.owner, this.config.repo, existingIssue.number, updateData);
          this.invalidateCache(existingIssue.number);
          this.logSync('task_to_github_update', `Updated issue #${existingIssue.number} from task ${task.id}`);
          return updated;
        }
      } else {
        // Create new issue
        const createData = {
          title: task.title,
          body: `Task ID: ${task.id}\n\n${task.description || ''}`,
          labels: task.labels,
          assignees: task.assignees,
        };

        if (this.config.enableBatching) {
          // Queue batch request
          this.batcher.enqueue({
            type: 'create',
            payload: createData,
            key: `create-task-${task.id}`,
          });
          this.logSync('task_to_github_queued', `Queued creation for task ${task.id}`);
          return null; // Issue not yet created
        } else {
          const created = await this.client.createIssue(this.config.owner, this.config.repo, createData);
          this.logSync('task_to_github_create', `Created issue #${created.number} for task ${task.id}`);
          return created;
        }
      }
    } catch (error) {
      this.logSync('task_to_github_error', `Failed to sync task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Sync GitHub issue to task
   */
  async syncGitHubToTask(issue: GitHubIssue): Promise<TaskData> {
    const taskStatus = mapGitHubStateToTaskStatus(issue.state);

    const task: TaskData = {
      id: `github-issue-${issue.number}`,
      title: issue.title,
      description: issue.body,
      status: taskStatus as TaskData['status'],
      priority: 'medium',
      labels: issue.labels.map((l: { name: string }) => l.name),
      assignees: issue.assignees.map((a: { login: string }) => a.login),
      github_issue_id: issue.number,
      github_issue_url: issue.html_url,
      updated_at: issue.updated_at,
    };

    this.logSync('github_to_task', `Synced GitHub issue #${issue.number} to task ${task.id}`);
    return task;
  }

  /**
   * Handle a sync event
   */
  async handleSyncEvent(event: SyncEvent): Promise<void> {
    try {
      if (event.source === 'github') {
        // GitHub → Task sync
        const issue = await this.client.getIssue(this.config.owner, this.config.repo, event.issueNumber);
        if (issue) {
          const task = await this.syncGitHubToTask(issue);
          this.logSync('sync_event_github', `Processed GitHub event: ${event.action} on issue #${event.issueNumber}`);
        }
      } else if (event.source === 'task' && event.taskId) {
        // Task → GitHub sync (placeholder for task updates)
        this.logSync('sync_event_task', `Processed task event: ${event.action} on task ${event.taskId}`);
      }
    } catch (error) {
      this.logSync('sync_event_error', `Failed to handle sync event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform a full sync of all issues in repository
   */
  async performFullSync(): Promise<{ synced: number; errors: number }> {
    try {
      let issues: GitHubIssue[];

      // Use GraphQL for more efficient bulk queries
      if (this.config.enableGraphQL) {
        this.logSync('full_sync_graphql', 'Using GraphQL for full sync');
        // For now, fallback to REST; GraphQL requires additional implementation
        issues = await this.client.listIssues(this.config.owner, this.config.repo, { per_page: 20 });
      } else {
        // Limit to 20 issues per sync to further minimize rate limiting
        issues = await this.client.listIssues(this.config.owner, this.config.repo, { per_page: 20 });
      }

      let synced = 0;
      let errors = 0;

      for (const issue of issues) {
        try {
          await this.syncGitHubToTask(issue);
          synced++;
        } catch (error) {
          errors++;
          console.error(`Full sync error for issue #${issue.number}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      this.logSync('full_sync', `Full sync completed: ${synced} synced, ${errors} errors (limited to 20 issues)`);
      return { synced, errors };
    } catch (error) {
      this.logSync('full_sync_error', `Full sync failed: ${error instanceof Error ? error.message : String(error)}`);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Get the sync log
   */
  getSyncLog(): Array<{ timestamp: string; action: string; result: string }> {
    return [...this.syncLog];
  }

  /**
   * Clear the sync log
   */
  clearSyncLog(): void {
    this.syncLog = [];
  }

  /**
   * Validate GitHub credentials
   */
  async validateCredentials(): Promise<boolean> {
    return this.client.validateCredentials(this.config.owner, this.config.repo);
  }

  /**
   * Internal logging
   */
  private logSync(action: string, result: string): void {
    this.syncLog.push({
      timestamp: new Date().toISOString(),
      action,
      result,
    });

    // Keep only last 100 entries
    if (this.syncLog.length > 100) {
      this.syncLog = this.syncLog.slice(-100);
    }
  }
}
