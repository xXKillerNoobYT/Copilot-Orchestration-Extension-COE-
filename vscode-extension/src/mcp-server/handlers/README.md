# MCP Server Handlers

This directory contains handler implementations for the Model Context Protocol (MCP) server tools used by GitHub Copilot.

## Overview

Each handler integrates with the Laravel backend API to provide real task management, agent orchestration, and user interaction functionality. All handlers extend `MCPHandlerBase` which provides common error handling, retry logic, and response formatting.

## Handler Files

| Handler | Purpose | Backend Endpoint |
|---------|---------|------------------|
| `getTaskStatus.ts` | Fetch task details | GET `/api/v1/tasks/{taskId}` |
| `listActiveTasks.ts` | List filtered tasks | GET `/api/v1/projects/{projectId}/tasks` |
| `getAgentState.ts` | Get agent metrics | GET `/api/v1/agents` |
| `getWorkspaceConfig.ts` | Get configuration | None (environment variables) |
| `requestVerification.ts` | Create verification request | POST `/api/v1/verifications` |
| `reportVerificationResult.ts` | Submit verification results | POST `/api/v1/mcp/reportVerificationResult` |
| `askUserQuestion.ts` | Create user question | POST `/api/v1/questions` |

## Architecture

### Standalone Operation
Handlers run in a Node.js process separate from VS Code. They use `process.env` for configuration instead of VS Code APIs.

### Error Handling
All handlers implement:
- **30-second timeout** per request
- **3 retry attempts** with exponential backoff (1s, 2s, 4s)
- **Dead-letter queue** for permanently failed requests
- **Graceful degradation** (continue on non-fatal errors)

### WebSocket Integration
Handlers create backend requests that trigger WebSocket events. The VS Code extension listens for these events and handles UI interactions.

## Usage

### Basic Handler Pattern
```typescript
import { MCPHandlerBase } from './MCPHandlerBase';

class MyHandler extends MCPHandlerBase {
  async execute(args: any) {
    const { param } = args;

    if (!param) {
      return this.formatError('Missing required parameter: param');
    }

    return this.executeWithRetry(
      async () => {
        const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/v1/my-endpoint`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();
        return this.formatSuccess(data);
      },
      'MyHandler',
      args
    );
  }
}

const handler = new MyHandler();
export async function handleMyTool(args: any) {
  return handler.execute(args);
}
```

### Environment Variables
Configure handlers via environment variables:

```bash
# Required
MCP_BASE_URL=http://localhost:8000

# Optional
MCP_PROJECT_ID=default
MCP_AUTH_TOKEN=your-token-here
MCP_TIMEOUT=30000
WORKSPACE_ROOT=/path/to/workspace
```

See full list in `Docs/MCP-API-CONTRACTS.md`.

## Testing

### Unit Tests
All handlers have comprehensive unit tests in `__tests__/` directory.

```bash
# Run all handler tests
npm run test:jest -- --testPathPatterns="handlers/__tests__"

# Run specific handler test
npm run test:jest -- getTaskStatus.test.ts

# Run with coverage
npm run test:jest:coverage -- --testPathPatterns="handlers/__tests__"
```

### Test Coverage
- 56 test cases across 8 test suites
- Tests success scenarios, error handling, retry logic, timeouts
- Uses mocked `fetch` API (no real backend required)

### Integration Tests
Integration tests require Laravel backend running:

```bash
# Terminal 1: Start Laravel backend
cd /path/to/backend
php artisan serve

# Terminal 2: Run tests
cd vscode-extension
npm run test:integration
```

## Error Handling

### Common Error Patterns

#### Missing Parameter
```typescript
if (!taskId) {
  return this.formatError('Missing required parameter: taskId');
}
```

#### Backend Not Found (404)
```typescript
if (response.status === 404) {
  throw new Error(`Resource not found`);
}
```

#### General Backend Error
```typescript
if (!response.ok) {
  throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
}
```

### Retry Behavior
Handlers automatically retry on:
- Network errors (connection refused, timeout)
- 5xx server errors
- Transient failures

Handlers do NOT retry on:
- 4xx client errors (bad request, not found, unauthorized)
- Validation errors
- Successful responses

## Debugging

### Enable Debug Logging
```bash
# Set environment variable
DEBUG=mcp:* npm run compile
```

### Check Dead-Letter Queue
```typescript
const handler = new GetTaskStatusHandler();
const failedRequests = handler.getDeadLetterQueue();
console.log('Failed requests:', failedRequests);
```

### Common Issues

**Timeout Errors**
- Backend not responding within 30 seconds
- Solution: Check Laravel logs, increase `MCP_TIMEOUT`

**Connection Errors**
- Backend not running or wrong URL
- Solution: Verify `MCP_BASE_URL`, check Laravel is running

**404 Errors**
- Resource doesn't exist in database
- Solution: Check database with `php artisan tinker`

**Validation Errors**
- Invalid input to handler
- Solution: Check Zod schema in `agentValidation.ts`

## Contributing

### Adding a New Handler

1. Create handler file: `myNewHandler.ts`
2. Extend `MCPHandlerBase`
3. Implement `execute(args: any)` method
4. Use `executeWithRetry` for backend calls
5. Return `formatSuccess` or `formatError`
6. Export handler function

Example:
```typescript
import { MCPHandlerBase } from './MCPHandlerBase';

class MyNewHandler extends MCPHandlerBase {
  async execute(args: any) {
    // Validation
    if (!args.requiredParam) {
      return this.formatError('Missing requiredParam');
    }

    // Backend integration with retry
    return this.executeWithRetry(
      async () => {
        const result = await this.callBackend(args);
        return this.formatSuccess(result);
      },
      'MyNewHandler',
      args
    );
  }

  private async callBackend(args: any) {
    // Implement backend call
  }
}

const handler = new MyNewHandler();
export async function handleMyNewTool(args: any) {
  return handler.execute(args);
}
```

### Testing New Handler

1. Create test file: `__tests__/myNewHandler.test.ts`
2. Mock `fetch` globally
3. Test success scenarios
4. Test error scenarios
5. Test retry logic
6. Test validation

See existing tests for examples.

## Documentation

- **MCP API Contracts**: `Docs/MCP-API-CONTRACTS.md`
- **Architecture**: See "MCP Server Handler Implementation" section
- **Environment Variables**: Full list in API contracts doc
- **WebSocket Flow**: Documented in each handler's docstring

## Support

For issues or questions:
1. Check `Docs/MCP-API-CONTRACTS.md` for API details
2. Review existing handler implementations
3. Check test files for usage examples
4. Open GitHub issue with `[MCP]` prefix

## License

See repository LICENSE file.
