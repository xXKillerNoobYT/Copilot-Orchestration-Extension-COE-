<template>
  <div class="question-container timeline-question">
    <div class="question-header">
      <h2>Timeline Planning</h2>
      <p class="question-hint">
        Define key milestones and deadlines for your project. At least 2 milestones are required. Milestones will be used to create the project schedule.
      </p>
    </div>

    <div class="timeline-toolbar">
      <button class="btn btn-primary" @click="addMilestone">
        + Add Milestone
      </button>
      <span class="milestone-count">{{ milestones.length }} milestone(s)</span>
    </div>

    <div v-if="timelineErrors.length > 0" class="error-message">
      {{ timelineErrors[0] }}
    </div>

    <div v-if="milestones.length === 0" class="empty-state">
      <div class="empty-icon">📅</div>
      <p>No milestones added yet. Click "Add Milestone" to get started.</p>
    </div>

    <div v-else class="milestones-list">
      <div
        v-for="(milestone, index) in milestones"
        :key="`milestone-${index}`"
        class="milestone-item"
      >
        <div class="milestone-header">
          <span class="milestone-number">{{ getMilestoneLabel(index) }}</span>
          <input
            v-model="milestone.name"
            type="text"
            placeholder="Milestone name"
            class="milestone-name-input"
            @input="validateTimeline"
          />
          <button
            class="btn btn-danger btn-sm"
            @click="removeMilestone(index)"
          >
            Remove
          </button>
        </div>

        <div class="milestone-content">
          <div class="form-row">
            <div class="form-group half">
              <label class="small-label required">Target Date</label>
              <input
                v-model="milestone.date"
                type="date"
                :min="getMinDate()"
                class="form-control small"
                @input="validateTimeline"
              />
              <small v-if="milestone.dateError" class="error">{{ milestone.dateError }}</small>
            </div>

            <div class="form-group half">
              <label class="small-label required">Phase</label>
              <select
                v-model="milestone.phase"
                class="form-control small"
                @change="validateTimeline"
              >
                <option value="">Select phase...</option>
                <option v-for="phase in phases" :key="phase.value" :value="phase.value">
                  {{ phase.emoji }} {{ phase.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="small-label">Dependencies</label>
            <select
              v-model.number="milestone.dependsOn"
              class="form-control small"
            >
              <option :value="null">No dependency</option>
              <option
                v-for="(m, idx) in milestones"
                v-show="idx !== index"
                :key="`dep-${idx}`"
                :value="idx"
              >
                {{ getMilestoneLabel(idx) }}: {{ m.name || '(unnamed)' }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="milestone.error" class="milestone-error">
          {{ milestone.error }}
        </div>
      </div>
    </div>

    <div v-if="milestones.length > 0" class="timeline-preview">
      <h3>Timeline Preview</h3>
      <div class="timeline-visual">
        <div v-if="timelineDateError" class="warning">
          ⚠️ {{ timelineDateError }}
        </div>
        <div v-else class="timeline-bar">
          <div
            v-for="(milestone, index) in milestones"
            :key="`timeline-${index}`"
            class="timeline-item"
            :style="getTimelinePosition(milestone)"
          >
            <div class="timeline-dot" :style="{ backgroundColor: getPhaseColor(milestone.phase) }"></div>
            <div class="timeline-label">
              <strong>{{ milestone.name || `Milestone ${index + 1}` }}</strong>
              <small>{{ formatDate(milestone.date) }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isValid" class="validation-summary error">
      ⚠️ Please ensure at least 2 milestone(s) with dates and phases are defined.
    </div>

    <div v-if="isValid && !timelineDateError" class="validation-summary success">
      ✓ Timeline with {{ milestones.length }} milestone(s) is valid
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWizardStore } from '../wizardStore';

interface Milestone {
  name: string;
  date: string;
  phase: string;
  dependsOn: number | null;
  error: string;
  dateError: string;
}

interface Props {
  questionId?: string;
}

const MIN_MILESTONES = 2;

const props = withDefaults(defineProps<Props>(), {
  questionId: 'q4-timeline',
});

// Store
const wizardStore = useWizardStore();

// State
const milestones = ref<Milestone[]>([
  { name: '', date: '', phase: '', dependsOn: null, error: '', dateError: '' },
]);
const timelineErrors = ref<string[]>([]);

// Phase definitions
const phases = [
  { value: 'planning', label: 'Planning', emoji: '📋' },
  { value: 'design', label: 'Design', emoji: '🎨' },
  { value: 'development', label: 'Development', emoji: '💻' },
  { value: 'testing', label: 'Testing', emoji: '✅' },
  { value: 'deployment', label: 'Deployment', emoji: '🚀' },
];

// Computed
const timelineDateError = computed(() => {
  const dates = milestones.value
    .filter(m => m.date)
    .map(m => new Date(m.date).getTime());

  if (dates.length !== new Set(dates).size) {
    return 'Milestone dates must be unique';
  }

  if (!isDateOrdered()) {
    return 'Milestones should be in chronological order';
  }

  return '';
});

const isValid = computed(() => {
  if (milestones.value.length < MIN_MILESTONES) return false;
  if (timelineDateError.value) return false;
  return milestones.value.every(m => m.name.trim().length > 0 && m.date && m.phase);
});

// Methods
function addMilestone(): void {
  milestones.value.push({
    name: '',
    date: '',
    phase: '',
    dependsOn: null,
    error: '',
    dateError: '',
  });
}

function removeMilestone(index: number): void {
  if (milestones.value.length > 1) {
    milestones.value.splice(index, 1);
    // Update dependency references
    milestones.value.forEach(m => {
      if (m.dependsOn !== null && m.dependsOn > index) {
        m.dependsOn--;
      } else if (m.dependsOn === index) {
        m.dependsOn = null;
      }
    });
    validateTimeline();
  }
}

function getMinDate(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
}

function isDateOrdered(): boolean {
  const dates = milestones.value
    .filter(m => m.date)
    .map(m => new Date(m.date).getTime());

  for (let i = 1; i < dates.length; i++) {
    if (dates[i] < dates[i - 1]) {
      return false;
    }
  }
  return true;
}

function getMilestoneLabel(index: number): string {
  const icons = ['🎯', '🎖️', '🏁', '🎊'];
  return `${icons[index % icons.length]} M${index + 1}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPhaseColor(phase: string): string {
  const colors: Record<string, string> = {
    planning: '#4A90E2',
    design: '#7B68EE',
    development: '#50C878',
    testing: '#FFD700',
    deployment: '#FF6B6B',
  };
  return colors[phase] || '#888888';
}

function getTimelinePosition(milestone: Milestone): Record<string, string> {
  if (!milestone.date) return {};

  const allDates = milestones.value.filter(m => m.date).map(m => new Date(m.date).getTime());
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const range = maxDate - minDate || 1;
  const milestoneDate = new Date(milestone.date).getTime();
  const position = ((milestoneDate - minDate) / range) * 100;

  return {
    left: `${Math.max(0, Math.min(100, position))}%`,
  };
}

function validateTimeline(): void {
  timelineErrors.value = [];

  // Check minimum milestones
  if (milestones.value.length < MIN_MILESTONES) {
    timelineErrors.value.push(`At least ${MIN_MILESTONES} milestones are required`);
  }

  // Check each milestone
  milestones.value.forEach(milestone => {
    milestone.error = '';
    milestone.dateError = '';

    if (!milestone.name.trim()) {
      milestone.error = 'Milestone name is required';
    } else if (milestone.name.length > 100) {
      milestone.error = 'Milestone name must not exceed 100 characters';
    }

    if (!milestone.date) {
      milestone.dateError = 'Date is required';
    } else if (new Date(milestone.date) < new Date()) {
      milestone.dateError = 'Date must be in the future';
    }

    if (!milestone.phase) {
      milestone.error = 'Phase must be selected';
    }
  });

  updateStore();
}

function updateStore(): void {
  if (isValid.value) {
    wizardStore.setAnswer(props.questionId, {
      milestones: milestones.value.map(m => ({
        name: m.name,
        date: m.date,
        phase: m.phase,
        dependsOn: m.dependsOn,
      })),
    });
  }
}

// Load existing answer from store
onMounted(() => {
  const existingAnswer = wizardStore.getAnswer<{
    milestones: Array<{ name: string; date: string; phase: string; dependsOn?: number | null }>;
  }>(props.questionId);

  if (existingAnswer && existingAnswer.milestones) {
    milestones.value = existingAnswer.milestones.map(m => ({
      ...m,
      dependsOn: m.dependsOn ?? null,
      error: '',
      dateError: '',
    }));
  }

  validateTimeline();
});

// Expose validation
defineExpose({
  validate: () => isValid.value && !timelineDateError.value,
  isValid,
});
</script>

<style scoped>
.question-container {
  max-width: 900px;
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

.timeline-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--vscode-input-background);
  border-radius: 6px;
  gap: 1rem;
}

.milestone-count {
  color: var(--vscode-descriptionForeground);
  font-size: 0.9rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover {
  background: var(--vscode-button-hoverBackground);
}

.btn-danger {
  background: var(--vscode-inputValidation-errorBorder);
  color: white;
}

.btn-danger:hover {
  opacity: 0.8;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.error-message {
  color: var(--vscode-errorForeground);
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  padding: 0.8rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--vscode-descriptionForeground);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.milestones-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.milestone-item {
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  padding: 1rem;
  background: var(--vscode-input-background);
}

.milestone-header {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1rem;
  align-items: center;
}

.milestone-number {
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  min-width: 40px;
}

.milestone-name-input {
  flex: 1;
  padding: 0.4rem;
  font-size: 0.95rem;
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 3px;
  font-weight: 500;
}

.milestone-name-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.milestone-content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group.half {
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.small-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vscode-foreground);
}

.small-label.required::after {
  content: ' *';
  color: var(--vscode-errorForeground);
}

.form-control {
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

.form-control.small {
  font-size: 0.8rem;
  padding: 0.4rem;
}

.milestone-error {
  color: var(--vscode-errorForeground);
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.error {
  color: var(--vscode-errorForeground);
  font-size: 0.75rem;
  margin-top: 0.2rem;
}

.timeline-preview {
  padding: 1rem;
  background: var(--vscode-input-background);
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.timeline-preview h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--vscode-foreground);
}

.timeline-visual {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  padding: 2rem 1rem;
  position: relative;
  min-height: 120px;
}

.warning {
  color: var(--vscode-inputValidation-warningForeground);
  background: var(--vscode-inputValidation-warningBackground);
  padding: 0.8rem;
  border-radius: 3px;
  border: 1px solid var(--vscode-inputValidation-warningBorder);
  text-align: center;
}

.timeline-bar {
  position: relative;
  height: 80px;
  margin-top: 1rem;
}

.timeline-bar::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--vscode-input-border);
}

.timeline-item {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  top: 0;
  transform: translateX(-50%);
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--vscode-editor-background);
  margin-bottom: 0.5rem;
  position: relative;
  z-index: 1;
}

.timeline-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  padding: 0.3rem 0.5rem;
  border-radius: 3px;
  margin-top: 30px;
  min-width: 80px;
  text-align: center;
}

.timeline-label strong {
  font-weight: 600;
}

.timeline-label small {
  color: var(--vscode-descriptionForeground);
}

.validation-summary {
  padding: 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-top: 1rem;
  text-align: center;
}

.validation-summary.error {
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  color: var(--vscode-errorForeground);
}

.validation-summary.success {
  background: var(--vscode-testing-iconPassed);
  opacity: 0.15;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-testing-iconPassed);
}

@media (max-width: 768px) {
  .timeline-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .milestone-header {
    flex-wrap: wrap;
  }

  .question-container {
    padding: 1rem;
  }
}
</style>
