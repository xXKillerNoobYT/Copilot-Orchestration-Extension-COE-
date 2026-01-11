/**
 * Wizard Store - Vue 3 Composable
 * 
 * Reactive state management for wizard using Vue 3 Composition API.
 * Integrates with WizardContainer for orchestration logic.
 * 
 * Usage:
 *   const wizard = useWizardStore();
 *   wizard.currentPage;
 *   wizard.navigateNext();
 * 
 * Reference: Code Master Section 9.2
 */

import { ref, computed, reactive, readonly, watch } from 'vue';
import { WizardContainer, type WizardProgress, NavigationDirection } from './wizardContainer';
import type { WizardPage, Question } from './questionFramework';

export interface WizardStore {
  // State
  container: WizardContainer;
  currentPageIndex: number;
  allPages: WizardPage[];
  currentPage: WizardPage | null;
  currentQuestions: Question[];
  answers: Record<string, unknown>;
  progress: WizardProgress;
  validationErrors: string[];
  isLoading: boolean;
  isCompleting: boolean;
  
  // Computed
  isFirstPage: boolean;
  isLastPage: boolean;
  hasValidationErrors: boolean;
  
  // Actions
  navigateNext(): boolean;
  navigatePrevious(): boolean;
  jumpToPage(pageId: string): boolean;
  setAnswer(questionId: string, value: unknown): void;
  getAnswer<T>(questionId: string): T | undefined;
  validateCurrentPage(): boolean;
  completeWizard(): Promise<Record<string, unknown>>;
  reset(): void;
  dispose(): void;
}

// Global store instance
let storeInstance: WizardStore | null = null;

/**
 * Create or get wizard store instance
 */
export function useWizardStore(userRole?: string): WizardStore {
  // Return existing instance if available
  if (storeInstance) {
    return storeInstance;
  }

  // Create reactive state
  const container = new WizardContainer(userRole);
  
  const currentPageIndex = ref(0);
  const validationErrors = ref<string[]>([]);
  const isLoading = ref(false);
  const isCompleting = ref(false);

  // Reactive answers
  const answers = reactive<Record<string, unknown>>(container.getAllAnswers());

  // Computed values
  const allPages = computed(() => container.getAllPages());
  
  const currentPage = computed(() => container.getCurrentPage());
  
  const currentQuestions = computed(() => container.getCurrentQuestions());
  
  const progress = ref<WizardProgress>(container.getProgress());
  
  const isFirstPage = computed(() => currentPageIndex.value === 0);
  
  const isLastPage = computed(
    () => currentPageIndex.value === allPages.value.length - 1
  );
  
  const hasValidationErrors = computed(() => validationErrors.value.length > 0);

  // Register container callbacks
  container.onPageChangeEvent((page: WizardPage, index: number) => {
    currentPageIndex.value = index;
    validationErrors.value = [];
  });

  container.onProgressUpdateEvent((updatedProgress: WizardProgress) => {
    progress.value = updatedProgress;
  });

  container.onValidationErrorEvent((errors: string[]) => {
    validationErrors.value = errors;
  });

  container.onCompletionEvent((plan: Record<string, unknown>) => {
    console.log('[WizardStore] Plan completed:', plan);
  });

  // Watch for answer changes and sync with container
  watch(
    () => ({ ...answers }),
    (newAnswers) => {
      Object.entries(newAnswers).forEach(([questionId, value]) => {
        if (container.getAnswer(questionId) !== value) {
          container.setAnswer(questionId, value);
        }
      });
    },
    { deep: true }
  );

  // Store implementation
  const store: WizardStore = {
    // State (wrapped in readonly where appropriate)
    container,
    get currentPageIndex() {
      return currentPageIndex.value;
    },
    get allPages() {
      return allPages.value;
    },
    get currentPage() {
      return currentPage.value;
    },
    get currentQuestions() {
      return currentQuestions.value;
    },
    get answers() {
      return readonly(answers) as any;
    },
    get progress() {
      return progress.value;
    },
    get validationErrors() {
      return validationErrors.value;
    },
    get isLoading() {
      return isLoading.value;
    },
    get isCompleting() {
      return isCompleting.value;
    },

    // Computed
    get isFirstPage() {
      return isFirstPage.value;
    },
    get isLastPage() {
      return isLastPage.value;
    },
    get hasValidationErrors() {
      return hasValidationErrors.value;
    },

    // Actions
    navigateNext(): boolean {
      return container.navigateNext();
    },

    navigatePrevious(): boolean {
      return container.navigatePrevious();
    },

    jumpToPage(pageId: string): boolean {
      return container.jumpToPage(pageId);
    },

    setAnswer(questionId: string, value: unknown): void {
      answers[questionId] = value;
      container.setAnswer(questionId, value);
    },

    getAnswer<T = unknown>(questionId: string): T | undefined {
      return container.getAnswer<T>(questionId);
    },

    validateCurrentPage(): boolean {
      if (!currentPage.value) return true;

      const result = (container as any).validatePage?.(currentPage.value.id);
      if (result && !result.valid) {
        validationErrors.value = result.errors;
        return false;
      }
      validationErrors.value = [];
      return true;
    },

    async completeWizard(): Promise<Record<string, unknown>> {
      isCompleting.value = true;
      try {
        const plan = await container.completeWizard();
        return plan;
      } catch (error) {
        console.error('[WizardStore] Failed to complete wizard:', error);
        throw error;
      } finally {
        isCompleting.value = false;
      }
    },

    reset(): void {
      container.reset();
      currentPageIndex.value = 0;
      validationErrors.value = [];
      Object.keys(answers).forEach(key => delete answers[key]);
    },

    dispose(): void {
      container.dispose();
      storeInstance = null;
    },
  };

  storeInstance = store;
  return store;
}

/**
 * Get current store instance (throws if not initialized)
 */
export function getWizardStore(): WizardStore {
  if (!storeInstance) {
    throw new Error('WizardStore not initialized. Call useWizardStore() first.');
  }
  return storeInstance;
}

/**
 * Reset global store instance
 */
export function resetWizardStore(): void {
  if (storeInstance) {
    storeInstance.dispose();
    storeInstance = null;
  }
}
