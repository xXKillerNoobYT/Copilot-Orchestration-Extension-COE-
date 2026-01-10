# Plan Builder Implementation Index
## Navigation Guide for Development Continuation

---

## 📖 Quick Start

### For Current Session
1. Start here: [ACTIVE-TASK-QUEUE.md](ACTIVE-TASK-QUEUE.md) - What to work on now
2. Context: [PLAN-BUILDER-TASKS.md](PLAN-BUILDER-TASKS.md) - Detailed task descriptions
3. Reference: [PLAN-BUILDER-SESSION-2026-01-09.md](PLAN-BUILDER-SESSION-2026-01-09.md) - What was accomplished

### For Project Overview
1. Start here: [PLAN-BUILDER-EXECUTIVE-SUMMARY.md](PLAN-BUILDER-EXECUTIVE-SUMMARY.md) - High-level overview
2. Implementation: [Docs/IMPLEMENTATION-SUMMARY.md](Docs/IMPLEMENTATION-SUMMARY.md) - Full project context
3. Source: [Docs/Plan/code master.ipynb](Docs/Plan/code master.ipynb) - Original requirements

---

## 📁 Documentation Files (This Session)

### Priority Documentation
| File | Purpose | Read Time | For |
|------|---------|-----------|-----|
| [ACTIVE-TASK-QUEUE.md](ACTIVE-TASK-QUEUE.md) | What to work on now | 10 min | Developers |
| [PLAN-BUILDER-EXECUTIVE-SUMMARY.md](PLAN-BUILDER-EXECUTIVE-SUMMARY.md) | Session overview | 15 min | Leads/Reviewers |
| [PLAN-BUILDER-SESSION-2026-01-09.md](PLAN-BUILDER-SESSION-2026-01-09.md) | Technical details | 20 min | Technical reviewers |
| [PLAN-BUILDER-TASKS.md](PLAN-BUILDER-TASKS.md) | Detailed roadmap | 25 min | Project managers |

### Supporting Documentation
| File | Purpose |
|------|---------|
| [Docs/IMPLEMENTATION-SUMMARY.md](Docs/IMPLEMENTATION-SUMMARY.md) | Full project phases 1-5 |
| [Docs/Plan/code master.ipynb](Docs/Plan/code master.ipynb) | Original requirements |
| [_ZENTASKS/tasks.json](_ZENTASKS/tasks.json) | Task state database |

---

## 🏗️ Code Structure

### Core Plan Builder Files

#### Type Definitions & State Management
```
vscode-extension/src/planBuilder/
├── questionFramework.ts       (642 LOC) ✅ DONE
│   └─ WizardPage, Question, ValidationRule interfaces
│   └─ QuestionFramework class with 10 wizard pages
│
├── wizardState.ts             (201 LOC) ✅ DONE
│   └─ WizardStateManager class
│   └─ State persistence to localStorage
│   └─ Progress tracking
│
└── validators.ts              (247 LOC) ✅ DONE
    └─ Validators utility class
    └─ 15+ validation methods
    └─ Composable validation (all/any)
```

#### LLM Integration
```
├── architectureSuggestions.ts  (214 LOC) 🔄 IN-PROGRESS
│   └─ generateArchitectureSuggestions()
│   └─ parseArchitectureSuggestions()
│   └─ formatSuggestionsForDisplay()
│
├── llmPrompts.ts               (156 LOC) ✅ DONE
│   └─ PROMPTS constant (architecture, decomposition, etc.)
│   └─ composePrompt()
│   └─ formatConversationContext()
│
└── taskDecomposition.ts         (398 LOC) 🔄 IN-PROGRESS
    └─ decomposeProjectPlan()
    └─ calculateCriticalPath()
    └─ generateTaskYAML()
```

#### Webview Integration
```
src/panels/
├── planBuilderPanel.ts         (145 LOC) ✅ DONE
│   └─ PlanBuilderPanel class
│   └─ Lifecycle management
│   └─ Message routing
│
└─ ../commands/
    └─ planBuilderCommand.ts    (44 LOC) ✅ DONE
        └─ Command registration
        └─ Contribution point
```

#### Vue 3 UI Components
```
resources/planBuilder/
├── App.vue                     (185 LOC) ✅ DONE
│   └─ Root component
│   └─ State management
│   └─ Message protocol
│
├── WizardPage.vue              (170 LOC) ✅ DONE
│   └─ Page container
│   └─ Question list rendering
│   └─ Navigation buttons
│
├── QuestionCard.vue            (325 LOC) ✅ DONE
│   └─ Question display
│   └─ Input components
│   └─ Inline validation
│
├── ProgressBar.vue             (148 LOC) ✅ DONE
│   └─ Progress indicator
│   └─ Step visualization
│   └─ Page tracking
│
├── index.html                  (11 LOC) ✅ DONE
├── main.ts                     (5 LOC) ✅ DONE
└── vite.config.mjs             (24 LOC) ✅ DONE
```

---

## 📊 Development Status

### Completed Components (80%)
```
✅ Question Framework          - 10-page wizard engine
✅ State Management            - localStorage persistence
✅ Input Validation            - 15+ validator types
✅ Vue 3 Components            - WizardPage, QuestionCard, ProgressBar
✅ Webview Integration         - Panel lifecycle, message routing
✅ LLM Prompts                 - Architecture & decomposition templates
✅ Architecture Engine         - Suggestion generation & parsing
✅ Decomposition Engine        - Task generation & critical path
✅ Build System                - Vite compilation working
```

### In Progress (10%)
```
🔄 Unit Tests - LLM Suggestions     - Needs test file creation
🔄 Unit Tests - Decomposition      - Needs test file creation
🔄 Wire Handlers - Webview Panel   - Needs message implementation
```

### Pending (10%)
```
📅 Integration Tests            - E2E wizard flow
📅 Backend Integration          - MCP API endpoints
📅 Design System Editor         - WYSIWYG design tokens
📅 Export Formats               - JSON/PDF/GitHub/Markdown
📅 Performance Optimization     - Benchmarking
```

---

## 🔄 Development Workflow

### Step 1: Start Session
1. Review [ACTIVE-TASK-QUEUE.md](ACTIVE-TASK-QUEUE.md) for next task
2. Note task ID and expected effort
3. Review acceptance criteria

### Step 2: Implement
1. Create necessary files in appropriate directories
2. Follow existing code patterns and style
3. Add TypeScript types and JSDoc comments
4. Handle errors explicitly

### Step 3: Test
1. Create unit tests for new code
2. Run test suite: `npm test`
3. Verify 0 compilation errors: `npm run compile`
4. Check test coverage

### Step 4: Document
1. Update relevant markdown files
2. Add comments for complex logic
3. Update task status in tasks.json
4. Create session summary

### Step 5: Commit
1. Update this index if needed
2. Mark task done in _ZENTASKS/tasks.json
3. Create follow-up tasks if discovered

---

## 🎯 Next Immediate Tasks (Ready Now)

### Task 1: LLM Suggestions Unit Tests (2-3 hrs)
**File**: `src/planBuilder/__tests__/architectureSuggestions.test.ts`
- Mock LLM responses
- Test prompt composition
- Test JSON parsing
- Test error handling

### Task 2: Decomposition Unit Tests (2-3 hrs)
**File**: `src/planBuilder/__tests__/taskDecomposition.test.ts`
- Test task generation logic
- Verify critical path calculation
- Validate YAML generation
- Test edge cases

### Task 3: Wire Handlers (2-3 hrs)
**File**: `src/panels/planBuilderPanel.ts`
- Implement _handleWizardCompletion()
- Call LLM engines
- Generate task files
- Send notifications

### Task 4: Integration Tests (4-5 hrs)
**File**: `src/planBuilder/__tests__/integration/wizardFlow.test.ts`
- Full wizard → tasks flow
- Mock all external calls
- Validate outputs
- Test error recovery

---

## 📈 Success Metrics

### This Sprint (Next 8-12 hours)
- ✅ All unit tests passing
- ✅ Integration tests running
- ✅ Wizard → tasks flow working
- ✅ >85% code coverage

### End of Week (Next 24-36 hours)
- ✅ Backend API working
- ✅ 90%+ test coverage
- ✅ Full E2E tests passing
- ✅ Performance benchmarked

### End of Phase (Next 48-72 hours)
- ✅ MVP feature-complete
- ✅ All exports working
- ✅ 95%+ test coverage
- ✅ Security audit passed

---

## 🔗 Important Links

### Code Files
- [questionFramework.ts](vscode-extension/src/planBuilder/questionFramework.ts)
- [architectureSuggestions.ts](vscode-extension/src/planBuilder/architectureSuggestions.ts)
- [taskDecomposition.ts](vscode-extension/src/planBuilder/taskDecomposition.ts)
- [planBuilderPanel.ts](vscode-extension/src/panels/planBuilderPanel.ts)
- [App.vue](vscode-extension/resources/planBuilder/App.vue)

### Task Files
- [_ZENTASKS/tasks.json](_ZENTASKS/tasks.json) - Task state
- [PLAN-BUILDER-TASKS.md](PLAN-BUILDER-TASKS.md) - Detailed breakdown
- [ACTIVE-TASK-QUEUE.md](ACTIVE-TASK-QUEUE.md) - Current queue

### Original Requirements
- [Code Master Plan](Docs/Plan/code master.ipynb) - Section 9
- [Implementation Summary](Docs/IMPLEMENTATION-SUMMARY.md)
- [Zen Tasks Workflow](prompts/zen_tasks_workflow.md)

---

## 🧪 Testing Guide

### Run All Tests
```bash
npm test
# Expected: 16 passing, 4 pending (baseline maintained)
```

### Run Specific Test File
```bash
npx mocha dist/planBuilder/__tests__/architectureSuggestions.test.js
```

### Run with Coverage
```bash
npx nyc npm test
# Target: >85% coverage on Plan Builder files
```

### Debug Tests
```bash
node --inspect-brk node_modules/.bin/mocha dist/test.js
# Opens Chrome DevTools debugger
```

---

## 🐛 Common Issues & Solutions

### Issue 1: npm not found in terminal
**Solution**: Terminal sessions don't inherit PATH. Use full path or start new terminal.
```bash
"C:\Program Files\nodejs\npm.cmd" run compile
```

### Issue 2: Vite build fails
**Solution**: Ensure Node.js version compatible. Create vite.config.mjs (ESM module).
```bash
node --version  # Should be 20.19+ or 22.12+
```

### Issue 3: WebviewPanel CSP errors
**Solution**: Use nonce-based script injection. See planBuilderPanel.ts for example.
```typescript
const nonce = getNonce();
// Include in script tags: nonce="${nonce}"
```

### Issue 4: LLM response parsing fails
**Solution**: Handle markdown code blocks and partial JSON.
```typescript
// Extract JSON from ```json ... ``` blocks
const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
```

---

## 📞 Getting Help

### For Technical Questions
- Refer to: [PLAN-BUILDER-SESSION-2026-01-09.md](PLAN-BUILDER-SESSION-2026-01-09.md)
- Code comments in relevant files
- Existing tests as examples

### For Task Context
- Refer to: [PLAN-BUILDER-TASKS.md](PLAN-BUILDER-TASKS.md)
- Task descriptions in _ZENTASKS/tasks.json
- Original requirements in Code Master

### For Architecture Overview
- Refer to: [PLAN-BUILDER-EXECUTIVE-SUMMARY.md](PLAN-BUILDER-EXECUTIVE-SUMMARY.md)
- Architecture diagrams in session summary
- Message protocol in planBuilderPanel.ts

---

## 🚀 Quick Reference

### File Organization
```
vscode-extension/
├── src/
│   ├── planBuilder/
│   │   ├── *.ts (core logic)
│   │   └── __tests__/ (unit tests)
│   ├── panels/
│   │   └── planBuilderPanel.ts
│   └── commands/
│       └── planBuilderCommand.ts
└── resources/
    └── planBuilder/
        ├── *.vue (UI components)
        └── {index.html, main.ts, vite.config.mjs}
```

### Key Patterns
1. **State Management**: WizardStateManager handles persistence
2. **Validation**: Validators utility with composable rules
3. **LLM Integration**: Mock-friendly with OpenAI client wrapper
4. **Webview IPC**: Message passing via acquireVsCodeApi()
5. **Vue Components**: Script Setup with TypeScript

### Build Commands
```bash
npm run compile          # Webpack + Vite
npm run build:vue       # Vue app only
npm run watch           # Watch mode
npm test                # Run all tests
```

---

## 📋 Pre-Flight Checklist (Before Starting Work)

- [ ] Reviewed ACTIVE-TASK-QUEUE.md
- [ ] Selected next task from priority list
- [ ] Read acceptance criteria for task
- [ ] Checked dependencies are complete
- [ ] Verified code compiles: `npm run compile`
- [ ] Tests passing: `npm test`
- [ ] Opened relevant source files
- [ ] Reviewed existing patterns in codebase
- [ ] Created implementation plan

---

## ✨ Final Notes

### What Makes This Project Special
1. **Autonomous Development**: Uses Zen Tasks workflow
2. **LLM-Powered**: Intelligent architecture suggestions
3. **Task Generation**: Auto-decomposes plans into tasks
4. **Full Integration**: From UI to backend to exports

### Quality Standards
- TypeScript strict mode everywhere
- 90%+ test coverage
- Zero compilation errors
- Comprehensive error handling
- Clear naming and documentation

### Development Philosophy
- Start simple, iterate quickly
- Test-first approach
- Mock external dependencies
- Clear separation of concerns
- Comprehensive documentation

---

**Status**: 🟢 READY FOR DEVELOPMENT  
**Last Updated**: 2026-01-09  
**Next Sync**: After completing immediate task queue  
**Owner**: Copilot Orchestrator Team
