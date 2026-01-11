<template>
  <div class="wizard-container">
    <!-- Header with progress and title -->
    <div class="wizard-header">
      <div class="header-content">
        <h1 class="wizard-title">{{ wizardTitle }}</h1>
        <p v-if="wizardDescription" class="wizard-description">{{ wizardDescription }}</p>
      </div>

      <!-- Progress bar -->
      <ProgressBar
        :pages="allPages"
        :currentPageIndex="currentPageIndex"
        :completedPages="completedPages"
        class="progress-section"
        @navigate="handleProgressNavigation"
      />
    </div>

    <!-- Main wizard content -->
    <div class="wizard-content">
      <!-- Sidebar with page list -->
      <aside v-if="showSidebar" class="wizard-sidebar">
        <nav class="page-navigator">
          <h3 class="nav-title">Pages</h3>
          <button
            v-for="(page, index) in allPages"
            :key="page.id"
            :class="['nav-item', {
              'is-current': index === currentPageIndex,
              'is-completed': completedPages.includes(page.id),
              'is-accessible': canAccessPage(index)
            }]"
            :disabled="!canAccessPage(index)"
            @click="jumpToPage(index)"
          >
            <span class="nav-item-index">{{ index + 1 }}</span>
            <span class="nav-item-title">{{ page.title }}</span>
            <span v-if="completedPages.includes(page.id)" class="nav-item-check">✓</span>
          </button>
        </nav>

        <!-- Time estimate -->
        <div v-if="showTimeEstimate" class="time-estimate">
          <span class="time-label">Est. time:</span>
          <span class="time-value">{{ formatTimeRemaining() }}</span>
        </div>
      </aside>

      <!-- Main page content -->
      <main class="wizard-main">
        <transition name="page-fade" mode="out-in">
          <WizardPage
            v-if="currentPage"
            :key="currentPage.id"
            :page="currentPage"
            :answers="answers"
            :isFirstPage="isFirstPage"
            :isLastPage="isLastPage"
            @update="handleAnswerUpdate"
            @next="handlePageNext"
            @previous="handlePagePrevious"
            @submit="handleWizardComplete"
          />
        </transition>
      </main>

      <!-- Right sidebar with AI assistant or live preview -->
      <aside v-if="showAssistant || showPreviewPanel" class="wizard-preview">
        <!-- AI Contextual Assistant -->
        <ContextualAssistant
          v-if="showAssistant"
          :visible="showAssistant"
          :suggestions="assistantSuggestions"
          :loading="assistantLoading"
          :error="assistantError"
          :acceptance-rate="assistantAcceptanceRate"
          :suggestion-count="aiService.getSuggestionHistory().length"
          @close="showAssistant = false"
          @accept="handleAcceptSuggestion"
          @reject="handleRejectSuggestion"
          @retry="generateAssistantSuggestions"
        />

        <!-- Live preview (fallback if no assistant) -->
        <div v-else class="preview-header">
          <div class="preview-content">
            <div class="preview-item">
              <p class="preview-label">Design changes will appear here</p>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Status bar -->
    <div class="wizard-statusbar">
      <div class="status-left">
        <span class="status-item">
          Page {{ currentPageIndex + 1 }} of {{ allPages.length }}
        </span>
      </div>
      <div class="status-center">
        <span v-if="!isCompleting" class="status-item">
          {{ completedPages.length }} of {{ allPages.length }} pages completed
        </span>
        <span v-else class="status-item loading">Generating plan...</span>
      </div>
      <div class="status-right">
        <span class="status-item">
          {{ formatTimeElapsed() }}
        </span>
      </div>
    </div>

    <!-- Completion modal -->
    <div v-if="showCompletionModal" class="completion-modal-overlay" @click.self="closeCompletionModal">
      <div class="completion-modal">
        <div class="modal-header">
          <h2>Plan Generation Complete! 🎉</h2>
        </div>
        <div class="modal-body">
          <p>Your plan has been generated and is ready for use.</p>
          <div class="plan-summary">
            <div class="summary-item">
              <span class="summary-label">Pages Completed:</span>
              <span class="summary-value">{{ completedPages.length }} / {{ allPages.length }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Time:</span>
              <span class="summary-value">{{ formatTimeElapsed() }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Questions Answered:</span>
              <span class="summary-value">{{ Object.keys(answers).length }}</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="handleReset">
            Start Over
          </button>
          <button class="btn btn-primary" @click="handleExportPlan">
            Export Plan
          </button>
          <button class="btn btn-success" @click="closeCompletionModal">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import WizardPage from './WizardPage.vue';
import ProgressBar from './ProgressBar.vue';
import ContextualAssistant from '../../src/planBuilder/ContextualAssistant.vue';
import { useWizardStore } from '../../src/planBuilder/wizardStore';
import { AiAssistanceService, type AiSuggestion } from '../../src/planBuilder/aiAssistanceService';

interface Props {
  wizardTitle?: string;
  wizardDescription?: string;
  showSidebar?: boolean;
  showPreviewPanel?: boolean;
  showTimeEstimate?: boolean;
  userRole?: string;
}

const props = withDefaults(defineProps<Props>(), {
  wizardTitle: 'Interactive Plan Builder',
  wizardDescription: 'Create a comprehensive project plan in 10 guided steps',
  showSidebar: true,
  showPreviewPanel: false,
  showTimeEstimate: true,
  userRole: undefined,
});

// Initialize wizard store
const wizard = useWizardStore(props.userRole);

// Local state
const showCompletionModal = ref(false);
const startTime = ref(new Date());
const elapsedTime = ref(0);

// AI Assistance state
const aiService = new AiAssistanceService({ debounceMs: 1000, enableLogging: false });
const showAssistant = ref(false);
const assistantSuggestions = ref<AiSuggestion[]>([]);
const assistantLoading = ref(false);
const assistantError = ref<string | null>(null);
const assistantAcceptanceRate = computed(() => aiService.getAcceptanceRate());

// Wizard state (reactive from store)
const currentPageIndex = computed(() => wizard.currentPageIndex);
const allPages = computed(() => wizard.allPages);
const currentPage = computed(() => wizard.currentPage);
const answers = computed(() => wizard.answers);
const completedPages = computed(() => wizard.container.getState().completedPages);
const isCompleting = computed(() => wizard.isCompleting);
const isFirstPage = computed(() => wizard.isFirstPage);
const isLastPage = computed(() => wizard.isLastPage);

// Update elapsed time every second
let timeInterval: number | undefined;

onMounted(() => {
  startTime.value = new Date();

  // Update time display every second
  timeInterval = window.setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - startTime.value.getTime()) / 1000);
  }, 1000);

  // Send ready message to VS Code extension
  if (window.vscode) {
    window.vscode.postMessage({ type: 'wizardReady' });
  }
});

onBeforeUnmount(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
  wizard.dispose();
  aiService.dispose();
});

/**
 * Handle answer updates
 */
function handleAnswerUpdate(questionId: string, value: unknown) {
  wizard.setAnswer(questionId, value);

  // Generate AI suggestions debounced
  aiService.debouncedGenerateSuggestions(
    currentPage.value!,
    answers.value,
    props.userRole,
    (suggestions) => {
      assistantSuggestions.value = suggestions;
      // Auto-show assistant if suggestions available and not in mobile view
      if (suggestions.length > 0 && window.innerWidth > 1200) {
        showAssistant.value = true;
      }
    }
  );
}

/**
 * Handle navigation to next page
 */
function handlePageNext() {
  if (wizard.navigateNext()) {
    // Page changed successfully
  }
}

/**
 * Handle navigation to previous page
 */
function handlePagePrevious() {
  wizard.navigatePrevious();
}

/**
 * Handle wizard completion
 */
async function handleWizardComplete() {
  try {
    const plan = await wizard.completeWizard();

    // Send plan to VS Code extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'planComplete',
        data: plan,
      });
    }

    // Show completion modal
    showCompletionModal.value = true;
  } catch (error) {
    console.error('Failed to complete wizard:', error);
  }
}

/**
 * Check if a page is accessible for jumping
 */
function canAccessPage(pageIndex: number): boolean {
  // Can access current page
  if (pageIndex === currentPageIndex.value) return true;

  // Can access visited pages
  const pageId = allPages.value[pageIndex]?.id;
  if (pageId && completedPages.value.includes(pageId)) return true;

  // Can access first page always
  if (pageIndex === 0) return true;

  // Can access next page if current page is complete
  if (
    pageIndex === currentPageIndex.value + 1 &&
    currentPage.value &&
    completedPages.value.includes(currentPage.value.id)
  ) {
    return true;
  }

  return false;
}

/**
 * Jump to a specific page
 */
function jumpToPage(pageIndex: number) {
  if (canAccessPage(pageIndex)) {
    const pageId = allPages.value[pageIndex]?.id;
    if (pageId) {
      wizard.jumpToPage(pageId);
    }
  }
}

/**
 * Handle progress bar navigation
 */
function handleProgressNavigation(pageIndex: number) {
  jumpToPage(pageIndex);
}

/**
 * Generate AI suggestions for current page
 */
async function generateAssistantSuggestions() {
  if (!currentPage.value) return;

  assistantLoading.value = true;
  assistantError.value = null;

  try {
    const suggestions = await aiService.generateSuggestions(
      currentPage.value,
      answers.value,
      props.userRole
    );

    assistantSuggestions.value = suggestions;
    showAssistant.value = suggestions.length > 0;
  } catch (error) {
    assistantError.value = error instanceof Error ? error.message : 'Failed to generate suggestions';
    console.error('Error generating suggestions:', error);
  } finally {
    assistantLoading.value = false;
  }
}

/**
 * Handle accepting a suggestion
 */
function handleAcceptSuggestion(suggestion: AiSuggestion) {
  aiService.acceptSuggestion(suggestion.id, suggestion.question);

  // Log the accepted suggestion (could send to analytics)
  console.log('[Plan Builder] User accepted suggestion:', suggestion.question);
}

/**
 * Handle rejecting a suggestion
 */
function handleRejectSuggestion(suggestionId: string) {
  console.log('[Plan Builder] User rejected suggestion:', suggestionId);
}

/**
 * Format elapsed time
 */
function formatTimeElapsed(): string {
  const minutes = Math.floor(elapsedTime.value / 60);
  const seconds = elapsedTime.value % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format time remaining
 */
function formatTimeRemaining(): string {
  const progress = wizard.progress;
  const remainingSeconds = progress.estimatedTimeRemaining;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Close completion modal
 */
function closeCompletionModal() {
  showCompletionModal.value = false;
}

/**
 * Reset wizard
 */
function handleReset() {
  wizard.reset();
  showCompletionModal.value = false;
  startTime.value = new Date();
  elapsedTime.value = 0;
}

/**
 * Export plan
 */
function handleExportPlan() {
  const plan = wizard.container.exportState();
  const blob = new Blob([plan], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plan-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.wizard-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}

.wizard-header {
  flex-shrink: 0;
  padding: 1.5rem;
  border-bottom: 1px solid var(--vscode-panel-border);
  background-color: var(--vscode-editor-lineHighlightBackground);
}

.header-content {
  margin-bottom: 1rem;
}

.wizard-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.wizard-description {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  color: var(--vscode-descriptionForeground);
}

.progress-section {
  width: 100%;
}

.wizard-content {
  flex: 1;
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  gap: 0;
  overflow: hidden;
}

.wizard-sidebar {
  overflow-y: auto;
  border-right: 1px solid var(--vscode-panel-border);
  background-color: var(--vscode-editor-background);
  padding: 1rem;
}

@media (max-width: 1200px) {
  .wizard-content {
    grid-template-columns: 1fr;
  }

  .wizard-sidebar {
    display: none;
  }

  .wizard-preview {
    display: none;
  }
}

.page-navigator {
  margin-bottom: 2rem;
  padding: 0;
}

.nav-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground);
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  gap: 0.5rem;
  text-align: left;
}

.nav-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-item:not(:disabled):hover {
  background-color: var(--vscode-editor-lineHighlightBackground);
  border-color: var(--vscode-focusBorder);
}

.nav-item.is-current {
  background-color: var(--vscode-editor-selectionBackground);
  border-color: var(--vscode-focusBorder);
  font-weight: 500;
}

.nav-item.is-completed .nav-item-check {
  color: var(--vscode-terminal-green);
}

.nav-item-index {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--vscode-editor-lineHighlightBackground);
  font-size: 0.75rem;
  font-weight: 600;
}

.nav-item.is-completed .nav-item-index {
  background-color: var(--vscode-terminal-green);
  color: var(--vscode-editor-background);
}

.nav-item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-item-check {
  flex-shrink: 0;
  opacity: 0;
}

.nav-item.is-completed .nav-item-check {
  opacity: 1;
}

.time-estimate {
  padding: 0.75rem;
  background-color: var(--vscode-editor-lineHighlightBackground);
  border-radius: 4px;
  font-size: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time-label {
  color: var(--vscode-descriptionForeground);
}

.time-value {
  font-weight: 600;
  color: var(--vscode-foreground);
}

.wizard-main {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.wizard-preview {
  overflow-y: auto;
  border-left: 1px solid var(--vscode-panel-border);
  background-color: var(--vscode-editor-background);
  padding: 1rem;
  min-width: 250px;
}

.preview-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.preview-header h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-item {
  padding: 0.75rem;
  background-color: var(--vscode-editor-lineHighlightBackground);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--vscode-descriptionForeground);
}

.preview-label {
  margin: 0;
}

.wizard-statusbar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--vscode-panel-border);
  background-color: var(--vscode-editor-lineHighlightBackground);
  font-size: 0.85rem;
  color: var(--vscode-descriptionForeground);
}

.status-left,
.status-center,
.status-right {
  display: flex;
  gap: 1rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-item.loading {
  color: var(--vscode-terminal-blue);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Completion Modal */
.completion-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.completion-modal {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--vscode-panel-border);
  background-color: var(--vscode-editor-lineHighlightBackground);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--vscode-foreground);
}

.modal-body {
  padding: 1.5rem;
  flex: 1;
}

.modal-body p {
  margin: 0 0 1rem 0;
  color: var(--vscode-foreground);
}

.plan-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background-color: var(--vscode-editor-lineHighlightBackground);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
}

.summary-label {
  color: var(--vscode-descriptionForeground);
}

.summary-value {
  font-weight: 600;
  color: var(--vscode-foreground);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--vscode-panel-border);
}

.btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.btn-secondary {
  background-color: transparent;
  border-color: var(--vscode-button-border);
  color: var(--vscode-foreground);
}

.btn-secondary:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.btn-success {
  background-color: var(--vscode-terminal-green);
  color: var(--vscode-editor-background);
}

.btn-success:hover {
  opacity: 0.85;
}

/* Page transition animation */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
