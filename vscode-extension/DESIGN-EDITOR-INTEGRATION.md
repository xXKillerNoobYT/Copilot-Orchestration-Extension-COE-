# Design Editor Integration Guide

## Overview
This guide covers integrating the Visual Design System Editor (Vue 3) into the VS Code extension.

## Quick Start

### 1. Register the Design Editor Command

In `src/extension.ts`:

```typescript
import { DesignEditorPanel } from './panels/designEditorPanel';

export function activate(context: vscode.ExtensionContext) {
  // Register Design Editor command
  context.subscriptions.push(
    vscode.commands.registerCommand('planBuilder.openDesignEditor', async () => {
      await DesignEditorPanel.render(context.extensionUri);
    })
  );
}
```

### 2. Create Design Editor Panel

Create `src/panels/designEditorPanel.ts`:

```typescript
import * as vscode from 'vscode';
import { getUri } from '../utilities/getUri';
import { getNonce } from '../utilities/getNonce';

export class DesignEditorPanel {
  public static currentPanel: DesignEditorPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static async render(extensionUri: vscode.Uri) {
    if (DesignEditorPanel.currentPanel) {
      DesignEditorPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'designEditor',
        'Design System Editor',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'resources'),
          ],
        }
      );

      DesignEditorPanel.currentPanel = new DesignEditorPanel(
        panel,
        extensionUri
      );
    }
  }

  private _getWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ): string {
    const styleUri = getUri(webview, extensionUri, [
      'resources',
      'planBuilder',
      'style.css',
    ]);
    const scriptUri = getUri(webview, extensionUri, [
      'resources',
      'planBuilder',
      'main.js',
    ]);
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link rel="stylesheet" href="${styleUri}">
        <title>Design System Editor</title>
      </head>
      <body>
        <div id="app"></div>
        <script type="module" nonce="${nonce}" src="${scriptUri}"><\/script>
      </body>
      </html>`;
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: Record<string, any>) => {
        const command = message.type;

        switch (command) {
          case 'exportDesignTokens':
            await this._handleExport(message.payload);
            break;
          case 'saveDesignTokens':
            await this._handleSave(message.payload);
            break;
          case 'loadDesignTokens':
            await this._handleLoad(webview);
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private async _handleExport(payload: {
    format: 'json' | 'tailwind' | 'css';
    tokens: any;
    timestamp: string;
  }) {
    const { format, tokens } = payload;
    let filename: string;
    let content: string;

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    if (format === 'json') {
      filename = `design-tokens-${timestamp}.json`;
      content = JSON.stringify(tokens, null, 2);
    } else if (format === 'tailwind') {
      filename = `tailwind.config.js`;
      // Use tokenGenerator to create config
      content = this._generateTailwindConfig(tokens);
    } else {
      filename = `design-tokens-${timestamp}.css`;
      content = this._generateCssVariables(tokens);
    }

    // Open save dialog
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(filename),
      filters: {
        [format.toUpperCase()]: [format === 'tailwind' ? 'js' : format],
      },
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(
        uri,
        new TextEncoder().encode(content)
      );
      vscode.window.showInformationMessage(
        `Design tokens exported to ${uri.fsPath}`
      );
    }
  }

  private async _handleSave(payload: {
    filename: string;
    tokens: any;
    timestamp: string;
  }) {
    const { filename, tokens } = payload;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const uri = vscode.Uri.joinPath(
      workspaceFolder.uri,
      'design-tokens',
      `${filename}.json`
    );

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.createDirectory(uri.with({ path: uri.path.substring(0, uri.path.lastIndexOf('/')) }));
    } catch (e) {
      // Directory may already exist
    }

    await vscode.workspace.fs.writeFile(
      uri,
      new TextEncoder().encode(JSON.stringify(tokens, null, 2))
    );

    vscode.window.showInformationMessage(
      `Design tokens saved to ${uri.fsPath}`
    );
  }

  private async _handleLoad(webview: vscode.Webview) {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      filters: {
        'JSON': ['json'],
      },
    });

    if (uri && uri[0]) {
      const content = await vscode.workspace.fs.readFile(uri[0]);
      const text = new TextDecoder().decode(content);
      const tokens = JSON.parse(text);

      webview.postMessage({
        type: 'designTokensLoaded',
        tokens,
      });
    }
  }

  private _generateTailwindConfig(tokens: any): string {
    // Use tokenGenerator utility
    const { DesignTokenGenerator } = require('../planBuilder/designSystem/tokenGenerator');
    const generator = new DesignTokenGenerator();
    return generator.generate(tokens, 'tailwind');
  }

  private _generateCssVariables(tokens: any): string {
    // Use tokenGenerator utility
    const { DesignTokenGenerator } = require('../planBuilder/designSystem/tokenGenerator');
    const generator = new DesignTokenGenerator();
    return generator.generate(tokens, 'css');
  }
}
```

### 3. Update Main App

In `resources/planBuilder/main.ts`:

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import DesignEditor from './DesignEditor.vue';

const app = createApp(App);

// Register Design Editor component
app.component('DesignEditor', DesignEditor);

app.mount('#app');
```

### 4. Build Configuration

Update `vite.config.js`:

```javascript
export default {
  build: {
    lib: {
      entry: path.resolve(__dirname, 'resources/planBuilder/main.ts'),
      name: 'PlanBuilder',
      formats: ['umd'],
      fileName: 'main',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
};
```

### 5. Install Dependencies

```bash
npm install
```

Verify peer dependencies:
```json
{
  "vue": "^3.4.0",
  "typescript": "^5.0.2"
}
```

## Message Protocol

### From Webview → VS Code

#### Export Design Tokens
```typescript
{
  type: 'exportDesignTokens',
  payload: {
    format: 'json' | 'tailwind' | 'css',
    tokens: DesignTokens,
    timestamp: string  // ISO 8601
  }
}
```

#### Save Design Tokens
```typescript
{
  type: 'saveDesignTokens',
  payload: {
    filename: string,
    tokens: DesignTokens,
    timestamp: string
  }
}
```

#### Load Design Tokens
```typescript
{
  type: 'loadDesignTokens',
  payload: {
    action: 'pickFile'
  }
}
```

### From VS Code → Webview

#### Design Tokens Loaded
```typescript
{
  type: 'designTokensLoaded',
  tokens: DesignTokens
}
```

## File Organization

```
src/
├── panels/
│   ├── planBuilderPanel.ts (existing)
│   └── designEditorPanel.ts (new)
├── planBuilder/
│   ├── designSystem/
│   │   ├── validator.ts
│   │   ├── tokenGenerator.ts
│   │   └── __tests__/

resources/planBuilder/
├── DesignEditor.vue (new root)
├── DesignEditor/
│   ├── ColorPickerEditor.vue
│   ├── TypographyEditor.vue
│   ├── SpacingEditor.vue
│   ├── ComponentVariantEditor.vue
│   ├── PreviewPanel.vue
│   ├── ExportPanel.vue
│   └── __tests__/
```

## Testing

### Run Unit Tests
```bash
npm run test
```

### Run Component Tests
```bash
npm run test -- DesignEditor
```

### Build for Production
```bash
npm run build
```

## Troubleshooting

### Imports Not Found
- Ensure TypeScript `moduleResolution` is set to `node` in `tsconfig.json`
- Verify all relative paths use `../../` correctly

### Vue Components Not Rendering
- Check that `vue` is imported in `main.ts`
- Verify `app.mount('#app')` targets the correct DOM element
- Check browser console for Vue warnings

### Styles Not Applied
- Verify CSS files are included in the Vite build
- Check VS Code webview `localResourceRoots` configuration
- Ensure Tailwind/PostCSS processing is configured

## Performance Optimization

1. **Lazy Load Heavy Components**
```typescript
const PreviewPanel = defineAsyncComponent(() => import('./PreviewPanel.vue'));
```

2. **Memoize Expensive Computations**
```typescript
const previewStyle = computed(() => {
  // Computed properties are memoized automatically
});
```

3. **Debounce Input Events**
```typescript
const debouncedUpdate = debounce((value) => {
  emit('update:value', value);
}, 300);
```

## Related Resources

- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Vue 3 Documentation](https://vuejs.org/guide/introduction.html)
- [Design Tokens Community](https://design-tokens.github.io/community-group/)
