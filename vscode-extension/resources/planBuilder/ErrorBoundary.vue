<template>
  <div v-if="error" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">❌</div>
      <h2>An Error Occurred</h2>
      <p class="error-message">{{ error.message }}</p>
      <details v-if="error.stack" class="error-details">
        <summary>Technical Details</summary>
        <pre class="error-stack">{{ error.stack }}</pre>
      </details>
      <div class="error-actions">
        <button @click="resetError" class="retry-button">
          Try Again
        </button>
        <button @click="reportError" class="report-button">
          Report Issue
        </button>
      </div>
    </div>
  </div>
  <div v-else class="error-boundary-slot">
    <slot />
  </div>
</template>

<script setup lang="ts">
/// <reference path="./types/vscode.d.ts" />
import { ref, onErrorCaptured } from 'vue';

const error = ref<Error | null>(null);

onErrorCaptured((err: any) => {
  console.error('[ErrorBoundary] Error caught:', err);
  error.value = err instanceof Error ? err : new Error(String(err));
  
  // Notify VS Code extension
  if (window.vscode) {
    window.vscode.postMessage({
      type: 'error',
      data: `[Plan Builder] Component error: ${error.value.message}`
    });
  }
  
  // Prevent error from propagating
  return false;
});

function resetError() {
  console.log('[ErrorBoundary] Resetting error state');
  error.value = null;
}

function reportError() {
  if (!error.value) return;
  
  const errorInfo = {
    message: error.value.message,
    stack: error.value.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  console.log('[ErrorBoundary] Error info for reporting:', errorInfo);
  
  // Notify VS Code extension
  if (window.vscode) {
    window.vscode.postMessage({
      type: 'reportError',
      data: errorInfo
    });
  }
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  padding: 2rem;
}

.error-content {
  max-width: 700px;
  width: 100%;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 4rem;
  text-align: center;
  margin-bottom: 1rem;
}

h2 {
  color: var(--vscode-errorForeground);
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  text-align: center;
}

.error-message {
  color: var(--vscode-foreground);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  text-align: center;
}

.error-details {
  margin-bottom: 1.5rem;
}

.error-details summary {
  cursor: pointer;
  color: var(--vscode-textLink-foreground);
  margin-bottom: 0.5rem;
  user-select: none;
}

.error-details summary:hover {
  color: var(--vscode-textLink-activeForeground);
}

.error-stack {
  background-color: var(--vscode-textCodeBlock-background);
  color: var(--vscode-editor-foreground);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: var(--vscode-editor-font-family);
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0.5rem 0 0 0;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.retry-button,
.report-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: var(--vscode-font-family);
  transition: all 0.2s ease;
}

.retry-button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.retry-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.report-button {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.report-button:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.error-boundary-slot {
  width: 100%;
  height: 100%;
}
</style>
