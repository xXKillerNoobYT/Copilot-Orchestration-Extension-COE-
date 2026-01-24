<template>
  <div class="contextual-assistant" v-if="isVisible">
    <div class="assistant-header">
      <div class="header-icon">💡</div>
      <h3>AI Suggestions</h3>
      <button @click="toggleVisibility" class="close-btn" aria-label="Close">×</button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Generating suggestions...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>

    <!-- Suggestions Display -->
    <div v-else-if="currentSuggestion" class="suggestion-content">
      <!-- Confidence Indicator -->
      <div class="confidence-bar">
        <div class="confidence-label">Confidence</div>
        <div class="confidence-track">
          <div 
            class="confidence-fill" 
            :style="{ width: `${currentSuggestion.confidence * 100}%` }"
            :class="confidenceClass"
          ></div>
        </div>
        <div class="confidence-value">{{ Math.round(currentSuggestion.confidence * 100) }}%</div>
      </div>

      <!-- Question Context -->
      <div class="suggestion-question">
        <strong>{{ currentSuggestion.question }}</strong>
      </div>

      <!-- Suggestion Text -->
      <div class="suggestion-text">
        {{ currentSuggestion.suggestion }}
      </div>

      <!-- Guidance (if available) -->
      <div v-if="currentSuggestion.guidance" class="suggestion-guidance">
        <div class="guidance-label">💭 Guidance</div>
        <p>{{ currentSuggestion.guidance }}</p>
      </div>

      <!-- Examples (if available) -->
      <div v-if="currentSuggestion.examples && Object.keys(currentSuggestion.examples).length > 0" class="suggestion-examples">
        <div class="examples-label">📝 Examples</div>
        <div v-for="(example, key) in currentSuggestion.examples" :key="key" class="example-item">
          <code>{{ key }}: {{ example }}</code>
        </div>
      </div>

      <!-- Related Design Choices -->
      <div v-if="currentSuggestion.relatedDesignChoices.length > 0" class="related-choices">
        <div class="related-label">🔗 Related Choices</div>
        <ul>
          <li v-for="choice in currentSuggestion.relatedDesignChoices" :key="choice">
            {{ choice }}
          </li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="suggestion-actions">
        <button @click="acceptSuggestion" class="btn-accept">✓ Accept</button>
        <button @click="rejectSuggestion" class="btn-reject">✗ Reject</button>
        <button @click="customizeAnswer" class="btn-customize">✏️ Customize</button>
      </div>
    </div>

    <!-- No Suggestions -->
    <div v-else class="no-suggestions">
      <p>No suggestions available yet.</p>
      <p class="hint">Keep answering questions to get AI-powered recommendations.</p>
    </div>

    <!-- Suggestion History Toggle -->
    <div class="history-toggle" v-if="suggestionHistory.length > 1">
      <button @click="showHistory = !showHistory" class="toggle-history-btn">
        {{ showHistory ? '▼' : '▶' }} History ({{ suggestionHistory.length }})
      </button>
      
      <div v-if="showHistory" class="history-list">
        <div 
          v-for="suggestion in suggestionHistory.slice().reverse()" 
          :key="suggestion.id"
          class="history-item"
          @click="viewHistoricalSuggestion(suggestion)"
          :class="{ 'accepted': isAccepted(suggestion.id) }"
        >
          <div class="history-question">{{ suggestion.question }}</div>
          <div class="history-confidence">{{ Math.round(suggestion.confidence * 100) }}%</div>
          <div class="history-status">
            {{ isAccepted(suggestion.id) ? '✓ Accepted' : '○ Viewed' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onUnmounted } from 'vue';
import { aiAssistanceService, type AiSuggestion } from '../services/AiAssistanceService';
import type { WizardState } from '../planBuilder/wizardState';

export default defineComponent({
  name: 'ContextualAssistant',
  props: {
    currentPageId: {
      type: String,
      required: true,
    },
    wizardState: {
      type: Object as () => WizardState,
      required: true,
    },
    visible: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['accept-suggestion', 'reject-suggestion', 'customize-answer', 'visibility-changed'],
  setup(props, { emit }) {
    const isVisible = ref(props.visible);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const currentSuggestion = ref<AiSuggestion | null>(null);
    const suggestionHistory = ref<AiSuggestion[]>([]);
    const showHistory = ref(false);

    const confidenceClass = computed(() => {
      const confidence = currentSuggestion.value?.confidence || 0;
      if (confidence >= 0.8) return 'high-confidence';
      if (confidence >= 0.5) return 'medium-confidence';
      return 'low-confidence';
    });

    const isAccepted = (suggestionId: string): boolean => {
      return aiAssistanceService['acceptedSuggestions'].includes(suggestionId);
    };

    const loadSuggestion = async () => {
      isLoading.value = true;
      error.value = null;

      try {
        const suggestion = await aiAssistanceService.getContextualSuggestion(
          props.currentPageId,
          props.wizardState
        );

        if (suggestion) {
          currentSuggestion.value = suggestion;
          suggestionHistory.value = [...aiAssistanceService['suggestionHistory']];
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load AI suggestions';
      } finally {
        isLoading.value = false;
      }
    };

    const toggleVisibility = () => {
      isVisible.value = !isVisible.value;
      emit('visibility-changed', isVisible.value);
    };

    const acceptSuggestion = () => {
      if (currentSuggestion.value) {
        aiAssistanceService.acceptSuggestion(currentSuggestion.value.id);
        emit('accept-suggestion', currentSuggestion.value);
      }
    };

    const rejectSuggestion = () => {
      if (currentSuggestion.value) {
        emit('reject-suggestion', currentSuggestion.value);
      }
    };

    const customizeAnswer = () => {
      if (currentSuggestion.value) {
        emit('customize-answer', currentSuggestion.value);
      }
    };

    const retry = () => {
      loadSuggestion();
    };

    const viewHistoricalSuggestion = (suggestion: AiSuggestion) => {
      currentSuggestion.value = suggestion;
    };

    // Watch for page changes
    watch(() => props.currentPageId, () => {
      loadSuggestion();
    });

    // Watch for wizard state changes (debounced via service)
    watch(
      () => props.wizardState,
      () => {
        loadSuggestion();
      },
      { deep: true }
    );

    // Cleanup on unmount
    onUnmounted(() => {
      aiAssistanceService.cancelPending();
    });

    // Initial load
    loadSuggestion();

    return {
      isVisible,
      isLoading,
      error,
      currentSuggestion,
      suggestionHistory,
      showHistory,
      confidenceClass,
      isAccepted,
      toggleVisibility,
      acceptSuggestion,
      rejectSuggestion,
      customizeAnswer,
      retry,
      viewHistoricalSuggestion,
    };
  },
});
</script>

<style scoped>
.contextual-assistant {
  position: fixed;
  right: 20px;
  top: 80px;
  width: 350px;
  max-height: 600px;
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.assistant-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vscode-titleBar-activeBackground);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.header-icon {
  font-size: 20px;
}

.assistant-header h3 {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-titleBar-activeForeground);
}

.close-btn {
  background: none;
  border: none;
  color: var(--vscode-titleBar-activeForeground);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  opacity: 0.7;
}

.loading-state,
.error-state,
.no-suggestions {
  padding: 24px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vscode-panel-border);
  border-top-color: var(--vscode-button-background);
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--vscode-errorForeground);
}

.error-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.retry-btn {
  margin-top: 12px;
  padding: 6px 16px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.suggestion-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.confidence-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.confidence-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
}

.confidence-track {
  flex: 1;
  height: 6px;
  background: var(--vscode-panel-border);
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.confidence-fill.high-confidence {
  background: #10B981;
}

.confidence-fill.medium-confidence {
  background: #FBBF24;
}

.confidence-fill.low-confidence {
  background: #DC2626;
}

.confidence-value {
  font-size: 11px;
  font-weight: 600;
}

.suggestion-question {
  margin-bottom: 12px;
  padding: 8px;
  background: var(--vscode-textBlockQuote-background);
  border-left: 3px solid var(--vscode-textLink-foreground);
  border-radius: 4px;
  font-size: 13px;
}

.suggestion-text {
  margin-bottom: 16px;
  line-height: 1.5;
  color: var(--vscode-foreground);
}

.suggestion-guidance,
.suggestion-examples,
.related-choices {
  margin-bottom: 16px;
}

.guidance-label,
.examples-label,
.related-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--vscode-descriptionForeground);
}

.example-item {
  margin-bottom: 6px;
}

.example-item code {
  font-size: 11px;
  background: var(--vscode-textCodeBlock-background);
  padding: 4px 8px;
  border-radius: 3px;
  display: block;
  overflow-x: auto;
}

.related-choices ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
}

.related-choices li {
  margin-bottom: 4px;
}

.suggestion-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--vscode-panel-border);
}

.suggestion-actions button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-accept {
  background: #10B981;
  color: white;
}

.btn-accept:hover {
  background: #059669;
}

.btn-reject {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-reject:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.btn-customize {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-customize:hover {
  background: var(--vscode-button-hoverBackground);
}

.no-suggestions {
  color: var(--vscode-descriptionForeground);
}

.hint {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.7;
}

.history-toggle {
  border-top: 1px solid var(--vscode-panel-border);
}

.toggle-history-btn {
  width: 100%;
  padding: 8px 16px;
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  transition: background 0.2s;
}

.toggle-history-btn:hover {
  background: var(--vscode-list-hoverBackground);
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid var(--vscode-panel-border);
}

.history-item {
  padding: 8px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--vscode-panel-border);
  transition: background 0.2s;
  font-size: 12px;
}

.history-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.history-item.accepted {
  background: rgba(16, 185, 129, 0.1);
}

.history-question {
  font-weight: 500;
  margin-bottom: 4px;
}

.history-confidence {
  display: inline-block;
  margin-right: 8px;
  color: var(--vscode-descriptionForeground);
  font-size: 11px;
}

.history-status {
  display: inline-block;
  font-size: 11px;
  opacity: 0.7;
}

/* Responsive - collapse on small screens */
@media (max-width: 768px) {
  .contextual-assistant {
    right: 10px;
    left: 10px;
    width: auto;
    max-height: 400px;
  }
}
</style>
