<template>
  <div class="question-container feature-breakdown">
    <div class="question-header">
      <h2>Feature Breakdown</h2>
      <p class="question-hint">
        Define the core features of your project. Each feature becomes a task in the project plan. You can specify dependencies and priorities.
      </p>
    </div>

    <div class="features-toolbar">
      <button class="btn btn-primary" @click="addFeature">
        + Add Feature
      </button>
      <button class="btn btn-ai" @click="handleAiSuggestFeatures" :disabled="isLoadingAiSuggestions">
        {{ isLoadingAiSuggestions ? '⏳ Loading...' : '✨ AI Suggest Features' }}
      </button>
      <span class="feature-count">{{ features.length }} feature(s)</span>
    </div>

    <div v-if="featureErrors.length > 0" class="error-message">
      {{ featureErrors[0] }}
    </div>

    <div v-if="aiError" class="error-message">
      {{ aiError }}
    </div>

    <!-- AI Suggestions Panel -->
    <div v-if="aiSuggestions.length > 0" class="ai-suggestions-panel">
      <div class="panel-header">
        <h3>✨ AI Suggested Features</h3>
        <button class="btn btn-sm" @click="closeAiSuggestions">Close</button>
      </div>
      <div class="suggestions-list">
        <div
          v-for="(suggestion, index) in aiSuggestions"
          :key="`ai-suggestion-${index}`"
          class="suggestion-item"
        >
          <div class="suggestion-content">
            <h4>{{ suggestion.name }}</h4>
            <p>{{ suggestion.description }}</p>
            <div class="suggestion-meta">
              <span class="meta-tag">Priority: {{ suggestion.priority }}</span>
              <span v-if="suggestion.estimatedDays" class="meta-tag">
                Est: {{ suggestion.estimatedDays }} days
              </span>
            </div>
          </div>
          <button
            class="btn btn-primary btn-sm"
            @click="acceptAiSuggestion(suggestion)"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    <div v-if="features.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p>No features added yet. Click "Add Feature" to get started.</p>
    </div>

    <div v-else class="features-list">
      <div
        v-for="(feature, index) in features"
        :key="`feature-${index}`"
        class="feature-item"
      >
        <div class="feature-header">
          <span class="feature-number">#{{ index + 1 }}</span>
          <input
            v-model="feature.name"
            type="text"
            placeholder="Feature name"
            class="feature-name-input"
            @input="validateFeatures"
          />
          <button
            class="btn btn-danger btn-sm"
            @click="removeFeature(index)"
          >
            Remove
          </button>
        </div>

        <div class="feature-content">
          <div class="form-group">
            <label class="small-label">Description</label>
            <textarea
              v-model="feature.description"
              placeholder="What does this feature do?"
              rows="3"
              class="form-control small"
              @input="validateFeatures"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label class="small-label">Priority</label>
              <select
                v-model="feature.priority"
                class="form-control small"
                @change="validateFeatures"
              >
                <option value="">Select priority...</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            <div class="form-group half">
              <label class="small-label">Dependencies</label>
              <select
                v-model.number="feature.dependsOn"
                class="form-control small"
              >
                <option :value="null">No dependency</option>
                <option
                  v-for="(f, idx) in features"
                  v-show="idx !== index"
                  :key="`dep-${idx}`"
                  :value="idx"
                >
                  Feature #{{ idx + 1 }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="feature.error" class="feature-error">
          {{ feature.error }}
        </div>
      </div>
    </div>

    <div v-if="features.length > 0" class="dependency-graph">
      <h3>Dependency Map</h3>
      <div class="graph-visual">
        <div v-if="circularDependency" class="circular-warning">
          ⚠️ Circular dependency detected! Please check dependencies.
        </div>
        <div v-else class="dependency-list">
          <div
            v-for="(feature, idx) in features"
            :key="`dep-map-${idx}`"
            class="dep-item"
          >
            <span class="dep-feature">Feature #{{ idx + 1 }}: {{ feature.name || '(unnamed)' }}</span>
            <span v-if="feature.dependsOn !== null && feature.dependsOn !== undefined" class="dep-arrow">
              → depends on → Feature #{{ feature.dependsOn + 1 }}: {{ features[feature.dependsOn]?.name }}
            </span>
            <span v-else class="no-dep">No dependencies</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isValid" class="validation-summary error">
      ⚠️ Please ensure at least {{ MIN_FEATURES }} feature(s) with names and priorities are defined.
    </div>

    <div v-if="isValid && !circularDependency" class="validation-summary success">
      ✓ {{ features.length }} feature(s) defined and validated
    </div>

    <!-- AI-Assisted Follow-up Questions -->
    <DynamicFollowUpQuestions
      v-if="isValid && !circularDependency && features.length >= MIN_FEATURES"
      :questions="followUpQuestions"
      :existing-answers="followUpAnswers"
      :show-ai-loader="isLoadingFollowUps"
      header-text="🤖 Feature Planning Insights"
      hint-text="Help us understand your feature priorities and complexity."
      @answers-changed="handleFollowUpAnswers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWizardStore } from '../wizardStore';
import DynamicFollowUpQuestions from '../components/DynamicFollowUpQuestions.vue';
import type { FollowUpQuestion } from '../components/DynamicFollowUpQuestions.vue';
import { PlanContextService } from '../services/PlanContextService';
import { getAiWizardAssistant } from '../services/aiWizardAssistant';
import type { FeatureSuggestion } from '../prompts/featureBreakdown';

interface Feature {
  name: string;
  description: string;
  priority: string;
  dependsOn: number | null;
  error: string;
}

// Props
interface Props {
  questionId?: string;
}

const MIN_FEATURES = 3;

const props = withDefaults(defineProps<Props>(), {
  questionId: 'q3-features',
});

// Store
const wizardStore = useWizardStore();
const planContextService = PlanContextService.getInstance();
const aiAssistant = getAiWizardAssistant();

// State
const features = ref<Feature[]>([
  { name: '', description: '', priority: '', dependsOn: null, error: '' },
]);
const featureErrors = ref<string[]>([]);
const followUpQuestions = ref<FollowUpQuestion[]>([]);
const followUpAnswers = ref<Record<string, unknown>>({});
const isLoadingFollowUps = ref(false);

// AI State
const isLoadingAiSuggestions = ref(false);
const aiSuggestions = ref<FeatureSuggestion[]>([]);
const aiError = ref('');

// Computed
const circularDependency = computed(() => {
  return features.value.some((_, idx) => hasCircularDependency(idx));
});

const isValid = computed(() => {
  if (features.value.length < MIN_FEATURES) return false;
  if (circularDependency.value) return false;
  return features.value.every(f => f.name.trim().length > 0 && f.priority);
});

// Methods
function addFeature(): void {
  features.value.push({
    name: '',
    description: '',
    priority: '',
    dependsOn: null,
    error: '',
  });
}

function removeFeature(index: number): void {
  if (features.value.length > 1) {
    features.value.splice(index, 1);
    // Update dependency references
    features.value.forEach(f => {
      if (f.dependsOn !== null && f.dependsOn > index) {
        f.dependsOn--;
      } else if (f.dependsOn === index) {
        f.dependsOn = null;
      }
    });
    validateFeatures();
  }
}

function hasCircularDependency(idx: number, visited = new Set<number>()): boolean {
  if (visited.has(idx)) return true;
  visited.add(idx);

  const feature = features.value[idx];
  if (feature.dependsOn !== null && feature.dependsOn !== undefined) {
    return hasCircularDependency(feature.dependsOn, new Set(visited));
  }

  return false;
}

function validateFeatures(): void {
  featureErrors.value = [];

  // Check minimum features
  if (features.value.length < MIN_FEATURES) {
    featureErrors.value.push(`At least ${MIN_FEATURES} features are required`);
  }

  // Check each feature
  features.value.forEach((feature, idx) => {
    feature.error = '';

    if (!feature.name.trim()) {
      feature.error = 'Feature name is required';
    } else if (feature.name.length > 100) {
      feature.error = 'Feature name must not exceed 100 characters';
    }

    if (!feature.priority) {
      feature.error = 'Priority must be selected';
    }

    if (hasCircularDependency(idx)) {
      feature.error = 'Circular dependency detected';
    }
  });

  updateStore();
}

function updateStore(): void {
  if (isValid.value) {
    wizardStore.setAnswer(props.questionId, {
      features: features.value.map(f => ({
        name: f.name,
        description: f.description,
        priority: f.priority,
        dependsOn: f.dependsOn,
      })),
      followUpAnswers: followUpAnswers.value,
    });
  }
}

// Generate follow-up questions based on features
async function generateFollowUpQuestions(): Promise<void> {
  if (features.value.length < MIN_FEATURES) return;

  isLoadingFollowUps.value = true;

  try {
    const questions: FollowUpQuestion[] = [];

    // If many features, suggest phasing
    if (features.value.length > 5) {
      questions.push({
        id: 'feature-phases',
        text: 'Would you like to phase these features into multiple releases?',
        type: 'radio',
        options: [
          { value: 'single', label: 'No, deliver all at once' },
          { value: 'phases', label: 'Yes, split into phases/versions' },
          { value: 'mvp', label: 'Start with MVP, then iterate' },
        ],
      });
    }

    // Critical path analysis
    questions.push({
      id: 'critical-path',
      text: 'Which features are absolutely critical for launch?',
      type: 'textarea',
      placeholder: 'List the must-have features for your minimum viable product...',
      rows: 3,
      hint: 'These will be prioritized and scheduled first.',
    });

    // Technical complexity
    questions.push({
      id: 'complex-features',
      text: 'Which features are technically most complex?',
      type: 'textarea',
      placeholder: 'Identify features that need extra time or specialized skills...',
      rows: 3,
    });

    // User impact
    questions.push({
      id: 'user-impact',
      text: 'Which features will have the highest user impact?',
      type: 'textarea',
      placeholder: 'Features that users will notice and value most...',
      rows: 2,
    });

    followUpQuestions.value = questions;
  } catch (error) {
    console.error('[Features] Error generating follow-up questions:', error);
  } finally {
    isLoadingFollowUps.value = false;
  }
}

// Handle follow-up answers
function handleFollowUpAnswers(answers: Record<string, unknown>): void {
  followUpAnswers.value = answers;
  updateStore();
}

// AI Suggestion Handlers
async function handleAiSuggestFeatures(): Promise<void> {
  isLoadingAiSuggestions.value = true;
  aiError.value = '';
  aiSuggestions.value = [];

  try {
    // Build context from wizard state
    const projectOverview = wizardStore.getAnswer<{ name?: string; description?: string }>('q1-overview') || {};
    const context = {
      projectName: projectOverview.name || 'Unnamed Project',
      projectDescription: projectOverview.description || '',
      existingFeatures: features.value.map(f => ({ name: f.name, description: f.description })),
    };

    const suggestions = await aiAssistant.suggestFeatures(context);
    
    if (suggestions.length === 0) {
      aiError.value = 'AI could not generate suggestions. Please try again or add features manually.';
    } else {
      aiSuggestions.value = suggestions;
    }
  } catch (error) {
    console.error('[Features] AI suggestion error:', error);
    aiError.value = 'Failed to get AI suggestions. Please try again later.';
  } finally {
    isLoadingAiSuggestions.value = false;
  }
}

function acceptAiSuggestion(suggestion: FeatureSuggestion): void {
  features.value.push({
    name: suggestion.name,
    description: suggestion.description,
    priority: suggestion.priority || 'medium',
    dependsOn: null,
    error: '',
  });
  
  // Track acceptance
  aiAssistant.trackAcceptance('suggest-features', true);
  
  // Remove accepted suggestion from list
  aiSuggestions.value = aiSuggestions.value.filter(s => s.name !== suggestion.name);
  
  validateFeatures();
}

function closeAiSuggestions(): void {
  // Track rejection for any remaining suggestions
  aiSuggestions.value.forEach(() => {
    aiAssistant.trackAcceptance('suggest-features', false);
  });
  
  aiSuggestions.value = [];
}

// Load existing answer from store
onMounted(() => {
  const existingAnswer = wizardStore.getAnswer<{
    features: Array<{ name: string; description: string; priority: string; dependsOn?: number | null }>;
    followUpAnswers?: Record<string, unknown>;
  }>(props.questionId);

  if (existingAnswer && existingAnswer.features) {
    features.value = existingAnswer.features.map(f => ({
      ...f,
      dependsOn: f.dependsOn ?? null,
      error: '',
    }));
    followUpAnswers.value = existingAnswer.followUpAnswers || {};
    
    if (existingAnswer.features.length >= MIN_FEATURES) {
      generateFollowUpQuestions();
    }
  }

  validateFeatures();
});

// Expose validation
defineExpose({
  validate: () => isValid.value && !circularDependency.value,
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

.features-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--vscode-input-background);
  border-radius: 6px;
  gap: 1rem;
}

.feature-count {
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

.btn-ai {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
}

.btn-ai:hover:not(:disabled) {
  background: var(--vscode-button-secondaryHoverBackground);
}

.btn-ai:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.features-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.feature-item {
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  padding: 1rem;
  background: var(--vscode-input-background);
}

.feature-header {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1rem;
  align-items: center;
}

.feature-number {
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  min-width: 40px;
}

.feature-name-input {
  flex: 1;
  padding: 0.4rem;
  font-size: 0.95rem;
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 3px;
  font-weight: 500;
}

.feature-name-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.feature-content {
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

.feature-error {
  color: var(--vscode-errorForeground);
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.dependency-graph {
  padding: 1rem;
  background: var(--vscode-input-background);
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.dependency-graph h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--vscode-foreground);
}

.graph-visual {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  padding: 1rem;
}

.circular-warning {
  color: var(--vscode-errorForeground);
  background: var(--vscode-inputValidation-errorBackground);
  padding: 0.8rem;
  border-radius: 3px;
  border: 1px solid var(--vscode-inputValidation-errorBorder);
}

.dependency-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.dep-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 0.85rem;
  color: var(--vscode-foreground);
}

.dep-feature {
  font-weight: 500;
  color: var(--vscode-focusBorder);
}

.dep-arrow {
  color: var(--vscode-descriptionForeground);
  margin: 0 0.4rem;
}

.no-dep {
  color: var(--vscode-descriptionForeground);
  font-style: italic;
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
  .features-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .feature-header {
    flex-wrap: wrap;
  }

  .question-container {
    padding: 1rem;
  }
}

.ai-suggestions-panel {
  background: var(--vscode-editor-background);
  border: 2px solid var(--vscode-focusBorder);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--vscode-input-border);
}

.panel-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--vscode-foreground);
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.suggestion-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  align-items: flex-start;
}

.suggestion-content {
  flex: 1;
}

.suggestion-content h4 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.4rem 0;
  color: var(--vscode-foreground);
}

.suggestion-content p {
  font-size: 0.85rem;
  margin: 0 0 0.6rem 0;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.suggestion-meta {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 0.75rem;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
}
</style>
