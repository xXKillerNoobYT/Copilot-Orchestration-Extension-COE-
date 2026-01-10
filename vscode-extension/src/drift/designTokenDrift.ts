/**
 * Design Token Drift Detection
 * Monitors design token files for unintended changes
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { showErrorMessage, logError } from '../utils/errorHandler';

export interface DesignTokenDrift {
  file: string;
  changes: TokenChange[];
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface TokenChange {
  path: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

/**
 * Design token file patterns to monitor
 */
const TOKEN_FILE_PATTERNS = [
  '**/design-tokens.json',
  '**/tokens.json',
  '**/design-system/*.json',
  '**/styles/tokens/**/*.json',
  '**/resources/design-tokens/**/*.json',
];

/**
 * Compare design tokens with baseline (committed version)
 */
export async function detectDesignTokenDrift(
  workspaceRoot: string
): Promise<DesignTokenDrift[]> {
  const drifts: DesignTokenDrift[] = [];

  try {
    // Find all token files
    const tokenFiles = await findTokenFiles(workspaceRoot);

    for (const tokenFile of tokenFiles) {
      const drift = await checkFileForDrift(workspaceRoot, tokenFile);
      if (drift) {
        drifts.push(drift);
      }
    }

    return drifts;
  } catch (error) {
    logError(error, 'detectDesignTokenDrift');
    return [];
  }
}

/**
 * Find all design token files in workspace
 */
async function findTokenFiles(workspaceRoot: string): Promise<string[]> {
  const tokenFiles: string[] = [];

  try {
    // Check common locations
    const commonPaths = [
      path.join(workspaceRoot, 'design-tokens.json'),
      path.join(workspaceRoot, 'resources', 'design-tokens.json'),
      path.join(workspaceRoot, 'resources', 'design-tokens', 'tokens.json'),
      path.join(workspaceRoot, 'src', 'styles', 'tokens.json'),
    ];

    for (const filePath of commonPaths) {
      try {
        await fs.access(filePath);
        tokenFiles.push(filePath);
      } catch {
        // File doesn't exist, continue
      }
    }

    return tokenFiles;
  } catch (error) {
    logError(error, 'findTokenFiles');
    return [];
  }
}

/**
 * Check a single file for drift against committed version
 */
async function checkFileForDrift(
  workspaceRoot: string,
  tokenFile: string
): Promise<DesignTokenDrift | null> {
  try {
    // Read current file
    const currentContent = await fs.readFile(tokenFile, 'utf-8');
    const currentTokens = JSON.parse(currentContent);

    // Get committed version from git
    const committedTokens = await getCommittedVersion(workspaceRoot, tokenFile);
    
    if (!committedTokens) {
      // File not in git yet
      return null;
    }

    // Compare tokens
    const changes = compareTokens(committedTokens, currentTokens);

    if (changes.length === 0) {
      return null;
    }

    // Determine severity based on number and type of changes
    const severity = calculateDriftSeverity(changes);

    return {
      file: path.relative(workspaceRoot, tokenFile),
      changes,
      severity,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logError(error, 'checkFileForDrift', { tokenFile });
    return null;
  }
}

/**
 * Get committed version of file from git
 */
async function getCommittedVersion(
  workspaceRoot: string,
  filePath: string
): Promise<any | null> {
  try {
    const relativePath = path.relative(workspaceRoot, filePath);
    
    // Use git show to get committed version
    const { execSync } = require('child_process');
    const committedContent = execSync(
      `git show HEAD:"${relativePath}"`,
      { cwd: workspaceRoot, encoding: 'utf-8' }
    );

    return JSON.parse(committedContent);
  } catch (error) {
    // File not in git or git not available
    return null;
  }
}

/**
 * Compare two token objects and find changes
 */
function compareTokens(oldTokens: any, newTokens: any, basePath: string = ''): TokenChange[] {
  const changes: TokenChange[] = [];

  // Check for added/modified tokens
  for (const key in newTokens) {
    const currentPath = basePath ? `${basePath}.${key}` : key;
    const oldValue = oldTokens?.[key];
    const newValue = newTokens[key];

    if (oldValue === undefined) {
      // Token added
      changes.push({
        path: currentPath,
        oldValue: undefined,
        newValue,
        changeType: 'added',
      });
    } else if (typeof newValue === 'object' && newValue !== null) {
      // Recursively check nested objects
      if (typeof oldValue === 'object' && oldValue !== null) {
        changes.push(...compareTokens(oldValue, newValue, currentPath));
      } else {
        // Type changed from primitive to object
        changes.push({
          path: currentPath,
          oldValue,
          newValue,
          changeType: 'modified',
        });
      }
    } else if (oldValue !== newValue) {
      // Token modified
      changes.push({
        path: currentPath,
        oldValue,
        newValue,
        changeType: 'modified',
      });
    }
  }

  // Check for removed tokens
  for (const key in oldTokens) {
    const currentPath = basePath ? `${basePath}.${key}` : key;
    if (newTokens?.[key] === undefined) {
      changes.push({
        path: currentPath,
        oldValue: oldTokens[key],
        newValue: undefined,
        changeType: 'removed',
      });
    }
  }

  return changes;
}

/**
 * Calculate drift severity based on changes
 */
function calculateDriftSeverity(changes: TokenChange[]): 'low' | 'medium' | 'high' {
  const criticalPaths = ['colors', 'typography', 'spacing'];
  const hasCriticalChanges = changes.some(c => 
    criticalPaths.some(p => c.path.startsWith(p))
  );

  if (changes.length > 20 || hasCriticalChanges) {
    return 'high';
  }

  if (changes.length > 5) {
    return 'medium';
  }

  return 'low';
}

/**
 * Show drift notification to user
 */
export async function showDriftNotification(drift: DesignTokenDrift): Promise<void> {
  const severityIcon = drift.severity === 'high' ? '⚠️' : drift.severity === 'medium' ? '⚡' : 'ℹ️';
  const message = `${severityIcon} Design token drift detected in ${drift.file} (${drift.changes.length} changes)`;

  const action = await vscode.window.showWarningMessage(
    message,
    'View Changes',
    'Re-export Tokens',
    'Dismiss'
  );

  if (action === 'View Changes') {
    showDriftDetails(drift);
  } else if (action === 'Re-export Tokens') {
    // Trigger design editor to re-export tokens
    vscode.commands.executeCommand('copilot-orchestrator.openDesignEditor');
  }
}

/**
 * Show detailed drift information
 */
function showDriftDetails(drift: DesignTokenDrift): void {
  const content = formatDriftDetails(drift);
  
  vscode.workspace.openTextDocument({
    language: 'markdown',
    content,
  }).then(doc => {
    vscode.window.showTextDocument(doc);
  });
}

/**
 * Format drift details as markdown
 */
function formatDriftDetails(drift: DesignTokenDrift): string {
  let content = `# Design Token Drift Report\n\n`;
  content += `**File**: ${drift.file}\n`;
  content += `**Severity**: ${drift.severity.toUpperCase()}\n`;
  content += `**Changes**: ${drift.changes.length}\n`;
  content += `**Detected**: ${new Date(drift.timestamp).toLocaleString()}\n\n`;

  content += `## Changes\n\n`;

  const grouped = groupChangesByType(drift.changes);

  if (grouped.added.length > 0) {
    content += `### ✅ Added (${grouped.added.length})\n`;
    grouped.added.forEach(c => {
      content += `- \`${c.path}\` = \`${JSON.stringify(c.newValue)}\`\n`;
    });
    content += '\n';
  }

  if (grouped.modified.length > 0) {
    content += `### 📝 Modified (${grouped.modified.length})\n`;
    grouped.modified.forEach(c => {
      content += `- \`${c.path}\`: \`${JSON.stringify(c.oldValue)}\` → \`${JSON.stringify(c.newValue)}\`\n`;
    });
    content += '\n';
  }

  if (grouped.removed.length > 0) {
    content += `### ❌ Removed (${grouped.removed.length})\n`;
    grouped.removed.forEach(c => {
      content += `- \`${c.path}\` (was \`${JSON.stringify(c.oldValue)}\`)\n`;
    });
    content += '\n';
  }

  content += `## Recommendations\n\n`;
  content += `- Review changes to ensure they align with design system guidelines\n`;
  content += `- Re-export design tokens using the Design System Editor if changes are unintended\n`;
  content += `- Update design documentation if changes are intentional\n`;

  return content;
}

/**
 * Group changes by type
 */
function groupChangesByType(changes: TokenChange[]): {
  added: TokenChange[];
  modified: TokenChange[];
  removed: TokenChange[];
} {
  return {
    added: changes.filter(c => c.changeType === 'added'),
    modified: changes.filter(c => c.changeType === 'modified'),
    removed: changes.filter(c => c.changeType === 'removed'),
  };
}
