import { createApp } from 'vue';
import App from './App.vue';

console.log('[Plan Builder] Starting initialization...');

try {
  // Check if #app element exists
  const appElement = document.getElementById('app');
  if (!appElement) {
    console.error('[Plan Builder] #app element not found in DOM');
    throw new Error('Mount point #app not found');
  }

  console.log('[Plan Builder] Found #app element, creating Vue app...');
  
  // Create Vue app
  const app = createApp(App);
  console.log('[Plan Builder] Vue app created successfully');
  
  // Mount the app
  app.mount('#app');
  console.log('[Plan Builder] Vue app mounted successfully ✓');
  
  // Notify VS Code extension
  if (window.vscode) {
    window.vscode.postMessage({
      type: 'log',
      data: '[Plan Builder] Initialization complete'
    });
  }
} catch (error) {
  console.error('[Plan Builder] Initialization failed:', error);
  
  // Display error in DOM
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.innerHTML = `
      <div style="
        font-family: var(--vscode-font-family);
        color: var(--vscode-errorForeground);
        background-color: var(--vscode-editor-background);
        padding: 2rem;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="max-width: 600px; text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
          <h1 style="margin-bottom: 1rem;">Plan Builder Initialization Failed</h1>
          <p style="line-height: 1.6; margin-bottom: 1rem;">
            The Plan Builder failed to initialize. Please check the browser console for details.
          </p>
          <pre style="
            background: var(--vscode-textCodeBlock-background);
            padding: 1rem;
            border-radius: 4px;
            text-align: left;
            overflow-x: auto;
            font-size: 0.875rem;
          ">${error instanceof Error ? error.message : String(error)}</pre>
        </div>
      </div>
    `;
  }
  
  // Notify VS Code extension
  if (window.vscode) {
    window.vscode.postMessage({
      type: 'error',
      data: `[Plan Builder] Failed to initialize: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}
