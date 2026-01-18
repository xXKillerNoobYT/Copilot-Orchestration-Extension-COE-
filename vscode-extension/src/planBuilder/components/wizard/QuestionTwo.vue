<template>
  <div class="question-container question-two">
    <div class="question-header">
      <h2>Who are the users/stakeholders?</h2>
      <p class="question-hint">
        Identify who will use or be impacted by this project. Understanding your audience helps shape requirements.
      </p>
    </div>

    <div class="form-group">
      <label class="required">
        Primary Users
        <button type="button" class="btn-add" @click="addPrimaryUser">+ Add User</button>
      </label>
      <div class="list-items">
        <div v-for="(user, index) in primaryUsers" :key="`primary-${index}`" class="list-item">
          <input
            v-model="primaryUsers[index]"
            type="text"
            maxlength="100"
            placeholder="e.g., End customers, System administrators"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removePrimaryUser(index)"
            :disabled="primaryUsers.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.primaryUsers" class="error-message">{{ errors.primaryUsers }}</div>
      <div class="field-hint">Who will directly use this system?</div>
    </div>

    <div class="form-group">
      <label>
        Secondary Users (Optional)
        <button type="button" class="btn-add" @click="addSecondaryUser">+ Add User</button>
      </label>
      <div class="list-items">
        <div v-for="(user, index) in secondaryUsers" :key="`secondary-${index}`" class="list-item">
          <input
            v-model="secondaryUsers[index]"
            type="text"
            maxlength="100"
            placeholder="e.g., Support staff, Auditors"
            class="form-control"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeSecondaryUser(index)"
          >
            ×
          </button>
        </div>
      </div>
      <div class="field-hint">Who will use this indirectly or occasionally?</div>
    </div>

    <div class="form-group">
      <label class="required">
        Key Stakeholders
        <button type="button" class="btn-add" @click="addStakeholder">+ Add Stakeholder</button>
      </label>
      <div class="list-items">
        <div v-for="(stakeholder, index) in stakeholders" :key="`stakeholder-${index}`" class="list-item">
          <input
            v-model="stakeholders[index]"
            type="text"
            maxlength="100"
            placeholder="e.g., Product Manager, Engineering Lead"
            class="form-control"
            @blur="validate"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeStakeholder(index)"
            :disabled="stakeholders.length <= 1"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="errors.stakeholders" class="error-message">{{ errors.stakeholders }}</div>
      <div class="field-hint">Who has decision-making authority or vested interest?</div>
    </div>

    <div class="form-group">
      <label for="user-needs" class="required">
        User Needs (in their words)
        <span class="character-count">{{ userNeeds.length }}/1000</span>
      </label>
      <textarea
        id="user-needs"
        v-model="userNeeds"
        maxlength="1000"
        rows="6"
        placeholder="Describe what users need from this project. Try to capture their language and pain points..."
        class="form-control"
        :class="{ 'has-error': errors.userNeeds }"
        @blur="validate"
      ></textarea>
      <div v-if="errors.userNeeds" class="error-message">{{ errors.userNeeds }}</div>
      <div class="field-hint">What problems are you solving for your users?</div>
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
  questionId: 'q2-users-stakeholders',
});

const wizardStore = useWizardStore();

// State
const primaryUsers = ref(['']);
const secondaryUsers = ref(['']);
const stakeholders = ref(['']);
const userNeeds = ref('');

const errors = ref({
  primaryUsers: '',
  stakeholders: '',
  userNeeds: '',
});

// Computed
const hasErrors = computed(() =>
  Object.values(errors.value).some(error => error !== '')
);

const isValid = computed(() =>
  primaryUsers.value.filter(u => u.trim().length > 0).length >= 1 &&
  stakeholders.value.filter(s => s.trim().length > 0).length >= 1 &&
  userNeeds.value.trim().length >= 50 &&
  !hasErrors.value
);

// Methods
function addPrimaryUser() {
  primaryUsers.value.push('');
}

function removePrimaryUser(index: number) {
  if (primaryUsers.value.length > 1) {
    primaryUsers.value.splice(index, 1);
  }
}

function addSecondaryUser() {
  secondaryUsers.value.push('');
}

function removeSecondaryUser(index: number) {
  secondaryUsers.value.splice(index, 1);
}

function addStakeholder() {
  stakeholders.value.push('');
}

function removeStakeholder(index: number) {
  if (stakeholders.value.length > 1) {
    stakeholders.value.splice(index, 1);
  }
}

function validate(): boolean {
  errors.value = {
    primaryUsers: '',
    stakeholders: '',
    userNeeds: '',
  };

  // Validate primary users
  const validPrimaryUsers = primaryUsers.value.filter(u => u.trim().length > 0);
  if (validPrimaryUsers.length < 1) {
    errors.value.primaryUsers = 'Please provide at least one primary user';
  }

  // Validate stakeholders
  const validStakeholders = stakeholders.value.filter(s => s.trim().length > 0);
  if (validStakeholders.length < 1) {
    errors.value.stakeholders = 'Please provide at least one stakeholder';
  }

  // Validate user needs
  if (!userNeeds.value.trim()) {
    errors.value.userNeeds = 'User needs description is required';
  } else if (userNeeds.value.length < 50) {
    errors.value.userNeeds = 'Please provide a more detailed description (at least 50 characters)';
  }

  return !hasErrors.value;
}

// Watch for changes and update store
watch(
  () => ({
    primaryUsers: primaryUsers.value.filter(u => u.trim().length > 0),
    secondaryUsers: secondaryUsers.value.filter(u => u.trim().length > 0),
    stakeholders: stakeholders.value.filter(s => s.trim().length > 0),
    userNeeds: userNeeds.value,
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
    primaryUsers: string[];
    secondaryUsers: string[];
    stakeholders: string[];
    userNeeds: string;
  }>(props.questionId);

  if (existingAnswer) {
    primaryUsers.value = existingAnswer.primaryUsers?.length > 0 
      ? [...existingAnswer.primaryUsers] 
      : [''];
    secondaryUsers.value = existingAnswer.secondaryUsers?.length > 0 
      ? [...existingAnswer.secondaryUsers] 
      : [''];
    stakeholders.value = existingAnswer.stakeholders?.length > 0 
      ? [...existingAnswer.stakeholders] 
      : [''];
    userNeeds.value = existingAnswer.userNeeds || '';
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
