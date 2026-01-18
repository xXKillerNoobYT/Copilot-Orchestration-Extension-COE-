<template>
  <div class="question-container question-four">
    <div class="question-header">
      <h2>What are constraints?</h2>
      <p class="question-hint">
        Identify limitations and boundaries that will shape your project's implementation and delivery.
      </p>
    </div>

    <div class="form-group">
      <label for="timeline" class="required">
        Timeline / Deadline
      </label>
      <input
        id="timeline"
        v-model="timeline"
        type="text"
        maxlength="100"
        placeholder="e.g., 3 months, Q2 2024, By June 30th"
        class="form-control"
        :class="{ 'has-error': errors.timeline }"
        @blur="validate"
      />
      <div v-if="errors.timeline" class="error-message">{{ errors.timeline }}</div>
      <div class="field-hint">When must this project be completed?</div>
    </div>

    <div class="form-group">
      <label class="required">
        Technology Constraints
        <button type="button" class="btn-add" @click="addTechConstraint">+ Add Constraint</button>
      </label>
      <div class="list-items">
        <div v-for="(constraint, index) in techConstraints" :key="`tech-${index}`" class="list-item">
          <input
            v-model="techConstraints[index]"
            type="text"
            maxlength="150"
            placeholder="e.g., Must use Python 3.11, AWS only, No third-party APIs"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeTechConstraint(index)"
            :disabled="techConstraints.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.techConstraints" class="error-message">{{ errors.techConstraints }}</div>
      <div class="field-hint">What technology limitations or requirements exist?</div>
    </div>

    <div class="form-group">
      <label for="resource-limits" class="required">
        Resource Limits
        <span class="character-count">{{ resourceLimits.length }}/500</span>
      </label>
      <textarea
        id="resource-limits"
        v-model="resourceLimits"
        maxlength="500"
        rows="4"
        placeholder="Describe budget, team size, infrastructure, or other resource constraints..."
        class="form-control"
        :class="{ 'has-error': errors.resourceLimits }"
        @blur="validate"
      ></textarea>
      <div v-if="errors.resourceLimits" class="error-message">{{ errors.resourceLimits }}</div>
      <div class="field-hint">What resource limitations do you face?</div>
    </div>

    <div class="form-group">
      <label class="required">
        Dependencies
        <button type="button" class="btn-add" @click="addDependency">+ Add Dependency</button>
      </label>
      <div class="list-items">
        <div v-for="(dependency, index) in dependencies" :key="`dep-${index}`" class="list-item">
          <input
            v-model="dependencies[index]"
            type="text"
            maxlength="150"
            placeholder="e.g., Authentication service must be live, Data migration complete"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeDependency(index)"
            :disabled="dependencies.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.dependencies" class="error-message">{{ errors.dependencies }}</div>
      <div class="field-hint">What must be in place before or during this project?</div>
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
  questionId: 'q4-constraints',
});

const wizardStore = useWizardStore();

// State
const timeline = ref('');
const techConstraints = ref(['']);
const resourceLimits = ref('');
const dependencies = ref(['']);

const errors = ref({
  timeline: '',
  techConstraints: '',
  resourceLimits: '',
  dependencies: '',
});

// Computed
const hasErrors = computed(() =>
  Object.values(errors.value).some(error => error !== '')
);

const isValid = computed(() =>
  timeline.value.trim().length > 0 &&
  techConstraints.value.filter(c => c.trim().length > 0).length >= 1 &&
  resourceLimits.value.trim().length >= 20 &&
  dependencies.value.filter(d => d.trim().length > 0).length >= 1 &&
  !hasErrors.value
);

// Methods
function addTechConstraint() {
  techConstraints.value.push('');
}

function removeTechConstraint(index: number) {
  if (techConstraints.value.length > 1) {
    techConstraints.value.splice(index, 1);
  }
}

function addDependency() {
  dependencies.value.push('');
}

function removeDependency(index: number) {
  if (dependencies.value.length > 1) {
    dependencies.value.splice(index, 1);
  }
}

function validate(): boolean {
  errors.value = {
    timeline: '',
    techConstraints: '',
    resourceLimits: '',
    dependencies: '',
  };

  // Validate timeline
  if (!timeline.value.trim()) {
    errors.value.timeline = 'Timeline/deadline is required';
  }

  // Validate technology constraints
  const validConstraints = techConstraints.value.filter(c => c.trim().length > 0);
  if (validConstraints.length < 1) {
    errors.value.techConstraints = 'Please provide at least one technology constraint';
  }

  // Validate resource limits
  if (!resourceLimits.value.trim()) {
    errors.value.resourceLimits = 'Resource limits description is required';
  } else if (resourceLimits.value.length < 20) {
    errors.value.resourceLimits = 'Please provide more details (at least 20 characters)';
  }

  // Validate dependencies
  const validDependencies = dependencies.value.filter(d => d.trim().length > 0);
  if (validDependencies.length < 1) {
    errors.value.dependencies = 'Please provide at least one dependency';
  }

  return !hasErrors.value;
}

// Watch for changes and update store
watch(
  () => ({
    timeline: timeline.value,
    techConstraints: techConstraints.value.filter(c => c.trim().length > 0),
    resourceLimits: resourceLimits.value,
    dependencies: dependencies.value.filter(d => d.trim().length > 0),
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
    timeline: string;
    techConstraints: string[];
    resourceLimits: string;
    dependencies: string[];
  }>(props.questionId);

  if (existingAnswer) {
    timeline.value = existingAnswer.timeline || '';
    techConstraints.value = existingAnswer.techConstraints?.length > 0 
      ? [...existingAnswer.techConstraints] 
      : [''];
    resourceLimits.value = existingAnswer.resourceLimits || '';
    dependencies.value = existingAnswer.dependencies?.length > 0 
      ? [...existingAnswer.dependencies] 
      : [''];
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

.list-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.list-item .form-control {
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
  .question-container {
    padding: 1rem;
  }
}
</style>
