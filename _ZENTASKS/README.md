# Zen Tasks ↔ GitHub Issues Sync

This directory contains a Python script for bidirectional synchronization between Zen Tasks (in `tasks.json`) and GitHub Issues.

## Features

- **Two-way sync**: Sync tasks to GitHub issues AND GitHub issues to tasks
- **Task markdown files**: Reads from and creates detailed task .MD files with YAML frontmatter
- **Automatic mapping**: Maps task statuses, priorities, and types to GitHub labels and states
- **Smart updates**: Only creates new issues/tasks when needed; updates existing ones
- **Metadata tracking**: Maintains sync state to prevent duplicates

## Task File Structure

Each task has two representations:

1. **tasks.json**: Lightweight task metadata for quick access
2. **TASK-{id}.md**: Detailed task file with YAML frontmatter and full description

Example task file (`TASK-abc123-xyz.md`):
```markdown
---
id: TASK-abc123-xyz
title: Implement user authentication
type: feature
priority: high
status: in_progress
dependencies: []
assignees: [coder, tester]
labels: [backend, auth]
estimate: "4h"
github_issue: 42
github_url: https://github.com/owner/repo/issues/42
---

## Goal
Implement secure user authentication system

## Description
Build a complete authentication flow...

## Acceptance Criteria
- [ ] Users can register
- [ ] Users can login
- [ ] Password reset works

## Technical Approach
Use JWT tokens for session management...
```

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Or install directly:
```bash
pip install requests
```

### 2. Configure GitHub Token

Create a GitHub Personal Access Token with the following permissions:
- `repo` - Full control of private repositories
- `public_repo` - Access to public repositories

Set the token as an environment variable:

```bash
export GITHUB_TOKEN="your_github_token_here"
```

Or create a `.env` file in the `_ZENTASKS` directory:
```
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=xXKillerNoobYT
GITHUB_REPO=Copilot-Orchestration-Extension-COE-
```

## Usage

### Two-Way Sync (Default)

Syncs both directions: GitHub issues → tasks, then tasks → GitHub issues

```bash
python sync_github.py
```

Or explicitly:
```bash
python sync_github.py --sync-both
```

Or use the quick sync script:
```bash
./quick_sync.sh
```

### Sync Tasks to GitHub Only

Creates/updates GitHub issues from tasks:

```bash
python sync_github.py --sync-to-github
```

### Sync from GitHub to Tasks Only

Creates/updates tasks from GitHub issues:

```bash
python sync_github.py --sync-from-github
```

### Custom Configuration

Override defaults with command-line arguments:

```bash
python sync_github.py --token YOUR_TOKEN --owner OWNER --repo REPO --tasks-file /path/to/tasks.json
```

## How It Works

### Task → Issue Sync

1. Reads all tasks from `tasks.json`
2. For each task:
   - Loads the detailed task markdown file (`TASK-{id}.md`) if it exists
   - Checks if a GitHub issue already exists (via `sync_metadata.json`)
   - Creates a new issue OR updates existing issue
   - Uses markdown content as issue body, preserving all sections
   - Maps task fields to issue fields:
     - **Title** → Issue title
     - **Markdown body** → Issue body (without YAML frontmatter)
     - **Status** → Issue state (open/closed)
     - **Type** → Label (bug, enhancement, etc.)
     - **Priority** → Label (priority:high, etc.)
3. Saves mapping to `sync_metadata.json`

### Issue → Task Sync

1. Fetches all issues from GitHub
2. For each issue:
   - Checks if a task already exists (by parsing issue body or metadata)
   - Creates a new task OR updates existing task
   - **Creates a task markdown file** with proper YAML frontmatter and sections
   - Maps issue fields to task fields:
     - **Title** → Task title
     - **Body** → Task description and sections
     - **State** → Task status
     - **Labels** → Task type and priority
     - **Assignee** → Sets status to `in_progress`
3. Updates `tasks.json`
4. Saves mapping to `sync_metadata.json`

### Task Markdown File Creation

When syncing an issue to a task, the script automatically creates a properly formatted task markdown file:

- **YAML frontmatter** with task metadata (id, type, priority, status, etc.)
- **GitHub tracking** fields (github_issue, github_url)
- **Structured sections**: Goal, Description, Acceptance Criteria, Technical Approach, Dependencies & Risks, AI Prompt
- **Preserved content** from the GitHub issue body

## Status Mapping

### Zen Task Status → GitHub Issue State

| Zen Task Status | GitHub State |
|----------------|--------------|
| pending        | open         |
| approved       | open         |
| in-progress    | open         |
| testing        | open         |
| review         | open         |
| blocked        | open         |
| failed         | open         |
| completed      | closed       |
| done           | closed       |
| cancelled      | closed       |

### GitHub Issue State → Zen Task Status

| GitHub State | Assignee? | Zen Task Status |
|--------------|-----------|-----------------|
| open         | No        | pending         |
| open         | Yes       | in_progress     |
| closed       | -         | completed       |

## Label Mapping

### Task Type → GitHub Label

| Task Type     | GitHub Label  |
|---------------|---------------|
| feature       | enhancement   |
| bug           | bug           |
| refactor      | refactor      |
| maintenance   | maintenance   |
| architecture  | architecture  |
| testing       | testing       |
| documentation | documentation |

### Priority Mapping

All tasks get a `priority:{level}` label:
- `priority:critical`
- `priority:high`
- `priority:medium`
- `priority:low`

## Sync Metadata

The script maintains a `sync_metadata.json` file to track mappings:

```json
{
  "task_to_issue": {
    "TASK-abc123-xyz": 42,
    "TASK-def456-uvw": 43
  },
  "issue_to_task": {
    "42": "TASK-abc123-xyz",
    "43": "TASK-def456-uvw"
  }
}
```

This prevents duplicate issues/tasks and enables efficient updates.

## Error Handling

- **Missing token**: Script exits with error message
- **Invalid tasks.json**: Script exits with error message
- **GitHub API errors**: Logged but sync continues for remaining items
- **Network errors**: Detailed error messages with response data

## Automation

### GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow (`.github/workflows/sync-zen-tasks.yml`) that automatically:
- Runs every 6 hours
- Syncs when tasks are updated
- Can be triggered manually

The workflow is already configured and will work out of the box using the repository's `GITHUB_TOKEN`.

To trigger manually:
1. Go to Actions tab in GitHub
2. Select "Sync Zen Tasks with GitHub Issues"
3. Click "Run workflow"

### GitHub Actions Example (Custom)

Create `.github/workflows/sync-tasks.yml` for custom scheduling:

```yaml
name: Sync Zen Tasks with GitHub Issues

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          cd _ZENTASKS
          pip install -r requirements.txt
      
      - name: Sync tasks
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd _ZENTASKS
          python sync_github.py --sync-both
      
      - name: Commit changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add _ZENTASKS/
          git diff --quiet && git diff --staged --quiet || git commit -m "Auto-sync: Update tasks from GitHub issues"
          git push
```

### Cron Job Example

Run sync every hour:

```bash
# Add to crontab (crontab -e)
0 * * * * cd /path/to/repo/_ZENTASKS && GITHUB_TOKEN=xxx python sync_github.py --sync-both
```

## Troubleshooting

### "requests library not found"

Install the requests library:
```bash
pip install requests
```

### "GitHub token not provided"

Set the `GITHUB_TOKEN` environment variable:
```bash
export GITHUB_TOKEN="your_token_here"
```

### "Tasks file not found"

Ensure you're running the script from the `_ZENTASKS` directory, or provide the full path:
```bash
python sync_github.py --tasks-file /full/path/to/_ZENTASKS/tasks.json
```

### Rate Limiting

GitHub API has rate limits (5000 requests/hour for authenticated requests). The script uses pagination and caching where possible. If you hit rate limits, wait an hour or use a different token.

## Security

- **Never commit your GitHub token** to the repository
- Use environment variables or a `.env` file (add to `.gitignore`)
- Use a token with minimal required permissions
- Rotate tokens regularly

## Contributing

To improve the sync script:

1. Test changes with a small number of tasks/issues first
2. Ensure backward compatibility with existing `sync_metadata.json`
3. Update this README with new features
4. Handle errors gracefully with informative messages

## License

Part of the Copilot Orchestration Extension (COE) project.
