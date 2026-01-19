/**
 * Agent Profile File Watcher
 * 
 * Watches agent profile YAML files for changes and automatically reloads them
 * without requiring extension restart. Provides hot-reload capability for
 * rapid agent profile iteration.
 * 
 * @author Auto Zen Agent
 * @date 2026-01-18
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { defaultAgentProfileLoader, AgentProfile } from './agentProfiles';

export interface ProfileChangeEvent {
  profileName: string;
  profile: AgentProfile;
  changeType: 'created' | 'modified' | 'deleted';
  timestamp: Date;
}

export type ProfileChangeCallback = (event: ProfileChangeEvent) => void;

/**
 * AgentProfileWatcher - Monitors agent profile files for changes
 * 
 * Features:
 * - Watches config/agents/*.yaml files
 * - Auto-reloads on file changes
 * - Validates profiles before applying
 * - Notifies subscribers of changes
 * - Handles creation, modification, deletion
 */
export class AgentProfileWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private profiles: Map<string, AgentProfile> = new Map();
  private callbacks: ProfileChangeCallback[] = [];
  private extensionUri: vscode.Uri;
  private agentsPath: string;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
    this.agentsPath = path.join(
      extensionUri.fsPath,
      'config',
      'agents',
      '*.{yaml,yml}'
    );
  }

  /**
   * Start watching agent profile files
   */
  public async start(): Promise<void> {
    // Load initial profiles
    await this.loadAllProfiles();

    // Create file watcher
    const pattern = new vscode.RelativePattern(
      path.join(this.extensionUri.fsPath, 'config', 'agents'),
      '*.{yaml,yml}'
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Watch for file creation
    this.watcher.onDidCreate(async (uri) => {
      console.log(`[AgentProfileWatcher] Profile created: ${uri.fsPath}`);
      await this.handleProfileChange(uri, 'created');
    });

    // Watch for file modification
    this.watcher.onDidChange(async (uri) => {
      console.log(`[AgentProfileWatcher] Profile modified: ${uri.fsPath}`);
      await this.handleProfileChange(uri, 'modified');
    });

    // Watch for file deletion
    this.watcher.onDidDelete(async (uri) => {
      console.log(`[AgentProfileWatcher] Profile deleted: ${uri.fsPath}`);
      await this.handleProfileDeletion(uri);
    });

    console.log(`[AgentProfileWatcher] Started watching: ${this.agentsPath}`);
  }

  /**
   * Stop watching agent profile files
   */
  public stop(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
    console.log('[AgentProfileWatcher] Stopped watching');
  }

  /**
   * Register callback for profile changes
   */
  public onChange(callback: ProfileChangeCallback): vscode.Disposable {
    this.callbacks.push(callback);
    
    // Return disposable to unregister
    return new vscode.Disposable(() => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    });
  }

  /**
   * Get current profile by name
   */
  public getProfile(name: string): AgentProfile | undefined {
    return this.profiles.get(name.toLowerCase());
  }

  /**
   * Get all loaded profiles
   */
  public getAllProfiles(): AgentProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Force reload all profiles
   */
  public async reloadAll(): Promise<void> {
    await this.loadAllProfiles();
    
    vscode.window.showInformationMessage(
      `Reloaded ${this.profiles.size} agent profiles`
    );
  }

  /**
   * Load all profiles from disk
   */
  private async loadAllProfiles(): Promise<void> {
    try {
      const profiles = await defaultAgentProfileLoader.loadAllProfiles();
      
      this.profiles.clear();
      for (const profile of profiles) {
        this.profiles.set(profile.name.toLowerCase(), profile);
      }

      console.log(`[AgentProfileWatcher] Loaded ${profiles.length} profiles`);
    } catch (error) {
      console.error('[AgentProfileWatcher] Failed to load profiles:', error);
      vscode.window.showErrorMessage(
        `Failed to load agent profiles: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle profile file change (create or modify)
   */
  private async handleProfileChange(
    uri: vscode.Uri,
    changeType: 'created' | 'modified'
  ): Promise<void> {
    try {
      // Extract profile name from filename
      const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
      
      // Reload the specific profile
      const profile = await defaultAgentProfileLoader.loadProfile(fileName);
      
      if (!profile) {
        throw new Error(`Failed to load profile from ${uri.fsPath}`);
      }

      // Update cache
      this.profiles.set(profile.name.toLowerCase(), profile);

      // Notify callbacks
      const event: ProfileChangeEvent = {
        profileName: profile.name,
        profile,
        changeType,
        timestamp: new Date(),
      };

      this.notifyCallbacks(event);

      // Show notification
      vscode.window.showInformationMessage(
        `✓ Agent profile '${profile.name}' ${changeType === 'created' ? 'created' : 'reloaded'}`
      );
    } catch (error) {
      console.error(`[AgentProfileWatcher] Failed to handle ${changeType}:`, error);
      vscode.window.showErrorMessage(
        `Failed to ${changeType === 'created' ? 'create' : 'reload'} agent profile: ${error}`
      );
    }
  }

  /**
   * Handle profile file deletion
   */
  private async handleProfileDeletion(uri: vscode.Uri): Promise<void> {
    const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
    
    // Find and remove from cache
    const profile = this.profiles.get(fileName.toLowerCase());
    
    if (profile) {
      this.profiles.delete(fileName.toLowerCase());

      // Notify callbacks
      const event: ProfileChangeEvent = {
        profileName: profile.name,
        profile,
        changeType: 'deleted',
        timestamp: new Date(),
      };

      this.notifyCallbacks(event);

      vscode.window.showWarningMessage(
        `⚠️ Agent profile '${profile.name}' deleted`
      );
    }
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(event: ProfileChangeEvent): void {
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[AgentProfileWatcher] Callback error:', error);
      }
    }
  }
}

// Singleton instance
let watcherInstance: AgentProfileWatcher | null = null;

/**
 * Get or create singleton watcher instance
 */
export function getAgentProfileWatcher(extensionUri: vscode.Uri): AgentProfileWatcher {
  if (!watcherInstance) {
    watcherInstance = new AgentProfileWatcher(extensionUri);
  }
  return watcherInstance;
}

/**
 * Stop and dispose watcher instance
 */
export function disposeAgentProfileWatcher(): void {
  if (watcherInstance) {
    watcherInstance.stop();
    watcherInstance = null;
  }
}
