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
3. **Atomic Compare-and-Swap**: Backend compares `expectedVersion` with current `version` in a single atomic query
   - **Match**: Update succeeds, version increments
   - **Mismatch**: Returns HTTP 409 Conflict
4. **Retry on Conflict**: Client automatically retries with latest version

### Backend Implementation (PHP)

```php
// McpController.php - reportTaskStatus
// Atomic compare-and-swap prevents race conditions
if (isset($validated['expectedVersion'])) {
    $affected = Task::where('id', $validated['taskId'])
        ->where('version', $validated['expectedVersion'])
        ->update([
            'status' => $newStatus,
            'version' => DB::raw('version + 1'),
        ]);

    if ($affected === 0) {
        // Re-fetch to distinguish "not found" from "version conflict"
        $task = Task::find($validated['taskId']);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Task not found'], 404);
        }
        
        return response()->json([
            'success' => false,
            'error' => 'version_conflict',
            'currentVersion' => $task->version,
            'expectedVersion' => $validated['expectedVersion'],
        ], 409);
    }
}
```

### Client Implementation (TypeScript)

```typescript
// mcpClient.ts - reportTaskStatus with retry
async reportTaskStatus(data: {
  taskId: string;
  status: string;
  expectedVersion?: number;
  // ... other fields
}, maxAttempts: number = 3): Promise<any> {
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    try {
      return await this.fetchWithRetry(/* ... */);
    } catch (error: any) {
      // Handle 409 version conflict - strict check for version_conflict error
      if (error.status === 409 && error.error === 'version_conflict') {
        attempt++;
        
        if (attempt >= maxAttempts) {
          throw new Error(`Task status update failed after ${maxAttempts} attempts`);
        }
        
        // Exponential backoff: 1s, 2s, 4s (formula: 2^(attempt-1))
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Fetch latest task version using getTaskById
        const taskData = await this.getTaskById(data.taskId);
        if (taskData?.task?.version !== undefined) {
          data.expectedVersion = taskData.task.version;
        } else {
          throw new Error('Failed to fetch latest version: unexpected response format');
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
3. Fetch latest task version using `getTaskById`
4. Retry update with new version
5. Repeat up to `maxAttempts` times (default: 3)

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
  "currentVersion": 5,
  "expectedVersion": 3,
  "currentStatus": "blocked"
}
```

**Client Behavior:**
- Automatically retries with exponential backoff
- Fetches latest task state before retry
- Throws error after max attempts exceeded

### Other Errors

Non-conflict errors (404, 422, 500) are **not retried** and thrown immediately.

## Retry Strategy

| Attempt | Backoff Delay | Total Wait Time |
|---------|---------------|-----------------|
| 1       | 0ms           | 0ms             |
| 2       | 1000ms        | 1000ms          |
| 3       | 2000ms        | 3000ms          |

**Default max attempts:** 3 (1 initial + 2 retries)  
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
- Max attempt limit enforcement
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
- **Retry exhaustion**: Failed updates after max attempts

High conflict rates may indicate:
- Too many agents working on same task
- Agent coordination issues
- Need for task decomposition

## Best Practices

1. **Always include `expectedVersion`** when updating task status
2. **Don't manually set version** - let the backend increment it atomically
3. **Monitor conflict rates** to detect coordination issues
4. **Configure `maxAttempts`** based on agent workload:
   - High concurrency → more attempts
   - Low concurrency → fewer attempts (faster failure)
5. **Log retry attempts** for debugging and monitoring

## FAQ

### Q: What happens if two agents update at exactly the same time?

**A:** One agent's update succeeds (first to reach database). The other receives a 409 Conflict and automatically retries with the latest version.

### Q: Can I disable version checking?

**A:** Yes, omit `expectedVersion` from the request. However, this is **not recommended** in multi-agent scenarios as it allows race conditions.

### Q: What if retry fails after max attempts?

**A:** An error is thrown with message: `"Task status update failed after N attempts due to version conflicts."` The agent should log this and potentially escalate to human review.

### Q: Does version checking affect performance?

**A:** Minimal impact. The version comparison happens in a single atomic database query. The retry logic only activates on conflicts, which should be rare in well-coordinated systems.

### Q: Can I increase max attempts?

**A:** Yes, pass `maxAttempts` parameter:
```typescript
await mcpClient.reportTaskStatus(data, 5); // 5 attempts instead of 3
```

## Related Documentation

- [Implementation Summary](../OPTIMISTIC-LOCKING-IMPLEMENTATION-SUMMARY.md)
- [MCP API Contracts](MCP-API-CONTRACTS.md)
- [Task Orchestration](PROJECT-RUNBOOK.md)
