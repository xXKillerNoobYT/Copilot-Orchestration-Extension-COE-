<template>
  <div v-if="followUpQuestions.length > 0" class="follow-up-section">
    <div class="follow-up-header">
      <h3>{{ headerText }}</h3>
      <button
        class="toggle-btn"
        :class="{ expanded: isExpanded }"
        @click="toggleExpanded"
      >
        {{ isExpanded ? '▼' : '▶' }}
      </button>
    </div>

    <transition name="slide">
      <div v-if="isExpanded" class="follow-up-content">
        <p class="follow-up-hint">{{ hintText }}</p>

        <div
          v-for="(question, index) in followUpQuestions"
          :key="`follow-up-${index}`"
          class="follow-up-question"
        >
          <label class="question-label">
            {{ question.text }}
            <span v-if="question.required" class="required-mark">*</span>
          </label>

          <!-- Text input -->
          <input
            v-if="question.type === 'text'"
            v-model="answers[question.id]"
            type="text"
            :placeholder="question.placeholder"
            class="form-control"
            @input="emitAnswers"
          />

          <!-- Textarea -->
          <textarea
            v-else-if="question.type === 'textarea'"
            v-model="answers[question.id]"
            :placeholder="question.placeholder"
            :rows="question.rows || 3"
            class="form-control"
            @input="emitAnswers"
          ></textarea>

          <!-- Select dropdown -->
          <select
            v-else-if="question.type === 'select'"
            v-model="answers[question.id]"
            class="form-control"
            @change="emitAnswers"
          >
            <option value="">{{ question.placeholder || 'Select an option...' }}</option>
            <option
              v-for="option in question.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <!-- Checkbox -->
          <label
            v-else-if="question.type === 'checkbox'"
            class="checkbox-label"
          >
            <input
              v-model="answers[question.id]"
              type="checkbox"
              @change="emitAnswers"
            />
            <span>{{ question.checkboxLabel }}</span>
          </label>

          <!-- Radio group -->
          <div v-else-if="question.type === 'radio'" class="radio-group">
            <label
              v-for="option in question.options"
              :key="option.value"
              class="radio-option"
            >
              <input
                v-model="answers[question.id]"
                type="radio"
                :value="option.value"
                @change="emitAnswers"
              />
              <span>{{ option.label }}</span>
            </label>
          </div>

          <small v-if="question.hint" class="question-hint-text">
            {{ question.hint }}
          </small>
        </div>

        <div v-if="showAiLoader" class="ai-loader">
          <span class="loader-icon">🤖</span>
          <span>Analyzing your answers to suggest more questions...</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';

export interface FollowUpQuestion {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  hint?: string;
  required?: boolean;
  rows?: number;
  checkboxLabel?: string;
  options?: Array<{ value: string; label: string }>;
}

interface Props {
  questions: FollowUpQuestion[];
  headerText?: string;
  hintText?: string;
  initialExpanded?: boolean;
  showAiLoader?: boolean;
  existingAnswers?: Record<string, unknown>;
}

const props = withDefaults(defineProps<Props>(), {
  headerText: 'Additional Questions',
  hintText: 'Help us understand your project better by answering these follow-up questions.',
  initialExpanded: true,
  showAiLoader: false,
  existingAnswers: () => ({}),
});

const emit = defineEmits<{
  (e: 'answersChanged', answers: Record<string, unknown>): void;
}>();

// State
const isExpanded = ref(props.initialExpanded);
const answers = reactive<Record<string, unknown>>({});

// Computed
const followUpQuestions = ref(props.questions);

// Methods
function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value;
}

function emitAnswers(): void {
  emit('answersChanged', { ...answers });
}

// Watch for question changes
watch(
  () => props.questions,
  (newQuestions) => {
    followUpQuestions.value = newQuestions;
  },
  { deep: true }
);

// Load existing answers
onMounted(() => {
  if (props.existingAnswers) {
    Object.assign(answers, props.existingAnswers);
  }
});
</script>

<style scoped>
.follow-up-section {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
}

.follow-up-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.follow-up-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--vscode-foreground);
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
  transition: transform 0.2s;
}

.toggle-btn.expanded {
  transform: rotate(0deg);
}

.follow-up-content {
  margin-top: 1rem;
}

.follow-up-hint {
  color: var(--vscode-descriptionForeground);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.follow-up-question {
  margin-bottom: 1.2rem;
}

.question-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--vscode-foreground);
  font-size: 0.9rem;
}

.required-mark {
  color: var(--vscode-errorForeground);
  margin-left: 0.2rem;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  font-family: var(--vscode-font-family);
  font-size: 0.85rem;
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 3px;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--vscode-foreground);
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--vscode-foreground);
}

.radio-option input[type="radio"] {
  cursor: pointer;
}

.question-hint-text {
  display: block;
  font-size: 0.75rem;
  color: var(--vscode-descriptionForeground);
  margin-top: 0.3rem;
  line-height: 1.3;
}

.ai-loader {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--vscode-descriptionForeground);
}

.loader-icon {
  font-size: 1.2rem;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.slide-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

@media (max-width: 768px) {
  .follow-up-section {
    padding: 0.8rem;
  }

  .question-label {
    font-size: 0.85rem;
  }

  .form-control {
    font-size: 0.8rem;
  }
}
</style>
