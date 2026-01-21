# MCP API Contracts
**Model Context Protocol API Specification**  
**Version:** 1.0  
**Last Updated:** January 16, 2026  
**Reference Implementation:** `vscode-extension/src/services/mcpClient.ts`

---

## Overview

The Model Context Protocol (MCP) server provides RESTful endpoints for task management, planning, tool routing, and multi-agent coordination. This document specifies canonical endpoint paths, request/response schemas, error codes, and authentication requirements.

**Base URL:** Configured via `copilot-orchestrator.mcp.baseUrl` (default: `http://localhost:8000`)

---

## Authentication

### Bearer Token Authentication
- **Supported:** Yes (optional)
- **Header:** `Authorization: Bearer <token>`
- **Configuration:** `copilot-orchestrator.mcp.authToken`
- **When Required:** If MCP server configured with authentication

### Example
```bash
curl -H "Authorization: Bearer your_token_here" \
  http://localhost:8000/api/v1/mcp/nextTask
```

---

## Canonical Endpoint Schema

All endpoints follow this path pattern:
```
/api/v1/mcp/{endpoint}
```

**Note:** See **Issue #4 (ERROR-CATALOG.md)** - inconsistent paths detected during audit. All endpoints should use `/api/v1/mcp/*` prefix.

---

## Endpoints

### 1. Get Next Task
**Endpoint:** `POST /api/v1/mcp/nextTask`

**Purpose:** Retrieve the next task for agent execution

**Request Schema:**
```json
{
  "agentId": string,              // Required: Unique agent identifier
  "agentRole": "Planner" | "Coder" | "Tester" | "Reviewer",  // Agent role
  "capabilities": string[],       // Optional: Agent capabilities
  "contextId": string             // Optional: Current context ID
}
```

**Response Schema (Success - 200 OK):**
```json
{
  "taskId": string,               // Unique task identifier
  "title": string,                // Task title
  "description": string,          // Detailed task description
  "type": "development" | "testing" | "review" | "planning",
  "priority": 1-5,                // 1=critical, 5=low
  "assignedAgent": string,        // Agent ID assigned to task
  "githubIssueId": number,        // Linked GitHub issue (if any)
  "contextBundle": ContextBundle, // Context for task execution
  "expectedDuration": number,     // Estimated duration in seconds
  "version": number               // For optimistic locking (Issue #1)
}
```

**ContextBundle Schema:**
```json
{
  "id": string,
  "name": string,
  "description": string,
  "files": string[],              // File paths (Issue #8: should have size cap)
  "metadata": Record<string, any>,
  "agentProfile": AgentProfile,   // (Issue #5: missing field to add)
  "profileVersion": number        // (Issue #5: add for staleness detection)
}
```

**Response Schema (Error - 204 No Content):**
```
No content body (no tasks available)
HTTP 204
```

**Response Schema (Error - 400 Bad Request):**
```json
{
  "error": "Invalid agentId format",
  "details": string,
  "timestamp": number
}
```

**Response Schema (Error - 401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "details": "Missing or invalid Authorization header"
}
```

**Response Schema (Error - 503 Service Unavailable):**
```json
{
  "error": "MCP service unavailable",
  "details": "Backend task queue not responding"
}
```

**Timeout:** 30000 ms (configurable via `copilot-orchestrator.mcp.timeout`)

---

### 2. Report Task Status
**Endpoint:** `POST /api/v1/mcp/reportTaskStatus`

**Purpose:** Report task execution status to backend

**Request Schema:**
```json
{
  "taskId": string,               // Required: Task identifier
  "status": "in-progress" | "done" | "blocked" | "failed",  // Status
  "expectedVersion": number,      // (Issue #1: for optimistic locking)
  "agentId": string,              // Agent reporting status
  "progress": 0-100,              // Completion percentage
  "logs": string,                 // Execution logs
  "errors": string[],             // Error messages if failed
  "output": Record<string, any>,  // Task output/results
  "timestamp": number             // Report timestamp
}
```

**Response Schema (Success - 200 OK):**
```json
{
  "acknowledged": true,
  "taskId": string,
  "newVersion": number,           // Updated version for next call
  "nextAction": string,           // "continue" | "stop" | "retry"
  "timestamp": number
}
```

**Response Schema (Error - 409 Conflict):**
```json
{
  "error": "Version conflict",
  "details": "Expected version 5, but current is 7",
  "currentVersion": number,
  "recommendedAction": "retry with new expectedVersion"
}
```

**Response Schema (Error - 404 Not Found):**
```json
{
  "error": "Task not found",
  "taskId": string,
  "details": "Task does not exist or has expired"
}
```

**Timeout:** 30000 ms

---

### 3. Save Plan
**Endpoint:** `POST /api/v1/mcp/savePlan`

**Purpose:** Persist planning artifacts to backend

**Request Schema:**
```json
{
  "planId": string,               // Unique plan identifier
  "title": string,                // Plan title
  "description": string,          // Plan description
  "tasks": PlanTask[],            // Array of tasks in plan
  "metadata": Record<string, any>,// Custom metadata
  "agentId": string               // Planning agent ID
}
```

**PlanTask Schema:**
```json
{
  "id": string,
  "title": string,
  "description": string,
  "dependencies": string[],       // Task IDs this depends on
  "type": string,
  "priority": number,
  "estimatedDuration": number
}
```

**Response Schema (Success - 201 Created):**
```json
{
  "planId": string,
  "saved": true,
  "timestamp": number,
  "location": string              // URI of saved plan
}
```

**Response Schema (Error - 400 Bad Request):**
```json
{
  "error": "Invalid plan data",
  "details": "Tasks contain circular dependencies",
  "field": "tasks"
}
```

**Timeout:** 30000 ms

---

### 4. Delete Plan
**Endpoint:** `DELETE /api/v1/planning/{planId}`

**Purpose:** Delete a plan from the backend (soft delete by default)

**Path Parameters:**
- `planId` (number): Plan identifier

**Request Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Response Schema (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Plan deleted successfully",
  "planId": number,
  "deletedAt": string  // ISO 8601 timestamp
}
```

**Response Schema (Not Found - 404):**
```json
{
  "success": false,
  "message": "Plan not found",
  "planId": number
}
```

**Response Schema (Cannot Delete - 422 Unprocessable Entity):**
```json
{
  "success": false,
  "message": "Cannot delete plan: plan is approved or implemented",
  "planId": number,
  "status": string  // Current plan status
}
```

**Business Rules:**
- Only plans with status "draft" or "pending" can be deleted
- Approved or implemented plans return 422 error
- Soft delete by default (plan moved to archive)
- Cascade delete handled by backend (related tasks/dependencies)

**Timeout:** 10000 ms

**Example Usage:**
```typescript
// Frontend integration
const response = await fetch(`${baseUrl}/api/v1/planning/${planId}`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

if (response.status === 404) {
  console.log('Plan already deleted');
} else if (response.status === 422) {
  console.warn('Cannot delete approved/implemented plan');
} else if (response.ok) {
  console.log('Plan deleted successfully');
}
```

---

### 5. Load Plan
**Endpoint:** `GET /api/v1/mcp/loadPlan/{planId}`

**Purpose:** Retrieve previously saved plan

**Path Parameters:**
- `planId` (string): Plan identifier

**Query Parameters:**
- `version` (optional, number): Specific version to load

**Response Schema (Success - 200 OK):**
```json
{
  "planId": string,
  "title": string,
  "description": string,
  "tasks": PlanTask[],
  "metadata": Record<string, any>,
  "createdAt": number,
  "updatedAt": number,
  "version": number
}
```

**Response Schema (Error - 404 Not Found):**
```json
{
  "error": "Plan not found",
  "planId": string
}
```

**Timeout:** 30000 ms

---

### 5. List Plans
**Endpoint:** `GET /api/v1/mcp/listPlans`

**Purpose:** List all available plans

**Query Parameters:**
- `agentId` (optional, string): Filter by agent
- `status` (optional, string): Filter by status (active, archived, etc)
- `limit` (optional, number): Max results (default 100, max 1000)
- `offset` (optional, number): Pagination offset

**Response Schema (Success - 200 OK):**
```json
{
  "plans": [
    {
      "planId": string,
      "title": string,
      "agentId": string,
      "status": string,
      "taskCount": number,
      "createdAt": number,
      "updatedAt": number
    }
  ],
  "total": number,
  "limit": number,
  "offset": number
}
```

**Timeout:** 30000 ms

---

### 6. Get Tool Registry
**Endpoint:** `GET /api/v1/mcp/tools`

**Purpose:** Retrieve available tools for agent use

**Query Parameters:**
- `agentRole` (optional, string): Filter tools by agent role
- `capability` (optional, string): Filter by capability

**Response Schema (Success - 200 OK):**
```json
{
  "tools": [
    {
      "name": string,             // Tool name
      "description": string,      // Tool description
      "category": string,         // Tool category
      "input_schema": JSONSchema, // JSON Schema for inputs
      "output_schema": JSONSchema,// JSON Schema for outputs
      "timeout": number,          // Tool execution timeout (ms)
      "availableFor": string[],   // Agent roles (["Coder", "Tester"])
      "requiresAuth": boolean,
      "costEstimate": number      // Relative cost (1-10)
    }
  ],
  "total": number
}
```

**Timeout:** 30000 ms

---

### 7. Call Tool
**Endpoint:** `POST /api/v1/mcp/callTool`

**Purpose:** Execute a tool via MCP

**Request Schema:**
```json
{
  "toolName": string,             // Tool identifier
  "arguments": Record<string, any>, // Tool arguments
  "agentId": string,              // Calling agent
  "contextId": string,            // Execution context
  "timeout": number               // Override default timeout
}
```

**Response Schema (Success - 200 OK):**
```json
{
  "toolName": string,
  "result": Record<string, any>,  // Tool output
  "executionTime": number,        // Milliseconds
  "status": "success",
  "metadata": Record<string, any>
}
```

**Response Schema (Error - 400 Bad Request):**
```json
{
  "error": "Invalid arguments",
  "toolName": string,
  "details": "Missing required field: path",
  "schema": JSONSchema
}
```

**Response Schema (Error - 404 Not Found):**
```json
{
  "error": "Tool not found",
  "toolName": string,
  "availableTools": string[]    // Suggestion list
}
```

**Response Schema (Error - 408 Request Timeout):**
```json
{
  "error": "Tool execution timeout",
  "toolName": string,
  "timeout": number,
  "executedAt": number,
  "recommendation": "Increase timeout or check tool for infinite loops"
}
```

**Timeout:** Tool-specific (default 30000 ms, configurable per tool)

---

### 8. Get Agent Profile
**Endpoint:** `GET /api/v1/mcp/agentProfile/{agentId}`

**Purpose:** Get agent role, capabilities, and tool whitelist

**Path Parameters:**
- `agentId` (string): Agent identifier

**Response Schema (Success - 200 OK):**
```json
{
  "agentId": string,
  "role": "Planner" | "Coder" | "Tester" | "Reviewer",
  "capabilities": string[],       // Capabilities (e.g., ["file-read", "git-commit"])
  "allowedTools": string[],       // Whitelisted tools
  "deniedTools": string[],        // Explicitly denied tools
  "version": number,              // Profile version
  "createdAt": number,
  "updatedAt": number
}
```

**Response Schema (Error - 404 Not Found):**
```json
{
  "error": "Agent not found",
  "agentId": string
}
```

**Timeout:** 30000 ms

---

### 9. Update Agent Status
**Endpoint:** `PATCH /api/v1/mcp/agentStatus/{agentId}`

**Purpose:** Update agent availability, state, or capabilities

**Path Parameters:**
- `agentId` (string): Agent identifier

**Request Schema:**
```json
{
  "status": "available" | "busy" | "offline" | "error",
  "currentTask": string,          // Current task ID (if any)
  "healthCheck": boolean,         // Agent is healthy
  "stateData": Record<string, any>, // Custom state
  "timestamp": number
}
```

**Response Schema (Success - 200 OK):**
```json
{
  "agentId": string,
  "status": string,
  "updated": true,
  "timestamp": number
}
```

**Timeout:** 30000 ms

---

### 10. Get GitHub Integration Status
**Endpoint:** `GET /api/v1/mcp/githubStatus`

**Purpose:** Check GitHub API connectivity and rate limits

**Response Schema (Success - 200 OK):**
```json
{
  "connected": boolean,
  "rateLimit": {
    "limit": number,              // Requests per hour
    "remaining": number,          // Remaining requests
    "resetAt": number             // Unix timestamp
  },
  "repositories": number,         // Accessible repos count
  "lastSync": number,             // Last sync timestamp
  "issues": any[]                 // Array of recent issues
}
```

**Response Schema (Error - 401 Unauthorized):**
```json
{
  "error": "GitHub token invalid or expired",
  "details": "Please reconfigure authentication"
}
```

**Timeout:** 30000 ms

---

## Error Codes Summary

| Code | Status | Meaning | Retry? |
|------|--------|---------|--------|
| 200 | OK | Success | No |
| 201 | Created | Resource created | No |
| 204 | No Content | Success, no content | No |
| 400 | Bad Request | Invalid input | No |
| 401 | Unauthorized | Auth failed | No (fix auth first) |
| 404 | Not Found | Resource not found | No |
| 408 | Timeout | Request timed out | Yes (exponential backoff) |
| 409 | Conflict | Version mismatch (Issue #1) | Yes (retry with new version) |
| 429 | Too Many Requests | Rate limited | Yes (wait before retry) |
| 500 | Server Error | Backend error | Yes (exponential backoff) |
| 503 | Service Unavailable | Server down | Yes (exponential backoff) |

---

## Timeout Expectations

| Operation | Default Timeout | Configurable |
|-----------|-----------------|--------------|
| nextTask | 30s | Yes (`copilot-orchestrator.mcp.timeout`) |
| reportTaskStatus | 30s | Yes |
| savePlan | 30s | Yes |
| loadPlan | 30s | Yes |
| callTool | 30s (per tool) | Yes |
| All others | 30s | Yes |

**Configuration:**
```json
{
  "copilot-orchestrator.mcp.timeout": 45000
}
```

---

## Tool Availability Per Endpoint

| Endpoint | Tools Available | Notes |
|----------|-----------------|-------|
| `/nextTask` | All | Tools included in context bundle |
| `/callTool` | Specific tool | Can call any tool |
| `/agentProfile/{id}` | Listed tools only | Based on agent role |
| `/tools` | All (filtered) | Depends on query filters |

---

## Request/Response Examples

### Example 1: Get Next Task
**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/mcp/nextTask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token123" \
  -d '{
    "agentId": "agent-coder-1",
    "agentRole": "Coder",
    "capabilities": ["file-read", "file-write", "git"]
  }'
```

**Response (200):**
```json
{
  "taskId": "task-123",
  "title": "Implement user authentication",
  "description": "Add JWT-based auth to API",
  "type": "development",
  "priority": 1,
  "assignedAgent": "agent-coder-1",
  "githubIssueId": 42,
  "version": 1,
  "contextBundle": {
    "id": "bundle-456",
    "name": "Auth Feature Context",
    "files": [
      "/src/auth/jwt.ts",
      "/src/models/User.ts"
    ]
  }
}
```

### Example 2: Report Task Status with Version
**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/mcp/reportTaskStatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token123" \
  -d '{
    "taskId": "task-123",
    "status": "in-progress",
    "expectedVersion": 1,
    "agentId": "agent-coder-1",
    "progress": 50,
    "logs": "Implementing JWT token generation..."
  }'
```

**Response (200):**
```json
{
  "acknowledged": true,
  "taskId": "task-123",
  "newVersion": 2,
  "nextAction": "continue"
}
```

**Response (409 Conflict - Race Condition):**
```json
{
  "error": "Version conflict",
  "currentVersion": 3,
  "details": "Another agent already updated this task"
}
```

---

## Authentication Flow

### 1. Obtain Token
```bash
# Token provided via configuration
# copilot-orchestrator.mcp.authToken
```

### 2. Include in Requests
```bash
curl -H "Authorization: Bearer ${TOKEN}" http://localhost:8000/api/v1/mcp/...
```

### 3. Handle 401 Response
```
If 401: Token expired or invalid
→ Reconfigure copilot-orchestrator.mcp.authToken
→ Restart extension
```

---

## Best Practices

1. **Always use expectedVersion** in status updates (Issue #1 mitigation)
2. **Handle 409 Conflict** with exponential backoff retry
3. **Check tool availability** before calling tools
4. **Validate input schema** before making requests
5. **Log all error responses** for debugging
6. **Monitor timeout patterns** - may indicate backend issues
7. **Respect rate limits** - implement backoff for 429 responses

---

## Related Issues

- **Issue #1:** Race condition in task status (need optimistic locking)
- **Issue #4:** Inconsistent endpoint paths (document canonical schema)
- **Issue #5:** Missing agent profile in context bundle
- **Issue #8:** No context file size cap

See `Docs/ERROR-CATALOG.md` for details.

---

**End of MCP API Contracts**

---

## MCP Server Handler Implementation

**Implementation Status:** ✅ COMPLETE  
**Last Updated:** January 19, 2026  
**Reference:** `vscode-extension/src/mcp-server/handlers/`

### Architecture

The MCP server handlers run as a standalone Node.js process, separate from the VS Code extension. This architecture enables:

- **Standalone Operation**: No dependency on VS Code APIs
- **Environment-Based Config**: All configuration via environment variables
- **Clean Separation**: Backend logic separated from UI interactions
- **Real-Time Updates**: WebSocket events bridge MCP server ↔ VS Code extension

```
GitHub Copilot → MCP Server Handler → Laravel Backend API → Database
                       ↓
                 WebSocket Event
                       ↓
              VS Code Extension → User UI
```

### Error Handling

All handlers implement comprehensive error handling through `MCPHandlerBase`:

#### Timeout Configuration
- **Default Timeout:** 30 seconds per request
- **Configurable:** Via `ErrorHandlingConfig` in handler constructor
- **Behavior:** Request fails if backend doesn't respond within timeout

#### Retry Mechanism
- **Retry Attempts:** 3 attempts (configurable)
- **Backoff Strategy:** Exponential backoff (1s, 2s, 4s, ...)
- **Retry Triggers:** Network errors, 5xx responses, timeouts
- **No Retry:** 4xx client errors (except 409 conflicts)

#### Dead-Letter Queue
- **Purpose:** Track permanently failed requests for debugging
- **Storage:** In-memory array (TODO: persist to SQLite audit_log)
- **Contents:** Handler name, args, error message, timestamp, retry count
- **Access:** `handler.getDeadLetterQueue()` for monitoring

### Environment Variables

All handlers read configuration from environment variables:

#### MCP Backend Configuration
```bash
MCP_BASE_URL=http://localhost:8000        # Laravel backend URL
MCP_PROJECT_ID=default                     # Default project ID
MCP_AUTH_TOKEN=<optional>                  # Optional auth token
MCP_TIMEOUT=30000                          # Request timeout (ms)
MCP_LOCAL_SERVER_ENABLED=true             # Enable local MCP server
MCP_DOCKER_GATEWAY_ENABLED=false          # Enable Docker gateway
```

#### Workspace Configuration
```bash
WORKSPACE_TASK_ROOTS=_ZENTASKS,_TASKS    # Task root directories (comma-separated)
WORKSPACE_ISSUE_FOLDER=.vscode/github-issues
WORKSPACE_TOOL_REGISTRY=.github/copilot-tools.json
WORKSPACE_ROOT=/path/to/workspace         # Workspace root path
```

#### LLM Configuration
```bash
LLM_BASE_URL=http://localhost:1234/v1
LLM_MODEL=lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
LLM_TEMPERATURE=0.7
LLM_TIMEOUT=30000
```

#### WebSocket Configuration
```bash
WEBSOCKET_DRIVER=soketi                   # Options: soketi, pusher, redis
WEBSOCKET_HOST=localhost
WEBSOCKET_PORT=6001
WEBSOCKET_ENABLED=true
```

#### GitHub Configuration
```bash
GITHUB_SYNC_ENABLED=true
GITHUB_SYNC_INTERVAL=300000               # 5 minutes (ms)
GITHUB_RATE_LIMIT=5000
```

#### Project Configuration
```bash
PROJECT_NAME=My Project
```

### Handler Implementations

#### 1. getTaskStatus
**File:** `vscode-extension/src/mcp-server/handlers/getTaskStatus.ts`

**Backend Integration:**
```
GET /api/v1/tasks/{taskId}
```

**Functionality:**
- Fetches task from Laravel TaskRepository
- Transforms backend response to MCP format
- Converts progress_percent (0-100) to decimal (0-1)
- Includes dependencies, blockers, linked GitHub issue
- Returns version for optimistic locking

**Error Codes:**
- `404`: Task not found
- `500`: Backend error (retries 3 times)

#### 2. listActiveTasks
**File:** `vscode-extension/src/mcp-server/handlers/listActiveTasks.ts`

**Backend Integration:**
```
GET /api/v1/projects/{projectId}/tasks?status=X&priority=Y&assigned_agent=Z
```

**Functionality:**
- Fetches filtered task list from backend
- Applies query parameter filters (status, priority, assignee)
- Uses `MCP_PROJECT_ID` or `projectId` parameter
- Returns paginated results with metadata

#### 3. getAgentState
**File:** `vscode-extension/src/mcp-server/handlers/getAgentState.ts`

**Backend Integration:**
```
GET /api/v1/agents
GET /api/v1/agents?name=<agentName>
```

**Functionality:**
- Fetches agent metrics from AgentRepository
- Maps backend status to MCP format (working→active, idle→idle, error→error)
- Calculates system status based on error rate:
  - >50% error rate: `offline`
  - >20% error rate: `degraded`
  - Otherwise: `operational`
- Returns queue depth, success rate, completed/active task counts

#### 4. getWorkspaceConfig
**File:** `vscode-extension/src/mcp-server/handlers/getWorkspaceConfig.ts`

**Backend Integration:** None (reads environment variables)

**Functionality:**
- Returns configuration from environment variables
- Masks auth tokens (`***`) in response
- Optionally includes default agent profiles
- Parses numeric/boolean environment variables correctly

**Agent Profiles:**
- Auto Zen (Autonomous executor)
- Zen Planner (Strategic planner)
- Testing Agent (QA & coverage)
- Verification Agent (Visual/automated verification)

#### 5. requestVerification
**File:** `vscode-extension/src/mcp-server/handlers/requestVerification.ts`

**Backend Integration:**
```
POST /api/v1/verifications
```

**Functionality:**
- Creates verification request in backend database
- Sets expiration time (24 hours default)
- Returns verification ID for WebSocket notification
- **Note:** VS Code extension handles UI via WebSocket events

**WebSocket Flow:**
1. Handler creates verification in database
2. Backend broadcasts `verificationRequested` event
3. VS Code extension receives event
4. Extension shows verification panel to user
5. User completes verification
6. Extension updates backend with results

#### 6. reportVerificationResult
**File:** `vscode-extension/src/mcp-server/handlers/reportVerificationResult.ts`

**Backend Integration:**
```
POST /api/v1/mcp/reportVerificationResult
POST /api/v1/tasks (creates investigation tasks)
PATCH /api/v1/tasks/{taskId}/status (updates task status)
```

**Functionality:**
- Validates input with Zod schema
- Submits verification results to backend
- If `passed=false`: Creates investigation tasks for each finding
- If `passed=true`: Updates task status to `completed`
- If `passed=false`: Updates task status to `blocked`
- Maps finding severity to task priority

**Investigation Task Mapping:**
- `critical` severity → `critical` priority
- `major`/`high` severity → `high` priority
- `minor` severity → `medium` priority
- `low` severity → `low` priority

#### 7. askUserQuestion
**File:** `vscode-extension/src/mcp-server/handlers/askUserQuestion.ts`

**Backend Integration:**
```
POST /api/v1/questions
```

**Functionality:**
- Creates question in backend database
- Calculates expiration time based on timeout parameter
- Returns question ID for polling/WebSocket
- **Note:** VS Code extension prompts user via WebSocket events

**WebSocket Flow:**
1. Handler creates question in database
2. Backend broadcasts `questionAsked` event
3. VS Code extension receives event
4. Extension shows input box/quick pick to user
5. User provides answer
6. Extension updates backend with answer
7. MCP can poll backend for answer

### Response Format

All handlers return responses in MCP protocol format:

```typescript
{
  content: [
    {
      type: 'text',
      text: JSON.stringify(data, null, 2)
    }
  ]
}
```

**Success Response Example:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"taskId\": \"TASK-123\",\n  \"status\": \"in-progress\",\n  ...\n}"
    }
  ]
}
```

**Error Response Example:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"error\": \"Task not found\",\n  \"timestamp\": \"2026-01-19T10:00:00Z\"\n}"
    }
  ]
}
```

### Testing

**Test Files:** `vscode-extension/src/mcp-server/handlers/__tests__/`

**Coverage:** 56 comprehensive test cases across 8 test suites

**Test Categories:**
- Success scenarios with mocked backend responses
- Error handling (404, 500, validation errors)
- Retry mechanism with exponential backoff
- Timeout handling (30s default)
- Dead-letter queue for failed requests
- Environment variable configuration
- Data transformation (backend → MCP format)
- Request validation with Zod schemas

**Running Tests:**
```bash
cd vscode-extension

# Run all handler tests
npm run test:jest -- --testPathPatterns="handlers/__tests__"

# Run specific test
npm run test:jest -- getTaskStatus.test.ts

# Run with coverage
npm run test:jest:coverage -- --testPathPatterns="handlers/__tests__"
```

**Integration Testing:**
Integration tests require Laravel backend running:
```bash
# 1. Start Laravel backend
cd backend
php artisan serve

# 2. Run integration tests
cd vscode-extension
npm run test:integration
```

### Monitoring & Debugging

#### Dead-Letter Queue Monitoring
```typescript
// Access dead-letter queue for debugging
const handler = new GetTaskStatusHandler();
const failedRequests = handler.getDeadLetterQueue();
console.log('Failed requests:', failedRequests);
```

#### Logging
All handlers log to console:
- `console.log`: Normal operations
- `console.warn`: Retry attempts, non-fatal errors
- `console.error`: Fatal errors, dead-letter queue additions

#### Common Issues

**Issue: Timeout errors**
- **Cause:** Backend not responding within 30 seconds
- **Solution:** Check backend health, increase timeout via environment variable
- **Debug:** Check Laravel logs for slow queries

**Issue: All requests failing**
- **Cause:** Backend not running or wrong URL
- **Solution:** Verify `MCP_BASE_URL` environment variable
- **Debug:** Check if Laravel is running on specified URL

**Issue: 404 errors**
- **Cause:** Task/agent/resource not found in database
- **Solution:** Verify resource exists in Laravel database
- **Debug:** Check Laravel database with `php artisan tinker`

**Issue: Validation errors**
- **Cause:** Invalid input to handler
- **Solution:** Check Zod schema in `agentValidation.ts`
- **Debug:** Review validation error details in response

### Future Improvements

- [x] **Persist dead-letter queue to SQLite** - ✅ IMPLEMENTED (v1.0.1)
  - See "Dead Letter Queue (DLQ) Database Schema" section below
  - Full SQLite persistence with filtering, replay, and archiving
  - Integrated with MCP error handling (3 retries + exponential backoff)
- [ ] Add circuit breaker pattern (pause after N consecutive failures)
- [ ] Implement request deduplication (prevent duplicate requests)
- [ ] Add metrics collection (request duration, success rate)
- [ ] Support batch operations (fetch multiple tasks at once)
- [ ] Add caching layer (reduce backend load)
- [ ] Implement request prioritization (critical requests first)

---

## Dead Letter Queue (DLQ) Database Schema

**Version:** 1.0.1  
**Added:** January 19, 2026  
**Implementation:** `vscode-extension/src/services/deadLetterQueue.ts`

### Overview

The Dead Letter Queue (DLQ) persists failed MCP messages after all retry attempts have been exhausted. This provides:
- **Operational Visibility:** View all failed messages with error details
- **Debugging:** Analyze failure patterns and root causes
- **Recovery:** Replay failed messages after fixes are deployed
- **Compliance:** Audit trail of message failures

### Database Table

```sql
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  message_type TEXT NOT NULL,  -- 'task_request', 'observation', etc.
  original_payload TEXT NOT NULL,  -- JSON serialized message
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  first_failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_retry_at TIMESTAMP,
  handler_name TEXT,  -- Which handler failed (e.g., 'getTaskStatus')
  task_id TEXT,  -- Optional: link to task if applicable
  metadata TEXT,  -- JSON for additional context
  status TEXT DEFAULT 'failed',  -- 'failed', 'retrying', 'archived', 'replayed'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_dlq_message_type ON dead_letter_queue(message_type);
CREATE INDEX IF NOT EXISTS idx_dlq_handler_name ON dead_letter_queue(handler_name);
CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_dlq_task_id ON dead_letter_queue(task_id);
```

### TypeScript Interface

```typescript
export interface DeadLetterEntry {
  id: string;
  messageId: string;
  messageType: string;
  originalPayload: object;
  errorMessage: string;
  errorStack?: string;
  retryCount: number;
  firstFailedAt: Date;
  lastRetryAt?: Date;
  handlerName?: string;
  taskId?: string;
  metadata?: Record<string, any>;
  status: 'failed' | 'retrying' | 'archived' | 'replayed';
}
```

### Service API

The `DeadLetterQueueService` provides the following methods:

#### Add Failed Message
```typescript
async addFailedMessage(
  messageId: string,
  messageType: string,
  payload: object,
  error: Error,
  handlerName?: string,
  taskId?: string,
  retryCount: number = 0
): Promise<string>
```

Adds a failed message to the DLQ after all retry attempts are exhausted.

#### Get Entries with Filtering
```typescript
async getEntries(filters?: {
  status?: string;
  handlerName?: string;
  messageType?: string;
  since?: Date;
  limit?: number;  // Maximum entries to return (default: 100, max: 1000)
}): Promise<DeadLetterEntry[]>
```

Retrieves DLQ entries with optional filtering. Limited to 100 entries per query by default, configurable up to 1000.

#### Replay Message
```typescript
async replayMessage(id: string): Promise<boolean>
```

Marks a failed message for replay. Updates status to 'replayed' and sets `last_retry_at`.

#### Archive Old Entries
```typescript
async archiveOldEntries(olderThanDays: number = 7): Promise<number>
```

Archives failed entries older than specified days. Default: 7 days.

#### Delete Archived Entries
```typescript
async deleteArchivedEntries(olderThanDays: number = 30): Promise<number>
```

Permanently deletes archived entries older than specified days. Default: 30 days.

### Error Handling Integration

The MCP error handler (`MCPErrorHandler`) integrates with the DLQ using this flow:

1. **Attempt operation** with 30-second timeout
2. **Retry on failure** up to 3 times with exponential backoff
   - Initial delay: 1000ms
   - Backoff multiplier: 2x
   - Max delay: 10000ms
3. **Add to DLQ** after all retries fail
4. **Emit WebSocket event** for real-time monitoring

```typescript
// Example error handler usage
const errorHandler = new MCPErrorHandler(dlqService);

const result = await errorHandler.executeWithRetry(
  () => mcpClient.getNextTask(agentId),
  messageId,
  'task_request',
  { agentId },
  'getNextTask'
);
```

### UI Panel

Access the Dead Letter Queue panel via VS Code Command Palette:
```
Copilot Orchestrator: Show Dead Letter Queue
```

**Features:**
- Filter by status, handler, message type, date
- Replay individual failed messages
- Bulk archive old entries (7+ days)
- Bulk delete archived entries (30+ days)
- Export to JSON/CSV for analysis

### Retention Policy

| Status | Retention | Auto-Action |
|--------|-----------|-------------|
| `failed` | 7 days | Auto-archive |
| `retrying` | ∞ | Manual cleanup |
| `archived` | 30 days | Auto-delete |
| `replayed` | ∞ | Manual cleanup |

**Recommended Maintenance:**
- Run `archiveOldEntries(7)` weekly
- Run `deleteArchivedEntries(30)` monthly
- Export critical failures for post-mortem analysis

### Performance Characteristics

- **Write throughput:** ~10,000 inserts/second (tested with 1000 entries)
- **Query performance:** <100ms for 100 entries (with indexes)
- **Storage overhead:** ~1KB per entry average
- **Max recommended size:** 100,000 entries before archival

### Migration Path

Database initialization is automatic. The `DeadLetterQueueService` constructor creates the table and indexes if they don't exist.

```typescript
import Database from 'better-sqlite3';
import { DeadLetterQueueService } from './services/deadLetterQueue';

const db = new Database('copilot-orchestrator.db');
const dlqService = new DeadLetterQueueService(db); // Auto-creates schema
```

### Monitoring & Alerts

**WebSocket Events:**
- `deadLetterAdded`: Emitted when message added to DLQ
  ```json
  {
    "messageId": "msg-123",
    "handlerName": "getTaskStatus",
    "error": "Connection timeout",
    "timestamp": "2026-01-19T12:00:00Z"
  }
  ```

**Recommended Alerts:**
- Alert if DLQ entries > 100
- Alert if same handler fails > 10 times/hour
- Alert if DLQ growth rate > 50 entries/hour

### Related Documentation

- **Error Handling Guide:** `Docs/ERROR-CATALOG.md`
- **Implementation:** `vscode-extension/src/services/deadLetterQueue.ts`
- **Error Handler:** `vscode-extension/src/mcp-server/errorHandler.ts`
- **UI Panel:** `vscode-extension/src/panels/DeadLetterQueuePanel.ts`
- **Migration:** `vscode-extension/src/database/migrations/005_add_dead_letter_queue.sql`

---

**End of MCP API Contracts**
