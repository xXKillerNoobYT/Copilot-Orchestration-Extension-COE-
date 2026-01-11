# Zen Tasks GitHub Sync

Simple trigger script for syncing Zen tasks with GitHub issues.

## Quick Start

```bash
# Two-way sync (recommended)
python sync_trigger.py

# Or use Laravel artisan directly
php artisan zentasks:sync-github
```

## Options

```bash
# Sync tasks TO GitHub only
python sync_trigger.py --to-github
php artisan zentasks:sync-github --direction=to-github

# Sync issues FROM GitHub only
python sync_trigger.py --from-github
php artisan zentasks:sync-github --direction=from-github

# Custom repository
python sync_trigger.py --owner username --repo repository
php artisan zentasks:sync-github --owner=username --repo=repository
```

## Configuration

Set `GITHUB_TOKEN` in your `.env` file:

```env
GITHUB_TOKEN=your_token_here
GITHUB_OWNER=xXKillerNoobYT
GITHUB_REPO=Copilot-Orchestration-Extension-COE-
```

## What It Does

- **Tasks → GitHub**: Creates/updates GitHub issues from task markdown files
- **GitHub → Tasks**: Creates/updates task markdown files from GitHub issues
- **Two-way**: Syncs both directions

## Implementation

The sync logic is in the Laravel application:
- `app/Services/GitHubZenTasksSyncService.php` - Main sync service
- `app/Services/ZenTasksFileService.php` - File I/O operations
- `app/Console/Commands/SyncZenTasksWithGitHub.php` - Artisan command

See `Docs/ZEN-TASKS-GITHUB-SYNC.md` for full documentation.
