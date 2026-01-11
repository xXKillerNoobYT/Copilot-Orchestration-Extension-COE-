<template>
  <div class="question-renderer">
    <div class="question-header">
      <h2>{{ questionData.title }}</h2>
      <p class="description">{{ questionData.description }}</p>
    </div>

    <div class="question-body">
      <!-- Text input question type -->
      <div v-if="questionData.type === 'text'" class="question-control">
        <label :for="`q-${questionData.id}`" class="label">
          {{ questionData.label || 'Answer' }}
          <span v-if="questionData.required" class="required">*</span>
        </label>
        <input
          :id="`q-${questionData.id}`"
          v-model="answer"
          type="text"
          class="input"
          :placeholder="questionData.placeholder"
          :maxlength="questionData.maxLength"
          @input="validateAndEmit"
          @blur="validateAndEmit"
        />
        <div v-if="questionData.maxLength" class="char-counter">
          {{ answer.length }} / {{ questionData.maxLength }}
        </div>
        <p v-if="questionData.hint" class="hint">{{ questionData.hint }}</p>
      </div>

      <!-- Textarea question type -->
      <div v-else-if="questionData.type === 'textarea'" class="question-control">
        <label :for="`q-${questionData.id}`" class="label">
          {{ questionData.label || 'Answer' }}
          <span v-if="questionData.required" class="required">*</span>
        </label>
        <textarea
          :id="`q-${questionData.id}`"
          v-model="answer"
          class="textarea"
          :placeholder="questionData.placeholder"
          :maxlength="questionData.maxLength"
          :rows="questionData.rows || 4"
          @input="validateAndEmit"
          @blur="validateAndEmit"
        ></textarea>
        <div v-if="questionData.maxLength" class="char-counter">
          {{ answer.length }} / {{ questionData.maxLength }}
        </div>
        <p v-if="questionData.hint" class="hint">{{ questionData.hint }}</p>
      </div>

      <!-- Radio/Select question type -->
      <div v-else-if="questionData.type === 'radio'" class="question-control">
        <fieldset class="fieldset">
          <legend class="label">
            {{ questionData.label || 'Choose one' }}
            <span v-if="questionData.required" class="required">*</span>
          </legend>
          <div class="radio-group">
            <label
              v-for="option in questionData.options"
              :key="option.value"
              class="radio-label"
            >
              <input
                v-model="answer"
                type="radio"
                :value="option.value"
                class="radio-input"
                @change="validateAndEmit"
              />
              <span class="radio-text">{{ option.label }}</span>
              <p v-if="option.description" class="option-description">
                {{ option.description }}
              </p>
            </label>
          </div>
        </fieldset>
        <p v-if="questionData.hint" class="hint">{{ questionData.hint }}</p>
      </div>

      <!-- Checkbox question type -->
      <div v-else-if="questionData.type === 'checkbox'" class="question-control">
        <fieldset class="fieldset">
          <legend class="label">
            {{ questionData.label || 'Select all that apply' }}
            <span v-if="questionData.required" class="required">*</span>
          </legend>
          <div class="checkbox-group">
            <label
              v-for="option in questionData.options"
              :key="option.value"
              class="checkbox-label"
            >
              <input
                :value="option.value"
                type="checkbox"
                class="checkbox-input"
                @change="handleCheckboxChange"
              />
              <span class="checkbox-text">{{ option.label }}</span>
              <p v-if="option.description" class="option-description">
                {{ option.description }}
              </p>
            </label>
          </div>
        </fieldset>
        <p v-if="questionData.hint" class="hint">{{ questionData.hint }}</p>
      </div>

      <!-- Multi-select question type -->
      <div v-else-if="questionData.type === 'select'" class="question-control">
        <label :for="`q-${questionData.id}`" class="label">
          {{ questionData.label || 'Choose options' }}
          <span v-if="questionData.required" class="required">*</span>
        </label>
        <select
          :id="`q-${questionData.id}`"
          v-model="answer"
          class="select"
          :multiple="questionData.multiple"
          @change="validateAndEmit"
        >
          <option v-if="!questionData.required" value="">-- Select --</option>
          <option
            v-for="option in questionData.options"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <p v-if="questionData.hint" class="hint">{{ questionData.hint }}</p>
      </div>

      <!-- Visual icon grid question type -->
      <div v-else-if="questionData.type === 'visual-grid'" class="question-control">
        <fieldset class="fieldset">
          <legend class="label">
            {{ questionData.label || 'Choose' }}
            <span v-if="questionData.required" class="required">*</span>
          </legend>
          <div class="visual-grid">
            <div
              v-for="option in questionData.options"
              :key="option.value"
              class="visual-item"
              :class="{ selected: answer === option.value }"
              @click="selectVisualOption(option.value)"
            >
              <div class="visual-icon">
                <component :is="option.icon || 'div'" />
              </div>
              <p class="visual-label">{{ option.label }}</p>
              <p v-if="option.description" class="visual-description">
                {{ option.description }}
              </p>
            </div>
          </div>
        </fieldset>
        <p v-if="questionData.hint" class="hint">{{ questionData.hint }}</p>
      </div>

      <!-- Validation errors -->
      <div v-if="validationErrors[currentQuestionId]" class="error-messages">
        <div
          v-for="(error, index) in validationErrors[currentQuestionId]"
          :key="index"
          class="error-message"
        >
          ⚠️ {{ error }}
        </div>
      </div>
    </div>

    <!-- Help text -->
    <div v-if="questionData.helpText" class="help-section">
      <details>
        <summary>💡 Learn more</summary>
        <p>{{ questionData.helpText }}</p>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, withDefaults } from 'vue';

interface QuestionOption {
  value: string | number | boolean;
  label: string;
  description?: string;
  icon?: any;
}

interface QuestionData {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'visual-grid';
  label?: string;
  placeholder?: string;
  hint?: string;
  helpText?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  multiple?: boolean;
  options?: QuestionOption[];
  validators?: Array<(value: any) => string | null>;
  [key: string]: any;
}

interface Props {
  questionData: QuestionData;
  validationErrors?: Record<string, string[]>;
}

const props = withDefaults(defineProps<Props>(), {
  validationErrors: () => ({}),
});

const emit = defineEmits<{
  'answer-changed': [answer: any];
  'validation-error': [errors: string[]];
}>();

// State
const answer = ref<any>(
  props.questionData.type === 'checkbox' ? [] : ''
);

const currentQuestionId = computed(() => props.questionData.id);

// Watch for changes to question data (when navigating to different questions)
watch(
  () => props.questionData.id,
  () => {
    answer.value =
      props.questionData.type === 'checkbox' ? [] : '';
  }
);

// Validation methods
const validateAnswer = (): string[] => {
  const errors: string[] = [];

  // Required validation
  if (props.questionData.required) {
    if (
      props.questionData.type === 'checkbox' &&
      (Array.isArray(answer.value) && answer.value.length === 0)
    ) {
      errors.push(`${props.questionData.label || 'This field'} is required`);
    } else if (
      props.questionData.type !== 'checkbox' &&
      !answer.value
    ) {
      errors.push(`${props.questionData.label || 'This field'} is required`);
    }
  }

  // Min/Max length validation
  if (
    props.questionData.type === 'text' ||
    props.questionData.type === 'textarea'
  ) {
    if (
      props.questionData.minLength &&
      answer.value.length < props.questionData.minLength
    ) {
      errors.push(
        `Minimum ${props.questionData.minLength} characters required`
      );
    }
    if (
      props.questionData.maxLength &&
      answer.value.length > props.questionData.maxLength
    ) {
      errors.push(
        `Maximum ${props.questionData.maxLength} characters allowed`
      );
    }
  }

  // Pattern validation (email, URL, etc.)
  if (props.questionData.pattern) {
    const pattern = new RegExp(props.questionData.pattern);
    if (!pattern.test(answer.value)) {
      errors.push(props.questionData.patternError || 'Invalid format');
    }
  }

  // Custom validators
  if (props.questionData.validators && Array.isArray(props.questionData.validators)) {
    for (const validator of props.questionData.validators) {
      const error = validator(answer.value);
      if (error) {
        errors.push(error);
      }
    }
  }

  return errors;
};

const validateAndEmit = () => {
  const errors = validateAnswer();
  emit('validation-error', errors);

  if (errors.length === 0) {
    emit('answer-changed', answer.value);
  }
};

const handleCheckboxChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.checked) {
    if (!answer.value.includes(target.value)) {
      answer.value.push(target.value);
    }
  } else {
    answer.value = answer.value.filter(
      (v: any) => v !== target.value
    );
  }
  validateAndEmit();
};

const selectVisualOption = (value: any) => {
  answer.value = value;
  validateAndEmit();
};
</script>

<style scoped>
.question-renderer {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: inherit;
}

/* Question header */
.question-header {
  margin-bottom: 16px;
}

.question-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
}

.description {
  margin: 0;
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
}

/* Question body */
.question-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Labels */
.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-editor-foreground);
  margin-bottom: 4px;
}

.required {
  color: var(--vscode-inputValidation-errorBorder);
  margin-left: 4px;
}

/* Input styles */
.input,
.textarea,
.select {
  padding: 8px 12px;
  border: 1px solid var(--vscode-input-border);
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 13px;
  border-radius: 2px;
  transition: all 0.2s ease;
}

.input:focus,
.textarea:focus,
.select:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}

.input:disabled,
.textarea:disabled,
.select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.textarea {
  resize: vertical;
  min-height: 100px;
}

/* Character counter */
.char-counter {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-align: right;
}

/* Hint text */
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  font-style: italic;
}

/* Radio & Checkbox groups */
.fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

.radio-group,
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-label,
.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.radio-label:hover,
.checkbox-label:hover {
  background: var(--vscode-list-hoverBackground);
}

.radio-input,
.checkbox-input {
  margin-top: 4px;
  cursor: pointer;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.radio-text,
.checkbox-text {
  font-size: 13px;
  color: var(--vscode-editor-foreground);
}

.option-description {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

/* Visual grid */
.visual-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.visual-item {
  padding: 16px;
  border: 2px solid var(--vscode-input-border);
  border-radius: 8px;
  background: var(--vscode-input-background);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.visual-item:hover {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-hoverBackground);
}

.visual-item.selected {
  border-color: var(--vscode-progressBar-background);
  background: var(--vscode-list-activeSelectionBackground);
  box-shadow: 0 0 0 2px var(--vscode-progressBar-background);
}

.visual-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.visual-label {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-editor-foreground);
}

.visual-description {
  margin: 0;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

/* Validation errors */
.error-messages {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  border-radius: 4px;
}

.error-message {
  margin: 0;
  font-size: 12px;
  color: var(--vscode-inputValidation-errorForeground);
}

/* Help section */
.help-section {
  padding: 12px;
  background: var(--vscode-notification-background);
  border-radius: 4px;
  border-left: 3px solid var(--vscode-notificationLink-foreground);
}

.help-section summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-notificationLink-foreground);
  user-select: none;
}

.help-section details[open] summary {
  margin-bottom: 8px;
}

.help-section p {
  margin: 0;
  font-size: 12px;
  color: var(--vscode-editor-foreground);
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 600px) {
  .visual-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .question-renderer {
    padding: 16px;
  }
}
</style>
