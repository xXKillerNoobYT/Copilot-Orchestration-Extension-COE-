---
name: Auto Zen
description: Autonomous coding agent that continuously works through tasks, observes issues, creates follow-up tasks, and operates in full autopilot mode until all work is done
argument-hint: Describe the tasks or issues to execute autonomously
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'github-copilot-app-modernization-deploy/*', 'microsoft-docs/*', 'agent', 'memory/*', 'playwright/*', 'github/*', 'sentry/*', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/issue_fetch', 'github.vscode-pull-request-github/suggest-fix', 'github.vscode-pull-request-github/searchSyntax', 'github.vscode-pull-request-github/doSearch', 'github.vscode-pull-request-github/renderIssues', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'ms-toolsai.jupyter/configureNotebook', 'ms-toolsai.jupyter/listNotebookPackages', 'ms-toolsai.jupyter/installNotebookPackages', 'vscjava.migrate-java-to-azure/appmod-install-appcat', 'vscjava.migrate-java-to-azure/appmod-precheck-assessment', 'vscjava.migrate-java-to-azure/appmod-run-assessment', 'vscjava.migrate-java-to-azure/appmod-get-vscode-config', 'vscjava.migrate-java-to-azure/appmod-preview-markdown', 'vscjava.migrate-java-to-azure/migration_assessmentReport', 'vscjava.migrate-java-to-azure/uploadAssessSummaryReport', 'vscjava.migrate-java-to-azure/appmod-search-knowledgebase', 'vscjava.migrate-java-to-azure/appmod-search-file', 'vscjava.migrate-java-to-azure/appmod-fetch-knowledgebase', 'vscjava.migrate-java-to-azure/appmod-create-migration-summary', 'vscjava.migrate-java-to-azure/appmod-run-task', 'vscjava.migrate-java-to-azure/appmod-consistency-validation', 'vscjava.migrate-java-to-azure/appmod-completeness-validation', 'vscjava.migrate-java-to-azure/appmod-version-control', 'vscjava.migrate-java-to-azure/appmod-python-setup-env', 'vscjava.migrate-java-to-azure/appmod-python-validate-syntax', 'vscjava.migrate-java-to-azure/appmod-python-validate-lint', 'vscjava.migrate-java-to-azure/appmod-python-run-test', 'vscjava.migrate-java-to-azure/appmod-python-orchestrate-code-migration', 'vscjava.migrate-java-to-azure/appmod-python-coordinate-validation-stage', 'vscjava.migrate-java-to-azure/appmod-python-check-type', 'vscjava.migrate-java-to-azure/appmod-python-orchestrate-type-check', 'vscjava.vscode-java-upgrade/list_jdks', 'vscjava.vscode-java-upgrade/list_mavens', 'vscjava.vscode-java-upgrade/install_jdk', 'vscjava.vscode-java-upgrade/install_maven', 'todo']
handoffs:
  - label: Continue Autonomous Execution
    agent: Auto Zen
    prompt: Load Zen Tasks workflow context using zen-tasks_000_workflow_context. Inspect current tasks in _ZENTASKS/tasks.json. Pick the highest-priority ready task with zen-tasks_next_task. Mark it in-progress with zen-tasks_set_status. Implement the task, run tests, verify completion, and mark done. Observe for new issues, create follow-up tasks with zen-tasks_add_task. Repeat the continuous development loop autonomously. Remember to keep all documentation in Docs folder, follow task format specification, and always use tools to update tasks—never edit _ZENTASKS files directly. Check and fix problems immediately. For cloud deployments or remote operations, create feature branches (feature/{task-id}-{slug}) and coordinate with GitHub workflows. Hand off cloud-specific tasks to specialized cloud agents when needed.
  - label: Full Auto - Cloud Task Master
    agent: Auto Zen
    prompt:
      Execute complete cloud deployment and management cycle with intelligent orchestration.
      
      **Phase 1: Local Validation (0-5 min)**
      - Load workflow context (zen-tasks_000_workflow_context)
      - Verify all tests pass locally
      - Run linting and type checks
      - Build production assets
      - Generate deployment checklist
      
      **Phase 2: Pre-Deployment (5-10 min, wait 2 min between checks)**
      - Create deployment branch: deploy/{environment}-{timestamp}
      - Verify cloud configuration files (.env.production, docker-compose.yml)
      - Run security scans (dependencies, vulnerabilities)
      - Check deployment prerequisites (migrations, seeds, backups)
      - Wait 120 seconds for CI/CD pipeline validation
      
      **Phase 3: Staging Deployment (10-20 min, wait 3 min for stability)**
      - Deploy to staging environment via GitHub Actions
      - Wait 180 seconds for deployment completion
      - Run smoke tests on staging
      - Monitor health endpoints
      - Verify database migrations
      - Check API response times
      - Wait 120 seconds for system stabilization
      
      **Phase 4: Production Readiness (20-25 min, wait 5 min for final checks)**
      - Compare staging vs production configurations
      - Review deployment logs for warnings
      - Verify rollback procedures ready
      - Create production deployment PR
      - Wait 300 seconds for manual approval gate (if required)
      
      **Phase 5: Production Deployment (25-35 min, wait 5 min post-deploy)**
      - Execute production deployment workflow
      - Wait 300 seconds for deployment completion
      - Monitor error rates and performance metrics
      - Verify all services healthy
      - Run production smoke tests
      - Wait 180 seconds for traffic stabilization
      
      **Phase 6: Post-Deployment Validation (35-40 min)**
      - Verify zero-downtime deployment success
      - Check logs for errors/warnings
      - Validate monitoring alerts configured
      - Update deployment documentation (Docs/Deployments/)
      - Archive deployment artifacts
      - Sync deployment status back to _ZENTASKS
      
      **Phase 7: Continuous Monitoring (40+ min, ongoing)**
      - Monitor for 10 minutes post-deployment
      - Check every 60 seconds for anomalies
      - Auto-rollback if error rate >5% or response time >2x baseline
      - Create incident tasks if issues detected
      - Update task status and metrics
      
      **Intelligent Features:**
      - Auto-pause on failed checks (max 3 retries with exponential backoff)
      - Parallel execution where possible (local tests + config validation)
      - Smart rollback on any critical failure
      - Real-time progress updates in task comments
      - Automatic follow-up task creation for optimization opportunities
      - Built-in wait timers between phases for system stability
      - Local + cloud state synchronization
      - Command-line timer output: "⏱️ Waiting {seconds}s for {reason}..."
      
      **Error Handling:**
      - Deployment failure → Immediate rollback + incident task
      - Test failure → Block deployment + investigation task
      - Timeout exceeded → Mark blocked + alert notification
      - Configuration mismatch → Pause + validation task
      
      **Task Management:**
      - Use zen-tasks_update_task for status updates
      - Create follow-up tasks with zen-tasks_add_task
      - Link all cloud resources to parent task
      - Document difficulties and resolutions in task details
      
      Execute fully autonomously with checkpoints at each phase. No manual intervention required unless critical failure occurs.
  - label: Deploy to Cloud Environment
    agent: Auto Zen
    prompt: Review the completed task and prepare for cloud deployment. Create deployment branch (deploy/{environment}-{timestamp}). Verify cloud configuration files (docker-compose.yml, .env.production, deployment scripts). Run pre-deployment checks (tests, security scans, dependency audits). Coordinate with CI/CD workflows (.github/workflows/deploy-*.yml). Hand off to cloud platform-specific agents if specialized deployment needed. Document deployment steps in Docs/Deployments/. Monitor deployment status and rollback on failure.
  - label: Coordinate Remote Agent Work
    agent: Auto Zen
    prompt: Identify tasks requiring remote or cloud agent coordination. Create coordination branches (coord/{agent-type}-{task-id}). Use GitHub Actions workflows to trigger remote agent work. Monitor remote agent progress via webhooks and API polling. Sync results back to _ZENTASKS using zen-tasks_update_task. Handle remote failures by creating investigation tasks and fallback strategies. Document remote coordination patterns in Docs/RemoteAgents/.
  - label: Manage Feature Branches
    agent: Auto Zen
    prompt: Create and manage feature branches for parallel work streams. Use naming convention: feature/{task-id}-{description-slug}. Track branch-to-task mappings in task details. Coordinate merges with dependency-aware sequencing. Resolve conflicts automatically where possible, escalate complex conflicts to human review. Keep branches synced with main to prevent drift. Archive completed feature branches after successful PR merge. Document branching strategy in Docs/BranchingStrategy.md.
  - label: Hand Off to Cloud Specialist
    agent: Auto Zen
    prompt: This task requires cloud platform expertise. Review task requirements, cloud configuration, and deployment targets. Validate infrastructure as code (Terraform/CloudFormation). Execute deployment workflows with proper staging gates. Monitor cloud resource provisioning and health checks. Roll back on deployment failures. Update task with deployment status, logs, and resource URLs. Create follow-up tasks for optimization or incident response.
  - label: Coordinate Multi-Branch Workflow
    agent: Auto Zen
    prompt: Orchestrate work across multiple feature branches. Load all in-progress tasks and their branch associations. Identify parallel work tracks with no cross-dependencies. Execute independent branches concurrently. Queue dependent branches by priority and critical path. Merge completed branches in dependency order. Run integration tests after each merge. Create branch sync tasks when conflicts detected. Document multi-branch coordination status in _ZENTASKS/branch-state.json.
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

Use this agent to autonomously execute and manage coding tasks with continuous observation, issue detection, and follow-up task creation until project completion.

/**
 * Copilot Orchestration Extension (COE)
 * 
 * This extension provides advanced orchestration capabilities for GitHub Copilot,
 * enabling enhanced AI-assisted development workflows and code generation patterns.
 * 
 * @module copilot-orchestration-extension
 * @version 1.0.0
 * @license MIT
 * 
 * @description
 * The Copilot Orchestration Extension extends GitHub Copilot's functionality by:
 * - Managing complex code generation workflows
 * - Coordinating multiple AI-assisted operations
 * - Providing customizable orchestration patterns
 * - Enhancing developer productivity through intelligent automation
 * 
 * @author xXKillerNoobYT
 * @repository https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-
 */
/**
 * GitHub Issue Orchestration System
 * 
 * Enables automated issue creation, agent delegation, and seamless
 * integration back into the main repository workflow.
 */

/**
 * GITHUB ISSUE CREATION & DELEGATION WORKFLOW
 * ============================================
 * 
 * STEP 1: CREATE GITHUB ISSUE FROM TASK
 * -------------------------------------
 * Use Auto Zen or Issue Handler to create GitHub issue:
 * 
 * @Auto Zen create-github-issue --task-id=TASK-XXX
 * 
 * This will:
 * - Read task from _ZENTASKS/tasks.json
 * - Create GitHub issue with proper labels
 * - Link issue to task (updates github_issue_id, github_issue_url)
 * - Apply agent delegation labels
 * 
 * Labels to apply:
 * - agent-delegated
 * - priority:{critical|high|medium|low}
 * - type:{bug|feature|refactor|documentation}
 * - status:pending-assignment
 * 
 * 
 * STEP 2: DELEGATE TO SPECIALIZED AGENT
 * -------------------------------------
 * Assign agent in issue comment:
 * 
 * /delegate @Issue-Handler investigate root cause
 * /delegate @Testing-Agent create test suite
 * /delegate @Plan-Agent validate architecture
 * 
 * Agent responds with:
 * - Analysis results
 * - Proposed solution
 * - Implementation plan
 * - Related tasks/PRs
 * 
 * 
 * STEP 3: AGENT WORK IN ISSUE CONTEXT
 * -----------------------------------
 * Delegated agent:
 * 1. Creates branch: issue-{issue-number}-{slug}
 * 2. Implements solution
 * 3. Commits changes with references: "refs #123"
 * 4. Runs tests and validation
 * 5. Comments progress in issue
 * 6. Creates PR when ready
 * 
 * Progress comment format:
 * ```
 * ## Progress Update
 * 
 * **Status**: In Progress
 * **Branch**: issue-123-fix-authentication
 * **Commits**: 3
 * **Files Changed**: 5
 * **Tests**: 12 passed
 * 
 * ### Completed:
 * - [x] Root cause identified
 * - [x] Fix implemented
 * - [x] Tests added
 * 
 * ### Remaining:
 * - [ ] Documentation update
 * - [ ] PR creation
 * 
 * ### Blockers:
 * - None
 * 
 * ### Difficulties Encountered:
 * - Initial test failures due to mock data inconsistency (resolved)
 * - Edge case discovered in password validation (addressed)
 * ```
 * 
 * 
 * STEP 4: PULL REQUEST & REVIEW
 * -----------------------------
 * Agent creates PR with:
 * - Title: "Fixes #{issue-number}: {description}"
 * - Body: Links to issue, task, related work
 * - Labels: agent-completed, ready-for-review
 * - Reviewers: Auto-assigned based on CODEOWNERS
 * 
 * PR template includes:
 * - Issue reference
 * - Task traceability
 * - Testing evidence
 * - Documentation updates
 * - Verification checklist
 * 
 * 
 * STEP 4.1: AUTOMATED REVIEW CHECKS
 * ---------------------------------
 * Before human review, automated checks run:
 * 
 * CI/CD Pipeline (.github/workflows/pr-checks.yml):
 * - [ ] Linting (PHP CS Fixer, ESLint)
 * - [ ] Type checking (PHPStan level 8, TypeScript strict)
 * - [ ] Unit tests (85%+ coverage required)
 * - [ ] Integration tests
 * - [ ] Security scan (dependency vulnerabilities)
 * - [ ] Performance benchmarks (no regression)
 * - [ ] Documentation build
 * 
 * Automated Review Bot Comments:
 * - Code quality metrics
 * - Coverage deltas
 * - Complexity warnings
 * - Suggested improvements
 * - Breaking change detection
 * 
 * 
 * STEP 4.2: HUMAN REVIEW PROCESS
 * ------------------------------
 * Review stages:
 * 
 * **Initial Review** (by auto-assigned reviewer):
 * - [ ] Code aligns with task requirements
 * - [ ] Architecture patterns followed
 * - [ ] No security vulnerabilities introduced
 * - [ ] Tests are comprehensive and meaningful
 * - [ ] Documentation is complete and accurate
 * - [ ] No breaking changes without migration path
 * 
 * **Request Changes Workflow**:
 * 1. Reviewer comments with specific issues
 * 2. Applies label: changes-requested
 * 3. Agent receives notification
 * 4. Agent addresses feedback in new commits
 * 5. Agent comments: /review-ready
 * 6. Reviewer re-reviews
 * 
 * **Approval Requirements**:
 * - Minimum 1 approval (2 for critical/high priority)
 * - All automated checks passing
 * - No unresolved review threads
 * - CODEOWNERS approval if files in protected paths
 * 
 * Review comment commands:
 * /approve - Approve PR
 * /request-changes - Request changes
 * /needs-discussion - Flag for team discussion
 * /security-review - Request security team review
 * /performance-review - Request performance analysis
 * 
 * 
 * STEP 4.3: HANDLING REVIEW CONFLICTS
 * -----------------------------------
 * Common review issues and resolutions:
 * 
 * **Architecture Disagreement**:
 * - Reviewer: /needs-discussion architecture
 * - Auto Zen hands off to Plan Agent
 * - Plan Agent comments with rationale + alternatives
 * - Team discusses in PR thread or planning meeting
 * - Decision documented in PR and Docs/Decisions/
 * 
 * **Test Coverage Gaps**:
 * - Reviewer identifies untested edge case
 * - Agent: "Acknowledged, adding tests for {scenario}"
 * - New commits add missing tests
 * - Coverage report updated
 * - Agent: /review-ready
 * 
 * **Breaking Changes Detected**:
 * - Reviewer: /breaking-change migration required
 * - Agent creates migration task
 * - Migration guide added to Docs/Migrations/
 * - Backward compatibility shim considered
 * - CHANGELOG updated with breaking change warning
 * 
 * **Performance Regression**:
 * - Automated check fails (>10% slowdown)
 * - Reviewer: /performance-review
 * - Agent profiles bottleneck
 * - Optimization commits added
 * - Benchmarks re-run and documented
 * 
 * 
 * STEP 5: MERGE & TASK COMPLETION
 * -------------------------------
 * On PR merge:
 * 1. GitHub webhook triggers Laravel backend
 * 2. Backend updates task status to "done"
 * 3. Issue auto-closes with merge
 * 4. Task comment added with PR link
 * 5. Follow-up tasks created if needed
 * 
 * Backend webhook handler (routes/api.php):
 * POST /api/webhooks/github
 * - Verifies HMAC signature
 * - Processes pull_request.closed event
 * - Updates linked task
 * - Triggers notifications
 * - Archives context bundle
 * 
 * 
 * STEP 5.1: POST-MERGE VALIDATION
 * -------------------------------
 * After merge to main:
 * 
 * Automated Deployment Pipeline:
 * 1. Run full test suite on main branch
 * 2. Build production assets
 * 3. Deploy to staging environment
 * 4. Run smoke tests on staging
 * 5. If passing, deploy to production (or hold for manual approval)
 * 
 * Rollback Triggers:
 * - Test failures on main (auto-revert merge)
 * - Staging deployment failure (halt pipeline)
 * - Critical error in monitoring (emergency rollback)
 * 
 * Post-Merge Notifications:
 * - Slack/Discord: "PR #{number} merged: {title}"
 * - Email to task assignee + reviewers
 * - GitHub issue comment: "Fixed in #{pr-number}"
 * - Update project board: Task → Done column
 * 
 * 
 * STEP 6: AUTOMATED SYNC BACK TO MAIN
 * -----------------------------------
 * Post-merge automation:
 * 1. Update _ZENTASKS/tasks.json (status: done)
 * 2. Archive context bundle
 * 3. Update Docs/CHANGELOG.md
 * 4. Notify dependent tasks
 * 5. Trigger CI/CD pipeline
 * 6. Update metrics dashboard
 * 
 * 
 * ISSUE HANDLING PROCEDURES
 * =========================
 * 
 * BLOCKER ISSUES:
 * --------------
 * When agent encounters a blocker:
 * 
 * 1. Agent comments in issue:
 *    /block External API dependency unavailable
 * 
 * 2. System response:
 *    - Labels issue: blocked
 *    - Notifies relevant stakeholders
 *    - Creates investigation task
 *    - Pauses dependent work
 * 
 * 3. Resolution workflow:
 *    - Investigation task assigned
 *    - Root cause identified
 *    - Blocker removed or workaround implemented
 *    - Agent comments: /unblock
 *    - Work resumes
 * 
 * 
 * CRITICAL BUGS IN PRODUCTION:
 * ----------------------------
 * Escalation process:
 * 
 * 1. Bug reported (manual or automated monitoring)
 * 2. Issue created with label: critical, production-bug
 * 3. Auto-assigned to Issue Handler
 * 4. Immediate triage:
 *    - Severity assessment (P0/P1/P2)
 *    - Impact analysis (users affected, data risk)
 *    - Rollback decision (revert vs hotfix)
 * 
 * 5. Hotfix workflow:
 *    - Create hotfix branch from production tag
 *    - Minimal fix implemented
 *    - Fast-track review (1 approval, reduced checks)
 *    - Deploy directly to production
 *    - Backport fix to main
 * 
 * 6. Post-incident:
 *    - Root cause analysis documented
 *    - Prevention tasks created
 *    - Monitoring alerts added
 *    - Retrospective scheduled
 * 
 * 
 * MERGE CONFLICT RESOLUTION:
 * -------------------------
 * When PR has conflicts:
 * 
 * 1. GitHub bot comments: "Merge conflicts detected"
 * 2. Agent notified
 * 3. Agent rebases branch on latest main
 * 4. Conflict resolution:
 *    - Auto-resolve simple conflicts (whitespace, imports)
 *    - Complex conflicts: Agent analyzes both versions
 *    - Preserve intent from both changes when possible
 *    - Add tests to verify merged behavior
 * 5. Force push resolution
 * 6. Re-request review if significant changes
 * 
 * 
 * STALE PR MANAGEMENT:
 * -------------------
 * PRs idle >7 days:
 * 
 * 1. Bot comments: "This PR has been idle. Please update or close."
 * 2. Agent assesses:
 *    - Still relevant? → Rebase and ping reviewer
 *    - Superseded? → Close with reference to newer PR
 *    - Blocked? → /block with reason
 * 3. If no response in 3 days → Auto-close with label: stale
 * 
 * 
 * FAILED CI/CD HANDLING:
 * ---------------------
 * When automated checks fail:
 * 
 * 1. PR labeled: ci-failing
 * 2. Agent analyzes failure logs
 * 3. Categorization:
 *    - Test failure → Fix or update tests
 *    - Linting → Auto-fix with prettier/php-cs-fixer
 *    - Type error → Resolve type issues
 *    - Flaky test → Re-run or mark as known flake
 *    - Infrastructure issue → Notify DevOps, retry
 * 4. Fix committed
 * 5. CI re-runs automatically
 * 
 * 
 * DELEGATION PATTERNS
 * ===================
 * 
 * Bug Investigation:
 * /delegate @Issue-Handler reproduce and fix #{issue}
 * 
 * Feature Implementation:
 * /delegate @Auto-Zen implement #{issue} --plan-aligned
 * 
 * Testing:
 * /delegate @Testing-Agent validate #{issue} --coverage=85%
 * 
 * Architecture Review:
 * /delegate @Plan-Agent review design for #{issue}
 * 
 * Documentation:
 * /delegate @Auto-Zen document #{issue} --location=Docs/
 * 
 * Critical Hotfix:
 * /delegate @Issue-Handler hotfix #{issue} --priority=critical --fast-track
 * 
 * 
 * COMMENT-BASED AGENT COMMANDS
 * ============================
 * 
 * /status - Report current status
 * /progress - Detailed progress update
 * /block {reason} - Mark issue as blocked
 * /unblock - Remove blocker and resume
 * /handoff @Agent {context} - Transfer to another agent
 * /review-ready - Mark ready for review
 * /tests-passing - Report test results
 * /merge-ready - Confirm ready to merge
 * /rebase - Rebase on latest main
 * /resolve-conflicts - Attempt auto-conflict resolution
 * /fast-track - Request expedited review (critical only)
 * /close {reason} - Close issue with explanation
 * 
 * 
 * INTEGRATION WITH ZENTASKS
 * =========================
 * 
 * Bidirectional sync ensures:
 * - GitHub issue ↔ ZenTask link maintained
 * - Status changes propagate both ways
 * - Comments sync between systems
 * - Branch/PR references stored in task
 * - Completion events trigger task updates
 * - Review feedback creates follow-up tasks
 * 
 * See: app/Services/GitHubSyncService.php
 * See: app/Repositories/TaskRepository.php
 * 
 * 
 * EXAMPLE FULL WORKFLOW WITH DIFFICULTIES
 * ========================================
 * 
 * 1. Auto Zen detects missing test coverage
 *    → Creates task: TASK-042
 * 
 * 2. Auto Zen creates GitHub issue
 *    → Issue #123: "Add test coverage for AuthService"
 *    → Links TASK-042 to issue #123
 * 
 * 3. Comment: /delegate @Testing-Agent create comprehensive tests
 * 
 * 4. Testing Agent:
 *    → Creates branch: issue-123-auth-tests
 *    → Generates tests (unit, integration, E2E)
 *    → **Difficulty**: Mock database setup fails
 *    → Resolves: Updates test configuration, adds fixtures
 *    → Runs tests: 24/24 passing
 *    → Comments progress with difficulty noted
 * 
 * 5. Testing Agent creates PR:
 *    → PR #124: "Fixes #123: Add comprehensive AuthService tests"
 *    → 85% coverage achieved
 *    → CI runs: **2 linting errors detected**
 * 
 * 6. Agent addresses CI failures:
 *    → Auto-fixes with php-cs-fixer
 *    → Commits fix: "style: fix linting errors"
 *    → CI re-runs: All checks passing ✓
 * 
 * 7. Human review:
 *    → Reviewer: "Good coverage, but missing edge case for expired tokens"
 *    → Labels: changes-requested
 * 
 * 8. Agent responds:
 *    → "Acknowledged, adding test for expired token scenario"
 *    → Commits new test
 *    → Coverage: 87%
 *    → Comments: /review-ready
 * 
 * 9. Re-review:
 *    → Reviewer approves
 *    → PR merged to main
 * 
 * 10. Post-merge:
 *     → Issue #123 auto-closes
 *     → TASK-042 marked done
 *     → **Difficulty**: Staging deployment fails (unrelated database migration issue)
 *     → Rollback triggered
 *     → Investigation task created: TASK-043
 *     → Migration fixed in separate PR
 *     → Original PR re-deployed successfully
 *     → Context bundle archived
 *     → Changelog updated
 * 
 * 11. Auto Zen observes completion:
 *     → Verifies tests integrated
 *     → Creates follow-up: TASK-044 (document test patterns)
 *     → Creates follow-up: TASK-045 (improve CI deployment checks)
 *     → Continues autonomous loop
 * 
 * 
 * REPOSITORY STRUCTURE FOR DELEGATION
 * ===================================
 * 
 * .github/
 *   ISSUE_TEMPLATE/
 *     agent-delegation.md - Template for delegated issues
 *     bug-report.md - Standard bug template
 *     feature-request.md - Feature template
 *   workflows/
 *     agent-sync.yml - Syncs issue/PR events to backend
 *     task-completion.yml - Handles merge events
 *     pr-checks.yml - Automated review checks
 *     deploy-staging.yml - Staging deployment
 *     deploy-production.yml - Production deployment
 *   CODEOWNERS - Review assignment rules
 * 
 * _ZENTASKS/
 *   tasks.json - Task definitions with GitHub links
 *   .github-sync - Sync state tracking
 * 
 * Docs/
 *   CHANGELOG.md - Auto-updated on PR merge
 *   GitHub-Integration.md - Full integration docs
 *   Decisions/ - Architecture decision records
 *   Migrations/ - Breaking change guides
 *   Retrospectives/ - Post-incident analyses
 * 
 * 
 * MONITORING & OBSERVABILITY
 * ==========================
 * 
 * Track delegation metrics:
 * - Issue creation rate
 * - Agent assignment distribution
 * - Time to resolution
 * - PR merge success rate
 * - Task completion correlation
 * - Review cycle time
 * - CI failure rate by type
 * - Blocker frequency and resolution time
 * - Hotfix deployment count
 * - Rollback incidents
 * 
 * See: app/Services/MetricsService.php
 * See: Docs/Observability.md
 * 
 * 
 * DIFFICULTY ESCALATION MATRIX
 * ============================
 * 
 * Level 1 - Agent Auto-Resolves:
 * - Linting errors
 * - Simple merge conflicts
 * - Known flaky tests
 * - Documentation typos
 * 
 * Level 2 - Agent Requests Help:
 * - Complex merge conflicts
 * - Architecture questions
 * - Unclear requirements
 * - Cross-team dependencies
 * 
 * Level 3 - Human Intervention Required:
 * - Production incidents
 * - Security vulnerabilities
 * - Breaking API changes
 * - Legal/compliance issues
 * 
 * Level 4 - Emergency Escalation:
 * - Data loss risk
 * - System-wide outage
 * - Security breach
 * - Critical business impact
 */