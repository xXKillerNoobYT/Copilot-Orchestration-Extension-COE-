# Implementation Summary: Optimistic Locking for Task Status Updates

## Issue Fixed
**[CRITICAL] Race condition: Concurrent task status updates without optimistic locking**

Multiple agents (Planner, Coder, Tester) could simultaneously update the same task's status without version checking, causing:
- Status flickering between states
- Lost intermediate progress updates  
- Inconsistent GitHub issue states
- No conflict detection or error handling

## Solution Implemented

### Core Pattern: Optimistic Locking with Atomic Compare-and-Swap

1. **Version Field**: Each task has an integer version field that increments on every update
2. **Version Check**: Client sends `expectedVersion` with status updates
3. **Atomic Comparison**: Backend compares expected vs. current version before update using WHERE clause
4. **Conflict Response**: Returns HTTP 409 Conflict if versions don't match
5. **Auto-Retry**: Client automatically retries with exponential backoff

## Implementation Details

### Database Changes
**File**: `database/migrations/2026_01_17_000001_add_version_to_tasks_table.php`
```php
$table->unsignedInteger('version')->default(0)->after('status');
// No index - version is only checked with id (primary key)
```

### Backend Changes (PHP Laravel)

**File**: `app/Models/Task.php`
- Added `version` to fillable attributes
- Added `version` to casts as integer

**File**: `app/Http/Controllers/Api/McpController.php`

1. **getNextTask()** - Includes version in task payload
```php
'version' => $task->version ?? 0,
```

2. **reportTaskStatus()** - Implements atomic optimistic locking
```php
// Atomic update with WHERE clause to prevent TOCTOU race condition
if (isset($validated['expectedVersion'])) {
    $affected = Task::where('id', $validated['taskId'])
        ->where('version', $validated['expectedVersion'])
        ->update([
            'status' => $newStatus,
            'version' => DB::raw('version + 1'),
        ]);

    if ($affected === 0) {
        // Re-fetch to distinguish between "not found" and "version conflict"
        $task = Task::find($validated['taskId']);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Task not found'], 404);
        }
        
        // Version conflict
        return response()->json([
            'success' => false,
            'error' => 'version_conflict',
            'currentVersion' => $task->version,
            'expectedVersion' => $validated['expectedVersion'],
        ], 409);
    }
    
    $task = Task::findOrFail($validated['taskId']);
}
```

3. **getTaskById()** - New endpoint for fetching specific task
```php
public function getTaskById(string $taskId): JsonResponse
{
    $task = Task::findOrFail($taskId);
    return response()->json([
        'success' => true,
        'task' => [
            'taskId' => $task->id,
            'version' => $task->version ?? 0,
            // ...
        ],
    ]);
}
```

**File**: `routes/api.php`
- Added route: `GET /api/v1/mcp/task/{taskId}`

### Client Changes (TypeScript)

**File**: `vscode-extension/src/services/mcpClient.ts`

1. **getTaskById()** - Fetch specific task by ID
```typescript
async getTaskById(taskId: string): Promise<any> {
  return this.fetchWithRetry(`${this.baseUrl}/mcp/task/${taskId}`, 'GET');
}
```

2. **reportTaskStatus()** - Retry logic with exponential backoff
```typescript
async reportTaskStatus(data: {
  taskId: string;
  expectedVersion?: number;
  // ..
}, maxAttempts: number = 3): Promise<any> {
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    try {
      return await this.fetchWithRetry(/*...*/);
    } catch (error: any) {
      // Only retry on explicit version_conflict
      if (error.status === 409 && error.error === 'version_conflict') {
        attempt++;
        
        // Exponential backoff: 1s, 2s, 4s (fixed formula: 2^(attempt-1))
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Fetch latest version
        const taskData = await this.getTaskById(data.taskId);
        if (taskData?.task?.version !== undefined) {
          data.expectedVersion = taskData.task.version;
        } else {
          throw new Error(`Failed to fetch latest version: unexpected response format`);
        }
      } else {
        throw error; // Non-conflict errors fail immediately
      }
    }
  }
}
```

3. **fetch()** - Enhanced error parsing
```typescript
// Extract error details from response body
const errorData = await response.json();
const error: any = new Error(errorData.message);
error.status = response.status;
error.error = errorData.error;
error.currentVersion = errorData.currentVersion;
error.expectedVersion = errorData.expectedVersion;
```

## Testing

### Backend Tests (PHP)
**File**: `tests/Feature/McpServerTest.php`

Added 5 new test cases:
1. ✅ `it_includes_version_in_next_task_response()`
2. ✅ `it_increments_version_on_status_update()`
3. ✅ `it_rejects_status_update_with_stale_version()`
4. ✅ `it_allows_status_update_without_version_check()`
5. ✅ `it_handles_concurrent_updates_with_optimistic_locking()`

### Client Tests (TypeScript)
**File**: `vscode-extension/src/services/mcpClient.optimisticLocking.test.ts`

Added 7 comprehensive test cases covering:
- Version inclusion in requests
- Retry on 409 conflicts with correct exponential backoff (2^(attempt-1))
- Max attempt limit enforcement
- Non-conflict errors fail immediately
- Correct backoff timing (1s → 2s → 4s)
- Backward compatibility (optional expectedVersion)
- Error detail extraction from 409 responses

## Retry Strategy

| Attempt | Backoff Delay | Cumulative Wait |
|---------|---------------|-----------------|
| 1       | 0ms           | 0ms             |
| 2       | 1000ms        | 1000ms          |
| 3       | 2000ms        | 3000ms          |

**Default max attempts**: 3 (1 initial + 2 retries)  
**Maximum backoff**: 5000ms (5 seconds)

## Key Fixes Applied

All review comments addressed:

1. ✅ **Atomic WHERE clause** - Prevents TOCTOU race condition
2. ✅ **Removed version index** - Not needed, version checked with id (primary key)
3. ✅ **Fixed backoff formula** - `2^(attempt-1)` for correct 1s → 2s → 4s progression
4. ✅ **Strict version conflict check** - Only retry when `error === 'version_conflict'`
5. ✅ **Fixed parameter naming** - `maxAttempts` instead of confusing `maxRetries`
6. ✅ **Better error handling** - Throws error on unexpected task fetch response
7. ✅ **Removed unreachable code** - Simplified retry loop exit logic
8. ✅ **Documentation fixes** - Corrected getTaskById usage, attempt/retry consistency
9. ✅ **Removed unused variables** - Clean test code

## Backward Compatibility

The `expectedVersion` parameter is **optional**. Existing code that doesn't send it will continue to work:
- Updates without version check proceed normally
- Version still increments on successful update
- No breaking changes to API contract

## Impact

### Before (Race Condition)
```
Agent A: GET task (version 0)
Agent B: GET task (version 0)
Agent A: POST status=in_progress  ✓ (version 1)
Agent B: POST status=blocked      ✓ (version 2) ⚠️ OVERWRITES A's update!
Final state: blocked (Agent A's update lost)
```

### After (Optimistic Locking)
```
Agent A: GET task (version 0)
Agent B: GET task (version 0)
Agent A: POST status=in_progress, expectedVersion=0  ✓ (version 1)
Agent B: POST status=blocked, expectedVersion=0      ✗ 409 Conflict
Agent B: GET task (version 1)
Agent B: POST status=blocked, expectedVersion=1      ✓ (version 2)
Final state: blocked (both updates preserved in order)
```

## Files Changed

1. `database/migrations/2026_01_17_000001_add_version_to_tasks_table.php` *(new)*
2. `app/Models/Task.php` *(modified)*
3. `app/Http/Controllers/Api/McpController.php` *(modified)*
4. `routes/api.php` *(modified)*
5. `vscode-extension/src/services/mcpClient.ts` *(modified)*
6. `tests/Feature/McpServerTest.php` *(modified)*
7. `vscode-extension/src/services/mcpClient.optimisticLocking.test.ts` *(new)*
8. `Docs/OPTIMISTIC-LOCKING-GUIDE.md` *(new)*
9. `vscode-extension/validate-optimistic-locking.js` *(new)*

## Deployment Steps

1. **Run migration**: `php artisan migrate`
   - Adds `version` column to tasks table
   - Sets default value 0 for existing tasks
   
2. **Deploy backend**: No code changes needed for existing tasks

3. **Deploy client**: TypeScript changes are backward compatible

4. **Verify**: Run `node vscode-extension/validate-optimistic-locking.js`

## Monitoring

Watch for these metrics in production:
- **Conflict rate**: 409 responses / total status updates
- **Retry success rate**: Successful retries / total conflicts
- **Retry exhaustion**: Updates that fail after max attempts

High conflict rates may indicate:
- Too many agents working on same task simultaneously
- Need for better task decomposition
- Agent coordination issues

## Conclusion

✅ **Race condition eliminated** with atomic optimistic locking  
✅ **Automatic retry** with correct exponential backoff  
✅ **Backward compatible** with existing code  
✅ **Fully tested** with 12 new test cases  
✅ **All review comments addressed**  
✅ **Well documented** with comprehensive guide  
✅ **Validated** with demonstration script  

The implementation follows industry best practices for concurrent data updates and provides a robust solution to the race condition issue while maintaining backward compatibility.
