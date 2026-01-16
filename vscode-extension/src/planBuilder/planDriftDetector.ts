/**
 * Plan Drift Detector
 * 
 * Compares wizard-generated plans against actual execution to detect drift:
 * - Feature scope changes (features added/removed)
 * - Timeline variance (actual vs planned dates)
 * - Effort estimate accuracy (planned vs actual hours)
 * - Dependency violations (blocked tasks, circular deps)
 * - Priority shifts (features re-prioritized)
 * 
 * Used by Plan Adjustment Workflow to suggest plan updates
 */

import type { PlanJSON, Feature } from '../planBuilder/planGenerator';

export interface TaskExecutionData {
  taskId: string;
  featureId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  estimatedHours: number;
  actualHours?: number;
  startedAt?: Date;
  completedAt?: Date;
  blockedBy?: string[];
}

export interface DriftMetrics {
  scopeDrift: ScopeDrift;
  timelineDrift: TimelineDrift;
  effortDrift: EffortDrift;
  dependencyDrift: DependencyDrift;
  priorityDrift: PriorityDrift;
  overallDriftScore: number; // 0-100, higher = more drift
  driftSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface ScopeDrift {
  plannedFeatures: number;
  actualFeatures: number;
  featuresAdded: string[];
  featuresRemoved: string[];
  featuresModified: string[];
  driftPercentage: number;
}

export interface TimelineDrift {
  plannedStartDate: Date;
  actualStartDate: Date;
  plannedEndDate: Date;
  projectedEndDate: Date;
  daysBehindSchedule: number;
  daysAheadSchedule: number;
  milestonesAtRisk: string[];
}

export interface EffortDrift {
  totalPlannedHours: number;
  totalActualHours: number;
  varianceHours: number;
  variancePercentage: number;
  overestimatedFeatures: string[];
  underestimatedFeatures: string[];
  accuracyScore: number; // 0-100, 100 = perfect estimates
}

export interface DependencyDrift {
  newBlockers: string[];
  resolvedBlockers: string[];
  circularDependenciesDetected: string[][];
  dependencyViolations: string[];
}

export interface PriorityDrift {
  priorityChanges: Array<{
    featureId: string;
    plannedPriority: string;
    currentPriority: string;
    reason: string;
  }>;
  criticalPathChanges: boolean;
}

export interface DriftAnalysisResult {
  hasDrift: boolean;
  metrics: DriftMetrics;
  recommendations: string[];
  suggestedActions: SuggestedAction[];
  timestamp: Date;
}

export interface SuggestedAction {
  type: 'update_timeline' | 'adjust_scope' | 'reestimate_effort' | 'update_priorities' | 'resolve_blockers';
  description: string;
  impact: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
  changes: Record<string, any>;
}

/**
 * Detects drift between plan and execution
 */
export class PlanDriftDetector {
  private driftThreshold = 15; // % drift to trigger warnings

  constructor(private plan: PlanJSON) {}

  /**
   * Analyze drift against actual execution data
   */
  async detectDrift(executionData: TaskExecutionData[]): Promise<DriftAnalysisResult> {
    const scopeDrift = this.analyzeScopeDrift(executionData);
    const timelineDrift = this.analyzeTimelineDrift(executionData);
    const effortDrift = this.analyzeEffortDrift(executionData);
    const dependencyDrift = this.analyzeDependencyDrift(executionData);
    const priorityDrift = this.analyzePriorityDrift(executionData);

    const overallDriftScore = this.calculateOverallDrift({
      scopeDrift,
      timelineDrift,
      effortDrift,
      dependencyDrift,
      priorityDrift,
    });

    const driftSeverity = this.getDriftSeverity(overallDriftScore);
    const hasDrift = overallDriftScore > this.driftThreshold;

    const metrics: DriftMetrics = {
      scopeDrift,
      timelineDrift,
      effortDrift,
      dependencyDrift,
      priorityDrift,
      overallDriftScore,
      driftSeverity,
    };

    const recommendations = this.generateRecommendations(metrics);
    const suggestedActions = this.generateSuggestedActions(metrics);

    return {
      hasDrift,
      metrics,
      recommendations,
      suggestedActions,
      timestamp: new Date(),
    };
  }

  /**
   * Analyze scope drift (features added/removed/modified)
   */
  private analyzeScopeDrift(executionData: TaskExecutionData[]): ScopeDrift {
    const plannedFeatureIds = new Set(this.plan.features.map(f => f.id));
    const actualFeatureIds = new Set(executionData.map(t => t.featureId));

    const featuresAdded = Array.from(actualFeatureIds).filter(id => !plannedFeatureIds.has(id));
    const featuresRemoved = Array.from(plannedFeatureIds).filter(id => !actualFeatureIds.has(id));

    // Features with modified scope (different task counts)
    const featuresModified = this.plan.features
      .filter(f => {
        const plannedTasks = 1; // Simplified - would count decomposed tasks
        const actualTasks = executionData.filter(t => t.featureId === f.id).length;
        return actualTasks !== plannedTasks && actualTasks > 0;
      })
      .map(f => f.id);

    const totalChanges = featuresAdded.length + featuresRemoved.length + featuresModified.length;
    const driftPercentage = this.plan.features.length > 0
      ? (totalChanges / this.plan.features.length) * 100
      : 0;

    return {
      plannedFeatures: this.plan.features.length,
      actualFeatures: actualFeatureIds.size,
      featuresAdded,
      featuresRemoved,
      featuresModified,
      driftPercentage,
    };
  }

  /**
   * Analyze timeline drift (schedule variance)
   */
  private analyzeTimelineDrift(executionData: TaskExecutionData[]): TimelineDrift {
    const plannedStartDate = new Date(this.plan.timeline.start_date);
    const plannedEndDate = new Date(this.plan.timeline.end_date);

    // Find actual start (earliest task start)
    const startedTasks = executionData.filter(t => t.startedAt);
    const actualStartDate = startedTasks.length > 0
      ? new Date(Math.min(...startedTasks.map(t => t.startedAt!.getTime())))
      : plannedStartDate;

    // Project end date based on completion rate and remaining work
    const completedTasks = executionData.filter(t => t.status === 'completed');
    const completionRate = executionData.length > 0
      ? completedTasks.length / executionData.length
      : 0;

    const elapsedDays = Math.floor((new Date().getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const projectedTotalDays = completionRate > 0 ? Math.ceil(elapsedDays / completionRate) : elapsedDays;
    const projectedEndDate = new Date(actualStartDate.getTime() + projectedTotalDays * 24 * 60 * 60 * 1000);

    const daysBehindSchedule = Math.max(0, Math.floor((projectedEndDate.getTime() - plannedEndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAheadSchedule = Math.max(0, Math.floor((plannedEndDate.getTime() - projectedEndDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Milestones at risk
    const milestonesAtRisk = this.plan.timeline.milestones
      .filter(m => {
        const milestoneDate = new Date(m.target_date);
        return milestoneDate < projectedEndDate && milestoneDate < new Date();
      })
      .map(m => m.name);

    return {
      plannedStartDate,
      actualStartDate,
      plannedEndDate,
      projectedEndDate,
      daysBehindSchedule,
      daysAheadSchedule,
      milestonesAtRisk,
    };
  }

  /**
   * Analyze effort estimation accuracy
   */
  private analyzeEffortDrift(executionData: TaskExecutionData[]): EffortDrift {
    const totalPlannedHours = this.plan.features.reduce((sum, f) => sum + (f.effort_estimate || 0), 0);
    const totalActualHours = executionData.reduce((sum, t) => sum + (t.actualHours || 0), 0);

    const varianceHours = totalActualHours - totalPlannedHours;
    const variancePercentage = totalPlannedHours > 0
      ? (varianceHours / totalPlannedHours) * 100
      : 0;

    // Find over/underestimated features
    const overestimatedFeatures: string[] = [];
    const underestimatedFeatures: string[] = [];

    this.plan.features.forEach(feature => {
      const featureTasks = executionData.filter(t => t.featureId === feature.id);
      const actualHours = featureTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
      const plannedHours = feature.effort_estimate || 0;

      if (actualHours > plannedHours * 1.2) { // 20% over
        underestimatedFeatures.push(feature.id);
      } else if (actualHours < plannedHours * 0.8) { // 20% under
        overestimatedFeatures.push(feature.id);
      }
    });

    // Accuracy score (inverse of variance)
    const accuracyScore = Math.max(0, 100 - Math.abs(variancePercentage));

    return {
      totalPlannedHours,
      totalActualHours,
      varianceHours,
      variancePercentage,
      overestimatedFeatures,
      underestimatedFeatures,
      accuracyScore,
    };
  }

  /**
   * Analyze dependency violations
   */
  private analyzeDependencyDrift(executionData: TaskExecutionData[]): DependencyDrift {
    const newBlockers = executionData
      .filter(t => t.status === 'blocked' && t.blockedBy && t.blockedBy.length > 0)
      .map(t => t.taskId);

    const resolvedBlockers = executionData
      .filter(t => t.status === 'completed' && t.blockedBy && t.blockedBy.length > 0)
      .map(t => t.taskId);

    // Detect circular dependencies (simplified)
    const circularDependenciesDetected: string[][] = [];
    // Would implement cycle detection algorithm here

    const dependencyViolations = executionData
      .filter(t => t.status === 'in_progress' && t.blockedBy && t.blockedBy.length > 0)
      .map(t => `${t.taskId} started despite blockers: ${t.blockedBy?.join(', ') ?? ''}`);

    return {
      newBlockers,
      resolvedBlockers,
      circularDependenciesDetected,
      dependencyViolations,
    };
  }

  /**
   * Analyze priority changes
   */
  private analyzePriorityDrift(executionData: TaskExecutionData[]): PriorityDrift {
    // Simplified - would track actual priority changes from task data
    const priorityChanges: PriorityDrift['priorityChanges'] = [];

    // Critical path changes would be detected by comparing original vs current task graph
    const criticalPathChanges = false;

    return {
      priorityChanges,
      criticalPathChanges,
    };
  }

  /**
   * Calculate overall drift score (0-100)
   */
  private calculateOverallDrift(metrics: Omit<DriftMetrics, 'overallDriftScore' | 'driftSeverity'>): number {
    const weights = {
      scope: 0.25,
      timeline: 0.30,
      effort: 0.25,
      dependency: 0.10,
      priority: 0.10,
    };

    const scopeScore = metrics.scopeDrift.driftPercentage;
    const timelineScore = Math.min(100, (metrics.timelineDrift.daysBehindSchedule / 7) * 100); // 1 week = 100%
    const effortScore = Math.abs(metrics.effortDrift.variancePercentage);
    const dependencyScore = Math.min(100, metrics.dependencyDrift.newBlockers.length * 20);
    const priorityScore = Math.min(100, metrics.priorityDrift.priorityChanges.length * 10);

    return (
      scopeScore * weights.scope +
      timelineScore * weights.timeline +
      effortScore * weights.effort +
      dependencyScore * weights.dependency +
      priorityScore * weights.priority
    );
  }

  /**
   * Determine drift severity
   */
  private getDriftSeverity(score: number): DriftMetrics['driftSeverity'] {
    if (score < 10) return 'none';
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'critical';
  }

  /**
   * Generate recommendations based on drift
   */
  private generateRecommendations(metrics: DriftMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.scopeDrift.driftPercentage > 20) {
      recommendations.push(`Scope has drifted ${metrics.scopeDrift.driftPercentage.toFixed(1)}%. Consider updating plan to reflect actual feature set.`);
    }

    if (metrics.timelineDrift.daysBehindSchedule > 7) {
      recommendations.push(`Project is ${metrics.timelineDrift.daysBehindSchedule} days behind schedule. Review timeline and adjust milestones.`);
    }

    if (metrics.effortDrift.accuracyScore < 70) {
      recommendations.push(`Effort estimates are ${(100 - metrics.effortDrift.accuracyScore).toFixed(0)}% inaccurate. Consider recalibrating estimation methods.`);
    }

    if (metrics.dependencyDrift.newBlockers.length > 3) {
      recommendations.push(`${metrics.dependencyDrift.newBlockers.length} tasks are blocked. Prioritize resolving blockers to unblock workflow.`);
    }

    return recommendations;
  }

  /**
   * Generate suggested actions for plan adjustment
   */
  private generateSuggestedActions(metrics: DriftMetrics): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    // Timeline adjustment
    if (metrics.timelineDrift.daysBehindSchedule > 3) {
      actions.push({
        type: 'update_timeline',
        description: `Extend project end date by ${metrics.timelineDrift.daysBehindSchedule} days to match projected completion`,
        impact: 'high',
        autoApplicable: true,
        changes: {
          'timeline.end_date': metrics.timelineDrift.projectedEndDate.toISOString(),
        },
      });
    }

    // Scope adjustment
    if (metrics.scopeDrift.featuresAdded.length > 0) {
      actions.push({
        type: 'adjust_scope',
        description: `Add ${metrics.scopeDrift.featuresAdded.length} new features discovered during execution`,
        impact: 'medium',
        autoApplicable: false,
        changes: {
          featuresAdded: metrics.scopeDrift.featuresAdded,
        },
      });
    }

    // Effort reestimation
    if (metrics.effortDrift.underestimatedFeatures.length > 2) {
      actions.push({
        type: 'reestimate_effort',
        description: `Increase effort estimates for ${metrics.effortDrift.underestimatedFeatures.length} underestimated features`,
        impact: 'medium',
        autoApplicable: true,
        changes: {
          featuresAffected: metrics.effortDrift.underestimatedFeatures,
          adjustmentFactor: 1.3, // 30% increase
        },
      });
    }

    // Blocker resolution
    if (metrics.dependencyDrift.newBlockers.length > 0) {
      actions.push({
        type: 'resolve_blockers',
        description: `Resolve ${metrics.dependencyDrift.newBlockers.length} blocking tasks to unblock workflow`,
        impact: 'high',
        autoApplicable: false,
        changes: {
          blockedTasks: metrics.dependencyDrift.newBlockers,
        },
      });
    }

    return actions;
  }
}

/**
 * Factory function to create drift detector
 */
export function createDriftDetector(plan: PlanJSON): PlanDriftDetector {
  return new PlanDriftDetector(plan);
}

/**
 * Quick drift check - returns boolean if drift detected
 */
export async function hasPlanDrift(
  plan: PlanJSON,
  executionData: TaskExecutionData[]
): Promise<boolean> {
  const detector = new PlanDriftDetector(plan);
  const result = await detector.detectDrift(executionData);
  return result.hasDrift;
}
