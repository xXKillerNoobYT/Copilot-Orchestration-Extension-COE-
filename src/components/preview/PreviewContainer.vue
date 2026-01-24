<template>
  <div class="preview-container" :class="{ 'has-errors': hasErrors }">
    <!-- Header with controls -->
    <div class="preview-header">
      <h3>Live Preview</h3>
      <div class="preview-controls">
        <span class="render-time" :class="renderTimeClass">
          {{ renderTimeMs }}ms
        </span>
        <button 
          @click="toggleAutoRefresh" 
          :class="{ active: autoRefresh }"
          class="btn-auto-refresh"
          :title="autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'"
        >
          {{ autoRefresh ? '⏸' : '▶' }}
        </button>
        <button 
          @click="manualRefresh" 
          class="btn-refresh"
          title="Refresh preview"
        >
          🔄
        </button>
      </div>
    </div>

    <!-- Feedback section -->
    <div v-if="showFeedback && feedback" class="preview-feedback">
      <div class="feedback-summary">
        <span class="score" :class="scoreClass">Score: {{ feedback.overallScore }}/100</span>
        <div class="counts">
          <span v-if="feedback.summary.errorCount > 0" class="count error">
            ❌ {{ feedback.summary.errorCount }}
          </span>
          <span v-if="feedback.summary.warningCount > 0" class="count warning">
            ⚠️ {{ feedback.summary.warningCount }}
          </span>
          <span v-if="feedback.summary.infoCount > 0" class="count info">
            ℹ️ {{ feedback.summary.infoCount }}
          </span>
        </div>
      </div>

      <!-- Feedback items -->
      <div v-if="feedback.items.length > 0" class="feedback-items">
        <div 
          v-for="item in feedback.items" 
          :key="item.id"
          class="feedback-item"
          :class="item.type"
        >
          <div class="feedback-icon">{{ getFeedbackIcon(item.type) }}</div>
          <div class="feedback-content">
            <p class="feedback-message">{{ item.message }}</p>
            <p v-if="item.suggestion" class="feedback-suggestion">
              💡 {{ item.suggestion }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isRendering" class="preview-loading">
      <div class="spinner"></div>
      <p>Rendering preview...</p>
    </div>

    <!-- Preview content -->
    <div v-else-if="previewHTML" class="preview-content" v-html="previewHTML"></div>

    <!-- Empty state -->
    <div v-else class="preview-empty">
      <p>Start filling out the wizard to see a live preview</p>
    </div>

    <!-- Warnings -->
    <div v-if="warnings.length > 0" class="preview-warnings">
      <div v-for="(warning, index) in warnings" :key="index" class="warning-item">
        ⚠️ {{ warning }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { PreviewEngine, type WizardState, type PreviewRenderResult } from './PreviewEngine';
import { WizardStateObserver, type StateChangeCallback } from './WizardStateObserver';
import { PreviewFeedback, type FeedbackResult } from './PreviewFeedback';

// Props
interface Props {
  wizardState: WizardState;
  autoRefresh?: boolean;
  showFeedback?: boolean;
  maxRenderTimeMs?: number;
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  showFeedback: true,
  maxRenderTimeMs: 500
});

// Emits
const emit = defineEmits<{
  renderComplete: [result: PreviewRenderResult];
  renderError: [error: Error];
}>();

// State
const previewHTML = ref<string>('');
const renderTimeMs = ref<number>(0);
const warnings = ref<string[]>([]);
const feedback = ref<FeedbackResult | null>(null);
const isRendering = ref<boolean>(false);
const autoRefresh = ref<boolean>(props.autoRefresh);

// Instances
let previewEngine: PreviewEngine | null = null;
let stateObserver: WizardStateObserver | null = null;
let feedbackAnalyzer: PreviewFeedback | null = null;

// Computed
const hasErrors = computed(() => {
  return feedback.value && feedback.value.summary.errorCount > 0;
});

const renderTimeClass = computed(() => {
  if (renderTimeMs.value > props.maxRenderTimeMs) {
    return 'critical';
  } else if (renderTimeMs.value > props.maxRenderTimeMs * 0.7) {
    return 'warning';
  }
  return 'good';
});

const scoreClass = computed(() => {
  if (!feedback.value) return '';
  
  const score = feedback.value.overallScore;
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
});

// Methods
function renderPreview(state: WizardState): void {
  if (!previewEngine || !feedbackAnalyzer) return;

  isRendering.value = true;

  try {
    // Render the preview
    const result = previewEngine.render(state, {
      includeIncomplete: true,
      highlightErrors: true,
      showMetadata: true,
      maxRenderTimeMs: props.maxRenderTimeMs
    });

    // Update state
    previewHTML.value = result.html;
    renderTimeMs.value = Math.round(result.renderTimeMs);
    warnings.value = result.warnings;

    // Analyze feedback
    if (props.showFeedback) {
      feedback.value = feedbackAnalyzer.analyze(state, {
        includeInfo: true,
        includeSuccess: false
      });
    }

    // Emit completion event
    emit('renderComplete', result);

  } catch (error) {
    console.error('[PreviewContainer] Render error:', error);
    emit('renderError', error as Error);
    warnings.value = [`Render failed: ${error instanceof Error ? error.message : String(error)}`];
  } finally {
    isRendering.value = false;
  }
}

function manualRefresh(): void {
  renderPreview(props.wizardState);
}

function toggleAutoRefresh(): void {
  autoRefresh.value = !autoRefresh.value;
  
  if (autoRefresh.value) {
    setupStateObserver();
  } else {
    teardownStateObserver();
  }
}

function getFeedbackIcon(type: string): string {
  switch (type) {
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    case 'success': return '✅';
    default: return '•';
  }
}

// State observer setup
function setupStateObserver(): void {
  if (!stateObserver || stateObserver.isActive()) {
    stateObserver = new WizardStateObserver({
      debounceMs: 200,
      deep: true,
      immediate: false,
      onError: (error) => {
        console.error('[PreviewContainer] Observer error:', error);
      }
    });
  }

  const callback: StateChangeCallback = (state, changedField) => {
    if (autoRefresh.value) {
      console.log(`[PreviewContainer] State changed (field: ${changedField || 'unknown'})`);
      renderPreview(state);
    }
  };

  stateObserver.observe(
    () => props.wizardState,
    callback
  );
}

function teardownStateObserver(): void {
  if (stateObserver) {
    stateObserver.destroy();
    stateObserver = null;
  }
}

// Lifecycle
onMounted(() => {
  // Initialize preview engine
  previewEngine = new PreviewEngine({
    maxRenderTimeMs: props.maxRenderTimeMs
  });

  // Initialize feedback analyzer
  feedbackAnalyzer = new PreviewFeedback();

  // Initial render
  renderPreview(props.wizardState);

  // Setup state observer if auto-refresh enabled
  if (autoRefresh.value) {
    setupStateObserver();
  }
});

onUnmounted(() => {
  teardownStateObserver();
  previewEngine = null;
  feedbackAnalyzer = null;
});

// Watch for external state changes
watch(() => props.wizardState, (newState) => {
  if (!autoRefresh.value) {
    // Manual mode - only render on explicit changes to prop
    renderPreview(newState);
  }
}, { deep: true });
</script>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  overflow: hidden;
}

.preview-container.has-errors {
  border-left: 3px solid var(--vscode-editorError-foreground);
}

/* Header */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-editorGroupHeader-tabsBackground);
}

.preview-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.render-time {
  font-size: 11px;
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.render-time.good {
  background: var(--vscode-testing-iconPassed);
  color: white;
}

.render-time.warning {
  background: var(--vscode-editorWarning-foreground);
  color: black;
}

.render-time.critical {
  background: var(--vscode-editorError-foreground);
  color: white;
}

.btn-auto-refresh,
.btn-refresh {
  padding: 4px 8px;
  border: 1px solid var(--vscode-button-border);
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
}

.btn-auto-refresh.active {
  background: var(--vscode-button-hoverBackground);
}

.btn-auto-refresh:hover,
.btn-refresh:hover {
  background: var(--vscode-button-hoverBackground);
}

/* Feedback */
.preview-feedback {
  padding: 12px 16px;
  background: var(--vscode-editorWidget-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.feedback-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.score {
  font-weight: 600;
  font-size: 13px;
}

.score.good {
  color: var(--vscode-testing-iconPassed);
}

.score.warning {
  color: var(--vscode-editorWarning-foreground);
}

.score.critical {
  color: var(--vscode-editorError-foreground);
}

.counts {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.count {
  font-weight: 500;
}

.count.error {
  color: var(--vscode-editorError-foreground);
}

.count.warning {
  color: var(--vscode-editorWarning-foreground);
}

.count.info {
  color: var(--vscode-editorInfo-foreground);
}

/* Feedback items */
.feedback-items {
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.feedback-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  margin-bottom: 6px;
  border-radius: 4px;
  font-size: 12px;
}

.feedback-item.error {
  background: rgba(244, 67, 54, 0.1);
  border-left: 3px solid var(--vscode-editorError-foreground);
}

.feedback-item.warning {
  background: rgba(255, 152, 0, 0.1);
  border-left: 3px solid var(--vscode-editorWarning-foreground);
}

.feedback-item.info {
  background: rgba(33, 150, 243, 0.1);
  border-left: 3px solid var(--vscode-editorInfo-foreground);
}

.feedback-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.feedback-content {
  flex: 1;
}

.feedback-message {
  margin: 0;
  font-weight: 500;
}

.feedback-suggestion {
  margin: 4px 0 0 0;
  font-size: 11px;
  opacity: 0.8;
}

/* Loading */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--vscode-descriptionForeground);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--vscode-progressBar-background);
  border-top-color: var(--vscode-button-background);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.preview-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* Empty state */
.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
  text-align: center;
}

/* Warnings */
.preview-warnings {
  padding: 12px 16px;
  background: rgba(255, 152, 0, 0.1);
  border-top: 1px solid var(--vscode-editorWarning-foreground);
}

.warning-item {
  font-size: 12px;
  padding: 4px 0;
  color: var(--vscode-editorWarning-foreground);
}

/* Preview content styling */
.preview-content :deep(.wizard-preview) {
  max-width: 800px;
  margin: 0 auto;
}

.preview-content :deep(.preview-section) {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 6px;
  background: var(--vscode-editorWidget-background);
}

.preview-content :deep(.preview-section.incomplete) {
  opacity: 0.6;
  border: 1px dashed var(--vscode-panel-border);
}

.preview-content :deep(h1) {
  font-size: 24px;
  margin: 0 0 8px 0;
}

.preview-content :deep(h2) {
  font-size: 18px;
  margin: 0 0 12px 0;
  color: var(--vscode-textLink-foreground);
}

.preview-content :deep(.project-type) {
  display: inline-block;
  padding: 4px 8px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 3px;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
}

.preview-content :deep(.tech-list),
.preview-content :deep(.feature-list) {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}

.preview-content :deep(.tech-item),
.preview-content :deep(.feature-item) {
  padding: 6px 12px;
  margin-bottom: 4px;
  background: var(--vscode-list-hoverBackground);
  border-radius: 4px;
  font-size: 13px;
}

.preview-content :deep(.feature-item.priority-critical) {
  border-left: 3px solid var(--vscode-editorError-foreground);
}

.preview-content :deep(.feature-item.priority-high) {
  border-left: 3px solid var(--vscode-editorWarning-foreground);
}

.preview-content :deep(.incomplete) {
  font-style: italic;
  color: var(--vscode-descriptionForeground);
}
</style>
