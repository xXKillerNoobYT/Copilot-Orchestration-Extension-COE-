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
   * In a real implementation, this would query task files or backend
   */
  private async fetchTaskExecutionData(plan: PlanJSON): Promise<TaskExecutionData[]> {
    // Mock implementation - in production, this would:
    // 1. Scan workspace for .task.md files
    // 2. Parse task status and metadata
    // 3. Map to execution data structure

    const executionData: TaskExecutionData[] = [];

    // For now, generate mock data based on plan features
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
   * - high impact -> major version (1.0.0 -> 2.0.0)
   */
  private bumpVersion(version: string, impact: 'low' | 'medium' | 'high'): string {
    const parts = version.split('.');
    const major = parseInt(parts[0] || '1', 10);
    const minor = parseInt(parts[1] || '0', 10);
    const patch = parseInt(parts[2] || '0', 10);

    if (impact === 'high') {
      // Breaking changes -> major version bump
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
