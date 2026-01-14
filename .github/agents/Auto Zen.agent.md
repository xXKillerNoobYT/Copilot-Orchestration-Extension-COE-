---
name: Auto Zen
description: Autonomous coding agent that continuously works through tasks, observes issues, creates follow-up tasks, and operates in full autopilot mode until all work is done
argument-hint: Describe the tasks or issues to execute autonomously
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'copilot-container-tools/*', 'context7/*', 'github/*', 'github/*', 'playwright/*', 'agent', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/issue_fetch', 'github.vscode-pull-request-github/suggest-fix', 'github.vscode-pull-request-github/searchSyntax', 'github.vscode-pull-request-github/doSearch', 'github.vscode-pull-request-github/renderIssues', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'ms-toolsai.jupyter/configureNotebook', 'ms-toolsai.jupyter/listNotebookPackages', 'ms-toolsai.jupyter/installNotebookPackages', 'todo']
handoffs:
  - label: Continue Autonomous Execution
    agent: Auto Zen
    prompt: Load workflow context from Docs/Plan/ (detailed project description and feature list). Query current GitHub Issues using github-mcp-server-search_issues to inspect open tasks. Pick the highest-priority ready task (query with filters: is:open -label:"status: blocked" -label:"status: in-progress" sort:priority). Update issue labels to mark in-progress and assign to self. Implement the task, run tests, verify completion, and close the issue (or update labels to done). Observe for new issues during implementation and create follow-up GitHub issues as needed. Repeat the continuous development loop autonomously. Remember to keep all documentation in Docs folder and follow GitHub issue format. Check and fix problems immediately. For cloud deployments or remote operations, create feature branches (feature/{issue-number}-{slug}) and coordinate with GitHub workflows. Hand off cloud-specific tasks to specialized cloud agents when needed.
  
    prompt: Orchestrate work across multiple feature branches. Load all in-progress GitHub issues and their branch associations. Identify parallel work tracks with no cross-dependencies. Execute independent branches concurrently. Queue dependent branches by priority and critical path. Merge completed branches in dependency order. Run integration tests after each merge. Create branch sync issues when conflicts detected. Document multi-branch coordination status in issue comments.
  - label: Request Planning Assistance
    agent: Zen Planner
    prompt: Analyze the current GitHub Issues state using github-mcp-server-list_issues. Identify gaps, blockers, or new requirements from implementation. Break down complex issues, map dependencies, assign priorities, and define test strategies. Create or update GitHub issues to resolve problems and advance the project. Ensure all issues have proper labels (type, priority, status) and are linked via dependencies in issue body.
  - label: Report Completion and Next Steps
    agent: Zen Planner
    prompt: Review completed GitHub issues using github-mcp-server-search_issues with filter 'is:closed'. Assess progress against project goals in Docs/Plan/. Identify remaining work, potential optimizations, or new features. Create issues for next phase work and ensure dependency chains are maintained. Update project documentation with progress summary.
    showContinueOn: true
    send: true
---

# Auto Zen Agent Test Suite

## Test Categories

### 1. Workflow Context Loading Tests

**Test: GitHub Issues Query**
- Verify `github-mcp-server-list_issues` executes successfully
- Confirm all open issues are retrieved
- Validate issue state is accessible

**Test: Plan Document Loading**
- Load project plan from filesystem:
  - `Docs/Plan/detailed project description` loads
  - `Docs/Plan/feature list` available
  - Plan context is accessible

**Test: Plan Alignment Verification**
- Load project plan documents
- Verify plan context is refreshed before issue execution
- Confirm issue alignment validation occurs

### 2. Issue Selection & Prioritization Tests

**Test: Next Issue Selection**
- Query `github-mcp-server-search_issues` with filters
- Verify highest priority issue is selected
- Confirm dependencies are met (via issue body parsing)
- Validate only ready issues are chosen (not blocked, not in-progress)

**Test: Priority Matrix**
- Create issues with priority labels: critical, high, medium, low
- Verify critical issues selected first
- Confirm blocked issues are skipped

**Test: Dependency Resolution**
- Create issue chain: A → B → C (linked via "Depends on #X")
- Verify A selected before B
- Confirm B waits for A completion
- Validate C waits for B completion

### 3. Issue Execution Loop Tests

**Test: Single Issue Lifecycle**
1. Update issue labels to `status: in-progress`
2. Execute implementation
3. Run verification checks
4. Close issue or update to `done` status
5. Verify status transitions

**Test: Continuous Loop**
- Load multiple open issues
- Execute first issue
- Automatically pick next issue
- Continue until no ready issues remain

**Test: Microtasking Compliance**
- Identify issue >60 minutes estimated
- Verify automatic issue splitting (create sub-issues)
- Confirm sub-issues are 15-45 minutes each
- Validate one sub-issue in-progress at a time

### 4. Observation & Follow-up Tests

**Test: Code Smell Detection**
- Introduce code duplication
- Verify Auto Zen creates cleanup issue
- Confirm issue links to observed problem

**Test: Error Detection**
- Introduce lint error
- Verify issue created for fix
- Confirm error details captured in issue body

**Test: Missing Test Coverage**
- Add untested code path
- Verify test issue created
- Confirm coverage gap documented in issue

**Test: Documentation Gap Detection**
- Create undocumented function
- Verify documentation issue created
- Confirm missing docs tracked in issue

### 5. Verification Checklist Tests

**Test: Completion Criteria**
- Attempt to close issue with failing tests → should block
- Fix tests, retry → should succeed
- Verify all checklist items validated:
  - [ ] Code compiles/runs
  - [ ] Tests pass
  - [ ] No new lint errors
  - [ ] Docs updated
  - [ ] Changes committed

**Test: Incomplete Issue Handling**
- Try to close issue with unmet criteria
- Verify rejection
- Confirm issue remains in `status: in-progress`

### 6. Post-Issue Comment Tests

**Test: Mandatory Comment**
- Complete issue
- Verify comment includes:
  - What was done
  - Files changed
  - Tests run + results
  - Follow-up issues created
  - Next step recommendation

**Test: Comment Format**
- Validate comment structure
- Confirm all required sections present
- Verify markdown formatting

### 7. Blocker Handling Tests

**Test: Immediate Blocker Marking**
- Encounter blocking problem
- Verify issue marked `status: blocked` immediately
- Confirm blocker documented in issue comment

**Test: Investigation Issue Creation**
- Mark issue blocked
- Verify investigation issue created
- Confirm dependency link established (Depends on #X)

**Test: Move to Next Issue**
- Block current issue
- Verify Auto Zen picks next available issue
- Confirm blocked issue skipped in selection

### 8. Plan Alignment Tests

**Test: Conflict Detection**
- Attempt issue conflicting with plan
- Verify pause and planning issue creation
- Confirm no plan deviation

**Test: Traceability**
- Complete issue
- Verify plan section referenced in issue comments
- Confirm alignment documented

**Test: Plan Context Refresh**
- Update plan document
- Start new issue
- Verify latest plan version loaded

### 9. Issue Creation Tests

**Test: Issue Template Compliance**
- Create new issue
- Verify all required fields present:
  - title (verb + object)
  - description (what + why)
  - details (approach, files)
  - labels (priority, type, status)
  - test strategy
  - dependencies (in body)

**Test: Dependency Linking**
- Create parent issue
- Create child issues
- Verify "Depends on #X" in issue body
- Confirm dependency chain is valid

### 10. Status Transition Tests

**Test: Valid Label Transitions**
- status: pending → status: in-progress ✓
- status: in-progress → (close issue) ✓
- status: in-progress → status: blocked ✓
- status: in-progress → status: review ✓

**Test: Invalid Transitions**
- status: pending → (close without work) should fail
- status: blocked → (close without unblocking) should fail
- closed → status: in-progress (should require reopening)

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
1. Start with empty issue queue
2. Create initial issues from requirements
3. Execute issues autonomously
4. Observe and create follow-up issues
5. Continue until all issues closed
6. Verify complete project state

**Test: Agent Handoff**
- Auto Zen discovers complex issue
- Handoff to Zen Planner for decomposition
- Receive decomposed sub-issues
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
- Restore issue state snapshots
- Recall past failures and resolutions
- Access historical code changes

**During-Test Memory:**
- Track decision points and reasoning
- Log observation patterns
- Maintain execution context across issues
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
- Optimize issue selection using past performance

**Full Programming Process Integration:**
@Auto Zen start --with-memory --learn-mode=active --context-bundle=full

Use this agent to autonomously execute and manage coding tasks with continuous observation, issue detection, and follow-up task creation until project completion.