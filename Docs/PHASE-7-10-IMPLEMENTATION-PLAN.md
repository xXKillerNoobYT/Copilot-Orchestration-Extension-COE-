# Phase 7–10 Implementation Plan: Core Features

**Status:** Ready for execution  
**Created:** January 6, 2026  
**Target:** Continuous development framework + GitHub integration + repository lifecycle

---

## Overview

This document outlines the implementation strategy for **Phases 7–10** of the Copilot Orchestration Extension, building on the completed foundation (Phases 1–6). These phases introduce:

- **Phase 7:** Auto-agent switching and continuous execution loop
- **Phase 8:** GitHub Issue bi-directional sync
- **Phase 9:** Repository lifecycle and safe branching  
- **Phase 10:** Continuous monitoring and health-driven maintenance

---

## Architecture: Agent Assignment Strategy

### Cloud Agents (Hosted LLMs)

**Use for:** Complex planning, architecture design, refactoring guidance, test generation  
**Examples:** Copilot (VS Code), Claude API, GPT-4  
**Context:** Full task details + architecture docs + recent code context  
**Latency tolerance:** 30s–5m (acceptable for planning/design)

**Roles:**

- **Zen Planner** — breaks requirements into tasks, identifies dependencies
- **Zen Architect** — design decisions, ADRs, data models
- **Cloud Coder** — complex refactors, cross-module changes
- **Cloud Tester** — test generation, edge cases, coverage analysis

### Background Agents (Low-latency, Polling)

**Use for:** Continuous monitoring, maintenance, automation  
**Deployment:** Serverless (AWS Lambda), containers, or local daemons  
**Context:** Minimal (only what's changed since last check)  
**Latency:** Must respond <10s per poll

**Roles:**

- **Health Monitor** — polls repo health, detects drift
- **Dependency Updater** — auto-patches vulnerable deps
- **Branch Cleaner** — detects and removes stale branches

### Copilot (VS Code Native)

**Use for:** All code implementation, file editing, repository creation  
**Context:** Scoped task context bundle (specific files, acceptance criteria, constraints)  
**Latency:** Interactive (<5s for basic edits)

---

## Phase 7: Auto-Agent Switching & Continuous Execution

### Goal

Enable the extension to autonomously loop through planning and execution without manual intervention. When the task queue is empty, the system reaches a stable state and can enter "maintenance mode" (Phase 10).

### Key Components

**1. Agent State Machine**

```
[idle] → planning_ready? → invoke Zen Planner → capture plan → [planning_done]
                                                                       ↓
                                                    execution_ready? → invoke Auto Zen
                                                                       ↓
                                                    [execution_done] → more_work? → [idle]
                                                                             ↓
                                                                        no → [maintenance_mode]
```

**2. Invocation & Context**

- Query for "planning tasks" (unplanned user requests, discovered issues)
- Query for "ready tasks" (no dependencies, all prerequisites met)
- Pass context bundles with scoped instructions, acceptance criteria, files
- Capture agent output and store in _ZENTASKS/tasks.json

**3. Loop Control**

- Interval: 30s–2m per cycle (configurable)
- Maximum retries: 3 before escalating to user
- Graceful degradation: if one agent fails, pause and alert; don't deadlock

### Implementation Tasks

**Task 1 (in queue):** Implement Phase 7: Auto-Agent Switching & Continuous Execution

**Subtasks:**

- Design state machine and transitions
- Build agent invocation wrapper (handle timeouts, retries, errors)
- Implement loop scheduler (cron-like, with exponential backoff)
- Add telemetry/logging for debugging
- Test with sample planning + execution cycle

### Success Criteria

- [✓] Full cycle: plan → execute → next task (no manual intervention)
- [✓] Loop completes in <5m for simple tasks
- [✓] Graceful error handling (no hangs)
- [✓] Configurable via extension settings (poll interval, retry count)

---

## Phase 8: GitHub Issue Sync Engine

### Goal

Maintain a single source of truth between GitHub Issues and COE tasks. Users can work from GitHub or the extension interchangeably; changes sync automatically.

### Key Components

**1. Webhook Receiver**

- Listens for `issues`, `issue_comment` events
- Validates HMAC signature (existing Phase 4 pattern)
- Parses event → extracts issue data (title, body, labels, assignees, milestone)

**2. Issue → Task Converter**

- Generates task ID from issue number: `GITHUB-{owner}/{repo}/{issue-id}`
- Extracts acceptance criteria from issue body (e.g., checklist items)
- Creates subtasks for checklist items
- Links GitHub issue in task context bundle
- Auto-assigns to matching agent based on labels (e.g., `type:refactor` → Zen Architect)

**3. Task → Issue Updater**

- When task completes: POST comment to issue with summary (files changed, tests added, etc.)
- Update issue state: `closed` if all subtasks done, `in_progress` if active
- Sync labels: task priority → issue labels
- Link PR/branch to issue

**4. Bi-directional Sync**

- Label changes on GitHub issue → update task priority
- Issue reassignment → update task assignee mapping
- Milestone updates → update task deadline/milestone field
- Sub-issues → create subtasks with dependencies

### Implementation Tasks

**Task 2 (in queue):** Implement Phase 8: GitHub Issue Sync Engine (Bi-directional)

**Subtasks:**

- Build webhook receiver + HMAC validation
- Implement issue parser (extract structure, checklist → subtasks)
- Build task generator (create _ZENTASKS entry, context bundle)
- Implement task → issue updater (comment on complete, close issue)
- Add label/milestone/assignee sync
- Test with real GitHub events (staging repo)

### Success Criteria

- [✓] Create issue on GitHub → task auto-generated in 30s
- [✓] Complete task → issue updated with comment + closed (if done)
- [✓] Label changes sync bidirectionally
- [✓] HMAC validation rejects invalid requests
- [✓] Handles edge cases (concurrent updates, missing assignees)

---

## Phase 9: Repository Lifecycle & Safe Branching

### Goal

Enforce a safe, reproducible branching strategy that prevents accidental commits to main, validates merges, and cleans up stale work.

### Key Components

**1. Branch Manager Service**

```php
// app/Services/BranchManagerService.php
- generateBranchName(task): feature/issue-{id}/{slug}
- createBranch(task): instructs Copilot + tracks in DB
- validateMerge(branch): runs tests + architecture checks
- detectStaleBranches(days: 30): returns list of candidates
- deleteBranch(branch): instructs Copilot + confirms
```

**2. Branch Naming Scheme**

```
feature/issue-{number}/{slug}    # New features
hotfix/{slug}                     # Production fixes
release/v{version}               # Release branches
integration/{slug}               # Cross-module work
maintenance/{slug}              # Refactors, debt
```

**3. Merge Gate (Validation Before Merge)**

- Run test suite (phpunit, npm test)
- Check code coverage (>80%)
- Validate architecture (no circular deps, adheres to pattern)
- Ensure no hardcoded secrets
- Require passing CI/CD pipeline

**4. Stale Branch Cleanup**

- Identify branches with no commits >30d
- Verify CI/CD passing (all checks green)
- Confirm PR merged or issue closed
- Instruct Copilot to delete with user confirmation

### Implementation Tasks

**Task 3 (in queue):** Implement Phase 9a: Safe Branching & Merge Validation

**Subtasks:**

- Build BranchManagerService with naming, creation, merge validation
- Implement test runner integration (laravel, npm)
- Add architecture validator (use Phase 1 dependency graph)
- Integrate with GitHub API for PR status checks
- Build stale branch detector + cleanup workflow
- Test with staging repo: create feature, break tests → block merge; fix → allow merge

### Success Criteria

- [✓] Branch naming follows scheme consistently
- [✓] Push breaking change → merge blocked with clear error
- [✓] Fix + re-push → merge allowed
- [✓] Stale branches detected and deleted with user consent
- [✓] No commits to main without PR (enforced via GitHub branch protection)

---

## Phase 10: Continuous Monitoring & Health-Driven Maintenance

### Goal

After initial scaffolding (Phase 9), the system enters continuous operation mode. A background agent monitors repository health and auto-generates maintenance tasks for drift, security issues, and code quality.

### Key Components

**1. Health Monitor Service**

```php
// app/Services/HealthMonitorService.php
- calculateHealthScore(): (0-100) based on metrics
  - Commit frequency (>1/week healthy)
  - Test coverage (>80% target)
  - Dependency freshness (recent updates)
  - CI/CD success rate (>95%)
- detectDrift(repo): list of issues (outdated deps, security, coverage drop)
- generateMaintenanceTasks(issues): create tasks for auto-fix
```

**2. Drift Detection**

- **Dependency:** outdated versions, known CVEs, security patches available
- **Coverage:** track over time; alert if drop >5%
- **Code quality:** unused imports, long functions, circular deps
- **CI/CD:** failure rate trending up
- **Architecture:** violations, pattern drift

**3. Auto-Generated Maintenance Tasks**

```
Title: "Update lodash 4.17.20 → 4.17.21 [SEC: CVE-2021-23337]"
Priority: high (security)
Type: maintenance
Description: Security patch for lodash potential DoS
Details: Run `npm audit` → update lockfile → test
Test Strategy: npm test passes; no regressions
Assignee: Copilot (auto-fixer) + Cloud Tester (validation)
```

**4. Interval-Based Polling**

- Health check: every 1 hour
- Dependency scan: every 6 hours (with CVE database update)
- Coverage analysis: daily (from CI artifacts)
- Architecture check: per commit (via webhook)

### Implementation Tasks

**Task 4 (in queue):** Implement Phase 10a: Repository Health Monitoring & Auto-Maintenance

**Subtasks:**

- Build HealthMonitorService with scoring algorithm
- Integrate with dependency checkers (npm audit, composer check)
- Hook into CI/CD pipeline for coverage tracking
- Implement drift detector (code complexity, unused code)
- Build maintenance task generator (format per TASK-FORMAT)
- Add scheduled job (Laravel scheduler + background queue)
- Test with sample repo: introduce drift → verify task auto-generated

### Success Criteria

- [✓] Health score calculated correctly (0–100)
- [✓] Security CVE detected and task created within 1h
- [✓] Coverage drop alerts generated
- [✓] Auto-generated maintenance tasks are executable by Copilot
- [✓] No spam (deduplication of similar tasks)

---

## Agent Roles & Context Requirements

### Cloud Agents

**Zen Planner**

- **Input:** user request / discovered issue / GitHub issue
- **Context:** project vision, current task queue, architecture docs
- **Output:** structured task tree (title, description, dependencies, priority)
- **Success:** tasks are atomic (15–45 min), dependencies are acyclic, no vague titles

**Zen Architect**

- **Input:** design request / architecture decision needed
- **Context:** codebase structure, existing ADRs, project constraints
- **Output:** ADR (decision, rationale, alternatives, consequences), file structure
- **Success:** ADR is clear, implementable, follows SOLID principles

**Cloud Coder**

- **Input:** complex refactor task / cross-module refactor
- **Context:** affected files, test suites, acceptance criteria
- **Output:** code changes (minimal diff, backward-compatible), tests, docs
- **Success:** tests pass, coverage maintained, no circular deps introduced

**Cloud Tester**

- **Input:** task / feature to test
- **Context:** codebase, test patterns, acceptance criteria
- **Output:** test suite (unit + integration + edge cases)
- **Success:** 80%+ coverage, all edge cases tested, no flaky tests

### Background Agents

**Health Monitor**

- **Trigger:** every 1 hour (or on demand)
- **Input:** repo root path
- **Context:** dependency manifests, CI logs, code metrics
- **Output:** health score, list of detected issues
- **Success:** accurate detection, <10s response time

**Dependency Updater**

- **Trigger:** when Health Monitor detects security issue
- **Input:** vulnerable package details (CVE, fix version)
- **Context:** current lockfile, test suite
- **Output:** updated lockfile, passing tests
- **Success:** no new vulnerabilities, tests pass

**Branch Cleaner**

- **Trigger:** daily (or on demand)
- **Input:** repo refs
- **Context:** commit history, PR status
- **Output:** list of stale branches
- **Success:** correctly identifies branches >30d with no recent work, CI passing

---

## Implementation Order & Dependencies

```
TASK-mk3k0x2r (Design Phase 7-10 Agent Roles) [independent, foundation]
    ↓
TASK-mk3k0e09 (Phase 7: Auto-Agent Switching) [foundation for loop]
    ↓
TASK-mk3k0imm (Phase 8: GitHub Issue Sync) [depends on Phase 7 working]
    ↓
TASK-mk3k0njs (Phase 9: Safe Branching) [depends on Phase 8 issue link]
    ↓
TASK-mk3k0rxp (Phase 10: Health Monitoring) [depends on stable repo workflow]
```

---

## Code Quality & Architecture Principles

### SOLID Adherence

- **S**ingle Responsibility: BranchManager only handles branches; HealthMonitor only monitors
- **O**pen/Closed: Services extend via trait/interface (e.g., DriftDetector interface)
- **L**iskov Substitution: Any drift detector or health metric can be swapped
- **I**nterface Segregation: Small, focused interfaces (e.g., `Detectable`, `Syncable`)
- **D**ependency Inversion: Use interfaces, not concrete classes; inject via constructor

### Clean Architecture

```
app/
  Services/
    PhaseServices/
      BranchManagerService.php      # Phase 9
      HealthMonitorService.php      # Phase 10
      AgentSwitchService.php        # Phase 7
      GitHubSyncService.php         # Phase 8
  Repositories/
    GitHubIssueRepository.php
    HealthMetricRepository.php
  Models/
    (existing Phase 1–6 models)
  Exceptions/
    (existing + new as needed)
  Events/
    BranchCreated, IssueLinked, etc.
```

### Caching Strategy

- **Branch list:** cache 5m (refreshed on webhook)
- **Health scores:** cache 30m (refresh hourly)
- **Dependency data:** cache 1h (refresh on manifest change)
- **Architecture graph:** cache until commit

### Validation & Error Handling

- All external API calls wrapped in try-catch with custom exceptions
- GitHub sync: partial failure is OK (log and retry); don't block other tasks
- Health monitor: missing data is degraded but functional (skip that metric)
- Branch merge gate: fail-safe (don't merge if can't validate)

---

## Testing Strategy

### Unit Tests

- Service methods with mocked repos/GitHub API
- State transitions in agent switcher
- Health score calculations with fixed data

### Integration Tests

- Full cycle: GitHub issue → task → branch → merge
- Health monitor: detect drift → create task → verify format

### Staging Tests

- Real GitHub repo (staging)
- Real CI/CD pipeline integration
- Full phase workflow (plan → execute → monitor)

---

## Deployment & Rollout

**Week 1–2:** Implement Phase 7 + Agent Roles doc  
**Week 3–4:** Implement Phase 8 (GitHub Sync)  
**Week 5–6:** Implement Phase 9 (Branching)  
**Week 7–8:** Implement Phase 10 (Health Monitor)  
**Week 9:** Integration testing + staging validation  
**Week 10:** Production rollout (feature-flagged)

---

## Success Metrics

- [✓] Auto-switch loop runs <5m per cycle (average)
- [✓] GitHub issue → task generation <30s (90th percentile)
- [✓] Merge gate blocks breaking changes 100% of the time
- [✓] Stale branch detection accuracy >95%
- [✓] Health monitor detects security issues within 1h
- [✓] Zero production incidents related to unsanitized merges
- [✓] User satisfaction: extension enables at least 50% automation of maintenance tasks

---

## Next Steps

1. **Review & Approve** this plan with stakeholders
2. **Load workflow context** and assign agents to queued tasks
3. **Begin Phase 7 implementation** (auto-switch)
4. **Iterate through phases** per schedule above

Tasks are now in `_ZENTASKS/tasks.json` and ready for `Auto Zen` to execute.
