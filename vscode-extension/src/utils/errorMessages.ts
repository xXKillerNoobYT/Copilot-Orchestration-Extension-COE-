/**
 * Enhanced Error Message Builder
 * Provides actionable, user-friendly error messages with diagnostics and solutions
 */

import * as vscode from 'vscode';

export interface ErrorMessageOptions {
  /** The operation that failed */
  operation: string;
  /** The URL or endpoint that was attempted */
  attemptedUrl?: string;
  /** The underlying error */
  error: Error | unknown;
  /** Possible causes of the error */
  possibleCauses?: string[];
  /** Suggested solutions */
  solutions?: string[];
  /** Additional context */
  context?: string;
}

/**
 * Output channel for logging errors
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Initialize the output channel
 */
export function initializeErrorLogging(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Copilot Orchestrator');
  }
  return outputChannel;
}

/**
 * Get the output channel (creates if not exists)
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    return initializeErrorLogging();
  }
  return outputChannel;
}

/**
 * Build an enhanced error message with diagnostics and solutions
 */
export function buildEnhancedErrorMessage(options: ErrorMessageOptions): string {
  const { operation, attemptedUrl, error, possibleCauses, solutions, context } = options;
  
  const parts: string[] = [];
  
  // Header
  parts.push(`⚠️ ${operation} Failed\n`);
  
  // Error details
  if (context) {
    parts.push(`${context}\n`);
  }
  
  if (attemptedUrl) {
    parts.push(`  - Attempted: ${attemptedUrl}`);
  }
  
  // Error message
  const errorMessage = extractErrorMessage(error);
  parts.push(`  - Error: ${errorMessage}\n`);
  
  // Possible causes
  if (possibleCauses && possibleCauses.length > 0) {
    parts.push('Possible causes:');
    possibleCauses.forEach(cause => {
      parts.push(`  ✓ ${cause}`);
    });
    parts.push('');
  }
  
  // Solutions
  if (solutions && solutions.length > 0) {
    parts.push('Solutions:');
    solutions.forEach((solution, index) => {
      parts.push(`  ${index + 1}. ${solution}`);
    });
  }
  
  return parts.join('\n');
}

/**
 * Extract a clean error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle fetch/network errors
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return 'ECONNREFUSED (Connection refused)';
    }
    
    if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout') || error.message.includes('timed out')) {
      return 'ETIMEDOUT (Connection timeout)';
    }
    
    if (error.message.includes('ENOTFOUND')) {
      return 'ENOTFOUND (Host not found)';
    }
    
    return error.message;
  }
  
  return String(error);
}

/**
 * Log error to output channel with timestamp
 */
export function logErrorToOutput(message: string, error?: unknown): void {
  const channel = getOutputChannel();
  const timestamp = new Date().toISOString();
  
  channel.appendLine(`[${timestamp}] ${message}`);
  
  if (error instanceof Error && error.stack) {
    channel.appendLine(`Stack trace:\n${error.stack}`);
  } else if (error) {
    channel.appendLine(`Error: ${String(error)}`);
  }
  
  channel.appendLine(''); // Blank line for readability
}

/**
 * Show error message to user and log to output channel
 */
export function showAndLogError(options: ErrorMessageOptions): void {
  const message = buildEnhancedErrorMessage(options);
  
  // Log to output channel
  logErrorToOutput(message, options.error);
  
  // Show user-friendly message
  vscode.window.showErrorMessage(
    `${options.operation} Failed: ${extractErrorMessage(options.error)}`,
    'Show Details'
  ).then(selection => {
    if (selection === 'Show Details') {
      const channel = getOutputChannel();
      channel.show();
    }
  });
}

/**
 * Build error message for backend connectivity issues
 */
export function buildBackendErrorMessage(
  operation: string,
  url: string,
  error: unknown
): string {
  return buildEnhancedErrorMessage({
    operation,
    attemptedUrl: url,
    error,
    possibleCauses: [
      'Laravel backend not running',
      'Incorrect backend URL in settings',
      'Network connectivity issue',
      'Firewall blocking the connection'
    ],
    solutions: [
      'Start backend: php artisan serve',
      'Check settings: copilot-orchestrator.backendUrl',
      'Verify network: ping localhost 8000',
      'Check firewall rules'
    ]
  });
}

/**
 * Build error message for MCP connectivity issues
 */
export function buildMCPErrorMessage(
  operation: string,
  url: string,
  error: unknown
): string {
  return buildEnhancedErrorMessage({
    operation,
    attemptedUrl: url,
    error,
    possibleCauses: [
      'MCP server not running',
      'WebSocket/MCP server port mismatch',
      'Incorrect MCP URL in settings',
      'Docker container not started'
    ],
    solutions: [
      'Start MCP server: docker-compose up -d',
      'Check settings: copilot-orchestrator.mcp.baseUrl',
      'Verify port configuration matches',
      'Check Docker status: docker ps'
    ]
  });
}

/**
 * Build error message for plans not found
 */
export function buildPlansNotFoundMessage(searchedLocations: string[]): string {
  return buildEnhancedErrorMessage({
    operation: 'Load Plans',
    error: new Error('No plans found in workspace'),
    context: 'Searched locations:\n' + searchedLocations.map(loc => `  - ${loc}`).join('\n'),
    possibleCauses: [
      'Plans directory does not exist',
      'No plan files created yet',
      'Searching in wrong workspace folder'
    ],
    solutions: [
      'Create your first plan using the Plan Builder',
      'Ensure plans are saved in Docs/Plans/ or .vscode/plans/',
      'Open the correct workspace folder',
      'Run: copilot-orchestrator.openPlanBuilder'
    ]
  });
}

/**
 * Dispose the output channel
 */
export function disposeErrorLogging(): void {
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = undefined;
  }
}
