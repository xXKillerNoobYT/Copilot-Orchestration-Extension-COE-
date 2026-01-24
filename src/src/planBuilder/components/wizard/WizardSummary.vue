<template>
  <div class="wizard-summary-container">
    <div class="summary-header">
      <h2>Review Your Plan</h2>
      <p class="summary-hint">
        Review all your answers below. You can go back to edit any section or proceed to generate your plan.
      </p>
    </div>

    <div class="summary-sections">
      <!-- Q1: What are you building? -->
      <div class="summary-section">
        <div class="section-header">
          <h3>📋 What are you building?</h3>
          <button class="btn-edit" @click="editQuestion(1)">Edit</button>
        </div>
        <div v-if="q1Answer" class="section-content">
          <div class="field-display">
            <strong>Project Name:</strong>
            <span>{{ q1Answer.projectName }}</span>
          </div>
          <div class="field-display">
            <strong>Type:</strong>
            <span class="badge">{{ getProjectTypeLabel(q1Answer.projectType) }}</span>
          </div>
          <div class="field-display">
            <strong>Description:</strong>
            <p>{{ q1Answer.projectDescription }}</p>
          </div>
          <div class="field-display">
            <strong>Key Objectives:</strong>
            <ul>
              <li v-for="(obj, index) in q1Answer.objectives" :key="index">{{ obj }}</li>
            </ul>
          </div>
        </div>
        <div v-else class="section-incomplete">
          ⚠️ This section is incomplete. Please go back and complete it.
        </div>
      </div>

      <!-- Q2: Who are the users/stakeholders? -->
      <div class="summary-section">
        <div class="section-header">
          <h3>👥 Who are the users/stakeholders?</h3>
          <button class="btn-edit" @click="editQuestion(2)">Edit</button>
        </div>
        <div v-if="q2Answer" class="section-content">
          <div class="field-display">
            <strong>Primary Users:</strong>
            <ul>
              <li v-for="(user, index) in q2Answer.primaryUsers" :key="index">{{ user }}</li>
            </ul>
          </div>
          <div v-if="q2Answer.secondaryUsers?.length > 0" class="field-display">
            <strong>Secondary Users:</strong>
            <ul>
              <li v-for="(user, index) in q2Answer.secondaryUsers" :key="index">{{ user }}</li>
            </ul>
          </div>
          <div class="field-display">
            <strong>Key Stakeholders:</strong>
            <ul>
              <li v-for="(stakeholder, index) in q2Answer.stakeholders" :key="index">{{ stakeholder }}</li>
            </ul>
          </div>
          <div class="field-display">
            <strong>User Needs:</strong>
            <p>{{ q2Answer.userNeeds }}</p>
          </div>
        </div>
        <div v-else class="section-incomplete">
          ⚠️ This section is incomplete. Please go back and complete it.
        </div>
      </div>

      <!-- Q3: What are success criteria? -->
      <div class="summary-section">
        <div class="section-header">
          <h3>✅ What are success criteria?</h3>
          <button class="btn-edit" @click="editQuestion(3)">Edit</button>
        </div>
        <div v-if="q3Answer" class="section-content">
          <div class="field-display">
            <strong>Success Criteria:</strong>
            <ul>
              <li v-for="(criteria, index) in q3Answer.successCriteria" :key="index">{{ criteria }}</li>
            </ul>
          </div>
          <div v-if="q3Answer.metrics?.length > 0" class="field-display">
            <strong>Metrics:</strong>
            <ul>
              <li v-for="(metric, index) in q3Answer.metrics" :key="index">{{ metric }}</li>
            </ul>
          </div>
          <div class="field-display">
            <strong>Non-Functional Requirements:</strong>
            <ul>
              <li v-for="(req, index) in q3Answer.nonFunctionalRequirements" :key="index">{{ req }}</li>
            </ul>
          </div>
          <div class="field-display">
            <strong>User Acceptance Criteria:</strong>
            <p>{{ q3Answer.userAcceptanceCriteria }}</p>
          </div>
        </div>
        <div v-else class="section-incomplete">
          ⚠️ This section is incomplete. Please go back and complete it.
        </div>
      </div>

      <!-- Q4: What are constraints? -->
      <div class="summary-section">
        <div class="section-header">
          <h3>⏱️ What are constraints?</h3>
          <button class="btn-edit" @click="editQuestion(4)">Edit</button>
        </div>
        <div v-if="q4Answer" class="section-content">
          <div class="field-display">
            <strong>Timeline/Deadline:</strong>
            <span>{{ q4Answer.timeline }}</span>
          </div>
          <div class="field-display">
            <strong>Technology Constraints:</strong>
            <ul>
              <li v-for="(constraint, index) in q4Answer.technologyConstraints" :key="index">{{ constraint }}</li>
            </ul>
          </div>
          <div class="field-display">
            <strong>Resource Limits:</strong>
            <p>{{ q4Answer.resourceLimits }}</p>
          </div>
          <div class="field-display">
            <strong>Dependencies:</strong>
            <ul>
              <li v-for="(dep, index) in q4Answer.dependencies" :key="index">{{ dep }}</li>
            </ul>
          </div>
        </div>
        <div v-else class="section-incomplete">
          ⚠️ This section is incomplete. Please go back and complete it.
        </div>
      </div>

      <!-- Q5: What are risks? -->
      <div class="summary-section">
        <div class="section-header">
          <h3>⚠️ What are risks?</h3>
          <button class="btn-edit" @click="editQuestion(5)">Edit</button>
        </div>
        <div v-if="q5Answer" class="section-content">
          <div class="field-display">
            <strong>Technical Risks:</strong>
            <ul>
              <li v-for="(risk, index) in q5Answer.technicalRisks" :key="index">{{ risk }}</li>
            </ul>
          </div>
          <div class="field-display">
            <strong>Resource Risks:</strong>
            <ul>
              <li v-for="(risk, index) in q5Answer.resourceRisks" :key="index">{{ risk }}</li>
            </ul>
          </div>
          <div class="field-display">
            <strong>Business Risks:</strong>
            <ul>
              <li v-for="(risk, index) in q5Answer.businessRisks" :key="index">{{ risk }}</li>
            </ul>
          </div>
          <div v-if="q5Answer.mitigations?.length > 0" class="field-display">
            <strong>Mitigation Strategies:</strong>
            <ul>
              <li v-for="(mitigation, index) in q5Answer.mitigations" :key="index">{{ mitigation }}</li>
            </ul>
          </div>
        </div>
        <div v-else class="section-incomplete">
          ⚠️ This section is incomplete. Please go back and complete it.
        </div>
      </div>
    </div>

    <div class="summary-actions">
      <div v-if="!allQuestionsComplete" class="warning-message">
        ⚠️ Please complete all required questions before generating your plan.
      </div>
      <button
        v-else
        class="btn-generate"
        :disabled="isGenerating"
        @click="generatePlan"
      >
        {{ isGenerating ? '🔄 Generating Plan...' : '🚀 Generate Plan' }}
      </button>
    </div>

    <div v-if="generationError" class="error-alert">
      <strong>Error:</strong> {{ generationError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWizardStore } from '../../wizardStore';

interface Props {
  questionId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  questionId: 'q6-summary',
});

const emit = defineEmits<{
  'edit-question': [questionNumber: number];
  'generate-plan': [answers: WizardAnswers];
}>();

interface WizardAnswers {
  q1?: any;
  q2?: any;
  q3?: any;
  q4?: any;
  q5?: any;
}

const wizardStore = useWizardStore();

// State
const isGenerating = ref(false);
const generationError = ref('');

// Computed - load all answers
const q1Answer = computed(() => wizardStore.getAnswer('q1-what-building'));
const q2Answer = computed(() => wizardStore.getAnswer('q2-users-stakeholders'));
const q3Answer = computed(() => wizardStore.getAnswer('q3-success-criteria'));
const q4Answer = computed(() => wizardStore.getAnswer('q4-constraints'));
const q5Answer = computed(() => wizardStore.getAnswer('q5-risks'));

const allQuestionsComplete = computed(() => 
  q1Answer.value && 
  q2Answer.value && 
  q3Answer.value && 
  q4Answer.value && 
  q5Answer.value
);

// Methods
function getProjectTypeLabel(type: string): string {
  const types: Record<string, string> = {
    api: 'API / Backend',
    ui: 'UI / Frontend',
    service: 'Service',
    library: 'Library',
    other: 'Other',
  };
  return types[type] || type;
}

function editQuestion(questionNumber: number) {
  emit('edit-question', questionNumber);
}

async function generatePlan() {
  if (!allQuestionsComplete.value) {
    return;
  }

  isGenerating.value = true;
  generationError.value = '';

  try {
    const answers: WizardAnswers = {
      q1: q1Answer.value,
      q2: q2Answer.value,
      q3: q3Answer.value,
      q4: q4Answer.value,
      q5: q5Answer.value,
    };

    emit('generate-plan', answers);

    // The parent will handle the actual plan generation
    // and potentially navigate away from this summary page
  } catch (error) {
    console.error('Failed to generate plan:', error);
    generationError.value = error instanceof Error ? error.message : 'Unknown error occurred';
  } finally {
    isGenerating.value = false;
  }
}

onMounted(() => {
  // Mark summary as visited in the store
  wizardStore.setAnswer(props.questionId, { visited: true });
});

defineExpose({
  isValid: allQuestionsComplete,
});
</script>

<style scoped>
.wizard-summary-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.summary-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--vscode-panel-border);
}

.summary-header h2 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--vscode-foreground);
}

.summary-hint {
  color: var(--vscode-descriptionForeground);
  font-size: 0.95rem;
  line-height: 1.5;
}

.summary-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-section {
  padding: 1.5rem;
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.section-header h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0;
}

.btn-edit {
  padding: 0.4rem 0.8rem;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 3px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-edit:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-display {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-display strong {
  color: var(--vscode-foreground);
  font-size: 0.9rem;
  font-weight: 600;
}

.field-display span,
.field-display p {
  color: var(--vscode-descriptionForeground);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.field-display ul {
  margin: 0.3rem 0 0 1.5rem;
  padding: 0;
  list-style-type: disc;
}

.field-display li {
  color: var(--vscode-descriptionForeground);
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.section-incomplete {
  padding: 1rem;
  background: var(--vscode-inputValidation-warningBackground);
  border: 1px solid var(--vscode-inputValidation-warningBorder);
  border-radius: 4px;
  color: var(--vscode-inputValidation-warningForeground);
  font-size: 0.9rem;
}

.summary-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
}

.warning-message {
  padding: 1rem 1.5rem;
  background: var(--vscode-inputValidation-warningBackground);
  border: 1px solid var(--vscode-inputValidation-warningBorder);
  border-radius: 4px;
  color: var(--vscode-inputValidation-warningForeground);
  font-size: 0.95rem;
  text-align: center;
}

.btn-generate {
  padding: 1rem 2rem;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 200px;
}

.btn-generate:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

.btn-generate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-alert {
  padding: 1rem;
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  border-radius: 4px;
  color: var(--vscode-errorForeground);
  margin-top: 1rem;
}

.error-alert strong {
  font-weight: 600;
}

@media (max-width: 768px) {
  .wizard-summary-container {
    padding: 1rem;
  }

  .summary-section {
    padding: 1rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
