<template>
  <div class="question-renderer">
    <!-- Conditional question display -->
    <transition name="fade">
      <div v-if="visibleQuestions.length > 0" class="questions-container">
        <div
          v-for="(question, index) in visibleQuestions"
          :key="question.id"
          class="question-wrapper"
          :class="{ 'is-last': index === visibleQuestions.length - 1 }"
        >
          <!-- Question content -->
          <div class="question-content">
            <QuestionCard
              :question="question"
              :value="answers[question.id]"
              :error="validationErrors.get(question.id)"
              @update="handleQuestionUpdate"
            />
          </div>

          <!-- Question context/help panel -->
          <div v-if="showContextPanel" class="context-panel">
            <div class="context-header">
              <h4>Context</h4>
            </div>
            <div class="context-body">
              <p v-if="question.description" class="context-text">
                {{ question.description }}
              </p>
              <p v-if="question.helpText" class="context-help">
                {{ question.helpText }}
              </p>
              <div v-if="question.options" class="context-options">
                <p class="options-header">Available options:</p>
                <ul>
                  <li v-for="opt in question.options" :key="opt.value" class="option-item">
                    <strong>{{ opt.label }}</strong>
                    <span v-if="opt.description" class="option-desc">{{ opt.description }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation hints -->
        <div v-if="visibleQuestions.length > 1" class="navigation-hints">
          <div class="hint-item">
            <span class="hint-label">{{ currentQuestionIndex + 1 }} of {{ visibleQuestions.length }}</span>
          </div>
          <div v-if="currentQuestionIndex < visibleQuestions.length - 1" class="hint-item">
            <span class="hint-text">{{ getProgressText() }}</span>
          </div>
        </div>
      </div>

      <!-- No questions fallback -->
      <div v-else class="no-questions">
        <p>No questions to display for this section.</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import QuestionCard from './QuestionCard.vue';
import type { Question } from '../../src/planBuilder/questionFramework';

interface Props {
  questions: Question[];
  answers: Record<string, unknown>;
  validationErrors?: Map<string, string[]>;
  showContextPanel?: boolean;
  showProgressIndicator?: boolean;
}

interface Emits {
  (e: 'update', questionId: string, value: unknown): void;
  (e: 'validate', questionId: string): void;
  (e: 'complete'): void;
}

const props = withDefaults(defineProps<Props>(), {
  showContextPanel: false,
  showProgressIndicator: true,
  validationErrors: () => new Map(),
});

const emit = defineEmits<Emits>();

const currentQuestionIndex = ref(0);

// Filter visible questions based on conditions
const visibleQuestions = computed(() => {
  return props.questions.filter(q => {
    if (!q.showIf) return true;
    return q.showIf(props.answers);
  });
});

// Watch for changes in visible questions
watch(
  () => visibleQuestions.value.length,
  (newLength) => {
    if (currentQuestionIndex.value >= newLength) {
      currentQuestionIndex.value = newLength - 1;
    }
  }
);

/**
 * Handle question update
 */
function handleQuestionUpdate(questionId: string, value: unknown) {
  emit('update', questionId, value);

  // Auto-validate on change
  emit('validate', questionId);
}

/**
 * Get progress text for current question
 */
function getProgressText(): string {
  const answered = visibleQuestions.value.slice(0, currentQuestionIndex.value + 1).filter(
    q => props.answers[q.id] !== undefined && props.answers[q.id] !== null && props.answers[q.id] !== ''
  ).length;

  const total = currentQuestionIndex.value + 1;
  return `${answered}/${total} answered`;
}

/**
 * Move to next visible question
 */
function moveToNextQuestion() {
  if (currentQuestionIndex.value < visibleQuestions.value.length - 1) {
    currentQuestionIndex.value++;
  } else {
    emit('complete');
  }
}

/**
 * Move to previous visible question
 */
function moveToPreviousQuestion() {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  }
}

// Expose methods for parent component
defineExpose({
  moveToNextQuestion,
  moveToPreviousQuestion,
  currentQuestionIndex,
  visibleQuestions,
});
</script>

<style scoped>
.question-renderer {
  width: 100%;
  max-width: 100%;
}

.questions-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-wrapper {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 1200px) {
  .question-wrapper {
    grid-template-columns: 1fr 280px;
  }

  .question-wrapper.is-last {
    grid-template-columns: 1fr;
  }
}

.question-content {
  min-width: 0;
}

.context-panel {
  display: none;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background-color: var(--vscode-editor-background);
  overflow: hidden;
  flex-direction: column;
}

@media (min-width: 1200px) {
  .context-panel {
    display: flex;
  }
}

.context-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--vscode-panel-border);
  background-color: var(--vscode-editor-lineHighlightBackground);
}

.context-header h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.context-body {
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  overflow-y: auto;
  max-height: 300px;
}

.context-text,
.context-help {
  margin: 0 0 0.75rem 0;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.context-options {
  margin-top: 0.75rem;
}

.options-header {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: var(--vscode-foreground);
  font-size: 0.8rem;
}

.option-item {
  margin: 0 0 0.5rem 0;
  padding: 0.5rem;
  background-color: var(--vscode-editor-lineHighlightBackground);
  border-radius: 4px;
  list-style: none;
}

.option-item strong {
  color: var(--vscode-foreground);
}

.option-desc {
  display: block;
  font-size: 0.75rem;
  color: var(--vscode-descriptionForeground);
  margin-top: 0.25rem;
}

.navigation-hints {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--vscode-editor-lineHighlightBackground);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--vscode-descriptionForeground);
  margin-top: 1rem;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hint-label {
  font-weight: 500;
  color: var(--vscode-foreground);
}

.no-questions {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--vscode-descriptionForeground);
  background-color: var(--vscode-editor-lineHighlightBackground);
  border-radius: 6px;
  border: 1px dashed var(--vscode-panel-border);
}

.no-questions p {
  margin: 0;
}

/* Transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
