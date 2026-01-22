# Branch Cleanup Scripts

This directory contains automation scripts for Issue #177 - Branch cleanup.

## Scripts

### 1. `cleanup-branches.sh`

Automated branch deletion script with safety features.

**Features:**
- Interactive confirmation required
- Dry-run mode for preview
- Color-coded output
- Branch existence checking
- Automatic pruning

**Usage:**
```bash
# Preview what would be deleted (safe)
bash scripts/cleanup-branches.sh --dry-run

# Delete confirmed outdated branches only
bash scripts/cleanup-branches.sh

# Delete all branches including additional ones
bash scripts/cleanup-branches.sh --all

# Preview all deletions
bash scripts/cleanup-branches.sh --all --dry-run
```

**Branches Deleted (default mode):**
- `copilot/add-metrics-service`
- `copilot/build-orchestrator-dashboard`
- `copilot/fix-race-condition-in-status-updates`
- `alert-fix-10`

**Additional Branches (with --all flag):**
- `copilot/implement-dead-letter-queue-sqlite` ⚠️  Only 1 commit behind main
- `copilot/replace-sample-data-integration` ⚠️  Only 1 commit behind main

**Safety:**
- Requires typing 'DELETE' to confirm
- Checks if branches exist before deletion
- Provides summary of actions

---

### 2. `verify-features.sh`

Verifies all features from merged branches exist on main.

**Features:**
- Checks for file existence
- Validates code patterns
- Comprehensive reporting
- Exit codes for CI/CD

**Usage:**
```bash
# Run verification
bash scripts/verify-features.sh
```

**Checks Performed:**
- ✅ MetricsService implementation
- ✅ Dashboard panels
- ✅ Optimistic locking
- ✅ MCP handlers
- ✅ Copilot Agent API
- ✅ Dead Letter Queue
- ✅ Test files

**Exit Codes:**
- `0` - All features verified
- `1` - Some features missing

---

## Quick Start

### Safe Cleanup Process

1. **Verify features exist:**
   ```bash
   cd /path/to/repo
   bash scripts/verify-features.sh
   ```

2. **Preview cleanup:**
   ```bash
   bash scripts/cleanup-branches.sh --dry-run
   ```

3. **Execute cleanup:**
   ```bash
   bash scripts/cleanup-branches.sh
   # Type 'DELETE' when prompted
   ```

4. **Verify cleanup:**
   ```bash
   git ls-remote --heads origin
   git remote prune origin
   ```

---

## Documentation

- **Cleanup Plan**: `../Docs/BRANCH-CLEANUP-PLAN.md`
- **Execution Summary**: `../Docs/BRANCH-CLEANUP-SUMMARY.md`
- **Original Issue**: [#177](https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues/177)

---

## Requirements

- Bash 4.0+
- Git 2.0+
- Push permissions to origin (for cleanup script)

---

## Troubleshooting

**Issue**: Script says "Not on main branch"
- **Solution**: Run `git checkout main` first, or answer 'y' when prompted

**Issue**: "Permission denied"
- **Solution**: Run `chmod +x scripts/*.sh`

**Issue**: Branches not found
- **Solution**: Run `git fetch origin` first

**Issue**: Push permission denied
- **Solution**: Ensure you have push permissions to the repository

---

**Created**: January 21, 2026  
**Issue**: #177  
**Purpose**: Automated branch cleanup for repository maintenance
---

## PRD Maintenance Scripts

### sync-prd-sources.py

**Purpose**: Validates PRD source files are up to date before generating PRD.md/PRD.json

**When to use**:
- Before running PRD.ipynb
- After completing features
- Weekly as part of project health check

**Usage**:
```bash
# Validate only (check if files need updates)
python scripts/sync-prd-sources.py

# Validate and show what would be updated
python scripts/sync-prd-sources.py --update
```

**What it checks**:
1. ✅ COMPREHENSIVE-AUDIT-UNDONE-TASKS.md age (<7 days)
2. ✅ Docs/Current-Status/INCOMPLETE-WORK.md age (<3 days)
3. ✅ Sync between audit file and INCOMPLETE-WORK.md
4. ✅ PRD.md plan_alignment_audit accuracy

**Exit codes**:
- `0` = All files in sync, safe to generate PRD
- `1` = Files need updates, see output for instructions

### PRD Update Workflow

When features are completed:

```bash
# Step 1: Update audit file
# Edit: COMPREHENSIVE-AUDIT-UNDONE-TASKS.md
#   - Mark completed items as ✅ COMPLETE
#   - Move to "COMPLETED" section
#   - Update Executive Summary counts
#   - Update date in header

# Step 2: Validate sync
python scripts/sync-prd-sources.py

# Step 3: If validation passes, regenerate PRD
# Open PRD.ipynb in VS Code/Jupyter
# Run all cells

# Step 4: Commit all changes
git add COMPREHENSIVE-AUDIT-UNDONE-TASKS.md
git add Docs/Current-Status/*.md
git add PRD.md PRD.json
git commit -m "chore: update PRD - completed [feature names]"
```

See also:
- `COMPREHENSIVE-AUDIT-UNDONE-TASKS.md` Section 11 (Update Procedure)
- `PRD.ipynb` Cell "PRD Maintenance Guide"