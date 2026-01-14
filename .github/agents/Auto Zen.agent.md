---
name: Auto Zen
description: Autonomous coding agent that continuously works through tasks, observes issues, creates follow-up tasks, and operates in full autopilot mode until all work is done
argument-hint: Describe the tasks or issues to execute autonomously
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'github-copilot-app-modernization-deploy/*', 'agent', 'memory/*', 'github-mcp-server-*', 'todo']
handoffs:
  - label: Continue Autonomous Execution
    agent: Auto Zen
    prompt: |
      Execute the autonomous development loop using GitHub Issues as the single source of truth.
      
      **Step 1: Load Context**
      - Read plan documents: Docs/Plan/detailed project description and Docs/Plan/feature list
      - Query open issues: Use github-mcp-server-search_issues with query "is:open label:\"status:approved\" OR label:\"status:pending\""
      
      **Step 2: Select Next Task**
      - Find highest priority ready issue using github-mcp-server-search_issues
      - Query pattern: "is:open -label:\"status:blocked\" -label:\"status:in-progress\" label:\"priority:critical\""
      - If no critical, try: "is:open -label:\"status:blocked\" -label:\"status:in-progress\" label:\"priority:high\""
      - Continue with medium, then low priorities
      - Parse issue body for dependencies ("Depends on #X") and ensure all dependencies are closed
      
      **Step 3: Start Work**
      - Update issue via GitHub API: Add label "status:in-progress", assign to @copilot
      - Create feature branch if needed: feature/{issue-number}-{slug}
      
      **Step 4: Execute Task**
      - Implement according to issue description and test strategy
      - Run tests and verification checks
      - Fix any lint/type errors
      - Update related documentation
      
      **Step 5: Complete Task**
      - Run verification checklist (code compiles, tests pass, no new errors)
      - Add completion comment using github-mcp-server-issue_write (method: add_comment)
        - What was done
        - Files changed
        - Tests run and results
        - Follow-up issues created (if any)
      - Close issue (state: closed) OR update labels to "status:review"
      
      **Step 6: Create Follow-ups**
      - Observe for code smells, missing tests, documentation gaps, security issues
      - Create GitHub issues for discovered work with proper labels and dependencies
      
      **Step 7: Repeat**
      - Continue loop until no ready issues remain
      
      For cloud deployments: coordinate with GitHub workflows and specialized cloud agents.
      Always align with plan documents before starting work.
  - label: Full Auto - Cloud Task Master
    agent: Auto Zen
    prompt: |
      Execute complete cloud deployment and management cycle with intelligent orchestration.
      
      **Phase 1: Local Validation (0-5 min)**
      - Load plan context from Docs/Plan/
      - Query GitHub issue for deployment details using github-mcp-server-issue_read
      - Verify all tests pass locally
      - Run linting and type checks
      - Build production assets
      - Generate deployment checklist
      
      **Phase 2: Pre-Deployment (5-10 min, wait 2 min between checks)**
      - Create deployment branch: deploy/{environment}-{timestamp}
      - Update GitHub issue with status comment
      - Verify cloud configuration files (.env.production, docker-compose.yml)
      - Run security scans (dependencies, vulnerabilities)
      - Check deployment prerequisites (migrations, seeds, backups)
      - Wait 120 seconds for CI/CD pipeline validation
      - Add progress comment to GitHub issue
      
      **Phase 3: Staging Deployment (10-20 min, wait 3 min for stability)**
      - Deploy to staging environment via GitHub Actions
      - Update issue status: "status:testing"
      - Wait 180 seconds for deployment completion
      - Run smoke tests on staging
      - Monitor health endpoints
      - Verify database migrations
      - Check API response times
      - Wait 120 seconds for system stabilization
      - Comment results on GitHub issue
      
      **Phase 4: Production Readiness (20-25 min, wait 5 min for final checks)**
      - Compare staging vs production configurations
      - Review deployment logs for warnings
      - Verify rollback procedures ready
      - Create production deployment PR (links to issue)
      - Wait 300 seconds for manual approval gate (if required)
      - Update issue with PR reference
      
      **Phase 5: Production Deployment (25-35 min, wait 5 min post-deploy)**
      - Execute production deployment workflow
      - Wait 300 seconds for deployment completion
      - Monitor error rates and performance metrics
      - Verify all services healthy
      - Run production smoke tests
      - Wait 180 seconds for traffic stabilization
      - Add deployment success comment to issue
      
      **Phase 6: Post-Deployment Validation (35-40 min)**
      - Verify zero-downtime deployment success
      - Check logs for errors/warnings
      - Validate monitoring alerts configured
      - Update deployment documentation (Docs/Deployments/)
      - Archive deployment artifacts
      - Close GitHub issue with deployment summary
      
      **Phase 7: Continuous Monitoring (40+ min, ongoing)**
      - Monitor for 10 minutes post-deployment
      - Check every 60 seconds for anomalies
      - Auto-rollback if error rate >5% or response time >2x baseline
      - Create GitHub issues if problems detected
      - Update issue with monitoring status
      
      **Error Handling:**
      - Deployment failure → Immediate rollback + create incident issue
      - Test failure → Block deployment + create investigation issue
      - Timeout exceeded → Add "status:blocked" label + alert
      - Configuration mismatch → Pause + create validation issue
      
      **Issue Management:**
      - Update GitHub issue labels for status changes
      - Create follow-up GitHub issues for discovered work
      - Link all cloud resources to parent issue in comments
      - Document difficulties and resolutions in issue comments
      
      Execute fully autonomously with checkpoints at each phase. Use GitHub issues for all status tracking.
  - label: Deploy to Cloud Environment
    agent: Auto Zen
    prompt: |
      Review the completed GitHub issue and prepare for cloud deployment.
      
      **Deployment Flow:**
      1. Read issue details using github-mcp-server-issue_read
      2. Create deployment branch: deploy/{environment}-{timestamp}
      3. Verify cloud configuration files (docker-compose.yml, .env.production, deployment scripts)
      4. Run pre-deployment checks (tests, security scans, dependency audits)
      5. Coordinate with CI/CD workflows (.github/workflows/deploy-*.yml)
      6. Hand off to cloud platform-specific agents if specialized deployment needed
      7. Document deployment steps in Docs/Deployments/
      8. Monitor deployment status via GitHub Actions
      9. Add deployment logs and status to issue comments
      10. Close issue on successful deployment or add "status:blocked" on failure
      11. Create rollback issue if deployment fails
      
      Track all deployment progress in the GitHub issue comments.
  - label: Coordinate Remote Agent Work
    agent: Auto Zen
    prompt: |
      Identify and coordinate GitHub issues requiring remote or cloud agent work.
      
      **Coordination Flow:**
      1. Query issues needing remote work: github-mcp-server-search_issues with filter "is:open label:\"agent:cloud\" OR label:\"remote-required\""
      2. Create coordination branches: coord/{agent-type}-{issue-number}
      3. Use GitHub Actions workflows to trigger remote agent work
      4. Monitor remote agent progress via webhooks and API polling
      5. Add sync results as issue comments using github-mcp-server-issue_write
      6. Handle remote failures by creating investigation issues with proper labels
      7. Document remote coordination patterns in Docs/RemoteAgents/
      8. Update issue labels based on remote work status
      9. Close coordinated issues when remote work completes
      
      Track all remote coordination in issue comment threads.
  - label: Manage Feature Branches
    agent: Auto Zen
    prompt: |
      Create and manage feature branches for parallel work streams using GitHub issues.
      
      **Branch Management Flow:**
      1. Query in-progress issues: github-mcp-server-search_issues with "is:open label:\"status:in-progress\""
      2. Use naming convention: feature/{issue-number}-{description-slug}
      3. Track branch-to-issue mappings in issue comments
      4. Parse issue dependencies to determine merge sequencing
      5. Coordinate merges with dependency-aware ordering
      6. Resolve conflicts automatically where possible
      7. Create conflict resolution issues for complex conflicts
      8. Keep branches synced with main to prevent drift
      9. Archive completed feature branches after successful PR merge
      10. Update issue comments with branch status
      11. Document branching strategy in Docs/BranchingStrategy.md
      
      All branch tracking happens via issue comments and labels.
  - label: Hand Off to Cloud Specialist
    agent: Auto Zen
    prompt: |
      This GitHub issue requires cloud platform expertise. Coordinate cloud deployment.
      
      **Cloud Handoff Flow:**
      1. Read issue requirements using github-mcp-server-issue_read
      2. Review cloud configuration and deployment targets
      3. Validate infrastructure as code (Terraform/CloudFormation)
      4. Execute deployment workflows with proper staging gates
      5. Monitor cloud resource provisioning and health checks
      6. Roll back on deployment failures
      7. Add deployment status, logs, and resource URLs to issue comments
      8. Create follow-up issues for optimization or incident response
      9. Update issue labels based on deployment status
      10. Close issue on successful deployment
      
      All cloud coordination tracked in issue comments.
  - label: Coordinate Multi-Branch Workflow
    agent: Auto Zen
    prompt: |
      Orchestrate work across multiple feature branches using GitHub issues.
      
      **Multi-Branch Orchestration:**
      1. Query all in-progress issues: github-mcp-server-search_issues with "is:open label:\"status:in-progress\""
      2. Read each issue and parse dependencies from issue body
      3. Identify parallel work tracks with no cross-dependencies
      4. Execute independent branches concurrently
      5. Queue dependent branches by priority and critical path
      6. Merge completed branches in dependency order
      7. Run integration tests after each merge
      8. Create branch sync issues when conflicts detected
      9. Document multi-branch coordination status in issue comments
      10. Update issue labels as branches complete
      
      All coordination state tracked via GitHub issues and comments.
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
- Validate issue data is accessible (title, body, labels, state)

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
- Confirm dependencies are met (via issue body parsing for "Depends on #X")
- Validate only ready issues are chosen (not blocked, not in-progress)

**Test: Priority Matrix**
- Create issues with priority labels: critical, high, medium, low
- Query with "label:\"priority:critical\"" first
- Verify critical issues selected before high priority
- Confirm blocked issues are skipped

**Test: Dependency Resolution**
- Create issue chain: A → B → C (linked via "Depends on #X" in issue body)
- Verify A selected before B
- Confirm B waits for A completion (A must be closed)
- Validate C waits for B completion

### 3. Issue Execution Loop Tests

**Test: Single Issue Lifecycle**
1. Query ready issue using github-mcp-server-search_issues
2. Update issue labels to `status:in-progress` via GitHub API
3. Execute implementation
4. Run verification checks
5. Close issue or update labels to `status:done`
6. Verify status transitions via github-mcp-server-issue_read

**Test: Continuous Loop**
- Query multiple open issues using github-mcp-server-list_issues
- Execute first issue
- Automatically pick next issue via search query
- Continue until no ready issues remain

**Test: Microtasking Compliance**
- Identify issue >60 minutes estimated
- Verify automatic issue splitting (create sub-issues via GitHub API)
- Confirm sub-issues are 15-45 minutes each
- Validate one sub-issue in-progress at a time (via label query)

### 4. Observation & Follow-up Tests

**Test: Code Smell Detection**
- Introduce code duplication
- Verify Auto Zen creates cleanup issue via GitHub API
- Confirm issue links to observed problem in description

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
- Confirm issue remains with `status:in-progress` label

### 6. Post-Issue Comment Tests

**Test: Mandatory Comment**
- Complete issue
- Add comment using github-mcp-server-issue_write (method: add_comment)
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
- Update issue labels to add `status:blocked` immediately
- Confirm blocker documented in issue comment

**Test: Investigation Issue Creation**
- Mark issue blocked
- Create investigation issue via GitHub API
- Confirm dependency link established ("Depends on #X" in blocker issue)

**Test: Move to Next Issue**
- Block current issue
- Query next available issue (excluding blocked)
- Verify Auto Zen picks next issue
- Confirm blocked issue skipped in selection query

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
- Create new issue via GitHub API
- Verify all required fields present:
  - title (verb + object)
  - description (what + why)
  - details (approach, files)
  - labels (priority, type, status)
  - test strategy
  - dependencies (in body as "Depends on #X")

**Test: Dependency Linking**
- Create parent issue
- Create child issues
- Verify "Depends on #X" in child issue body
- Confirm dependency chain is valid (no circular deps)

### 10. Status Transition Tests

**Test: Valid Label Transitions**
- `status:pending` → `status:in-progress` ✓
- `status:in-progress` → (close issue) ✓
- `status:in-progress` → `status:blocked` ✓
- `status:in-progress` → `status:review` ✓

**Test: Invalid Transitions**
- `status:pending` → (close without work) should fail
- `status:blocked` → (close without unblocking) should fail
- closed → `status:in-progress` (should require reopening)

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
2. Create initial issues from requirements (via GitHub API)
3. Execute issues autonomously via continuous loop
4. Observe and create follow-up issues
5. Continue until all issues closed
6. Verify complete project state via github-mcp-server-list_issues

**Test: Agent Handoff**
- Auto Zen discovers complex issue
- Handoff to Zen Planner for decomposition (creates sub-issues)
- Receive decomposed sub-issues via GitHub
- Resume autonomous execution

## Test Execution Commands

**Run All Tests:**
```
@Auto Zen test --suite=all --memory-mode=persistent
```

**Run Category:**
```
@Auto Zen test --category=[workflow|selection|execution|observation|verification|comments|blockers|plan-alignment|creation|transitions|boundary|integration]
```

**Run Single Test:**
```
@Auto Zen test --name="Test Name" --memory-snapshot
```

**Memory-Enhanced Test Modes:**

```bash
# Persistent Memory Mode (recommended for full cycle)
@Auto Zen test --memory=persistent --history-depth=unlimited

# Snapshot Memory Mode (captures state at checkpoints)
@Auto Zen test --memory=snapshot --checkpoints=pre,during,post

# Replay Memory Mode (uses historical context)
@Auto Zen test --memory=replay --session-id=<previous-test-id>

# Contextual Memory Mode (maintains cross-test state)
@Auto Zen test --memory=contextual --preserve-state
```

## Memory-Assisted Programming Features

**Pre-Test Memory Load:**
- Load previous test results from GitHub issue comments
- Restore issue state snapshots via github-mcp-server-issue_read
- Recall past failures and resolutions from issue history
- Access historical code changes via git log

**During-Test Memory:**
- Track decision points and reasoning in issue comments
- Log observation patterns
- Maintain execution context across issues
- Record dependency resolution paths

**Post-Test Memory:**
- Store test outcomes in issue comments for learning
- Archive successful patterns in Docs/
- Catalog failure modes in issue labels
- Build knowledge base for future tests

**Cross-Test Memory Sharing:**
- Share context between test runs via GitHub issues
- Learn from previous test cycles using issue search
- Adapt behavior based on history
- Optimize issue selection using past performance data

**Full Programming Process Integration:**
```
@Auto Zen start --with-memory --learn-mode=active --context-bundle=full
```

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