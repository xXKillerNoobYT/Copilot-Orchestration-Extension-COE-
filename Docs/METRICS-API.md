# Metrics API Endpoints Documentation

This document describes the REST API endpoints for metrics retrieval with time-range filtering and aggregation options.

## Base URL

All endpoints are prefixed with `/api/v1/metrics`

## Endpoints

### 1. GET /api/v1/metrics/tasks

Retrieve task metrics with optional time-range filtering.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `7d` | Time range for filtering tasks. Supports: `Xh` (hours), `Xd` (days), `Xw` (weeks), `Xm` (months) |

#### Example Request

```bash
GET /api/v1/metrics/tasks?range=7d
```

#### Example Response

```json
{
  "counts": {
    "total": 42,
    "completed": 30,
    "in_progress": 8,
    "pending": 2,
    "blocked": 1,
    "failed": 1
  },
  "completionRate": 71.43,
  "averageCycleSeconds": 3600,
  "averageCycleDisplay": "1 hour",
  "timeRange": "7d",
  "startDate": "2026-01-10T10:24:02.000000Z",
  "lastUpdated": "2026-01-17T10:24:02.000000Z"
}
```

#### Response Fields

- `counts.total` - Total number of tasks in the time range
- `counts.completed` - Number of completed tasks
- `counts.in_progress` - Number of in-progress tasks
- `counts.pending` - Number of pending tasks
- `counts.blocked` - Number of blocked tasks
- `counts.failed` - Number of failed tasks
- `completionRate` - Percentage of completed tasks (0-100)
- `averageCycleSeconds` - Average task completion time in seconds
- `averageCycleDisplay` - Human-readable average cycle time
- `timeRange` - The time range filter applied
- `startDate` - ISO 8601 start date of the range
- `lastUpdated` - ISO 8601 timestamp of when metrics were calculated

---

### 2. GET /api/v1/metrics/agents

Retrieve agent utilization and throughput metrics.

#### Query Parameters

None

#### Example Request

```bash
GET /api/v1/metrics/agents
```

#### Example Response

```json
{
  "counts": {
    "total_agents": 5,
    "active_agents": 4,
    "total_executions": 156
  },
  "avgExecutionsPerAgent": 31.2,
  "currentRunningExecutions": 3,
  "utilization": 0.75,
  "busiestAgent": {
    "agent_id": 42,
    "name": "CodeExecutor-01",
    "executions": 45
  },
  "lastUpdated": "2026-01-17T10:24:02.000000Z"
}
```

#### Response Fields

- `counts.total_agents` - Total number of agents
- `counts.active_agents` - Number of active agents
- `counts.total_executions` - Total task executions across all agents
- `avgExecutionsPerAgent` - Average executions per agent
- `currentRunningExecutions` - Currently running task executions
- `utilization` - Agent utilization ratio (running tasks / active agents)
- `busiestAgent` - Information about the agent with most executions
- `lastUpdated` - ISO 8601 timestamp of when metrics were calculated

---

### 3. GET /api/v1/metrics/errors

Retrieve error metrics with optional severity filtering.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `severity` | string | - | Filter errors by severity level: `critical`, `high`, `medium`, `low` |
| `limit` | integer | `10` | Maximum number of recent errors to return |

#### Example Request

```bash
GET /api/v1/metrics/errors?severity=high&limit=5
```

#### Example Response

```json
{
  "failures": {
    "total_executions": 200,
    "failed_executions": 15,
    "failure_rate": 7.5
  },
  "recent_errors": [
    {
      "task_id": 123,
      "agent_id": 42,
      "message": "High: API rate limit exceeded",
      "severity": "high",
      "completed_at": "2026-01-17T09:15:00.000000Z"
    },
    {
      "task_id": 118,
      "agent_id": 38,
      "message": "High: Authentication failed",
      "severity": "high",
      "completed_at": "2026-01-17T08:30:00.000000Z"
    }
  ],
  "filtered_by_severity": "high",
  "lastUpdated": "2026-01-17T10:24:02.000000Z"
}
```

#### Response Fields

- `failures.total_executions` - Total number of task executions
- `failures.failed_executions` - Number of failed executions
- `failures.failure_rate` - Percentage of failed executions (0-100)
- `recent_errors` - Array of recent error details
  - `task_id` - ID of the failed task
  - `agent_id` - ID of the agent that executed the task
  - `message` - Error message
  - `severity` - Extracted severity level (critical, high, medium, low)
  - `completed_at` - ISO 8601 timestamp when the execution completed
- `filtered_by_severity` - The severity filter applied (only present when filtering)
- `lastUpdated` - ISO 8601 timestamp of when metrics were calculated

---

## Additional Endpoints

### 4. GET /api/v1/metrics/dashboard

Get comprehensive KPI dashboard with all key performance indicators.

**Query Parameters:**
- `days` (integer, default: 30) - Number of days to include in metrics

### 5. GET /api/v1/metrics/history

Get metrics history for a specific metric.

**Query Parameters:**
- `metric` (string, default: 'test_coverage_percent') - Metric name to retrieve
- `days` (integer, default: 30) - Number of days of history

### 6. GET /api/v1/metrics/health

Get current system health status based on metrics.

### 7. POST /api/v1/metrics/aggregate

Manually trigger metrics aggregation (requires authentication).

**Query Parameters:**
- `days` (integer, default: 1) - Number of days to aggregate

---

## Error Responses

All endpoints follow standard HTTP status codes:

- `200 OK` - Successful request
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Authentication required (for POST endpoints)
- `500 Internal Server Error` - Server error

Example error response:

```json
{
  "message": "Invalid time range format",
  "errors": {
    "range": ["The range format must match pattern: /^(\d+)([hdwm])$/"]
  }
}
```

---

## Time Range Format

Time range parameters support the following formats:

- `Xh` - Hours (e.g., `24h` = last 24 hours)
- `Xd` - Days (e.g., `7d` = last 7 days)
- `Xw` - Weeks (e.g., `2w` = last 2 weeks)
- `Xm` - Months (e.g., `1m` = last 1 month)

Where `X` is a positive integer.

## Severity Levels

Error severity is automatically extracted from error messages or can be explicitly set:

- `critical` - Critical failures requiring immediate attention
- `high` - High-priority errors affecting functionality
- `medium` - Medium-priority errors (default)
- `low` - Low-priority warnings or minor issues

## Notes

- All timestamps are in ISO 8601 format with UTC timezone
- Numeric values are rounded to 2 decimal places where applicable
- Counts and IDs are always integers
- The `range` parameter defaults to `7d` if not specified or invalid
- The `severity` filter performs case-insensitive substring matching on error messages
