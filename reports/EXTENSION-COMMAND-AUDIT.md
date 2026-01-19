# Extension Command Registration Audit Report
**Date**: January 19, 2026  
**Status**: ERRORS FOUND ⚠️  
**Type**: Configuration Mismatch

---

## 🔴 CRITICAL ISSUES FOUND

### Issue 1: Missing Commands in package.json (not declared in manifest)

Commands ARE registered in code but NOT declared in `package.json` contributions:

1. ❌ **copilot-orchestrator.planningPhase**
   - Location in code: `extension.ts` line 656
   - Status: Registered but NOT in manifest
   - Impact: Command won't be discoverable or appear in UI

2. ❌ **copilot-orchestrator.aiDevPlanning**
   - Referenced in code (extension.ts)
   - Status: Used but NOT registered or in manifest
   - Impact: Command fails at runtime

3. ❌ **copilot-orchestrator.guidanceExecution**
   - Referenced in code (extension.ts)
   - Status: Used but NOT registered or in manifest
   - Impact: Command fails at runtime

4. ❌ **copilot-orchestrator.reviewCompletion**
   - Referenced in code (extension.ts)
   - Status: Used but NOT registered or in manifest
   - Impact: Command fails at runtime

5. ❌ **copilot-orchestrator.detectPlanDrift**
   - Referenced in code (tree view)
   - Status: Not registered anywhere
   - Impact: Command fails at runtime

### Issue 2: Commands in package.json but NOT registered in code

1. ✅ **copilot-orchestrator.showPanel** - Registered (line 620)
2. ✅ **copilot-orchestrator.refreshTasks** - Registered (line 505, 526)
3. ✅ **copilot-orchestrator.showGraph** - Registered (line 534)
4. ✅ **copilot-orchestrator.showDependencies** - Registered (line 564)
5. ✅ **copilot-orchestrator.showStatusMenu** - Registered (line 139)
6. ✅ **copilot-orchestrator.start** - Registered (line 118)
7. ✅ **copilot-orchestrator.configureLLM** - Registered (line 131)
8. ✅ **copilot-orchestrator.testConnection** - Registered (line 284)
9. ✅ **copilot-orchestrator.executeLLM** - Registered (line 290)
10. ✅ **copilot-orchestrator.testWebSocket** - Registered (line 224)
11. ✅ **copilot-orchestrator.connectWebSocket** - Registered (line 230)
12. ✅ **copilot-orchestrator.disconnectWebSocket** - Registered (line 277)
13. ✅ **copilot-orchestrator.configureWebSocket** - Registered (line 218)
14. ✅ **copilot-orchestrator.showConnectionDetails** - Registered (line 155)
15. ✅ **copilot-orchestrator.showVisualVerification** - Registered (line 166)
16. ✅ **copilot-orchestrator.openPlanAdjustmentWizard** - Registered (line 184)
17. ✅ **copilot-orchestrator.openPlanBuilder** - Registered (line 202)
18. ✅ **copilot-orchestrator.showAuditDashboard** - Registered (line 211)

**Status**: ✅ All declared commands are registered

### Issue 3: Referenced but NOT registered in code

Commands used in UI/tree views but not registered:

- ❌ **copilot-orchestrator.startAutoLoop** - Called but need to verify registration
- ❌ **copilot-orchestrator.stopAutoLoop** - Called but need to verify registration
- ❌ **copilot-orchestrator.autoLoopStatus** - Called but need to verify registration
- ❌ **copilot-orchestrator.executeSingleCycle** - Called but need to verify registration
- ❌ **copilot-orchestrator.openGitHubIssue** - In package.json but need registration check
- ❌ **copilot-orchestrator.linkGitHubIssue** - In package.json but need registration check

---

## 📋 Related Issues from User Report

### Backend/Runtime Issues

1. **Could not fetch checklist from backend**
   - Likely: Backend server not running
   - File: May be in settingsPanel.ts or verification panel

2. **No plans found in workspace**
   - Issue: Plans folder not in expected location
   - Fix: Need to check default plan locations (Docs/Plans/)

3. **MCP Request Failed: Unable to connect to server**
   - Issue: MCP server not running
   - Port: Check if WebSocket/MCP server is configured

4. **Failed to start agent loop: fetch failed**
   - Issue: Backend API not reachable
   - Already fixed: Added better error messages in agentLoopService.ts

---

## ✅ SOLUTIONS & FIXES NEEDED

### Fix 1: Register Missing Commands in extension.ts

Add these command registrations to `extension.ts`:

```typescript
// Planning Phase Commands - MISSING
vscode.commands.registerCommand('copilot-orchestrator.planningPhase', ...)
vscode.commands.registerCommand('copilot-orchestrator.aiDevPlanning', ...)
vscode.commands.registerCommand('copilot-orchestrator.guidanceExecution', ...)
vscode.commands.registerCommand('copilot-orchestrator.reviewCompletion', ...)
vscode.commands.registerCommand('copilot-orchestrator.detectPlanDrift', ...)

// Auto Agent Loop - VERIFY REGISTRATION
vscode.commands.registerCommand('copilot-orchestrator.startAutoLoop', ...)
vscode.commands.registerCommand('copilot-orchestrator.stopAutoLoop', ...)
vscode.commands.registerCommand('copilot-orchestrator.autoLoopStatus', ...)
vscode.commands.registerCommand('copilot-orchestrator.executeSingleCycle', ...)
```

### Fix 2: Add Missing Commands to package.json

Add command contributions to `package.json`:

```json
{
  "command": "copilot-orchestrator.planningPhase",
  "title": "Planning Phase",
  "category": "Copilot Orchestrator"
},
{
  "command": "copilot-orchestrator.aiDevPlanning",
  "title": "AI Development Planning",
  "category": "Copilot Orchestrator"
},
{
  "command": "copilot-orchestrator.guidanceExecution",
  "title": "Guidance & Execution",
  "category": "Copilot Orchestrator"
},
{
  "command": "copilot-orchestrator.reviewCompletion",
  "title": "Review & Completion",
  "category": "Copilot Orchestrator"
},
{
  "command": "copilot-orchestrator.detectPlanDrift",
  "title": "Detect Plan Drift",
  "category": "Copilot Orchestrator"
},
{
  "command": "copilot-orchestrator.startAutoLoop",
  "title": "Start Auto Loop",
  "category": "Copilot Orchestrator"
},
{
  "command": "copilot-orchestrator.stopAutoLoop",
  "title": "Stop Auto Loop",
  "category": "Copilot Orchestrator"
},
{
  "command": "copilot-orchestrator.autoLoopStatus",
  "title": "Auto Loop Status",
  "category": "Copilot Orchestrator"
},
{
  "command": "copilot-orchestrator.executeSingleCycle",
  "title": "Execute Single Cycle",
  "category": "Copilot Orchestrator"
}
```

### Fix 3: Verify Extension Compilation

After fixes, must verify:
- ✅ No TypeScript errors: `npm run compile`
- ✅ All commands in package.json: Check `commands` array
- ✅ All code registrations: Check `extension.ts`
- ✅ Test UI loads: Extension activation test

---

## 🚀 DEVELOPMENT CHECKLIST FOR FUTURE MODIFICATIONS

When modifying extension code, verify:

### Pre-Commit Checklist
- [ ] **Command Consistency**: Every `vscode.commands.registerCommand()` has matching entry in `package.json`
- [ ] **Code Compilation**: `npm run compile` succeeds with 0 errors
- [ ] **TypeScript Check**: `npx tsc --noEmit` passes
- [ ] **No Console Errors**: Extension loads without errors
- [ ] **All Tests Pass**: `npm run test:jest -- --testNamePattern="extension|command"`

### Command Registration Checklist
- [ ] For EACH new command:
  1. Add `vscode.commands.registerCommand('copilot-orchestrator.commandName', ...)`
  2. Add to `package.json` contributions.commands array
  3. Add keyboard binding if needed (package.json keybindings)
  4. Add to tree view if needed (package.json views)
  5. Test command is discoverable: `Ctrl+Shift+P` search for command name

### Configuration Files Checklist
- [ ] **package.json**: All `commands` referenced in code exist in manifest
- [ ] **package.json**: All menu items reference registered commands
- [ ] **package.json**: All keybindings reference registered commands
- [ ] **extension.ts**: All registered commands are in package.json
- [ ] **Code files**: All `executeCommand()` calls reference existing commands

### Testing Checklist
- [ ] Command accessible from command palette (Ctrl+Shift+P)
- [ ] Command accessible from tree view context menu (if applicable)
- [ ] Command accessible from VS Code menu (if applicable)
- [ ] Command executes without errors
- [ ] Command displays proper error messages if it fails

---

## 📊 Summary

| Category | Status | Count | Action |
|----------|--------|-------|--------|
| Registered in code | ✅ | 18 | All OK |
| In package.json | ✅ | 18 | All OK |
| Missing from manifest | ❌ | 5 | **FIX NEEDED** |
| Missing registration | ❌ | 4 | **VERIFY** |

**Overall**: 5 critical issues need fixing before extension works properly

---

## 🎯 Recommended Action Plan

1. **IMMEDIATE** (5 min): Register missing 5 commands in extension.ts
2. **IMMEDIATE** (5 min): Add 5 commands to package.json
3. **IMMEDIATE** (2 min): Verify auto-agent-loop commands are registered
4. **VERIFY** (2 min): Compile and test extension loads
5. **ADOPT** (20 min): Create command validation test
6. **ADOPT** (30 min): Add pre-commit checklist to development process

This will prevent "command not found" errors in the future!
