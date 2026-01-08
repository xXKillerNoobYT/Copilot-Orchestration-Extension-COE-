# Example: Basic Usage

This example demonstrates the basic usage of the ContextManager module.

```typescript
import { ContextManager, StorageFormat, ContextType } from '@copilot-orchestration/context-manager';

async function main() {
  // Initialize the context manager
  const manager = new ContextManager({
    dataDir: './examples/data',
    storageFormat: StorageFormat.JSON,
    maxMemoryCache: 10, // 10MB cache
    pruningPolicy: {
      maxAge: 30,
      maxItemsPerTask: 50
    }
  });

  // Save an agent response
  console.log('Saving agent response...');
  const agentContextId = await manager.saveAgentOutput('example-task-1', {
    agentId: 'coding-agent',
    taskId: 'example-task-1',
    prompt: 'Implement a user authentication system',
    response: `I've implemented a secure authentication system with the following features:
    - JWT-based token authentication
    - Password hashing with bcrypt
    - Session management
    - OAuth2 integration ready`,
    model: 'gpt-4',
    tokensUsed: 1250,
    confidence: 0.92
  });
  console.log(`Saved with ID: ${agentContextId}`);

  // Save task completion
  console.log('\nSaving task completion...');
  const completionId = await manager.saveTaskCompletion('example-task-1', {
    taskId: 'example-task-1',
    status: 'completed',
    duration: 3600000, // 1 hour
    resourcesUsed: {
      tokens: 5000,
      memory: 256
    },
    outputs: [
      'src/auth/auth-service.ts',
      'src/auth/jwt-provider.ts',
      'tests/auth/auth.test.ts'
    ]
  });
  console.log(`Saved with ID: ${completionId}`);

  // Save architecture snapshot
  console.log('\nSaving architecture snapshot...');
  const snapshotId = await manager.saveArchitectureSnapshot('example-task-1', {
    components: [
      {
        name: 'AuthService',
        type: 'service',
        dependencies: ['JWTProvider', 'UserRepository', 'PasswordHasher'],
        description: 'Main authentication service'
      },
      {
        name: 'JWTProvider',
        type: 'utility',
        dependencies: [],
        description: 'JWT token generation and validation'
      },
      {
        name: 'UserRepository',
        type: 'repository',
        dependencies: ['Database'],
        description: 'User data access layer'
      }
    ],
    relationships: [
      { from: 'AuthService', to: 'JWTProvider', type: 'uses' },
      { from: 'AuthService', to: 'UserRepository', type: 'depends-on' },
      { from: 'UserRepository', to: 'Database', type: 'accesses' }
    ],
    notes: 'Clean architecture with clear separation of concerns'
  });
  console.log(`Saved with ID: ${snapshotId}`);

  // Query all contexts for the task
  console.log('\nRetrieving all contexts for task...');
  const allContexts = await manager.getContextForTask('example-task-1');
  console.log(`Found ${allContexts.length} contexts:`);
  allContexts.forEach(ctx => {
    console.log(`  - ${ctx.metadata.type} (${ctx.metadata.id})`);
  });

  // Query specific context types
  console.log('\nQuerying agent responses...');
  const agentResponses = await manager.queryContexts({
    type: ContextType.AGENT_RESPONSE,
    limit: 10
  });
  console.log(`Found ${agentResponses.length} agent responses`);

  // Get statistics
  console.log('\nContext statistics:');
  const stats = await manager.getStats();
  console.log(`  Total contexts: ${stats.totalContexts}`);
  console.log(`  Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`  By type:`);
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`    ${type}: ${count}`);
  }

  // Create references
  console.log('\nCreating context references...');
  const refs = await manager.getTaskReferences('example-task-1');
  console.log(`Created ${refs.length} references:`);
  refs.forEach(ref => {
    console.log(`  - ${ref.type}: ${ref.path}`);
  });

  console.log('\nExample completed successfully!');
}

main().catch(console.error);
```

Run this example:
```bash
npm run build
node dist/examples/basic-usage.js
```
