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
./scripts/cleanup-branches.sh --dry-run

# Delete confirmed outdated branches only
./scripts/cleanup-branches.sh

# Delete all branches including additional ones
./scripts/cleanup-branches.sh --all

# Preview all deletions
./scripts/cleanup-branches.sh --all --dry-run
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
./scripts/verify-features.sh
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
