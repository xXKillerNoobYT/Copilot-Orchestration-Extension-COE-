<template>
  <div class="question-container question-five">
    <div class="question-header">
      <h2>What are risks?</h2>
      <p class="question-hint">
        Identify potential risks and challenges that could impact your project's success.
      </p>
    </div>

    <div class="form-group">
      <label class="required">
        Technical Risks
        <button type="button" class="btn-add" @click="addTechnicalRisk">+ Add Risk</button>
      </label>
      <div class="list-items">
        <div v-for="(risk, index) in technicalRisks" :key="`tech-${index}`" class="list-item">
          <input
            v-model="technicalRisks[index]"
            type="text"
            maxlength="200"
            placeholder="e.g., Complexity of integration, Unproven technology, Performance bottlenecks"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeTechnicalRisk(index)"
            :disabled="technicalRisks.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.technicalRisks" class="error-message">{{ errors.technicalRisks }}</div>
      <div class="field-hint">What technical challenges might you encounter?</div>
    </div>

    <div class="form-group">
      <label class="required">
        Resource Risks
        <button type="button" class="btn-add" @click="addResourceRisk">+ Add Risk</button>
      </label>
      <div class="list-items">
        <div v-for="(risk, index) in resourceRisks" :key="`resource-${index}`" class="list-item">
          <input
            v-model="resourceRisks[index]"
            type="text"
            maxlength="200"
            placeholder="e.g., Team availability, Budget constraints, Skill gaps"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeResourceRisk(index)"
            :disabled="resourceRisks.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.resourceRisks" class="error-message">{{ errors.resourceRisks }}</div>
      <div class="field-hint">What resource-related risks exist?</div>
    </div>

    <div class="form-group">
      <label class="required">
        Business Risks
        <button type="button" class="btn-add" @click="addBusinessRisk">+ Add Risk</button>
      </label>
      <div class="list-items">
        <div v-for="(risk, index) in businessRisks" :key="`business-${index}`" class="list-item">
          <input
            v-model="businessRisks[index]"
            type="text"
            maxlength="200"
            placeholder="e.g., Market changes, Regulatory requirements, Stakeholder alignment"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeBusinessRisk(index)"
            :disabled="businessRisks.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.businessRisks" class="error-message">{{ errors.businessRisks }}</div>
      <div class="field-hint">What business or organizational risks apply?</div>
    </div>

    <div class="form-group">
      <label>
        Mitigation Strategies (Optional)
        <button type="button" class="btn-add" @click="addMitigationStrategy">+ Add Strategy</button>
      </label>
      <div class="list-items">
        <div v-for="(strategy, index) in mitigationStrategies" :key="`mitigation-${index}`" class="list-item">
          <input
            v-model="mitigationStrategies[index]"
            type="text"
            maxlength="200"
            placeholder="e.g., Proof of concept first, Regular stakeholder reviews, Buffer time in schedule"
            class="form-control"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeMitigationStrategy(index)"
          >
            ×
          </button>
        </div>
      </div>
      <div class="field-hint">How will you address or reduce these risks?</div>
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
  questionId: 'q5-risks',
});

const wizardStore = useWizardStore();

// State
const technicalRisks = ref(['']);
const resourceRisks = ref(['']);
const businessRisks = ref(['']);
const mitigationStrategies = ref(['']);

const errors = ref({
  technicalRisks: '',
  resourceRisks: '',
  businessRisks: '',
});

// Computed
const hasErrors = computed(() =>
  Object.values(errors.value).some(error => error !== '')
);

const isValid = computed(() =>
  technicalRisks.value.filter(r => r.trim().length > 0).length >= 1 &&
  resourceRisks.value.filter(r => r.trim().length > 0).length >= 1 &&
  businessRisks.value.filter(r => r.trim().length > 0).length >= 1 &&
  !hasErrors.value
);

// Methods
function addTechnicalRisk() {
  technicalRisks.value.push('');
}

function removeTechnicalRisk(index: number) {
  if (technicalRisks.value.length > 1) {
    technicalRisks.value.splice(index, 1);
  }
}

function addResourceRisk() {
  resourceRisks.value.push('');
}

function removeResourceRisk(index: number) {
  if (resourceRisks.value.length > 1) {
    resourceRisks.value.splice(index, 1);
  }
}

function addBusinessRisk() {
  businessRisks.value.push('');
}

function removeBusinessRisk(index: number) {
  if (businessRisks.value.length > 1) {
    businessRisks.value.splice(index, 1);
  }
}

function addMitigationStrategy() {
  mitigationStrategies.value.push('');
}

function removeMitigationStrategy(index: number) {
  mitigationStrategies.value.splice(index, 1);
}

function validate(): boolean {
  errors.value = {
    technicalRisks: '',
    resourceRisks: '',
    businessRisks: '',
  };

  // Validate technical risks
  const validTechRisks = technicalRisks.value.filter(r => r.trim().length > 0);
  if (validTechRisks.length < 1) {
    errors.value.technicalRisks = 'Please provide at least one technical risk';
  }

  // Validate resource risks
  const validResourceRisks = resourceRisks.value.filter(r => r.trim().length > 0);
  if (validResourceRisks.length < 1) {
    errors.value.resourceRisks = 'Please provide at least one resource risk';
  }

  // Validate business risks
  const validBusinessRisks = businessRisks.value.filter(r => r.trim().length > 0);
  if (validBusinessRisks.length < 1) {
    errors.value.businessRisks = 'Please provide at least one business risk';
  }

  return !hasErrors.value;
}

// Watch for changes and update store
watch(
  () => ({
    technicalRisks: technicalRisks.value.filter(r => r.trim().length > 0),
    resourceRisks: resourceRisks.value.filter(r => r.trim().length > 0),
    businessRisks: businessRisks.value.filter(r => r.trim().length > 0),
    mitigationStrategies: mitigationStrategies.value.filter(s => s.trim().length > 0),
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
    technicalRisks: string[];
    resourceRisks: string[];
    businessRisks: string[];
    mitigationStrategies: string[];
  }>(props.questionId);

  if (existingAnswer) {
    technicalRisks.value = existingAnswer.technicalRisks?.length > 0 
      ? [...existingAnswer.technicalRisks] 
      : [''];
    resourceRisks.value = existingAnswer.resourceRisks?.length > 0 
      ? [...existingAnswer.resourceRisks] 
      : [''];
    businessRisks.value = existingAnswer.businessRisks?.length > 0 
      ? [...existingAnswer.businessRisks] 
      : [''];
    mitigationStrategies.value = existingAnswer.mitigationStrategies?.length > 0 
      ? [...existingAnswer.mitigationStrategies] 
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
