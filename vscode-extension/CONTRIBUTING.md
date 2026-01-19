# Contributing to Copilot Orchestrator

Thank you for your interest in contributing to the Copilot Orchestrator VS Code extension! This document provides guidelines and best practices for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Adding New Commands](#adding-new-commands)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Resources](#resources)

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Copilot-Orchestration-Extension-COE-.git
   cd Copilot-Orchestration-Extension-COE-/vscode-extension
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build the extension**:
   ```bash
   npm run compile
   ```
5. **Run tests**:
   ```bash
   npm test
   ```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- VS Code 1.90.0 or higher
- Git

### Recommended VS Code Extensions

- ESLint
- Prettier
- Jest Runner
- GitLens

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes** with incremental commits

3. **Run tests frequently**:
   ```bash
   npm run test:jest
   ```

4. **Test in VS Code**:
   - Press `F5` to launch Extension Development Host
   - Test your changes manually
   - Check Debug Console for errors

5. **Commit with meaningful messages**:
   ```bash
   git commit -m "Add feature: describe what you added"
   ```

## Adding New Commands

**⚠️ IMPORTANT:** When adding new commands, follow the [Command Registration Guide](./COMMAND_REGISTRATION_GUIDE.md).

### Quick Command Registration Checklist

- [ ] Command added to `package.json` contributions.commands
  - [ ] Has `command` field (exact ID starting with `copilot-orchestrator.`)
  - [ ] Has `title` field (display name)
  - [ ] Has `category` field (use "Copilot Orchestrator")
  
- [ ] Command registered in code (`extension.ts` or command file)
  - [ ] Uses `vscode.commands.registerCommand()`
  - [ ] ID matches `package.json` exactly (case-sensitive)
  - [ ] Added to `context.subscriptions.push()`
  
- [ ] Build & Test
  - [ ] Compiles: `npm run compile`
  - [ ] Tests pass: `npm run test:jest`
  - [ ] No TypeScript errors: `npx tsc --noEmit`
  
- [ ] Verification
  - [ ] Command appears in Ctrl+Shift+P
  - [ ] Executes without "command not found" error
  - [ ] Error messages are clear if it fails
  
- [ ] Documentation
  - [ ] User-facing command documented in README
  - [ ] Added to command reference if public

**See [COMMAND_REGISTRATION_GUIDE.md](./COMMAND_REGISTRATION_GUIDE.md) for detailed instructions and examples.**

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use explicit types for function parameters and return values
- Use async/await instead of callbacks
- Handle errors appropriately (try/catch blocks)

### Naming Conventions

- **Files:** camelCase (e.g., `myCommand.ts`)
- **Classes:** PascalCase (e.g., `TaskGraphGenerator`)
- **Functions:** camelCase (e.g., `registerCommands`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)
- **Interfaces:** PascalCase with `I` prefix (e.g., `ITaskData`)
- **Commands:** lowercase with dots (e.g., `copilot-orchestrator.myCommand`)

### Code Organization

```
vscode-extension/
├── src/
│   ├── commands/          # Command implementations
│   ├── services/          # Business logic services
│   ├── panels/            # Webview panels
│   ├── views/             # Tree view providers
│   ├── __tests__/         # Test files
│   ├── __mocks__/         # Mock implementations
│   └── extension.ts       # Extension entry point
├── package.json           # Extension manifest
└── README.md             # User documentation
```

### Comments and Documentation

- Add JSDoc comments for public APIs
- Use inline comments for complex logic
- Keep comments up-to-date with code changes
- Document "why" not just "what"

Example:
```typescript
/**
 * Validates task dependencies and detects circular references
 * 
 * @param tasks - Array of parsed task objects
 * @returns Validation result with errors and warnings
 */
export function validateDependencies(tasks: ParsedTask[]): ValidationResult {
    // Use DFS to detect cycles in dependency graph
    // This is more efficient than BFS for deep hierarchies
    const visited = new Set<string>();
    // ...
}
```

## Testing

### Test Organization

- **Unit tests:** `src/__tests__/*.test.ts`
- **Integration tests:** `src/__tests__/integration/*.test.ts`
- **Test utilities:** `src/__tests__/__mocks__/`

### Running Tests

```bash
# Run all tests in watch mode (default)
npm test

# Run tests once
npm run test:jest

# Run with coverage
npm run test:jest:coverage

# Run specific test file
npm run test:jest -- src/__tests__/command-registration.test.ts
```

### Writing Tests

```typescript
import * as vscode from 'vscode';

describe('MyFeature', () => {
    test('should do something correctly', () => {
        // Arrange
        const input = 'test';
        
        // Act
        const result = myFunction(input);
        
        // Assert
        expect(result).toBe('expected');
    });
    
    test('should handle errors gracefully', () => {
        expect(() => myFunction(null)).toThrow();
    });
});
```

### Test Coverage

- Aim for 80%+ code coverage
- Test edge cases and error paths
- Mock VS Code APIs appropriately
- Don't test VS Code's built-in functionality

## Pull Request Process

### Before Submitting

1. **Run all tests** and ensure they pass:
   ```bash
   npm run test:jest
   npm run compile
   ```

2. **Run command validation** (automatic via pre-commit hook):
   ```bash
   npm run test:jest -- src/__tests__/command-registration.test.ts
   ```

3. **Check for TypeScript errors**:
   ```bash
   npx tsc --noEmit
   ```

4. **Update documentation** if needed (README, guides, etc.)

5. **Test manually** in Extension Development Host

### Submitting a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```

2. **Create a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Fixes #123")
   - Describe what changed and why
   - Include screenshots for UI changes
   - List any breaking changes

3. **Respond to feedback**:
   - Address review comments promptly
   - Push additional commits to the same branch
   - Mark conversations as resolved

### PR Title Format

Use conventional commit format:

- `feat: Add new command for task execution`
- `fix: Resolve command registration mismatch`
- `docs: Update command registration guide`
- `test: Add tests for task parser`
- `refactor: Simplify dependency validation`
- `chore: Update dependencies`

### Automated Checks

Pull requests must pass:

- ✅ All unit tests
- ✅ Command registration validation
- ✅ TypeScript compilation
- ✅ Code style checks (if configured)

## Git Hooks

This project uses Git hooks to maintain code quality:

### Pre-commit Hook

Automatically validates command registrations before each commit.

**Install hooks** (automatic on `npm install`):
```bash
npm run install-hooks
```

**Bypass hook** (not recommended):
```bash
git commit --no-verify
```

## Common Tasks

### Adding a New Command

See [COMMAND_REGISTRATION_GUIDE.md](./COMMAND_REGISTRATION_GUIDE.md) for complete instructions.

### Adding a New View Provider

1. Create provider class in `src/views/`
2. Implement `vscode.TreeDataProvider` interface
3. Register in `extension.ts`
4. Add view configuration to `package.json`

### Adding a New Webview Panel

1. Create panel class in `src/panels/`
2. Implement panel creation and messaging
3. Create HTML/CSS/JS resources
4. Register command to open panel
5. Test messaging between webview and extension

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update package.json
npm update

# Test thoroughly after updates
npm test
```

## Debugging

### Debug Extension

1. Open `vscode-extension` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Use Debug Console to inspect variables

### Debug Tests

1. Open test file
2. Click "Debug" above test in editor
3. Or use Jest Runner extension

### Common Issues

**Problem:** "Command not found"
- **Solution:** Check [COMMAND_REGISTRATION_GUIDE.md](./COMMAND_REGISTRATION_GUIDE.md)

**Problem:** Tests fail in CI but pass locally
- **Solution:** Ensure `node_modules` is clean, run `npm ci` instead of `npm install`

**Problem:** TypeScript errors after git pull
- **Solution:** Run `npm install` to update dependencies

## Resources

### Documentation

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Capabilities](https://code.visualstudio.com/api/extension-capabilities/overview)
- [Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)
- [Command Registration Guide](./COMMAND_REGISTRATION_GUIDE.md)

### Examples

- Look at existing commands in `src/commands/`
- Check tests in `src/__tests__/`
- Review `extension.ts` for registration patterns

### Getting Help

- Check existing documentation first
- Search closed issues for similar problems
- Ask questions in pull request comments
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to Copilot Orchestrator! 🚀**
