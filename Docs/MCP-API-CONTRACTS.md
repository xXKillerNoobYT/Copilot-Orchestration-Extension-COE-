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

### 4. Load Plan
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
