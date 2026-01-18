/**
 * Design System Service
 * Loads and manages design-system.json from workspace
 * Provides inline UI design references during development
 * 
 * Reference: PRD.json F005 - Design System Integration
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import { logError, showErrorMessage } from '../utils/errorHandler';
import type { DesignTokens } from '../planBuilder/designSystem/tokenGenerator';
import { validateDesignTokens } from '../planBuilder/designSystem/validator';

/**
 * Extended design system schema with breakpoints
 * Extends DesignTokens with optional additional metadata
 */
export interface DesignSystem extends DesignTokens {
  /** Responsive breakpoint definitions (e.g., { sm: '640px', md: '1024px' }) */
  breakpoints?: Record<string, string>;
  /** Design system version (semver recommended) */
  version?: string;
  /** Optional metadata about the design system */
  metadata?: {
    name?: string;
    description?: string;
    lastModified?: string;
  };
}

/**
 * Cache entry for design system data
 */
interface CacheEntry {
  data: DesignSystem;
  timestamp: number;
}

/**
 * Design system service for loading and managing design system files
 */
export class DesignSystemService {
  private static instance: DesignSystemService | undefined;
  private designSystem: DesignSystem | null = null;
  private fileWatchers: vscode.FileSystemWatcher[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly FILE_NAMES = ['design-system.json', 'design-system.yaml', 'design-system.yml'];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DesignSystemService {
    if (!DesignSystemService.instance) {
      DesignSystemService.instance = new DesignSystemService();
    }
    return DesignSystemService.instance;
  }

  /**
   * Initialize the service and set up file watcher
   */
  public async initialize(workspaceRoot: string): Promise<void> {
    try {
      // Load design system
      await this.loadDesignSystem(workspaceRoot);

      // Set up file watcher
      this.setupFileWatcher(workspaceRoot);
    } catch (error) {
      logError(error, 'DesignSystemService.initialize');
      // Don't throw - graceful degradation
    }
  }

  /**
   * Load design system from workspace
   */
  public async loadDesignSystem(workspaceRoot: string, forceReload = false): Promise<DesignSystem | null> {
    try {
      // Check cache first
      if (!forceReload) {
        const cached = this.getFromCache(workspaceRoot);
        if (cached) {
          this.designSystem = cached;
          return cached;
        }
      }

      // Try to find and load design system file
      const designSystemPath = await this.findDesignSystemFile(workspaceRoot);
      if (!designSystemPath) {
        // Graceful fallback - no design system file found
        this.designSystem = null;
        return null;
      }

      // Load and parse file
      const content = await fs.readFile(designSystemPath, 'utf-8');
      const data = this.parseDesignSystemFile(content, designSystemPath);

      // Validate design system
      const validationErrors = validateDesignTokens(data);
      if (validationErrors.length > 0) {
        logError(
          new Error(`Design system validation failed: ${validationErrors.map(e => e.message).join(', ')}`),
          'DesignSystemService.loadDesignSystem'
        );
        // Still use the data, but log warnings
      }

      // Cache the result
      this.cache.set(workspaceRoot, {
        data,
        timestamp: Date.now(),
      });

      this.designSystem = data;
      return data;
    } catch (error) {
      logError(error, 'DesignSystemService.loadDesignSystem', { workspaceRoot });
      this.designSystem = null;
      return null;
    }
  }

  /**
   * Get current design system
   */
  public getDesignSystem(): DesignSystem | null {
    return this.designSystem;
  }

  /**
   * Get color by name with format conversion
   */
  public getColor(name: string, format: 'hex' | 'rgb' | 'hsl' = 'hex'): string | null {
    if (!this.designSystem?.colors) {
      return null;
    }

    const color = this.designSystem.colors[name];
    if (!color) {
      return null;
    }

    switch (format) {
      case 'hex':
        return color;
      case 'rgb':
        return this.hexToRgb(color);
      case 'hsl':
        return this.hexToHsl(color);
      default:
        return color;
    }
  }

  /**
   * Search design system tokens
   */
  public search(query: string): Array<{ type: string; name: string; value: any }> {
    if (!this.designSystem) {
      return [];
    }

    const results: Array<{ type: string; name: string; value: any }> = [];
    const lowerQuery = query.toLowerCase();

    // Search colors
    if (this.designSystem.colors) {
      Object.entries(this.designSystem.colors).forEach(([name, value]) => {
        if (name.toLowerCase().includes(lowerQuery) || value.toLowerCase().includes(lowerQuery)) {
          results.push({ type: 'color', name, value });
        }
      });
    }

    // Search typography
    if (this.designSystem.typography) {
      this.designSystem.typography.forEach((typo) => {
        if (typo.name.toLowerCase().includes(lowerQuery)) {
          results.push({ type: 'typography', name: typo.name, value: typo });
        }
      });
    }

    // Search spacing
    if (this.designSystem.spacing) {
      Object.entries(this.designSystem.spacing).forEach(([name, value]) => {
        if (name.toLowerCase().includes(lowerQuery) || value.toLowerCase().includes(lowerQuery)) {
          results.push({ type: 'spacing', name, value });
        }
      });
    }

    // Search components
    if (this.designSystem.components) {
      Object.entries(this.designSystem.components).forEach(([name, value]) => {
        if (name.toLowerCase().includes(lowerQuery)) {
          results.push({ type: 'component', name, value });
        }
      });
    }

    return results;
  }

  /**
   * Dispose service and clean up watchers
   */
  public dispose(): void {
    // Dispose all file watchers
    this.fileWatchers.forEach(watcher => watcher.dispose());
    this.fileWatchers = [];
    this.cache.clear();
    this.designSystem = null;
  }

  /**
   * Find design system file in workspace
   */
  private async findDesignSystemFile(workspaceRoot: string): Promise<string | null> {
    for (const fileName of this.FILE_NAMES) {
      const filePath = path.join(workspaceRoot, fileName);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // File doesn't exist, try next
      }
    }
    return null;
  }

  /**
   * Parse design system file (JSON or YAML)
   */
  private parseDesignSystemFile(content: string, filePath: string): DesignSystem {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      return yaml.parse(content);
    } else {
      // Try JSON first, then YAML
      try {
        return JSON.parse(content);
      } catch {
        return yaml.parse(content);
      }
    }
  }

  /**
   * Get from cache if not expired
   */
  private getFromCache(workspaceRoot: string): DesignSystem | null {
    const cached = this.cache.get(workspaceRoot);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(workspaceRoot);
      return null;
    }

    return cached.data;
  }

  /**
   * Set up file watcher for automatic reloading
   */
  private setupFileWatcher(workspaceRoot: string): void {
    // Clean up existing watchers
    this.fileWatchers.forEach(watcher => watcher.dispose());
    this.fileWatchers = [];

    // Create pattern for all supported file names
    const patterns = this.FILE_NAMES.map(name => 
      new vscode.RelativePattern(workspaceRoot, name)
    );

    // Watch all patterns and store all watchers for proper disposal
    patterns.forEach(pattern => {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidChange(() => {
        this.handleFileChange(workspaceRoot);
      });

      watcher.onDidCreate(() => {
        this.handleFileChange(workspaceRoot);
      });

      watcher.onDidDelete(() => {
        this.handleFileDelete();
      });

      // Store all watchers for proper cleanup
      this.fileWatchers.push(watcher);
    });
  }

  /**
   * Handle file change
   */
  private async handleFileChange(workspaceRoot: string): Promise<void> {
    try {
      // Invalidate cache
      this.cache.delete(workspaceRoot);
      
      // Reload design system
      await this.loadDesignSystem(workspaceRoot, true);
      
      // Notify about reload
      vscode.window.showInformationMessage('Design system reloaded');
    } catch (error) {
      logError(error, 'DesignSystemService.handleFileChange');
    }
  }

  /**
   * Handle file deletion
   */
  private handleFileDelete(): void {
    this.designSystem = null;
    this.cache.clear();
  }

  /**
   * Normalize hex color to 6-digit format
   * Supports both 3-digit (#FFF) and 6-digit (#FFFFFF) formats
   */
  private normalizeHex(hex: string): string {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    
    // Expand 3-digit to 6-digit format
    if (cleanHex.length === 3) {
      return `#${cleanHex[0]}${cleanHex[0]}${cleanHex[1]}${cleanHex[1]}${cleanHex[2]}${cleanHex[2]}`;
    }
    
    // Already 6-digit format
    if (cleanHex.length === 6) {
      return `#${cleanHex}`;
    }
    
    // Invalid format, return as-is
    return hex;
  }

  /**
   * Convert hex to RGB
   * Supports both 3-digit (#FFF) and 6-digit (#FFFFFF) hex colors
   */
  private hexToRgb(hex: string): string {
    const normalized = this.normalizeHex(hex);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
    if (!result) {
      return hex;
    }

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert hex to HSL
   * Supports both 3-digit (#FFF) and 6-digit (#FFFFFF) hex colors
   */
  private hexToHsl(hex: string): string {
    const normalized = this.normalizeHex(hex);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
    if (!result) {
      return hex;
    }

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    const lPercent = Math.round(l * 100);

    return `hsl(${h}, ${s}%, ${lPercent}%)`;
  }
}
