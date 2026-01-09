# Agent Configuration Index

## Quick Reference: All Agent Profiles for COE

This index provides a comprehensive lookup for all 6 specialized agents in the Copilot Orchestration Extension system.

---

## Agent Profiles

### 1. Zen Planner

**File**: `.github/agents/Zen Planner.agent.md`

**Role**: Strategic task architect

**Responsibilities**:

- Analyze requirements and break into atomic tasks
- Map dependencies and identify critical path
- Assign priorities strategically
- Define test strategies
- Create comprehensive task hierarchies aligned with project plan

**When to Use**:

- User provides raw requirements
- Large feature request needs decomposition
- Project roadmap needs updating
- Blockers need unblocking tasks
- Task structure needs refinement

**Key Methods**:

- `zen-tasks_parse_requirements` - Bulk convert requirements to tasks
- `zen-tasks_add_task` - Create individual tasks
- `zen-tasks_update_task` - Refine existing tasks
- `zen-tasks_list_tasks` - View current task state

**Invocation Examples**:

```
@Zen Planner analyze implement user authentication with OAuth
@Zen Planner breakdown TASK-045
@Zen Planner roadmap
@Zen Planner dependencies
```

**Output Artifacts**:

- Task tree in `_ZENTASKS/tasks.json`
- Dependency diagram (Mermaid)
- Risk assessment
- Execution order recommendations

---

### 2. Plan Agent

**File**: `.github/agents/Plan Agent.agent.md`

**Role**: Architect and system designer

**Responsibilities**:

- Design system structures and components
- Enforce architectural patterns and constraints
- Make critical structural decisions
- Validate architectural compliance
- Document architectural decisions

**When to Use**:

- Need to design system structure
- Making architectural decisions
- Need to validate code against architecture
- Defining design patterns
- Documenting structural decisions
- Implementing module boundaries

**Key Methods**:

- Mermaid diagram creation for architecture
- Architectural decision documentation
- Pattern enforcement verification
- Constraint validation

**Invocation Examples**:

```
@Plan Agent design multi-module API structure
@Plan Agent validate
@Plan Agent decision should we use microservices
@Plan Agent constraints
@Plan Agent patterns dependency injection rules
```

**Output Artifacts**:

- Architecture documentation
- Architectural Decision Records (ADRs)
- Module design documents
- Constraint definitions
- Pattern enforcement guidelines

---

### 3. Auto Zen

**File**: `.github/agents/Auto Zen.agent.md`

**Role**: Autonomous code execution

**Responsibilities**:

- Execute implementation tasks in continuous loop
- Implement features, fixes, refactoring
- Run tests and verify completion
- Create follow-up tasks from observations
- Observe codebase for issues

**When to Use**:

- Ready to implement tasks
- Need continuous code execution
- Have task queue ready
- Want autonomous work loop
- Need to push through task backlog

**Key Methods**:

- `zen-tasks_next_task` - Get next ready task
- `zen-tasks_set_status` - Update task status
- `zen-tasks_add_task` - Create follow-up tasks
- Full code editing and execution

**Invocation Examples**:

```
@Auto Zen start
@Auto Zen continue
@Auto Zen execute TASK-045
```

**Output Artifacts**:

- Implemented code
- Updated tests
- Created PRs
- Follow-up task list
- Post-task comments with summary

---

### 4. Testing Agent

**File**: `.github/agents/Testing Agent.agent.md`

**Role**: Quality assurance specialist

**Responsibilities**:

- Generate comprehensive test suites
- Validate code coverage
- Run all test types (unit, integration, E2E)
- Verify task completion
- Enforce quality gates
- Detect and report flaky tests

**When to Use**:

- Need tests for implementation
- Want to verify code quality
- Running quality gates
- Need coverage report
- Testing strategy needed
- Performance testing required

**Key Methods**:

- `execute` - Run test frameworks
- Coverage analysis
- Flaky test detection
- Performance benchmarking

**Invocation Examples**:

```
@Testing Agent generate tests for UserService.php
@Testing Agent run tests
@Testing Agent coverage report
@Testing Agent strategy for authentication module
@Testing Agent fix failing test
```

**Output Artifacts**:

- Test files and test suite
- Coverage reports
- Test failure analysis
- Quality gate reports
- Performance benchmarks

---

### 5. Dependency Agent

**File**: `.github/agents/Dependency Agent.agent.md`

**Role**: Dependency manager

**Responsibilities**:

- Monitor package versions
- Detect security vulnerabilities
- Update dependencies safely
- Analyze dependency drift
- Enforce dependency constraints
- Manage transitive dependencies

**When to Use**:

- Need to update dependencies
- Security vulnerability detected
- Want to check dependency health
- Need to analyze dependency tree
- Detecting version conflicts
- Dependency drift detection

**Key Methods**:

- `execute` - Run package managers and security scanners
- Dependency analysis
- Vulnerability scanning
- Compatibility testing

**Invocation Examples**:

```
@Dependency Agent scan
@Dependency Agent security
@Dependency Agent update lodash
@Dependency Agent tree
@Dependency Agent drift
@Dependency Agent health
```

**Output Artifacts**:

- Dependency analysis reports
- Vulnerability scans
- Update recommendations
- Dependency tree visualization
- Drift detection reports

---

### 6. Issue Handler

**File**: `.github/agents/Issue Handler.agent.md`

**Role**: GitHub issue manager

**Responsibilities**:

- Monitor GitHub issues
- Convert issues to structured tasks
- Maintain two-way synchronization
- Manage issue lifecycle
- Categorize and triage issues
- Coordinate cross-repo issues

**When to Use**:

- Need to process GitHub issues
- Want to sync issues to tasks
- Managing issue status
- Converting issues to work
- Coordinating multi-repo work
- Tracking issue metrics

**Key Methods**:

- GitHub API integration (issue_fetch, createIssue, updateIssue, closeIssue)
- `zen-tasks_add_task` - Create tasks from issues
- `zen-tasks_set_status` - Sync task status back to issue
- Issue categorization and labeling

**Invocation Examples**:

```
@Issue Handler check issues
@Issue Handler sync 1234
@Issue Handler status 1234
@Issue Handler close 1234
@Issue Handler report
```

**Output Artifacts**:

- Internal task representations of issues
- Synchronized GitHub issue comments
- Issue metrics and reports
- Cross-repo issue tracking
- Issue lifecycle documentation

---

## Agent Tool Availability

### All Agents Have Access To

```
- Memory (persistent knowledge storage)
- GitHub API (issue_fetch, doSearch, suggest-fix, renderIssues)
- Zen Tasks tools (listTasks, addTask, getTask, updateTask, setTaskStatus, getNextTask, parseRequirements)
- Mermaid diagramming (syntax_docs, validator, preview)
- Web search
- Docker search (mcp_docker/search)
```

### Additional Tools by Agent

**Auto Zen Only**:

- VS Code editor (vscode)
- Command execution (execute)
- Full file read/edit access
- Python environment tools
- Jupyter notebook tools
- Todo management

**Plan Agent Only**:

- Jupyter notebook creation/editing
- Architectural diagram tools

**Testing Agent Only**:

- Python environment configuration
- Package installation
- Notebook tools

**Dependency Agent Only**:

- Python package management
- Environment configuration

---

## Collaboration Patterns Quick Reference

### Primary Workflows

**Issue → Task Execution → Closure**:

```
Issue Handler → Zen Planner → Auto Zen → Testing Agent → Issue Handler
                                ↓
                            Plan Agent (if architecture needed)
                            Dependency Agent (if dependencies change)
```

**Architecture Decision**:

```
Plan Agent → Zen Planner → Auto Zen → Testing Agent → Plan Agent
                                        (verify compliance)
```

**Dependency Update**:

```
Dependency Agent → Auto Zen → Testing Agent → Issue Handler (if PR/issue sync)
```

**Observation Loop** (Continuous during implementation):

```
Auto Zen (discovers issue)
    ├─ Architecture concern? → Plan Agent
    ├─ Test coverage gap? → Testing Agent
    ├─ Dependency question? → Dependency Agent
    ├─ New work identified? → Zen Planner
    └─ GitHub issue related? → Issue Handler
```

---

## Priority Handling

**Agent-Specific Priority Rules**:

| Agent | CRITICAL | HIGH | MEDIUM | LOW |
|-------|----------|------|--------|-----|
| Zen Planner | Blocking task breakdown | Feature planning | Refactoring | Nice-to-have |
| Plan Agent | Constraint violation | Architectural decision | Pattern question | Documentation |
| Auto Zen | Production blocker | On critical path | Feature work | Cleanup |
| Testing Agent | Test failure | Coverage gap | Flaky test | Test optimization |
| Dependency Agent | Security CVE | Breaking change | Minor update | Cleanup |
| Issue Handler | Critical bug | Feature request | Question | Discussion |

---

## Status Codes

All tasks maintain status through lifecycle:

```
pending       → Initial state, not ready
in-progress   → Currently being worked by an agent
blocked       → Waiting for external dependency
review        → Completed, awaiting review
done          → Completed and verified
failed        → Attempt failed, awaiting fix
cancelled     → Intentionally not doing
```

---

## File Locations

```
Agent Profiles:
  .github/agents/
  ├── Auto Zen.agent.md
  ├── Zen Planner.agent.md
  ├── Plan Agent.agent.md
  ├── Testing Agent.agent.md
  ├── Dependency Agent.agent.md
  └── Issue Handler.agent.md

Orchestration:
  .github/
  ├── AGENT-ORCHESTRATION-GUIDE.md (this file's companion)
  ├── copilot-instructions.md (core instructions)

Tasks:
  _ZENTASKS/
  ├── tasks.json (task database)
  └── TASK-*.md (individual task files)

Plans:
  Docs/Plan/
  ├── detailed project description
  ├── feature list
  ├── todo
  └── code master.ipynb
```

---

## Invocation Cheat Sheet

### Start Fresh Project

```
@Zen Planner analyze [raw requirements from Docs/Plan/feature list]
→ Creates initial task hierarchy
→ @Auto Zen start to begin implementation
```

### Fix Failing Test

```
@Testing Agent fix failing test
→ Creates investigation and fix tasks
→ @Auto Zen continue to implement fixes
```

### Update Dependencies

```
@Dependency Agent scan
→ Reports available updates and vulnerabilities
→ @Dependency Agent update [package]
→ @Auto Zen continues to apply and test
```

### Handle GitHub Issue

```
@Issue Handler check issues
→ Converts to tasks
→ @Zen Planner reviews for alignment
→ @Auto Zen executes when ready
```

### Architecture Decision

```
@Plan Agent design [system aspect]
→ Documents architecture
→ @Zen Planner maps to tasks
→ @Auto Zen implements following design
→ @Plan Agent validates compliance
```

---

## Monitoring & Metrics

**Metrics Tracked by Each Agent**:

- **Zen Planner**: Tasks created, dependencies mapped, critical path identified
- **Plan Agent**: Architecture decisions documented, constraints violations detected, patterns enforced
- **Auto Zen**: Tasks completed, bugs found, follow-ups created, code churn
- **Testing Agent**: Coverage %, tests passing, flaky tests, performance trends
- **Dependency Agent**: Vulnerabilities found, updates available, drift detected, bundle size
- **Issue Handler**: Issues processed, issues closed, sync accuracy, cross-repo coordination

---

## Configuration

### Enable/Disable Agents

All agents are enabled by default. To focus work, use:

```
@Zen Planner only plan, don't execute
@Plan Agent validate but don't refactor
@Auto Zen pause, human review needed
@Testing Agent report only, no auto-fixes
```

### Adjust Agent Behavior

**Agent-specific settings** (future extensions):

```yaml
ZenPlanner:
  minTaskSize: 15m  # Split larger tasks
  maxTaskSize: 4h   # Break very large tasks
  
AutoZen:
  autoCommit: true  # Auto-commit changes
  runTests: true    # Always run tests
  
TestingAgent:
  coverageTarget: 80%
  failOnWarning: true
  
DependencyAgent:
  autoUpdate: patch  # Only patch updates
  securityFirst: true  # Critical: security immediately
  
IssueHandler:
  syncInterval: 1h
  autoClose: true  # Auto-close when task done
```

---

## Support & Debugging

### If an agent fails

1. **Check task status**: `@Zen Planner list-tasks` (or read `_ZENTASKS/tasks.json`)
2. **Review agent logs**: Check agent-specific output for error messages
3. **Create investigation task**: `@Zen Planner create investigation [issue]`
4. **Mark as blocked**: `@[Agent Name] mark blocked [reason]`
5. **Escalate to human**: Create GitHub issue for manual review

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Agent timeout | Large task | Split task smaller |
| Circular dependency | Task structure | Use Zen Planner to fix |
| Test failure | Code or test issue | Use Testing Agent to investigate |
| Security alert | Dependency | Use Dependency Agent to patch |
| Architecture violation | Implementation | Use Plan Agent to review |

---

## Next Steps

To get started:

1. **Read full agent profiles**: Each `.agent.md` file in `.github/agents/`
2. **Review orchestration guide**: `.github/AGENT-ORCHESTRATION-GUIDE.md`
3. **Start simple**: Use Zen Planner to plan a small feature
4. **Run Auto Zen**: Let it implement the planned tasks
5. **Observe and improve**: Capture learnings in follow-up tasks

---

This index provides a complete overview of the multi-agent system. For detailed information on any agent, refer to its full profile file in `.github/agents/`.
