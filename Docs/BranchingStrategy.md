# Branching Strategy — Copilot Orchestration Extension

**Version:** 1.0.0  
**Last Updated:** 2026-01-12  
**Status:** Active

---

## Overview

This document defines the branching strategy for managing parallel work streams, feature development, and coordinated releases across the Copilot Orchestration Extension project.

---

## Branch Types

### 1. `main` — Production Branch
- **Purpose:** Stable, production-ready code
- **Protection:** Protected branch, requires PR approval
- **Deployment:** Triggers CI/CD to staging/production
- **Commits:** Only via approved PR merges

### 2. `feature/{task-id}-{description-slug}` — Feature Branches
- **Purpose:** Individual feature development
- **Naming:** `feature/TASK-mk9c0007-template-tests`
- **Lifespan:** Created from main, merged back to main, then archived
- **Example:** `feature/TASK-mk9c0006-wizard-integration`

### 3. `bugfix/{task-id}-{description-slug}` — Bug Fix Branches
- **Purpose:** Non-critical bug fixes
- **Naming:** `bugfix/TASK-xxxxx-fix-auth-validation`
- **Lifespan:** Short-lived, merged to main after fix

### 4. `hotfix/{issue-number}-{description-slug}` — Hotfix Branches
- **Purpose:** Critical production bugs requiring immediate deployment
- **Naming:** `hotfix/123-fix-deployment-crash`
- **Lifespan:** Created from main, merged to main + deployed immediately

### 5. `epic/{epic-id}-{description-slug}` — Epic Branches (Optional)
- **Purpose:** Long-running EPIC work with multiple sub-tasks
- **Naming:** `epic/EPIC-010-plan-templates`
- **Lifespan:** Longer-lived, merges to main after full EPIC completion
- **Sub-branches:** Feature branches created from epic branch

### 6. `cloud/{environment}-{purpose}` — Cloud Deployment Branches
- **Purpose:** Cloud infrastructure and deployment configurations
- **Naming:** `cloud/production-optimization`, `cloud/staging-setup`
- **Lifespan:** Created for cloud changes, merged after deployment validation
- **Managed by:** Cloud Agent

---

## Development Lifecycle with Phases

### Phase 1: Planning & Design
**Duration:** 30-60 minutes per feature  
**Responsible:** Zen Planner, Plan Agent

**Activities:**
- Analyze requirements
- Break into tasks
- Design architecture
- Estimate effort
- Identify dependencies
- Define success criteria

**Outputs:**
- Task breakdown in `_ZENTASKS/tasks.json`
- Architecture diagrams (if applicable)
- Dependency map
- Test strategy

**Checklist:**
- [ ] Requirements clear and documented
- [ ] Tasks created with priorities
- [ ] Dependencies mapped
- [ ] Architecture validated
- [ ] Test strategy defined

---

### Phase 2: Implementation
**Duration:** Varies by task complexity  
**Responsible:** Auto Zen

**Activities:**
- Create feature branch
- Implement code changes
- Write unit tests
- Verify compilation
- Commit changes
- Sync with main daily

**Outputs:**
- Working code in feature branch
- Unit tests passing
- Git commits with clear messages

**Checklist:**
- [ ] Branch created from latest main
- [ ] Code implements requirements
- [ ] Tests written and passing
- [ ] No compilation errors
- [ ] Code follows patterns
- [ ] Changes committed

---

### Phase 3: Quality Assurance
**Duration:** 15-30 minutes per feature  
**Responsible:** Testing Agent

**Activities:**
- Run full test suite
- Measure code coverage
- Validate against requirements
- Test edge cases
- Generate coverage report

**Outputs:**
- Test results
- Coverage report (80%+ target)
- Quality gates passed

**Checklist:**
- [ ] All tests passing
- [ ] Coverage ≥ 80%
- [ ] Edge cases tested
- [ ] Performance acceptable
- [ ] No regressions

---

### Phase 4: Code Review
**Duration:** 30-60 minutes  
**Responsible:** Human reviewers + Copilot

**Activities:**
- Create pull request
- Automated checks run (CI/CD)
- Human code review
- Address feedback
- Re-review if needed

**Outputs:**
- Pull request with description
- Review comments
- Approval(s)

**Checklist:**
- [ ] PR created with clear description
- [ ] CI checks passing
- [ ] Code reviewed by human
- [ ] Feedback addressed
- [ ] Required approvals obtained

---

### Phase 5: Deployment (Cloud)
**Duration:** 30-90 minutes  
**Responsible:** Cloud Agent

**Activities:**
- Deploy to staging environment
- Run smoke tests
- Validate health checks
- Deploy to production (if staging passes)
- Monitor post-deployment

**Outputs:**
- Deployed application
- Deployment logs
- Health check results
- Monitoring dashboards

**Checklist:**
- [ ] Staging deployment successful
- [ ] Smoke tests passing
- [ ] Health checks green
- [ ] Production deployment complete
- [ ] Monitoring active
- [ ] Rollback plan ready

---

### Phase 6: Post-Deployment Checkup
**Duration:** 30 minutes, then continuous monitoring  
**Responsible:** Cloud Agent

**Activities:**
- Monitor application health
- Track error rates
- Measure performance metrics
- Validate user experience
- Check cost metrics

**Outputs:**
- Health report
- Performance metrics
- Error logs (if any)
- Cost analysis

**Checkup Schedule:**
- Immediate: First 30 minutes post-deployment
- Hourly: First 24 hours
- Daily: First week
- Weekly: Ongoing

**Health Checks:**
- [ ] Application responding (HTTP 200)
- [ ] API endpoints functional
- [ ] Database connections healthy
- [ ] Error rate < 0.1%
- [ ] Response time < 200ms (p95)
- [ ] CPU usage < 80%
- [ ] Memory usage < 85%
- [ ] No security alerts
- [ ] Costs within budget

**Auto-remediation Triggers:**
- High error rate → Auto-rollback
- Slow response → Auto-scale
- High CPU → Alert + scale recommendation
- Security alert → Immediate team notification

---

## Branching Workflow

### Standard Feature Development

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/TASK-mk9c0007-template-tests

# 2. Make changes, commit frequently
git add .
git commit -m "test(templates): add TemplateService unit tests"

# 3. Keep branch synced with main (daily or before PR)
git fetch origin main
git rebase origin/main

# 4. Push feature branch
git push -u origin feature/TASK-mk9c0007-template-tests

# 5. Create Pull Request (via GitHub)
# Title: "feat(templates): comprehensive test suite for template system"
# Body: Links to TASK-mk9c0007, test coverage report, screenshots

# 6. After PR approval & merge
git checkout main
git pull origin main
git branch -d feature/TASK-mk9c0007-template-tests  # Local cleanup
```

### EPIC-Based Development (Multi-Task)

```bash
# 1. Create EPIC branch from main
git checkout main
git pull origin main
git checkout -b epic/EPIC-010-plan-templates

# 2. Create feature branches FROM epic branch
git checkout -b feature/TASK-mk9c0001-templates-types

# 3. Complete feature, merge back to EPIC branch
git checkout epic/EPIC-010-plan-templates
git merge feature/TASK-mk9c0001-templates-types

# 4. Repeat for all sub-tasks

# 5. When EPIC complete, merge epic branch to main
git checkout main
git merge epic/EPIC-010-plan-templates

# 6. Archive EPIC branch
git push origin :epic/EPIC-010-plan-templates  # Delete remote
git branch -d epic/EPIC-010-plan-templates      # Delete local
```

---

## Branch-to-Task Mapping

### Task Metadata Schema

```yaml
# In _ZENTASKS/tasks.json
{
  "id": "TASK-mk9c0007-template-tests",
  "title": "Create comprehensive test suite for template system",
  "branchInfo": {
    "branchName": "feature/TASK-mk9c0007-template-tests",
    "createdAt": "2026-01-12T23:30:00.000Z",
    "baseBranch": "main",
    "status": "active" | "merged" | "abandoned",
    "lastSyncedWithMain": "2026-01-12T23:45:00.000Z",
    "prUrl": "https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/pull/42",
    "mergedAt": "2026-01-13T01:00:00.000Z"
  }
}
```

---

## Dependency-Aware Merge Sequencing

### Merge Order Rules

1. **Resolve dependency chain:**
   ```
   TASK-A (no deps) → merge first
   TASK-B (depends on A) → merge after A
   TASK-C (depends on B) → merge after B
   ```

2. **Parallel tasks** (no dependencies) → merge in any order

3. **Blocking tasks** must merge before dependent tasks

### Automated Sequencing Algorithm

```typescript
function getMergeOrder(tasks: Task[]): Task[] {
  const sorted: Task[] = [];
  const visited = new Set<string>();
  
  function visit(task: Task) {
    if (visited.has(task.id)) return;
    
    // Visit dependencies first
    task.dependencies.forEach(depId => {
      const dep = tasks.find(t => t.id === depId);
      if (dep) visit(dep);
    });
    
    visited.add(task.id);
    sorted.push(task);
  }
  
  tasks.forEach(visit);
  return sorted;
}
```

---

## Conflict Resolution Strategy

### Automatic Resolution (Safe Cases)

**Auto-merge if:**
- Changes in different files
- Changes in different sections of same file
- Non-overlapping line ranges

**Auto-resolution types:**
- Whitespace conflicts → Keep incoming changes
- Import order → Alphabetize
- JSON formatting → Prettier/auto-format

### Manual Resolution Required

**Escalate to human review if:**
- Logic conflicts (same function modified differently)
- Schema conflicts (database migrations, API contracts)
- Test failures after merge
- Build errors after merge

### Conflict Resolution Workflow

```bash
# 1. Attempt auto-merge
git checkout main
git pull origin main
git merge feature/TASK-xxxxx

# 2. If conflicts detected
git status  # View conflicted files

# 3. Automatic resolution attempt
npm run resolve-conflicts  # Custom script (if available)

# 4. If auto-resolution fails → Manual review
# - Open conflicted files
# - Review <<<<<<< HEAD / ======= / >>>>>>> markers
# - Keep correct changes
# - Test thoroughly

# 5. Complete merge
git add .
git commit -m "merge: resolve conflicts in feature/TASK-xxxxx"
```

---

## Keeping Branches Synced with Main

### Daily Sync Schedule

**Recommended:** Sync feature branches with main **daily** or **before creating PR**

```bash
# Method 1: Rebase (preferred - keeps clean history)
git checkout feature/TASK-xxxxx
git fetch origin main
git rebase origin/main

# Resolve conflicts if any
git add .
git rebase --continue

git push --force-with-lease  # Safe force push

# Method 2: Merge (if rebase conflicts are complex)
git checkout feature/TASK-xxxxx
git merge origin/main

# Resolve conflicts, commit merge
git push
```

### Automated Sync (GitHub Actions)

```yaml
# .github/workflows/sync-feature-branches.yml
name: Sync Feature Branches with Main

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync all active feature branches
        run: |
          git fetch --all
          for branch in $(git branch -r | grep 'feature/'); do
            git checkout $branch
            git rebase origin/main || git rebase --abort
          done
```

---

## Branch Archival Process

### After Successful PR Merge

```bash
# 1. Confirm PR merged to main
git checkout main
git pull origin main

# 2. Delete local feature branch
git branch -d feature/TASK-xxxxx

# 3. Delete remote feature branch (auto-deleted by GitHub if enabled)
git push origin --delete feature/TASK-xxxxx

# 4. Update task metadata
# Set branchInfo.status = "merged"
# Add branchInfo.mergedAt timestamp
# Add branchInfo.archivedAt timestamp
```

### Branch Archival Checklist

- [ ] PR approved by required reviewers
- [ ] All CI/CD checks passing
- [ ] Branch merged to main
- [ ] Local branch deleted
- [ ] Remote branch deleted
- [ ] Task status updated to "done"
- [ ] Branch metadata archived in task details

### Long-Term Archive Storage

**Git tags for historical reference:**

```bash
# Tag completed features before deletion
git tag -a archive/TASK-mk9c0007 -m "Template tests complete"
git push origin archive/TASK-mk9c0007

# Later, retrieve archived branch
git checkout -b feature/TASK-mk9c0007-restored archive/TASK-mk9c0007
```

---

## Branch Naming Conventions

### Format

```
{type}/{task-id}-{description-slug}
```

### Valid Types

- `feature/` — New features
- `bugfix/` — Non-critical bug fixes
- `hotfix/` — Critical production bugs
- `epic/` — Long-running EPIC work
- `refactor/` — Code refactoring (no new features)
- `docs/` — Documentation updates
- `test/` — Test-only changes
- `chore/` — Build/tooling updates

### Description Slug Rules

- Lowercase
- Hyphen-separated
- Max 50 characters
- Descriptive (avoid generic names like "fix-bug")

### Examples

✅ **Good:**
- `feature/TASK-mk9c0007-template-tests`
- `bugfix/TASK-mk9c0009-fix-template-validation`
- `hotfix/123-fix-deployment-crash`
- `epic/EPIC-010-plan-templates`

❌ **Bad:**
- `my-feature` (no task ID)
- `feature/fix` (not descriptive)
- `FEATURE/TASK-123-NEW-STUFF` (uppercase)

---

## GitHub Integration

### Pull Request Template

```markdown
## Description
[Brief description of changes]

## Related Task
Closes #TASK-mk9c0007-template-tests

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or migration guide provided)
- [ ] Branch synced with latest main
- [ ] All CI checks passing

## Testing
[How was this tested?]

## Screenshots
[If UI changes]
```

### Branch Protection Rules

**For `main` branch:**
- ✅ Require pull request before merging
- ✅ Require 1+ approvals
- ✅ Require status checks to pass (CI/CD)
- ✅ Require branches to be up to date before merging
- ✅ Require signed commits (optional)
- ❌ Allow force pushes (never on main)
- ❌ Allow deletions (never on main)

---

## Branching Anti-Patterns (Avoid)

### ❌ Long-Lived Feature Branches
**Problem:** Difficult to merge, high conflict risk  
**Solution:** Break into smaller tasks, merge frequently

### ❌ Committing Directly to Main
**Problem:** Bypasses code review, breaks CI/CD  
**Solution:** Always use PRs, even for small fixes

### ❌ Not Syncing with Main
**Problem:** Merge conflicts pile up  
**Solution:** Daily rebases, automated sync

### ❌ Generic Branch Names
**Problem:** Hard to track, poor audit trail  
**Solution:** Strict naming convention with task IDs

### ❌ Keeping Merged Branches
**Problem:** Cluttered repo, confusion  
**Solution:** Auto-delete on merge, archive via tags

---

## Rollback Procedures

### Revert Recent Merge

```bash
# Find commit hash of merge
git log --oneline --graph

# Revert merge commit
git revert -m 1 <merge-commit-hash>
git push origin main

# Or reset to previous state (DANGER: destructive)
git reset --hard HEAD~1
git push --force origin main  # Requires admin access
```

### Rollback to Specific Commit

```bash
# Revert to specific commit
git revert <commit-hash>
git push origin main

# Or create rollback branch
git checkout -b hotfix/rollback-feature-x
git revert <commit-hash>
git push -u origin hotfix/rollback-feature-x
# Create PR to merge rollback
```

---

## Monitoring & Metrics

### Branch Health Metrics

Track these metrics to ensure healthy branching practices:

- **Branch Age:** How long branches exist before merge
- **Sync Frequency:** Days since last sync with main
- **Conflict Rate:** % of PRs with merge conflicts
- **PR Cycle Time:** Time from PR creation to merge
- **Stale Branches:** Branches >7 days without commits

### Tools

- GitHub Insights → Branch activity
- Git commands → `git branch --merged`, `git log --graph`
- Custom scripts → `_ZENTASKS/branch-health-report.sh`

---

## Common Commands Reference

```bash
# List all branches
git branch -a

# List merged branches
git branch --merged main

# List unmerged branches
git branch --no-merged main

# Delete merged local branches
git branch -d $(git branch --merged main | grep -v "main")

# Delete merged remote branches
git push origin --delete $(git branch -r --merged main | grep -v "main" | sed 's/origin\///')

# View branch commit history
git log --oneline --graph --all

# Find branches containing commit
git branch --contains <commit-hash>

# Rename current branch
git branch -m new-branch-name

# Cherry-pick commit from another branch
git cherry-pick <commit-hash>
```

---

## Automated Branch Management

### Branch Lifecycle Automation

Create tasks for automated branch management:

```json
{
  "id": "AUTO-BRANCH-SYNC",
  "title": "Daily branch sync with main",
  "schedule": "0 0 * * *",  // Daily at midnight
  "action": "sync-all-feature-branches"
},
{
  "id": "AUTO-BRANCH-CLEANUP",
  "title": "Archive merged branches",
  "schedule": "0 2 * * 0",  // Weekly Sunday 2 AM
  "action": "delete-merged-branches"
}
```

---

## Emergency Procedures

### Force Merge (Use with Caution)

```bash
# Only for critical hotfixes, requires admin approval
git checkout main
git merge --no-ff --no-verify feature/hotfix-critical
git push origin main
```

### Branch Recovery

```bash
# Restore accidentally deleted branch
git reflog  # Find commit hash
git checkout -b recovered-branch <commit-hash>
git push -u origin recovered-branch
```

---

## Glossary

- **PR:** Pull Request
- **Rebase:** Reapply commits on top of another base
- **Merge Conflict:** Overlapping changes requiring manual resolution
- **Force Push:** Overwrite remote branch history (dangerous)
- **Fast-Forward Merge:** Merge without creating merge commit
- **Squash Merge:** Combine all commits into one

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-12 | Initial branching strategy documentation |

---

**For questions or strategy updates, contact:** Project Maintainers  
**Related Docs:** [GitHub Workflow](GitHub-Integration.md), [CI/CD Pipeline](CICD-Pipeline.md)
