/**
 * GitHub API client for issue and PR operations
 * Wraps REST API v3 endpoints for task integration
 */

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
  milestone?: { number: number; title: string };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubCreateIssueRequest {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface GitHubUpdateIssueRequest {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  token: string;
  baseUrl?: string;
}

/**
 * GitHub API client for managing issues
 */
export class GitHubClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: GitHubSyncConfig) {
    this.baseUrl = config.baseUrl || 'https://api.github.com';
    this.headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${config.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get an issue by number
   */
  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue | null> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}`;
      const response = await this.fetch('GET', url);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to get issue: ${response.status}`);
      }
      return (await response.json()) as GitHubIssue;
    } catch (error) {
      throw new Error(`GitHub getIssue failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(owner: string, repo: string, data: GitHubCreateIssueRequest): Promise<GitHubIssue> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/issues`;
      const response = await this.fetch('POST', url, data as unknown as Record<string, unknown>);
      if (!response.ok) {
        throw new Error(`Failed to create issue: ${response.status}`);
      }
      return (await response.json()) as GitHubIssue;
    } catch (error) {
      throw new Error(`GitHub createIssue failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an issue
   */
  async updateIssue(owner: string, repo: string, issueNumber: number, data: GitHubUpdateIssueRequest): Promise<GitHubIssue> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}`;
      const response = await this.fetch('PATCH', url, data as unknown as Record<string, unknown>);
      if (!response.ok) {
        throw new Error(`Failed to update issue: ${response.status}`);
      }
      return (await response.json()) as GitHubIssue;
    } catch (error) {
      throw new Error(`GitHub updateIssue failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List issues in a repository
   */
  async listIssues(
    owner: string,
    repo: string,
    options?: { state?: 'open' | 'closed'; labels?: string[]; page?: number; per_page?: number }
  ): Promise<GitHubIssue[]> {
    try {
      const params = new URLSearchParams();
      if (options?.state) params.append('state', options.state);
      if (options?.labels?.length) params.append('labels', options.labels.join(','));
      if (options?.page) params.append('page', String(options.page));
      if (options?.per_page) params.append('per_page', String(options.per_page));

      const url = `${this.baseUrl}/repos/${owner}/${repo}/issues?${params.toString()}`;
      const response = await this.fetch('GET', url);
      if (!response.ok) {
        throw new Error(`Failed to list issues: ${response.status}`);
      }
      return (await response.json()) as GitHubIssue[];
    } catch (error) {
      throw new Error(`GitHub listIssues failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close an issue
   */
  async closeIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issueNumber, { state: 'closed' });
  }

  /**
   * Reopen an issue
   */
  async reopenIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issueNumber, { state: 'open' });
  }

  /**
   * Validate GitHub credentials
   */
  async validateCredentials(owner: string, repo: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}`;
      const response = await this.fetch('GET', url);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Make HTTP request
   */
  private async fetch(method: string, url: string, body?: Record<string, unknown>): Promise<Response> {
    const fetchFn = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
    if (!fetchFn) {
      throw new Error('Global fetch is not available in this environment.');
    }

    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetchFn(url, options);
  }
}
