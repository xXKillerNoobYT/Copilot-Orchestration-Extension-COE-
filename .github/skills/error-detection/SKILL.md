---
name: error-detection-and-diagnosis
description: Proactively identify, diagnose, and document system errors before they impact users. Systematically find command mismatches, configuration issues, and connectivity problems through automated validation and health checks.
---

# Error Detection & Diagnosis Skill

Systematically identify and diagnose system errors BEFORE they reach users, preventing silent failures and confusing error messages.

## When to Use This Skill

- **After code modifications**: Verify no new errors introduced
- **During feature development**: Catch command registration issues early
- **Before commits**: Validate configuration consistency
- **Extension startup**: Check system health and prerequisites
- **API integration**: Verify backend connectivity and responses
- **User reports**: Diagnose root causes of reported errors

## What This Skill Does

1. **Find**: Identify mismatches and configuration errors
2. **Analyze**: Understand root causes and impact
3. **Diagnose**: Determine what needs fixing
4. **Document**: Create issues with clear remediation steps
5. **Prevent**: Implement automated checks to prevent regression

## Error Categories

### Category 1: Command Registration Mismatches

**What to Check**:
- Commands declared in `package.json` but not registered in code
- Commands registered in code but not in `package.json`
- Command IDs don't match exactly (case-sensitive)
- Keybindings reference non-existent commands

**How to Find**:
```bash
# Manual check
grep -r "vscode.commands.registerCommand" src/
# Compare with package.json contributions.commands

# Automated check (create test)
# See: TEST VALIDATION section below
```

**Impact Assessment**:
- Critical: Command fails silently ("command not found")
- High: Command unavailable in command palette
- Medium: Keybinding doesn't work

**Example Issue Template**:
```
Title: [CRITICAL] Command {name} not found

Missing From: {package.json OR code}
Command ID: copilot-orchestrator.{name}
Location: {file:lineNumber}
Impact: {users can't access feature}

Fix: Add to {package.json OR extension.ts}
```

### Category 2: Backend Connectivity

**What to Check**:
- Backend URL configured
- Backend reachable (network connectivity)
- API endpoints responding correctly
- Error messages when backend unavailable

**How to Find**:
```typescript
// Check in services that call fetch()
grep -r "fetch(" src/services/
// Look for error handling that silently falls back
grep -r "Using default\|fallback\|Unable to connect" src/
```

**Impact Assessment**:
- Critical: Core feature completely broken
- High: Feature silently degraded with no warning
- Medium: Error message exists but unclear

**Example Issue Template**:
```
Title: [HIGH] Unclear error when backend unavailable

Error Message: {current}
Should Be: {with actionable steps}

Affected Component: {settingsPanel OR mcpClient}
Files: {list of files showing error}

Needs:
- Show what URL failed
- Show why it failed
- Show how to fix it
```

### Category 3: Configuration Issues

**What to Check**:
- Required settings are set
- Settings have valid values
- Settings are used correctly in code
- Default values make sense

**How to Find**:
```bash
# Find all configuration reads
grep -r "getConfiguration\|readConfig\|settings" src/

# Check if defaults are applied
grep -r "OR 'default'\|??\||| {" src/
```

**Impact Assessment**:
- Critical: Feature completely unusable
- High: Feature works only if user configures manually
- Medium: Confusing default behavior

### Category 4: Missing Plans/Templates

**What to Check**:
- Plan files exist in expected locations
- Templates are discoverable
- Graceful fallback when plans missing
- Clear message to user about where to get plans

**How to Find**:
```bash
# Find all file operations
grep -r "readFile\|statSync\|openPath" src/

# Check for error handling
grep -r "ENOENT\|no.*found\|not exist" src/
```

**Impact Assessment**:
- High: User can't start planning
- Medium: Requires manual file creation
- Low: Uses template/default successfully

### Category 5: Health & Diagnostics

**What to Check**:
- System health on startup
- All prerequisites available
- Configuration validity
- Graceful degradation when components unavailable

**How to Find**:
```bash
# Check initialization code
grep -r "activate\|initialize\|constructor" src/extension.ts

# Look for missing validation
grep -r "context.subscriptions.push" src/extension.ts | wc -l
# Should be 15-20+ depending on features
```

**Impact Assessment**:
- Medium: User doesn't know if system is healthy
- Low: Users blame extension when setup is incomplete

---

## Step-by-Step Diagnosis Process

### Phase 1: Discovery

```
1. List all error messages in system (grep for "Error:\|Failed:\|Unable to")
2. Group by category (command, backend, config, etc.)
3. Note frequency (how often does this error occur?)
4. Check if error is actionable (user knows what to do?)
5. Check if error is logged (user can find it?)
```

### Phase 2: Analysis

```
1. For each error:
   - What component triggers it?
   - What conditions cause it?
   - What does user see/experience?
   - Is error message clear and actionable?
   
2. Trace root cause:
   - Is it missing configuration?
   - Is it runtime condition (server down)?
   - Is it code bug (logic error)?
   - Is it user error (wrong settings)?

3. Assess impact:
   - Does feature completely fail?
   - Does feature degrade gracefully?
   - Can user fix it themselves?
```

### Phase 3: Documentation

```
1. Create GitHub issue for each error with:
   - Current behavior (bad) ❌
   - Desired behavior (good) ✅
   - Root cause analysis
   - Acceptance criteria
   - Implementation steps

2. Prioritize by impact:
   - CRITICAL: Feature broken, no workaround
   - HIGH: Feature broken, user can fix
   - MEDIUM: Feature degraded, unclear message
   - LOW: Cosmetic or rare condition
```

### Phase 4: Prevention

```
1. For critical errors:
   - Create automated validation test
   - Add pre-commit hook check
   - Document in development guide

2. For backend errors:
   - Improve error messages
   - Add health check
   - Link to troubleshooting guide

3. For configuration errors:
   - Add validation on load
   - Suggest fixes in settings UI
   - Provide configuration wizard
```

---

## Test Validation Checklist

When creating validation tests:

### Command Registration Tests

```typescript
✓ All commands in package.json are registered in code
✓ All registered commands are in package.json  
✓ Command IDs match exactly (case-sensitive)
✓ All menu items reference valid commands
✓ All keybindings reference valid commands
```

### Error Message Tests

```typescript
✓ Error shows WHAT failed (specific component)
✓ Error shows WHY it failed (root cause)
✓ Error shows HOW to fix it (specific steps)
✓ Error suggests checking specific config
✓ Error provides example of correct config
```

### Connectivity Tests

```typescript
✓ Can detect backend unavailable
✓ Can detect MCP server down
✓ Can detect network failure
✓ Can detect DNS resolution failure
✓ Can detect SSL/TLS issues
✓ Error messages suggest each possible cause
```

### Configuration Tests

```typescript
✓ Invalid setting caught on load
✓ Missing required setting detected
✓ Default value provided
✓ Error message suggests fix
✓ Documentation links provided
```

---

## Real-World Example: Command Registration Issue

### Discovery Phase

```
❌ User Error: "command 'copilot-orchestrator.planningPhase' not found"
❌ User Error: "command 'copilot-orchestrator.showPanel' not found"

Analysis:
- Command is called but not found
- Suggests command not registered OR not in package.json
```

### Analysis Phase

```
1. Search code: grep -r "registerCommand.*planningPhase" src/
   ✓ Found: extension.ts line 656 - IS registered in code
   
2. Search package.json: grep "planningPhase" package.json
   ✗ NOT found in package.json
   
Root Cause: Command registered in code but not declared in manifest
Impact: VS Code doesn't recognize command as valid

Why This Happens:
- Developer added command in code
- Forgot to add to package.json contributions.commands
- Extension compiles successfully (no TS error)
- Command seems to work locally
- Users get silent failure at runtime
```

### Documentation Phase

**GitHub Issue Created**:

```
Title: [CRITICAL] Missing command declarations - 5 commands not discoverable

Missing Commands:
- copilot-orchestrator.planningPhase (extension.ts:656)
- copilot-orchestrator.aiDevPlanning (extension.ts:673)
- copilot-orchestrator.guidanceExecution (extension.ts:685)
- copilot-orchestrator.reviewCompletion (extension.ts:698)
- copilot-orchestrator.detectPlanDrift (referenced in tree view)

Acceptance Criteria:
- [ ] Add all 5 commands to package.json contributes.commands
- [ ] Extension compiles without errors
- [ ] Commands appear in command palette
- [ ] Tests verify command registration

Impact:
- All planning commands broken
- Users can't access core features
```

### Prevention Phase

**Test Created**:

```typescript
test('all registered commands are in package.json', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const declaredCommands = packageJson.contributes.commands.map(c => c.command);
  
  const extensionContent = readFileSync('src/extension.ts', 'utf-8');
  const registeredCommands = extensionContent.match(
    /vscode\.commands\.registerCommand\('(copilot-orchestrator\.[^']+)'/g
  ).map(m => m.match(/'([^']+)'/)[1]);
  
  const missing = registeredCommands.filter(cmd => !declaredCommands.includes(cmd));
  expect(missing).toEqual([], `Commands registered but not in package.json: ${missing.join(', ')}`);
});
```

---

## Integration with Development Workflow

### Before Committing Code

```bash
# Run error detection checks
npm run validate:commands
npm run validate:config  
npm run validate:errors

# Fix any issues before commit
git add .
git commit -m "Fix command registration issues"
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating command registrations..."
npm run validate:commands || exit 1

echo "Validating error messages..."
npm run validate:errors || exit 1

echo "✓ Validation passed"
```

### CI/CD Pipeline

```yaml
validate:
  script:
    - npm run validate:commands
    - npm run validate:config
    - npm run validate:errors
  on_failure: fail
```

---

## Key Principles

1. **Proactive**: Find errors BEFORE users encounter them
2. **Automated**: Don't rely on manual review
3. **Actionable**: Every error message tells user what to do
4. **Documented**: Errors are logged where user can find them
5. **Preventable**: Create tests/checks to prevent regression

---

## Tools & Utilities

### Helper Function: Extract Commands

```typescript
function extractRegisteredCommands(extensionTsPath: string): string[] {
  const content = fs.readFileSync(extensionTsPath, 'utf-8');
  const matches = content.match(/vscode\.commands\.registerCommand\('([^']+)'/g);
  return matches?.map(m => m.match(/'([^']+)'/)[1]) || [];
}

function extractPackageJsonCommands(packageJsonPath: string): string[] {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return pkg.contributes?.commands?.map(c => c.command) || [];
}
```

### Helper Function: Validate Configuration

```typescript
function validateConfiguration(config: any, schema: any): string[] {
  const errors: string[] = [];
  
  for (const [key, rule] of Object.entries(schema)) {
    if (rule.required && !(key in config)) {
      errors.push(`Missing required config: ${key}`);
    }
    
    if (rule.type && typeof config[key] !== rule.type) {
      errors.push(`Invalid type for ${key}: expected ${rule.type}`);
    }
    
    if (rule.pattern && !rule.pattern.test(config[key])) {
      errors.push(`Invalid value for ${key}: ${config[key]}`);
    }
  }
  
  return errors;
}
```

---

## References

- **Error Detection Guide**: `reports/EXTENSION-COMMAND-AUDIT.md`
- **GitHub Issues**: See #150, #151, #152, #153
- **Development Checklist**: Created as part of Issue #152
- **Test Examples**: `vscode-extension/src/__tests__/command-registration.test.ts`

---

## Success Criteria

You're using this skill effectively when:

✅ You find command mismatches BEFORE users report errors  
✅ Error messages guide users to solutions  
✅ New features don't introduce registration bugs  
✅ CI/CD catches configuration issues  
✅ Users rarely encounter "command not found"  
✅ When errors occur, they're clear and actionable  
✅ Support burden is reduced (fewer "why doesn't this work?" questions)
