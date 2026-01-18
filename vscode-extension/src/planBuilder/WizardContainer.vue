<template>
  <div class="wizard-container" :class="{ 'with-assistant': showAssistant, 'with-preview': showPreview }">
    <!-- Template Selector Modal -->
    <TemplateSelector
      v-if="showTemplateSelector"
      :extension-path="extensionPath"
      @template-selected="handleTemplateSelected"
      @cancel="showTemplateSelector = false"
    />

    <!-- Header with progress -->
    <div class="wizard-header">
      <div class="wizard-title">
        <h1>Interactive Plan Builder</h1>
        <p class="subtitle">
          Step {{ currentStep + 1 }} of {{ totalSteps }}
          <span v-if="appliedTemplateId" class="template-badge">
            ✨ Template Applied
          </span>
        </p>
      </div>
      <div class="header-actions">
        <button 
          v-if="currentStep === 0 && !appliedTemplateId"
          class="template-btn"
          @click="showTemplateSelector = true"
          title="Start from a template"
        >
          📋 Use Template
        </button>
        <button 
          class="toggle-preview-btn"
          @click="togglePreview"
          :title="showPreview ? 'Hide Live Preview' : 'Show Live Preview'"
        >
          👁️ Preview {{ showPreview ? 'ON' : 'OFF' }}
        </button>
        <button 
          class="toggle-assistant-btn"
          @click="toggleAssistant"
          :title="showAssistant ? 'Hide AI Assistant' : 'Show AI Assistant'"
        >
          💡 AI {{ showAssistant ? 'ON' : 'OFF' }}
        </button>
      </div>
      <div class="progress-indicator">
        <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
        <span class="progress-text">{{ progressPercentage }}%</span>
      </div>
    </div>

    <!-- Main content area with optional side panel -->
    <div class="wizard-content">
      <transition name="fade" mode="out-in">
        <div :key="currentStep" class="step-content">
          <!-- Render the appropriate question component -->
          <component
            :is="getCurrentQuestionComponent()"
            :question-data="getCurrentQuestion()"
            :validation-errors="validationErrors"
            :current-answers="wizardStore.answers"
            :show-ai-assistance="showAssistant"
            @answer-changed="handleAnswerChanged"
            @validation-error="handleValidationError"
            @ask-ai="handleAskAI"
          />
        </div>
      </transition>

      <!-- Live Preview Side Panel -->
      <PreviewContainer
        v-if="showPreview"
        :wizard-state="wizardState"
        :auto-refresh="true"
        :show-feedback="true"
        :max-render-time-ms="500"
        @render-complete="handlePreviewRenderComplete"
        @render-error="handlePreviewRenderError"
      />

      <!-- AI Assistant Side Panel -->
      <ContextualAssistant
        v-if="showAssistant"
        :visible="showAssistant"
        :suggestions="aiSuggestions"
        :loading="aiLoading"
        :error="aiError"
        :acceptance-rate="aiAcceptanceRate"
        :suggestion-count="aiSuggestionCount"
        @close="showAssistant = false"
        @accept="handleSuggestionAccepted"
        @reject="handleSuggestionRejected"
        @retry="refreshAiSuggestions"
        @apply="handleSuggestionApplied"
      />
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
import { AiAssistanceService, type AiSuggestion } from './aiAssistanceService';
import ContextualAssistant from './ContextualAssistant.vue';
import PreviewContainer from '../components/preview/PreviewContainer.vue';
import TemplateSelector from './components/TemplateSelector.vue';
import { getTemplateService } from './services/TemplateService';
import type { WizardState, PreviewRenderResult } from '../components/preview/PreviewEngine';

// Props
interface Props {
  extensionPath: string;
}

const props = withDefaults(defineProps<Props>(), {
  extensionPath: ''
});

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

// Template state
const showTemplateSelector = ref(false);
const appliedTemplateId = ref<string | undefined>(undefined);

// AI Assistant state
const showAssistant = ref(false);
const aiLoading = ref(false);
const aiError = ref<string | null>(null);
const aiSuggestions = ref<AiSuggestion[]>([]);
const aiService = new AiAssistanceService({ debounceMs: 1000, enableLogging: true });
const aiAcceptanceRate = computed(() => aiService.getAcceptanceRate());
const aiSuggestionCount = computed(() => aiService.getSuggestionHistory().length);

// Live Preview state
const showPreview = ref(true); // Default to ON for live preview
const previewRenderTime = ref<number>(0);
const previewErrors = ref<string[]>([]);

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
  const totalPages = wizardStore.allPages.length;
  const currentIndex = wizardStore.currentPageIndex;
  return Math.round(((currentIndex + 1) / totalPages) * 100);
});

// Convert wizard store state to WizardState format for PreviewContainer
const wizardState = computed<WizardState>(() => ({
  currentStep: currentStep.value,
  answers: wizardStore.answers,
  validationErrors: validationErrors.value,
  isComplete: currentStep.value === totalSteps.value - 1
}));

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

const goToNextStep = () => {
  if (wizardStore.navigateNext()) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const goToPreviousStep = () => {
  if (wizardStore.navigatePrevious()) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const handleAnswerChanged = (answer: any) => {
  const question = getCurrentQuestion();
  if (question) {
    wizardStore.setAnswer(question.id, answer);
    // Clear validation error for this step
    if (validationErrors.value[question.id]) {
      validationErrors.value[question.id] = [];
    }
    
    // Trigger AI assistance if enabled
    if (showAssistant.value) {
      generateAiSuggestions();
    }
  }
};

// AI Assistant methods
const toggleAssistant = () => {
  showAssistant.value = !showAssistant.value;
  
  // Generate suggestions when first opened
  if (showAssistant.value && aiSuggestions.value.length === 0) {
    generateAiSuggestions();
  }
};

// Live Preview methods
const togglePreview = () => {
  showPreview.value = !showPreview.value;
};

const handlePreviewRenderComplete = (result: PreviewRenderResult) => {
  previewRenderTime.value = result.renderTimeMs;
  
  // Log performance metrics
  if (result.renderTimeMs > 500) {
    console.warn(`[WizardContainer] Preview render time exceeded 500ms: ${result.renderTimeMs}ms`);
  }
  
  // Check for warnings
  if (result.warnings.length > 0) {
    console.warn('[WizardContainer] Preview warnings:', result.warnings);
  }
};

const handlePreviewRenderError = (error: Error) => {
  console.error('[WizardContainer] Preview render error:', error);
  previewErrors.value.push(error.message);
};

const generateAiSuggestions = () => {
  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) return;
  
  // Get current wizard state
  const currentAnswers = wizardStore.container.getAllAnswers();
  const userRole = wizardStore.container['userRole'] || 'analyst';
  
  aiLoading.value = true;
  aiError.value = null;
  
  // Convert currentQuestion to WizardPage format
  const wizardPage = {
    id: currentQuestion.id,
    title: currentQuestion.title,
    description: currentQuestion.description,
    questions: [] // Empty array since we're working with simplified question structure
  };
  
  // Use debounced generation with error handling
  aiService.debouncedGenerateSuggestions(
    wizardPage,
    currentAnswers,
    userRole,
    (suggestions) => {
      aiSuggestions.value = suggestions;
      aiLoading.value = false;
      
      // Note: Empty suggestions are valid - not necessarily an error
      // Only show error if we have an actual error state
    }
  );
};

const refreshAiSuggestions = () => {
  generateAiSuggestions();
};

const handleSuggestionAccepted = (suggestion: AiSuggestion) => {
  // Log the acceptance
  aiService.acceptSuggestion(suggestion.id, suggestion.question);
  
  // Could auto-populate or show a prompt to help user answer
  console.log('[Wizard] Suggestion accepted:', suggestion);
  
  // Optional: show notification or auto-fill helper
};

const handleSuggestionRejected = (id: string) => {
  console.log('[Wizard] Suggestion rejected:', id);
};

/**
 * Handle "Ask AI" request from question component
 */
const handleAskAI = (questionId: string) => {
  // Ensure assistant is visible
  if (!showAssistant.value) {
    showAssistant.value = true;
  }
  
  // Generate suggestions for the current question
  generateAiSuggestions();
  
  console.log('[Wizard] AI assistance requested for:', questionId);
};

/**
 * Handle suggestion applied to answer field
 */
const handleSuggestionApplied = (suggestion: AiSuggestion) => {
  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) return;
  
  // Apply the suggested answer to the current question
  if (suggestion.suggestedAnswer) {
    wizardStore.setAnswer(currentQuestion.id, suggestion.suggestedAnswer);
    console.log('[Wizard] Suggestion applied:', suggestion);
  }
};

// Template handling
const handleTemplateSelected = async (templateId: string) => {
  try {
    const templateService = getTemplateService(props.extensionPath);
    
    // Load and apply template
    const template = await templateService.loadTemplate(templateId);
    const plan = await templateService.applyTemplate(templateId, {
      preserveMetadata: true
    });
    
    // Convert plan to wizard answers format
    const templateAnswers: Record<string, unknown> = {};
    
    // Map plan.project to Q1 (project-overview)
    if (plan.project) {
      templateAnswers['project-overview'] = {
        name: plan.project.name,
        description: plan.project.description,
        type: plan.project.type
      };
    }
    
    // Map plan.architecture to Q2
    if (plan.architecture) {
      templateAnswers['architecture'] = {
        pattern: plan.architecture.pattern,
        notes: plan.architecture.description || plan.architecture.rationale
      };
    }
    
    // Map plan.features to Q3
    if (plan.features && plan.features.length > 0) {
      templateAnswers['features'] = {
        features: plan.features.map((f: any) => ({
          name: f.name,
          description: f.description,
          priority: f.priority,
          dependsOn: null // TODO: Map dependencies
        }))
      };
    }
    
    // Map plan.timeline to Q4
    if (plan.timeline && plan.timeline.milestones) {
      templateAnswers['timeline'] = {
        milestones: plan.timeline.milestones.map((m: any) => ({
          name: m.name,
          date: m.target_date,
          phase: m.phase,
          dependsOn: null
        }))
      };
    }
    
    // Map plan.team to Q5
    if (plan.team && plan.team.roles) {
      templateAnswers['team'] = {
        teamMembers: plan.team.roles.map((r: any) => ({
          role: r.role_name,
          skills: r.skills || [],
          agentMapping: r.agent_mapping || null,
          availability: r.availability || 'full-time'
        }))
      };
    }
    
    // Apply to wizard state if wizardStore has state manager
    if (wizardStore.state && typeof wizardStore.state.applyTemplate === 'function') {
      wizardStore.state.applyTemplate(templateId, templateAnswers);
    }
    
    // Set answers in store
    Object.entries(templateAnswers).forEach(([key, value]) => {
      wizardStore.setAnswer(key, value);
    });
    
    // Update UI
    appliedTemplateId.value = templateId;
    showTemplateSelector.value = false;
    
    console.log('[Wizard] Template applied:', templateId, templateAnswers);
  } catch (error) {
    console.error('[Wizard] Failed to apply template:', error);
    // TODO: Show error to user
  }
};

const handleValidationError = (errors: string[]) => {
  validationErrors.value[currentStep.value] = errors;
};

const submitWizard = async () => {
  isSubmitting.value = true;
  try {
    // Complete the wizard and get the plan
    const plan = await wizardStore.completeWizard();
    
    // Add metadata
    const planWithMetadata = PlanMetadataManager.addMetadata(plan);
    
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

const autoSave = () => {
  // Store the current state automatically
  autoSaveStatus.value = 'saving';
  try {
    // Answers are automatically synced to the store via watch
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
  
  // Ctrl+Z or Cmd+Z - undo (not yet implemented)
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault();
    // TODO: Implement undo functionality
  }
  
  // Tab - navigate between steps (with modifier)
  if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault();
    goToPreviousStep();
  }
};

// Lifecycle hooks
onMounted(() => {
  // Set up auto-save (every 30 seconds)
  autoSaveTimer.value = setInterval(() => {
    autoSave();
  }, 30000);
  
  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Route guard - warn before leaving if unsaved
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    // Check if there are unsaved answers
    if (Object.keys(wizardStore.answers).length > 0) {
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
  
  // Clean up AI service
  aiService.dispose();
});

// Sync currentStep with store
watch(() => wizardStore.currentPageIndex, () => {
  currentStep.value = wizardStore.currentPageIndex;
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-sideBar-background);
}

.wizard-title {
  flex: 1;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-preview-btn,
.toggle-assistant-btn {
  padding: 6px 12px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s;
}

.toggle-preview-btn:hover,
.toggle-assistant-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.wizard-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
}

.wizard-title .subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.template-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.template-btn {
  padding: 6px 12px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s;
}

.template-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
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
  display: flex;
  gap: 0;
}

.wizard-container.with-assistant .wizard-content {
  display: grid;
  grid-template-columns: 1fr 350px;
}

.wizard-container.with-preview .wizard-content {
  display: grid;
  grid-template-columns: 1fr 400px;
}

.wizard-container.with-assistant.with-preview .wizard-content {
  display: grid;
  grid-template-columns: 1fr 400px 350px;
}

.step-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
  overflow-y: auto;
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
