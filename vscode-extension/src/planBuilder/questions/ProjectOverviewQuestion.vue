<template>
  <div class="question-container project-overview">
    <div class="question-header">
      <h2>Project Overview</h2>
      <p class="question-hint">
        Tell us about your project. This information will help us understand your needs and generate an appropriate plan.
      </p>
    </div>

    <div class="form-group">
      <label for="project-name" class="required">
        Project Name
        <span class="character-count">{{ nameLength }}/50</span>
      </label>
      <input
        id="project-name"
        v-model="projectName"
        type="text"
        maxlength="50"
        placeholder="e.g., My Awesome App"
        class="form-control"
        :class="{ 'has-error': errors.name }"
        @blur="validateName"
      />
      <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
      <div class="field-hint">Choose a unique, descriptive name for your project</div>
    </div>

    <div class="form-group">
      <label for="project-description" class="required">
        Project Description
        <span class="character-count">{{ descriptionLength }}/500</span>
      </label>
      <textarea
        id="project-description"
        v-model="projectDescription"
        maxlength="500"
        rows="5"
        placeholder="Describe what your project does, its key features, and goals..."
        class="form-control"
        :class="{ 'has-error': errors.description }"
        @blur="validateDescription"
      ></textarea>
      <div v-if="errors.description" class="error-message">{{ errors.description }}</div>
      <div class="field-hint">Provide a clear overview of your project's purpose and main features</div>
    </div>

    <div class="form-group">
      <label class="required">Project Type</label>
      <div class="radio-group">
        <label
          v-for="type in projectTypes"
          :key="type.value"
          class="radio-label"
          :class="{ selected: projectType === type.value }"
        >
          <input
            v-model="projectType"
            type="radio"
            :value="type.value"
            name="project-type"
            @change="validateType"
          />
          <div class="radio-content">
            <span class="radio-icon">{{ type.icon }}</span>
            <div class="radio-text">
              <strong>{{ type.label }}</strong>
              <small>{{ type.description }}</small>
            </div>
          </div>
        </label>
      </div>
      <div v-if="errors.type" class="error-message">{{ errors.type }}</div>
    </div>

    <div v-if="hasErrors" class="validation-summary error">
      Please correct the errors above before proceeding.
    </div>

    <div v-if="isValid && !hasErrors" class="validation-summary success">
      ✓ All fields complete and valid
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useWizardStore } from '../wizardStore';

// Props
interface Props {
  questionId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  questionId: 'q1-project-overview',
});

// Store
const wizardStore = useWizardStore();

// State
const projectName = ref('');
const projectDescription = ref('');
const projectType = ref('');

const errors = ref({
  name: '',
  description: '',
  type: '',
});

// Project type options
const projectTypes = [
  {
    value: 'web',
    label: 'Web Application',
    icon: '🌐',
    description: 'Browser-based application with frontend and/or backend',
  },
  {
    value: 'api',
    label: 'API / Backend Service',
    icon: '⚙️',
    description: 'RESTful API, GraphQL, or microservice',
  },
  {
    value: 'cli',
    label: 'CLI Tool',
    icon: '💻',
    description: 'Command-line interface application or script',
  },
  {
    value: 'library',
    label: 'Library / Package',
    icon: '📦',
    description: 'Reusable library or npm/pypi package',
  },
];

// Computed
const nameLength = computed(() => projectName.value.length);
const descriptionLength = computed(() => projectDescription.value.length);

const hasErrors = computed(() => 
  Object.values(errors.value).some(error => error !== '')
);

const isValid = computed(() =>
  projectName.value.length > 0 &&
  projectDescription.value.length > 0 &&
  projectType.value !== '' &&
  !hasErrors.value
);

// Validation functions
function validateName(): boolean {
  errors.value.name = '';

  if (!projectName.value.trim()) {
    errors.value.name = 'Project name is required';
    return false;
  }

  if (projectName.value.length < 3) {
    errors.value.name = 'Project name must be at least 3 characters';
    return false;
  }

  if (projectName.value.length > 50) {
    errors.value.name = 'Project name must not exceed 50 characters';
    return false;
  }

  // Basic uniqueness check (could be enhanced with API call)
  const commonNames = ['test', 'demo', 'sample', 'project', 'app', 'application'];
  const lowerName = projectName.value.toLowerCase();
  if (commonNames.some(name => lowerName === name)) {
    errors.value.name = 'Please choose a more specific project name';
    return false;
  }

  return true;
}

function validateDescription(): boolean {
  errors.value.description = '';

  if (!projectDescription.value.trim()) {
    errors.value.description = 'Project description is required';
    return false;
  }

  if (projectDescription.value.length < 20) {
    errors.value.description = 'Description must be at least 20 characters';
    return false;
  }

  if (projectDescription.value.length > 500) {
    errors.value.description = 'Description must not exceed 500 characters';
    return false;
  }

  return true;
}

function validateType(): boolean {
  errors.value.type = '';

  if (!projectType.value) {
    errors.value.type = 'Please select a project type';
    return false;
  }

  return true;
}

function validateAll(): boolean {
  const nameValid = validateName();
  const descValid = validateDescription();
  const typeValid = validateType();

  return nameValid && descValid && typeValid;
}

// Watch for changes and update store
watch(
  () => ({
    name: projectName.value,
    description: projectDescription.value,
    type: projectType.value,
  }),
  (value) => {
    if (isValid.value) {
      wizardStore.setAnswer(props.questionId, value);
    }
  },
  { deep: true }
);

// Load existing answer from store
onMounted(() => {
  const existingAnswer = wizardStore.getAnswer<{
    name: string;
    description: string;
    type: string;
  }>(props.questionId);

  if (existingAnswer) {
    projectName.value = existingAnswer.name || '';
    projectDescription.value = existingAnswer.description || '';
    projectType.value = existingAnswer.type || '';
  }
});

// Expose validation for parent component
defineExpose({
  validate: validateAll,
  isValid,
});
</script>

<style scoped>
.question-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.question-header {
  margin-bottom: 2rem;
}

.question-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--vscode-foreground);
}

.question-hint {
  color: var(--vscode-descriptionForeground);
  font-size: 0.95rem;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--vscode-foreground);
}

.form-group label.required::after {
  content: ' *';
  color: var(--vscode-errorForeground);
}

.character-count {
  font-size: 0.85rem;
  color: var(--vscode-descriptionForeground);
  font-weight: normal;
}

.form-control {
  width: 100%;
  padding: 0.6rem;
  font-family: var(--vscode-font-family);
  font-size: 0.95rem;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.form-control.has-error {
  border-color: var(--vscode-inputValidation-errorBorder);
  background: var(--vscode-inputValidation-errorBackground);
}

.error-message {
  color: var(--vscode-errorForeground);
  font-size: 0.85rem;
  margin-top: 0.4rem;
}

.field-hint {
  font-size: 0.85rem;
  color: var(--vscode-descriptionForeground);
  margin-top: 0.4rem;
}

.radio-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.radio-label {
  position: relative;
  cursor: pointer;
  padding: 1rem;
  border: 2px solid var(--vscode-input-border);
  border-radius: 6px;
  transition: all 0.2s;
  background: var(--vscode-input-background);
}

.radio-label:hover {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-hoverBackground);
}

.radio-label.selected {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-activeSelectionBackground);
}

.radio-label input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-content {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
}

.radio-icon {
  font-size: 1.5rem;
}

.radio-text {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.radio-text strong {
  color: var(--vscode-foreground);
  font-size: 0.95rem;
}

.radio-text small {
  color: var(--vscode-descriptionForeground);
  font-size: 0.8rem;
  line-height: 1.3;
}

.validation-summary {
  padding: 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.validation-summary.error {
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  color: var(--vscode-errorForeground);
}

.validation-summary.success {
  background: var(--vscode-testing-iconPassed);
  opacity: 0.2;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-testing-iconPassed);
}

@media (max-width: 768px) {
  .radio-group {
    grid-template-columns: 1fr;
  }

  .question-container {
    padding: 1rem;
  }
}
</style>
