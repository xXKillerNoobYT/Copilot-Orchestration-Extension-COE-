/**
 * Service Factory
 * Provides centralized singleton instances for TaskManager and GitHubIntegration
 */

import { TaskManager } from '../../services/taskManager.js';
import { GitHubIntegration } from './githubIntegration.js';

// Singleton instances
let githubIntegrationInstance: GitHubIntegration | null = null;

/**
 * Get singleton TaskManager instance (from services/taskManager)
 * This now uses the database-backed implementation
 */
export function getTaskManager(): TaskManager {
  return TaskManager.getInstance();
}

/**
 * Get singleton GitHubIntegration instance
 * Reads configuration from environment variables
 */
export function getGitHubIntegration(): GitHubIntegration {
  if (!githubIntegrationInstance) {
    // Read configuration from environment
    // If variables are missing, GitHubIntegration will report itself as unavailable
    const owner = process.env.GITHUB_OWNER || '';
    const repo = process.env.GITHUB_REPO || '';
    const token = process.env.GITHUB_TOKEN || '';

    githubIntegrationInstance = new GitHubIntegration({ owner, repo, token });
  }
  return githubIntegrationInstance;
}

/**
 * Reset singleton instances (useful for testing)
 */
export function resetServices(): void {
  TaskManager.resetInstance();
  githubIntegrationInstance = null;
}
