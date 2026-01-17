# GitHub Copilot Agent Mode API Integration

## Overview

This document describes the integration of GitHub Copilot's Agent Mode API into the Copilot Orchestration Extension. The integration enables advanced agent orchestration, task handoff, and agent-to-agent communication capabilities.

## Architecture

### Components

1. **CopilotAgentClient** (`src/services/copilotAgentClient.ts`)
   - Main client for interacting with GitHub Copilot Agent Mode API
   - Handles authentication, agent registration, and task execution
   - Supports both mock mode (for development/testing) and production mode

2. **TaskExecutor Integration** (`src/taskExecutor.ts`)
   - Extended to support GitHub Copilot Agent Mode as an execution backend
   - Graceful fallback to simulated responses when API is unavailable
   - Priority system: LLM Handler > Copilot Agent Mode > Simulated Response

### Key Features

#### 1. Authentication & Connection Management
- Token-based authentication with GitHub Copilot API
- Automatic session management
- Connection state tracking

#### 2. Agent Registration
- Register local agents with GitHub Copilot infrastructure
- Advertise agent capabilities and roles
- Unique agent identification

#### 3. Task Handoff Protocol
- Transfer tasks between agents
- Context preservation during handoff
- Handoff tracking and auditing

#### 4. Agent Discovery
- Find available agents in the network
- Query agent capabilities
- Dynamic agent selection

#### 5. Task Execution
- Execute tasks via GitHub Copilot agents
- Stream responses and results
- Execution metadata and metrics

## Configuration

### VS Code Settings

The integration uses existing VS Code settings for configuration:

```json
{
  "copilot-orchestrator.mcp.baseUrl": "https://api.github.com/copilot",
  "copilot-orchestrator.mcp.authToken": "your-github-token",
  "copilot-orchestrator.llm.timeoutMs": 30000
}
```

### TaskExecutor Options

Enable Copilot Agent Mode when creating a TaskExecutor instance:

```typescript
import { TaskExecutor } from './taskExecutor';
import { CopilotAgentClient } from './services/copilotAgentClient';

const client = new CopilotAgentClient({
  baseUrl: 'https://api.github.com/copilot',
  authToken: process.env.GITHUB_TOKEN,
  mockMode: false, // Set to true for testing
});

const executor = new TaskExecutor({
  useCopilotAgentMode: true,
  copilotAgentClient: client,
  workspaceRoot: '/path/to/workspace',
});
```

## Usage Examples

### Basic Task Execution

```typescript
// Initialize the executor with Copilot Agent Mode
const executor = new TaskExecutor({
  useCopilotAgentMode: true,
  copilotAgentClient: new CopilotAgentClient(),
});

// Load tasks and execute
await executor.loadTasks();
const result = await executor.executeNextTask();

if (result?.success) {
  console.log('Task completed:', result.output);
}
```

### Agent Registration

```typescript
const client = new CopilotAgentClient();

// Authenticate
await client.authenticate();

// Register agent
await client.registerAgent({
  agentId: 'my-custom-agent',
  name: 'Custom Agent',
  role: 'code',
  capabilities: ['code-generation', 'refactoring'],
});
```

### Task Handoff

```typescript
const client = new CopilotAgentClient();

// Handoff task from one agent to another
const handoff = await client.handoffTask({
  taskId: 'TASK-123',
  fromAgent: 'planner-agent',
  toAgent: 'coder-agent',
  context: {
    planDetails: 'Implementation plan...',
    requirements: ['REQ-1', 'REQ-2'],
  },
  reason: 'Planning complete, ready for implementation',
});

console.log('Handoff ID:', handoff.handoffId);
```

### Agent Discovery

```typescript
const client = new CopilotAgentClient();

// Discover available agents
const agents = await client.discoverAgents();

agents.forEach(agent => {
  console.log(`Agent: ${agent.name}`);
  console.log(`Role: ${agent.role}`);
  console.log(`Capabilities: ${agent.capabilities.join(', ')}`);
});
```

## Mock Mode vs Production Mode

### Mock Mode (Development/Testing)

When `mockMode: true` is set, the client simulates GitHub Copilot responses without making actual API calls:

```typescript
const client = new CopilotAgentClient({ mockMode: true });
```

**Benefits:**
- No API credentials required
- Instant responses
- Predictable behavior for testing
- No rate limits

**Use Cases:**
- Unit testing
- Integration testing
- Local development
- CI/CD pipelines

### Production Mode

When `mockMode: false`, the client makes real API calls to GitHub Copilot:

```typescript
const client = new CopilotAgentClient({
  mockMode: false,
  baseUrl: 'https://api.github.com/copilot',
  authToken: process.env.GITHUB_TOKEN,
});
```

**Requirements:**
- Valid GitHub authentication token
- Network access to GitHub API
- Proper API permissions

## Error Handling & Fallbacks

The integration includes comprehensive error handling with automatic fallbacks:

### Fallback Hierarchy

1. **Primary:** GitHub Copilot Agent Mode API
2. **Secondary:** Custom LLM Handler (if configured)
3. **Tertiary:** Simulated Response

### Example Error Scenarios

#### Authentication Failure
```typescript
// If authentication fails, falls back to simulated response
const result = await executor.executeNextTask();
// Result will contain simulated output with warning
```

#### Network Error
```typescript
// Network issues trigger automatic fallback
try {
  const result = await client.executeTask(request);
} catch (error) {
  // Error logged, simulated response returned
}
```

#### Rate Limiting
```typescript
// Rate limit errors are caught and logged
// System falls back gracefully to alternative execution methods
```

## Testing

### Running Tests

```bash
# Run all Copilot Agent Mode tests
npm run test:jest src/services/copilotAgentClient.test.ts
npm run test:jest src/taskExecutor.copilot.test.ts

# Run all tests
npm run test:jest
```

### Test Coverage

The integration includes 34 comprehensive tests covering:

- ✅ Client configuration and initialization
- ✅ Authentication flow
- ✅ Agent registration
- ✅ Agent discovery
- ✅ Task handoff
- ✅ Task execution
- ✅ Connection state management
- ✅ Error handling and fallbacks
- ✅ TaskExecutor integration
- ✅ Feature flags and configuration

## API Reference

### CopilotAgentClient

#### Constructor

```typescript
new CopilotAgentClient(config?: CopilotAgentConfig)
```

**Parameters:**
- `config.baseUrl` (string, optional): Base URL for GitHub Copilot API
- `config.authToken` (string, optional): Authentication token
- `config.timeout` (number, optional): Request timeout in milliseconds
- `config.mockMode` (boolean, optional): Enable mock mode for testing

#### Methods

##### authenticate()
```typescript
async authenticate(): Promise<boolean>
```
Authenticate with GitHub Copilot Agent Mode API.

##### registerAgent()
```typescript
async registerAgent(registration: AgentRegistration): Promise<boolean>
```
Register an agent with the agent network.

##### discoverAgents()
```typescript
async discoverAgents(): Promise<AgentRegistration[]>
```
Discover available agents in the network.

##### handoffTask()
```typescript
async handoffTask(request: AgentHandoffRequest): Promise<AgentHandoffResponse>
```
Handoff a task to another agent.

##### executeTask()
```typescript
async executeTask(request: AgentExecutionRequest): Promise<AgentExecutionResponse>
```
Execute a task using a specific agent.

##### isConnected()
```typescript
isConnected(): boolean
```
Check if client is authenticated and registered.

##### getCurrentAgentId()
```typescript
getCurrentAgentId(): string | null
```
Get the current registered agent ID.

### TaskExecutor Options

```typescript
interface TaskExecutorOptions {
  useCopilotAgentMode?: boolean;      // Enable Copilot Agent Mode
  copilotAgentClient?: CopilotAgentClient;  // Custom client instance
  llmHandler?: LLMHandler;            // Custom LLM handler
  enableVerification?: boolean;       // Enable verification
  // ... other options
}
```

## Benefits

### 1. Native GitHub Copilot Integration
- Seamless integration with GitHub ecosystem
- Access to advanced Copilot capabilities
- Official API support

### 2. Better Agent Coordination
- Standardized agent communication
- Centralized agent registry
- Improved task routing

### 3. Enhanced Task Handoff
- Reliable context transfer
- Auditable handoff history
- Reduced coordination overhead

### 4. Improved Context Sharing
- Shared context across agents
- Better information flow
- Reduced duplication

## Future Enhancements

### Planned Features

1. **Agent-to-Agent Messaging**
   - Direct communication between agents
   - Broadcast messages to agent groups
   - Message queuing and routing

2. **Advanced Handoff Strategies**
   - Conditional handoffs based on task state
   - Multi-agent collaboration
   - Parallel task distribution

3. **Performance Monitoring**
   - Agent performance metrics
   - Response time tracking
   - Success rate analysis

4. **Enhanced Error Recovery**
   - Retry strategies for failed requests
   - Circuit breaker pattern
   - Automatic fallback selection

### API Evolution

As GitHub Copilot Agent Mode API evolves, the integration will be updated to support:
- Streaming responses
- Webhooks for async notifications
- Advanced authentication methods
- Enhanced agent capabilities

## Troubleshooting

### Common Issues

#### Issue: Authentication Fails
**Solution:** Verify your GitHub token has appropriate permissions and is not expired.

#### Issue: Agent Registration Fails
**Solution:** Check network connectivity and ensure the baseUrl is correct.

#### Issue: Tasks Execute But Return Simulated Responses
**Solution:** Verify `mockMode` is set to `false` and authentication succeeded.

#### Issue: TypeScript Compilation Errors
**Solution:** Ensure all test files use proper TypeScript types from `taskParser.ts`.

### Debug Mode

Enable verbose logging:

```typescript
const client = new CopilotAgentClient({
  mockMode: true, // Use mock mode to see detailed logs
});
```

## Migration Guide

### From Simulated Responses

1. Update TaskExecutor configuration:
```typescript
// Before
const executor = new TaskExecutor();

// After
const executor = new TaskExecutor({
  useCopilotAgentMode: true,
  copilotAgentClient: new CopilotAgentClient({
    mockMode: false,
    authToken: process.env.GITHUB_TOKEN,
  }),
});
```

2. Test with mock mode first:
```typescript
const executor = new TaskExecutor({
  useCopilotAgentMode: true,
  copilotAgentClient: new CopilotAgentClient({
    mockMode: true, // Test locally first
  }),
});
```

3. Deploy to production:
```typescript
const executor = new TaskExecutor({
  useCopilotAgentMode: true,
  copilotAgentClient: new CopilotAgentClient({
    mockMode: false,
    authToken: process.env.GITHUB_TOKEN,
  }),
});
```

## Contributing

When contributing to this integration:

1. Add tests for new features
2. Update this documentation
3. Follow existing code patterns
4. Ensure backward compatibility
5. Test in both mock and production modes

## License

This integration is part of the Copilot Orchestration Extension and follows the same license terms.

## Support

For issues and questions:
- Create an issue in the repository
- Reference the Copilot Agent Mode API documentation
- Check the troubleshooting section above

---

**Last Updated:** January 17, 2026
**Version:** 1.0.0
**Status:** Implemented and Tested
