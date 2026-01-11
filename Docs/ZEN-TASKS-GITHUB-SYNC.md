# Zen Tasks ↔ GitHub Issues Two-Way Sync

## Overview

The Zen Tasks to GitHub Issues sync system provides bidirectional synchronization between the internal task management system (`_ZENTASKS/tasks.json`) and GitHub Issues. This enables seamless workflow integration where tasks can be managed in either system and automatically reflected in the other.

## Architecture

### Components

1. **sync_github.py**: Python script that handles all synchronization logic
2. **tasks.json**: Source of truth for internal task metadata
3. **TASK-{id}.md files**: Detailed task files with YAML frontmatter and full descriptions
4. **sync_metadata.json**: Maintains mappings between tasks and issues
5. **GitHub API**: Interface for creating, updating, and reading issues

### Sync Flow

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│  tasks.json     │◄────────│  sync_github.py  │────────►│ GitHub Issues  │
│  (Zen Tasks)    │         │   (Sync Engine)  │         │                │
└─────────────────┘         └──────────────────┘         └────────────────┘
        ▲                            │                            │
        │                            ▼                            ▼
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│ TASK-*.md files │         │ sync_metadata.json│         │ Issue Body +   │
│ (Full details)  │         │  (Task↔Issue Map) │         │ Labels/State   │
└─────────────────┘         └──────────────────┘         └────────────────┘
```

## Features

### 1. Bidirectional Synchronization

- **Tasks → Issues**: Create/update GitHub issues from tasks
- **Issues → Tasks**: Create/update tasks from GitHub issues
- **Two-Way Sync**: Combine both directions for full synchronization

### 2. Intelligent Mapping

#### Task File Structure

Each task consists of:
- **tasks.json entry**: Lightweight metadata for quick access
- **TASK-{id}.md file**: Detailed task with YAML frontmatter containing:
  - Task metadata (id, type, priority, status, dependencies)
  - GitHub tracking (github_issue, github_url)
  - Structured sections (Goal, Description, Acceptance Criteria, Technical Approach, AI Prompt)

When syncing TO GitHub, the script reads the markdown file and uses its content as the issue body.
When syncing FROM GitHub, the script creates a properly formatted markdown file with all required sections.

#### Status Mapping

**Zen Task Status → GitHub State**
- `pending`, `approved`, `in-progress`, `testing`, `review`, `blocked`, `failed` → `open`
- `completed`, `done`, `cancelled` → `closed`

**GitHub State → Zen Task Status**
- `open` (unassigned) → `pending`
- `open` (assigned) → `in_progress`
- `closed` → `completed`

#### Type Mapping

| Task Type     | GitHub Label  |
|---------------|---------------|
| feature       | enhancement   |
| bug           | bug           |
| refactor      | refactor      |
| maintenance   | maintenance   |
| architecture  | architecture  |
| testing       | testing       |
| documentation | documentation |

#### Priority Labels

All tasks receive a priority label: `priority:critical`, `priority:high`, `priority:medium`, or `priority:low`

### 3. Metadata Tracking

The sync system maintains a `sync_metadata.json` file that tracks:
- Task ID → GitHub Issue Number mappings
- GitHub Issue Number → Task ID mappings

This prevents duplicate issues/tasks and enables efficient updates.

### 4. Smart Updates

- **Existing Detection**: Checks if task/issue already exists before creating
- **Selective Updates**: Only updates changed fields
- **Metadata Preservation**: Maintains task IDs in issue bodies for tracking

## Usage

### Prerequisites

1. **Python 3.8+** installed
2. **requests library**: Install with `pip install -r _ZENTASKS/requirements.txt`
3. **GitHub Personal Access Token** with `repo` scope

### Configuration

Set environment variables:

```bash
export GITHUB_TOKEN="your_github_token_here"
export GITHUB_OWNER="xXKillerNoobYT"  # Optional, defaults to this
export GITHUB_REPO="Copilot-Orchestration-Extension-COE-"  # Optional
```

Or create `_ZENTASKS/.env` file:

```env
GITHUB_TOKEN=your_token_here
GITHUB_OWNER=xXKillerNoobYT
GITHUB_REPO=Copilot-Orchestration-Extension-COE-
```

### Running the Sync

#### Two-Way Sync (Recommended)

```bash
cd _ZENTASKS
python sync_github.py
```

This performs:
1. Sync GitHub issues → Zen tasks (import new issues)
2. Sync Zen tasks → GitHub issues (export task updates)

#### One-Way Sync Options

**Export tasks to GitHub only:**
```bash
python sync_github.py --sync-to-github
```

**Import issues from GitHub only:**
```bash
python sync_github.py --sync-from-github
```

### Example Output

```
=== Two-Way Sync: Zen Tasks <-> GitHub Issues ===

=== Syncing GitHub Issues to Tasks ===

  Creating new task from issue #42
  Updating task TASK-abc123-xyz from issue #43
  Creating new task from issue #44

Synced 3 issues to tasks

=== Syncing Tasks to GitHub ===

  Updating issue #42 for task TASK-def456-uvw
  Creating new issue for task TASK-ghi789-stu
  Updating issue #43 for task TASK-abc123-xyz

Synced 3 tasks to GitHub

=== Sync Complete ===

Sync completed successfully!
```

## Integration Options

### 1. Manual Sync

Run the script manually when needed:

```bash
cd _ZENTASKS && python sync_github.py
```

### 2. Automated Sync with GitHub Actions

Create `.github/workflows/sync-zen-tasks.yml`:

```yaml
name: Sync Zen Tasks with GitHub Issues

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Allow manual triggering

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
      
      - name: Sync tasks and issues
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd _ZENTASKS
          python sync_github.py --sync-both
      
      - name: Commit updated tasks
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          git add _ZENTASKS/tasks.json _ZENTASKS/sync_metadata.json
          git diff --quiet && git diff --staged --quiet || \
            (git commit -m "chore: auto-sync tasks from GitHub issues [skip ci]" && git push)
```

### 3. Cron Job

For server-side automation:

```bash
# Add to crontab (crontab -e)
0 */6 * * * cd /path/to/repo/_ZENTASKS && GITHUB_TOKEN=xxx python sync_github.py --sync-both
```

### 4. Pre-commit Hook

Sync before every commit:

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd _ZENTASKS
python sync_github.py --sync-both
git add tasks.json sync_metadata.json
```

## Task Format in GitHub Issues

When a task is synced to GitHub, it creates an issue with:

**Title**: Task title

**Body**:
```markdown
[Task description]

## Details
[Task details]

---
### Task Metadata
- **Task ID**: `TASK-xxx-yyy`
- **Priority**: high
- **Status**: in_progress
- **Dependencies**: `TASK-aaa-bbb`, `TASK-ccc-ddd`

### Test Strategy
[Test strategy description]

*Synced from Zen Tasks*
```

**Labels**:
- Type label (e.g., `bug`, `enhancement`)
- Priority label (e.g., `priority:high`)
- Status labels if applicable (e.g., `blocked`)

## Error Handling

### Common Errors

**"GitHub token not provided"**
- **Cause**: Missing `GITHUB_TOKEN` environment variable
- **Solution**: Set the token: `export GITHUB_TOKEN="your_token"`

**"Tasks file not found"**
- **Cause**: Running script from wrong directory
- **Solution**: Run from `_ZENTASKS` directory or specify `--tasks-file`

**"GitHub API error: 401"**
- **Cause**: Invalid or expired token
- **Solution**: Generate a new token at https://github.com/settings/tokens

**"GitHub API error: 403"** (Rate limit)
- **Cause**: Exceeded GitHub API rate limit (5000 requests/hour)
- **Solution**: Wait an hour or use a different token

### Error Recovery

The sync script is designed to be **idempotent** - you can run it multiple times safely. If an error occurs:

1. Fix the underlying issue
2. Re-run the sync script
3. It will resume from where it left off

Failed syncs are logged but don't prevent other items from syncing.

## Security Considerations

### Token Security

- **Never commit** your GitHub token to the repository
- Use environment variables or a `.env` file (add to `.gitignore`)
- Use a token with minimal required permissions (`repo` or `public_repo`)
- Rotate tokens regularly (every 90 days recommended)

### Token Permissions

Required scopes:
- `repo` - For private repositories (full access)
- `public_repo` - For public repositories only (limited access)

### Access Control

The sync script:
- Only accesses the specified repository
- Only creates/updates issues (doesn't delete)
- Doesn't modify code or other repository settings
- Uses read-only access where possible

## Troubleshooting

### Issue: Duplicate tasks created

**Cause**: `sync_metadata.json` was deleted or corrupted

**Solution**:
1. Manually map existing issues to tasks in `sync_metadata.json`
2. Or delete duplicate issues/tasks and re-sync

### Issue: Status not syncing correctly

**Cause**: Custom statuses not in mapping table

**Solution**: Update `STATUS_TO_GITHUB` and `GITHUB_TO_STATUS` in `sync_github.py`

### Issue: Labels not applied correctly

**Cause**: Labels don't exist in repository

**Solution**: 
1. Create missing labels in GitHub repository settings
2. Or update `TYPE_TO_LABEL` mapping in script

### Issue: Sync taking too long

**Cause**: Large number of tasks/issues

**Solution**:
1. Use `--sync-to-github` or `--sync-from-github` for one-way sync
2. Filter tasks/issues before syncing
3. Increase pagination size in script

## Customization

### Adding Custom Mappings

Edit `sync_github.py` and modify:

```python
# Add custom status
STATUS_TO_GITHUB = {
    # ... existing mappings ...
    'custom_status': 'open',
}

# Add custom type
TYPE_TO_LABEL = {
    # ... existing mappings ...
    'custom_type': 'custom-label',
}
```

### Filtering Tasks/Issues

Modify the sync methods to add filters:

```python
def sync_all_tasks_to_github(self):
    tasks_data = self._load_tasks()
    tasks = tasks_data.get('tasks', [])
    
    # Filter: only sync high priority tasks
    tasks = [t for t in tasks if t.get('priority') == 'high']
    
    for task in tasks:
        # ... sync logic ...
```

### Custom Issue Body Format

Override `_format_task_as_issue_body()`:

```python
def _format_task_as_issue_body(self, task: Dict) -> str:
    # Custom formatting
    return f"""
    ## {task['title']}
    
    {task['description']}
    
    **Priority**: {task['priority']}
    """
```

## Monitoring & Observability

### Logging

The script outputs detailed logs:
- ✓ Successful syncs
- ✗ Errors with details
- Summary statistics

### Metrics

Track these metrics:
- Number of tasks synced
- Number of issues synced
- Sync duration
- Error count
- API rate limit usage

### Alerts

Set up monitoring for:
- Sync failures
- Rate limit warnings
- Duplicate detection
- Stale sync metadata

## Best Practices

1. **Run sync regularly**: Use GitHub Actions or cron for automated syncing
2. **Review before merge**: Check sync results before merging to main
3. **Keep metadata**: Don't delete `sync_metadata.json` unless necessary
4. **Use descriptive titles**: Make task/issue titles clear and searchable
5. **Document dependencies**: List task dependencies in both systems
6. **Test in development**: Test sync with a test repository first
7. **Monitor rate limits**: Stay within GitHub API limits
8. **Backup tasks.json**: Keep backups before major syncs

## Limitations

- **No deletion sync**: Deleting a task doesn't delete the issue (and vice versa)
- **No comment sync**: Issue comments aren't synced to tasks (future feature)
- **No attachment sync**: File attachments must be managed separately
- **Rate limits**: Subject to GitHub API rate limits (5000/hour authenticated)
- **Conflict resolution**: Last write wins (no merge conflict handling)

## Future Enhancements

Planned features:
- [ ] Comment synchronization
- [ ] Attachment handling
- [ ] Sub-task/sub-issue support
- [ ] Milestone synchronization
- [ ] Assignee mapping
- [ ] Custom field mapping
- [ ] Webhook-based real-time sync
- [ ] Conflict resolution strategies
- [ ] Bulk operations optimization
- [ ] Rollback capabilities

## Related Documentation

- [Task Format Specification](./task-format-specification.md)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Zen Tasks Workflow](../prompts/zen_tasks_workflow.md)
- [Feature List](./Plan/feature%20list)

## Support

For issues or questions:
1. Check this documentation first
2. Review error messages and troubleshooting section
3. Check GitHub Issues for known problems
4. Open a new issue with detailed error information

## Changelog

### Version 1.0.0 (2026-01-11)

Initial release:
- ✅ Bidirectional sync (tasks ↔ issues)
- ✅ Status, type, and priority mapping
- ✅ Metadata tracking
- ✅ Error handling and recovery
- ✅ Comprehensive documentation
- ✅ Environment variable configuration
