# Zen Tasks GitHub Sync - Enhancement Roadmap

## Overview

This document outlines the planned enhancements for the Zen Tasks ↔ GitHub Issues sync system, prioritized by business value and technical complexity.

---

## Phase 1: Real-Time Sync with Webhooks (Priority: HIGH)

### Goal
Enable instant synchronization when GitHub issues are created or updated, eliminating the need for polling.

### Features
- **Webhook Endpoint**: Laravel route to receive GitHub webhook payloads
- **Event Processing**: Handle issue events (opened, edited, closed, reopened)
- **Security**: HMAC signature verification
- **Queue Processing**: Background job processing for reliability
- **Error Handling**: Retry logic and dead letter queue

### Implementation
```php
// app/Http/Controllers/Api/GitHubWebhookController.php
public function handleWebhook(Request $request)
{
    // 1. Verify webhook signature
    // 2. Parse event payload
    // 3. Dispatch sync job to queue
    // 4. Return 200 OK immediately
}

// app/Jobs/SyncGitHubIssueJob.php
class SyncGitHubIssueJob implements ShouldQueue
{
    public function handle(GitHubZenTasksSyncService $syncService)
    {
        // Sync specific issue
    }
}
```

### Configuration
```env
GITHUB_WEBHOOK_SECRET=your_webhook_secret
QUEUE_CONNECTION=redis  # Use Redis for queue
```

### Testing
- Unit tests for webhook signature verification
- Integration tests for event handling
- Webhook simulation with ngrok or webhook.site

### Estimated Effort: 2-3 days

---

## Phase 2: Metrics Dashboard (Priority: HIGH)

### Goal
Provide visibility into sync operations, performance, and health for monitoring and debugging.

### Features
- **Metrics Collection**: Track all sync operations
- **Dashboard UI**: Real-time status and historical trends
- **Alerting**: Email/Slack notifications for failures
- **API Endpoints**: Export metrics for external tools

### Metrics to Track
- Sync frequency and duration
- Success/failure rates
- Tasks created/updated/failed
- Issues created/updated/failed
- GitHub API rate limit usage
- Average sync latency
- Queue depth and processing time

### Database Schema
```sql
CREATE TABLE sync_metrics (
    id BIGINT PRIMARY KEY,
    sync_direction VARCHAR(20),  -- 'to-github', 'from-github', 'both'
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    tasks_synced INT,
    issues_synced INT,
    errors INT,
    api_calls INT,
    rate_limit_remaining INT,
    metadata JSON
);

CREATE TABLE sync_errors (
    id BIGINT PRIMARY KEY,
    sync_metric_id BIGINT,
    task_id VARCHAR(50),
    issue_number INT,
    error_message TEXT,
    error_trace TEXT,
    occurred_at TIMESTAMP
);
```

### Dashboard Components
- **Overview**: Current status, last sync time, health score
- **Charts**: Sync frequency, success rate, duration trends
- **Errors**: Recent errors with details and stack traces
- **Rate Limits**: GitHub API usage and remaining quota
- **Queue Status**: Background job queue depth and lag

### Implementation
- Laravel controller for metrics API
- Vue.js dashboard component
- Chart.js or ApexCharts for visualization
- WebSocket for real-time updates

### Estimated Effort: 3-4 days

---

## Phase 3: Comment Synchronization (Priority: MEDIUM)

### Goal
Keep discussion threads in sync between GitHub issues and Zen tasks.

### Features
- **Bidirectional Comment Sync**: GitHub comments ↔ Task metadata
- **Author Tracking**: Preserve comment authors
- **Timestamp Sync**: Maintain chronological order
- **@Mention Support**: Link to GitHub users
- **Bot Detection**: Avoid syncing bot comments to prevent loops

### Implementation Strategy
- Store comments in task markdown files or database
- Use GitHub API to fetch/post comments
- Add `github_comments` section to task frontmatter
- Filter comments by author (skip bot comments)

### Database Schema
```sql
CREATE TABLE task_comments (
    id BIGINT PRIMARY KEY,
    task_id VARCHAR(50),
    github_comment_id BIGINT,
    author VARCHAR(100),
    body TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    synced_at TIMESTAMP
);
```

### Estimated Effort: 2-3 days

---

## Phase 4: Conflict Resolution (Priority: MEDIUM)

### Goal
Handle simultaneous updates to tasks and issues gracefully without data loss.

### Features
- **Conflict Detection**: Compare timestamps to detect concurrent edits
- **Resolution Strategies**:
  - **Last-write-wins**: Default, use most recent update
  - **Manual review**: Flag conflicts for human intervention
  - **Field-level merge**: Combine non-conflicting field changes
- **Conflict History**: Audit trail of all conflicts
- **Notifications**: Alert users via GitHub comments

### Conflict Detection Logic
```php
class ConflictResolver
{
    public function detectConflict(array $task, array $issue): bool
    {
        // Compare last_modified timestamps
        // Check sync_metadata.last_synced_at
        // Return true if both modified since last sync
    }

    public function resolve(array $task, array $issue, string $strategy): array
    {
        return match ($strategy) {
            'last-write-wins' => $this->lastWriteWins($task, $issue),
            'manual' => $this->flagForReview($task, $issue),
            'field-merge' => $this->mergeFields($task, $issue),
        };
    }
}
```

### Database Schema
```sql
CREATE TABLE sync_conflicts (
    id BIGINT PRIMARY KEY,
    task_id VARCHAR(50),
    issue_number INT,
    task_data JSON,
    issue_data JSON,
    resolution_strategy VARCHAR(20),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    resolved_data JSON
);
```

### Estimated Effort: 3-4 days

---

## Implementation Timeline

### Month 1: Foundation
- **Week 1-2**: Webhook support (Phase 1)
  - Setup webhook endpoint
  - Implement queue processing
  - Test with real GitHub webhooks

- **Week 3-4**: Metrics dashboard (Phase 2)
  - Create database schema
  - Build metrics collection
  - Develop dashboard UI

### Month 2: Enhanced Features
- **Week 1-2**: Comment synchronization (Phase 3)
  - Implement bidirectional comment sync
  - Add filtering and author tracking
  - Test with complex comment threads

- **Week 3-4**: Conflict resolution (Phase 4)
  - Build conflict detection
  - Implement resolution strategies
  - Add user notifications

### Month 3: Polish & Deployment
- **Week 1**: Testing and bug fixes
- **Week 2**: Documentation updates
- **Week 3**: Performance optimization
- **Week 4**: Production deployment

---

## Success Metrics

### Phase 1 (Webhooks)
- ✅ Average sync latency < 5 seconds
- ✅ 99.9% webhook processing success rate
- ✅ Zero manual sync triggers needed

### Phase 2 (Metrics)
- ✅ Dashboard loads in < 2 seconds
- ✅ Metrics available for 90 days
- ✅ Alert notifications within 1 minute of failure

### Phase 3 (Comments)
- ✅ All comments synced within 30 seconds
- ✅ 100% author attribution accuracy
- ✅ Zero comment duplication

### Phase 4 (Conflicts)
- ✅ 95% conflicts auto-resolved
- ✅ Manual conflicts flagged within 1 minute
- ✅ Zero data loss in conflict scenarios

---

## Technical Debt Considerations

- Add comprehensive error logging
- Implement rate limiting for GitHub API
- Create test fixtures for various scenarios
- Document all configuration options
- Add database indexes for performance
- Implement caching where appropriate

---

## Dependencies

- **Redis**: For queues and caching
- **Laravel Horizon**: Queue monitoring
- **Chart.js/ApexCharts**: Dashboard visualizations
- **Laravel Echo**: Real-time dashboard updates
- **PHPUnit**: Unit and integration testing

---

## Next Steps

1. Review and approve roadmap
2. Set up development environment with Redis
3. Create feature branches for each phase
4. Begin Phase 1 implementation
5. Schedule regular progress reviews

---

**Last Updated**: 2026-01-11  
**Status**: Planning Phase  
**Owner**: Development Team
