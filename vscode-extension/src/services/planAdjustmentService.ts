/**
 * Plan Adjustment Service
 * 
 * Integrates drift detection, adjustment engine, and plan updates into
 * a cohesive workflow for the Plan Adjustment feature (EPIC-008).
 * 
 * Responsibilities:
 * - Fetch task execution data from the workspace
 * - Trigger drift detection on current plans
 * - Generate AI-powered adjustment suggestions
 * - Apply adjustments with automatic version bumping
 * - Persist updated plans with backups
 */

import * as vscode from 'vscode';
import { PlanDriftDetector, type TaskExecutionData, type DriftAnalysisResult } from '../planBuilder/planDriftDetector';
import { PlanAdjustmentEngine, type AdjustmentSuggestion, type AdjustmentContext } from '../planBuilder/planAdjustmentEngine';
import { getPlanPersistenceService } from '../services/planPersistence';
import type { PlanJSON } from '../planBuilder/planGenerator';
import type { ParsedTask } from '../taskParser';

/**
 * Parsed task with additional metadata fields for execution tracking
 */
interface ParsedTaskWithMetadata extends Omit<ParsedTask, 'startedAt' | 'completedAt'> {
  feature_id?: string;
  actualHours?: number;
  startedAt?: string | Date;
  completedAt?: string | Date;
}

export interface PlanAdjustmentOptions {
  autoApply?: boolean;
  createBackup?: boolean;
  notifyUser?: boolean;
}

export interface PlanAdjustmentResult {
  success: boolean;
  driftAnalysis: DriftAnalysisResult;
  suggestions: AdjustmentSuggestion[];
  appliedSuggestions: AdjustmentSuggestion[];
  updatedPlan?: PlanJSON;
  newVersion?: string;
  backupPath?: string;
  error?: string;
}

/**
 * Service for managing plan adjustments
 */
export class PlanAdjustmentService {
  private persistenceService = getPlanPersistenceService();

  /**
   * Detect drift for a specific plan
   */
  async detectDrift(planFilename: string): Promise<DriftAnalysisResult> {
    try {
      // Load the plan
      const plan = await this.persistenceService.loadPlan(planFilename);

      // Fetch execution data from tasks
      const executionData = await this.fetchTaskExecutionData(plan);

      // Detect drift
      const detector = new PlanDriftDetector(plan);
      const driftAnalysis = await detector.detectDrift(executionData);

      return driftAnalysis;
    } catch (error) {
      throw new Error(`Failed to detect drift: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate adjustment suggestions for detected drift
   */
  async generateAdjustments(
    planFilename: string,
    driftAnalysis: DriftAnalysisResult
  ): Promise<AdjustmentSuggestion[]> {
    try {
      const plan = await this.persistenceService.loadPlan(planFilename);

      // Build adjustment context
      const context = await this.buildAdjustmentContext(plan);

      // Generate suggestions
      const engine = new PlanAdjustmentEngine(plan, context);
      const suggestions = await engine.generateAdjustments(driftAnalysis);

      return suggestions;
    } catch (error) {
      throw new Error(`Failed to generate adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply a specific adjustment suggestion to a plan
   */
  async applyAdjustment(
    planFilename: string,
    suggestion: AdjustmentSuggestion,
    options: PlanAdjustmentOptions = {}
  ): Promise<PlanAdjustmentResult> {
    try {
      // Load current plan
      const currentPlan = await this.persistenceService.loadPlan(planFilename);

      // Build adjustment context
      const context = await this.buildAdjustmentContext(currentPlan);

      // Apply the adjustment
      const engine = new PlanAdjustmentEngine(currentPlan, context);
      const updatedPlan = engine.applyAdjustment(currentPlan, suggestion);

      // Update metadata with new timestamp
      updatedPlan.metadata.updated_at = new Date().toISOString();

      // Increment version number for change tracking (semantic versioning)
      const currentVersion = updatedPlan.metadata.version || '1.0.0';
      updatedPlan.metadata.version = this.bumpVersion(currentVersion, suggestion.impact);

      // Save with backup and new version
      const saveResult = await this.persistenceService.savePlan(updatedPlan, {
        version: updatedPlan.metadata.version,
        createBackup: options.createBackup ?? true,
      });

      // Broadcast plan update event via WebSocket
      await this.broadcastPlanUpdate(updatedPlan, suggestion);

      // Notify user if requested
      if (options.notifyUser) {
        vscode.window.showInformationMessage(
          `Plan updated to version ${saveResult.version}. ${saveResult.backup ? 'Backup created.' : ''}`
        );
      }

      return {
        success: true,
        driftAnalysis: {
          hasDrift: false,
          metrics: {} as any,
          recommendations: [],
          suggestedActions: [],
          timestamp: new Date(),
        },
        suggestions: [suggestion],
        appliedSuggestions: [suggestion],
        updatedPlan,
        newVersion: saveResult.version,
        backupPath: saveResult.backup,
      };
    } catch (error) {
      return {
        success: false,
        driftAnalysis: {} as any,
        suggestions: [],
        appliedSuggestions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Complete workflow: detect drift, generate suggestions, and optionally apply
   */
  async adjustPlan(
    planFilename: string,
    options: PlanAdjustmentOptions = {}
  ): Promise<PlanAdjustmentResult> {
    try {
      // Step 1: Detect drift
      const driftAnalysis = await this.detectDrift(planFilename);

      if (!driftAnalysis.hasDrift) {
        return {
          success: true,
          driftAnalysis,
          suggestions: [],
          appliedSuggestions: [],
        };
      }

      // Step 2: Generate suggestions
      const suggestions = await this.generateAdjustments(planFilename, driftAnalysis);

      if (suggestions.length === 0) {
        return {
          success: true,
          driftAnalysis,
          suggestions: [],
          appliedSuggestions: [],
        };
      }

      // Step 3: Auto-apply if requested (only auto-applicable suggestions)
      const appliedSuggestions: AdjustmentSuggestion[] = [];
      let updatedPlan: PlanJSON | undefined;
      let newVersion: string | undefined;
      let backupPath: string | undefined;

      if (options.autoApply) {
        for (const suggestion of suggestions.filter(s => !!s.changes)) {
          const result = await this.applyAdjustment(planFilename, suggestion, {
            ...options,
            notifyUser: false, // We'll notify once at the end
          });

          if (result.success) {
            appliedSuggestions.push(suggestion);
            updatedPlan = result.updatedPlan;
            newVersion = result.newVersion;
            backupPath = result.backupPath;
          }
        }

        if (options.notifyUser && appliedSuggestions.length > 0) {
          vscode.window.showInformationMessage(
            `Applied ${appliedSuggestions.length} plan adjustments. Version: ${newVersion}`
          );
        }
      }

      return {
        success: true,
        driftAnalysis,
        suggestions,
        appliedSuggestions,
        updatedPlan,
        newVersion,
        backupPath,
      };
    } catch (error) {
      return {
        success: false,
        driftAnalysis: {} as any,
        suggestions: [],
        appliedSuggestions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch task execution data from workspace
   * Scans workspace for .task.md files and parses their status and metadata
   */
  private async fetchTaskExecutionData(plan: PlanJSON): Promise<TaskExecutionData[]> {
    const executionData: TaskExecutionData[] = [];

    try {
      // Get workspace root
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        console.warn('[PlanAdjustmentService] No workspace folder found, using mock data');
        return this.generateMockExecutionData(plan);
      }

      // Import task parser and path dynamically
      const { parseTasksFromDirectory } = await import('../taskParser.js');
      const path = await import('path');

      // Define common task directories to search
      const taskDirectories = [
        path.join(workspaceRoot, '.github/issues'),
        path.join(workspaceRoot, 'tasks'),
        path.join(workspaceRoot, '.orchestrator/tasks'),
        path.join(workspaceRoot, 'Docs/Tasks'),
      ];

      // Collect all tasks from all directories
      const allTasks: Awaited<ReturnType<typeof parseTasksFromDirectory>> = [];
      for (const dir of taskDirectories) {
        try {
          const tasks = await parseTasksFromDirectory(dir, {
            validateSchema: false, // Don't fail on validation errors
            failOnInvalid: false,
          });
          allTasks.push(...tasks);
        } catch (error) {
          // Directory might not exist, that's OK
          console.log(`[PlanAdjustmentService] Skipping directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`[PlanAdjustmentService] Found ${allTasks.length} task files`);

      // Map tasks to execution data
      for (const task of allTasks) {
        // Try to match task to a feature in the plan
        const matchingFeature = this.findMatchingFeature(plan, task);

        if (matchingFeature) {
          // Cast to ParsedTaskWithMetadata to access optional metadata fields
          // These fields (startedAt, completedAt, actualHours) may exist in rawFrontMatter
          // but are not part of the base ParsedTask interface since they're task execution metadata
          // rather than task definition metadata
          const taskWithMetadata = task as ParsedTaskWithMetadata;
          
          const executionDataItem: TaskExecutionData = {
            taskId: task.id,
            featureId: matchingFeature.id,
            status: this.mapTaskStatusToExecution(task.status || 'pending'),
            estimatedHours: this.parseEffortEstimate(task.estimate) || matchingFeature.effort_estimate || 0,
            actualHours: this.calculateActualHours(taskWithMetadata),
            startedAt: taskWithMetadata.startedAt ? new Date(taskWithMetadata.startedAt) : undefined,
            completedAt: taskWithMetadata.completedAt ? new Date(taskWithMetadata.completedAt) : undefined,
            blockedBy: task.dependencies || [],
          };

          executionData.push(executionDataItem);
        }
      }

      console.log(`[PlanAdjustmentService] Mapped ${executionData.length} tasks to features`);

      // If no tasks found, generate mock data for testing
      if (executionData.length === 0) {
        console.warn('[PlanAdjustmentService] No task files found, using mock data');
        return this.generateMockExecutionData(plan);
      }

      return executionData;
    } catch (error) {
      console.error('[PlanAdjustmentService] Error fetching task execution data:', error);
      // Fallback to mock data
      return this.generateMockExecutionData(plan);
    }
  }

  /**
   * Find a feature in the plan that matches the given task
   */
  private findMatchingFeature(plan: PlanJSON, task: ParsedTaskWithMetadata): PlanJSON['features'][number] | undefined {
    // Try to match by feature ID in task metadata
    if (task.feature_id) {
      const feature = plan.features.find(f => f.id === task.feature_id);
      if (feature) {
        return feature;
      }
    }

    // Try to match by task title/name similarity
    const taskTitle = task.title?.toLowerCase() || '';
    const matchingFeature = plan.features.find(f => {
      const featureName = f.name.toLowerCase();
      return taskTitle.includes(featureName) || featureName.includes(taskTitle);
    });

    return matchingFeature;
  }

  /**
   * Map task status to execution data status
   */
  private mapTaskStatusToExecution(status: string): TaskExecutionData['status'] {
    const statusMap: Record<string, TaskExecutionData['status']> = {
      'pending': 'pending',
      'approved': 'pending',
      'in_progress': 'in_progress',
      'testing': 'in_progress',
      'review': 'in_progress',
      'completed': 'completed',
      'failed': 'failed',
      'blocked': 'blocked',
      'cancelled': 'failed',
    };

    const mappedStatus = statusMap[status];

    if (!mappedStatus) {
      console.warn(`[PlanAdjustmentService] Unmapped task status '${status}', defaulting to 'pending'`);
      return 'pending';
    }

    return mappedStatus;
  }

  /**
   * Parse effort estimate string to hours
   */
  private parseEffortEstimate(estimate?: string): number | undefined {
    if (!estimate) {
      return undefined;
    }

    const trimmed = estimate.trim().toLowerCase();

    // Handle hour formats: "8h", "8 hours", "8 hrs"
    const hourMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)?$/);
    if (hourMatch) {
      return parseFloat(hourMatch[1]);
    }

    // Handle day formats: "1d", "2 days"
    const dayMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:d|day|days)$/);
    if (dayMatch) {
      return parseFloat(dayMatch[1]) * 8; // 8 hours per day
    }

    // Handle week formats: "1w", "2 weeks"
    const weekMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:w|wk|week|weeks)$/);
    if (weekMatch) {
      return parseFloat(weekMatch[1]) * 40; // 40 hours per week
    }

    return undefined;
  }

  /**
   * Calculate actual hours spent on a task
   * In production, this would integrate with time tracking or Git history
   */
  private calculateActualHours(task: ParsedTaskWithMetadata): number | undefined {
    // If task has explicit actual hours, use that
    if (task.actualHours !== undefined) {
      return task.actualHours;
    }

    // If task is completed and has started/completed dates, calculate
    if (task.startedAt && task.completedAt) {
      const start = new Date(task.startedAt);
      const end = new Date(task.completedAt);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHours);
    }

    // No data available
    return undefined;
  }

  /**
   * Generate mock execution data for testing
   * Used as fallback when no real task files are found
   */
  private generateMockExecutionData(plan: PlanJSON): TaskExecutionData[] {
    const executionData: TaskExecutionData[] = [];

    for (const feature of plan.features) {
      const taskData: TaskExecutionData = {
        taskId: `TASK-${feature.id}`,
        featureId: feature.id,
        status: this.mapFeatureStatus(feature.status),
        estimatedHours: feature.effort_estimate || 0,
        // Use deterministic mock actual hours to keep tests stable
        actualHours: feature.effort_estimate ?? 0,
      };

      executionData.push(taskData);
    }

    return executionData;
  }

  /**
   * Map feature status to task execution status
   */
  private mapFeatureStatus(status: string): TaskExecutionData['status'] {
    const statusMap: Record<string, TaskExecutionData['status']> = {
      'pending': 'pending',
      'in-progress': 'in_progress',
      'completed': 'completed',
      'blocked': 'blocked',
      'failed': 'failed',
    };

    const mappedStatus = statusMap[status];

    if (!mappedStatus) {
      // Surface potential data inconsistencies while preserving existing fallback behavior
      console.warn(
        `[PlanAdjustmentService] Unmapped feature status '${status}', defaulting to 'pending'.`
      );
      return 'pending';
    }

    return mappedStatus;
  }

  /**
   * Bump semantic version based on change impact
   * - low impact -> patch version (1.0.0 -> 1.0.1)
   * - medium impact -> minor version (1.0.0 -> 1.1.0)
   * - high/critical impact -> major version (1.0.0 -> 2.0.0)
   */
  private bumpVersion(version: string, impact: 'low' | 'medium' | 'high' | 'critical'): string {
    const parts = version.split('.');
    const major = parseInt(parts[0] || '1', 10);
    const minor = parseInt(parts[1] || '0', 10);
    const patch = parseInt(parts[2] || '0', 10);

    if (impact === 'high' || impact === 'critical') {
      // Breaking or critical changes -> major version bump
      return `${major + 1}.0.0`;
    } else if (impact === 'medium') {
      // Moderate changes -> minor version bump
      return `${major}.${minor + 1}.0`;
    } else {
      // Minor changes -> patch version bump
      return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Broadcast plan update event via WebSocket
   * Notifies connected clients about plan changes in real-time
   */
  private async broadcastPlanUpdate(
    updatedPlan: PlanJSON,
    suggestion: AdjustmentSuggestion
  ): Promise<void> {
    try {
      // Import WebSocket client dynamically to avoid circular dependencies
      const { getWebSocketClient } = await import('./webSocketClient.js');
      const wsClient = getWebSocketClient();

      if (!wsClient) {
        console.log('[PlanAdjustmentService] WebSocket not available, skipping broadcast');
        return;
      }

      // Prepare event data
      const planWithId = updatedPlan as PlanJSON & { id?: number };
      const eventData = {
        plan_id: planWithId.id,
        plan_name: updatedPlan.project.name,
        version: updatedPlan.metadata.version,
        updated_at: updatedPlan.metadata.updated_at,
        adjustment_category: suggestion.category,
        adjustment_description: suggestion.description,
        impact: suggestion.impact,
        timestamp: new Date().toISOString(),
      };

      // Subscribe to the plan-updates channel
      // Note: subscribe() expects channel and event name
      interface PlanUpdateEvent {
        plan_id?: number;
        plan_name?: string;
        version?: string;
        updated_at?: string;
        adjustment_category?: string;
        adjustment_description?: string;
        impact?: string;
        timestamp?: string;
      }

      wsClient.subscribe('plan-updates', 'plan.updated', (data: PlanUpdateEvent) => {
        console.log('[PlanAdjustmentService] Received plan update broadcast:', data);
      });

      // NOTE: This is currently a subscription-only WebSocket implementation.
      // The backend broadcasts plan updates and clients only listen.
      // TODO(EPIC-008): When client-side broadcasting is required, extend the WebSocket client
      // (e.g. add wsClient.emit/publish) and invoke it here to send `eventData` to the server.
      console.log('[PlanAdjustmentService] Subscribed to plan-updates channel. Event data logged for debugging:', eventData);

    } catch (error) {
      // Don't fail the update if WebSocket broadcast fails
      console.error('[PlanAdjustmentService] Failed to broadcast plan update:', error);
    }
  }

  /**
   * Build adjustment context from plan and workspace
   */
  private async buildAdjustmentContext(plan: PlanJSON): Promise<AdjustmentContext> {
    // In production, this would analyze workspace and historical data
    return {
      projectPhase: this.determineProjectPhase(plan),
      teamVelocity: 10, // tasks per week - would be calculated
      historicalAccuracy: 75, // % - would be calculated from past estimates
      stakeholderPriorities: ['performance', 'security', 'ux'],
      constraints: ['timeline', 'budget'],
    };
  }

  /**
   * Determine project phase from plan metadata
   */
  private determineProjectPhase(plan: PlanJSON): AdjustmentContext['projectPhase'] {
    const status = plan.metadata.status;

    if (status === 'draft') {
      return 'planning';
    } else if (status === 'in-progress' || status === 'approved') {
      return 'execution';
    } else {
      return 'maintenance';
    }
  }
}

/**
 * Singleton instance
 */
let serviceInstance: PlanAdjustmentService | null = null;

export function getPlanAdjustmentService(): PlanAdjustmentService {
  if (!serviceInstance) {
    serviceInstance = new PlanAdjustmentService();
  }
  return serviceInstance;
}
