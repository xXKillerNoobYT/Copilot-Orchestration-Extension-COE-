<template>
  <div class="plan-diff-viewer">
    <div class="diff-header">
      <h2>Plan Comparison</h2>
      <div class="diff-stats">
        <span class="stat-item">
          <span class="stat-label">Drift Score:</span>
          <span :class="['stat-value', driftSeverityClass]">
            {{ driftMetrics?.overallDriftScore.toFixed(0) }}%
          </span>
        </span>
        <span class="stat-item">
          <span class="stat-label">Severity:</span>
          <span :class="['stat-value', driftSeverityClass]">
            {{ driftMetrics?.driftSeverity }}
          </span>
        </span>
      </div>
    </div>

    <div class="diff-content">
      <!-- Side-by-side comparison -->
      <div class="diff-columns">
        <div class="diff-column original">
          <h3>Original Plan</h3>
          <div class="plan-section">
            <h4>Timeline</h4>
            <div class="timeline-info">
              <p><strong>Start:</strong> {{ formatDate(originalPlan.timeline.start_date) }}</p>
              <p><strong>End:</strong> {{ formatDate(originalPlan.timeline.end_date) }}</p>
              <p><strong>Duration:</strong> {{ calculateDuration(originalPlan.timeline) }} days</p>
            </div>
          </div>

          <div class="plan-section">
            <h4>Features ({{ originalPlan.features.length }})</h4>
            <ul class="feature-list">
              <li
                v-for="feature in originalPlan.features"
                :key="feature.id"
                :class="getFeatureClass(feature.id, 'original')"
              >
                <span class="feature-name">{{ feature.name }}</span>
                <span class="feature-priority">{{ feature.priority }}</span>
                <span class="feature-effort">{{ feature.effort_estimate }}h</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="diff-column current">
          <h3>Current State</h3>
          <div class="plan-section">
            <h4>Timeline</h4>
            <div class="timeline-info">
              <p><strong>Actual Start:</strong> {{ formatDate(driftMetrics?.timelineDrift.actualStartDate) }}</p>
              <p><strong>Projected End:</strong> {{ formatDate(driftMetrics?.timelineDrift.projectedEndDate) }}</p>
              <p>
                <strong>Variance:</strong>
                <span :class="getVarianceClass(driftMetrics?.timelineDrift.daysBehindSchedule || 0)">
                  {{ formatVariance(driftMetrics?.timelineDrift.daysBehindSchedule || 0) }}
                </span>
              </p>
            </div>
          </div>

          <div class="plan-section">
            <h4>Features ({{ getCurrentFeatureCount() }})</h4>
            <ul class="feature-list">
              <li
                v-for="feature in getAllFeatures()"
                :key="feature.id"
                :class="getFeatureClass(feature.id, 'current')"
              >
                <span class="feature-name">{{ feature.name }}</span>
                <span class="feature-status">{{ getFeatureStatus(feature.id) }}</span>
                <span class="feature-effort">{{ getActualEffort(feature.id) }}h</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Drift Details -->
      <div class="drift-details">
        <h3>Drift Analysis</h3>
        
        <div class="drift-category" v-if="driftMetrics">
          <h4>Scope Drift</h4>
          <div class="drift-metrics">
            <p><strong>Features Added:</strong> {{ driftMetrics.scopeDrift.featuresAdded.length }}</p>
            <p><strong>Features Removed:</strong> {{ driftMetrics.scopeDrift.featuresRemoved.length }}</p>
            <p><strong>Features Modified:</strong> {{ driftMetrics.scopeDrift.featuresModified.length }}</p>
            <p><strong>Drift:</strong> {{ driftMetrics.scopeDrift.driftPercentage.toFixed(1) }}%</p>
          </div>
        </div>

        <div class="drift-category" v-if="driftMetrics">
          <h4>Effort Drift</h4>
          <div class="drift-metrics">
            <p><strong>Planned:</strong> {{ driftMetrics.effortDrift.totalPlannedHours }}h</p>
            <p><strong>Actual:</strong> {{ driftMetrics.effortDrift.totalActualHours }}h</p>
            <p><strong>Variance:</strong> {{ driftMetrics.effortDrift.varianceHours.toFixed(1) }}h 
              ({{ driftMetrics.effortDrift.variancePercentage.toFixed(1) }}%)
            </p>
            <p><strong>Accuracy:</strong> {{ driftMetrics.effortDrift.accuracyScore.toFixed(0) }}%</p>
          </div>
        </div>

        <div class="drift-category" v-if="driftMetrics">
          <h4>Blockers</h4>
          <div class="drift-metrics">
            <p><strong>New Blockers:</strong> {{ driftMetrics.dependencyDrift.newBlockers.length }}</p>
            <p><strong>Resolved:</strong> {{ driftMetrics.dependencyDrift.resolvedBlockers.length }}</p>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="recommendations" v-if="suggestions && suggestions.length > 0">
        <h3>Recommended Adjustments</h3>
        <div
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          class="suggestion-card"
          :class="`impact-${suggestion.impact}`"
        >
          <div class="suggestion-header">
            <h4>{{ suggestion.title }}</h4>
            <span class="confidence-badge">{{ suggestion.confidence }}% confidence</span>
          </div>
          <p class="suggestion-description">{{ suggestion.description }}</p>
          <p class="suggestion-rationale"><em>{{ suggestion.rationale }}</em></p>
          <div class="suggestion-meta">
            <span class="badge impact">{{ suggestion.impact }} impact</span>
            <span class="badge effort">{{ suggestion.effort }} effort</span>
          </div>
          <button
            v-if="suggestion.autoApplicable"
            @click="applySuggestion(suggestion)"
            class="apply-button"
          >
            Apply Adjustment
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { PlanJSON, Feature } from './planGenerator';
import type { DriftMetrics } from './planDriftDetector';
import type { AdjustmentSuggestion } from './planAdjustmentEngine';

const props = defineProps({
  originalPlan: {
    type: Object as PropType<PlanJSON>,
    required: true,
  },
  driftMetrics: {
    type: Object as PropType<DriftMetrics>,
    required: true,
  },
  suggestions: {
    type: Array as PropType<AdjustmentSuggestion[]>,
    default: () => [],
  },
});

const emit = defineEmits<{
  applySuggestion: [suggestion: AdjustmentSuggestion];
}>();

const driftSeverityClass = computed(() => {
  return `severity-${props.driftMetrics?.driftSeverity || 'none'}`;
});

function formatDate(date: string | Date | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
}

function calculateDuration(timeline: PlanJSON['timeline']): number {
  const start = new Date(timeline.start_date);
  const end = new Date(timeline.end_date);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatVariance(days: number): string {
  if (days === 0) return 'On schedule';
  return days > 0 ? `${days} days behind` : `${Math.abs(days)} days ahead`;
}

function getVarianceClass(days: number): string {
  if (days === 0) return 'on-schedule';
  if (days > 7) return 'critical-delay';
  if (days > 3) return 'moderate-delay';
  return days > 0 ? 'minor-delay' : 'ahead-schedule';
}

function getFeatureClass(featureId: string, side: 'original' | 'current'): string {
  if (side === 'original') {
    if (props.driftMetrics?.scopeDrift.featuresRemoved.includes(featureId)) {
      return 'feature-removed';
    }
    if (props.driftMetrics?.scopeDrift.featuresModified.includes(featureId)) {
      return 'feature-modified';
    }
  } else {
    if (props.driftMetrics?.scopeDrift.featuresAdded.includes(featureId)) {
      return 'feature-added';
    }
    if (props.driftMetrics?.scopeDrift.featuresModified.includes(featureId)) {
      return 'feature-modified';
    }
  }
  return '';
}

function getCurrentFeatureCount(): number {
  const original = props.originalPlan.features.length;
  const added = props.driftMetrics?.scopeDrift.featuresAdded.length || 0;
  const removed = props.driftMetrics?.scopeDrift.featuresRemoved.length || 0;
  return original + added - removed;
}

function getAllFeatures(): Feature[] {
  return props.originalPlan.features;
}

function getFeatureStatus(featureId: string): string {
  if (props.driftMetrics?.scopeDrift.featuresRemoved.includes(featureId)) {
    return 'removed';
  }
  if (props.driftMetrics?.scopeDrift.featuresAdded.includes(featureId)) {
    return 'added';
  }
  if (props.driftMetrics?.scopeDrift.featuresModified.includes(featureId)) {
    return 'modified';
  }
  return 'unchanged';
}

function getActualEffort(featureId: string): number {
  // Would retrieve from executionData
  const feature = props.originalPlan.features.find(f => f.id === featureId);
  return feature?.effort_estimate || 0;
}

function applySuggestion(suggestion: AdjustmentSuggestion) {
  emit('applySuggestion', suggestion);
}
</script>

<style scoped>
.plan-diff-viewer {
  padding: 24px;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.diff-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-label {
  font-size: 12px;
  opacity: 0.7;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
}

.severity-none { color: var(--vscode-testing-iconPassed); }
.severity-low { color: var(--vscode-editorInfo-foreground); }
.severity-medium { color: var(--vscode-editorWarning-foreground); }
.severity-high { color: var(--vscode-editorError-foreground); }
.severity-critical { color: var(--vscode-errorForeground); }

.diff-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.diff-column {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 16px;
}

.diff-column h3 {
  margin-top: 0;
  margin-bottom: 16px;
}

.plan-section {
  margin-bottom: 20px;
}

.plan-section h4 {
  margin-bottom: 8px;
  font-size: 14px;
  opacity: 0.8;
}

.timeline-info p {
  margin: 4px 0;
  font-size: 13px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;
  border-radius: 3px;
  background: var(--vscode-input-background);
}

.feature-added {
  background: var(--vscode-diffEditor-insertedTextBackground) !important;
  border-left: 3px solid var(--vscode-testing-iconPassed);
}

.feature-removed {
  background: var(--vscode-diffEditor-removedTextBackground) !important;
  border-left: 3px solid var(--vscode-testing-iconFailed);
  opacity: 0.6;
}

.feature-modified {
  background: var(--vscode-diffEditor-insertedTextBackground) !important;
  border-left: 3px solid var(--vscode-editorWarning-foreground);
}

.feature-name {
  flex: 1;
  font-size: 13px;
}

.feature-priority,
.feature-status,
.feature-effort {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  margin-left: 8px;
}

.drift-details {
  margin-bottom: 32px;
}

.drift-category {
  margin-bottom: 20px;
}

.drift-category h4 {
  margin-bottom: 8px;
}

.drift-metrics p {
  margin: 4px 0;
  font-size: 13px;
}

.recommendations {
  margin-top: 32px;
}

.suggestion-card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.suggestion-card.impact-critical {
  border-left: 4px solid var(--vscode-errorForeground);
}

.suggestion-card.impact-high {
  border-left: 4px solid var(--vscode-editorWarning-foreground);
}

.suggestion-card.impact-medium {
  border-left: 4px solid var(--vscode-editorInfo-foreground);
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.suggestion-header h4 {
  margin: 0;
}

.confidence-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.suggestion-description {
  margin: 8px 0;
  font-size: 13px;
}

.suggestion-rationale {
  font-size: 12px;
  opacity: 0.7;
  margin: 8px 0;
}

.suggestion-meta {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.apply-button {
  margin-top: 12px;
  padding: 6px 16px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 13px;
}

.apply-button:hover {
  background: var(--vscode-button-hoverBackground);
}

.on-schedule { color: var(--vscode-testing-iconPassed); }
.ahead-schedule { color: var(--vscode-testing-iconPassed); }
.minor-delay { color: var(--vscode-editorInfo-foreground); }
.moderate-delay { color: var(--vscode-editorWarning-foreground); }
.critical-delay { color: var(--vscode-errorForeground); }
</style>
