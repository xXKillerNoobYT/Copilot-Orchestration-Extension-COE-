# ContextManager

A robust TypeScript module for managing contextual data in orchestrated task systems. Handles loading, saving, pruning, and referencing various types of context including architecture snapshots, task completions, intermediate outputs, and agent responses.

## Features

- **Type-safe context management** with full TypeScript support
- **Multiple storage formats**: JSON and YAML with automatic serialization
- **Memory-safe operations** with bounded context and automatic pruning
- **Flexible querying** with filtering by task, type, date range, and tags
- **Memory caching** with configurable size limits
- **Comprehensive pruning policies** for managing storage lifecycle
- **Validation** using Zod schemas for runtime type safety

## Installation

```bash
cd context-manager
npm install
```

## Quick Start

```typescript
import { ContextManager, StorageFormat, ContextType } from '@copilot-orchestration/context-manager';

// Create a context manager instance
const manager = new ContextManager({
  dataDir: './data/contexts',
  storageFormat: StorageFormat.JSON,
  maxMemoryCache: 10, // MB
  pruningPolicy: {
    maxAge: 30, // days
    maxSizePerTask: 100 * 1024 * 1024, // 100MB
    maxTotalSize: 1024 * 1024 * 1024 // 1GB
  }
});

// Save an agent response
const contextId = await manager.saveAgentOutput('task-123', {
  agentId: 'agent-1',
  taskId: 'task-123',
  prompt: 'Analyze the code structure',
  response: 'The code follows a modular architecture...',
  tokensUsed: 150
});

// Get all contexts for a task
const contexts = await manager.getContextForTask('task-123');

// Query with filters
const recentAgentResponses = await manager.queryContexts({
  type: ContextType.AGENT_RESPONSE,
  fromDate: new Date('2026-01-01'),
  limit: 10
});

// Prune old contexts
const result = await manager.prune();
console.log(`Removed ${result.removed} contexts, freed ${result.freedSpace} bytes`);
```

## Core APIs

### ContextManager

#### `getContextForTask(taskId: string): Promise<ContextData[]>`

Retrieves all contexts associated with a specific task.

```typescript
const contexts = await manager.getContextForTask('task-456');
console.log(`Found ${contexts.length} contexts for task-456`);
```

#### `saveAgentOutput(taskId: string, output: Omit<AgentResponse, 'metadata'>): Promise<string>`

Saves an agent's response and returns the generated context ID.

```typescript
const contextId = await manager.saveAgentOutput('task-789', {
  agentId: 'coder-agent',
  taskId: 'task-789',
  prompt: 'Implement feature X',
  response: 'Feature implemented with the following changes...',
  model: 'gpt-4',
  tokensUsed: 2500,
  confidence: 0.95
});
```

#### `saveTaskCompletion(taskId: string, completion: Omit<TaskCompletion, 'metadata'>): Promise<string>`

Records a task completion event.

```typescript
await manager.saveTaskCompletion('task-101', {
  taskId: 'task-101',
  status: 'completed',
  duration: 3600000, // 1 hour in ms
  resourcesUsed: {
    cpu: 45.2,
    memory: 512,
    tokens: 5000
  },
  outputs: ['feature-x.ts', 'feature-x.test.ts']
});
```

#### `saveIntermediateOutput(taskId: string, output: Omit<IntermediateOutput, 'metadata'>): Promise<string>`

Stores intermediate results during task execution.

```typescript
await manager.saveIntermediateOutput('task-202', {
  taskId: 'task-202',
  step: 'analysis',
  data: {
    filesAnalyzed: 42,
    issuesFound: 3,
    suggestions: ['refactor X', 'optimize Y']
  },
  isPartial: true,
  continuationToken: 'next-step-token'
});
```

#### `saveArchitectureSnapshot(taskId: string, snapshot: Omit<ArchitectureSnapshot, 'metadata'>): Promise<string>`

Captures the current architecture state.

```typescript
await manager.saveArchitectureSnapshot('task-303', {
  components: [
    {
      name: 'UserService',
      type: 'service',
      dependencies: ['UserRepository', 'EmailService']
    },
    {
      name: 'UserRepository',
      type: 'repository',
      dependencies: ['Database']
    }
  ],
  relationships: [
    { from: 'UserService', to: 'UserRepository', type: 'depends-on' },
    { from: 'UserService', to: 'EmailService', type: 'depends-on' }
  ],
  notes: 'Clean architecture pattern with dependency injection'
});
```

#### `queryContexts(query: ContextQuery): Promise<ContextData[]>`

Performs flexible queries across all contexts.

```typescript
// Find all agent responses from last week
const recentResponses = await manager.queryContexts({
  type: ContextType.AGENT_RESPONSE,
  fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  limit: 50
});

// Find contexts with specific tags
const taggedContexts = await manager.queryContexts({
  tags: ['important', 'review-needed'],
  includeExpired: false
});
```

#### `prune(): Promise<{ removed: number; freedSpace: number; errors: string[] }>`

Executes pruning based on configured policies.

```typescript
const result = await manager.prune();
console.log(`Pruning completed:`);
console.log(`- Removed: ${result.removed} contexts`);
console.log(`- Freed: ${formatBytes(result.freedSpace)}`);
console.log(`- Errors: ${result.errors.length}`);
```

#### `getStats(): Promise<ContextStats>`

Returns comprehensive statistics about stored contexts.

```typescript
const stats = await manager.getStats();
console.log(`Total contexts: ${stats.totalContexts}`);
console.log(`Total size: ${formatBytes(stats.totalSize)}`);
console.log(`By type:`, stats.byType);
console.log(`By task:`, stats.byTask);
console.log(`Date range: ${stats.oldestContext} to ${stats.newestContext}`);
```

## Context Types

### ArchitectureSnapshot
Captures the system architecture at a point in time.

```typescript
interface ArchitectureSnapshot {
  metadata: ContextMetadata;
  components: Array<{
    name: string;
    type: string;
    dependencies: string[];
    description?: string;
  }>;
  relationships: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  notes?: string;
}
```

### TaskCompletion
Records task completion details and results.

```typescript
interface TaskCompletion {
  metadata: ContextMetadata;
  taskId: string;
  status: 'completed' | 'failed' | 'cancelled';
  result?: any;
  duration?: number;
  resourcesUsed?: {
    cpu?: number;
    memory?: number;
    tokens?: number;
  };
  outputs?: string[];
  errors?: string[];
}
```

### IntermediateOutput
Stores partial results during task execution.

```typescript
interface IntermediateOutput {
  metadata: ContextMetadata;
  taskId: string;
  step: string;
  data: any;
  isPartial: boolean;
  continuationToken?: string;
}
```

### AgentResponse
Records AI agent interactions.

```typescript
interface AgentResponse {
  metadata: ContextMetadata;
  agentId: string;
  taskId: string;
  prompt: string;
  response: string;
  model?: string;
  tokensUsed?: number;
  confidence?: number;
}
```

## Storage Formats

### JSON Storage
Fast and widely compatible. Best for programmatic access.

```typescript
const manager = new ContextManager({
  dataDir: './data',
  storageFormat: StorageFormat.JSON
});
```

### YAML Storage
Human-readable format. Best for manual inspection and editing.

```typescript
const manager = new ContextManager({
  dataDir: './data',
  storageFormat: StorageFormat.YAML
});
```

Both formats:
- Preserve Date objects correctly
- Handle nested structures
- Support serialization of complex types

## Pruning Policies

Configure automatic context cleanup to manage storage:

```typescript
const manager = new ContextManager({
  dataDir: './data',
  storageFormat: StorageFormat.JSON,
  pruningPolicy: {
    // Remove contexts older than 30 days
    maxAge: 30,
    
    // Limit per-task storage to 100MB
    maxSizePerTask: 100 * 1024 * 1024,
    
    // Global storage limit of 1GB
    maxTotalSize: 1024 * 1024 * 1024,
    
    // Keep at most 100 contexts per task
    maxItemsPerTask: 100,
    
    // Never remove these types (even if old)
    keepTypes: [ContextType.ARCHITECTURE_SNAPSHOT]
  }
});
```

## Advanced Usage

### Custom Metadata and Expiration

```typescript
const contextId = await manager.saveAgentOutput('task-1', {
  agentId: 'agent-1',
  taskId: 'task-1',
  prompt: 'Test',
  response: 'Response'
});

// Load and update metadata
const context = await manager.loadContext(contextId);
if (context) {
  // Set expiration
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); // Expires in 7 days
  context.metadata.expiresAt = expiryDate;
  
  // Add tags
  context.metadata.tags = ['temporary', 'test', 'review'];
  
  await manager.saveContext(context);
}
```

### Context References

Create lightweight references to contexts:

```typescript
// Create reference
const ref = await manager.createReference(contextId);

// Get all references for a task
const refs = await manager.getTaskReferences('task-123');

refs.forEach(ref => {
  console.log(`${ref.type}: ${ref.path} (${ref.timestamp})`);
});
```

### Memory Cache Management

```typescript
const manager = new ContextManager({
  dataDir: './data',
  storageFormat: StorageFormat.JSON,
  maxMemoryCache: 50 // 50MB cache
});

// Clear cache manually when needed
manager.clearCache();
```

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Linting

```bash
npm run lint
```

## Directory Structure

```
context-manager/
├── src/
│   ├── context-manager.ts    # Main ContextManager class
│   ├── types.ts               # Type definitions
│   ├── validation.ts          # Zod schemas
│   ├── utils.ts               # Utility functions
│   ├── pruner.ts              # Pruning service
│   ├── storage/
│   │   ├── base.ts            # Base adapter
│   │   ├── json-adapter.ts    # JSON storage
│   │   ├── yaml-adapter.ts    # YAML storage
│   │   └── index.ts           # Exports
│   └── index.ts               # Main exports
├── tests/
│   ├── context-manager.test.ts
│   ├── storage.test.ts
│   └── pruner.test.ts
├── data/                      # Runtime data directory
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0

## License

MIT
