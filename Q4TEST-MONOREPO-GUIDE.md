# Q4Test Running Scripts - Monorepo Guide

## ✅ Scripts Now Work From Root!

All Q4Test scripts have been added to the **root `package.json`** and can now be run from anywhere in the monorepo.

## Quick Commands (Run from Root)

```bash
# From: C:\Users\weird\OneDrive\Documents\GitHub\Copilot-Orchestration-Extension-COE-

npm run test:q4test              # Run all Q4Test-generated tests
npm run test:q4test:watch        # Watch mode
npm run test:q4test:coverage     # Generate coverage
npm run test:q4test:debug        # Debug mode
npm run q4test:validate          # Validate test compliance
npm run q4test:merge-coverage    # Merge coverage reports
```

## How It Works

The root `package.json` now delegates to `vscode-extension/package.json`:

```json
{
  "scripts": {
    "test:q4test": "cd vscode-extension && npm run test:q4test",
    "test:q4test:watch": "cd vscode-extension && npm run test:q4test:watch",
    "test:q4test:coverage": "cd vscode-extension && npm run test:q4test:coverage",
    "test:q4test:debug": "cd vscode-extension && npm run test:q4test:debug",
    "q4test:validate": "cd vscode-extension && npm run q4test:validate",
    "q4test:merge-coverage": "cd vscode-extension && npm run q4test:merge-coverage"
  }
}
```

These scripts then execute the actual commands in `vscode-extension/package.json`.

## Alternative: Run from vscode-extension

You can also run directly from the `vscode-extension` directory:

```bash
cd vscode-extension

npm run test:q4test              # Same as root
npm run test:q4test:watch        # Same as root
npm run test:q4test:coverage     # Same as root
npm run test:q4test:debug        # Same as root
npm run q4test:validate          # Same as root
npm run q4test:merge-coverage    # Same as root
```

## Monorepo Structure

```
Copilot-Orchestration-Extension-COE-/
├── package.json                    ← ROOT (scripts delegate to vscode-extension)
├── vscode-extension/
│   ├── package.json                ← Extension (actual npm scripts)
│   ├── .q4testrc.json              ← Q4Test config
│   ├── jest-q4test.config.js       ← Jest config for Q4Test
│   ├── src/
│   │   ├── services/
│   │   │   └── Q4TEST_GEN_*.test.ts  ← Generated tests
│   │   └── adapters/
│   │       └── Q4TestJestAdapter.ts
│   └── scripts/
│       ├── validate-q4test.js      ← Validation script
│       └── merge-coverage.js       ← Coverage merge script
├── context-manager/
└── other directories...
```

## Test It Now!

```bash
# 1. Validate (should show "No generated test files found" if none exist yet)
npm run q4test:validate

# 2. Generate your first tests using Q4Test UI in VS Code
#    - Click beaker 🧪 in Activity Bar
#    - Select a service
#    - Generate tests

# 3. Once tests are generated, run them:
npm run test:q4test

# 4. Check coverage:
npm run test:q4test:coverage

# 5. Merge with hand-written tests:
npm run q4test:merge-coverage
```

## Fixed Issues

✅ **Scripts now work from root directory**  
✅ **No need to `cd vscode-extension` first**  
✅ **Removed `glob` dependency** (using built-in Node.js fs/path)  
✅ **Validation script uses recursive file search**  

## Status

**Root scripts**: ✅ Added (6 scripts)  
**Extension scripts**: ✅ Exist (6 scripts)  
**Dependencies**: ✅ No extra packages needed  
**Ready to use**: ✅ YES!

---

**Last Updated**: January 24, 2026  
**Fix**: Monorepo script delegation + removed glob dependency
