/**
 * GitHub Authentication Provider
 * 
 * Handles authentication flow for GitHub Copilot Agent Mode API:
 * - Token validation with GitHub API
 * - Secure credential storage using VS Code Secret Storage
 * - Token refresh mechanism
 * - Session management
 */

import * as vscode from 'vscode';

export interface AuthenticationResult {
  /** Whether authentication was successful */
  success: boolean;
  /** Authentication token if successful */
  token?: string;
  /** Error message if failed */
  error?: string;
  /** Token expiration time (if available) */
  expiresAt?: Date;
}

export interface TokenValidationResult {
  /** Whether token is valid */
  valid: boolean;
  /** GitHub user login */
  login?: string;
  /** Scopes available with this token */
  scopes?: string[];
  /** Error message if invalid */
  error?: string;
}

/**
 * GitHub Authentication Provider
 * 
 * Manages authentication state and credentials for GitHub integration
 */
export class GitHubAuthProvider {
  private static readonly SECRET_KEY = 'copilot-orchestrator.github.token';
  private static readonly GITHUB_API_BASE = 'https://api.github.com';
  
  constructor(private readonly secretStorage: vscode.SecretStorage) {}

  /**
   * Authenticate with GitHub
   * 
   * Prompts user for token if not stored, validates it, and stores securely
   * 
   * @returns Authentication result with token if successful
   */
  async authenticate(): Promise<AuthenticationResult> {
    try {
      // Try to get stored token first
      let token = await this.getStoredToken();
      
      if (!token) {
        // Prompt user for token
        token = await this.promptForToken();
        if (!token) {
          return {
            success: false,
            error: 'Authentication cancelled by user',
          };
        }
      }
      
      // Validate token with GitHub API
      const validation = await this.validateToken(token);
      
      if (!validation.valid) {
        // Clear invalid token
        await this.clearToken();
        return {
          success: false,
          error: validation.error || 'Invalid GitHub token',
        };
      }
      
      // Store valid token
      await this.storeToken(token);
      
      return {
        success: true,
        token,
      };
      
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Validate a GitHub token
   * 
   * @param token - GitHub personal access token
   * @returns Validation result with user info if valid
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const response = await fetch(`${GitHubAuthProvider.GITHUB_API_BASE}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      
      if (!response.ok) {
        return {
          valid: false,
          error: `GitHub API returned ${response.status}: ${response.statusText}`,
        };
      }
      
      const user = await response.json();
      
      // Extract scopes from response headers
      const scopesHeader = response.headers.get('x-oauth-scopes');
      const scopes = scopesHeader ? scopesHeader.split(',').map(s => s.trim()) : [];
      
      return {
        valid: true,
        login: user.login,
        scopes,
      };
      
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get stored GitHub token
   * 
   * @returns Stored token or undefined if not found
   */
  async getStoredToken(): Promise<string | undefined> {
    return await this.secretStorage.get(GitHubAuthProvider.SECRET_KEY);
  }

  /**
   * Store GitHub token securely
   * 
   * @param token - GitHub personal access token
   */
  async storeToken(token: string): Promise<void> {
    await this.secretStorage.store(GitHubAuthProvider.SECRET_KEY, token);
  }

  /**
   * Clear stored GitHub token
   */
  async clearToken(): Promise<void> {
    await this.secretStorage.delete(GitHubAuthProvider.SECRET_KEY);
  }

  /**
   * Check if user is authenticated
   * 
   * @returns true if token is stored and valid
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    if (!token) {
      return false;
    }
    
    const validation = await this.validateToken(token);
    return validation.valid;
  }

  /**
   * Prompt user for GitHub token
   * 
   * @returns Token entered by user or undefined if cancelled
   */
  private async promptForToken(): Promise<string | undefined> {
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your GitHub Personal Access Token',
      password: true,
      placeHolder: 'ghp_...',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) {
          return 'Token is required';
        }
        if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
          return 'Invalid token format. Expected format: ghp_... or github_pat_...';
        }
        return undefined;
      },
    });
    
    return token;
  }

  /**
   * Refresh authentication
   * 
   * Validates current token and re-authenticates if invalid
   * 
   * @returns true if authentication is valid after refresh
   */
  async refresh(): Promise<boolean> {
    const token = await this.getStoredToken();
    if (!token) {
      const result = await this.authenticate();
      return result.success;
    }
    
    const validation = await this.validateToken(token);
    if (!validation.valid) {
      await this.clearToken();
      const result = await this.authenticate();
      return result.success;
    }
    
    return true;
  }
}
