/**
 * Shared type definitions for VS Code webview API
 */

declare global {
  interface Window {
    vscode?: {
      postMessage(message: unknown): void;
    };
  }
}

export {};
