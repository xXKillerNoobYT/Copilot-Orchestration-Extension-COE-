# Example: Agent Profile Mismatch Detection

This example demonstrates how the agent profile tracking system detects and warns about profile mismatches.

## Scenario: Profile Version Change

### Step 1: Create Task with Agent Assignment
Create a task file `_ZENTASKS/TASK-123.task.md`:

```markdown
---
id: TASK-123
title: Implement User Authentication
assignees: [coder]
status: pending
---

## Description
Implement JWT-based authentication for the API.

## Acceptance Criteria
- [ ] User can log in with credentials
- [ ] JWT token generated on successful login
- [ ] Protected routes require valid token
```

### Step 2: Create Context Bundle
Use the VS Code command palette:
1. Open `TASK-123.task.md`
2. Run: `Copilot Orchestrator: Create Context Bundle`
3. Enter bundle name: `auth-implementation-context`

**System Actions:**
```
✓ Loading agent profile for 'coder'...
✓ Capturing profile snapshot (version: 1, role: coder)
✓ Generating profile version: 1.a3b5c7d9
✓ Creating bundle at context/auth-implementation-context/bundle.json
```

**Generated Bundle:**
```json
{
  "id": "auth-implementation-context",
  "taskId": "TASK-123",
  "type": "task_context",
  "createdAt": "2026-01-17T07:00:00.000Z",
  "files": [],
  "notes": "Context bundle for task: Implement User Authentication",
  "version": 1,
  "agentProfile": {
    "name": "DefaultCoder",
    "role": "coder",
    "version": 1,
    "capabilities": [
      "read_files",
      "write_files",
      "run_commands",
      "access_network",
      "role:coder"
    ]
  },
  "profileVersion": "1.a3b5c7d9"
}
```

### Step 3: Update Agent Profile
Admin updates the agent profile at `config/agents/coder.yaml`:

```yaml
# Before (version 1)
version: 1
name: DefaultCoder
role: coder
tool_permissions:
  read_files: true
  write_files: true
  run_commands: true
  access_network: true

# After (version 2)
version: 2
name: DefaultCoder
role: coder
tool_permissions:
  read_files: true
  write_files: true
  run_commands: true
  access_network: true
  modify_tasks: true  # NEW PERMISSION
execution_constraints:
  require_tests_for_changes: true  # NEW CONSTRAINT
```

### Step 4: Open Context Bundle (Detection)
Open the context bundle:
1. Run: `Copilot Orchestrator: Open Context Bundle`
2. Select: `context/auth-implementation-context/bundle.json`

**System Response:**
```
⚠️ WARNING: Agent profile 'DefaultCoder' has changed since context bundle creation.
   Expected version: 1.a3b5c7d9
   Current version: 2.e4f6g8h0
   Tools and capabilities may differ from when this context was created.
```

**Console Log:**
```
Agent profile mismatch detected:
{
  bundleProfile: {
    name: 'DefaultCoder',
    role: 'coder',
    version: 1,
    capabilities: ['read_files', 'write_files', 'run_commands', 'access_network', 'role:coder']
  },
  bundleVersion: '1.a3b5c7d9',
  currentVersion: '2.e4f6g8h0',
  currentRole: 'coder',
  bundleRole: 'coder'
}
```

**User Action:**
User is warned but can proceed. The bundle opens normally.

## Scenario: Role Change (Critical)

### Step 1: Admin Changes Agent Role
Admin updates `config/agents/coder.yaml`:

```yaml
# Changed role from 'coder' to 'reviewer'
version: 2
name: DefaultCoder
role: reviewer  # ROLE CHANGED
tool_permissions:
  read_files: true
  # write_files: false  # REMOVED
  # run_commands: false  # REMOVED
```

### Step 2: Open Context Bundle (Critical Error)
Open the same context bundle:

**System Response:**
```
❌ CRITICAL: Agent role mismatch! Context bundle expects 'coder' 
   but current profile has role 'reviewer'.
   Execution may fail due to incompatible capabilities.
```

**User Action:**
User must:
1. Understand the risk of incompatible capabilities
2. Either:
   - Revert the agent profile change
   - Create a new context bundle with updated profile
   - Proceed with caution knowing tools may fail

## Scenario: Missing Agent Profile

### Step 1: Delete Agent Profile
Admin removes `config/agents/coder.yaml`

### Step 2: Open Context Bundle
Open the context bundle:

**System Response:**
```
⚠️ WARNING: Agent profile 'DefaultCoder' not found.
   Context bundle may be stale.
```

**User Action:**
User is warned that the expected agent profile doesn't exist. They should:
1. Restore the missing profile, or
2. Create a new context bundle with a different agent, or
3. Proceed knowing the context may be outdated

## Benefits Demonstrated

### 1. Early Problem Detection
Without tracking:
- Task executes with wrong profile
- Tools fail with cryptic errors
- User spends time debugging

With tracking:
- Mismatch detected immediately
- Clear warning before execution
- User makes informed decision

### 2. Audit Trail
- Know exactly which profile was intended
- Compare expected vs actual capabilities
- Debug configuration issues quickly

### 3. Safe Evolution
- Profiles can be updated safely
- Users warned about changes
- No silent breakage

## Testing the Feature

Run the test suite:
```bash
cd vscode-extension
npm test -- taskInteractionAPI.contextBundle.test.ts
```

Expected output:
```
PASS src/taskInteractionAPI.contextBundle.test.ts
  TaskInteractionAPI - Context Bundle Agent Profile
    Profile Capture
      ✓ should capture agent profile when creating context bundle
      ✓ should handle missing agent profile gracefully
    Profile Validation
      ✓ should warn when profile version has changed
      ✓ should error when role has changed
      ✓ should handle missing agent profile in system

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```
