<template>
  <div v-if="visible" class="contextual-assistant">
    <!-- Assistant Header -->
    <div class="assistant-header">
      <div class="header-title">
        <span class="icon">💡</span>
        <span>AI Suggestions</span>
      </div>
      <button 
        class="close-btn" 
        @click="$emit('close')"
        aria-label="Close suggestions panel"
      >
        ✕
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Generating suggestions...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button 
        class="retry-btn" 
        @click="retryGeneration"
      >
        Retry
      </button>
    </div>

    <!-- Suggestions List -->
    <div v-else-if="suggestions.length > 0" class="suggestions-list">
      <div 
        v-for="(suggestion, index) in suggestions"
        :key="suggestion.id"
        class="suggestion-item"
        @click="selectSuggestion(index)"
      >
        <!-- Suggestion Question -->
        <div class="suggestion-question">
          <span class="number">{{ index + 1 }}</span>
          <p>{{ suggestion.question }}</p>
        </div>

        <!-- Suggestion Context -->
        <div v-if="suggestion.context" class="suggestion-context">
          {{ suggestion.context }}
        </div>

        <!-- Confidence Badge -->
        <div class="suggestion-footer">
          <span class="confidence" :title="confidenceTooltip(suggestion.confidence)">
            Confidence: {{ (suggestion.confidence * 100).toFixed(0) }}%
          </span>
        </div>

        <!-- Accept/Reject Buttons -->
        <div class="suggestion-actions">
          <button 
            class="action-btn accept-btn"
            @click.stop="acceptSuggestion(suggestion)"
            title="Use this suggestion"
          >
            ✓ Use
          </button>
          <button 
            class="action-btn reject-btn"
            @click.stop="rejectSuggestion(suggestion.id)"
            title="Dismiss this suggestion"
          >
            ✗ Skip
          </button>
        </div>
      </div>

      <!-- Feedback Section -->
      <div v-if="showFeedback" class="feedback-section">
        <p class="feedback-message">{{ feedbackMessage }}</p>
        <button 
          class="feedback-ok-btn"
          @click="showFeedback = false"
        >
          OK
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>No suggestions available for this page yet.</p>
      <p class="hint">Continue answering questions to get contextual suggestions.</p>
    </div>

    <!-- Statistics -->
    <div class="assistant-footer">
      <span class="stat">
        📊 Suggestions: {{ suggestionCount }}
      </span>
      <span v-if="acceptanceRate > 0" class="stat">
        ✓ Acceptance: {{ (acceptanceRate * 100).toFixed(0) }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AiSuggestion } from './aiAssistanceService';

interface Props {
  visible?: boolean;
  suggestions?: AiSuggestion[];
  loading?: boolean;
  error?: string | null;
  acceptanceRate?: number;
  suggestionCount?: number;
}

interface Emits {
  (e: 'close'): void;
  (e: 'accept', suggestion: AiSuggestion): void;
  (e: 'reject', id: string): void;
  (e: 'retry'): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  suggestions: () => [],
  loading: false,
  error: null,
  acceptanceRate: 0,
  suggestionCount: 0,
});

const emit = defineEmits<Emits>();

const showFeedback = ref(false);
const feedbackMessage = ref('');
const rejectedIds = ref<Set<string>>(new Set());

/**
 * Filter out rejected suggestions
 */
const visibleSuggestions = computed(() => {
  return props.suggestions.filter(s => !rejectedIds.value.has(s.id));
});

/**
 * Accept a suggestion
 */
const acceptSuggestion = (suggestion: AiSuggestion) => {
  emit('accept', suggestion);
  feedbackMessage.value = `✓ "${suggestion.question}" has been added to your plan.`;
  showFeedback.value = true;
};

/**
 * Reject a suggestion
 */
const rejectSuggestion = (id: string) => {
  rejectedIds.value.add(id);
  emit('reject', id);
  
  if (visibleSuggestions.value.length === 0) {
    feedbackMessage.value = 'All suggestions dismissed.';
    showFeedback.value = true;
  }
};

/**
 * Select a suggestion (highlight for focus)
 */
const selectSuggestion = (index: number) => {
  // This could highlight the suggestion or expand it
  console.log('Selected suggestion:', index);
};

/**
 * Retry generation after error
 */
const retryGeneration = () => {
  emit('retry');
};

/**
 * Confidence level description
 */
const confidenceTooltip = (confidence: number): string => {
  if (confidence >= 0.8) return 'High confidence';
  if (confidence >= 0.6) return 'Medium confidence';
  return 'Low confidence';
};
</script>

<style scoped>
.contextual-assistant {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-editor-foreground, #d4d4d4);
  border-left: 1px solid var(--vscode-panel-border, #3e3e42);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.assistant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-sideBar-background, #252526);
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e42);
  font-weight: 600;
  font-size: 14px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--vscode-button-foreground, #ffffff);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: var(--vscode-button-hoverBackground, #3e3e42);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 16px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vscode-editor-foreground, #d4d4d4);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 12px;
  text-align: center;
}

.error-icon {
  font-size: 32px;
}

.error-state p {
  margin: 0;
  font-size: 13px;
}

.retry-btn {
  padding: 6px 16px;
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

/* Suggestions List */
.suggestions-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.suggestion-item {
  padding: 12px;
  background: var(--vscode-menu-background, #2d2d30);
  border: 1px solid var(--vscode-panel-border, #3e3e42);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-item:hover {
  background: var(--vscode-list-hoverBackground, #3e3e42);
  border-color: var(--vscode-focusBorder, #007acc);
}

.suggestion-question {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: flex-start;
}

.number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--vscode-button-background, #0e639c);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.suggestion-question p {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  flex: 1;
}

.suggestion-context {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #cccccc);
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  border-left: 2px solid var(--vscode-focusBorder, #007acc);
  line-height: 1.4;
}

.suggestion-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
}

.confidence {
  color: var(--vscode-descriptionForeground, #cccccc);
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.suggestion-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--vscode-panel-border, #3e3e42);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.accept-btn {
  background: rgba(0, 128, 0, 0.2);
  color: #4ec9b0;
  border-color: #4ec9b0;
}

.accept-btn:hover {
  background: rgba(0, 128, 0, 0.3);
}

.reject-btn {
  background: rgba(255, 0, 0, 0.1);
  color: #f48771;
  border-color: #f48771;
}

.reject-btn:hover {
  background: rgba(255, 0, 0, 0.2);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
  text-align: center;
  color: var(--vscode-descriptionForeground, #cccccc);
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

.hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
  font-style: italic;
}

/* Feedback Section */
.feedback-section {
  padding: 12px;
  background: rgba(0, 200, 0, 0.15);
  border-top: 1px solid rgba(0, 200, 0, 0.3);
}

.feedback-message {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #4ec9b0;
  line-height: 1.4;
}

.feedback-ok-btn {
  width: 100%;
  padding: 6px;
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.feedback-ok-btn:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

/* Footer */
.assistant-footer {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid var(--vscode-panel-border, #3e3e42);
  background: var(--vscode-sideBar-background, #252526);
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #cccccc);
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Scrollbar Styling */
.suggestions-list::-webkit-scrollbar {
  width: 10px;
}

.suggestions-list::-webkit-scrollbar-track {
  background: transparent;
}

.suggestions-list::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background, #797979);
  border-radius: 5px;
}

.suggestions-list::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground, #a0a0a0);
}

/* Responsive */
@media (max-width: 600px) {
  .assistant-header {
    font-size: 13px;
  }

  .suggestion-item {
    padding: 10px;
  }

  .number {
    width: 20px;
    height: 20px;
    font-size: 11px;
  }

  .suggestion-question p {
    font-size: 12px;
  }
}
</style>
