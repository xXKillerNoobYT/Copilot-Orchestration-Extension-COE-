<template>
  <ErrorBoundary>
    <div class="plan-builder-app">
      <WizardContainer
        wizard-title="Interactive Plan Builder"
        wizard-description="Create a comprehensive project plan in 10 guided steps"
        :user-role="userRole"
        :show-sidebar="true"
        :show-preview-panel="false"
        :show-time-estimate="true"
      />
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import WizardContainer from './WizardContainer.vue';
import ErrorBoundary from './ErrorBoundary.vue';

// User role for time estimate calculations
const userRole = ref<'designer' | 'analyst' | 'architect' | undefined>();

// Lifecycle hooks
onMounted(() => {
  console.log('[App] Component mounted successfully');
  
  // Listen for messages from VS Code extension
  window.addEventListener('message', handleVSCodeMessage);
  console.log('[App] Message listener registered');

  // Send ready message to VS Code extension
  if (window.vscode) {
    window.vscode.postMessage({ type: 'wizardReady' });
    console.log('[App] Sent wizardReady message to VS Code');
  } else {
    console.warn('[App] VS Code API not available');
  }
});

// Handle messages from VS Code extension
function handleVSCodeMessage(event: MessageEvent) {
  console.log('[App] Message received from VS Code:', event.data);
  const message = event.data;

  switch (message.type) {
    case 'setUserRole':
      userRole.value = message.data as 'designer' | 'analyst' | 'architect';
      console.log('[App] User role set to:', userRole.value);
      break;

    case 'planComplete':
      // Plan completion is handled by WizardContainer
      // This is where we can intercept and handle plan export to backend
      console.log('[App] Plan completion triggered');
      handlePlanCompletion(message.data);
      break;
      
    default:
      console.log('[App] Unknown message type:', message.type);
  }
}

// Handle plan completion - send to backend via MCP
async function handlePlanCompletion(plan: Record<string, unknown>) {
  try {
    // Send plan to VS Code extension for backend processing
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'planGenerated',
        data: plan,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[App.vue] Plan generated and sent to extension');
  } catch (error) {
    console.error('[App.vue] Failed to handle plan completion:', error);
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'planError',
        error: String(error)
      });
    }
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
  width: 100%;
  height: 100%;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
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
