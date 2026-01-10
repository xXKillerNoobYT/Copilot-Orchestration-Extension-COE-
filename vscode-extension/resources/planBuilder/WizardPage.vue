<template>
  <div class="wizard-page">
    <div class="page-header">
      <h2 class="page-title">{{ page.title }}</h2>
      <p v-if="page.description" class="page-description">{{ page.description }}</p>
    </div>

    <div class="questions-container">
      <QuestionCard
        v-for="question in visibleQuestions"
        :key="question.id"
        :question="question"
        :value="answers[question.id]"
        :error="errors[question.id]"
        @update="handleAnswerUpdate"
      />
    </div>

    <div class="navigation-buttons">
      <button
        v-if="!isFirstPage"
        @click="$emit('previous')"
        class="btn btn-secondary"
        aria-label="Go to previous page"
      >
        ← Previous
      </button>
      
      <button
        v-if="!isLastPage"
        @click="handleNext"
        class="btn btn-primary"
        :disabled="!isPageValid"
        aria-label="Go to next page"
      >
        Next →
      </button>

      <button
        v-if="isLastPage"
        @click="$emit('submit')"
        class="btn btn-success"
        :disabled="!isPageValid"
        aria-label="Complete wizard and generate plan"
      >
        ✓ Complete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import QuestionCard from './QuestionCard.vue';
import type { WizardPage, Question } from '../../src/planBuilder/questionFramework';

interface Props {
  page: WizardPage;
  answers: Record<string, unknown>;
  isFirstPage: boolean;
  isLastPage: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  update: [questionId: string, value: unknown];
  next: [];
  previous: [];
  submit: [];
}>();

const errors = ref<Record<string, string[]>>({});

// Filter questions based on conditional visibility
const visibleQuestions = computed(() => {
  return props.page.questions.filter(q => {
    if (!q.showIf) return true;
    return q.showIf(props.answers);
  });
});

// Validate all questions on current page
const isPageValid = computed(() => {
  return visibleQuestions.value.every(q => {
    const value = props.answers[q.id];
    
    // Optional questions without values are valid
    if (value === undefined || value === null || value === '') {
      return !q.required;
    }

    // Check validation rules
    if (!q.validationRules || q.validationRules.length === 0) {
      return true;
    }

    return q.validationRules.every(rule => {
      const result = rule.validate(value);
      return result.valid;
    });
  });
});

function handleAnswerUpdate(questionId: string, value: unknown) {
  emit('update', questionId, value);
  
  // Validate the answer
  const question = visibleQuestions.value.find(q => q.id === questionId);
  if (question && question.validationRules) {
    const validationErrors: string[] = [];
    
    for (const rule of question.validationRules) {
      const result = rule.validate(value);
      if (!result.valid) {
        validationErrors.push(...result.errors);
      }
    }
    
    errors.value[questionId] = validationErrors;
  }
}

function handleNext() {
  if (isPageValid.value) {
    emit('next');
  }
}

// Clear errors when page changes
watch(() => props.page.id, () => {
  errors.value = {};
});
</script>

<style scoped>
.wizard-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0 0 0.5rem 0;
}

.page-description {
  color: var(--vscode-descriptionForeground);
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.5;
}

.questions-container {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 2rem;
}

.navigation-buttons {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--vscode-panel-border);
}

.btn {
  padding: 0.625rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--vscode-font-family);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--vscode-button-hoverBackground);
}

.btn-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.btn-success {
  background-color: #2ea043;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #2c974b;
}
</style>
