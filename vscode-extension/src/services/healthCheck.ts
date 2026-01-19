/**
 * Extension Health Check Service
 * Validates extension prerequisites and displays diagnostics to users
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { WebSocketConfigManager } from './webSocketConfigManager';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  details?: string;
  fix?: string;
  optional?: boolean;
}

export interface OverallHealth {
  status: HealthStatus;
  timestamp: Date;
  checks: HealthCheckResult[];
  summary: string;
}

/**
 * Health Check Service
 * Runs diagnostic checks on extension startup and on-demand
 */
export class HealthCheckService {
  private static instance: HealthCheckService | undefined;
  private cachedResult: OverallHealth | undefined;
  private readonly CACHE_DURATION_MS = 60000; // 1 minute
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem | undefined;
  private isRunning: boolean = false;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Copilot Orchestrator Health');
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Run all health checks
   * @param useCache Whether to use cached results if available
   */
  async runHealthCheck(useCache: boolean = true): Promise<OverallHealth> {
    // Return cached result if valid
    if (useCache && this.cachedResult && this.isCacheValid()) {
      return this.cachedResult;
    }

    // Prevent concurrent health checks
    if (this.isRunning) {
      console.log('[HealthCheck] Health check already in progress, waiting for completion');
      // Wait a bit and return cached result if available, or throw
      await new Promise(resolve => setTimeout(resolve, 100));
      if (this.cachedResult) {
        return this.cachedResult;
      }
      throw new Error('Health check already in progress');
    }

    this.isRunning = true;
    try {
      const checks: HealthCheckResult[] = [];

      // Run all checks in parallel for speed
      const checkResults = await Promise.allSettled([
        this.checkBackendUrlConfigured(),
        this.checkBackendReachable(),
        this.checkPlansDirectory(),
        this.checkPlansExist(),
        this.checkMcpServerReachable(),
        this.checkWebSocketConfiguration(),
        this.checkVSCodeVersion(),
      ]);

      // Collect results
      checkResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          checks.push(result.value);
        } else {
          // If a check itself throws an error, mark as unhealthy
          checks.push({
            name: 'Unknown Check',
            status: 'unhealthy',
            message: 'Check failed to run',
            details: result.reason?.message || 'Unknown error',
          });
        }
      });

      // Calculate overall status
      const overallStatus = this.calculateOverallStatus(checks);
      const summary = this.generateSummary(checks, overallStatus);

      const result: OverallHealth = {
        status: overallStatus,
        timestamp: new Date(),
        checks,
        summary,
      };

      // Cache the result
      this.cachedResult = result;

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if backend URL is configured
   */
  private async checkBackendUrlConfigured(): Promise<HealthCheckResult> {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    const backendUrl = config.get<string>('backendUrl', '');

    if (!backendUrl || backendUrl.trim() === '') {
      return {
        name: 'Backend URL',
        status: 'unhealthy',
        message: 'Backend URL not configured',
        details: 'Extension requires a backend server URL to function',
        fix: 'Open Settings (Ctrl+,) and set "copilot-orchestrator.backendUrl" to your Laravel backend URL (e.g., http://localhost:8000)',
      };
    }

    // Validate URL format
    try {
      new URL(backendUrl);
    } catch (e) {
      return {
        name: 'Backend URL',
        status: 'unhealthy',
        message: 'Backend URL is invalid',
        details: `URL "${backendUrl}" is not a valid HTTP(S) URL`,
        fix: 'Open Settings and set "copilot-orchestrator.backendUrl" to a valid URL (e.g., http://localhost:8000)',
      };
    }

    return {
      name: 'Backend URL',
      status: 'healthy',
      message: `Configured: ${backendUrl}`,
    };
  }

  /**
   * Check if backend server is reachable
   */
  private async checkBackendReachable(): Promise<HealthCheckResult> {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    const backendUrl = config.get<string>('backendUrl', '');

    if (!backendUrl) {
      return {
        name: 'Backend Reachable',
        status: 'unhealthy',
        message: 'Cannot check - backend URL not configured',
      };
    }

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      let response: Response;
      try {
        // Try to ping the backend health endpoint
        response = await fetch(`${backendUrl}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });
      } catch (primaryError) {
        // If /api/health doesn't exist or is unreachable, try root as a fallback
        response = await fetch(backendUrl, {
          method: 'GET',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const elapsed = Date.now() - startTime;

      if (response.ok) {
        return {
          name: 'Backend Reachable',
          status: 'healthy',
          message: `Responded in ${elapsed}ms`,
        };
      } else {
        return {
          name: 'Backend Reachable',
          status: 'degraded',
          message: `Server responded with status ${response.status}`,
          details: 'Backend is reachable but may not be functioning correctly',
          fix: 'Check that your Laravel backend is running and accessible',
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          name: 'Backend Reachable',
          status: 'unhealthy',
          message: 'Connection timeout (>5s)',
          details: 'Backend server did not respond within 5 seconds',
          fix: 'Ensure Laravel backend is running at the configured URL. Run: php artisan serve',
        };
      }

      return {
        name: 'Backend Reachable',
        status: 'unhealthy',
        message: 'Connection failed',
        details: error.message || 'Unknown network error',
        fix: 'Ensure Laravel backend is running at the configured URL. Run: php artisan serve',
      };
    }
  }

  /**
   * Check if plans directory exists
   */
  private async checkPlansDirectory(): Promise<HealthCheckResult> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return {
        name: 'Plans Directory',
        status: 'degraded',
        message: 'No workspace folder open',
        details: 'Cannot check plans directory without an open workspace',
        fix: 'Open a workspace folder containing your project',
      };
    }

    const plansPath = path.join(workspaceFolder.uri.fsPath, 'Docs', 'Plans');

    try {
      const stat = await fs.stat(plansPath);
      if (stat.isDirectory()) {
        return {
          name: 'Plans Directory',
          status: 'healthy',
          message: `Exists: ${plansPath}`,
        };
      } else {
        return {
          name: 'Plans Directory',
          status: 'unhealthy',
          message: 'Path exists but is not a directory',
          details: plansPath,
          fix: 'Create Docs/Plans directory in your workspace root',
        };
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          name: 'Plans Directory',
          status: 'degraded',
          message: 'Directory does not exist',
          details: plansPath,
          fix: 'Create Docs/Plans directory in your workspace root',
        };
      }

      return {
        name: 'Plans Directory',
        status: 'unhealthy',
        message: 'Error checking directory',
        details: error.message,
      };
    }
  }

  /**
   * Check if any plans exist
   */
  private async checkPlansExist(): Promise<HealthCheckResult> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return {
        name: 'Plans Found',
        status: 'degraded',
        message: 'Cannot check - no workspace folder',
      };
    }

    const plansPath = path.join(workspaceFolder.uri.fsPath, 'Docs', 'Plans');

    try {
      const files = await fs.readdir(plansPath);
      // Filter for JSON and markdown files
      const planFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.md'));

      if (planFiles.length === 0) {
        return {
          name: 'Plans Found',
          status: 'degraded',
          message: 'No plan files found',
          details: 'Directory exists but contains no .json or .md files',
          fix: 'Create or import plan files into Docs/Plans directory',
          optional: true,
        };
      }

      return {
        name: 'Plans Found',
        status: 'healthy',
        message: `${planFiles.length} file(s) found`,
      };
    } catch (error: any) {
      return {
        name: 'Plans Found',
        status: 'degraded',
        message: 'Cannot check plans',
        details: error.message,
        optional: true,
      };
    }
  }

  /**
   * Check if MCP server is reachable (optional)
   */
  private async checkMcpServerReachable(): Promise<HealthCheckResult> {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    const mcpUrl = config.get<string>('mcp.baseUrl', '');

    if (!mcpUrl || mcpUrl.trim() === '') {
      return {
        name: 'MCP Server',
        status: 'healthy',
        message: 'Not configured (optional)',
        optional: true,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      let response: Response;
      try {
        // Try a simple health check
        response = await fetch(`${mcpUrl}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });
      } catch (primaryError) {
        // If /api/health doesn't exist or is unreachable, try root as a fallback
        response = await fetch(mcpUrl, {
          method: 'GET',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.ok) {
        return {
          name: 'MCP Server',
          status: 'healthy',
          message: 'Reachable',
          optional: true,
        };
      } else {
        return {
          name: 'MCP Server',
          status: 'degraded',
          message: `Server responded with status ${response.status}`,
          optional: true,
        };
      }
    } catch (error: any) {
      return {
        name: 'MCP Server',
        status: 'degraded',
        message: 'Not reachable',
        details: error.message,
        fix: 'MCP server is optional. Configure "copilot-orchestrator.mcp.baseUrl" if you want to use MCP features',
        optional: true,
      };
    }
  }

  /**
   * Check WebSocket configuration validity
   */
  private async checkWebSocketConfiguration(): Promise<HealthCheckResult> {
    try {
      const wsSettings = WebSocketConfigManager.getConfig();
      const validationError = WebSocketConfigManager.validate(wsSettings);

      if (validationError) {
        return {
          name: 'WebSocket Config',
          status: 'degraded',
          message: 'Configuration invalid',
          details: validationError,
          fix: 'Open Settings and configure WebSocket settings under "copilot-orchestrator.webSocket"',
          optional: true,
        };
      }

      return {
        name: 'WebSocket Config',
        status: 'healthy',
        message: `Valid (driver: ${wsSettings.driver})`,
        optional: true,
      };
    } catch (error: any) {
      return {
        name: 'WebSocket Config',
        status: 'degraded',
        message: 'Error checking configuration',
        details: error.message,
        optional: true,
      };
    }
  }

  /**
   * Check VS Code version requirement
   */
  private async checkVSCodeVersion(): Promise<HealthCheckResult> {
    const currentVersion = vscode.version;
    const requiredVersion = '1.90.0'; // Minimum VS Code version from package.json engines.vscode (^1.90.0)

    // Simple version comparison (works for semver)
    const current = currentVersion.split('.').map(Number);
    const required = requiredVersion.split('.').map(Number);

    let meetsRequirement = true;
    for (let i = 0; i < 3; i++) {
      if (current[i] > required[i]) {
        break;
      } else if (current[i] < required[i]) {
        meetsRequirement = false;
        break;
      }
    }

    if (!meetsRequirement) {
      return {
        name: 'VS Code Version',
        status: 'unhealthy',
        message: `Version ${currentVersion} (required: ${requiredVersion}+)`,
        details: 'Extension may not function correctly on this VS Code version',
        fix: 'Update VS Code to the latest version',
      };
    }

    return {
      name: 'VS Code Version',
      status: 'healthy',
      message: `${currentVersion} (required: ${requiredVersion}+)`,
    };
  }

  /**
   * Calculate overall health status from individual checks
   */
  private calculateOverallStatus(checks: HealthCheckResult[]): HealthStatus {
    // If any critical (non-optional) check is unhealthy, overall is unhealthy
    const criticalChecks = checks.filter(c => !c.optional);
    const hasUnhealthy = criticalChecks.some(c => c.status === 'unhealthy');
    const hasDegraded = criticalChecks.some(c => c.status === 'degraded');

    if (hasUnhealthy) {
      return 'unhealthy';
    } else if (hasDegraded) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Generate summary message
   */
  private generateSummary(checks: HealthCheckResult[], status: HealthStatus): string {
    const criticalChecks = checks.filter(c => !c.optional);
    const healthyCount = criticalChecks.filter(c => c.status === 'healthy').length;
    const totalCritical = criticalChecks.length;

    if (status === 'healthy') {
      return 'All critical services operational. Extension ready to use.';
    } else if (status === 'degraded') {
      return `${healthyCount}/${totalCritical} critical checks passed. Some features may be limited.`;
    } else {
      return `${healthyCount}/${totalCritical} critical checks passed. Extension may not function correctly.`;
    }
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cachedResult) {
      return false;
    }

    const age = Date.now() - this.cachedResult.timestamp.getTime();
    return age < this.CACHE_DURATION_MS;
  }

  /**
   * Display health check results in output channel
   */
  displayResults(result: OverallHealth): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine(`[Extension Health Check - ${result.timestamp.toLocaleString()}]\n`);

    // Display each check
    for (const check of result.checks) {
      const icon = check.status === 'healthy' ? '✅' : check.status === 'degraded' ? '⚠️' : '❌';
      const optionalTag = check.optional ? ' (optional)' : '';
      
      this.outputChannel.appendLine(`${icon} ${check.name}${optionalTag}: ${check.message}`);
      
      if (check.details) {
        this.outputChannel.appendLine(`   Details: ${check.details}`);
      }
      
      if (check.fix) {
        this.outputChannel.appendLine(`   Fix: ${check.fix}`);
      }
      
      this.outputChannel.appendLine('');
    }

    // Display overall status
    const statusIcon = result.status === 'healthy' ? '🟢' : result.status === 'degraded' ? '🟡' : '🔴';
    const statusText = result.status.toUpperCase();
    
    this.outputChannel.appendLine(`Overall Health: ${statusText} ${statusIcon}`);
    this.outputChannel.appendLine(result.summary);

    this.outputChannel.show(true);
  }

  /**
   * Update status bar with health indicator
   */
  updateStatusBar(result: OverallHealth, statusBarItem: vscode.StatusBarItem): void {
    this.statusBarItem = statusBarItem;
    
    const icon = result.status === 'healthy' ? '$(check)' : result.status === 'degraded' ? '$(warning)' : '$(error)';
    const text = result.status === 'healthy' ? 'Healthy' : result.status === 'degraded' ? 'Degraded' : 'Unhealthy';
    
    statusBarItem.text = `${icon} Health: ${text}`;
    statusBarItem.tooltip = new vscode.MarkdownString([
      `**Extension Health: ${result.status.toUpperCase()}**`,
      '',
      result.summary,
      '',
      'Click to view details',
    ].join('\n'));
    
    statusBarItem.command = 'copilot-orchestrator.showHealthDetails';
    statusBarItem.show();
  }

  /**
   * Show welcome message if unhealthy
   */
  async showWelcomeIfUnhealthy(result: OverallHealth): Promise<void> {
    if (result.status === 'unhealthy') {
      const action = await vscode.window.showWarningMessage(
        'Copilot Orchestrator: Extension health check failed. Some features may not work correctly.',
        'View Details',
        'Open Settings'
      );

      if (action === 'View Details') {
        this.displayResults(result);
      } else if (action === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'copilot-orchestrator');
      }
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.outputChannel.dispose();
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }
  }
}
