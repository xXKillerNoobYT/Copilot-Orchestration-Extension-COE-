import { promises as fs } from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';

export interface ToolPermissions {
  read_files?: boolean;
  write_files?: boolean;
  run_commands?: boolean;
  access_network?: boolean;
  modify_tasks?: boolean;
  [key: string]: unknown;
}

export interface ExecutionConstraints {
  max_depth?: number;
  max_parallel_actions?: number;
  require_plan_before_action?: boolean;
  require_context_review?: boolean;
  require_tests_for_changes?: boolean;
  require_explicit_confirmation_for_commands?: boolean;
  approval_required_for_changes?: boolean;
  approval_required_for_schema_changes?: boolean;
  allowed_file_types?: string[];
  [key: string]: unknown;
}

export interface PromptTemplates {
  system?: string;
  planning?: string;
  recap?: string;
  adr?: string;
  review?: string;
  plan?: string;
  summary?: string;
  report?: string;
  checklist?: string;
  announce?: string;
  [key: string]: unknown;
}

export interface AgentProfile {
  version: number;
  name: string;
  role: string;
  description?: string;
  instructions?: string;
  goals?: string[];
  anti_goals?: string[];
  tool_permissions?: ToolPermissions;
  execution_constraints?: ExecutionConstraints;
  prompt_templates?: PromptTemplates;
  defaults?: Record<string, unknown>;
  [key: string]: unknown;
}

export class AgentProfileLoader {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    // Default to ../config/agents relative to compiled file location
    this.baseDir = baseDir ?? path.resolve(__dirname, '..', 'config', 'agents');
  }

  /** Load a single profile by name (case-insensitive). */
  async loadProfile(name: string): Promise<AgentProfile | null> {
    const normalized = name.toLowerCase();
    const profiles = await this.loadAllProfiles();
    return profiles.find((p) => p.name.toLowerCase() === normalized || p.role.toLowerCase() === normalized) ?? null;
  }

  /** Load every agent profile from the configured directory. */
  async loadAllProfiles(): Promise<AgentProfile[]> {
    const entries = await this.safeReadDir(this.baseDir);
    const profiles: AgentProfile[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!this.isSupportedFile(entry.name)) continue;

      const filePath = path.join(this.baseDir, entry.name);
      const parsed = await this.parseProfileFile(filePath);
      const validated = this.validateProfile(parsed, filePath);
      profiles.push(validated);
    }

    return profiles;
  }

  private async safeReadDir(dir: string) {
    try {
      return await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Failed to read agent directory at ${dir}: ${(error as Error).message}`);
    }
  }

  private isSupportedFile(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return ['.yaml', '.yml', '.json'].includes(ext);
  }

  private async parseProfileFile(filePath: string): Promise<AgentProfile> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    try {
      if (ext === '.yaml' || ext === '.yml') {
        return parseYaml(content) as AgentProfile;
      }
      return JSON.parse(content) as AgentProfile;
    } catch (error) {
      throw new Error(`Failed to parse agent profile ${filePath}: ${(error as Error).message}`);
    }
  }

  private validateProfile(profile: AgentProfile, source: string): AgentProfile {
    if (!profile || typeof profile !== 'object') {
      throw new Error(`Invalid profile format in ${source}`);
    }

    if (typeof profile.name !== 'string' || profile.name.trim().length === 0) {
      throw new Error(`Agent profile at ${source} is missing a valid 'name'`);
    }

    if (typeof profile.role !== 'string' || profile.role.trim().length === 0) {
      throw new Error(`Agent profile at ${source} is missing a valid 'role'`);
    }

    if (typeof profile.version !== 'number') {
      throw new Error(`Agent profile at ${source} must specify a numeric 'version'`);
    }

    // Normalize some optional fields to reduce consumer null checks
    profile.tool_permissions = profile.tool_permissions ?? {};
    profile.execution_constraints = profile.execution_constraints ?? {};
    profile.prompt_templates = profile.prompt_templates ?? {};

    return profile;
  }
}

// Convenience singleton
export const defaultAgentProfileLoader = new AgentProfileLoader();
