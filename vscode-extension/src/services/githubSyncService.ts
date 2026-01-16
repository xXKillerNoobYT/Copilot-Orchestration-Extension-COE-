/**
 * GitHub-Task bidirectional synchronization service
 * Keeps GitHub issues and COE tasks in sync
 */

import { GitHubClient, GitHubIssue, GitHubUpdateIssueRequest } from '../github/githubClient';
import { SyncEvent } from '../github/webhookHandler';

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

  constructor(config: SyncConfig) {
    this.config = config;
    this.client = new GitHubClient({
      owner: config.owner,
      repo: config.repo,
      token: config.githubToken,
    });
  }

  /**
   * Sync a task to GitHub as an issue
   */
  async syncTaskToGitHub(task: TaskData): Promise<GitHubIssue | null> {
    try {
      const existingIssue = task.github_issue_id ? await this.client.getIssue(this.config.owner, this.config.repo, task.github_issue_id) : null;

      if (existingIssue) {
        // Update existing issue
        const updateData: GitHubUpdateIssueRequest = {
          title: task.title,
          body: task.description || '',
          state: mapTaskStatusToGitHubState(task.status),
          labels: task.labels,
          assignees: task.assignees,
        };

        const updated = await this.client.updateIssue(this.config.owner, this.config.repo, existingIssue.number, updateData);
        this.logSync('task_to_github_update', `Updated issue #${existingIssue.number} from task ${task.id}`);
        return updated;
      } else {
        // Create new issue
        const created = await this.client.createIssue(this.config.owner, this.config.repo, {
          title: task.title,
          body: `Task ID: ${task.id}\n\n${task.description || ''}`,
          labels: task.labels,
          assignees: task.assignees,
        });

        this.logSync('task_to_github_create', `Created issue #${created.number} for task ${task.id}`);
        return created;
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
      // Limit to 30 issues per sync to avoid rate limiting
      const issues = await this.client.listIssues(this.config.owner, this.config.repo, { per_page: 30 });

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

      this.logSync('full_sync', `Full sync completed: ${synced} synced, ${errors} errors (limited to 30 issues)`);
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
