<template>
  <div class="question-container question-one">
    <div class="question-header">
      <h2>What are you building?</h2>
      <p class="question-hint">
        Help us understand your project by providing essential details about what you're creating.
      </p>
    </div>

    <div class="form-group">
      <label for="project-name" class="required">
        Project Name
        <span class="character-count">{{ projectName.length }}/100</span>
      </label>
      <input
        id="project-name"
        v-model="projectName"
        type="text"
        maxlength="100"
        placeholder="e.g., E-Commerce Platform, Analytics Dashboard"
        class="form-control"
        :class="{ 'has-error': errors.projectName }"
        @blur="validate"
      />
      <div v-if="errors.projectName" class="error-message">{{ errors.projectName }}</div>
      <div class="field-hint">Choose a clear, descriptive name for your project</div>
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
            @change="validate"
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
      <div v-if="errors.projectType" class="error-message">{{ errors.projectType }}</div>
    </div>

    <div class="form-group">
      <label for="project-description" class="required">
        Brief Description
        <span class="character-count">{{ projectDescription.length }}/500</span>
      </label>
      <textarea
        id="project-description"
        v-model="projectDescription"
        maxlength="500"
        rows="4"
        placeholder="Describe what your project does and its main purpose..."
        class="form-control"
        :class="{ 'has-error': errors.projectDescription }"
        @blur="validate"
      ></textarea>
      <div v-if="errors.projectDescription" class="error-message">{{ errors.projectDescription }}</div>
      <div class="field-hint">Provide a concise overview of your project's purpose</div>
    </div>

    <div class="form-group">
      <label class="required">
        Key Objectives (3-5 bullet points)
        <button type="button" class="btn-add" @click="addObjective">+ Add Objective</button>
      </label>
      <div class="objectives-list">
        <div v-for="(objective, index) in objectives" :key="index" class="objective-item">
          <input
            v-model="objectives[index]"
            type="text"
            maxlength="200"
            :placeholder="`Objective ${index + 1}`"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeObjective(index)"
            :disabled="objectives.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.objectives" class="error-message">{{ errors.objectives }}</div>
      <div class="field-hint">Define 3-5 main goals you want to achieve with this project</div>
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
import { useWizardStore } from '../../wizardStore';

interface Props {
  questionId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  questionId: 'q1-what-building',
});

const wizardStore = useWizardStore();

// State
const projectName = ref('');
const projectType = ref('');
const projectDescription = ref('');
const objectives = ref(['', '', '']);

const errors = ref({
  projectName: '',
  projectType: '',
  projectDescription: '',
  objectives: '',
});

// Project type options
const projectTypes = [
  {
    value: 'api',
    label: 'API / Backend',
    icon: '⚙️',
    description: 'RESTful API, GraphQL, or microservice',
  },
  {
    value: 'ui',
    label: 'UI / Frontend',
    icon: '🎨',
    description: 'Web, mobile, or desktop user interface',
  },
  {
    value: 'service',
    label: 'Service',
    icon: '🔧',
    description: 'Background service, worker, or daemon',
  },
  {
    value: 'library',
    label: 'Library',
    icon: '📦',
    description: 'Reusable library or package',
  },
  {
    value: 'other',
    label: 'Other',
    icon: '🔹',
    description: 'Other type of project',
  },
];

// Computed
const hasErrors = computed(() =>
  Object.values(errors.value).some(error => error !== '')
);

const isValid = computed(() =>
  projectName.value.trim().length > 0 &&
  projectType.value !== '' &&
  projectDescription.value.trim().length >= 20 &&
  objectives.value.filter(obj => obj.trim().length > 0).length >= 3 &&
  !hasErrors.value
);

// Methods
function addObjective() {
  if (objectives.value.length < 5) {
    objectives.value.push('');
  }
}

function removeObjective(index: number) {
  if (objectives.value.length > 1) {
    objectives.value.splice(index, 1);
  }
}

function validate(): boolean {
  errors.value = {
    projectName: '',
    projectType: '',
    projectDescription: '',
    objectives: '',
  };

  // Validate project name
  if (!projectName.value.trim()) {
    errors.value.projectName = 'Project name is required';
  } else if (projectName.value.length < 3) {
    errors.value.projectName = 'Project name must be at least 3 characters';
  }

  // Validate project type
  if (!projectType.value) {
    errors.value.projectType = 'Please select a project type';
  }

  // Validate description
  if (!projectDescription.value.trim()) {
    errors.value.projectDescription = 'Project description is required';
  } else if (projectDescription.value.length < 20) {
    errors.value.projectDescription = 'Description must be at least 20 characters';
  }

  // Validate objectives
  const validObjectives = objectives.value.filter(obj => obj.trim().length > 0);
  if (validObjectives.length < 3) {
    errors.value.objectives = 'Please provide at least 3 objectives';
  } else if (validObjectives.length > 5) {
    errors.value.objectives = 'Please provide no more than 5 objectives';
  }

  return !hasErrors.value;
}

// Watch for changes and update store
watch(
  () => ({
    projectName: projectName.value,
    projectType: projectType.value,
    projectDescription: projectDescription.value,
    objectives: objectives.value.filter(obj => obj.trim().length > 0),
  }),
  (value) => {
    if (validate()) {
      wizardStore.setAnswer(props.questionId, value);
    }
  },
  { deep: true }
);

// Load existing answer
onMounted(() => {
  const existingAnswer = wizardStore.getAnswer<{
    projectName: string;
    projectType: string;
    projectDescription: string;
    objectives: string[];
  }>(props.questionId);

  if (existingAnswer) {
    projectName.value = existingAnswer.projectName || '';
    projectType.value = existingAnswer.projectType || '';
    projectDescription.value = existingAnswer.projectDescription || '';
    objectives.value = existingAnswer.objectives?.length > 0 
      ? [...existingAnswer.objectives] 
      : ['', '', ''];
  }
});

defineExpose({
  validate,
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

.btn-add {
  padding: 0.3rem 0.6rem;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 3px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover {
  background: var(--vscode-button-hoverBackground);
}

.objectives-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.objective-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.objective-item .form-control {
  flex: 1;
}

.btn-remove {
  padding: 0.4rem 0.8rem;
  background: var(--vscode-errorForeground);
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-remove:hover:not(:disabled) {
  opacity: 0.8;
}

.btn-remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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
