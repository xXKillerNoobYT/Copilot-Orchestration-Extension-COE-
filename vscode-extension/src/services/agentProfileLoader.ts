/**
 * Agent Profile Loader Service
 * Handles loading, validation, and management of agent team YAML profiles
 * 
 * Reference: PRD.json Feature F020 "Agent Profile YAML System"
 */

import * as vscode from 'vscode';
import * as yaml from 'yaml';
import * as path from 'path';
import * as fs from 'fs';
import agentProfileSchema from '../schemas/agent-profile.schema.json';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG_VALUES = {
  RETRY_ATTEMPTS: 3,
  TIMEOUT: 300,
  MAX_CONCURRENT_TASKS: 5,
  PRIORITY: 'medium' as const,
} as const;

/**
 * Agent team type enumeration
 */
export type AgentTeamType = 'planning' | 'answer' | 'decomposition' | 'verification';

/**
 * Agent profile configuration interface
 */
export interface AgentProfile {
  name: string;
  type: AgentTeamType;
  version: string;
  description?: string;
  config?: {
    timeout?: number;
    retryAttempts?: number;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    maxConcurrentTasks?: number;
    maxDepth?: number;
    autoDecompose?: boolean;
    requireVisualVerification?: boolean;
    confidenceThreshold?: number;
  };
  permissions?: {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
    test?: boolean;
    approve?: boolean;
    apiAccess?: string[];
    filePatterns?: string[];
    excludePatterns?: string[];
  };
  constraints?: {
    maxTokensPerRequest?: number;
    maxContextSize?: number;
    allowedOperations?: string[];
  };
  metadata?: {
    author?: string;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
  };
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Agent Profile Loader Service
 */
export class AgentProfileLoader {
  private static instance: AgentProfileLoader;
  private profiles: Map<string, AgentProfile> = new Map();
  private workspaceProfilesPath: string | null = null;

  private constructor() {
    this.initializeWorkspacePath();
  }

  static getInstance(): AgentProfileLoader {
    if (!AgentProfileLoader.instance) {
      AgentProfileLoader.instance = new AgentProfileLoader();
    }
    return AgentProfileLoader.instance;
  }

  /**
   * Initialize workspace profiles path
   */
  private initializeWorkspacePath(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.workspaceProfilesPath = path.join(
        workspaceFolders[0].uri.fsPath,
        '.vscode',
        'agent-profiles'
      );
    }
  }

  /**
   * Load agent profile from YAML string
   */
  async loadFromYaml(yamlContent: string): Promise<{ profile: AgentProfile | null; errors: ValidationError[] }> {
    try {
      // Parse YAML
      const profile = yaml.parse(yamlContent) as AgentProfile;

      // Validate against schema
      const validation = this.validateProfile(profile);

      if (!validation.valid) {
        return { profile: null, errors: validation.errors };
      }

      return { profile, errors: [] };
    } catch (error) {
      return {
        profile: null,
        errors: [
          {
            field: 'yaml',
            message: error instanceof Error ? error.message : 'Failed to parse YAML',
          },
        ],
      };
    }
  }

  /**
   * Load agent profile from file
   */
  async loadFromFile(filePath: string): Promise<{ profile: AgentProfile | null; errors: ValidationError[] }> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const result = await this.loadFromYaml(content);

      if (result.profile) {
        // Store in cache
        this.profiles.set(result.profile.type, result.profile);
      }

      return result;
    } catch (error) {
      return {
        profile: null,
        errors: [
          {
            field: 'file',
            message: error instanceof Error ? error.message : 'Failed to read file',
          },
        ],
      };
    }
  }

  /**
   * Upload profile from user selection
   */
  async uploadProfile(): Promise<{ profile: AgentProfile | null; errors: ValidationError[] }> {
    const fileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'YAML Files': ['yaml', 'yml'],
        'All Files': ['*'],
      },
      title: 'Select Agent Profile YAML File',
    });

    if (!fileUri || fileUri.length === 0) {
      return { profile: null, errors: [{ field: 'file', message: 'No file selected' }] };
    }

    return this.loadFromFile(fileUri[0].fsPath);
  }

  /**
   * Validate profile against schema
   */
  validateProfile(profile: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    if (!profile.name || typeof profile.name !== 'string') {
      errors.push({ field: 'name', message: 'Name is required and must be a string' });
    }

    if (!profile.type || !['planning', 'answer', 'decomposition', 'verification'].includes(profile.type)) {
      errors.push({
        field: 'type',
        message: 'Type must be one of: planning, answer, decomposition, verification',
        value: profile.type,
      });
    }

    if (!profile.version || !/^\d+\.\d+\.\d+$/.test(profile.version)) {
      errors.push({
        field: 'version',
        message: 'Version must be in semver format (e.g., 1.0.0)',
        value: profile.version,
      });
    }

    // Validate config section
    if (profile.config) {
      if (profile.config.timeout !== undefined) {
        if (typeof profile.config.timeout !== 'number' || profile.config.timeout < 10 || profile.config.timeout > 3600) {
          errors.push({
            field: 'config.timeout',
            message: 'Timeout must be between 10 and 3600 seconds',
            value: profile.config.timeout,
          });
        }
      }

      if (profile.config.retryAttempts !== undefined) {
        if (typeof profile.config.retryAttempts !== 'number' || profile.config.retryAttempts < 0 || profile.config.retryAttempts > 10) {
          errors.push({
            field: 'config.retryAttempts',
            message: 'Retry attempts must be between 0 and 10',
            value: profile.config.retryAttempts,
          });
        }
      }

      if (profile.config.priority !== undefined) {
        if (!['critical', 'high', 'medium', 'low'].includes(profile.config.priority)) {
          errors.push({
            field: 'config.priority',
            message: 'Priority must be one of: critical, high, medium, low',
            value: profile.config.priority,
          });
        }
      }

      if (profile.config.maxConcurrentTasks !== undefined) {
        if (typeof profile.config.maxConcurrentTasks !== 'number' || profile.config.maxConcurrentTasks < 1 || profile.config.maxConcurrentTasks > 20) {
          errors.push({
            field: 'config.maxConcurrentTasks',
            message: 'Max concurrent tasks must be between 1 and 20',
            value: profile.config.maxConcurrentTasks,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export profile to YAML string
   */
  exportToYaml(profile: AgentProfile): string {
    return yaml.stringify(profile, {
      indent: 2,
      lineWidth: 100,
    });
  }

  /**
   * Save profile to file
   */
  async saveToFile(profile: AgentProfile, filePath?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const targetPath = filePath || await this.getDefaultSavePath(profile);
      if (!targetPath) {
        return { success: false, error: 'No save path specified' };
      }

      const yamlContent = this.exportToYaml(profile);

      // Ensure directory exists
      const dir = path.dirname(targetPath);
      await fs.promises.mkdir(dir, { recursive: true });

      // Write file
      await fs.promises.writeFile(targetPath, yamlContent, 'utf-8');

      // Update cache
      this.profiles.set(profile.type, profile);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file',
      };
    }
  }

  /**
   * Download profile (export) to user-selected location
   */
  async downloadProfile(profile: AgentProfile): Promise<{ success: boolean; error?: string }> {
    const fileUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${profile.type}-agent-profile.yaml`),
      filters: {
        'YAML Files': ['yaml', 'yml'],
        'All Files': ['*'],
      },
      title: 'Save Agent Profile',
    });

    if (!fileUri) {
      return { success: false, error: 'Save cancelled' };
    }

    return this.saveToFile(profile, fileUri.fsPath);
  }

  /**
   * Get default save path for profile
   */
  private async getDefaultSavePath(profile: AgentProfile): Promise<string | null> {
    if (!this.workspaceProfilesPath) {
      return null;
    }

    return path.join(this.workspaceProfilesPath, `${profile.type}-agent.yaml`);
  }

  /**
   * Load profile from workspace settings
   */
  async loadFromWorkspace(teamType: AgentTeamType): Promise<AgentProfile | null> {
    // Check cache first
    if (this.profiles.has(teamType)) {
      return this.profiles.get(teamType)!;
    }

    // Try to load from workspace file
    if (this.workspaceProfilesPath) {
      const profilePath = path.join(this.workspaceProfilesPath, `${teamType}-agent.yaml`);
      try {
        const result = await this.loadFromFile(profilePath);
        return result.profile;
      } catch (error) {
        // Log the error for debugging, then fall back to default profile
        console.error(`Failed to load agent profile from workspace file at "${profilePath}":`, error);
        // File doesn't exist or is invalid, return default profile
      }
    }

    // Return default profile for team type
    return this.getDefaultProfile(teamType);
  }

  /**
   * Save profile to workspace settings
   */
  async saveToWorkspace(profile: AgentProfile): Promise<{ success: boolean; error?: string }> {
    if (!this.workspaceProfilesPath) {
      return { success: false, error: 'No workspace folder open' };
    }

    const profilePath = path.join(this.workspaceProfilesPath, `${profile.type}-agent.yaml`);
    return this.saveToFile(profile, profilePath);
  }

  /**
   * Get default profile for team type
   */
  getDefaultProfile(teamType: AgentTeamType): AgentProfile {
    const baseProfile: AgentProfile = {
      name: `${teamType.charAt(0).toUpperCase() + teamType.slice(1)} Team`,
      type: teamType,
      version: '1.0.0',
      description: this.getDefaultDescription(teamType),
      config: {
        timeout: DEFAULT_CONFIG_VALUES.TIMEOUT,
        retryAttempts: DEFAULT_CONFIG_VALUES.RETRY_ATTEMPTS,
        priority: DEFAULT_CONFIG_VALUES.PRIORITY,
        maxConcurrentTasks: DEFAULT_CONFIG_VALUES.MAX_CONCURRENT_TASKS,
      },
      permissions: {
        read: true,
        write: false,
        execute: false,
        test: false,
        approve: false,
        apiAccess: [],
        filePatterns: ['**/*'],
        excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
      },
      constraints: {
        maxTokensPerRequest: 8000,
        maxContextSize: 100000,
        allowedOperations: [],
      },
    };

    // Team-specific defaults
    switch (teamType) {
      case 'planning':
        baseProfile.permissions!.write = true;
        baseProfile.config!.maxDepth = 3;
        baseProfile.constraints!.allowedOperations = ['create_task', 'update_task', 'create_plan', 'update_plan'];
        break;

      case 'answer':
        baseProfile.config!.confidenceThreshold = 0.7;
        baseProfile.config!.priority = 'high';
        break;

      case 'decomposition':
        baseProfile.permissions!.write = true;
        baseProfile.config!.maxDepth = 5;
        baseProfile.config!.autoDecompose = true;
        baseProfile.constraints!.allowedOperations = ['create_task', 'update_task'];
        break;

      case 'verification':
        baseProfile.permissions!.test = true;
        baseProfile.permissions!.approve = true;
        baseProfile.config!.requireVisualVerification = true;
        baseProfile.config!.priority = 'high';
        baseProfile.constraints!.allowedOperations = ['run_tests'];
        break;
    }

    return baseProfile;
  }

  /**
   * Get default description for team type
   */
  private getDefaultDescription(teamType: AgentTeamType): string {
    switch (teamType) {
      case 'planning':
        return 'Master planner that generates project plans, roadmaps, and task breakdowns';
      case 'answer':
        return 'Context-aware Q&A agent using plan + codebase';
      case 'decomposition':
        return 'Autonomous agent that detects complex tasks and creates subtasks';
      case 'verification':
        return 'Automated and visual verification agent with user Ready gates';
      default:
        return '';
    }
  }

  /**
   * List all profiles in workspace
   */
  async listWorkspaceProfiles(): Promise<AgentProfile[]> {
    if (!this.workspaceProfilesPath) {
      return [];
    }

    try {
      await fs.promises.mkdir(this.workspaceProfilesPath, { recursive: true });
      const files = await fs.promises.readdir(this.workspaceProfilesPath);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      const profiles: AgentProfile[] = [];
      for (const file of yamlFiles) {
        const filePath = path.join(this.workspaceProfilesPath, file);
        const result = await this.loadFromFile(filePath);
        if (result.profile) {
          profiles.push(result.profile);
        }
      }

      return profiles;
    } catch (error) {
      console.error('Failed to list workspace agent profiles:', error);
      return [];
    }
  }

  /**
   * Get cached profile
   */
  getCachedProfile(teamType: AgentTeamType): AgentProfile | null {
    return this.profiles.get(teamType) || null;
  }

  /**
   * Clear profile cache
   */
  clearCache(): void {
    this.profiles.clear();
  }
}
