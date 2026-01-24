<template>
  <div class="question-container question-three">
    <div class="question-header">
      <h2>What are success criteria?</h2>
      <p class="question-hint">
        Define measurable outcomes and acceptance criteria to know when your project is successful.
      </p>
    </div>

    <div class="form-group">
      <label class="required">
        Success Criteria
        <button type="button" class="btn-add" @click="addSuccessCriterion">+ Add Criterion</button>
      </label>
      <div class="list-items">
        <div v-for="(criterion, index) in successCriteria" :key="`criterion-${index}`" class="list-item">
          <input
            v-model="successCriteria[index]"
            type="text"
            maxlength="200"
            placeholder="e.g., System handles 1000 concurrent users, Response time < 200ms"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeSuccessCriterion(index)"
            :disabled="successCriteria.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.successCriteria" class="error-message">{{ errors.successCriteria }}</div>
      <div class="field-hint">What measurable outcomes define success?</div>
    </div>

    <div class="form-group">
      <label>
        Metrics (Optional)
        <button type="button" class="btn-add" @click="addMetric">+ Add Metric</button>
      </label>
      <div class="list-items">
        <div v-for="(metric, index) in metrics" :key="`metric-${index}`" class="list-item">
          <input
            v-model="metrics[index]"
            type="text"
            maxlength="150"
            placeholder="e.g., API uptime 99.9%, Error rate < 0.1%"
            class="form-control"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeMetric(index)"
          >
            ×
          </button>
        </div>
      </div>
      <div class="field-hint">How will you measure success?</div>
    </div>

    <div class="form-group">
      <label class="required">
        Non-Functional Requirements
        <button type="button" class="btn-add" @click="addNonFunctionalReq">+ Add Requirement</button>
      </label>
      <div class="list-items">
        <div v-for="(req, index) in nonFunctionalReqs" :key="`nfr-${index}`" class="list-item">
          <input
            v-model="nonFunctionalReqs[index]"
            type="text"
            maxlength="200"
            placeholder="e.g., Security, Performance, Scalability, Maintainability"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeNonFunctionalReq(index)"
            :disabled="nonFunctionalReqs.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.nonFunctionalReqs" class="error-message">{{ errors.nonFunctionalReqs }}</div>
      <div class="field-hint">What quality attributes must the system have?</div>
    </div>

    <div class="form-group">
      <label for="user-acceptance" class="required">
        User Acceptance Criteria
        <span class="character-count">{{ userAcceptanceCriteria.length }}/1000</span>
      </label>
      <textarea
        id="user-acceptance"
        v-model="userAcceptanceCriteria"
        maxlength="1000"
        rows="6"
        placeholder="Describe the conditions that must be met for users to accept this project as complete..."
        class="form-control"
        :class="{ 'has-error': errors.userAcceptanceCriteria }"
        @blur="validate"
      ></textarea>
      <div v-if="errors.userAcceptanceCriteria" class="error-message">{{ errors.userAcceptanceCriteria }}</div>
      <div class="field-hint">What must be true for users to consider this project done?</div>
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
  questionId: 'q3-success-criteria',
});

const wizardStore = useWizardStore();

// State
const successCriteria = ref(['']);
const metrics = ref(['']);
const nonFunctionalReqs = ref(['']);
const userAcceptanceCriteria = ref('');

const errors = ref({
  successCriteria: '',
  nonFunctionalReqs: '',
  userAcceptanceCriteria: '',
});

// Computed
const hasErrors = computed(() =>
  Object.values(errors.value).some(error => error !== '')
);

const isValid = computed(() =>
  successCriteria.value.filter(c => c.trim().length > 0).length >= 1 &&
  nonFunctionalReqs.value.filter(r => r.trim().length > 0).length >= 1 &&
  userAcceptanceCriteria.value.trim().length >= 50 &&
  !hasErrors.value
);

// Methods
function addSuccessCriterion() {
  successCriteria.value.push('');
}

function removeSuccessCriterion(index: number) {
  if (successCriteria.value.length > 1) {
    successCriteria.value.splice(index, 1);
  }
}

function addMetric() {
  metrics.value.push('');
}

function removeMetric(index: number) {
  metrics.value.splice(index, 1);
}

function addNonFunctionalReq() {
  nonFunctionalReqs.value.push('');
}

function removeNonFunctionalReq(index: number) {
  if (nonFunctionalReqs.value.length > 1) {
    nonFunctionalReqs.value.splice(index, 1);
  }
}

function validate(): boolean {
  errors.value = {
    successCriteria: '',
    nonFunctionalReqs: '',
    userAcceptanceCriteria: '',
  };

  // Validate success criteria
  const validCriteria = successCriteria.value.filter(c => c.trim().length > 0);
  if (validCriteria.length < 1) {
    errors.value.successCriteria = 'Please provide at least one success criterion';
  }

  // Validate non-functional requirements
  const validReqs = nonFunctionalReqs.value.filter(r => r.trim().length > 0);
  if (validReqs.length < 1) {
    errors.value.nonFunctionalReqs = 'Please provide at least one non-functional requirement';
  }

  // Validate user acceptance criteria
  if (!userAcceptanceCriteria.value.trim()) {
    errors.value.userAcceptanceCriteria = 'User acceptance criteria is required';
  } else if (userAcceptanceCriteria.value.length < 50) {
    errors.value.userAcceptanceCriteria = 'Please provide more details (at least 50 characters)';
  }

  return !hasErrors.value;
}

// Watch for changes and update store
watch(
  () => ({
    successCriteria: successCriteria.value.filter(c => c.trim().length > 0),
    metrics: metrics.value.filter(m => m.trim().length > 0),
    nonFunctionalReqs: nonFunctionalReqs.value.filter(r => r.trim().length > 0),
    userAcceptanceCriteria: userAcceptanceCriteria.value,
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
    successCriteria: string[];
    metrics: string[];
    nonFunctionalReqs: string[];
    userAcceptanceCriteria: string;
  }>(props.questionId);

  if (existingAnswer) {
    successCriteria.value = existingAnswer.successCriteria?.length > 0 
      ? [...existingAnswer.successCriteria] 
      : [''];
    metrics.value = existingAnswer.metrics?.length > 0 
      ? [...existingAnswer.metrics] 
      : [''];
    nonFunctionalReqs.value = existingAnswer.nonFunctionalReqs?.length > 0 
      ? [...existingAnswer.nonFunctionalReqs] 
      : [''];
    userAcceptanceCriteria.value = existingAnswer.userAcceptanceCriteria || '';
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
