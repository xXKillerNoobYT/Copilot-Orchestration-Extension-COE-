/**
 * Plan Adjustment Engine
 * 
 * AI-powered service that analyzes drift metrics and generates intelligent
 * plan adjustment suggestions using context and historical patterns
 */

import type { PlanJSON } from './planGenerator';
import type { DriftMetrics, SuggestedAction, DriftAnalysisResult } from './planDriftDetector';

export interface AdjustmentSuggestion {
  id: string;
  category: 'timeline' | 'scope' | 'resources' | 'priorities' | 'risks';
  title: string;
  description: string;
  rationale: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  changes: PlanChanges;
  alternatives?: AdjustmentSuggestion[];
}

export interface PlanChanges {
  metadata?: Partial<PlanJSON['metadata']>;
  timeline?: Partial<PlanJSON['timeline']>;
  features?: Array<{
    action: 'add' | 'remove' | 'update';
    featureId?: string;
    changes: any;
  }>;
  team?: Partial<PlanJSON['team']>;
  risks?: Array<{ action: 'add' | 'update'; risk: any }>;
}

export interface AdjustmentContext {
  projectPhase: 'planning' | 'execution' | 'maintenance';
  teamVelocity: number; // tasks per week
  historicalAccuracy: number; // estimation accuracy 0-100
  stakeholderPriorities: string[];
  constraints: string[];
}

/**
 * Plan Adjustment Engine
 * Generates intelligent plan adjustment recommendations
 */
export class PlanAdjustmentEngine {
  constructor(
    private plan: PlanJSON,
    private context: AdjustmentContext
  ) {}

  /**
   * Generate comprehensive adjustment suggestions from drift analysis
   */
  async generateAdjustments(driftAnalysis: DriftAnalysisResult): Promise<AdjustmentSuggestion[]> {
    const suggestions: AdjustmentSuggestion[] = [];

    // Timeline adjustments
    if (driftAnalysis.metrics.timelineDrift.daysBehindSchedule > 0) {
      suggestions.push(...this.suggestTimelineAdjustments(driftAnalysis.metrics));
    }

    // Scope adjustments
    if (driftAnalysis.metrics.scopeDrift.driftPercentage > 15) {
      suggestions.push(...this.suggestScopeAdjustments(driftAnalysis.metrics));
    }

    // Resource/team adjustments
    if (driftAnalysis.metrics.effortDrift.variancePercentage > 25) {
      suggestions.push(...this.suggestResourceAdjustments(driftAnalysis.metrics));
    }

    // Priority adjustments
    if (driftAnalysis.metrics.dependencyDrift.newBlockers.length > 3) {
      suggestions.push(...this.suggestPriorityAdjustments(driftAnalysis.metrics));
    }

    // Risk management adjustments
    if (driftAnalysis.metrics.driftSeverity === 'high' || driftAnalysis.metrics.driftSeverity === 'critical') {
      suggestions.push(...this.suggestRiskMitigations(driftAnalysis.metrics));
    }

    // Sort by confidence and impact
    return suggestions.sort((a, b) => {
      if (a.impact !== b.impact) {
        const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      }
      return b.confidence - a.confidence;
    });
  }

  /**
   * Suggest timeline adjustments
   */
  private suggestTimelineAdjustments(metrics: DriftMetrics): AdjustmentSuggestion[] {
    const suggestions: AdjustmentSuggestion[] = [];
    const drift = metrics.timelineDrift;

    if (drift.daysBehindSchedule > 7) {
      // Major timeline extension
      suggestions.push({
        id: 'timeline-extend-major',
        category: 'timeline',
        title: 'Extend Project Timeline',
        description: `Extend end date by ${drift.daysBehindSchedule} days to match projected completion`,
        rationale: `Based on current velocity and ${drift.daysBehindSchedule} days behind schedule, extending timeline prevents unrealistic deadlines`,
        confidence: 85,
        impact: 'high',
        effort: 'low',
        changes: {
          timeline: {
            end_date: drift.projectedEndDate.toISOString().split('T')[0],
          },
          metadata: {
            updated_at: new Date().toISOString(),
            status: 'in-progress' as const,
          },
        },
      });

      // Alternative: Reduce scope
      suggestions.push({
        id: 'timeline-reduce-scope',
        category: 'scope',
        title: 'Reduce Scope to Meet Deadline',
        description: 'Defer low-priority features to maintain original end date',
        rationale: 'If timeline is fixed, reducing scope is the only way to meet deadline without overworking team',
        confidence: 70,
        impact: 'high',
        effort: 'medium',
        changes: {
          features: this.plan.features
            .filter(f => f.priority === 'low')
            .slice(0, Math.ceil(this.plan.features.length * 0.2))
            .map(f => ({
              action: 'update' as const,
              featureId: f.id,
              changes: { status: 'deferred', priority: 'low' },
            })),
        },
      });
    } else if (drift.daysBehindSchedule > 3) {
      // Minor timeline adjustment
      suggestions.push({
        id: 'timeline-adjust-minor',
        category: 'timeline',
        title: 'Adjust Milestone Dates',
        description: `Shift milestones by ${drift.daysBehindSchedule} days to reflect current progress`,
        rationale: 'Small timeline adjustments keep plan realistic without major scope changes',
        confidence: 90,
        impact: 'medium',
        effort: 'low',
        changes: {
          timeline: {
            milestones: this.plan.timeline.milestones.map(m => ({
              ...m,
              target_date: new Date(new Date(m.target_date).getTime() + drift.daysBehindSchedule * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
            })),
          },
        },
      });
    }

    return suggestions;
  }

  /**
   * Suggest scope adjustments
   */
  private suggestScopeAdjustments(metrics: DriftMetrics): AdjustmentSuggestion[] {
    const suggestions: AdjustmentSuggestion[] = [];
    const scope = metrics.scopeDrift;

    if (scope.featuresAdded.length > 0) {
      suggestions.push({
        id: 'scope-add-features',
        category: 'scope',
        title: 'Add Discovered Features to Plan',
        description: `Incorporate ${scope.featuresAdded.length} features added during execution`,
        rationale: 'Features built during execution should be documented in plan for tracking and future reference',
        confidence: 95,
        impact: 'medium',
        effort: 'low',
        changes: {
          features: scope.featuresAdded.map((featureId, idx) => ({
            action: 'add' as const,
            changes: {
              id: featureId,
              name: `Feature ${featureId}`,
              description: 'Added during execution - needs documentation',
              priority: 'medium' as const,
              status: 'in-progress' as const,
              effort_estimate: 8,
              dependencies: [],
              acceptance_criteria: [],
            },
          })),
        },
      });
    }

    if (scope.featuresRemoved.length > 0) {
      suggestions.push({
        id: 'scope-remove-features',
        category: 'scope',
        title: 'Remove Cancelled Features',
        description: `Remove ${scope.featuresRemoved.length} features that were cancelled`,
        rationale: 'Cancelled features should be removed from plan to reflect actual project scope',
        confidence: 90,
        impact: 'medium',
        effort: 'low',
        changes: {
          features: scope.featuresRemoved.map(featureId => ({
            action: 'remove' as const,
            featureId,
            changes: {},
          })),
        },
      });
    }

    return suggestions;
  }

  /**
   * Suggest resource/team adjustments
   */
  private suggestResourceAdjustments(metrics: DriftMetrics): AdjustmentSuggestion[] {
    const suggestions: AdjustmentSuggestion[] = [];
    const effort = metrics.effortDrift;

    if (effort.variancePercentage > 50) {
      suggestions.push({
        id: 'resources-add-team',
        category: 'resources',
        title: 'Increase Team Size',
        description: `Add ${Math.ceil(effort.variancePercentage / 50)} team members to handle ${effort.variancePercentage.toFixed(0)}% effort overrun`,
        rationale: 'Significant effort variance suggests current team size is insufficient for scope',
        confidence: 65,
        impact: 'high',
        effort: 'high',
        changes: {
          team: {
            members: [
              ...this.plan.team.members,
              {
                id: `team-${Date.now()}`,
                role_name: 'Developer',
                responsibilities: ['Support overloaded features'],
                skills: ['Development'],
                agent_mapping: null,
                availability: 'full-time' as const,
              },
            ],
          },
        },
      });
    }

    if (effort.underestimatedFeatures.length > 3) {
      suggestions.push({
        id: 'resources-reestimate',
        category: 'scope',
        title: 'Update Feature Estimates',
        description: `Increase estimates for ${effort.underestimatedFeatures.length} underestimated features by ${Math.abs(effort.variancePercentage).toFixed(0)}%`,
        rationale: 'Historical accuracy data shows systematic underestimation pattern',
        confidence: 85,
        impact: 'medium',
        effort: 'low',
        changes: {
          features: effort.underestimatedFeatures.map(featureId => ({
            action: 'update' as const,
            featureId,
            changes: {
              effort_estimate: this.plan.features.find(f => f.id === featureId)?.effort_estimate || 0 * 1.3,
            },
          })),
        },
      });
    }

    return suggestions;
  }

  /**
   * Suggest priority adjustments
   */
  private suggestPriorityAdjustments(metrics: DriftMetrics): AdjustmentSuggestion[] {
    const suggestions: AdjustmentSuggestion[] = [];
    const deps = metrics.dependencyDrift;

    if (deps.newBlockers.length > 0) {
      suggestions.push({
        id: 'priority-resolve-blockers',
        category: 'priorities',
        title: 'Prioritize Blocker Resolution',
        description: `Elevate ${deps.newBlockers.length} blocking tasks to critical priority`,
        rationale: 'Blocked tasks prevent progress on dependent features - must be resolved first',
        confidence: 95,
        impact: 'high',
        effort: 'low',
        changes: {
          features: deps.newBlockers.map(taskId => ({
            action: 'update' as const,
            featureId: taskId,
            changes: { priority: 'critical' },
          })),
        },
      });
    }

    return suggestions;
  }

  /**
   * Suggest risk mitigations
   */
  private suggestRiskMitigations(metrics: DriftMetrics): AdjustmentSuggestion[] {
    const suggestions: AdjustmentSuggestion[] = [];

    if (metrics.driftSeverity === 'critical') {
      suggestions.push({
        id: 'risk-critical-drift',
        category: 'risks',
        title: 'Add Critical Drift Risk',
        description: 'Document critical plan drift as project risk',
        rationale: `Overall drift score of ${metrics.overallDriftScore.toFixed(0)}% indicates significant project risk`,
        confidence: 100,
        impact: 'critical',
        effort: 'low',
        changes: {
          risks: [
            {
              action: 'add' as const,
              risk: {
                id: `RISK-DRIFT-${Date.now()}`,
                description: `Critical plan drift detected (${metrics.overallDriftScore.toFixed(0)}%)`,
                probability: 'high' as const,
                impact: 'high' as const,
                mitigation: 'Implement recommended plan adjustments and increase monitoring frequency',
              },
            },
          ],
        },
      });
    }

    return suggestions;
  }

  /**
   * Apply a suggested adjustment to the plan
   */
  applyAdjustment(plan: PlanJSON, suggestion: AdjustmentSuggestion): PlanJSON {
    const updatedPlan = JSON.parse(JSON.stringify(plan)) as PlanJSON;

    // Apply metadata changes
    if (suggestion.changes.metadata) {
      updatedPlan.metadata = { ...updatedPlan.metadata, ...suggestion.changes.metadata };
      updatedPlan.metadata.version = this.incrementVersion(updatedPlan.metadata.version);
    }

    // Apply timeline changes
    if (suggestion.changes.timeline) {
      updatedPlan.timeline = { ...updatedPlan.timeline, ...suggestion.changes.timeline };
    }

    // Apply feature changes
    if (suggestion.changes.features) {
      suggestion.changes.features.forEach(change => {
        if (change.action === 'add') {
          updatedPlan.features.push(change.changes);
        } else if (change.action === 'remove') {
          updatedPlan.features = updatedPlan.features.filter(f => f.id !== change.featureId);
        } else if (change.action === 'update' && change.featureId) {
          const feature = updatedPlan.features.find(f => f.id === change.featureId);
          if (feature) {
            Object.assign(feature, change.changes);
          }
        }
      });
    }

    // Apply team changes
    if (suggestion.changes.team) {
      updatedPlan.team = { ...updatedPlan.team, ...suggestion.changes.team };
    }

    // Apply risk changes
    if (suggestion.changes.risks) {
      suggestion.changes.risks.forEach(change => {
        if (change.action === 'add') {
          updatedPlan.risks.push(change.risk);
        }
      });
    }

    return updatedPlan;
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0', 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
}

/**
 * Factory function
 */
export function createAdjustmentEngine(plan: PlanJSON, context: AdjustmentContext): PlanAdjustmentEngine {
  return new PlanAdjustmentEngine(plan, context);
}
