# ContextManager Setup Guide

## Quick Setup

1. **Navigate to the context-manager directory:**
   ```bash
   cd context-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## Verify Installation

After building, you should see:
- `dist/` directory with compiled JavaScript and type definitions
- All tests passing (if you run `npm test`)

## Usage in Your Project

### Option 1: Direct Import (Development)

```typescript
import { ContextManager, StorageFormat } from './context-manager/src';

const manager = new ContextManager({
  dataDir: './data/contexts',
  storageFormat: StorageFormat.JSON
});
```

### Option 2: Link as Local Package

```bash
cd context-manager
npm link

cd ../your-project
npm link @copilot-orchestration/context-manager
```

Then in your code:
```typescript
import { ContextManager, StorageFormat } from '@copilot-orchestration/context-manager';
```

## Basic Test Run

Create a test file `test-context.ts`:

```typescript
import { ContextManager, StorageFormat } from './src';

async function test() {
  const manager = new ContextManager({
    dataDir: './test-data',
    storageFormat: StorageFormat.JSON
  });

  // Save a test context
  const id = await manager.saveAgentOutput('test-task', {
    agentId: 'test-agent',
    taskId: 'test-task',
    prompt: 'Hello',
    response: 'World'
  });

  console.log('Saved context:', id);

  // Retrieve it
  const contexts = await manager.getContextForTask('test-task');
  console.log('Retrieved contexts:', contexts.length);

  // Get stats
  const stats = await manager.getStats();
  console.log('Stats:', stats);
}

test().catch(console.error);
```

Run it:
```bash
npm run build && node dist/test-context.js
```

## Integration with Main Project

The ContextManager can be integrated with your Laravel backend:

1. **Create a Node.js service** that exposes the ContextManager via HTTP/gRPC
2. **Use it in Laravel** by making HTTP calls or using a queue system
3. **Or embed it in your VS Code extension** for local context management

## Troubleshooting

### TypeScript errors about 'zod' or 'yaml'
Run `npm install` to ensure all dependencies are installed.

### Permission errors
Ensure the data directory is writable:
```bash
chmod -R 755 ./data
```

### Module not found
Make sure you've built the project:
```bash
npm run build
```

## Next Steps

- Review the [README.md](README.md) for detailed API documentation
- Check [EXAMPLES.md](EXAMPLES.md) for usage examples
- Run the test suite to see all features in action
- Integrate with your task orchestration system
