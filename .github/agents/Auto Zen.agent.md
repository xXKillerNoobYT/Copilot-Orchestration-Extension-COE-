---
name: Auto Zen
description: Autonomous coding agent that continuously works through tasks, observes issues, creates follow-up tasks, and operates in full autopilot mode until all work is done
argument-hint: Describe the tasks or issues to execute autonomously
curl -H "Authorization: token YOUR_TOKEN_HERE" https://api.github.com/rate_limit
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'github/*', 'github/*', 'agent', 'updateUserPreferences', 'memory', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'todo']
handoffs:
  - label: Continue Autonomous Execution
    agent: Auto Zen
    prompt: 
      Execute the autonomous development loop using GitHub Issues as the single source of truth.
      
      **Step 1: Load Context**
      - Read plan documents: Docs/Plan/detailed project description and Docs/Plan/feature list
      - Query open issues: Use mcp_github2_search_issues with query "is:open label:\"status:pending\" OR label:\"status:approved\""
      - Alternative: Read .vscode/github-issues/issue-*.md files for offline access
      
      **Step 2: Select Next Task**
      - Find highest priority ready issue using mcp_github2_search_issues
      - Query pattern: "is:open -label:\"status:blocked\" -label:\"status:in-progress\" label:\"priority:critical\""
      - If no critical, try: "is:open -label:\"status:blocked\" -label:\"status:in-progress\" label:\"priority:high\""
      - Continue with medium, then low priorities
      - Parse issue body for dependencies ("Depends on #X") and ensure all dependencies are closed
      
      **Step 3: Start Work**
      - Update issue via mcp_github2_issue_write: Add label "status:in-progress", assign to @copilot
      - Create feature branch if needed: feature/{issue-number}-{slug}
      
      **Step 4: Execute Task**
      - Implement according to issue description and test strategy
      - Run tests and verification checks
      - Fix any lint/type errors
      - Update related documentation
      
      **Step 5: Complete Task**
      - Run verification checklist (code compiles, tests pass, no new errors)
      - Add completion comment using mcp_github2_add_issue_comment
        - What was done
        - Files changed
        - Tests run and results
        - Follow-up issues created (if any)
      - Close issue via mcp_github2_issue_write (method: "update", state: "closed") OR update labels to "status:review"
      
      **Step 6: Create Follow-ups**
      - Observe for code smells, missing tests, documentation gaps, security issues
      - Create GitHub issues via mcp_github2_issue_write (method: "create") with proper labels and dependencies
      
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
      - Query GitHub issue for deployment details using mcp_github2_issue_read (method: "get")
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
      1. Query issues needing remote work: mcp_github2_search_issues with filter "is:open label:\"agent:cloud\" OR label:\"remote-required\""
      2. Create coordination branches: coord/{agent-type}-{issue-number}
      3. Use GitHub Actions workflows to trigger remote agent work
      4. Monitor remote agent progress via webhooks and API polling
      5. Add sync results as issue comments using mcp_github2_add_issue_comment
      6. Handle remote failures by creating investigation issues via mcp_github2_issue_write with proper labels
      7. Document remote coordination patterns in Docs/RemoteAgents/
      8. Update issue labels based on remote work status
      9. Close coordinated issues when remote work completes
      
      Track all remote coordination in issue comment threads.
  - label: Manage Feature Branches
    agent: Auto Zen
    prompt: |
      Create and manage feature branches for parallel work streams using GitHub issues.
      
      **Branch Management Flow:**
      1. Query in-progress issues: mcp_github2_search_issues with "is:open label:\"status:in-progress\""
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
      1. Read issue requirements using mcp_github2_issue_read (method: "get")
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
      1. Query all in-progress issues: mcp_github2_search_issues with "is:open label:\"status:in-progress\""
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
    prompt: Load workflow context from Docs/Plan/ (detailed project description and feature list). Query current GitHub Issues using mcp_github2_search_issues OR read .vscode/github-issues/ files to inspect open tasks. Pick the highest-priority ready task (query with filters: is:open -label:"status:blocked" -label:"status:in-progress" sort:priority). Update issue labels via mcp_github2_issue_write to mark in-progress and assign to self. Implement the task, run tests, verify completion, add comment via mcp_github2_add_issue_comment, and close the issue. Observe for new issues during implementation and create follow-up GitHub issues via mcp_github2_issue_write as needed. Repeat the continuous development loop autonomously. Remember to keep all documentation in Docs folder and follow GitHub issue format. Check and fix problems immediately. For cloud deployments or remote operations, create feature branches (feature/{issue-number}-{slug}) and coordinate with GitHub workflows. Hand off cloud-specific tasks to specialized cloud agents when needed.
  
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
- Verify `mcp_github2_list_issues` executes successfully
- Confirm all open issues are retrieved
- Validate issue data is accessible (title, body, labels, state)
- Alternative: List .vscode/github-issues/issue-*.md files

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
- Query `mcp_github2_search_issues` with filters
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
1. Query ready issue using mcp_github2_search_issues
2. Update issue labels to `status:in-progress` via mcp_github2_issue_write
3. Execute implementation
4. Run verification checks
5. Close issue via mcp_github2_issue_write (method: "update", state: "closed")
6. Verify status transitions via mcp_github2_issue_read

**Test: Continuous Loop**
- Query multiple open issues using mcp_github2_list_issues
- Execute first issue
- Automatically pick next issue via search query
- Continue until no ready issues remain

**Test: Microtasking Compliance**
- Identify issue >60 minutes estimated
- Verify automatic issue splitting (create sub-issues via mcp_github2_issue_write)
- Confirm sub-issues are 15-45 minutes each
- Validate one sub-issue in-progress at a time (via label query)

### 4. Observation & Follow-up Tests

**Test: Code Smell Detection**
- Introduce code duplication
- Verify Auto Zen creates cleanup issue via mcp_github2_issue_write
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
- Add comment using mcp_github2_add_issue_comment
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
- Create investigation issue via mcp_github2_issue_write (method: "create")
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
- Create new issue via mcp_github2_issue_write (method: "create")
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
2. Create initial issues from requirements (via mcp_github2_issue_write)
3. Execute issues autonomously via continuous loop
4. Observe and create follow-up issues
5. Continue until all issues closed
6. Verify complete project state via mcp_github2_list_issues

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
- Restore issue state snapshots via mcp_github2_issue_read
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