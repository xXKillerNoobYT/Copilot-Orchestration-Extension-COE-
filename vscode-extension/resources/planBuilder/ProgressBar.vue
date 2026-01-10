<template>
  <div class="progress-bar-container">
    <div class="progress-header">
      <span class="progress-label">Progress</span>
      <span class="progress-percentage">{{ percentage }}%</span>
    </div>
    
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ width: `${percentage}%` }"
        role="progressbar"
        :aria-valuenow="percentage"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Wizard progress: ${percentage}% complete`"
      />
    </div>

    <div class="progress-steps">
      <div
        v-for="(page, index) in pages"
        :key="page.id"
        class="step"
        :class="{
          'completed': isCompleted(index),
          'current': isCurrent(index),
          'future': isFuture(index)
        }"
      >
        <div class="step-indicator">
          <span v-if="isCompleted(index)" class="checkmark">✓</span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span class="step-label">{{ page.title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WizardPage } from '../../src/planBuilder/questionFramework';

interface Props {
  pages: WizardPage[];
  currentPageIndex: number;
  completedPages: string[];
}

const props = defineProps<Props>();

const percentage = computed(() => {
  if (props.pages.length === 0) return 0;
  return Math.round((props.completedPages.length / props.pages.length) * 100);
});

function isCompleted(index: number): boolean {
  const pageId = props.pages[index]?.id;
  return pageId ? props.completedPages.includes(pageId) : false;
}

function isCurrent(index: number): boolean {
  return index === props.currentPageIndex;
}

function isFuture(index: number): boolean {
  return index > props.currentPageIndex && !isCompleted(index);
}
</script>

<style scoped>
.progress-bar-container {
  width: 100%;
  padding: 1.5rem;
  background: var(--vscode-sideBar-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vscode-foreground);
}

.progress-percentage {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vscode-charts-blue);
}

.progress-track {
  width: 100%;
  height: 8px;
  background-color: var(--vscode-progressBar-background);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.progress-fill {
  height: 100%;
  background-color: var(--vscode-progressBar-background);
  background-image: linear-gradient(90deg, var(--vscode-charts-blue), var(--vscode-charts-green));
  transition: width 0.3s ease-in-out;
  border-radius: 4px;
}

.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.step.current {
  background-color: var(--vscode-list-hoverBackground);
}

.step.completed .step-indicator {
  background-color: var(--vscode-charts-green);
  color: white;
}

.step.current .step-indicator {
  background-color: var(--vscode-charts-blue);
  color: white;
  border-color: var(--vscode-charts-blue);
}

.step.future .step-indicator {
  background-color: var(--vscode-input-background);
  color: var(--vscode-descriptionForeground);
  border: 1px solid var(--vscode-panel-border);
}

.step-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 0.2s;
}

.checkmark {
  font-size: 1rem;
}

.step-label {
  font-size: 0.875rem;
  color: var(--vscode-foreground);
  line-height: 1.3;
}

.step.completed .step-label {
  color: var(--vscode-descriptionForeground);
}

.step.current .step-label {
  font-weight: 500;
}
</style>
