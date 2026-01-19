# Command Registration Guide

## Overview

This guide explains how to properly register commands in the VS Code extension to prevent "command not found" errors.

**Why this matters:** Commands must be declared in `package.json` AND registered in code. If they don't match exactly, users will see "command not found" errors when they try to use your command.

## Quick Checklist

When adding a new command, follow this checklist:

### 1. Add to package.json

Add your command to the `contributes.commands` array in `package.json`:

```json
{
  "command": "copilot-orchestrator.myNewCommand",
  "title": "My New Command",
  "category": "Copilot Orchestrator",
  "icon": "$(symbol-method)"
}
```

**Required fields:**
- `command`: The unique command ID (must start with `copilot-orchestrator.`)
- `title`: Display name shown in Command Palette
- `category`: Group name (use "Copilot Orchestrator" for consistency)

**Optional fields:**
- `icon`: Codicon name for UI elements (see [VS Code Icons](https://code.visualstudio.com/api/references/icons-in-labels))

### 2. Register in Code

Register the command in `extension.ts` or a dedicated command file:

**Option A: In extension.ts (for simple commands)**

```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.myNewCommand', async () => {
        // Your command implementation
        vscode.window.showInformationMessage('Hello from my command!');
    })
);
```

**Option B: In a dedicated command file (recommended for complex commands)**

Create a file like `src/commands/myCommand.ts`:

```typescript
import * as vscode from 'vscode';

export async function myNewCommand(): Promise<void> {
    // Your command implementation
    vscode.window.showInformationMessage('Hello from my command!');
}

export function registerMyCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-orchestrator.myNewCommand', myNewCommand)
    );
}
```

Then import and call in `extension.ts`:

```typescript
import { registerMyCommands } from './commands/myCommand';

export function activate(context: vscode.ExtensionContext) {
    // ... other code ...
    registerMyCommands(context);
}
```

### 3. Build & Test

```bash
# Compile the extension
npm run compile

# Run validation tests
npm run test:jest -- src/__tests__/command-registration.test.ts

# Run all tests
npm test
```

### 4. Verification

Test your command manually:

1. **Open VS Code**
2. **Press F5** to launch Extension Development Host
3. **Press Ctrl+Shift+P** (or Cmd+Shift+P on Mac) to open Command Palette
4. **Search** for your command by title
5. **Execute** the command and verify it works
6. **Check** for any errors in the Debug Console

### 5. Documentation

If your command is user-facing:

- Document it in `README.md`
- Add examples of usage
- Explain what it does and when to use it

## Common Pitfalls

### ❌ Command IDs Don't Match

```json
// package.json
"command": "copilot-orchestrator.myCommand"
```

```typescript
// extension.ts - WRONG: Case mismatch
vscode.commands.registerCommand('copilot-orchestrator.MyCommand', ...)
```

**Fix:** Ensure exact case-sensitive match

### ❌ Forgot to Add to Subscriptions

```typescript
// WRONG: Not added to subscriptions
vscode.commands.registerCommand('copilot-orchestrator.myCommand', myHandler);

// CORRECT: Added to subscriptions
context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.myCommand', myHandler)
);
```

### ❌ Command Registered but Not in package.json

```typescript
// Registered in code
context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.secretCommand', ...)
);
```

But missing from `package.json` → **Users can't discover or execute it**

### ❌ Wrong Naming Convention

```json
// WRONG: Doesn't follow convention
"command": "myCommand"
"command": "myExtension.myCommand"

// CORRECT: Follows extension naming
"command": "copilot-orchestrator.myCommand"
```

## Automated Validation

This extension includes automated validation to catch these issues:

### Pre-commit Hook

A Git pre-commit hook runs automatically before each commit to validate command registrations:

```bash
# Install the hook (automatic with npm install)
npm run install-hooks

# The hook will run on every commit
# To bypass (NOT recommended):
git commit --no-verify
```

### CI/CD Tests

The validation tests run in CI/CD pipelines to prevent merging code with mismatched commands.

### Manual Validation

Run validation anytime:

```bash
npm run test:jest -- src/__tests__/command-registration.test.ts
```

## Examples

### Example 1: Simple Command

**package.json:**
```json
{
  "command": "copilot-orchestrator.sayHello",
  "title": "Say Hello",
  "category": "Copilot Orchestrator"
}
```

**extension.ts:**
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.sayHello', () => {
        vscode.window.showInformationMessage('Hello, World!');
    })
);
```

### Example 2: Command with Input

**package.json:**
```json
{
  "command": "copilot-orchestrator.greetUser",
  "title": "Greet User",
  "category": "Copilot Orchestrator"
}
```

**extension.ts:**
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.greetUser', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter your name',
            placeHolder: 'John Doe'
        });
        
        if (name) {
            vscode.window.showInformationMessage(`Hello, ${name}!`);
        }
    })
);
```

### Example 3: Command in Separate File

**package.json:**
```json
{
  "command": "copilot-orchestrator.analyzeCode",
  "title": "Analyze Code",
  "category": "Copilot Orchestrator",
  "icon": "$(search)"
}
```

**src/commands/analyzeCode.ts:**
```typescript
import * as vscode from 'vscode';

export async function analyzeCode(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }
    
    const document = editor.document;
    const lineCount = document.lineCount;
    
    vscode.window.showInformationMessage(`File has ${lineCount} lines`);
}

export function registerAnalyzeCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-orchestrator.analyzeCode', analyzeCode)
    );
}
```

**extension.ts:**
```typescript
import { registerAnalyzeCommands } from './commands/analyzeCode';

export function activate(context: vscode.ExtensionContext) {
    registerAnalyzeCommands(context);
    // ... other registrations
}
```

## Troubleshooting

### "Command not found" Error

1. **Check package.json** - Is the command listed in `contributes.commands`?
2. **Check extension.ts** - Is it registered with `vscode.commands.registerCommand()`?
3. **Check ID match** - Do the IDs match exactly (case-sensitive)?
4. **Rebuild** - Run `npm run compile` to ensure latest code is built
5. **Reload window** - Press `Ctrl+Shift+P` → "Developer: Reload Window"

### Validation Tests Fail

Run the test to see which commands are mismatched:

```bash
npm run test:jest -- src/__tests__/command-registration.test.ts
```

The output will show:
- Commands in package.json but not registered in code
- Commands registered in code but not in package.json

Fix the mismatches and run again.

### Pre-commit Hook Not Running

```bash
# Ensure hooks are installed
npm run install-hooks

# Verify git config
git config core.hooksPath
# Should show: .githooks
```

## Best Practices

### 1. Naming Convention

- Use lowercase with dots: `copilot-orchestrator.commandName`
- Use camelCase for multi-word names: `copilot-orchestrator.showTaskGraph`
- Start all commands with `copilot-orchestrator.`

### 2. Organization

- Keep simple commands in `extension.ts`
- Move complex commands to dedicated files in `src/commands/`
- Group related commands in the same file

### 3. Error Handling

```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('copilot-orchestrator.myCommand', async () => {
        try {
            // Command logic
            await doSomething();
            vscode.window.showInformationMessage('Success!');
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    })
);
```

### 4. User Feedback

- Show progress for long operations
- Provide clear success/error messages
- Use appropriate message levels (info, warning, error)

### 5. Testing

- Test commands in Extension Development Host
- Verify command appears in Command Palette
- Test edge cases (no workspace, no active editor, etc.)
- Include commands in integration tests

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Commands API Reference](https://code.visualstudio.com/api/references/vscode-api#commands)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)
- [VS Code Icons Reference](https://code.visualstudio.com/api/references/icons-in-labels)

## Getting Help

If you encounter issues:

1. Check this guide first
2. Run validation tests: `npm run test:jest -- src/__tests__/command-registration.test.ts`
3. Check existing commands in `package.json` and `extension.ts` for examples
4. Review VS Code extension development docs
5. Ask the team for help

---

**Remember:** Always validate your commands before committing! The pre-commit hook will catch most issues, but it's better to test manually first.
