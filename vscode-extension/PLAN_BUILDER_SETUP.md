# Plan Builder Quick Setup Guide

**Status:** ✅ Complete and Working  
**Last Updated:** January 19, 2026

## What is Plan Builder?

The **Interactive Plan Builder** is a visual, 10-step wizard that helps you create comprehensive project plans through guided questions. It's part of the Copilot Orchestrator extension and transforms your high-level requirements into actionable task breakdowns.

### Features

- 📝 **10 Guided Questions** - Answer questions about your project to build a complete plan
- 📊 **Visual Progress Tracking** - Progress bar and sidebar navigation
- 🎨 **Theme Support** - Automatically matches VS Code light/dark theme
- 💾 **Auto-Save** - Wizard state persists when you switch panels
- 🚀 **Fast** - Opens in <2 seconds, instant input responsiveness
- 🔍 **Error Handling** - Helpful error messages if something goes wrong

---

## Quick Start (3 Steps)

### Step 1: Build the Vue App

The Plan Builder uses a Vue.js app that must be built before use.

```bash
cd vscode-extension
npm install           # Install dependencies (if not already done)
npm run build:vue     # Build the Plan Builder Vue app (takes ~2 seconds)
```

**Expected Output:**
```
✓ 43 modules transformed
✓ main-C879Mxuz.css   26.71 kB │ gzip:  4.82 kB
✓ main-wHpNLK9N.js   136.86 kB │ gzip: 47.90 kB
✓ built in 1.64s
```

### Step 2: Verify the Build

```bash
npm run verify:planBuilder
```

**Expected Output:**
```
✓ Plan Builder assets exist
```

❌ **If you see:** `✗ Plan Builder not built - run: npm run build:vue`  
→ The build didn't work. Check for errors in Step 1 output.

### Step 3: Open Plan Builder in VS Code

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type: `Copilot Orchestrator: Open Plan Builder`
4. Press Enter

**You should see:**
- ✅ Wizard interface with title "Interactive Plan Builder"
- ✅ Progress bar showing "Step 1 of 10"
- ✅ Sidebar with 10 pages listed
- ✅ Question 1 content in main area
- ✅ Navigation buttons at bottom

---

## Troubleshooting

### Problem: Blank White Screen

**What you see:**
- Panel opens
- Completely white screen
- No UI elements

**Solution:**
```bash
cd vscode-extension
npm run build:vue
# Reload VS Code: Ctrl+R or Cmd+R
```

Then open Plan Builder again.

---

### Problem: "Plan Builder Not Built" Error

**What you see:**
```
❌ Plan Builder Not Built

The Plan Builder Vue app has not been built yet.
Please run npm run build:vue in the vscode-extension directory,
then reload VS Code.
```

**Solution:**
This is actually helpful! The extension detected that assets are missing and told you exactly what to do.

```bash
cd vscode-extension
npm run build:vue
# Reload VS Code: Ctrl+R or Cmd+R
```

---

### Problem: Console Errors

**What to check:**

1. **Open Developer Tools:**
   - Command Palette → "Developer: Toggle Developer Tools"
   - Click "Console" tab

2. **Look for initialization messages:**
   ```
   [Plan Builder] Starting initialization...
   [Plan Builder] Vue app mounted successfully ✓
   [App] Component mounted successfully
   ```

3. **If you see errors:**
   - Take note of the error message
   - See [PLAN_BUILDER_TROUBLESHOOTING.md](docs/PLAN_BUILDER_TROUBLESHOOTING.md) for detailed diagnostics

---

### Problem: Changes Not Reflected

**Scenario:** You edited Vue code but changes don't appear.

**Solution:**
1. Rebuild:
   ```bash
   npm run build:vue
   ```

2. **Reload VS Code** (critical step):
   - Press `Ctrl+R` or `Cmd+R`
   - Without reload, VS Code uses cached webview

3. Open Plan Builder again

---

## Using the Plan Builder

### Navigation

**Next/Previous Buttons:**
- Click "Next" to advance to next question
- Click "Previous" to go back
- Your answers are saved automatically

**Sidebar Navigation:**
- Click any accessible page number
- Pages you've completed show a checkmark ✓
- Current page is highlighted

**Progress Bar:**
- Shows current step (e.g., "3/10")
- Visual indicator of completion

### Answering Questions

1. **Read the question carefully**
2. **Fill in all required fields** (marked with *)
3. **Click "Next" when done**
4. **Review answers** using "Previous" button if needed

### Completing the Wizard

1. **Answer all 10 questions**
2. **Click "Finish" or "Complete"** on the last page
3. **Plan is generated** and sent to the extension
4. **Tasks are created** in `.vscode/github-issues/`

You'll see a success message:
```
✓ Plan created successfully! Generating tasks...
```

---

## Performance Expectations

The Plan Builder is optimized for speed:

| Action | Expected Time |
|--------|---------------|
| Panel open | < 2 seconds |
| Initial render | < 500ms |
| Typing in input | < 10ms lag |
| Page navigation | < 100ms |
| Asset loading | < 1 second |

If performance feels slow, check:
- Developer Tools → Network tab → Asset load times
- Developer Tools → Console tab → Errors
- System resources (CPU/RAM usage)

---

## Build Commands Reference

### Essential Commands

```bash
# Build Plan Builder Vue app
npm run build:vue

# Verify Plan Builder is built
npm run verify:planBuilder

# Build entire extension (includes Plan Builder)
npm run compile

# Install dependencies
npm install

# Clean rebuild (if issues persist)
rm -rf dist/planBuilder node_modules
npm install
npm run build:vue
```

### Build Outputs

After `npm run build:vue`, you should see:

```
vscode-extension/
└── dist/
    └── planBuilder/
        ├── index.html           (~382 bytes)
        └── assets/
            ├── main-*.css       (~27 KB)
            └── main-*.js        (~137 KB)
```

**Note:** The `*` in file names is a hash (e.g., `main-C879Mxuz.css`). The extension automatically discovers these files regardless of hash.

---

## Developer Notes

### Architecture

- **Extension Panel:** `src/panels/planBuilderPanel.ts`
- **Vue App Source:** `resources/planBuilder/`
- **Build Output:** `dist/planBuilder/`
- **Build Tool:** Vite 7.3.1
- **Framework:** Vue 3.5+

### Dynamic Asset Discovery

The extension uses dynamic asset discovery (lines 356-398 in `planBuilderPanel.ts`):

```typescript
// Finds files matching: main-*.css and main-*.js
// Handles Vite's hash-based output automatically
const cssFile = files.find(f => /^(main|index)-[a-zA-Z0-9]+\.css$/.test(f));
const jsFile = files.find(f => /^(main|index)-[a-zA-Z0-9]+\.js$/.test(f));
```

This means:
- ✅ No hard-coded hashes in code
- ✅ Survives rebuild with different hashes
- ✅ Gracefully handles missing files with helpful error

### Content Security Policy

The webview CSP (line 411) allows Vue.js runtime:

```typescript
content="default-src 'none'; 
         style-src ${webview.cspSource} 'unsafe-inline'; 
         script-src 'nonce-${nonce}' 'unsafe-eval'; 
         img-src ${webview.cspSource} data:; 
         font-src ${webview.cspSource};"
```

**Why `unsafe-eval`?**
- Required for Vue 3 runtime template compilation
- Only used in webview context (sandboxed)
- Production builds should use pre-compiled templates for better security

### Error Handling

The extension has three layers of error handling:

1. **Missing Assets** → Shows build instructions (planBuilderPanel.ts)
2. **Vue Initialization Errors** → Displays error in DOM (main.ts)
3. **Component Errors** → Caught by ErrorBoundary (ErrorBoundary.vue)

---

## Testing

### Quick Smoke Test

```bash
# 1. Build
npm run build:vue

# 2. Verify
npm run verify:planBuilder

# 3. Test in VS Code
# Open Plan Builder → Should see wizard interface
```

### Comprehensive Testing

See **[PLAN_BUILDER_TEST_PLAN.md](docs/PLAN_BUILDER_TEST_PLAN.md)** for:
- 20 detailed test cases
- Acceptance criteria
- Performance benchmarks
- Edge cases
- Regression tests

### Automated Tests

```bash
# Vue component tests
npm run test:wizard

# With coverage
npm run test:wizard:coverage
```

---

## Documentation Index

### Setup & Usage
- **[PLAN_BUILDER_SETUP.md](PLAN_BUILDER_SETUP.md)** - This file (Quick start)
- **[README.md](README.md)** - Extension overview with setup instructions

### Troubleshooting
- **[PLAN_BUILDER_TROUBLESHOOTING.md](docs/PLAN_BUILDER_TROUBLESHOOTING.md)** - Complete diagnostic guide (20+ scenarios)

### Testing
- **[PLAN_BUILDER_TEST_PLAN.md](docs/PLAN_BUILDER_TEST_PLAN.md)** - Comprehensive test cases (20 tests)

### Development
- **[planBuilderPanel.ts](src/panels/planBuilderPanel.ts)** - Extension panel implementation
- **[App.vue](resources/planBuilder/App.vue)** - Main Vue app component
- **[vite.config.mjs](vite.config.mjs)** - Vite build configuration

---

## FAQ

### Q: Do I need to rebuild after `git pull`?

**A:** Maybe. Check with:
```bash
npm run verify:planBuilder
```
If it fails, run `npm run build:vue`.

### Q: Can I use Plan Builder without building?

**A:** No. The Vue app must be built first. Without it, you'll see an error message.

### Q: Why isn't the build automatic?

**A:** The build is separate to keep development faster. The extension code (TypeScript) and the Plan Builder (Vue) build independently. You only need to rebuild Plan Builder when:
- First time setup
- After updating Plan Builder code
- After `git pull` if Plan Builder changed

### Q: What if `npm run build:vue` fails?

**A:** Check:
1. Node.js version (18+ required)
2. Dependencies installed (`npm install`)
3. Error messages in console
4. TypeScript errors (`npx tsc --noEmit`)

See [PLAN_BUILDER_TROUBLESHOOTING.md](docs/PLAN_BUILDER_TROUBLESHOOTING.md) for detailed debugging.

### Q: How do I know if it's working?

**A:** You'll see the wizard interface with:
- Title: "Interactive Plan Builder"
- Description text
- Progress bar
- 10 pages in sidebar
- Question content in main area
- Next/Previous buttons

If you see a blank screen or error message, it's not working.

### Q: Can I customize the wizard questions?

**A:** Yes! Edit the Vue components in `resources/planBuilder/`. After editing, rebuild:
```bash
npm run build:vue
```
Then reload VS Code.

---

## Support

### Getting Help

1. **Check documentation:**
   - [PLAN_BUILDER_TROUBLESHOOTING.md](docs/PLAN_BUILDER_TROUBLESHOOTING.md)
   - [PLAN_BUILDER_TEST_PLAN.md](docs/PLAN_BUILDER_TEST_PLAN.md)

2. **Check Developer Tools:**
   - Command Palette → "Developer: Toggle Developer Tools"
   - Look for errors in Console tab

3. **Verify build:**
   ```bash
   npm run verify:planBuilder
   ```

4. **Try clean rebuild:**
   ```bash
   rm -rf dist/planBuilder node_modules
   npm install
   npm run build:vue
   ```

5. **File an issue on GitHub:**
   - Include VS Code version
   - Include Node.js version
   - Include error messages
   - Include build output
   - Label: `bug`, `plan-builder`, `ui-bug`

---

## Success!

If you've completed the Quick Start and the Plan Builder opens with the wizard interface visible, you're all set! 🎉

**What's next?**
- Use the Plan Builder to create your project plan
- Complete all 10 questions
- Generate tasks automatically
- Review tasks in `.vscode/github-issues/`

**Happy planning!** 🚀

---

**Last Updated:** January 19, 2026  
**Version:** Extension v0.0.1  
**Status:** ✅ Complete and working
