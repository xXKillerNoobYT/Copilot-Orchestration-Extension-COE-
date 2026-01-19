import * as vscode from 'vscode';
import * as path from 'path';
import { PlanJSON } from '../planBuilder/planGenerator';

/**
 * planPersistence.ts
 * Service for saving, loading, versioning, and managing plan.json files
 * Uses VS Code workspace APIs for file operations
 */

export interface SaveOptions {
  version?: string;
  createBackup?: boolean;
  autosave?: boolean;
}

export interface PlanMetadata {
  filename: string;
  path: string;
  version: string;
  created_at: string;
  updated_at: string;
  size_bytes: number;
}

export interface PersistenceError {
  code: string;
  message: string;
  details?: string;
}

export interface VersionInfo {
  current: string;
  previous: string[];
  latest: string;
}

/**
 * PlanPersistenceService
 * Manages plan file persistence with versioning, backups, and error handling
 */
export class PlanPersistenceService {
  private readonly PLANS_DIR = 'Docs/Plans';
  private readonly DELETED_DIR = 'Docs/Plans/.deleted';
  private readonly BACKUP_DIR = 'Docs/Plans/.backups';
  private readonly METADATA_FILE = 'plan.metadata.json';
  private workspaceRoot: vscode.Uri | undefined;

  constructor() {
    this.initializeWorkspaceRoot();
  }

  /**
   * Initialize workspace root
   */
  private initializeWorkspaceRoot(): void {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
    }
  }

  /**
   * Save plan to filesystem with optional versioning and backup
   */
  async savePlan(plan: PlanJSON, options: SaveOptions = {}): Promise<{
    path: string;
    version: string;
    backup?: string;
  }> {
    try {
      if (!this.workspaceRoot) {
        throw this.createError('NO_WORKSPACE', 'No workspace folder found');
      }

      const plansDir = vscode.Uri.joinPath(this.workspaceRoot, this.PLANS_DIR);
      await this.ensureDirectory(plansDir);

      const filename = `${plan.metadata.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      const filePath = vscode.Uri.joinPath(plansDir, filename);

      // Check if file exists for backup
      let backupPath: string | undefined;
      if (options.createBackup) {
        try {
          const existing = await vscode.workspace.fs.readFile(filePath);
          backupPath = await this.createBackup(filePath, existing);
        } catch {
          // File doesn't exist yet, no backup needed
        }
      }

      // Save the plan
      const planWithVersion = {
        ...plan,
        metadata: {
          ...plan.metadata,
          version: options.version || plan.metadata.version,
        },
      };

      const jsonContent = JSON.stringify(planWithVersion, null, 2);
      const uint8Array = new TextEncoder().encode(jsonContent);
      await vscode.workspace.fs.writeFile(filePath, uint8Array);

      // Update metadata
      await this.updateMetadata(filename, filePath, planWithVersion.metadata.version);

      return {
        path: filePath.fsPath,
        version: planWithVersion.metadata.version,
        backup: backupPath,
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if ((error as any).code === 'ENOSPC') {
          throw this.createError('DISK_FULL', 'Insufficient disk space to save plan');
        }
        if ((error as any).code === 'EACCES') {
          throw this.createError('PERMISSION_DENIED', 'Permission denied when saving plan');
        }
      }
      throw this.createError('SAVE_FAILED', `Failed to save plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load plan from filesystem
   */
  async loadPlan(filename: string): Promise<PlanJSON> {
    try {
      if (!this.workspaceRoot) {
        throw this.createError('NO_WORKSPACE', 'No workspace folder found');
      }

      const plansDir = vscode.Uri.joinPath(this.workspaceRoot, this.PLANS_DIR);
      const filePath = vscode.Uri.joinPath(plansDir, filename);

      const fileContent = await vscode.workspace.fs.readFile(filePath);
      const jsonString = new TextDecoder().decode(fileContent);
      const plan = JSON.parse(jsonString) as PlanJSON;

      return plan;
    } catch (error) {
      if ((error as any)?.code === 1) {
        // FileNotFound
        throw this.createError('FILE_NOT_FOUND', `Plan file not found: ${filename}`);
      }
      if (error instanceof SyntaxError) {
        throw this.createError('INVALID_JSON', `Invalid JSON in plan file: ${error.message}`);
      }
      throw this.createError('LOAD_FAILED', `Failed to load plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all saved plans
   */
  async listPlans(): Promise<PlanMetadata[]> {
    try {
      if (!this.workspaceRoot) {
        throw this.createError('NO_WORKSPACE', 'No workspace folder found');
      }

      const plansDir = vscode.Uri.joinPath(this.workspaceRoot, this.PLANS_DIR);
      const entries = await vscode.workspace.fs.readDirectory(plansDir);

      const plans: PlanMetadata[] = [];
      for (const [name, type] of entries) {
        if (type === vscode.FileType.File && name.endsWith('.json') && name !== this.METADATA_FILE) {
          try {
            const filePath = vscode.Uri.joinPath(plansDir, name);
            const stat = await vscode.workspace.fs.stat(filePath);
            const content = await vscode.workspace.fs.readFile(filePath);
            const plan = JSON.parse(new TextDecoder().decode(content)) as PlanJSON;

            plans.push({
              filename: name,
              path: filePath.fsPath,
              version: plan.metadata.version,
              created_at: plan.metadata.created_at,
              updated_at: plan.metadata.updated_at,
              size_bytes: stat.size,
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }

      return plans.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } catch (error) {
      if ((error as any)?.code === 1) {
        // Directory doesn't exist
        return [];
      }
      throw this.createError('LIST_FAILED', `Failed to list plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get version information for a plan
   */
  async getVersionInfo(filename: string): Promise<VersionInfo> {
    try {
      if (!this.workspaceRoot) {
        throw this.createError('NO_WORKSPACE', 'No workspace folder found');
      }

      const plansDir = vscode.Uri.joinPath(this.workspaceRoot, this.PLANS_DIR);
      const filePath = vscode.Uri.joinPath(plansDir, filename);

      const content = await vscode.workspace.fs.readFile(filePath);
      const plan = JSON.parse(new TextDecoder().decode(content)) as PlanJSON;
      const currentVersion = plan.metadata.version;

      // Get backup versions
      const backupDir = vscode.Uri.joinPath(this.workspaceRoot, this.BACKUP_DIR);
      const backupEntries = await vscode.workspace.fs.readDirectory(backupDir);

      const backupVersions = backupEntries
        .filter(([name]) => name.startsWith(filename.replace('.json', '')))
        .map(([name]) => {
          const match = name.match(/@v(.+?)_/);
          return match ? match[1] : 'unknown';
        })
        .filter((v, i, arr) => arr.indexOf(v) === i); // Unique versions

      return {
        current: currentVersion,
        previous: backupVersions.slice(0, -1),
        latest: backupVersions[backupVersions.length - 1] || currentVersion,
      };
    } catch (error) {
      throw this.createError('VERSION_INFO_FAILED', `Failed to get version info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create timestamped backup of a plan
   */
  async backupPlan(filename: string): Promise<string> {
    try {
      if (!this.workspaceRoot) {
        throw this.createError('NO_WORKSPACE', 'No workspace folder found');
      }

      const plansDir = vscode.Uri.joinPath(this.workspaceRoot, this.PLANS_DIR);
      const filePath = vscode.Uri.joinPath(plansDir, filename);

      const content = await vscode.workspace.fs.readFile(filePath);
      const plan = JSON.parse(new TextDecoder().decode(content)) as PlanJSON;

      return this.createBackup(filePath, content, plan.metadata.version);
    } catch (error) {
      throw this.createError('BACKUP_FAILED', `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete plan (soft delete to .deleted directory)
   * Also calls backend API if plan has an ID
   */
  async deletePlan(filename: string, permanent: boolean = false): Promise<void> {
    try {
      if (!this.workspaceRoot) {
        throw this.createError('NO_WORKSPACE', 'No workspace folder found');
      }

      const plansDir = vscode.Uri.joinPath(this.workspaceRoot, this.PLANS_DIR);
      const filePath = vscode.Uri.joinPath(plansDir, filename);

      // Try to load plan to get its ID for backend deletion
      let planId: number | undefined;
      try {
        const plan = await this.loadPlan(filename);
        // Check if plan has an ID (from backend)
        if (typeof (plan as Record<string, unknown>).id === 'number') {
          planId = (plan as Record<string, unknown>).id as number;
        }
      } catch (error) {
        // Plan might not have an ID (local-only plan)
        console.log('[PlanPersistence] Plan has no backend ID, skipping backend delete');
      }

      // Delete from backend if plan has an ID
      if (planId) {
        await this.deleteBackendPlan(planId);
      }

      // Delete local file
      if (permanent) {
        // Hard delete
        await vscode.workspace.fs.delete(filePath);
      } else {
        // Soft delete
        const deletedDir = vscode.Uri.joinPath(this.workspaceRoot, this.DELETED_DIR);
        await this.ensureDirectory(deletedDir);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const deletedFilePath = vscode.Uri.joinPath(
          deletedDir,
          `${filename.replace('.json', '')}_deleted_${timestamp}.json`
        );

        const content = await vscode.workspace.fs.readFile(filePath);
        await vscode.workspace.fs.writeFile(deletedFilePath, content);
        await vscode.workspace.fs.delete(filePath);
      }
    } catch (error) {
      throw this.createError('DELETE_FAILED', `Failed to delete plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete plan from backend API
   * Calls DELETE /api/v1/planning/{planId}
   */
  private async deleteBackendPlan(planId: number): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('copilotOrchestration');
      const backendUrl = config.get<string>('mcpServerUrl') || 'http://localhost:8000';

      const url = `${backendUrl}/api/v1/planning/${planId}`;

      console.log('[PlanPersistence] Deleting plan from backend:', planId);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        
        // If plan is already deleted or not found, that's OK
        if (response.status === 404) {
          console.log('[PlanPersistence] Plan already deleted from backend');
          return;
        }

        // If plan is approved/implemented, warn but continue with local delete
        if (response.status === 422) {
          console.warn('[PlanPersistence] Backend rejected delete (plan may be approved/implemented)');
          vscode.window.showWarningMessage(
            `Backend did not delete plan: ${errorData.message || 'Plan may be approved or implemented'}`
          );
          return;
        }

        throw new Error(`Backend delete failed: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('[PlanPersistence] Backend delete successful:', result.message);
    } catch (error) {
      // Log error but don't fail the local delete
      console.error('[PlanPersistence] Backend delete failed:', error);
      throw error;
    }
  }

  /**
   * Restore deleted plan
   */
  async restoreDeletedPlan(deletedFilename: string): Promise<string> {
    try {
      if (!this.workspaceRoot) {
        throw this.createError('NO_WORKSPACE', 'No workspace folder found');
      }

      const deletedDir = vscode.Uri.joinPath(this.workspaceRoot, this.DELETED_DIR);
      const deletedPath = vscode.Uri.joinPath(deletedDir, deletedFilename);

      const content = await vscode.workspace.fs.readFile(deletedPath);
      const plan = JSON.parse(new TextDecoder().decode(content)) as PlanJSON;

      // Restore to original location
      const plansDir = vscode.Uri.joinPath(this.workspaceRoot, this.PLANS_DIR);
      const restoredPath = vscode.Uri.joinPath(plansDir, `${plan.metadata.name.replace(/\s+/g, '-').toLowerCase()}.json`);

      await vscode.workspace.fs.writeFile(restoredPath, content);
      await vscode.workspace.fs.delete(deletedPath);

      return restoredPath.fsPath;
    } catch (error) {
      throw this.createError('RESTORE_FAILED', `Failed to restore plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of deleted plans
   */
  async listDeletedPlans(): Promise<string[]> {
    try {
      if (!this.workspaceRoot) {
        return [];
      }

      const deletedDir = vscode.Uri.joinPath(this.workspaceRoot, this.DELETED_DIR);
      const entries = await vscode.workspace.fs.readDirectory(deletedDir);

      return entries
        .filter(([_, type]) => type === vscode.FileType.File)
        .map(([name]) => name);
    } catch {
      return [];
    }
  }

  /**
   * Export plan to alternative format
   */
  async exportPlan(filename: string, format: 'json' | 'yaml' | 'md'): Promise<string> {
    try {
      if (!this.workspaceRoot) {
        throw this.createError('NO_WORKSPACE', 'No workspace folder found');
      }

      const plan = await this.loadPlan(filename);

      switch (format) {
        case 'json':
          return JSON.stringify(plan, null, 2);
        case 'yaml':
          return this.planToYaml(plan);
        case 'md':
          return this.planToMarkdown(plan);
        default:
          throw this.createError('INVALID_FORMAT', `Unsupported format: ${format}`);
      }
    } catch (error) {
      throw this.createError('EXPORT_FAILED', `Failed to export plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  private async ensureDirectory(dirPath: vscode.Uri): Promise<void> {
    try {
      await vscode.workspace.fs.stat(dirPath);
    } catch {
      await vscode.workspace.fs.createDirectory(dirPath);
    }
  }

  private async createBackup(filePath: vscode.Uri, content: Uint8Array, version?: string): Promise<string> {
    if (!this.workspaceRoot) {
      throw this.createError('NO_WORKSPACE', 'No workspace folder found');
    }

    const backupDir = vscode.Uri.joinPath(this.workspaceRoot, this.BACKUP_DIR);
    await this.ensureDirectory(backupDir);

    const filename = filePath.fsPath.split(path.sep).pop() || 'plan';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${filename.replace('.json', '')}_backup_@v${version || 'unknown'}_${timestamp}.json`;

    const backupPath = vscode.Uri.joinPath(backupDir, backupFilename);
    await vscode.workspace.fs.writeFile(backupPath, content);

    return backupPath.fsPath;
  }

  private async updateMetadata(filename: string, filePath: vscode.Uri, version: string): Promise<void> {
    if (!this.workspaceRoot) return;

    const stat = await vscode.workspace.fs.stat(filePath);
    const metadata = {
      filename,
      path: filePath.fsPath,
      version,
      updated_at: new Date().toISOString(),
      size_bytes: stat.size,
    };

    // Store metadata (could be extended for multiple files)
    const metadataPath = vscode.Uri.joinPath(this.workspaceRoot, this.PLANS_DIR, `${filename}.meta.json`);
    const metadataContent = JSON.stringify(metadata, null, 2);
    const uint8Array = new TextEncoder().encode(metadataContent);
    await vscode.workspace.fs.writeFile(metadataPath, uint8Array);
  }

  private planToYaml(plan: PlanJSON): string {
    // Simple YAML conversion (for production, use a proper YAML library)
    const lines: string[] = [];

    lines.push('# Plan: ' + plan.project.name);
    lines.push('metadata:');
    lines.push(`  version: ${plan.metadata.version}`);
    lines.push(`  created_at: ${plan.metadata.created_at}`);
    lines.push(`  status: ${plan.metadata.status}`);

    lines.push('\nproject:');
    lines.push(`  name: ${plan.project.name}`);
    lines.push(`  description: ${plan.project.description}`);
    lines.push(`  type: ${plan.project.type}`);

    lines.push('\narchitecture:');
    lines.push(`  pattern: ${plan.architecture.pattern}`);

    lines.push('\nfeatures:');
    plan.features.forEach(f => {
      lines.push(`  - name: ${f.name}`);
      lines.push(`    priority: ${f.priority}`);
    });

    return lines.join('\n');
  }

  private planToMarkdown(plan: PlanJSON): string {
    const lines: string[] = [];

    lines.push(`# ${plan.project.name}`);
    lines.push(`\n**Status**: ${plan.metadata.status}`);
    lines.push(`\n**Version**: ${plan.metadata.version}`);

    lines.push(`\n## Project Overview\n`);
    lines.push(plan.project.description);
    lines.push(`\n**Type**: ${plan.project.type}`);

    lines.push(`\n## Architecture\n`);
    lines.push(`**Pattern**: ${plan.architecture.pattern}`);
    lines.push(`\n${plan.architecture.description}`);

    lines.push(`\n## Features\n`);
    plan.features.forEach(f => {
      lines.push(`### ${f.name}`);
      lines.push(`- **Priority**: ${f.priority}`);
      lines.push(`- **Status**: ${f.status}`);
      lines.push(`- **Description**: ${f.description}\n`);
    });

    lines.push(`\n## Timeline\n`);
    lines.push(`**Start**: ${plan.timeline.start_date}`);
    lines.push(`**End**: ${plan.timeline.end_date}\n`);
    plan.timeline.milestones.forEach(m => {
      lines.push(`- **${m.name}**: ${m.target_date} (${m.phase})`);
    });

    lines.push(`\n## Team\n`);
    plan.team.members.forEach(m => {
      lines.push(`- **${m.role_name}**: ${m.skills.join(', ')}`);
    });

    return lines.join('\n');
  }

  /**
   * Decompose plan into tasks using backend API
   * 
   * @param planId Plan ID from backend
   * @param options Decomposition options
   * @returns Decomposition result with tasks and metadata
   */
  async decomposePlan(planId: number, options: {
    autoCreate?: boolean;
    microtaskSize?: number;
    projectId?: number;
  } = {}): Promise<{
    success: boolean;
    tasks: any[];
    metadata: any;
    preview: boolean;
    createdTasks?: any[];
  }> {
    try {
      // Get MCP backend URL from configuration
      const config = vscode.workspace.getConfiguration('copilotOrchestration');
      const backendUrl = config.get<string>('mcpServerUrl') || 'http://localhost:8000';

      const url = `${backendUrl}/api/v1/mcp/plans/${planId}/decompose`;
      
      // Prepare request body
      const requestBody = {
        options: {
          auto_create: options.autoCreate ?? false,
          microtask_size: options.microtaskSize ?? 45,
        },
        project_id: options.projectId,
      };

      console.log('[PlanPersistence] Calling decompose endpoint:', url);
      console.log('[PlanPersistence] Request body:', requestBody);

      // Make HTTP request to backend
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw this.createError(
          'DECOMPOSE_FAILED',
          `Failed to decompose plan: ${errorData.error || response.statusText}`,
          JSON.stringify(errorData)
        );
      }

      const result = await response.json();
      console.log('[PlanPersistence] Decomposition result:', {
        taskCount: result.tasks?.length,
        preview: result.preview,
        success: result.success,
      });

      return result;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error; // Re-throw PersistenceError
      }
      throw this.createError(
        'DECOMPOSE_ERROR',
        `Error calling decompose API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  private createError(code: string, message: string, details?: string): PersistenceError {
    return { code, message, details };
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORT
// ============================================================================

let persistenceInstance: PlanPersistenceService | null = null;

export function getPlanPersistenceService(): PlanPersistenceService {
  if (!persistenceInstance) {
    persistenceInstance = new PlanPersistenceService();
  }
  return persistenceInstance;
}
