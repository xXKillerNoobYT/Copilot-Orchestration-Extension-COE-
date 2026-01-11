/**
 * Wizard Store - Vue 3 Composable with Undo/Redo & localStorage
 * 
 * Comprehensive state management for wizard using Vue 3 Composition API.
 * Features:
 * - Real-time reactive state
 * - Full undo/redo history (max 20 actions)
 * - localStorage persistence (auto-save every 30s)
 * - Validation tracking
 * - Answer sync
 * 
 * Usage:
 *   const wizard = useWizardStore();
 *   wizard.currentPage;
 *   wizard.navigateNext();
 *   wizard.undo();  // Revert last action
 *   wizard.loadDraft();  // Restore from localStorage
 * 
 * Reference: Code Master Section 9.2
 */

import { ref, computed, reactive, readonly, watch, onMounted, onUnmounted } from 'vue';
import { WizardContainer, type WizardProgress, NavigationDirection } from './wizardContainer';
import type { WizardPage, Question } from './questionFramework';

// Constants
const STORAGE_KEY = 'wizard-draft';
const HISTORY_MAX_SIZE = 20;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Types
interface HistoryState {
  pageIndex: number;
  answers: Record<string, unknown>;
  timestamp: number;
}

interface DraftState {
  version: number;
  pageIndex: number;
  answers: Record<string, unknown>;
  savedAt: number;
  histories: HistoryState[];
}

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
  isDrafted: boolean;
  isSaved: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  
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
  
  // Draft & History
  clearDraft(): void;
  loadDraft(): boolean;
  saveDraft(): void;
  undo(): boolean;
  redo(): boolean;
  
  reset(): void;
  dispose(): void;
}

// Global store instance
let storeInstance: WizardStore | null = null;

// Helper functions
function saveToLocalStorage(state: Partial<DraftState>): void {
  try {
    const existing = loadFromLocalStorage() || {};
    const draft: DraftState = {
      version: 1,
      pageIndex: 0,
      answers: {},
      histories: [],
      ...existing,
      ...state,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('[WizardStore] Failed to save draft:', error);
  }
}

function loadFromLocalStorage(): DraftState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[WizardStore] Failed to load draft:', error);
    return null;
  }
}

function deleteFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[WizardStore] Failed to clear draft:', error);
  }
}

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

  // History management
  const history = ref<HistoryState[]>([]);
  const historyIndex = ref(-1);
  let autoSaveTimer: NodeJS.Timeout | null = null;

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
  
  const isDrafted = computed(() => Object.keys(answers).length > 0);
  
  const isSaved = computed(() => isDrafted.value);
  
  const canUndo = computed(() => historyIndex.value > 0);
  
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);
  
  const historyLength = computed(() => history.value.length);

  // Helper: Add to history
  function addToHistory(): void {
    // Remove any history after current index (for redo cleanup)
    history.value.splice(historyIndex.value + 1);
    
    // Add new state
    const state: HistoryState = {
      pageIndex: currentPageIndex.value,
      answers: JSON.parse(JSON.stringify(answers)),
      timestamp: Date.now(),
    };
    history.value.push(state);
    historyIndex.value = history.value.length - 1;
    
    // Limit history size
    if (history.value.length > HISTORY_MAX_SIZE) {
      history.value.shift();
      historyIndex.value = Math.max(0, historyIndex.value - 1);
    }
  }

  // Helper: Restore from history state
  function restoreFromHistory(state: HistoryState): void {
    currentPageIndex.value = state.pageIndex;
    Object.keys(answers).forEach(key => delete answers[key]);
    Object.assign(answers, JSON.parse(JSON.stringify(state.answers)));
    Object.entries(state.answers).forEach(([questionId, value]) => {
      container.setAnswer(questionId, value);
    });
    validationErrors.value = [];
  }

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
      // History is now handled explicitly in setAnswer, navigateNext, etc.
    },
    { deep: true }
  );

  // Add initial empty state snapshot
  addToHistory();

  // Auto-save setup
  function startAutoSave(): void {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(() => {
      saveToLocalStorage({
        pageIndex: currentPageIndex.value,
        answers: JSON.parse(JSON.stringify(answers)),
        histories: history.value,
      });
    }, AUTO_SAVE_INTERVAL);
  }

  function stopAutoSave(): void {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  }

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
    get isDrafted() {
      return isDrafted.value;
    },
    get isSaved() {
      return isSaved.value;
    },
    get canUndo() {
      return canUndo.value;
    },
    get canRedo() {
      return canRedo.value;
    },
    get historyLength() {
      return historyLength.value;
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
      const result = container.navigateNext();
      if (result) {
        addToHistory();
      }
      return result;
    },

    navigatePrevious(): boolean {
      const result = container.navigatePrevious();
      if (result) {
        addToHistory();
      }
      return result;
    },

    jumpToPage(pageId: string): boolean {
      const result = container.jumpToPage(pageId);
      if (result) {
        addToHistory();
      }
      return result;
    },

    setAnswer(questionId: string, value: unknown): void {
      answers[questionId] = value;
      container.setAnswer(questionId, value);
      // Immediately add to history (don't wait for watch)
      addToHistory();
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
        // Clear draft after successful completion
        deleteFromLocalStorage();
        return plan;
      } catch (error) {
        console.error('[WizardStore] Failed to complete wizard:', error);
        throw error;
      } finally {
        isCompleting.value = false;
      }
    },

    // Draft & History
    clearDraft(): void {
      deleteFromLocalStorage();
      history.value = [];
      historyIndex.value = -1;
    },

    loadDraft(): boolean {
      const draft = loadFromLocalStorage();
      if (!draft || !draft.answers || Object.keys(draft.answers).length === 0) {
        return false;
      }

      try {
        // Restore state
        currentPageIndex.value = draft.pageIndex || 0;
        Object.keys(answers).forEach(key => delete answers[key]);
        Object.assign(answers, draft.answers);
        Object.entries(draft.answers).forEach(([questionId, value]) => {
          container.setAnswer(questionId, value);
        });

        // Restore history
        if (draft.histories && Array.isArray(draft.histories)) {
          history.value = draft.histories;
          historyIndex.value = draft.histories.length - 1;
        }

        return true;
      } catch (error) {
        console.error('[WizardStore] Failed to load draft:', error);
        return false;
      }
    },

    saveDraft(): void {
      saveToLocalStorage({
        pageIndex: currentPageIndex.value,
        answers: JSON.parse(JSON.stringify(answers)),
        histories: history.value,
      });
    },

    undo(): boolean {
      if (!canUndo.value) return false;

      historyIndex.value--;
      const state = history.value[historyIndex.value];
      if (state) {
        restoreFromHistory(state);
        return true;
      }
      return false;
    },

    redo(): boolean {
      if (!canRedo.value) return false;

      historyIndex.value++;
      const state = history.value[historyIndex.value];
      if (state) {
        restoreFromHistory(state);
        return true;
      }
      return false;
    },

    reset(): void {
      container.reset();
      currentPageIndex.value = 0;
      validationErrors.value = [];
      history.value = [];
      historyIndex.value = -1;
      Object.keys(answers).forEach(key => delete answers[key]);
      stopAutoSave();
    },

    dispose(): void {
      stopAutoSave();
      container.dispose();
      storeInstance = null;
    },
  };

  // Initialize auto-save on store creation
  startAutoSave();

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
