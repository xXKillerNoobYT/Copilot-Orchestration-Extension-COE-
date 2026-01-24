<template>
  <div v-if="visible" class="modal-overlay" @click="handleCancel">
    <div 
      class="modal-content" 
      @click.stop
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="modal-header">
        <h2 :id="titleId">{{ title }}</h2>
        <button class="modal-close" @click="handleCancel" aria-label="Close dialog">✕</button>
      </div>

      <div class="modal-body">
        <p class="modal-message">{{ message }}</p>
      </div>

      <div class="modal-footer">
        <button ref="cancelButton" class="btn btn-secondary" @click="handleCancel">
          {{ cancelText }}
        </button>
        <button ref="confirmButton" class="btn btn-primary" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';

interface Props {
  visible: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const titleId = 'confirm-dialog-title';
const confirmButton = ref<HTMLButtonElement | null>(null);
const cancelButton = ref<HTMLButtonElement | null>(null);
let previouslyFocusedElement: HTMLElement | null = null;
let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

const handleConfirm = () => {
  emit('confirm');
  restoreFocus();
};

const handleCancel = () => {
  emit('cancel');
  restoreFocus();
};

const restoreFocus = () => {
  if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
    previouslyFocusedElement = null;
  }
};

// Handle Escape key and focus management
watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    // Save currently focused element
    previouslyFocusedElement = document.activeElement as HTMLElement;
    
    // Set up keyboard handler
    keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
      
      // Focus trap - Tab key navigation
      if (event.key === 'Tab') {
        const focusableElements = [cancelButton.value, confirmButton.value].filter(Boolean);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    window.addEventListener('keydown', keydownHandler);
    
    // Focus the primary button after render
    await nextTick();
    confirmButton.value?.focus();
  } else {
    // Clean up keyboard handler
    if (keydownHandler) {
      window.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
  }
});

// Clean up on component unmount
onUnmounted(() => {
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
  restoreFocus();
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  min-width: 400px;
  max-width: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
}

.modal-close {
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--vscode-editor-foreground);
  font-size: 20px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.modal-close:hover {
  opacity: 1;
}

.modal-body {
  padding: 20px;
}

.modal-message {
  margin: 0;
  line-height: 1.5;
  color: var(--vscode-editor-foreground);
  white-space: pre-wrap;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-panel-border);
}

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
</style>
