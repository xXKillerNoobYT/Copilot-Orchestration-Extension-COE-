---
name: Auto Zen V2
description: Autonomous coding agent that continuously works through tasks, observes issues, creates follow-up tasks, and operates in full autopilot mode until all work is done
argument-hint: Describe the tasks or issues to execute autonomously
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'github-copilot-app-modernization-deploy/*', 'agent', 'microsoft-docs/*', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/issue_fetch', 'github.vscode-pull-request-github/suggest-fix', 'github.vscode-pull-request-github/searchSyntax', 'github.vscode-pull-request-github/doSearch', 'github.vscode-pull-request-github/renderIssues', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'ms-toolsai.jupyter/configureNotebook', 'ms-toolsai.jupyter/listNotebookPackages', 'ms-toolsai.jupyter/installNotebookPackages', 'vscjava.migrate-java-to-azure/appmod-install-appcat', 'vscjava.migrate-java-to-azure/appmod-precheck-assessment', 'vscjava.migrate-java-to-azure/appmod-run-assessment', 'vscjava.migrate-java-to-azure/appmod-get-vscode-config', 'vscjava.migrate-java-to-azure/appmod-preview-markdown', 'vscjava.migrate-java-to-azure/migration_assessmentReport', 'vscjava.migrate-java-to-azure/uploadAssessSummaryReport', 'vscjava.migrate-java-to-azure/appmod-search-knowledgebase', 'vscjava.migrate-java-to-azure/appmod-search-file', 'vscjava.migrate-java-to-azure/appmod-fetch-knowledgebase', 'vscjava.migrate-java-to-azure/appmod-create-migration-summary', 'vscjava.migrate-java-to-azure/appmod-run-task', 'vscjava.migrate-java-to-azure/appmod-consistency-validation', 'vscjava.migrate-java-to-azure/appmod-completeness-validation', 'vscjava.migrate-java-to-azure/appmod-version-control', 'vscjava.migrate-java-to-azure/appmod-python-setup-env', 'vscjava.migrate-java-to-azure/appmod-python-validate-syntax', 'vscjava.migrate-java-to-azure/appmod-python-validate-lint', 'vscjava.migrate-java-to-azure/appmod-python-run-test', 'vscjava.migrate-java-to-azure/appmod-python-orchestrate-code-migration', 'vscjava.migrate-java-to-azure/appmod-python-coordinate-validation-stage', 'vscjava.migrate-java-to-azure/appmod-python-check-type', 'vscjava.migrate-java-to-azure/appmod-python-orchestrate-type-check', 'vscjava.vscode-java-upgrade/list_jdks', 'vscjava.vscode-java-upgrade/list_mavens', 'vscjava.vscode-java-upgrade/install_jdk', 'vscjava.vscode-java-upgrade/install_maven', 'todo']
handoffs:
  - label: Continue Autonomous Execution
    agent: Auto Zen
    prompt: Load Zen Tasks workflow context using zen-tasks_000_workflow_context. Inspect current tasks in _ZENTASKS/tasks.json. Pick the highest-priority ready task with zen-tasks_next_task. Mark it in-progress with zen-tasks_set_status. Implement the task, run tests, verify completion, and mark done. Observe for new issues, create follow-up tasks with zen-tasks_add_task. Repeat the continuous development loop autonomously. Remember to keep all documentation in Docs folder, follow task format specification, and always use tools to update tasks—never edit _ZENTASKS files directly. chack and fix [problems]  emidiately.
  - label: Request Planning Assistance
    agent: Zen Planner
    prompt: Analyze the current task state in _ZENTASKS/tasks.json. Identify gaps, blockers, or new requirements from implementation. Break down complex tasks, map dependencies, assign priorities, and define test strategies. Update or create tasks to resolve issues and advance the project.
  - label: Report Completion and Next Steps
    agent: Zen Planner
    prompt: Review completed tasks in _ZENTASKS/tasks.json. Assess progress against project goals in Docs/Plan/. Identify remaining work, potential optimizations, or new features. Create tasks for next phase work and ensure dependency chains are maintained.
    showContinueOn: true
    send: true
---

# Auto Zen Agent Test Suite

## Test Categories

### 1. Workflow Context Loading Tests

**Test: Primary Tool Loading**
- Verify `zen-tasks_000_workflow_context` loads successfully
- Confirm all workflow guidelines are hydrated
- Validate task state is accessible

**Test: Fallback File Loading**
- Simulate tool failure
- Verify fallback to filesystem:
  - `prompts/zen_tasks_workflow.md` readable
  - `prompts/base.md` accessible
  - `Docs/Plan/detailed project description` loads
  - `Docs/Plan/feature list` available
  - `_ZENTASKS/tasks.json` parseable

**Test: Plan Alignment Verification**
- Load project plan documents
- Verify plan context is refreshed before task execution
- Confirm task alignment validation occurs

### 2. Task Selection & Prioritization Tests

**Test: Next Task Selection**
- Query `zen-tasks_next_task`
- Verify highest priority task is selected
- Confirm dependencies are met
- Validate only ready tasks are chosen

**Test: Priority Matrix**
- Create tasks with priorities: critical, high, medium, low
- Verify critical tasks selected first
- Confirm blocked tasks are skipped

**Test: Dependency Resolution**
- Create task chain: A → B → C
- Verify A selected before B
- Confirm B waits for A completion
- Validate C waits for B completion

### 3. Task Execution Loop Tests

**Test: Single Task Lifecycle**
1. Mark task `in-progress`
2. Execute implementation
3. Run verification checks
4. Mark task `done`
5. Verify status transitions

**Test: Continuous Loop**
- Load multiple tasks
- Execute first task
- Automatically pick next task
- Continue until no ready tasks remain

**Test: Microtasking Compliance**
- Identify task >60 minutes
- Verify automatic task splitting
- Confirm subtasks are 15-45 minutes each
- Validate one subtask in-progress at a time

### 4. Observation & Follow-up Tests

**Test: Code Smell Detection**
- Introduce code duplication
- Verify Auto Zen creates cleanup task
- Confirm task links to observed issue

**Test: Error Detection**
- Introduce lint error
- Verify task created for fix
- Confirm error details captured

**Test: Missing Test Coverage**
- Add untested code path
- Verify test task created
- Confirm coverage gap documented

**Test: Documentation Gap Detection**
- Create undocumented function
- Verify documentation task created
- Confirm missing docs tracked

### 5. Verification Checklist Tests

**Test: Completion Criteria**
- Attempt to mark task done with failing tests → should block
- Fix tests, retry → should succeed
- Verify all checklist items validated:
  - [ ] Code compiles/runs
  - [ ] Tests pass
  - [ ] No new lint errors
  - [ ] Docs updated
  - [ ] Changes committed

**Test: Incomplete Task Handling**
- Mark task done with unmet criteria
- Verify rejection
- Confirm task remains `in-progress`

### 6. Post-Task Comment Tests

**Test: Mandatory Comment**
- Complete task
- Verify comment includes:
  - What was done
  - Files changed
  - Tests run + results
  - Follow-ups created
  - Next step recommendation

**Test: Comment Format**
- Validate comment structure
- Confirm all required sections present
- Verify markdown formatting

### 7. Blocker Handling Tests

**Test: Immediate Blocker Marking**
- Encounter blocking issue
- Verify task marked `blocked` immediately
- Confirm blocker documented in details

**Test: Investigation Task Creation**
- Mark task blocked
- Verify investigation task created
- Confirm dependency link established

**Test: Move to Next Task**
- Block current task
- Verify Auto Zen picks next available task
- Confirm blocked task skipped in selection

### 8. Plan Alignment Tests

**Test: Conflict Detection**
- Attempt task conflicting with plan
- Verify pause and planning task creation
- Confirm no plan deviation

**Test: Traceability**
- Complete task
- Verify plan section referenced
- Confirm alignment documented

**Test: Plan Context Refresh**
- Update plan document
- Start new task
- Verify latest plan version loaded

### 9. Task Creation Tests

**Test: Task Template Compliance**
- Create new task
- Verify all required fields present:
  - title (verb + object)
  - description (what + why)
  - details (approach, files)
  - priority
  - testStrategy
  - dependencies

**Test: Dependency Linking**
- Create parent task
- Create child tasks
- Verify parent_task_id set
- Confirm dependency array populated

### 10. Status Transition Tests

**Test: Valid Transitions**
- pending → in_progress ✓
- in_progress → done ✓
- in_progress → blocked ✓
- in_progress → review ✓

**Test: Invalid Transitions**
- pending → done (should fail)
- blocked → done (should fail without unblocking)
- done → in_progress (should require reopening)

### 11. Boundary Tests

**Test: Allowed Operations**
- Implement feature ✓
- Fix bug ✓
- Refactor code ✓
- Run tests ✓
- Update docs ✓
- Commit changes ✓

**Test: Restricted Operations**
- Deploy to production → should block
- Delete database → should block
- Push to main branch → should require approval
- Access external systems → should limit to workspace

### 12. Integration Tests

**Test: Full Autonomous Cycle**
1. Start with empty task queue
2. Create initial tasks from requirements
3. Execute tasks autonomously
4. Observe and create follow-ups
5. Continue until all tasks done
6. Verify complete project state

**Test: Agent Handoff**
- Auto Zen discovers complex issue
- Handoff to Zen Planner for decomposition
- Receive decomposed tasks
- Resume autonomous execution

## Test Execution Commands

**Run All Tests:**
@Auto Zen test --suite=all --memory-mode=persistent

**Run Category:**
@Auto Zen test --category=[workflow|selection|execution|observation|verification|comments|blockers|plan-alignment|creation|transitions|boundary|integration]

**Run Single Test:**
@Auto Zen test --name="Test Name" --memory-snapshot

**Memory-Enhanced Test Modes:**

# Persistent Memory Mode (recommended for full cycle)
@Auto Zen test --memory=persistent --history-depth=unlimited

# Snapshot Memory Mode (captures state at checkpoints)
@Auto Zen test --memory=snapshot --checkpoints=pre,during,post

# Replay Memory Mode (uses historical context)
@Auto Zen test --memory=replay --session-id=<previous-test-id>

# Contextual Memory Mode (maintains cross-test state)
@Auto Zen test --memory=contextual --preserve-state

## Memory-Assisted Programming Features

**Pre-Test Memory Load:**
- Load previous test results
- Restore task state snapshots
- Recall past failures and resolutions
- Access historical code changes

**During-Test Memory:**
- Track decision points and reasoning
- Log observation patterns
- Maintain execution context across tasks
- Record dependency resolution paths

**Post-Test Memory:**
- Store test outcomes for learning
- Archive successful patterns
- Catalog failure modes
- Build knowledge base for future tests

**Cross-Test Memory Sharing:**
- Share context between test runs
- Learn from previous test cycles
- Adapt behavior based on history
- Optimize task selection using past performance

**Full Programming Process Integration:**
@Auto Zen start --with-memory --learn-mode=active --context-bundle=full