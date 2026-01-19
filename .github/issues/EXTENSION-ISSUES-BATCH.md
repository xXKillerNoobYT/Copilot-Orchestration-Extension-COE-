# Extension Command Registration & Error Handling Issues
## Comprehensive Issue Generation & Development Practices

---

## 🔴 ISSUE #1: Missing Command Registrations in package.json Manifest

**Title**: `[CRITICAL] Missing command declarations in package.json - 5 commands not discoverable`

**Priority**: 🔴 CRITICAL  
**Type**: Bug  
**Effort**: 30 minutes  
**Component**: VS Code Extension  

### Description

Five commands ARE implemented and registered in `extension.ts` but are NOT declared in `package.json` contributions. This causes VS Code to not recognize them, making them:

- ❌ Not discoverable in command palette (Ctrl+Shift+P)
- ❌ Not appearing in UI context menus
- ❌ Not triggering keyboard shortcuts
- ❌ Failing when called via `executeCommand()`

### Missing Commands

1. **copilot-orchestrator.planningPhase**
   - Location: `extension.ts` line 656
   - Description: Define scope, dependencies, and task structure
   - Impact: Planning workflow broken

2. **copilot-orchestrator.aiDevPlanning**
   - Location: `extension.ts` line 673
   - Description: AI-driven implementation planning
   - Impact: AI planning workflow broken

3. **copilot-orchestrator.guidanceExecution**
   - Location: `extension.ts` line 685
   - Description: Guide AI through implementation
   - Impact: Auto Zen agent loop triggering broken

4. **copilot-orchestrator.reviewCompletion**
   - Location: `extension.ts` line 698
   - Description: Verify and complete tasks
   - Impact: Task review workflow broken

5. **copilot-orchestrator.detectPlanDrift**
   - Referenced in: `extension.ts` line 854 (tree view)
   - Description: Check for plan changes/drift
   - Impact: Plan drift detection broken

### Root Cause

VS Code extension manifest (`package.json`) requires all commands to be declared in `contributes.commands` array for them to be registered properly. Commands registered in TypeScript code but not declared in manifest are treated as "orphaned" and VS Code doesn't fully initialize them.

### Acceptance Criteria

- [ ] All 5 commands added to `package.json` in `contributes.commands` array
- [ ] Each command has: `command`, `title`, and `category` fields
- [ ] Commands appear in command palette (Ctrl+Shift+P)
- [ ] Commands accessible from tree view context menus
- [ ] Extension compiles without errors
- [ ] All 5 commands callable from `executeCommand()` without errors
- [ ] Integration tests verify each command executes

### Files to Modify

- `vscode-extension/package.json` - Add 5 command contributions

### Implementation Details

Add to `package.json` contributions.commands:

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
}
```

### Related Issues

- May resolve user errors: "command 'copilot-orchestrator.planningPhase' not found"

---

## 🔴 ISSUE #2: Backend Connectivity & Error Handling - 4 Runtime Errors

**Title**: `[HIGH] Backend connectivity failures with unclear error messages`

**Priority**: 🟠 HIGH  
**Type**: Bug + Enhancement  
**Effort**: 2-3 hours  
**Component**: VS Code Extension + Backend Integration  

### Description

Users encounter 4 related error messages that indicate backend/service connectivity issues, but error handling is poor:

1. ❌ "Could not fetch checklist from backend. Using default checklist."
2. ❌ "No plans found in workspace"
3. ❌ "MCP Request Failed: Unable to connect to server"
4. ❌ "Failed to start agent loop: Start loop failed: fetch failed"

### Root Causes

1. **Checklist Fetching**: Settings panel tries to fetch from backend that isn't running
2. **Plans Not Found**: Default plan locations not checked (Docs/Plans/, .vscode/plans/)
3. **MCP Server Down**: WebSocket/MCP server port misconfigured or not started
4. **Agent Loop**: Backend API URL not configured or Laravel backend not running

### Impact

- Users don't understand what went wrong
- No guidance on how to fix issues
- Silent failures with defaults (not obvious to user)
- Development velocity reduced due to confusion

### Acceptance Criteria

- [ ] Each error has actionable message showing:
  - What failed (specific component)
  - Why it failed (root cause)
  - How to fix it (explicit steps)
- [ ] Checklist errors: Suggest checking backend URL in settings
- [ ] Plans not found: Show all checked locations
- [ ] MCP errors: Show configured URL and port
- [ ] Agent loop errors: Show backend URL and suggest `php artisan serve`
- [ ] All error messages logged to output channel
- [ ] Tests verify error messages are user-friendly
- [ ] Documentation updated with troubleshooting guide

### Example Error Messages (BEFORE)

```
Could not fetch checklist from backend. Using default checklist.
(No details on what URL was tried, why it failed, what to do)
```

### Example Error Messages (AFTER)

```
⚠️  Checklist Loading Failed

Could not fetch task checklist from backend:
  - Attempted URL: http://localhost:8000/api/v1/checklists/default
  - Error: ECONNREFUSED (connection refused)
  
Possible causes:
  ✓ Laravel backend not running
  ✓ Incorrect backend URL in settings
  ✓ Network connectivity issue

Solutions:
  1. Start backend: php artisan serve
  2. Check settings: copilot-orchestrator.backendUrl
  3. Verify network: ping localhost 8000

Using default checklist for now. Real checklist will load when backend is available.
```

### Files to Modify

- `vscode-extension/src/webviews/settingsPanel.ts` - Improve checklist fetch error handling
- `vscode-extension/src/services/mcpClient.ts` - Improve MCP error messages
- `vscode-extension/src/services/agentLoopService.ts` - Already partially fixed, enhance further
- `vscode-extension/src/views/plansViewProvider.ts` - Show which locations were checked

### Related Documentation

- Create: `vscode-extension/TROUBLESHOOTING.md` - User guide for common errors

---

## 🟠 ISSUE #3: Extension Startup Diagnostics & Health Checks

**Title**: `[MEDIUM] Add extension health check on startup with detailed diagnostics`

**Priority**: 🟠 MEDIUM  
**Type**: Feature + Enhancement  
**Effort**: 3-4 hours  
**Component**: VS Code Extension  

### Description

Implement a startup health check system that validates extension prerequisites and displays diagnostic information to users.

### Current Behavior

- Extension activates silently
- If dependencies are missing, errors appear later (confusing to user)
- No way for users to know if extension is in "healthy" state
- Difficult to diagnose configuration issues

### Desired Behavior

On extension activation, check:

1. ✓ Backend URL configured
2. ✓ Backend reachable (ping endpoint)
3. ✓ Plans directory exists and has plans
4. ✓ MCP server reachable (if configured)
5. ✓ WebSocket configuration valid
6. ✓ Required VS Code version
7. ✓ Node.js version (if needed)

Display results in:
- Status bar icon with tooltip
- Welcome message with link to settings
- Output channel with full diagnostics

### Acceptance Criteria

- [ ] Health check runs on extension activation
- [ ] Results cached (don't check every 100ms)
- [ ] Status bar shows overall health (green/yellow/red)
- [ ] Detailed diagnostics in output channel
- [ ] Failures have actionable fixes
- [ ] Users can manually trigger check: "Copilot Orchestrator: Run Health Check"
- [ ] Tests verify each check works correctly

### Files to Create

- `vscode-extension/src/services/healthCheck.ts` - Core health check system
- `vscode-extension/src/services/healthCheck.test.ts` - Tests

### Files to Modify

- `vscode-extension/src/extension.ts` - Call health check on activation

---

## 🟡 ISSUE #4: Create Development Checklist & Validation System

**Title**: `[MEDIUM] Implement command registration validation and pre-commit checklist`

**Priority**: 🟡 MEDIUM  
**Type**: Process + Testing  
**Effort**: 2-3 hours  
**Component**: Development Practices  

### Description

Create a systematic approach to prevent command registration errors in the future.

### What's Needed

1. **Command Validation Test**
   - Verify every command in `package.json` is registered in code
   - Verify every registered command is in `package.json`
   - Run as part of CI/CD pipeline

2. **Pre-Commit Checklist**
   - Git pre-commit hook to validate commands
   - Prevents commits with mismatched commands
   - Non-blocking but warns developers

3. **Development Guide**
   - Document how to add new commands
   - Step-by-step checklist
   - Reference in contribution guide

### Files to Create

- `vscode-extension/src/__tests__/command-registration.test.ts` - Validation tests
- `.githooks/pre-commit` - Git hook for local validation
- `vscode-extension/COMMAND_REGISTRATION_GUIDE.md` - Developer guide

### Files to Modify

- `vscode-extension/package.json` - Add pre-commit hook script

### Test Example

```typescript
describe('Command Registration Validation', () => {
  test('all commands in package.json are registered in code', () => {
    const packageCommands = getCommandsFromPackageJson();
    const registeredCommands = getRegisteredCommands();
    
    packageCommands.forEach(cmd => {
      expect(registeredCommands).toContain(cmd);
    });
  });

  test('all registered commands are in package.json', () => {
    const packageCommands = getCommandsFromPackageJson();
    const registeredCommands = getRegisteredCommands();
    
    registeredCommands.forEach(cmd => {
      expect(packageCommands).toContain(cmd);
    });
  });
});
```

---

## 📋 PROPOSED SKILL: "Command Registration Validation"

### When to Use

- Before committing code that registers new commands
- During code review of command-related changes
- When adding new features to extension

### Steps

1. ✓ Check TypeScript compiles: `npm run compile`
2. ✓ Verify command in `package.json`:
   - Is in `contributes.commands` array
   - Has `command`, `title`, `category` fields
   - Command ID matches code exactly
3. ✓ Verify command registered in code:
   - File: `extension.ts` or command file
   - Uses `vscode.commands.registerCommand()`
   - ID matches `package.json` exactly
   - Added to `context.subscriptions.push()`
4. ✓ Run tests: `npm run test:jest`
5. ✓ Verify UI: Extension loads, command appears in Ctrl+Shift+P
6. ✓ If keybinding added: Test keyboard shortcut works

### Checklist Format

```markdown
## Command Registration Checklist

- [ ] Command registered in code (extension.ts or command file)
- [ ] Command added to package.json contributions.commands
- [ ] Command ID matches exactly in both places
- [ ] Title and category provided in package.json
- [ ] Registered to context.subscriptions
- [ ] TypeScript compiles: npm run compile
- [ ] Tests pass: npm run test:jest
- [ ] Command appears in command palette (Ctrl+Shift+P)
- [ ] UI/menu items reference correct command ID
- [ ] Error handling shows clear messages if command fails
- [ ] Documentation updated if command is user-facing
```

---

## 🎯 PRIORITY ORDER FOR FIXING

1. **CRITICAL** - Issue #1 (30 min): Add 5 commands to package.json
2. **HIGH** - Issue #2 (2-3 hours): Fix error messages for backend connectivity
3. **MEDIUM** - Issue #3 (3-4 hours): Add health check on startup
4. **MEDIUM** - Issue #4 (2-3 hours): Create validation system to prevent future issues

**Total Estimated Effort**: 8-12 hours  
**Recommended Timeline**: Spread over 2 development days

---

## 📊 IMPACT ANALYSIS

### If Fixed

✅ Users can access all planned commands  
✅ Clear error messages guide troubleshooting  
✅ Health check provides confidence in setup  
✅ Future command additions won't have same issues  

### If Not Fixed

❌ Commands silently fail ("command not found")  
❌ User frustration due to unclear errors  
❌ Support burden increases (why isn't X working?)  
❌ Similar issues repeat with new commands  

---

## 🔗 DEPENDENCIES

- Issue #1 must complete before users can use planning commands
- Issue #2 should complete before Issue #3 (better error handling first)
- Issue #4 should complete to prevent regression

---

## 📚 REFERENCES

- VS Code Command API: https://code.visualstudio.com/api/references/commands
- Extension Manifest: https://code.visualstudio.com/api/references/extension-manifest
- User Reports: Extension Command Audit Report (reports/EXTENSION-COMMAND-AUDIT.md)
