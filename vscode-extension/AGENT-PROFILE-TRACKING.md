# Agent Profile Mismatch Prevention

## Overview
This document describes the agent profile tracking and validation system implemented to prevent context bundle execution with mismatched agent profiles.

## Problem Statement
Previously, context bundles did not capture agent profile information. If an agent profile was updated between task assignment and execution, the agent would execute with incorrect profile data, causing:
- Tool routing failures (MCP tool not found errors)
- Agent capability mismatches
- Silent failures due to missing permissions

## Solution

### 1. Enhanced ContextBundle Interface
The `ContextBundle` interface now includes:

```typescript
export interface ContextBundle {
  id: string;
  name: string;
  files: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  agentProfile?: {
    name: string;
    role: string;
    version: number;
    capabilities?: string[];
  };
  profileVersion?: string;
}
```

**Key Fields:**
- `agentProfile`: Snapshot of agent profile at bundle creation time
  - `name`: Agent name (e.g., "TestCoder")
  - `role`: Agent role (e.g., "coder", "reviewer")
  - `version`: Agent profile version number
  - `capabilities`: Array of capabilities extracted from tool permissions
- `profileVersion`: Hash of profile content for staleness detection (deterministic with sorted keys)

### 2. Profile Capture During Bundle Creation
When creating a context bundle for a task:

1. The system loads the agent profile for the first assignee
2. Essential profile information is captured:
   - Name, role, and version
   - Capabilities extracted from tool permissions
3. A profile version hash is generated based on:
   - Profile name, role, and version
   - Tool permissions
   - Execution constraints
4. Both are stored in the context bundle JSON

**Code Location:** `taskInteractionAPI.ts` - `createContextBundle()` method

### 3. Profile Validation During Bundle Usage
When opening a context bundle:

1. The system loads the current agent profile from the system
2. Compares bundle's profile version with current profile version
3. Takes action based on differences:

**Version Mismatch (Warning):**
- Shows warning message to user
- Logs detailed mismatch information
- Allows execution to continue with caution

**Role Mismatch (Error):**
- Shows critical error message to user
- Highlights capability incompatibility risk
- User must decide whether to proceed

**Missing Profile (Warning):**
- Shows warning that profile not found
- Indicates bundle may be stale
- Allows execution to continue

**Code Location:** `taskInteractionAPI.ts` - `validateAgentProfile()` method

## Usage Examples

### Creating a Context Bundle with Profile Tracking
```typescript
// Task has assignee "coder"
// System automatically:
// 1. Loads agent profile for "coder"
// 2. Captures profile snapshot
// 3. Generates profile version hash
// 4. Stores in bundle.json

await taskInteractionAPI.createContextBundle('task-1', taskUri);

// Result: context/task-1-context/bundle.json
{
  "id": "task-1-context",
  "taskId": "task-1",
  "files": [],
  "agentProfile": {
    "name": "DefaultCoder",
    "role": "coder",
    "version": 1,
    "capabilities": [
      "read_files",
      "write_files",
      "run_commands",
      "role:coder"
    ]
  },
  "profileVersion": "1.a3b5c7d9"
}
```

### Opening a Context Bundle with Validation
```typescript
// System automatically validates profile
await taskInteractionAPI.openContextBundle('/path/to/bundle.json');

// If profile has changed:
// WARNING: Agent profile 'DefaultCoder' has changed since context bundle creation.
// Expected version: 1.a3b5c7d9, Current version: 2.e4f6g8h0.
// Tools and capabilities may differ from when this context was created.

// If role has changed:
// CRITICAL: Agent role mismatch! Context bundle expects 'coder' 
// but current profile has role 'reviewer'.
// Execution may fail due to incompatible capabilities.
```

## Benefits

### 1. Early Detection
- Profile mismatches detected before execution
- Prevents silent tool routing failures
- Reduces debugging time

### 2. Immutability Enforcement
- Agent profile state frozen at bundle creation
- Clear audit trail of intended profile
- Prevents accidental profile changes

### 3. Clear User Feedback
- Warnings for version changes
- Errors for critical role mismatches
- Detailed logging for debugging

### 4. Graceful Degradation
- Missing profiles handled gracefully
- Validation errors don't block all operations
- User can make informed decisions

## Testing

Comprehensive test coverage includes:

1. **Profile Capture Tests**
   - Verifies profile captured during bundle creation
   - Validates capabilities extraction
   - Confirms profile version generation

2. **Profile Validation Tests**
   - Detects version mismatches
   - Detects role mismatches
   - Handles missing profiles

3. **Edge Cases**
   - Tasks without assignees
   - Failed profile loading
   - Malformed bundle content

**Test File:** `taskInteractionAPI.contextBundle.test.ts`

## Future Enhancements

1. **Strict Mode**
   - Option to block execution on any profile mismatch
   - Configurable via workspace settings

2. **Profile Migration**
   - Automatic bundle update when profile changes
   - Migration warnings and confirmations

3. **Multi-Agent Bundles**
   - Track all assignee profiles, not just first
   - Validate all profiles at execution time

4. **Profile Diff View**
   - Show detailed differences between profiles
   - Visual comparison of capabilities

## Implementation Notes

### Hash Algorithm
The profile version uses a deterministic hash of profile content:
- Deterministic (same profile = same hash across all environments)
- Uses sorted object keys to ensure consistent serialization
- Fast computation
- Collision-resistant for practical use
- Can be upgraded to cryptographic hash if needed

### Performance Impact
- Minimal: Profile loaded once during bundle creation
- Validation only on bundle open (not on every task execution)
- Async operations don't block UI

### Backward Compatibility
- Bundles without profile information still work
- New fields are optional
- Existing code unaffected

## Related Files
- `vscode-extension/src/orchestratorPanel.ts` - ContextBundle interface
- `vscode-extension/src/taskInteractionAPI.ts` - Implementation
- `vscode-extension/src/agentProfiles.ts` - Agent profile loading
- `vscode-extension/src/taskInteractionAPI.contextBundle.test.ts` - Tests

## References
- Issue: [HIGH] Agent profile mismatch in context bundle
- PR: Fix agent profile mismatch in context bundle
