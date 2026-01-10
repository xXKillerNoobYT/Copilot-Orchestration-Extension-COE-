<template>
  <div class="plan-builder-app">
    <ProgressBar
      :pages="allPages"
      :currentPageIndex="currentPageIndex"
      :completedPages="completedPages"
    />

    <div class="main-content">
      <WizardPage
        v-if="currentPage"
        :page="currentPage"
        :answers="answers"
        :isFirstPage="currentPageIndex === 0"
        :isLastPage="currentPageIndex === allPages.length - 1"
        @update="handleAnswerUpdate"
        @next="handleNext"
        @previous="handlePrevious"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import WizardPage from './WizardPage.vue';
import QuestionCard from './QuestionCard.vue';
import ProgressBar from './ProgressBar.vue';
import { QuestionFramework } from '../../src/planBuilder/questionFramework';
import { WizardStateManager } from '../../src/planBuilder/wizardState';

// Initialize framework and state manager
const framework = new QuestionFramework();
const stateManager = new WizardStateManager();

// Reactive state
const answers = ref<Record<string, unknown>>(stateManager.getState().answers);
const currentPageIndex = ref(0);
const completedPages = ref<string[]>(stateManager.getState().completedPages);

// Get all pages based on current answers
const allPages = computed(() => framework.getPages(answers.value));

// Get current page
const currentPage = computed(() => allPages.value[currentPageIndex.value]);

// Lifecycle hooks
onMounted(() => {
  // Load saved state
  const savedState = stateManager.getState();
  answers.value = savedState.answers;
  completedPages.value = savedState.completedPages;

  // Find current page index from saved state
  const savedPageIndex = allPages.value.findIndex(p => p.id === savedState.currentPage);
  if (savedPageIndex !== -1) {
    currentPageIndex.value = savedPageIndex;
  }

  // Send ready message to VS Code extension
  if (window.vscode) {
    window.vscode.postMessage({ type: 'ready' });
  }

  // Listen for messages from VS Code extension
  window.addEventListener('message', handleVSCodeMessage);
});

onBeforeUnmount(() => {
  stateManager.dispose();
  window.removeEventListener('message', handleVSCodeMessage);
});

// Handle answer updates
function handleAnswerUpdate(questionId: string, value: unknown) {
  answers.value = { ...answers.value, [questionId]: value };
  stateManager.setAnswer(questionId, value);
}

// Handle page navigation
function handleNext() {
  if (currentPage.value) {
    // Mark current page as completed
    stateManager.markPageCompleted(currentPage.value.id);
    completedPages.value = [...completedPages.value, currentPage.value.id];
  }

  // Navigate to next page
  if (currentPageIndex.value < allPages.value.length - 1) {
    currentPageIndex.value++;
    const nextPage = allPages.value[currentPageIndex.value];
    if (nextPage) {
      stateManager.navigateToPage(nextPage.id);
    }
  }
}

function handlePrevious() {
  if (currentPageIndex.value > 0) {
    currentPageIndex.value--;
    const prevPage = allPages.value[currentPageIndex.value];
    if (prevPage) {
      stateManager.navigateToPage(prevPage.id);
    }
  }
}

// Handle wizard completion
function handleSubmit() {
  // Mark final page as completed
  if (currentPage.value) {
    stateManager.markPageCompleted(currentPage.value.id);
  }

  // Export final state
  const finalState = stateManager.exportState();

  // Send completion message to VS Code extension
  if (window.vscode) {
    window.vscode.postMessage({
      type: 'wizardComplete',
      data: finalState
    });
  }
}

// Handle messages from VS Code extension
function handleVSCodeMessage(event: MessageEvent) {
  const message = event.data;

  switch (message.type) {
    case 'reset':
      stateManager.reset();
      answers.value = {};
      currentPageIndex.value = 0;
      completedPages.value = [];
      break;

    case 'loadState':
      if (message.data) {
        stateManager.importState(message.data);
        answers.value = stateManager.getState().answers;
        completedPages.value = stateManager.getState().completedPages;
        
        // Find page index from loaded state
        const loadedPageIndex = allPages.value.findIndex(p => p.id === message.data.currentPage);
        if (loadedPageIndex !== -1) {
          currentPageIndex.value = loadedPageIndex;
        }
      }
      break;

    case 'exportState':
      const state = stateManager.exportState();
      if (window.vscode) {
        window.vscode.postMessage({
          type: 'stateExported',
          data: state
        });
      }
      break;
  }
}

// Type declaration for vscode API
declare global {
  interface Window {
    vscode?: {
      postMessage(message: unknown): void;
    };
  }
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.plan-builder-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

/* Scrollbar styling for VS Code theme */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background-color: var(--vscode-scrollbarSlider-background);
}

::-webkit-scrollbar-thumb {
  background-color: var(--vscode-scrollbarSlider-background);
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--vscode-scrollbarSlider-hoverBackground);
}

::-webkit-scrollbar-thumb:active {
  background-color: var(--vscode-scrollbarSlider-activeBackground);
}
</style>
