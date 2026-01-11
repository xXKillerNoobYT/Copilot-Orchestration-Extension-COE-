<template>
  <div class="wizard-container">
    <!-- Header with progress -->
    <div class="wizard-header">
      <div class="wizard-title">
        <h1>Interactive Plan Builder</h1>
        <p class="subtitle">Step {{ currentStep + 1 }} of {{ totalSteps }}</p>
      </div>
      <div class="progress-indicator">
        <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
        <span class="progress-text">{{ progressPercentage }}%</span>
      </div>
    </div>

    <!-- Main content area -->
    <div class="wizard-content">
      <transition name="fade" mode="out-in">
        <div :key="currentStep" class="step-content">
          <!-- Render the appropriate question component -->
          <component
            :is="getCurrentQuestionComponent()"
            :question-data="getCurrentQuestion()"
            :validation-errors="validationErrors"
            @answer-changed="handleAnswerChanged"
            @validation-error="handleValidationError"
          />
        </div>
      </transition>
    </div>

    <!-- Navigation footer -->
    <div class="wizard-footer">
      <button
        class="btn btn-secondary"
        :disabled="currentStep === 0"
        @click="goToPreviousStep"
      >
        ← Back
      </button>

      <div class="footer-info">
        <span v-if="autoSaveStatus" class="auto-save-indicator" :class="autoSaveStatus">
          {{ autoSaveStatus === 'saving' ? 'Saving...' : 'Saved' }}
        </span>
      </div>

      <div class="footer-actions">
        <button
          v-if="currentStep === totalSteps - 1"
          class="btn btn-primary"
          :disabled="!canSubmit || isSubmitting"
          @click="submitWizard"
        >
          {{ isSubmitting ? 'Submitting...' : 'Complete Plan' }}
        </button>
        <button
          v-else
          class="btn btn-primary"
          :disabled="!canProceedToNext"
          @click="goToNextStep"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- Keyboard shortcuts hint -->
    <div class="keyboard-shortcuts-hint">
      <small>Tip: Use <kbd>Tab</kbd> to navigate | <kbd>Ctrl+S</kbd> to save | <kbd>Ctrl+Z</kbd> to undo</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue';
import { useWizardStore } from './wizardStore';
import { PlanMetadataManager } from './planMetadata';

// Component imports (lazy loaded for performance)
const QuestionRenderer = defineAsyncComponent(() =>
  import('./QuestionRenderer.vue')
);

// Store and state
const wizardStore = useWizardStore();
const currentStep = ref(0);
const validationErrors = ref<Record<string, string[]>>({});
const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
const isSubmitting = ref(false);
const autoSaveTimer = ref<ReturnType<typeof setInterval> | null>(null);

// Question definitions (would typically come from config)
const questions = ref([
  {
    id: 'project-overview',
    title: 'Project Overview',
    description: 'Tell us about your project',
    type: 'project-overview',
  },
  {
    id: 'architecture',
    title: 'Architecture Pattern',
    description: 'Choose your architecture style',
    type: 'architecture',
  },
  {
    id: 'features',
    title: 'Feature Breakdown',
    description: 'Define your core features',
    type: 'features',
  },
  {
    id: 'timeline',
    title: 'Timeline Planning',
    description: 'Set your milestones and timeline',
    type: 'timeline',
  },
  {
    id: 'team',
    title: 'Team Structure',
    description: 'Define your team and roles',
    type: 'team',
  },
]);

// Computed properties
const totalSteps = computed(() => questions.value.length);

const progressPercentage = computed(() => {
  const completedSteps = wizardStore.answers.length;
  return Math.round((completedSteps / totalSteps.value) * 100);
});

const canProceedToNext = computed(() => {
  return !validationErrors.value[currentStep.value]?.length;
});

const canSubmit = computed(() => {
  // All questions must be answered and validated
  return wizardStore.answers.length === totalSteps.value &&
    Object.values(validationErrors.value).every(errors => !errors?.length);
});

// Methods
const getCurrentQuestion = () => {
  return questions.value[currentStep.value];
};

const getCurrentQuestionComponent = () => {
  // Return dynamic component based on question type
  // For MVP, use generic QuestionRenderer with config
  return 'QuestionRenderer';
};

const goToNextStep = async () => {
  if (currentStep.value < totalSteps.value - 1) {
    const isValid = await wizardStore.validateCurrentStep(currentStep.value);
    if (isValid) {
      currentStep.value++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
};

const goToPreviousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const handleAnswerChanged = (answer: any) => {
  wizardStore.setAnswer(currentStep.value, answer);
  // Clear validation error for this step
  if (validationErrors.value[currentStep.value]) {
    validationErrors.value[currentStep.value] = [];
  }
};

const handleValidationError = (errors: string[]) => {
  validationErrors.value[currentStep.value] = errors;
};

const submitWizard = async () => {
  isSubmitting.value = true;
  try {
    // Generate plan from answers
    const plan = await wizardStore.generatePlan();
    
    // Add metadata
    const planWithMetadata = PlanMetadataManager.addMetadata(plan);
    
    // Save to backend/storage
    await wizardStore.savePlan(planWithMetadata);
    
    // Emit event or redirect
    window.dispatchEvent(new CustomEvent('wizard-complete', { 
      detail: { plan: planWithMetadata } 
    }));
    
  } catch (error) {
    console.error('Failed to submit wizard:', error);
    // Show error message to user
  } finally {
    isSubmitting.value = false;
  }
};

const autoSave = async () => {
  autoSaveStatus.value = 'saving';
  try {
    await wizardStore.saveDraft();
    autoSaveStatus.value = 'saved';
    // Reset status after 2 seconds
    setTimeout(() => {
      if (autoSaveStatus.value === 'saved') {
        autoSaveStatus.value = 'idle';
      }
    }, 2000);
  } catch (error) {
    console.error('Auto-save failed:', error);
    autoSaveStatus.value = 'idle';
  }
};

const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  // Ctrl+S or Cmd+S - save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    autoSave();
  }
  
  // Ctrl+Z or Cmd+Z - undo
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault();
    wizardStore.undo();
  }
  
  // Tab - navigate between steps (with modifier)
  if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault();
    goToPreviousStep();
  }
};

// Lifecycle hooks
onMounted(() => {
  // Load draft if exists
  wizardStore.loadDraft();
  
  // Set up auto-save (every 30 seconds)
  autoSaveTimer.value = setInterval(() => {
    autoSave();
  }, 30000);
  
  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Route guard - warn before leaving if unsaved
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (wizardStore.isDrafted && !wizardStore.isSaved) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  // Clean up intervals and listeners
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value);
  }
  window.removeEventListener('keydown', handleKeyboardShortcuts);
  window.removeEventListener('beforeunload', () => {});
});

// Watch for route changes - guard against data loss
watch(() => currentStep.value, async () => {
  // Validate current step before moving
  const isValid = await wizardStore.validateCurrentStep(currentStep.value);
  if (!isValid) {
    // Revert to previous step
    currentStep.value--;
  }
});
</script>

<style scoped>
.wizard-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  overflow: hidden;
}

/* Header */
.wizard-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-sideBar-background);
}

.wizard-title {
  margin-bottom: 12px;
}

.wizard-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
}

.subtitle {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

/* Progress bar */
.progress-indicator {
  position: relative;
  height: 4px;
  background: var(--vscode-progressBar-background);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--vscode-progressBar-background);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 10px;
  right: 0;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

/* Content area */
.wizard-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
}

.step-content {
  max-width: 600px;
  margin: 0 auto;
}

/* Footer */
.wizard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--vscode-panel-border);
  background: var(--vscode-sideBar-background);
  gap: 12px;
}

.footer-info {
  flex: 1;
  text-align: center;
}

.auto-save-indicator {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.auto-save-indicator.saving {
  color: var(--vscode-terminal-ansiYellow);
  animation: pulse 1s infinite;
}

.auto-save-indicator.saved {
  color: var(--vscode-terminal-ansiGreen);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.footer-actions {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 2px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:not(:disabled):hover {
  background: var(--vscode-button-hoverBackground);
}

.btn-secondary {
  background: transparent;
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-button-border);
}

.btn-secondary:not(:disabled):hover {
  background: var(--vscode-button-hoverBackground);
}

/* Keyboard shortcuts hint */
.keyboard-shortcuts-hint {
  padding: 8px 24px;
  background: var(--vscode-editor-background);
  border-top: 1px solid var(--vscode-panel-border);
  text-align: center;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  background: var(--vscode-badge-background);
  border: 1px solid var(--vscode-badge-foreground);
  border-radius: 2px;
  font-family: monospace;
  font-size: 10px;
  color: var(--vscode-badge-foreground);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .wizard-content {
    padding: 16px 12px;
  }
  
  .wizard-footer {
    flex-wrap: wrap;
  }
  
  .btn {
    flex: 1;
    min-width: 80px;
  }
}
</style>
