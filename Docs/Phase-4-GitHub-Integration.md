# Phase 4: GitHub Integration

## Overview

Phase 4 implements comprehensive GitHub integration with bidirectional synchronization between GitHub issues and COE tasks. This enables teams to manage work in GitHub while leveraging COE's advanced task orchestration capabilities.

## Architecture

### Components

1. **GitHubApiClient** - Low-level REST API client
2. **GitHubSyncService** - Bidirectional sync orchestration
3. **GitHubWebhookService** - Real-time event processing
4. **GitHubController** - API endpoints for GitHub operations
5. **GithubIssue Model** - Sync relationship tracking
6. **Events** - TaskSyncedFromGitHub, TaskSyncedToGitHub

### Data Flow

```
GitHub API ↔ GitHubApiClient (caching) ↔ GitHubSyncService ↔ Tasks/Projects
                                             ↕
GitHub Webhooks → GitHubWebhookService → GitHubSyncService → Tasks
```

## Features

### 1. Issue Synchronization

#### GitHub → COE

- Sync individual issues to tasks
- Bulk repository synchronization
- Automatic project creation/association
- Label-based type and priority mapping
- Assignee-based status mapping

#### COE → GitHub

- Create GitHub issues from tasks
- Update existing issues
- Sync task status to issue state
- Apply type/priority labels
- Format task metadata in issue body

### 2. Real-time Webhook Integration

Supported GitHub events:

- **issues**: opened, reopened, edited, closed, assigned, labeled
- **issue_comment**: created
- **pull_request**: links PRs to tasks
- **push**: syncs tasks from commit messages
- **ping**: webhook health check

### 3. Intelligent Mapping

#### Issue Type Detection

```php
Labels: bug → Task type: bug
Labels: feature, enhancement → Task type: feature
Labels: documentation → Task type: documentation
Title contains "bug" → Task type: bug
Default → Task type: feature
```

#### Priority Detection

```php
Label regex: priority[:\s]*(\w+)
Valid values: critical, high, medium, low
Default: medium
```

#### Status Mapping

```php
GitHub Issue → COE Task:
- closed → completed
- open + assignee → in_progress
- open + no assignee → pending

COE Task → GitHub Issue:
- completed/cancelled → closed
- pending/in_progress → open
```

## Setup

### 1. Environment Configuration

Add to `.env`:

```env
# GitHub API Configuration
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_API_VERSION=2022-11-28
```

### 2. GitHub Token Permissions

Required scopes for Personal Access Token:

- `repo` - Full repository access
- `write:discussion` - Comment management
- `read:org` - Organization access (if applicable)

### 3. Webhook Configuration

1. **In GitHub Repository Settings:**
   - Navigate to Settings → Webhooks → Add webhook
   - Payload URL: `https://your-domain.com/api/github/webhook`
   - Content type: `application/json`
   - Secret: Same as `GITHUB_WEBHOOK_SECRET`
   - Events: Select individual events:
     - Issues
     - Issue comments
     - Pull requests
     - Pushes

2. **SSL Verification:**
   - Enable SSL verification in production
   - Ensure valid SSL certificate

### 4. Database Migration

Run migrations to create github_issues table:

```bash
php artisan migrate
```

The migration creates:

- task_id (foreign key to tasks)
- project_id (foreign key to projects)
- github_issue_number
- github_issue_id
- repository_owner
- repository_name
- sync metadata fields

## API Reference

### Sync Operations

#### Sync GitHub Issue to Task

```http
POST /api/v1/github/sync/issue
Content-Type: application/json

{
  "owner": "organization",
  "repo": "repository",
  "issue_number": 123
}
```

**Response:**

```json
{
  "success": true,
  "message": "Issue synced successfully",
  "data": {
    "id": "uuid",
    "title": "Task title",
    "status": "pending",
    "github_issue": {
      "github_issue_id": 123,
      "issue_url": "https://github.com/org/repo/issues/123"
    }
  }
}
```

#### Sync Task to GitHub

```http
POST /api/v1/tasks/{taskId}/sync-to-github
Content-Type: application/json

{
  "owner": "organization",
  "repo": "repository"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task synced to GitHub successfully",
  "data": {
    "task": {
      "id": "uuid",
      "title": "Task title"
    },
    "github_issue": {
      "number": 123,
      "html_url": "https://github.com/org/repo/issues/123"
    }
  }
}
```

#### Sync Entire Repository

```http
POST /api/v1/github/sync/repository
Content-Type: application/json

{
  "owner": "organization",
  "repo": "repository",
  "project_id": "optional-project-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Repository synced successfully",
  "data": {
    "tasks": [...],
    "count": 42
  }
}
```

### GitHub Data Access

#### List Issues

```http
GET /api/v1/github/issues/{owner}/{repo}?state=open&per_page=100&page=1
```

#### Get Single Issue

```http
GET /api/v1/github/issues/{owner}/{repo}/{number}
```

### Comment Operations

#### Sync Comments

```http
POST /api/v1/tasks/{taskId}/sync-comments
```

Fetches all GitHub comments and stores in task metadata.

#### Post Update to GitHub

```http
POST /api/v1/tasks/{taskId}/post-update
Content-Type: application/json

{
  "update": "Task progress update message"
}
```

Posts the update as a comment on the linked GitHub issue.

### Sync Status

#### Check Sync Status

```http
GET /api/v1/tasks/{taskId}/github-sync-status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "linked": true,
    "github_issue_id": 123,
    "issue_url": "https://github.com/org/repo/issues/123",
    "last_synced_at": "2024-01-15T10:30:00Z",
    "needs_sync": false
  }
}
```

### Utilities

#### Parse Repository URL

```http
POST /api/v1/github/parse-repo-url
Content-Type: application/json

{
  "url": "https://github.com/owner/repo"
}
```

Supported formats:

- `https://github.com/owner/repo`
- `github.com/owner/repo`
- `owner/repo`

## Webhook Endpoint

```http
POST /api/github/webhook
X-GitHub-Event: issues
X-Hub-Signature-256: sha256=...

{
  "action": "opened",
  "issue": {...},
  "repository": {...}
}
```

The webhook endpoint:

1. Verifies HMAC signature
2. Routes event to appropriate handler
3. Syncs data bidirectionally
4. Returns success/error response

**Note:** This endpoint does NOT require authentication but validates webhook signature.

## Caching Strategy

### Issue Data (5 minutes TTL)

```
Cache key: github:issue:{owner}:{repo}:{number}
Invalidation: On create/update operations
```

### Comment Data (5 minutes TTL)

```
Cache key: github:comments:{owner}:{repo}:{number}
Invalidation: On comment creation
```

### Repository Data (1 hour TTL)

```
Cache key: github:repo:{owner}:{repo}
Invalidation: Rarely changed
```

### Label Data (1 hour TTL)

```
Cache key: github:labels:{owner}:{repo}
Invalidation: On label operations
```

## Events

### TaskSyncedFromGitHub

Dispatched when a GitHub issue is synced to a task.

**Channels:**

- `tasks.{taskId}` (private)
- `projects.{projectId}` (private)

**Payload:**

```json
{
  "task_id": "uuid",
  "task_title": "Task title",
  "task_status": "pending",
  "github_issue_number": 123,
  "github_issue_url": "https://github.com/org/repo/issues/123",
  "sync_type": "create|update",
  "synced_at": "2024-01-15T10:30:00Z"
}
```

### TaskSyncedToGitHub

Dispatched when a task is synced to GitHub.

**Channels:**

- `tasks.{taskId}` (private)
- `projects.{projectId}` (private)

**Payload:**

```json
{
  "task_id": "uuid",
  "task_title": "Task title",
  "task_status": "in_progress",
  "github_issue_number": 123,
  "github_issue_url": "https://github.com/org/repo/issues/123",
  "is_new_issue": true,
  "synced_at": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### GitHubApiException

Thrown when GitHub API requests fail.

**Properties:**

- `statusCode` - HTTP status code
- `githubError` - GitHub error response

**Common causes:**

- Invalid token
- Rate limiting
- Repository access denied
- Issue not found

### GitHubSyncException

Thrown when synchronization fails.

**Properties:**

- `syncType` - Type of sync operation
- `syncContext` - Contextual data

**Common causes:**

- Data validation failures
- Missing required fields
- Conflicting states

### GitHubWebhookException

Thrown when webhook processing fails.

**Properties:**

- `event` - Webhook event type
- `payload` - Event payload (logged, not exposed)

**Common causes:**

- Invalid signature
- Unsupported event type
- Payload parsing errors

## Usage Examples

### Example 1: Sync Single Issue

```php
use App\Services\GitHubSyncService;

$syncService = app(GitHubSyncService::class);

// Sync issue #123 from octocat/Hello-World to a task
$task = $syncService->syncIssueToTask('octocat', 'Hello-World', 123);

echo "Synced to task: {$task->id}";
```

### Example 2: Sync Entire Repository

```php
use App\Services\GitHubSyncService;

$syncService = app(GitHubSyncService::class);

// Sync all issues from repository
$tasks = $syncService->syncRepository('octocat', 'Hello-World', $projectId);

echo "Synced {count($tasks)} issues to tasks";
```

### Example 3: Create GitHub Issue from Task

```php
use App\Services\GitHubSyncService;
use App\Models\Task;

$task = Task::find($taskId);
$syncService = app(GitHubSyncService::class);

// Create or update GitHub issue
$issueData = $syncService->syncTaskToIssue($task, 'octocat', 'Hello-World');

echo "GitHub issue: {$issueData['html_url']}";
```

### Example 4: Listen to Sync Events

```php
use App\Events\TaskSyncedFromGitHub;
use Illuminate\Support\Facades\Event;

Event::listen(TaskSyncedFromGitHub::class, function ($event) {
    \Log::info("Task {$event->task->id} synced from GitHub issue #{$event->issueData['number']}");
    
    // Custom logic here
    // - Send notifications
    // - Update analytics
    // - Trigger workflows
});
```

### Example 5: Manual Webhook Testing

```bash
# Test webhook locally with curl
curl -X POST http://localhost:8000/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"zen": "Design for failure."}'
```

## Best Practices

### 1. Sync Strategy

**One-way vs Two-way:**

- Use one-way sync (GitHub → COE) for read-only integrations
- Use two-way sync when COE is source of truth for some fields
- Establish clear ownership of each field

**Frequency:**

- Webhooks provide real-time updates
- Manual sync for initial setup or recovery
- Periodic full sync to catch missed webhooks

### 2. Conflict Resolution

**Last-write-wins:**

- GitHub updates always win for webhook events
- Manual COE updates can be pushed to GitHub
- Track `last_synced_at` to detect conflicts

**Field-level ownership:**

- GitHub owns: issue number, state, labels, assignees
- COE owns: task status, dependencies, context bundles
- Shared: title, description (with metadata merging)

### 3. Performance

**Caching:**

- Enable Redis for production
- Adjust TTLs based on update frequency
- Use tagged cache for efficient invalidation

**Rate Limiting:**

- GitHub API: 5000 requests/hour (authenticated)
- Implement exponential backoff on errors
- Queue bulk operations

**Webhook Processing:**

- Process in background jobs for heavy operations
- Return quickly from webhook endpoint
- Implement retry logic

### 4. Security

**Token Management:**

- Use Personal Access Tokens for development
- Use GitHub Apps for production (higher rate limits)
- Rotate tokens regularly
- Never commit tokens to version control

**Webhook Verification:**

- Always verify HMAC signature
- Use HTTPS in production
- Keep webhook secret secure
- Monitor for suspicious activity

### 5. Monitoring

**Key Metrics:**

- Sync success/failure rates
- Webhook processing time
- API rate limit usage
- Cache hit rates

**Logging:**

- Log all sync operations
- Include issue/task IDs for traceability
- Monitor error patterns
- Alert on repeated failures

## Testing

### Manual Testing Checklist

- [ ] Sync single issue to task
- [ ] Sync task to GitHub (create new issue)
- [ ] Sync task to GitHub (update existing issue)
- [ ] Bulk sync repository
- [ ] Verify webhook signature
- [ ] Process issues webhook event
- [ ] Process pull_request webhook event
- [ ] Test comment synchronization
- [ ] Verify label mapping
- [ ] Check status mapping
- [ ] Test cache invalidation
- [ ] Verify event broadcasting

### Test GitHub Webhook Locally

Use ngrok to expose local server:

```bash
# Start ngrok
ngrok http 8000

# Use ngrok URL in GitHub webhook settings
https://abc123.ngrok.io/api/github/webhook
```

## Troubleshooting

### Issue: Webhook signature verification fails

**Cause:** Mismatched webhook secret

**Solution:**

1. Check `GITHUB_WEBHOOK_SECRET` in `.env`
2. Verify secret in GitHub webhook settings
3. Ensure raw payload is used for signature verification

### Issue: Tasks not syncing from GitHub

**Cause:** Multiple possible causes

**Solutions:**

1. Check GitHub token permissions
2. Verify repository access
3. Check Laravel logs for errors
4. Test API endpoint directly

### Issue: Rate limit exceeded

**Cause:** Too many API requests

**Solutions:**

1. Enable caching (Redis)
2. Increase cache TTLs
3. Use GitHub App instead of Personal Access Token
4. Implement request throttling

### Issue: Duplicate tasks created

**Cause:** GithubIssue linking not working

**Solutions:**

1. Check database constraints
2. Verify unique index on (project_id, github_issue_number)
3. Check transaction isolation

## Future Enhancements

### Planned Features

1. **Advanced Sync Options**
   - Selective field syncing
   - Custom mapping rules
   - Sync scheduling

2. **Pull Request Integration**
   - Link PRs to tasks automatically
   - Sync PR review status
   - Auto-close tasks on PR merge

3. **GitHub Projects Integration**
   - Sync GitHub Projects boards
   - Map columns to task status
   - Bidirectional project sync

4. **GitHub Actions Integration**
   - Trigger COE workflows from actions
   - Report task status to actions
   - Custom action for COE operations

5. **Multi-Repository Support**
   - Sync multiple repositories to one project
   - Cross-repository dependency tracking
   - Organization-level sync

## Summary

Phase 4 provides production-ready GitHub integration with:

- ✅ Bidirectional synchronization
- ✅ Real-time webhook support
- ✅ Intelligent mapping
- ✅ Comprehensive caching
- ✅ Event broadcasting
- ✅ Error handling
- ✅ Full API coverage

The integration enables seamless workflow between GitHub issue tracking and COE task orchestration, allowing teams to use the best features of both platforms.
