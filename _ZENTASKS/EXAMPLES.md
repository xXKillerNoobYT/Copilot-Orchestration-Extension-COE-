# Zen Tasks ↔ GitHub Issues Sync - Example Usage

This document provides examples of how to use the sync script.

## Example 1: First Time Setup

```bash
# 1. Navigate to _ZENTASKS directory
cd _ZENTASKS

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file with your GitHub token
cat > .env << EOF
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=xXKillerNoobYT
GITHUB_REPO=Copilot-Orchestration-Extension-COE-
EOF

# 4. Run initial sync (import existing GitHub issues)
python sync_github.py --sync-from-github

# 5. Review created task files
ls -la TASK-*.md

# 6. Verify tasks.json was updated
cat tasks.json | jq '.tasks | length'
```

## Example 2: Sync Local Tasks to GitHub

```bash
# After creating or updating tasks locally
cd _ZENTASKS

# Sync tasks TO GitHub (creates/updates issues)
python sync_github.py --sync-to-github

# Or use the quick sync script
./quick_sync.sh
```

## Example 3: Two-Way Sync (Recommended)

```bash
# Run bidirectional sync to keep everything in sync
cd _ZENTASKS
python sync_github.py --sync-both

# This will:
# 1. Import new GitHub issues as tasks
# 2. Export updated tasks as GitHub issues
# 3. Update existing mappings
```

## Example 4: Automated Sync with Cron

```bash
# Add to crontab for hourly sync
crontab -e

# Add this line (replace /path/to/repo with actual path):
0 * * * * cd /path/to/repo/_ZENTASKS && GITHUB_TOKEN=xxx python3 sync_github.py --sync-both >> sync.log 2>&1
```

## Example 5: Check Sync Status

```bash
# View sync metadata
cd _ZENTASKS
cat sync_metadata.json | jq '.'

# Example output:
# {
#   "task_to_issue": {
#     "TASK-abc123-xyz": 42,
#     "TASK-def456-uvw": 43
#   },
#   "issue_to_task": {
#     "42": "TASK-abc123-xyz",
#     "43": "TASK-def456-uvw"
#   }
# }
```

## Example 6: Manual Task Creation and Sync

```bash
# 1. Create a new task markdown file
cd _ZENTASKS
cat > TASK-example-abc123.md << 'EOF'
---
id: TASK-example-abc123
title: Implement new feature
type: feature
priority: high
status: pending
dependencies: []
assignees: [coder]
labels: [backend, api]
estimate: "4h"
---

## Goal
Build a new API endpoint for user management

## Description
Create a RESTful endpoint that allows CRUD operations on user data.

## Acceptance Criteria
- [ ] Endpoint accepts POST, GET, PUT, DELETE
- [ ] Proper authentication required
- [ ] Input validation implemented
- [ ] Returns appropriate status codes

## Technical Approach
- Use Laravel routes and controllers
- Implement FormRequest validation
- Add resource transformers
- Write comprehensive tests
EOF

# 2. Add task to tasks.json
# (Normally you'd use zen-tasks tools, but for example:)
cat tasks.json | jq '.tasks += [{
  "id": "TASK-example-abc123",
  "title": "Implement new feature",
  "description": "Build a new API endpoint for user management",
  "type": "feature",
  "priority": "high",
  "status": "pending",
  "dependencies": [],
  "createdAt": "2026-01-11T08:00:00Z",
  "updatedAt": "2026-01-11T08:00:00Z"
}]' > tasks.json.tmp && mv tasks.json.tmp tasks.json

# 3. Sync to GitHub
python sync_github.py --sync-to-github

# This creates a new GitHub issue with:
# - Title: "Implement new feature"
# - Body: Content from the markdown file
# - Labels: enhancement, priority:high, backend, api
# - State: open
```

## Example 7: Sync Specific GitHub Issue

```bash
# The script syncs all issues, but you can filter by creating a wrapper:

cd _ZENTASKS

# Create a custom script to sync only specific issues
cat > sync_single_issue.py << 'EOF'
import os
from sync_github import ZenTasksGitHubSync

token = os.getenv('GITHUB_TOKEN')
sync = ZenTasksGitHubSync(token, 'xXKillerNoobYT', 'Copilot-Orchestration-Extension-COE-', 'tasks.json')

# Fetch and sync specific issue
issue = sync._get_issue(42)  # Issue number
sync.sync_issue_to_task(issue)
sync._save_sync_metadata()

print(f"Synced issue #{issue['number']}: {issue['title']}")
EOF

python sync_single_issue.py
```

## Example 8: Troubleshooting

```bash
# Check Python version
python3 --version  # Should be 3.8+

# Test GitHub token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Check rate limit
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit

# Validate script syntax
python3 -m py_compile sync_github.py

# Run with verbose output (add debug prints if needed)
python3 sync_github.py --sync-both 2>&1 | tee sync.log
```

## Example 9: Backup Before Sync

```bash
# Always backup before major syncs
cd _ZENTASKS

# Backup tasks
cp tasks.json tasks.json.backup.$(date +%Y%m%d-%H%M%S)
cp -r TASK-*.md task-backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true

# Run sync
python sync_github.py --sync-both

# If something goes wrong, restore:
# cp tasks.json.backup.YYYYMMDD-HHMMSS tasks.json
```

## Example 10: GitHub Actions Manual Trigger

```bash
# Trigger the workflow via GitHub CLI
gh workflow run sync-zen-tasks.yml

# Or via web:
# 1. Go to https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/actions
# 2. Click "Sync Zen Tasks with GitHub Issues"
# 3. Click "Run workflow"
# 4. Select branch and click "Run workflow"

# Check workflow status
gh run list --workflow=sync-zen-tasks.yml

# View workflow logs
gh run view --log
```

## Common Workflows

### Daily Development Workflow

```bash
# Morning: Pull latest issues from GitHub
cd _ZENTASKS
python sync_github.py --sync-from-github

# Work on tasks...

# Evening: Push completed tasks to GitHub
python sync_github.py --sync-to-github
```

### Project Initialization

```bash
# Set up sync for a new project
cd _ZENTASKS
cp .env.example .env
# Edit .env with your token

# Import all existing GitHub issues
python sync_github.py --sync-from-github

# Review and organize
ls -la TASK-*.md
```

### Weekly Maintenance

```bash
# Full two-way sync to ensure consistency
cd _ZENTASKS
python sync_github.py --sync-both

# Review sync metadata
cat sync_metadata.json | jq '.'

# Clean up any orphaned files (optional)
# This would require manual review
```
