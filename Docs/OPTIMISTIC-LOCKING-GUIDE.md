# Optimistic Locking for Task Status Updates

## Overview

To prevent race conditions when multiple agents (Planner, Coder, Tester) update the same task concurrently, we've implemented optimistic locking using a version field on tasks.

## How It Works

### Version Field

Each task has a `version` field (unsigned integer, default 0) that increments on every status update.

```php
// Database schema
$table->unsignedInteger('version')->default(0);
```

### Update Flow

1. **Fetch Task**: Agent retrieves task from `GET /mcp/nextTask`, which includes the current `version`
2. **Update with Version**: Agent submits status update with `expectedVersion` parameter
3. **Compare-and-Swap**: Backend compares `expectedVersion` with current `version`
   - **Match**: Update succeeds, version increments
   - **Mismatch**: Returns HTTP 409 Conflict
4. **Retry on Conflict**: Client automatically retries with latest version

### Backend Implementation (PHP)

```php
// McpController.php - reportTaskStatus
$task = Task::findOrFail($validated['taskId']);

// Optimistic locking check
if (isset($validated['expectedVersion'])) {
    if ($task->version !== $validated['expectedVersion']) {
        return response()->json([
            'success' => false,
            'error' => 'version_conflict',
            'message' => 'Task was modified by another agent. Please retry with the latest version.',
            'currentVersion' => $task->version,
            'expectedVersion' => $validated['expectedVersion'],
            'currentStatus' => $task->status,
        ], 409);
    }
}

// Update with version increment
$task->update([
    'status' => $newStatus,
    'version' => $task->version + 1,
]);
```

### Client Implementation (TypeScript)

```typescript
// mcpClient.ts - reportTaskStatus with retry
async reportTaskStatus(data: {
  taskId: string;
  status: string;
  expectedVersion?: number;
  // ... other fields
}, maxRetries: number = 3): Promise<any> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await this.fetchWithRetry(/* ... */);
    } catch (error: any) {
      // Handle 409 version conflict
      if (error.status === 409 && error.error === 'version_conflict') {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw new Error(`Task status update failed after ${maxRetries} attempts`);
        }
        
        // Exponential backoff: 1s, 2s, 4s (capped at 5s)
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Fetch latest task version
        const taskData = await this.getNextTask();
        if (taskData?.task?.taskId === data.taskId) {
          data.expectedVersion = taskData.task.version;
        }
      } else {
        throw error; // Non-conflict errors thrown immediately
      }
    }
  }
}
```

## Usage Guide for Agents

### Step 1: Get Task with Version

```typescript
const response = await mcpClient.getNextTask();
const task = response.task;

console.log(`Task ID: ${task.taskId}, Version: ${task.version}`);
```

### Step 2: Update Status with Version

```typescript
await mcpClient.reportTaskStatus({
  taskId: task.taskId,
  status: 'in-progress',
  expectedVersion: task.version, // Include version from step 1
  progressPercent: 50,
});
```

### Step 3: Client Handles Conflicts Automatically

The client will:
1. Detect 409 Conflict response
2. Wait with exponential backoff (1s → 2s → 4s)
3. Fetch latest task version
4. Retry update with new version
5. Repeat up to `maxRetries` times (default: 3)

### Backward Compatibility

The `expectedVersion` parameter is **optional**. Omitting it skips version checking:

```typescript
// Works without version check (not recommended for concurrent scenarios)
await mcpClient.reportTaskStatus({
  taskId: task.taskId,
  status: 'done',
  // No expectedVersion
});
```

## Error Handling

### Version Conflict (409)

**Response Body:**
```json
{
  "success": false,
  "error": "version_conflict",
  "message": "Task was modified by another agent. Please retry with the latest version.",
  "currentVersion": 3,
  "expectedVersion": 2,
  "currentStatus": "in_progress"
}
```

**Client Behavior:**
- Automatically retries with exponential backoff
- Fetches latest task state before retry
- Throws error after max retries exceeded

### Other Errors

Non-conflict errors (404, 422, 500) are **not retried** and thrown immediately.

## Retry Strategy

| Attempt | Backoff Delay | Total Wait Time |
|---------|---------------|-----------------|
| 1       | 0ms           | 0ms             |
| 2       | 1000ms        | 1000ms          |
| 3       | 2000ms        | 3000ms          |
| 4       | 4000ms (capped at 5000ms) | 7000ms |

**Default max retries:** 3 attempts  
**Maximum backoff:** 5000ms (5 seconds)

## Testing

### PHP Backend Tests

```bash
php artisan test --filter=McpServerTest
```

Tests cover:
- Version increment on successful update
- 409 rejection with stale version
- Backward compatibility (no version check)
- Concurrent update scenarios

### TypeScript Client Tests

```bash
npm test mcpClient.optimisticLocking.test.ts
```

Tests cover:
- Version inclusion in request payload
- Retry logic with exponential backoff
- Max retry limit enforcement
- Error parsing for version conflicts
- Backward compatibility

## Migration

To apply the version field to existing tasks:

```bash
php artisan migrate
```

This adds the `version` column with default value 0 to all existing tasks.

## Monitoring

### Detecting Conflicts

Check logs for version conflict errors:

```
[MCP] Task status update rejected: version_conflict
  taskId: abc-123
  expectedVersion: 2
  currentVersion: 3
```

### Metrics to Monitor

- **Conflict rate**: 409 responses / total status updates
- **Retry success rate**: Successful retries / total conflicts
- **Retry exhaustion**: Failed updates after max retries

High conflict rates may indicate:
- Too many agents working on same task
- Agent coordination issues
- Need for task decomposition

## Best Practices

1. **Always include `expectedVersion`** when updating task status
2. **Don't manually set version** - let the backend increment it
3. **Monitor conflict rates** to detect coordination issues
4. **Configure `maxRetries`** based on agent workload:
   - High concurrency → more retries
   - Low concurrency → fewer retries (faster failure)
5. **Log retry attempts** for debugging and monitoring

## FAQ

### Q: What happens if two agents update at exactly the same time?

**A:** One agent's update succeeds (first to reach database). The other receives a 409 Conflict and automatically retries with the latest version.

### Q: Can I disable version checking?

**A:** Yes, omit `expectedVersion` from the request. However, this is **not recommended** in multi-agent scenarios as it allows race conditions.

### Q: What if retry fails after max attempts?

**A:** An error is thrown with message: `"Task status update failed after N attempts due to version conflicts."` The agent should log this and potentially escalate to human review.

### Q: Does version checking affect performance?

**A:** Minimal impact. The version comparison is a simple integer check before the database update. The retry logic only activates on conflicts, which should be rare in well-coordinated systems.

### Q: Can I increase max retries?

**A:** Yes, pass `maxRetries` parameter:
```typescript
await mcpClient.reportTaskStatus(data, 5); // 5 retries instead of 3
```

## Related Documentation

- [MCP API Contracts](../Docs/MCP-API-CONTRACTS.md)
- [Task Orchestration](../Docs/PROJECT-RUNBOOK.md)
- [Error Handling](../vscode-extension/src/utils/errorHandler.ts)
