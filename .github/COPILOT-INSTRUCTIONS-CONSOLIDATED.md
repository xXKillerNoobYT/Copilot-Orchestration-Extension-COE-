# Consolidated Copilot Instructions - Multi-Agent Orchestration System

**Last Updated**: 2026-01-10  
**Status**: Active - Phase 2 Complete, All Agents Integrated

---

## 🚀 Quick Start

### For Autonomous Development
```
@Auto Zen start
```

### For Planning & Requirements
```
@Zen Planner analyze [requirements]
```

### For Testing & Quality
```
@Testing Agent validate [component]
```

---

## 📋 Complete Agent Reference

### 1. **Auto Zen** — Autonomous Code Executor
**When**: Ready to execute tasks, need autonomous work loop  
**Quick Invocation**: `@Auto Zen start` or `@Auto Zen continue`

**Core Responsibilities**:
- ✅ Continuous task execution in autonomous loop
- ✅ Proactive code issue detection
- ✅ Automatic follow-up task creation
- ✅ One task in-progress at a time
- ✅ Mandatory post-task comments

**Must Read Before Starting**:
1. `Docs/Plan/detailed project description` — project vision
2. `Docs/Plan/feature list` — planned features
3. `_ZENTASKS/tasks.json` — current task state

**Core Loop**:
```
1. Load context (Zen Tasks tool or fallback files)
2. Refresh plan from Docs/Plan/
3. Get next task: highest priority + dependencies met + plan-aligned
4. Mark in-progress
5. Execute (implement + test + verify)
6. Mark done
7. Observe for new issues → create follow-up tasks
8. Repeat
```

**What Gets Observed** (create tasks for):
- Code smells, duplication, complexity
- Lint/type errors, test failures
- Missing test coverage
- Documentation gaps
- Security concerns
- Performance issues

**Task Completion Checklist**:
- [ ] Code compiles/runs without errors
- [ ] Tests pass (new tests added if needed)
- [ ] No new lint/type errors
- [ ] Related docs updated
- [ ] Changes staged/committed

---

### 2. **Zen Planner** — Strategic Task Architect
**When**: Have requirements, need task breakdown, planning work  
**Quick Invocation**: `@Zen Planner analyze [requirements]`

**Core Responsibilities**:
- ✅ Requirements analysis & decomposition
- ✅ Dependency mapping (hard, soft, parallel)
- ✅ Priority assignment
- ✅ Microtask enforcement (15-45 min)
- ✅ Circular dependency detection

**Microtasking Rules** (MUST FOLLOW):
- Default: 15-45 minute subtasks
- Split if: >60 min OR multiple actions/domains
- Never: Multiple actions in one subtask
- Max: One subtask in-progress per person

**Task Creation Template**:
```yaml
title: "Verb + Clear Object"
description: "What and Why"
details: "Files, approach, edge cases"
priority: critical | high | medium | low
dependencies: [TASK-xxx]
testStrategy: "How to verify"
```

**Priority Scale**:
| Level | Criteria |
|-------|----------|
| critical | Blocking all work, security, production down |
| high | Critical path, time-sensitive, unblocks multiple |
| medium | Standard feature work |
| low | Nice-to-have, tech debt |

---

### 3. **Testing Agent** — Quality Assurance Specialist
**When**: Need comprehensive testing, coverage verification, quality gates  
**Quick Invocation**: `@Testing Agent validate [component]`

**Core Responsibilities**:
- ✅ Test generation (unit, integration, E2E)
- ✅ Coverage analysis & reporting
- ✅ Quality gate enforcement
- ✅ Test failure investigation
- ✅ Testability improvements

**Test Strategy Template**:
```
Unit Tests (85%+ target):
  - Framework: [jest|pytest|phpunit]
  - Happy path tests
  - Error condition tests
  - Edge case tests

Integration Tests (70%+ target):
  - Component integration
  - Workflow scenarios
  - Boundary conditions

E2E Tests (50%+ target):
  - User journey workflows
  - Full feature paths
  - Critical workflows

Quality Gates:
  ✓ All tests passing
  ✓ 80%+ coverage overall
  ✓ No new warnings/errors
  ✓ No performance regression
```

---

### 4. **Plan Agent** — System Architecture & Constraints
**When**: Architectural decisions, design validation, constraint enforcement  
**Quick Invocation**: `@Plan Agent design [system aspect]`

**Core Responsibilities**:
- ✅ Architecture design & pattern enforcement
- ✅ Constraint validation
- ✅ Design review
- ✅ Technical decision documentation
- ✅ Architectural boundary protection

**Must Validate Against**:
- `Docs/Plan/detailed project description` — approved architecture
- Established patterns in codebase
- Technical constraints
- Architectural boundaries

---

### 5. **Dependency Agent** — Relationship & Workflow Manager
**When**: Complex dependency chains, workflow optimization, risk assessment  
**Quick Invocation**: `@Dependency Agent analyze [workflow]`

**Core Responsibilities**:
- ✅ Dependency chain analysis
- ✅ Circular dependency detection
- ✅ Critical path identification
- ✅ Parallel track optimization
- ✅ Risk mitigation planning

---

### 6. **Issue Handler** — Bug Triage & Resolution
**When**: Bug reports, issue investigation, problem solving  
**Quick Invocation**: `@Issue Handler investigate [issue]`

**Core Responsibilities**:
- ✅ Issue analysis & reproduction
- ✅ Root cause investigation
- ✅ Solution prototyping
- ✅ Fix implementation
- ✅ Regression prevention

---

## 🔄 Agent Handoff Protocol

```
Auto Zen Implementation
    ↓ (observes issues)
    ↓
Zen Planner (creates tasks)
    ↓ (confirms alignment)
    ↓
Testing Agent (validates)
    ↓ (identifies gaps)
    ↓
Auto Zen (implements fixes)
    ↓
[Loop continues]
```

---

## 📁 Workflow Context Loading

### Primary: Use Zen Tasks Tools
1. `zen-tasks_000_workflow_context` — load guidelines
2. `zen-tasks_list_tasks` — query tasks
3. `zen-tasks_next_task` — get next ready
4. `zen-tasks_add_task` — create tasks
5. `zen-tasks_set_status` — update progress

### Fallback: Read Files Directly
```
prompts/zen_tasks_workflow.md ← workflow rules
prompts/base.md ← system overview
Docs/Plan/detailed project description ← vision
Docs/Plan/feature list ← planned features
_ZENTASKS/tasks.json ← current state
```

---

## 📂 Document Organization Structure

### Folder Organization (REQUIRED)
```
Docs/
├── Plan/                    # Planning & vision
│   ├── detailed project description
│   ├── feature list
│   └── todo
├── Implementation/          # Technical docs
├── Setup/                   # Setup guides
├── Testing/                 # Test documentation
├── Delivery/                # Release notes
├── Sessions/                # Session records (NEW)
└── README.md               # Navigation guide (NEW)
```

### Document Types & Locations

| Document Type | Location | Naming |
|---|---|---|
| Session reports | Docs/Sessions/ | SESSION-YYYY-MM-DD-[topic].md |
| Task completions | Docs/Sessions/ | TASK-[id]-[description].md |
| Technical guides | Docs/Implementation/ | [topic]-guide.md |
| Setup procedures | Docs/Setup/ | [topic]-setup.md |
| Test strategies | Docs/Testing/ | [topic]-test-strategy.md |
| Release notes | Docs/Delivery/ | RELEASE-v[version].md |

### Post-Task Document Checklist
When completing ANY task, create a document in `Docs/Sessions/`:
```markdown
# [Task/Session Title]

## Status: COMPLETED

## Deliverables
- [x] Code implementation
- [x] Tests passing
- [x] Documentation updated
- [x] Session file created
- [x] Tasks updated

## Files Changed
- List all modified files

## Tests
- Unit: X/X passing
- Integration: Y/Y passing
- E2E: Z/Z passing

## Related Tasks
- Link to _ZENTASKS files

## Next Steps
- Recommendations for continuation
```

---

## 🔍 Observation & Task Creation Protocol

When agents discover issues, they MUST create follow-up tasks:

### Code Quality Issues
- **Code smells** → Create: `REFACTOR: [issue]`
- **Dead code** → Create: `CLEANUP: Remove [component]`
- **Duplication** → Create: `REFACTOR: Extract [pattern]`

### Test Coverage Gaps
- **Untested code** → Create: `TEST: Add coverage for [function]`
- **Uncovered branches** → Create: `TEST: Cover edge case in [module]`
- **Missing integration tests** → Create: `TEST: Integration test for [feature]`

### Documentation Gaps
- **Missing API docs** → Create: `DOCS: Document [endpoint]`
- **Outdated guides** → Create: `DOCS: Update [guide]`
- **Missing examples** → Create: `DOCS: Add example for [feature]`

### Performance Issues
- **Slow operations** → Create: `PERF: Optimize [operation]`
- **Large bundles** → Create: `PERF: Reduce bundle for [module]`
- **Memory leaks** → Create: `DEBUG: Investigate leak in [component]`

### Security Concerns
- **Exposed secrets** → Create: `SECURITY: Remove secret from [file]`
- **Vulnerable patterns** → Create: `SECURITY: Fix [vulnerability]`
- **Missing validation** → Create: `SECURITY: Add validation for [input]`

---

## 🏗️ Architecture Overview

### Backend (Laravel)
- **Location**: `app/` folder
- **API**: `routes/api.php`
- **Logic**: `app/Services/` (business rules)
- **Data**: `app/Repositories/` + `app/Models/` (Eloquent)
- **Key Models**: Task, Agent, ContextBundle, WorkflowState

### Frontend (Vue 3 + Vite)
- **Root**: `resources/js/`
- **Build**: `npm run dev` or `npm run build`
- **Config**: Root `package.json`

### VS Code Extension
- **Location**: `vscode-extension/`
- **Entry**: `src/extension.ts`
- **Build**: `cd vscode-extension && npm run compile`
- **Dev**: `npm run watch`

### Database
- **Migrations**: `database/migrations/2026_*`
- **Seeds**: `database/seeders/`
- **Factories**: `database/factories/`

---

## 🔑 Domain Rules & Conventions

### Task Enums (MUST KEEP CONSISTENT)
- **Types**: feature|bug|refactor|maintenance|architecture|testing|documentation
- **Priority**: critical|high|medium|low
- **Status**: pending|in_progress|testing|review|completed|failed|blocked|cancelled

### Task Structure
```yaml
id: unique identifier
title: action verb + object
description: what + why
details: approach + files + edge cases
priority: see enum above
status: see enum above
dependencies: [list of task IDs]
testStrategy: how to verify
```

### Code Layering
- **Controllers**: Thin, delegate to services
- **Services**: Business logic, coordination
- **Repositories**: Data access, Eloquent queries
- **Exceptions**: Custom exceptions under `app/Exceptions/`
- **Tests**: Keep fixtures/factories in `database/factories/`

---

## 📊 Build & Test Commands

### Backend
```bash
# Setup
composer install
cp .env.example .env
php artisan key:generate

# Run
php artisan serve

# Test
phpunit
```

### Frontend (Vue)
```bash
# Install
npm install

# Dev
npm run dev

# Build
npm run build
```

### VS Code Extension
```bash
cd vscode-extension

# Install
npm install

# Dev/Watch
npm run watch

# Build
npm run compile

# Test
npm test
```

---

## ✅ Pre-Task Checklist

Before starting ANY task, verify:
- [ ] Read `Docs/Plan/detailed project description`
- [ ] Read `Docs/Plan/feature list`
- [ ] Reviewed current tasks in `_ZENTASKS/tasks.json`
- [ ] Task is plan-aligned
- [ ] Dependencies are met
- [ ] Understand acceptance criteria

---

## 📋 Post-Task Checklist

Before marking task DONE:
- [ ] Code compiles/runs
- [ ] Tests pass
- [ ] No new errors/warnings
- [ ] Documentation updated
- [ ] Session file created in `Docs/Sessions/`
- [ ] Follow-up tasks created if needed
- [ ] Changes committed

---

## 🚨 When Stuck

1. Mark task as **blocked**
2. Document blocker in task details
3. Create **investigation task**
4. Switch to next available task
5. Return when blocker resolved

---

## 📍 Key Locations

| Item | Location |
|------|----------|
| Task state | `_ZENTASKS/tasks.json` |
| Project plan | `Docs/Plan/detailed project description` |
| Features | `Docs/Plan/feature list` |
| API routes | `routes/api.php` |
| Models | `app/Models/` |
| Services | `app/Services/` |
| Extension | `vscode-extension/` |
| Agents | `.github/agents/` |
| This guide | `.github/copilot-instructions.md` |

---

## 🎯 Remember

- **Always** read plan documents first
- **Always** create session docs after completing tasks
- **Always** follow microtasking rules (15-45 min subtasks)
- **Always** observe and create follow-up tasks
- **Never** deviate from the documented plan
- **Never** skip tests or documentation
- **Never** commit without meaningful messages

---

**Ready to execute. Let's build this right.** ✨
