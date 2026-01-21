<template>
  <div class="wizard-container" :class="{ 'with-assistant': showAssistant, 'with-preview': showPreview }">
    <!-- Toast Notifications -->
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <transition-group name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id" 
          class="toast"
          :class="`toast-${toast.type}`"
          :role="toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'"
        >
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="dismissToast(toast.id)" aria-label="Close notification">×</button>
        </div>
      </transition-group>
    </div>
    
    <!-- File Importer (shown before wizard starts) -->
    <FileImporter
      v-if="showFileImporter"
      @contextImported="handleContextImported"
    />
    
    <!-- Template Selector Modal -->
    <TemplateSelector
      v-if="showTemplateSelector"
      :extension-path="extensionPath"
      @template-selected="handleTemplateSelected"
      @cancel="showTemplateSelector = false"
    />

    <!-- Confirmation Dialog -->
    <ConfirmDialog
      :visible="showConfirmDialog"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :confirm-text="confirmDialogConfig.confirmText"
      :cancel-text="confirmDialogConfig.cancelText"
      @confirm="confirmDialogConfig.onConfirm"
      @cancel="confirmDialogConfig.onCancel"
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
          v-if="currentStep === 0 && !appliedTemplateId && !importedContext"
          class="import-btn"
          @click="showFileImporter = true"
          title="Import project context"
        >
          📁 Import Context
        </button>
        <button 
          v-if="currentStep === 0 && !appliedTemplateId"
          class="template-btn"
          @click="showTemplateSelector = true"
          title="Start from a template"
        >
          📋 Use Template
        </button>
        <button 
          class="undo-btn"
          @click="handleUndo"
          :disabled="!wizardStore.canUndo"
          :title="wizardStore.canUndo ? 'Undo - Ctrl+Z' : 'No actions to undo'"
        >
          ↶ Undo
        </button>
        <button 
          class="redo-btn"
          @click="handleRedo"
          :disabled="!wizardStore.canRedo"
          :title="wizardStore.canRedo ? 'Redo - Ctrl+Shift+Z' : 'No actions to redo'"
        >
          ↷ Redo
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
            :question-id="getCurrentQuestion()?.id"
            :validation-errors="validationErrors"
            :current-answers="wizardStore.answers"
            :show-ai-assistance="showAssistant"
            @answer-changed="handleAnswerChanged"
            @validation-error="handleValidationError"
            @ask-ai="handleAskAI"
            @edit-question="handleEditQuestion"
            @generate-plan="handleGeneratePlan"
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
import FileImporter from './components/FileImporter.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { getTemplateService } from './services/TemplateService';
import type { WizardState, PreviewRenderResult } from '../components/preview/PreviewEngine';
import { 
  mapTemplateDependencies, 
  validateDependencyGraph,
  type Feature 
} from './dependencyMapper';

// Type definitions for imported context
interface ImportedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  preview: string;
}

interface ContextAnalysis {
  suggestedTemplate: string;
  topics: string[];
  summary: string;
  estimatedDuration: string;
  recommendedTeamSize: number;
}

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

// Import Five Core Wizard Questions
const QuestionOne = defineAsyncComponent(() =>
  import('./components/wizard/QuestionOne.vue')
);
const QuestionTwo = defineAsyncComponent(() =>
  import('./components/wizard/QuestionTwo.vue')
);
const QuestionThree = defineAsyncComponent(() =>
  import('./components/wizard/QuestionThree.vue')
);
const QuestionFour = defineAsyncComponent(() =>
  import('./components/wizard/QuestionFour.vue')
);
const QuestionFive = defineAsyncComponent(() =>
  import('./components/wizard/QuestionFive.vue')
);
const WizardSummary = defineAsyncComponent(() =>
  import('./components/wizard/WizardSummary.vue')
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

// File import state
const showFileImporter = ref(false);
const importedContext = ref<{ files: ImportedFile[]; analysis: ContextAnalysis | null } | null>(null);

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

// Toast notification state
interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}
const toasts = ref<ToastNotification[]>([]);
let toastIdCounter = 0;

// Confirmation dialog state
const showConfirmDialog = ref(false);
const confirmDialogConfig = ref({
  title: 'Confirm',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {},
});

// Undo/Redo toast throttling
let lastUndoRedoToastTimestamp = 0;

// Question definitions - Five Core Wizard Questions
const questions = ref([
  {
    id: 'q1-what-building',
    title: 'What are you building?',
    description: 'Project details and objectives',
    type: 'question-one',
    component: 'QuestionOne',
  },
  {
    id: 'q2-users-stakeholders',
    title: 'Who are the users/stakeholders?',
    description: 'Identify your audience',
    type: 'question-two',
    component: 'QuestionTwo',
  },
  {
    id: 'q3-success-criteria',
    title: 'What are success criteria?',
    description: 'Define how you measure success',
    type: 'question-three',
    component: 'QuestionThree',
  },
  {
    id: 'q4-constraints',
    title: 'What are constraints?',
    description: 'Timeline, technology, and resource limits',
    type: 'question-four',
    component: 'QuestionFour',
  },
  {
    id: 'q5-risks',
    title: 'What are risks?',
    description: 'Identify potential challenges',
    type: 'question-five',
    component: 'QuestionFive',
  },
  {
    id: 'q6-summary',
    title: 'Review & Generate',
    description: 'Review your answers and generate plan',
    type: 'summary',
    component: 'WizardSummary',
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
  const currentQuestion = questions.value[currentStep.value];
  return currentQuestion?.component || 'QuestionRenderer';
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

// Toast notification helpers
const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000) => {
  const id = toastIdCounter++;
  const toast: ToastNotification = { id, message, type, duration };
  
  if (duration > 0) {
    const timeoutId = setTimeout(() => {
      const index = toasts.value.findIndex(t => t.id === id);
      if (index > -1) {
        toasts.value.splice(index, 1);
      }
    }, duration);
    toast.timeoutId = timeoutId;
  }
  
  toasts.value.push(toast);
};

const dismissToast = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    const toast = toasts.value[index];
    // Clear the timeout to prevent memory leak
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    toasts.value.splice(index, 1);
  }
};

// Helper function to show undo/redo toasts with throttling
const showUndoRedoToast = (message: string) => {
  const now = Date.now();
  const MIN_INTERVAL_MS = 1000;

  if (now - lastUndoRedoToastTimestamp >= MIN_INTERVAL_MS) {
    // Slightly shorter duration for undo/redo success to reduce visual noise
    showToast(message, 'success', 1500);
  }

  lastUndoRedoToastTimestamp = now;
};

// Undo/Redo handlers
const handleUndo = () => {
  if (wizardStore.undo()) {
    showUndoRedoToast('Action undone');
    console.log('[Wizard] Undo performed');
  }
};

const handleRedo = () => {
  if (wizardStore.redo()) {
    showUndoRedoToast('Action redone');
    console.log('[Wizard] Redo performed');
  }
};

// Helper function to apply template answers to wizard store
const applyTemplateAnswers = (templateId: string, templateAnswers: Record<string, unknown>) => {
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
  
  showToast('Template applied successfully!', 'success');
  console.log('[Wizard] Template applied:', templateId, templateAnswers);
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
      // Use dependency mapper to preserve dependencies
      const allFeatures = plan.features.map((f: any) => ({ 
        name: f.name, 
        description: f.description, 
        priority: f.priority 
      }));
      
      const featuresWithDeps = mapTemplateDependencies(
        plan.features,
        allFeatures
      );
      
      templateAnswers['features'] = {
        features: featuresWithDeps
      };
    }
    
    // Map plan.timeline to Q4
    if (plan.timeline && plan.timeline.milestones) {
      // Map dependencies for milestones too
      const allMilestones = plan.timeline.milestones.map((m: any) => ({ 
        name: m.name, 
        date: m.target_date, 
        phase: m.phase 
      }));
      
      const milestonesWithDeps = mapTemplateDependencies(
        plan.timeline.milestones,
        allMilestones
      );
      
      templateAnswers['timeline'] = {
        milestones: milestonesWithDeps
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
    
    // Validate dependencies before applying
    if (templateAnswers['features']?.features) {
      const validation = validateDependencyGraph(templateAnswers['features'].features);
      if (!validation.valid) {
        const errorMsg = `Template has dependency issues: ${validation.errors.join('; ')}`;
        showToast(errorMsg, 'warning', 8000);
        console.warn('[Wizard] Template dependency validation warnings:', validation.errors);
        
        // Require user confirmation before proceeding with invalid dependencies
        // Use custom confirmation dialog instead of native confirm()
        return new Promise<void>((resolve) => {
          confirmDialogConfig.value = {
            title: 'Template Dependency Issues',
            message: `The selected template has dependency issues that may result in a broken plan:\n\n${validation.errors.join('\n')}\n\nDo you want to apply the template anyway?`,
            confirmText: 'Apply Anyway',
            cancelText: 'Cancel',
            onConfirm: () => {
              showConfirmDialog.value = false;
              applyTemplateAnswers(templateId, templateAnswers);
              resolve();
            },
            onCancel: () => {
              showConfirmDialog.value = false;
              showToast('Template application cancelled due to dependency issues.', 'info', 6000);
              showTemplateSelector.value = false;
              resolve();
            },
          };
          showConfirmDialog.value = true;
        });
      }
    }
    
    // Apply template answers if validation passed
    applyTemplateAnswers(templateId, templateAnswers);
  } catch (error) {
    console.error('[Wizard] Failed to apply template:', error);
    
    // User-friendly error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while applying the template';
    
    showToast(`Failed to apply template: ${errorMessage}`, 'error', 10000);
    
    // Log to audit log (if available)
    if (typeof window !== 'undefined' && (window as any).auditLog) {
      (window as any).auditLog.error('template_application_failed', {
        templateId,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }
};

/**
 * Handle context imported from FileImporter component
 * 
 * Stores the imported files and AI analysis in the wizard state for use
 * throughout the planning workflow. The context includes uploaded/pasted files
 * and AI-generated analysis (suggested template, detected topics, etc.).
 * 
 * @param context - Object containing imported files and analysis results
 */
const handleContextImported = (context: { files: ImportedFile[]; analysis: ContextAnalysis | null }) => {
  importedContext.value = context;
  showFileImporter.value = false;
  
  // Store context for use throughout wizard
  if (context.analysis) {
    console.log('[Wizard] Context imported with analysis:', context.analysis);
    
    // If we have a suggested template, we could pre-select it or inform the user
    if (context.analysis.suggestedTemplate) {
      // TODO: Future feature - auto-apply the suggested template
      // handleTemplateSelected(context.analysis.suggestedTemplate);
      
      // Or just show a hint to the user
      console.log('[Wizard] Suggested template:', context.analysis.suggestedTemplate);
    }
    
    // Store the imported context in wizard metadata for later use
    if (wizardStore.metadata) {
      wizardStore.metadata.importedContext = context;
    }
  }
  
  console.log('[Wizard] Context imported:', context.files.length, 'files');
};

const handleValidationError = (errors: string[]) => {
  validationErrors.value[currentStep.value] = errors;
};

// Handle navigation from summary to edit a specific question
const handleEditQuestion = (questionNumber: number) => {
  // Navigate to the question (questionNumber is 1-indexed, currentStep is 0-indexed)
  const targetStep = questionNumber - 1;
  if (targetStep >= 0 && targetStep < questions.value.length) {
    currentStep.value = targetStep;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Handle plan generation from summary
const handleGeneratePlan = async (answers: any) => {
  isSubmitting.value = true;
  try {
    // Import WizardService dynamically
    const { WizardService } = await import('./services/WizardService');
    
    // Combine all answers
    const fullAnswers = {
      ...answers.q1,
      ...answers.q2,
      ...answers.q3,
      ...answers.q4,
      ...answers.q5,
    };
    
    // Validate all answers
    const validation = WizardService.validateAnswers(fullAnswers);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      alert(`Please complete all required fields:\n${validation.errors.join('\n')}`);
      isSubmitting.value = false;
      return;
    }
    
    // Generate the plan
    const generatedPlan = await WizardService.generatePlan(fullAnswers);
    
    // Add metadata
    const planWithMetadata = PlanMetadataManager.addMetadata(generatedPlan);
    
    // Emit event for plan completion
    window.dispatchEvent(new CustomEvent('wizard-complete', { 
      detail: { plan: planWithMetadata } 
    }));
    
    console.log('[Wizard] Plan generated successfully:', generatedPlan);
    
  } catch (error) {
    console.error('Failed to generate plan:', error);
    alert('Failed to generate plan. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
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
  
  // Ctrl+Z or Cmd+Z - undo
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    handleUndo();
  }
  
  // Ctrl+Shift+Z or Cmd+Shift+Z - redo
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
    event.preventDefault();
    handleRedo();
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

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-notifications-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 300px;
}

.toast-message {
  flex: 1;
  font-size: 13px;
  color: var(--vscode-notifications-foreground);
}

.toast-close {
  padding: 0;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--vscode-notifications-foreground);
  font-size: 18px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.toast-close:hover {
  opacity: 1;
}

.toast-success {
  border-left: 4px solid var(--vscode-terminal-ansiGreen);
}

.toast-error {
  border-left: 4px solid var(--vscode-terminal-ansiRed);
}

.toast-warning {
  border-left: 4px solid var(--vscode-terminal-ansiYellow);
}

.toast-info {
  border-left: 4px solid var(--vscode-terminal-ansiBlue);
}

/* Toast animations */
.toast-enter-active {
  animation: toast-slide-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-slide-out 0.3s ease-in;
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toast-slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Undo/Redo buttons */
.undo-btn,
.redo-btn {
  padding: 6px 12px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.undo-btn:disabled,
.redo-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.undo-btn:not(:disabled):hover,
.redo-btn:not(:disabled):hover {
  background: var(--vscode-button-hoverBackground);
  color: var(--vscode-button-foreground);
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
  
  .toast-container {
    left: 20px;
    right: 20px;
    max-width: none;
  }
  
  .toast {
    min-width: 0;
  }
}
</style>
