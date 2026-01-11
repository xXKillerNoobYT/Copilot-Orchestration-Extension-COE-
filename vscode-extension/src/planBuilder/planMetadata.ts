/**
 * Plan Metadata Manager
 * 
 * Manages plan metadata including creation/update timestamps, author information,
 * version tracking, and status management with semantic versioning support.
 * 
 * Reference: Code Master Section 9 - Interactive Design Phase (TASK-003D)
 */

import { execSync } from 'child_process';
import { platform } from 'os';
import { userInfo } from 'os';

export interface PlanMetadata {
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  author: string;
  version: string; // Semantic versioning
  status: 'draft' | 'active' | 'completed' | 'archived';
}

export interface PlanJSON {
  metadata?: PlanMetadata;
  [key: string]: unknown;
}

/**
 * Plan Metadata Manager Service
 */
export class PlanMetadataManager {
  /**
   * Add metadata to a plan object
   * @param plan Plan object to add metadata to
   * @returns Plan with added metadata
   */
  static addMetadata(plan: PlanJSON): PlanJSON {
    const now = new Date().toISOString();
    const author = this.getAuthorSync();

    return {
      ...plan,
      metadata: {
        createdAt: now,
        updatedAt: now,
        author,
        version: '1.0.0',
        status: 'draft',
        ...plan.metadata, // Preserve any existing metadata
      },
    };
  }

  /**
   * Update specific metadata fields
   * @param plan Plan object to update
   * @param changes Partial metadata changes
   * @returns Updated plan with modified metadata
   */
  static updateMetadata(plan: PlanJSON, changes: Partial<PlanMetadata>): PlanJSON {
    const now = new Date().toISOString();

    return {
      ...plan,
      metadata: {
        ...plan.metadata,
        ...changes,
        updatedAt: now, // Always update the updatedAt timestamp
      } as PlanMetadata,
    };
  }

  /**
   * Increment version number using semantic versioning
   * @param plan Plan object
   * @param type Type of version increment: 'major' | 'minor' | 'patch'
   * @returns Plan with incremented version
   */
  static incrementVersion(
    plan: PlanJSON,
    type: 'major' | 'minor' | 'patch'
  ): PlanJSON {
    const currentVersion = plan.metadata?.version || '1.0.0';
    const parts = currentVersion.split('.').map(Number);

    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new Error(
        `Invalid version format: ${currentVersion}. Expected semver (e.g., 1.0.0)`
      );
    }

    const [major, minor, patch] = parts;

    let newVersion: string;
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
      default:
        throw new Error(`Unknown version type: ${type}`);
    }

    return this.updateMetadata(plan, { version: newVersion });
  }

  /**
   * Get the current user as author
   * Tries git config first, falls back to OS username
   * Synchronous version (uses execSync)
   */
  private static getAuthorSync(): string {
    try {
      // Try to get from git config
      try {
        const gitAuthor = execSync('git config user.name', {
          encoding: 'utf-8',
          stdio: 'pipe',
        }).trim();
        if (gitAuthor) {
          return gitAuthor;
        }
      } catch {
        // git config failed, continue to fallback
      }

      // Fallback to OS username
      const user = userInfo();
      return user.username || 'Unknown User';
    } catch {
      return 'Unknown User';
    }
  }

  /**
   * Get the current user as author (async version)
   * @returns Promise resolving to author name
   */
  static async getAuthor(): Promise<string> {
    return Promise.resolve(this.getAuthorSync());
  }

  /**
   * Validate metadata object
   * @param metadata Metadata to validate
   * @throws Error if metadata is invalid
   */
  static validateMetadata(metadata: unknown): metadata is PlanMetadata {
    if (!metadata || typeof metadata !== 'object') {
      return false;
    }

    const meta = metadata as Record<string, unknown>;

    // Check required fields
    if (typeof meta.createdAt !== 'string') return false;
    if (typeof meta.updatedAt !== 'string') return false;
    if (typeof meta.author !== 'string') return false;
    if (typeof meta.version !== 'string') return false;
    if (typeof meta.status !== 'string') return false;

    // Validate ISO 8601 dates
    if (Number.isNaN(Date.parse(meta.createdAt))) return false;
    if (Number.isNaN(Date.parse(meta.updatedAt))) return false;

    // Validate semantic versioning
    if (!/^\d+\.\d+\.\d+$/.test(meta.version)) return false;

    // Validate status enum
    const validStatuses = ['draft', 'active', 'completed', 'archived'];
    if (!validStatuses.includes(meta.status as string)) return false;

    return true;
  }

  /**
   * Get metadata from a plan object
   * @param plan Plan object
   * @returns Metadata object or null if not present
   */
  static getMetadata(plan: PlanJSON): PlanMetadata | null {
    if (!plan.metadata) {
      return null;
    }

    if (this.validateMetadata(plan.metadata)) {
      return plan.metadata as PlanMetadata;
    }

    return null;
  }

  /**
   * Create a metadata summary for display
   * @param metadata Metadata object
   * @returns Human-readable summary string
   */
  static getSummary(metadata: PlanMetadata): string {
    const createdDate = new Date(metadata.createdAt).toLocaleString();
    const updatedDate = new Date(metadata.updatedAt).toLocaleString();

    return (
      `Plan v${metadata.version} (${metadata.status})\n` +
      `Author: ${metadata.author}\n` +
      `Created: ${createdDate}\n` +
      `Last Updated: ${updatedDate}`
    );
  }

  /**
   * Merge metadata from two plans, preferring source plan
   * Useful for plan comparisons and updates
   * @param source Source plan metadata
   * @param target Target plan metadata to merge into
   * @returns Merged metadata
   */
  static mergeMetadata(source: PlanJSON, target: PlanJSON): PlanMetadata {
    const sourceMetadata = this.getMetadata(source);
    const targetMetadata = this.getMetadata(target);

    if (!sourceMetadata) {
      return targetMetadata || this.addMetadata({}).metadata as PlanMetadata;
    }

    // Preserve creation date from target if available
    return {
      ...sourceMetadata,
      createdAt: targetMetadata?.createdAt || sourceMetadata.createdAt,
      updatedAt: new Date().toISOString(), // Always update when merging
    };
  }
}

// Export singleton instance for convenience
export const planMetadataManager = PlanMetadataManager;
