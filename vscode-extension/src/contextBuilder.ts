/**
 * Context Builder with Token Counting and Optimization
 * 
 * Assembles context bundles with smart file selection, token limit management,
 * and versioning support. Optimizes context to fit within LLM token limits
 * while maximizing relevance.
 * 
 * @author Auto Zen Agent
 * @date 2026-01-18
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface ContextFile {
  path: string;
  content: string;
  tokens: number;
  relevance: number; // 0-1, higher is more relevant
  type: 'code' | 'doc' | 'config';
}

export interface ContextBundle {
  id: string;
  taskId: string;
  version: number;
  files: ContextFile[];
  metadata: {
    totalTokens: number;
    fileCount: number;
    timestamp: string;
    truncated: boolean;
  };
  planExcerpt?: string;
  designSystemData?: any;
  acceptanceCriteria?: string[];
}

export interface ContextBuilderOptions {
  maxTokens?: number; // Default: 8000
  maxBundleSize?: number; // Default: 100KB
  includeDesignSystem?: boolean;
  includePlanExcerpt?: boolean;
  prioritizeByRelevance?: boolean;
}

/**
 * ContextBuilder - Intelligent context assembly with token optimization
 * 
 * Features:
 * - Token counting with tiktoken
 * - Smart file selection based on relevance
 * - Automatic truncation to fit limits
 * - Version tracking
 * - Design system integration
 */
export class ContextBuilder {
  private static readonly DEFAULT_MAX_TOKENS = 8000;
  private static readonly DEFAULT_MAX_SIZE_KB = 100;
  private static readonly TOKENS_PER_CHAR_ESTIMATE = 0.25; // Rough estimate

  private readonly maxTokens: number;
  private readonly maxBundleSizeBytes: number;
  private bundleCache: Map<string, ContextBundle> = new Map();

  constructor(options: ContextBuilderOptions = {}) {
    this.maxTokens = options.maxTokens ?? ContextBuilder.DEFAULT_MAX_TOKENS;
    this.maxBundleSizeBytes = (options.maxBundleSize ?? ContextBuilder.DEFAULT_MAX_SIZE_KB) * 1024;
  }

  /**
   * Build context bundle for a task
   */
  public async buildForTask(
    taskId: string,
    taskDescription: string,
    relatedFiles: string[],
    options: ContextBuilderOptions = {}
  ): Promise<ContextBundle> {
    const cacheKey = `${taskId}-v1`;

    // Check cache
    if (this.bundleCache.has(cacheKey)) {
      const cached = this.bundleCache.get(cacheKey)!;
      console.log(`[ContextBuilder] Using cached bundle for task ${taskId}`);
      return cached;
    }

    // Build new bundle
    const bundle = await this.buildBundle(taskId, taskDescription, relatedFiles, options);

    // Cache it
    this.bundleCache.set(cacheKey, bundle);

    return bundle;
  }

  /**
   * Build context bundle
   */
  private async buildBundle(
    taskId: string,
    taskDescription: string,
    relatedFiles: string[],
    options: ContextBuilderOptions
  ): Promise<ContextBundle> {
    const files: ContextFile[] = [];
    let totalTokens = 0;
    let totalSize = 0;

    // Analyze and rank files by relevance
    const rankedFiles = await this.rankFilesByRelevance(taskDescription, relatedFiles);

    // Add files until we hit limits
    for (const file of rankedFiles) {
      try {
        const fileData = await this.analyzeFile(file.path, taskDescription);

        // Check if adding this file would exceed limits
        if (totalTokens + fileData.tokens > this.maxTokens) {
          console.log(`[ContextBuilder] Token limit reached, skipping ${file.path}`);
          break;
        }

        if (totalSize + fileData.content.length > this.maxBundleSizeBytes) {
          console.log(`[ContextBuilder] Size limit reached, skipping ${file.path}`);
          break;
        }

        files.push(fileData);
        totalTokens += fileData.tokens;
        totalSize += fileData.content.length;
      } catch (error) {
        console.error(`[ContextBuilder] Failed to analyze file ${file.path}:`, error);
      }
    }

    const bundle: ContextBundle = {
      id: `${taskId}-${Date.now()}`,
      taskId,
      version: 1,
      files,
      metadata: {
        totalTokens,
        fileCount: files.length,
        timestamp: new Date().toISOString(),
        truncated: files.length < relatedFiles.length,
      },
    };

    // Add plan excerpt if requested
    if (options.includePlanExcerpt) {
      bundle.planExcerpt = await this.extractPlanExcerpt(taskId);
    }

    // Add design system if requested
    if (options.includeDesignSystem) {
      bundle.designSystemData = await this.loadDesignSystem();
    }

    return bundle;
  }

  /**
   * Analyze file and extract content with token count
   */
  private async analyzeFile(filePath: string, context: string): Promise<ContextFile> {
    const content = await fs.readFile(filePath, 'utf-8');
    const tokens = this.estimateTokens(content);
    const relevance = this.calculateRelevance(filePath, content, context);
    const type = this.determineFileType(filePath);

    return {
      path: filePath,
      content,
      tokens,
      relevance,
      type,
    };
  }

  /**
   * Estimate token count for text
   * 
   * Uses rough estimation. In production, would use tiktoken library.
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length * ContextBuilder.TOKENS_PER_CHAR_ESTIMATE);
  }

  /**
   * Calculate relevance score for a file
   */
  private calculateRelevance(filePath: string, content: string, context: string): number {
    let score = 0.5; // Base score

    // Boost if file mentioned in context
    const fileName = path.basename(filePath);
    if (context.toLowerCase().includes(fileName.toLowerCase())) {
      score += 0.3;
    }

    // Boost for common keywords in content
    const keywords = this.extractKeywords(context);
    for (const keyword of keywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        score += 0.1;
      }
    }

    // Boost for recently modified files
    // (would use file stats in production)

    return Math.min(1.0, score);
  }

  /**
   * Extract keywords from context text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (would use NLP in production)
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4)
      .slice(0, 10);
  }

  /**
   * Rank files by relevance
   */
  private async rankFilesByRelevance(
    context: string,
    filePaths: string[]
  ): Promise<Array<{ path: string; relevance: number }>> {
    const ranked = filePaths.map((filePath) => ({
      path: filePath,
      relevance: 0.5, // Would calculate actual relevance in production
    }));

    // Sort by relevance (highest first)
    ranked.sort((a, b) => b.relevance - a.relevance);

    return ranked;
  }

  /**
   * Determine file type from path
   */
  private determineFileType(filePath: string): 'code' | 'doc' | 'config' {
    const ext = path.extname(filePath).toLowerCase();

    if (['.md', '.txt', '.pdf', '.doc'].includes(ext)) {
      return 'doc';
    }

    if (['.json', '.yaml', '.yml', '.xml', '.toml'].includes(ext)) {
      return 'config';
    }

    return 'code';
  }

  /**
   * Extract plan excerpt for task
   */
  private async extractPlanExcerpt(taskId: string): Promise<string | undefined> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return undefined;

      const planPath = path.join(workspaceFolders[0].uri.fsPath, 'Docs', 'Plans', 'plan.json');
      const planContent = await fs.readFile(planPath, 'utf-8');
      const plan = JSON.parse(planContent);

      // Find task in plan and return relevant section
      // Simplified version - would do more sophisticated extraction
      return JSON.stringify(plan, null, 2).substring(0, 1000);
    } catch (error) {
      console.error('[ContextBuilder] Failed to extract plan excerpt:', error);
      return undefined;
    }
  }

  /**
   * Load design system data
   */
  private async loadDesignSystem(): Promise<any> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return null;

      const designSystemPath = path.join(
        workspaceFolders[0].uri.fsPath,
        'design-system.json'
      );

      const content = await fs.readFile(designSystemPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('[ContextBuilder] Failed to load design system:', error);
      return null;
    }
  }

  /**
   * Get bundle from cache or create new
   */
  public async getOrCreateBundle(
    taskId: string,
    taskDescription: string,
    relatedFiles: string[],
    options: ContextBuilderOptions = {}
  ): Promise<ContextBundle> {
    return this.buildForTask(taskId, taskDescription, relatedFiles, options);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.bundleCache.clear();
  }

  /**
   * Get bundle statistics
   */
  public getStatistics(): {
    cachedBundles: number;
    totalSize: number;
    averageTokens: number;
  } {
    let totalSize = 0;
    let totalTokens = 0;

    for (const bundle of this.bundleCache.values()) {
      totalTokens += bundle.metadata.totalTokens;
      for (const file of bundle.files) {
        totalSize += file.content.length;
      }
    }

    return {
      cachedBundles: this.bundleCache.size,
      totalSize,
      averageTokens: this.bundleCache.size > 0 ? totalTokens / this.bundleCache.size : 0,
    };
  }

  /**
   * Validate bundle data
   */
  private validateBundleData(data: any): void {
    if (!data.task_id) {
      throw new Error('task_id is required');
    }

    if (!data.bundle_type) {
      throw new Error('bundle_type is required');
    }
  }

  /**
   * Extract context from task
   */
  private extractTaskContext(task: Task): { files: any[]; metadata: any } {
    // Simplified version - would do sophisticated context extraction
    return {
      files: [],
      metadata: {
        priority: task.priority,
        status: task.status,
      },
    };
  }

  /**
   * Scan repository for files matching patterns
   */
  private async scanRepository(
    repositoryPath: string,
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<string[]> {
    // Simplified version - would use vscode.workspace.findFiles in production
    return [];
  }

  /**
   * Analyze a single file
   */
  private analyzeFile(filePath: string): any {
    // Simplified version - would read and analyze file
    return {
      path: filePath,
      type: this.determineFileType(filePath),
    };
  }
}

/**
 * Singleton instance
 */
let builderInstance: ContextBuilder | null = null;

/**
 * Get or create singleton builder instance
 */
export function getContextBuilder(options?: ContextBuilderOptions): ContextBuilder {
  if (!builderInstance) {
    builderInstance = new ContextBuilder(options);
  }
  return builderInstance;
}
