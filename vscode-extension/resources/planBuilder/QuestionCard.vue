<template>
  <div class="question-card" :class="{ 'has-error': hasError }">
    <label :for="question.id" class="question-label">
      {{ question.question }}
      <span v-if="question.required" class="required-marker" aria-label="Required">*</span>
    </label>

    <p v-if="question.helpText" class="help-text">{{ question.helpText }}</p>

    <!-- Text Input -->
    <input
      v-if="question.type === 'text'"
      :id="question.id"
      type="text"
      :value="modelValue"
      @input="handleInput"
      :placeholder="question.placeholder"
      class="input"
      :aria-required="question.required"
      :aria-invalid="hasError"
      :aria-describedby="hasError ? `${question.id}-error` : undefined"
    />

    <!-- Textarea -->
    <textarea
      v-if="question.type === 'textarea'"
      :id="question.id"
      :value="modelValue"
      @input="handleInput"
      :placeholder="question.placeholder"
      class="textarea"
      :aria-required="question.required"
      :aria-invalid="hasError"
      :aria-describedby="hasError ? `${question.id}-error` : undefined"
      rows="4"
    />

    <!-- Select -->
    <select
      v-if="question.type === 'select'"
      :id="question.id"
      :value="modelValue"
      @change="handleSelect"
      class="select"
      :aria-required="question.required"
      :aria-invalid="hasError"
      :aria-describedby="hasError ? `${question.id}-error` : undefined"
    >
      <option value="">{{ question.placeholder || 'Select an option...' }}</option>
      <option v-for="option in question.options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <!-- Multi-Select -->
    <div v-if="question.type === 'multi-select'" class="multi-select">
      <div
        v-for="option in question.options"
        :key="option.value"
        class="checkbox-option"
      >
        <input
          type="checkbox"
          :id="`${question.id}-${option.value}`"
          :value="option.value"
          :checked="isSelected(option.value)"
          @change="handleMultiSelect($event, option.value)"
          class="checkbox"
        />
        <label :for="`${question.id}-${option.value}`" class="checkbox-label">
          {{ option.label }}
        </label>
      </div>
    </div>

    <!-- Boolean / Toggle -->
    <div v-if="question.type === 'boolean'" class="toggle-container">
      <input
        type="checkbox"
        :id="question.id"
        :checked="modelValue === true"
        @change="handleBoolean"
        class="toggle"
        :aria-required="question.required"
      />
      <label :for="question.id" class="toggle-label">
        {{ question.placeholder || 'Enable' }}
      </label>
    </div>

    <!-- Number Input -->
    <input
      v-if="question.type === 'number'"
      :id="question.id"
      type="number"
      :value="modelValue"
      @input="handleNumberInput"
      :placeholder="question.placeholder"
      :min="question.min"
      :max="question.max"
      class="input"
      :aria-required="question.required"
      :aria-invalid="hasError"
      :aria-describedby="hasError ? `${question.id}-error` : undefined"
    />

    <!-- Range Slider -->
    <div v-if="question.type === 'range'" class="range-container">
      <input
        :id="question.id"
        type="range"
        :value="modelValue || question.min || 0"
        @input="handleRangeInput"
        :min="question.min || 0"
        :max="question.max || 100"
        :step="question.step || 1"
        class="range-slider"
        :aria-required="question.required"
        :aria-valuemin="question.min || 0"
        :aria-valuemax="question.max || 100"
        :aria-valuenow="modelValue || question.min || 0"
      />
      <span class="range-value">{{ modelValue || question.min || 0 }}</span>
    </div>

    <!-- File Picker -->
    <input
      v-if="question.type === 'file'"
      :id="question.id"
      type="file"
      @change="handleFileInput"
      class="file-input"
      :aria-required="question.required"
      :aria-invalid="hasError"
      :aria-describedby="hasError ? `${question.id}-error` : undefined"
    />

    <!-- Validation Errors -->
    <div v-if="hasError" :id="`${question.id}-error`" class="error-message" role="alert">
      <span v-for="(err, index) in error" :key="index" class="error-text">
        {{ err }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Question } from '../../src/planBuilder/questionFramework';

interface Props {
  question: Question;
  value?: unknown;
  error?: string[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  update: [questionId: string, value: unknown];
}>();

const modelValue = computed(() => props.value);
const hasError = computed(() => props.error && props.error.length > 0);

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  emit('update', props.question.id, target.value);
}

function handleSelect(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update', props.question.id, target.value);
}

function handleMultiSelect(event: Event, value: string) {
  const target = event.target as HTMLInputElement;
  const currentValues = (modelValue.value as string[]) || [];
  
  if (target.checked) {
    emit('update', props.question.id, [...currentValues, value]);
  } else {
    emit('update', props.question.id, currentValues.filter(v => v !== value));
  }
}

function isSelected(value: string): boolean {
  const currentValues = modelValue.value as string[] | undefined;
  return currentValues ? currentValues.includes(value) : false;
}

function handleBoolean(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update', props.question.id, target.checked);
}

function handleNumberInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const numValue = parseFloat(target.value);
  emit('update', props.question.id, isNaN(numValue) ? null : numValue);
}

function handleRangeInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update', props.question.id, parseFloat(target.value));
}

function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  emit('update', props.question.id, file?.name);
}
</script>

<style scoped>
.question-card {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: border-color 0.2s;
}

.question-card.has-error {
  border-color: var(--vscode-inputValidation-errorBorder);
}

.question-label {
  display: block;
  font-size: 1rem;
  font-weight: 500;
  color: var(--vscode-foreground);
  margin-bottom: 0.5rem;
}

.required-marker {
  color: var(--vscode-errorForeground);
  margin-left: 0.25rem;
}

.help-text {
  font-size: 0.875rem;
  color: var(--vscode-descriptionForeground);
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.input,
.textarea,
.select,
.file-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  font-family: var(--vscode-font-family);
  color: var(--vscode-input-foreground);
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus,
.textarea:focus,
.select:focus {
  border-color: var(--vscode-focusBorder);
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.multi-select {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 0.95rem;
  color: var(--vscode-foreground);
  cursor: pointer;
  margin: 0;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.toggle-label {
  font-size: 0.95rem;
  color: var(--vscode-foreground);
  cursor: pointer;
  margin: 0;
}

.range-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.range-slider {
  flex: 1;
  height: 6px;
  cursor: pointer;
}

.range-value {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--vscode-foreground);
  min-width: 3rem;
  text-align: right;
}

.error-message {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  border-radius: 4px;
}

.error-text {
  display: block;
  font-size: 0.875rem;
  color: var(--vscode-errorForeground);
  line-height: 1.4;
}

.error-text:not(:last-child) {
  margin-bottom: 0.25rem;
}
</style>
