# Plan Builder Setup & Troubleshooting

This guide helps you set up and troubleshoot the Interactive Plan Builder in the Copilot Orchestration Extension.

## Prerequisites

- Node.js 18+ installed
- VS Code 1.90.0 or newer
- Extension dependencies installed (`npm install` in `vscode-extension/` directory)

## Building the Plan Builder

The Plan Builder uses a Vue 3 app that must be built before it can run in the VS Code webview.

### Quick Setup

```bash
cd vscode-extension
npm install
npm run build:vue  # Build just the Vue app
```

Or use the all-in-one command:

```bash
npm run compile  # Builds extension + Vue app + MCP server
```

### What Each Command Does

1. **`npm install`** - Installs all dependencies (Vue, Vite, TypeScript, etc.)
2. **`npm run build:vue`** - Builds the Vue app with Vite, outputs to `dist/planBuilder/`
3. **`npm run compile`** - Builds everything: Webpack extension + Vue app + MCP server

**Note:** `npm run compile` already includes `build:vue`, so you don't need to run both.

### Build Scripts Explained

From `package.json`:

```json
{
  "scripts": {
    "compile": "webpack --mode production && npm run build:vue && npm run build:mcp",
    "build:vue": "vite build",
    "watch": "webpack --watch --mode development"
  }
}
```

- **`compile`** runs everything needed for production
- **`build:vue`** specifically builds just the Plan Builder UI
- **`watch`** is for development - auto-rebuilds on code changes

## Opening the Plan Builder

1. **From Command Palette** (Ctrl/Cmd+Shift+P):
   ```
   Copilot Orchestrator: Open Plan Builder
   ```

2. **From Extension Sidebar**:
   - Click the Copilot Orchestrator icon
   - Click "Create New Plan" button

## Troubleshooting

### Issue: "Plan Builder Not Built" Error

**Symptoms:**
- Webview shows error page saying "Plan Builder assets not found"
- Console shows: `Plan Builder assets not found. Run "npm run build:vue"`

**Solution:**
```bash
cd vscode-extension
npm run build:vue
# Reload VS Code window (Ctrl/Cmd+R)
```

**Why This Happens:**
- The Vue app assets (`dist/planBuilder/assets/main-*.js` and `main-*.css`) are generated at build time
- Git ignores `dist/` folder, so these files don't exist after cloning
- You must build them locally before using the Plan Builder

### Issue: Blank White Screen

**Symptoms:**
- Webview opens but shows completely blank white page
- No error messages in console

**Possible Causes & Solutions:**

1. **Assets Not Built** (most common)
   ```bash
   npm run build:vue
   ```

2. **CSP (Content Security Policy) Blocking Scripts**
   - Check VS Code Developer Tools (Help → Toggle Developer Tools)
   - Look for CSP errors in Console
   - Fixed in latest version with `'unsafe-eval'` for Vue runtime

3. **Asset Path Mismatch**
   - Old issue: hardcoded asset hashes in `planBuilderPanel.ts`
   - ✅ Fixed: Now uses dynamic asset discovery
   - Assets are discovered at runtime, so hash changes don't break things

### Issue: TypeScript Compilation Errors

**Symptoms:**
```
ERROR in src/config/llmTimeouts.test.ts
extension compiled with X errors
```

**Solution:**
- These are pre-existing test file errors unrelated to Plan Builder
- The extension should still work despite these warnings
- Plan Builder tests (`TemplateService.test.ts`) all pass ✅

**Verify:**
```bash
npm run test:jest -- src/planBuilder/services/TemplateService.test.ts
# Should show: 29 tests passed
```

### Issue: No Templates Showing

**Symptoms:**
- Template selector is empty or shows "No templates found"

**Check Template Files:**
```bash
ls -la templates/plan-templates/
# Should show:
# - blank-template.json
# - web-app-template.json
# - api-service-template.json
# - cli-tool-template.json
# - library-template.json
```

**Verify Templates Load:**
```bash
npm run test:jest -- src/planBuilder/services/TemplateService.test.ts
```

## Using the Blank Template

The new **Blank Project Guide** template (added in this PR) provides a guided starting point for any project:

1. Open Plan Builder
2. Click "📋 Use Template" button
3. Filter by "Blank" category or search for "blank"
4. Select "Blank Project Guide"
5. Follow the 📝 GUIDE comments in each section

### What Makes It Helpful

- **Comprehensive Structure**: Covers all plan sections (project, architecture, features, timeline, team, QA, deployment, risks, etc.)
- **Inline Guidance**: Every field has 📝 GUIDE comments explaining what to fill in
- **Quick Start Tips**: Includes helpful tips and next steps
- **Flexible**: Works for any project type (web, API, CLI, library, custom)
- **Learning Tool**: Great for understanding how the Plan Builder works

## Architecture: How Plan Builder Works

```
┌─────────────────────────────────────────────┐
│  VS Code Extension (TypeScript)             │
│  - planBuilderPanel.ts                      │
│  - Manages webview lifecycle                │
│  - Dynamically discovers Vue assets         │
│  - Handles messages from webview            │
└──────────────┬──────────────────────────────┘
               │
               │ Webview API
               │
┌──────────────▼──────────────────────────────┐
│  Plan Builder UI (Vue 3)                    │
│  - resources/planBuilder/                   │
│  - WizardContainer.vue (main layout)        │
│  - TemplateSelector.vue (template picker)   │
│  - Built with Vite → dist/planBuilder/      │
└─────────────────────────────────────────────┘
```

### Asset Discovery (New in This PR)

**Old Approach (Broken):**
```typescript
// Hardcoded paths - broke every time Vite changed file hashes
const styleUri = 'dist/planBuilder/assets/main-BGWyiIlE.css';
const scriptUri = 'dist/planBuilder/assets/main--qTpEcUA.js';
```

**New Approach (Dynamic):**
```typescript
// Discover files at runtime - works with any hash
const files = fs.readdirSync('dist/planBuilder/assets/');
const cssFile = files.find(f => f.startsWith('main') && f.endsWith('.css'));
const jsFile = files.find(f => f.startsWith('main') && f.endsWith('.js'));
```

**Benefits:**
- ✅ No manual updates needed after rebuilds
- ✅ Works with Vite's content-hash naming
- ✅ Helpful error page if assets missing
- ✅ Better debugging with console logs

## Development Workflow

### Making Changes to Plan Builder

1. **Edit Vue files** in `resources/planBuilder/`
2. **Rebuild Vue app**: `npm run build:vue`
3. **Reload VS Code**: Ctrl/Cmd+R (or F5 if debugging)
4. **Test in Plan Builder**: Open the webview and verify changes

### Watch Mode (Recommended for Development)

Terminal 1 - Watch Vue app:
```bash
cd vscode-extension
npx vite build --watch
```

Terminal 2 - Watch extension:
```bash
npm run watch
```

Then just reload VS Code (Ctrl/Cmd+R) to see changes.

## Testing

### Unit Tests

```bash
# Run all Plan Builder tests
npm run test:jest -- src/planBuilder/

# Run specific test file
npm run test:jest -- src/planBuilder/services/TemplateService.test.ts

# Run with coverage
npm test -- src/planBuilder/ --coverage
```

### Manual Testing Checklist

- [ ] Plan Builder opens without errors
- [ ] Templates load and display correctly
- [ ] Blank template appears first (after "All")
- [ ] Blank template contains 📝 GUIDE comments
- [ ] Template selector filters work (category, search)
- [ ] Wizard pages navigate correctly
- [ ] Plan saves successfully
- [ ] No console errors in Developer Tools

## Files Modified in This PR

### Phase 1: Blank Template Support
- ✅ `src/planBuilder/types/PlanTemplate.ts` - Added 'blank' category and guidance fields
- ✅ `src/planBuilder/services/TemplateService.ts` - Added 'blank' to valid categories
- ✅ `src/planBuilder/services/TemplateService.test.ts` - Added blank template tests
- ✅ `src/planBuilder/components/TemplateSelector.vue` - Added blank category button
- ✅ `templates/plan-templates/README.md` - Documented blank template
- ✅ `templates/plan-templates/blank-template.json` - Pre-existing, now integrated

### Phase 2: Dynamic Asset Discovery
- ✅ `src/panels/planBuilderPanel.ts` - Dynamic asset discovery, improved CSP, error page
- ✅ `dist/planBuilder/assets/` - Built Vue app (gitignored, must build locally)

### Phase 3: File Import (Future Enhancement)
- ⏸️ Deferred - Complex feature, not critical blocker
- 📝 Would add: `FileImporter.vue`, context processing endpoint

## Known Issues

1. **Pre-existing TypeScript errors** in `llmTimeouts.test.ts`
   - Not related to Plan Builder
   - Does not affect runtime functionality
   - Plan Builder tests all pass (29/29 ✅)

2. **Cannot test webview in CI**
   - Webview requires VS Code runtime
   - Manual testing required for visual verification

## Support

If you encounter issues not covered here:

1. Check VS Code Developer Tools (Help → Toggle Developer Tools)
2. Look for errors in the Console tab
3. Run `npm run test:jest -- src/planBuilder/` to verify tests pass
4. Ensure you've run `npm run build:vue` after pulling latest changes

## References

- **Vite Configuration**: `vscode-extension/vite.config.mjs`
- **Vue App Entry**: `vscode-extension/resources/planBuilder/main.ts`
- **Template Documentation**: `vscode-extension/templates/plan-templates/README.md`
- **PRD Feature**: F001 (Interactive Plan Builder), F004 (Template Library)
