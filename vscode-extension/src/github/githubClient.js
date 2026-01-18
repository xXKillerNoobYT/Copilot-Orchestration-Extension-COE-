/**
 * GitHub API client for issue and PR operations
 * Wraps REST API v3 endpoints for task integration
 */
/**
 * GitHub API client for managing issues
 */
export class GitHubClient {
    constructor(config) {
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
    async getIssue(owner, repo, issueNumber) {
        try {
            const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}`;
            const response = await this.fetch('GET', url);
            if (!response.ok) {
                if (response.status === 404)
                    return null;
                throw new Error(`Failed to get issue: ${response.status}`);
            }
            return (await response.json());
        }
        catch (error) {
            throw new Error(`GitHub getIssue failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Create a new issue
     */
    async createIssue(owner, repo, data) {
        try {
            const url = `${this.baseUrl}/repos/${owner}/${repo}/issues`;
            const response = await this.fetch('POST', url, data);
            if (!response.ok) {
                throw new Error(`Failed to create issue: ${response.status}`);
            }
            return (await response.json());
        }
        catch (error) {
            throw new Error(`GitHub createIssue failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Update an issue
     */
    async updateIssue(owner, repo, issueNumber, data) {
        try {
            const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}`;
            const response = await this.fetch('PATCH', url, data);
            if (!response.ok) {
                throw new Error(`Failed to update issue: ${response.status}`);
            }
            return (await response.json());
        }
        catch (error) {
            throw new Error(`GitHub updateIssue failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * List issues in a repository
     */
    async listIssues(owner, repo, options) {
        try {
            const params = new URLSearchParams();
            if (options?.state)
                params.append('state', options.state);
            if (options?.labels?.length)
                params.append('labels', options.labels.join(','));
            if (options?.page)
                params.append('page', String(options.page));
            if (options?.per_page)
                params.append('per_page', String(options.per_page));
            const url = `${this.baseUrl}/repos/${owner}/${repo}/issues?${params.toString()}`;
            const response = await this.fetch('GET', url);
            if (!response.ok) {
                throw new Error(`Failed to list issues: ${response.status}`);
            }
            return (await response.json());
        }
        catch (error) {
            throw new Error(`GitHub listIssues failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Close an issue
     */
    async closeIssue(owner, repo, issueNumber) {
        return this.updateIssue(owner, repo, issueNumber, { state: 'closed' });
    }
    /**
     * Reopen an issue
     */
    async reopenIssue(owner, repo, issueNumber) {
        return this.updateIssue(owner, repo, issueNumber, { state: 'open' });
    }
    /**
     * Validate GitHub credentials
     */
    async validateCredentials(owner, repo) {
        try {
            const url = `${this.baseUrl}/repos/${owner}/${repo}`;
            const response = await this.fetch('GET', url);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    /**
     * Make HTTP request
     */
    async fetch(method, url, body) {
        const fetchFn = globalThis.fetch;
        if (!fetchFn) {
            throw new Error('Global fetch is not available in this environment.');
        }
        const options = {
            method,
            headers: this.headers,
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        return fetchFn(url, options);
    }
}
