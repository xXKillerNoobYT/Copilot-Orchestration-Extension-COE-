/**
 * GitHub Integration for MCP Server
 * Handles GitHub Issues API integration for task creation
 */
class GitHubClient {
    constructor(config) {
        this.baseUrl = 'https://api.github.com';
        this.owner = config.owner;
        this.repo = config.repo;
        this.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${config.token}`,
            'Content-Type': 'application/json',
        };
    }
    async createIssue(data) {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/issues`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`Failed to create issue: ${response.status}`);
        }
        return (await response.json());
    }
}
export class GitHubIntegration {
    constructor(config) {
        this.client = null;
        this.config = config;
        // Only initialize client if all required config is available
        if (config.token && config.owner && config.repo) {
            this.client = new GitHubClient({
                owner: config.owner,
                repo: config.repo,
                token: config.token,
            });
        }
    }
    /**
     * Create a GitHub issue for test failure investigation
     */
    async createTestFailureIssue(options) {
        if (!this.client) {
            return {
                success: false,
                error: 'GitHub client not configured. Please set GITHUB_TOKEN environment variable.',
            };
        }
        try {
            const body = `## Test Failure Report

**Task ID**: ${options.taskId}
**Test Name**: \`${options.testName}\`
**Error**: ${options.errorMessage}

${options.stackTrace ? `### Stack Trace\n\`\`\`\n${options.stackTrace}\n\`\`\`` : ''}

---
*This issue was automatically created by the Copilot Orchestrator MCP server.*`;
            const issueData = {
                title: `[Test Failure] ${options.testName}`,
                body,
                labels: ['bug', 'test-failure', 'auto-generated'],
            };
            const issue = await this.client.createIssue(issueData);
            return { success: true, issue };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Create a GitHub issue for observation reporting
     */
    async createObservationIssue(options) {
        if (!this.client) {
            return {
                success: false,
                error: 'GitHub client not configured. Please set GITHUB_TOKEN environment variable.',
            };
        }
        try {
            const labels = ['auto-generated'];
            // Add labels based on type and severity
            if (options.type === 'issue' || options.type === 'risk') {
                labels.push('bug');
            }
            if (options.severity === 'high' || options.severity === 'critical') {
                labels.push('priority: high');
            }
            const body = `## ${options.type.charAt(0).toUpperCase() + options.type.slice(1)} Report

**Severity**: ${options.severity}
**Description**: ${options.message}

${options.suggestedAction ? `### Suggested Action\n${options.suggestedAction}` : ''}

---
*This issue was automatically created by the Copilot Orchestrator MCP server.*`;
            const issueData = {
                title: `[${options.type.toUpperCase()}] ${options.message.substring(0, 80)}`,
                body,
                labels,
            };
            const issue = await this.client.createIssue(issueData);
            return { success: true, issue };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Check if GitHub integration is available
     */
    isAvailable() {
        return this.client !== null;
    }
}
