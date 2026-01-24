# Plan Builder Troubleshooting Guide

This guide helps you diagnose and fix issues with the Interactive Plan Builder panel in the Copilot Orchestration Extension.

## Table of Contents
- [Common Issues](#common-issues)
  - [Blank White Screen](#blank-white-screen)
  - [Build Assets Not Found](#build-assets-not-found)
  - [Vue Initialization Errors](#vue-initialization-errors)
  - [CSP Violations](#csp-violations)
- [Diagnostic Steps](#diagnostic-steps)
- [Build Instructions](#build-instructions)
- [Error Messages Reference](#error-messages-reference)

---

## Common Issues

### Blank White Screen

**Symptom:** Plan Builder panel opens but shows a completely white screen with no UI elements.

**Likely Causes:**
1. Vue app build files are missing or outdated
2. Asset file hashes don't match (after rebuild)
3. Vue app failed to initialize
4. JavaScript errors preventing rendering

**Solution:**

**Step 1: Check Browser Console**
```
1. Open Plan Builder panel
2. Press F1 or Ctrl+Shift+P
3. Type "Developer: Toggle Developer Tools"
4. Press Enter
5. Click "Console" tab
6. Look for error messages
```

Expected console output (if working):
```
[Plan Builder] Starting initialization...
[Plan Builder] Found #app element, creating Vue app...
[Plan Builder] Vue app created successfully
[Plan Builder] Vue app mounted successfully ✓
[App] Component mounted successfully
[App] Message listener registered
[App] Sent wizardReady message to VS Code
```

**Step 2: Check Network Tab**
```
1. In Developer Tools, click "Network" tab
2. Reload the Plan Builder panel (close and reopen)
3. Look for main-*.css and main-*.js files
4. Status should be 200 (green) if loaded successfully
5. Status 404 (red) means file path is incorrect
```

**Step 3: Rebuild Vue App**
```bash
cd vscode-extension
npm install                # Install dependencies if needed
npm run build:vue          # Build Vue app
```

**Step 4: Reload VS Code**
```
Press Ctrl+R (Windows/Linux) or Cmd+R (Mac) to reload VS Code
Then open Plan Builder again
```

---

### Build Assets Not Found

**Symptom:** Error message in panel: "Plan Builder Not Built"

**Full Error:**
```
❌ Plan Builder Failed to Load

The Plan Builder Vue app has not been built yet. 
Please run npm run build:vue in the vscode-extension directory, 
then reload VS Code.
```

**Solution:**

**Step 1: Check if build output exists**
```bash
cd vscode-extension
ls -la dist/planBuilder/assets/
```

Expected output:
```
main-XXXXXXXX.css
main-XXXXXXXX.js
```

**Step 2: If files are missing, rebuild**
```bash
npm run build:vue
```

**Step 3: Verify build succeeded**
```bash
ls -la dist/planBuilder/assets/
```

You should see CSS and JS files with hash suffixes.

**Step 4: Reload VS Code**
```
Press Ctrl+R (Cmd+R on Mac) to reload the window
```

---

### Vue Initialization Errors

**Symptom:** Error displayed in panel or console showing initialization failure

**Example Error:**
```
[Plan Builder] Initialization failed: Error: Mount point #app not found
```

**Causes:**
1. HTML template missing `<div id="app"></div>`
2. Vue createApp() failed
3. app.mount() threw an error

**Solution:**

**Check Console for Specific Error:**
Look for the exact error message in browser console (Developer Tools → Console)

**Common Error: "Mount point #app not found"**
- The `index.html` is missing the `<div id="app"></div>` element
- Check `vscode-extension/resources/planBuilder/index.html`
- Should contain: `<div id="app"></div>` in `<body>`

**Common Error: "Cannot read properties of undefined"**
- Component import failed
- Check that WizardContainer.vue exists
- Check imports in App.vue

**Rebuild and Test:**
```bash
cd vscode-extension
npm run build:vue
# Reload VS Code and try again
```

---

### CSP Violations

**Symptom:** Console shows Content Security Policy errors

**Example Error:**
```
Refused to execute inline script because it violates the following 
Content Security Policy directive: "script-src 'nonce-XXXXX'"
```

**Explanation:**
VS Code webviews enforce strict Content Security Policies (CSP) to prevent XSS attacks. The Plan Builder needs:
- `unsafe-eval` for Vue 3 runtime compilation
- `unsafe-inline` for Vue's runtime styles
- `nonce-{random}` for trusted scripts

**Current CSP (in planBuilderPanel.ts):**
```typescript
default-src 'none'; 
style-src ${webview.cspSource} 'unsafe-inline'; 
script-src 'nonce-${nonce}' 'unsafe-eval'; 
img-src ${webview.cspSource} data:; 
font-src ${webview.cspSource};
```

**Solution:**

If you see CSP errors:

1. **Verify nonce attribute matches:**
   - HTML script tags must have `nonce="${nonce}"`
   - CSP header must include `'nonce-${nonce}'`
   - Both should use the same generated nonce value

2. **Check if 'unsafe-eval' is present:**
   - Required for Vue 3 runtime
   - Should be in `script-src` directive

3. **For production builds:**
   - Pre-compile Vue templates to avoid `unsafe-eval`
   - Use build-time template compilation

**If CSP is too restrictive:**
Edit `vscode-extension/src/panels/planBuilderPanel.ts`:
```typescript
// Line ~370: Update CSP to allow required features
content="default-src 'none'; 
         style-src ${webview.cspSource} 'unsafe-inline'; 
         script-src 'nonce-${nonce}' 'unsafe-eval'; 
         img-src ${webview.cspSource} data:;"
```

---

## Diagnostic Steps

### Complete Troubleshooting Workflow

**Step 1: Check Build Output**
```bash
cd vscode-extension
ls -la dist/planBuilder/assets/

# Expected output:
# main-XXXXXX.css
# main-XXXXXX.js
```

If empty or missing:
```bash
npm install
npm run build:vue
```

---

**Step 2: Verify Asset Hashes Match**

The panel uses **dynamic asset discovery** (since this fix), so asset hashes should automatically be found. However, if you see errors:

```bash
# Check actual files
ls dist/planBuilder/assets/main-*.css
ls dist/planBuilder/assets/main-*.js

# Example output:
# dist/planBuilder/assets/main-CN5_RFEc.css
# dist/planBuilder/assets/main-Bsht73hu.js
```

The panel code in `planBuilderPanel.ts` automatically discovers these files using regex patterns.

---

**Step 3: Check Browser Console**
1. Open Plan Builder
2. Press Ctrl+Shift+P → "Developer: Toggle Developer Tools"
3. Check Console tab for errors
4. Check Network tab to see if CSS/JS loaded (green = success, red = failed)
5. Check Elements tab to see if `<div id="app">` has content

Expected console logs:
```
[Plan Builder] Starting initialization...
[Plan Builder] Found #app element, creating Vue app...
[Plan Builder] Vue app created successfully
[Plan Builder] Vue app mounted successfully ✓
[App] Component mounted successfully
```

---

**Step 4: Enable Debug Logging**

All logging is already enabled in the Vue app (`main.ts` and `App.vue`). Check browser console for detailed logs.

---

**Step 5: Check for Component Errors**

If Vue mounts but shows errors, check the **ErrorBoundary** component:
- Errors are caught and displayed in a user-friendly UI
- Technical details are shown in an expandable section
- "Try Again" button attempts to recover
- "Report Issue" button sends error info to extension

---

## Build Instructions

### Prerequisites
- Node.js 16+ installed
- npm installed
- VS Code 1.75+ installed

### Build Commands

**Full build (extension + Vue app + MCP server):**
```bash
cd vscode-extension
npm run compile
```

**Vue app only:**
```bash
cd vscode-extension
npm run build:vue
```

**Watch mode (auto-rebuild on changes):**
```bash
cd vscode-extension
npm run watch
```

### Build Output

After running `npm run build:vue`, you should see:
```
vite v7.3.1 building client environment for production...
✓ 43 modules transformed.
rendering chunks...
computing gzip size...
../../dist/planBuilder/index.html                  0.38 kB │ gzip:  0.27 kB
../../dist/planBuilder/assets/main-XXXXXXXX.css   26.71 kB │ gzip:  4.82 kB
../../dist/planBuilder/assets/main-XXXXXXXX.js   136.73 kB │ gzip: 47.85 kB
✓ built in 1.59s
```

---

## Error Messages Reference

### "Plan Builder Not Built"

**Full Message:**
```
⚠️ Plan Builder Failed to Load

The Plan Builder Vue app has not been built yet. 
Please run npm run build:vue in the vscode-extension directory, 
then reload VS Code.
```

**Fix:**
```bash
cd vscode-extension
npm run build:vue
# Press Ctrl+R in VS Code to reload
```

---

### "[Plan Builder] #app element not found in DOM"

**Console Error:**
```
[Plan Builder] #app element not found in DOM
Error: Mount point #app not found
```

**Cause:** The HTML template is missing the mount point.

**Fix:** Check `vscode-extension/resources/planBuilder/index.html` contains:
```html
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
```

---

### "[Plan Builder] Initialization failed"

**Console Error:**
```
[Plan Builder] Initialization failed: [specific error]
```

**Cause:** Vue app creation or mounting failed.

**Fix:**
1. Check the specific error message in console
2. Rebuild the Vue app: `npm run build:vue`
3. Check for component import errors
4. Verify all dependencies installed: `npm install`

---

### "Refused to execute inline script... CSP directive"

**Browser Console Error:**
```
Refused to execute inline script because it violates the following 
Content Security Policy directive: "script-src 'nonce-XXXXX'"
```

**Cause:** Script tag missing nonce attribute or CSP too restrictive.

**Fix:** 
- All inline `<script>` tags must have `nonce="${nonce}"` attribute
- CSP must include `'unsafe-eval'` for Vue runtime
- Check `planBuilderPanel.ts` CSP configuration (line ~370)

---

### "Cannot find module 'vscode'"

**Build Error:**
```
Error: Cannot find module 'vscode'
```

**Cause:** Vite is trying to bundle 'vscode' module which is only available in extension context.

**Fix:** Already handled in `vite.config.mjs`:
```javascript
rollupOptions: {
  external: ['vscode']
}
```

If error persists:
```bash
cd vscode-extension
rm -rf node_modules dist
npm install
npm run build:vue
```

---

## Advanced Troubleshooting

### Check Extension Activation

Verify the extension is activated:
```
1. Press Ctrl+Shift+P
2. Type "Developer: Show Running Extensions"
3. Look for "copilot-orchestrator"
4. Status should be "Activated"
```

### Check Extension Logs

View extension host logs:
```
1. Press Ctrl+Shift+P
2. Type "Developer: Show Logs"
3. Select "Extension Host"
4. Look for "[PlanBuilder]" messages
```

Expected logs:
```
[PlanBuilder] Webview initialized
[PlanBuilder] Wizard ready
```

### Verify File Permissions

Ensure build output has correct permissions:
```bash
cd vscode-extension
chmod -R 755 dist/
```

### Clear VS Code Cache

If issues persist, clear VS Code's cache:
```bash
# Windows
rd /s /q %APPDATA%\Code\Cache

# Mac/Linux
rm -rf ~/.config/Code/Cache
```

Then restart VS Code.

---

## Getting Help

If you've tried all troubleshooting steps and Plan Builder still doesn't work:

1. **Collect diagnostic information:**
   - VS Code version: Help → About
   - Extension version: From extension panel
   - Browser console output (full log)
   - Build output (full log)
   - Error messages (screenshots)

2. **Create a GitHub Issue:**
   - Repository: xXKillerNoobYT/Copilot-Orchestration-Extension-COE-
   - Title: "[Plan Builder] [Brief description of issue]"
   - Include all diagnostic information from step 1

3. **Check existing issues:**
   - Issue #156: Plan Builder Initial Experience Issues
   - Issue #156 Phase 3: Fix Blank Plan Builder UI (this issue)

---

## Related Documentation

- **Main README:** `vscode-extension/README.md`
- **PRD:** `PRD.json` (Feature F001: Interactive Plan Builder)
- **Implementation:** `vscode-extension/src/panels/planBuilderPanel.ts`
- **Vue App:** `vscode-extension/resources/planBuilder/`
- **Build Config:** `vscode-extension/vite.config.mjs`

---

**Last Updated:** January 19, 2026  
**Maintainer:** Copilot Orchestration Extension Team
