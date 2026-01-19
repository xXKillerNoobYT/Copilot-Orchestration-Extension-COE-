# LLM Timeout Configuration - Implementation Summary

## Overview

Implemented comprehensive LLM loading timeout configurations throughout the Copilot Orchestration Extension to support **slow LLM systems** where:

- Cold model load (disk → RAM/VRAM): up to ~10 minutes
- Model switch (unload A, load B): up to ~15 minutes  
- Multiple agents queue requests to different LLMs
- Timeouts are customizable from seconds to entire days

## Files Created

### Core Configuration
- **`src/config/llmTimeouts.ts`** - LLM timeout configuration system
  - 8 timeout categories (cold load, model switch, test connection, etc.)
  - Range validation (1 minute - 1 day for most)
  - Human-readable duration formatting
  - Queue wait time calculations

- **`src/config/llmTimeouts.test.ts`** - Comprehensive test suite
  - Default value tests
  - Range validation tests
  - Queue calculation tests  
  - Edge case handling

### Services
- **`src/services/llmRequestQueue.ts`** - Request queue management
  - Priority-based queueing
  - Model switch detection
  - Timeout enforcement
  - Queue overflow protection
  - Status reporting

- **`src/services/llmRequestQueue.test.ts`** - Queue service tests
  - Enqueueing and execution
  - Priority ordering
  - Model switching delays
  - Timeout handling
  - Queue overflow
  - Singleton pattern

### Documentation  
- **`LLM-TIMEOUT-CONFIGURATION.md`** - Complete user guide
  - All timeout categories explained
  - Configuration examples
  - Usage scenarios
  - Troubleshooting guide
  - API reference
  - Best practices

- **`LLM-TIMEOUT-IMPLEMENTATION-SUMMARY.md`** - This file

## Files Modified

### VS Code Extension Configuration
- **`package.json`** - Added 8 new settings
  ```json
  "copilot-orchestrator.llm.timeouts.coldLoadMs": 600000,
  "copilot-orchestrator.llm.timeouts.modelSwitchMs": 900000,
  "copilot-orchestrator.llm.timeouts.testConnectionMs": 120000,
  "copilot-orchestrator.llm.timeouts.requestMs": 30000,
  "copilot-orchestrator.llm.timeouts.queuedResponseMs": 900000,
  "copilot-orchestrator.llm.timeouts.agentActivationMs": 900000,
  "copilot-orchestrator.llm.timeouts.agentDeactivationMs": 300000,
  "copilot-orchestrator.llm.timeouts.maxQueueDepth": 20
  ```

### Settings Panel
- **`src/webviews/settingsPanel.ts`** - Test connection with timeouts
  - Imported `readLlmTimeoutConfig`
  - Applied `testConnectionMs` timeout to connection tests
  - Added progress notification for long timeouts
  - Enhanced error messages with timeout hints

### Agent Services
- **`src/services/agentLoopService.ts`** - Agent activation/deactivation with timeouts
  - Imported `readLlmTimeoutConfig` and `LlmTimeoutConfig`
  - Applied `agentActivationMs` to `startLoop()`
  - Applied `agentDeactivationMs` to `stopLoop()`
  - Added `createTimeoutPromise()` helper
  - Added `refreshTimeoutConfig()` method
  - Passed timeout config to backend (for model load/switch timeouts)

## Configuration Categories

### 1. Cold Load (600s = 10 min)
- First-time model loading from disk to RAM/VRAM
- Range: 1 minute - 1 day
- Setting: `copilot-orchestrator.llm.timeouts.coldLoadMs`

### 2. Model Switch (900s = 15 min)
- Switching between different models
- Range: 1 minute - 1 day
- Setting: `copilot-orchestrator.llm.timeouts.modelSwitchMs`

### 3. Test Connection (120s = 2 min)
- Testing LLM connectivity
- Range: 30 seconds - 10 minutes
- Setting: `copilot-orchestrator.llm.timeouts.testConnectionMs`

### 4. Standard Request (30s)
- Normal inference requests
- Range: 5 seconds - 5 minutes
- Setting: `copilot-orchestrator.llm.timeouts.requestMs`

### 5. Queued Response (900s = 15 min)
- Wait between queued requests with different models
- Range: 1 minute - 1 day
- Setting: `copilot-orchestrator.llm.timeouts.queuedResponseMs`

### 6. Agent Activation (900s = 15 min)
- Complete agent activation with model loading
- Range: 1 minute - 1 day
- Setting: `copilot-orchestrator.llm.timeouts.agentActivationMs`

### 7. Agent Deactivation (300s = 5 min)
- Complete agent deactivation with model unloading
- Range: 30 seconds - 15 minutes
- Setting: `copilot-orchestrator.llm.timeouts.agentDeactivationMs`

### 8. Max Queue Depth (20)
- Maximum queued requests before rejection
- Range: 1 - 100
- Setting: `copilot-orchestrator.llm.timeouts.maxQueueDepth`

## Usage Examples

### Test Connection with Custom Timeout
```typescript
// In settingsPanel.ts
const timeoutConfig = readLlmTimeoutConfig();
const testTimeout = timeoutConfig.config.testConnectionMs;

await vscode.window.withProgress({
  title: `Testing connection (timeout: ${Math.floor(testTimeout/60000)} minutes)...`,
}, async () => {
  return await Promise.race([
    provider.testConnection(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), testTimeout)
    )
  ]);
});
```

### Agent Activation with Timeout
```typescript
// In agentLoopService.ts
const timeoutMs = this.timeoutConfig.agentActivationMs;

const response = await Promise.race([
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ 
      model_load_timeout: this.timeoutConfig.coldLoadMs,
      model_switch_timeout: this.timeoutConfig.modelSwitchMs,
    }),
  }),
  this.createTimeoutPromise(timeoutMs, 'Agent activation'),
]);
```

### Request Queue Management
```typescript
import { LlmRequestQueue } from './services/llmRequestQueue';

const queue = LlmRequestQueue.getInstance();

// Enqueue with priority
const result = await queue.enqueue({
  id: 'req-123',
  agentId: 'agent-auto-zen',
  modelName: 'llama-70b',
  priority: 10,
  execute: async () => {
    return await llmProvider.chat({ messages: [...] });
  }
});

// Check status
const status = queue.getStatus();
console.log(`Queue: ${status.queueDepth} requests`);
console.log(`Wait: ${status.estimatedWaitTime}`);
```

## Queue Wait Time Calculations

With default settings:
- **Queue depth**: 20 requests
- **Response time**: 15 minutes per request
- **Total wait**: 20 × 15min = **5 hours**

With increased queue depth:
- **Queue depth**: 50 requests (custom)
- **Response time**: 1 hour per request (custom)
- **Total wait**: 50 × 1h = **50 hours (~2 days)**

## Error Messaging

### Timeout Errors
```
Connection test timeout after 120s. This may indicate:
• Model is still loading (can take up to 10 minutes for cold load)
• Network connectivity issues
• Server is not responding
You can increase the timeout in settings: copilot-orchestrator.llm.timeouts.testConnectionMs
```

### Queue Overflow
```
Queue full: 20/20 requests. Estimated wait time: ~5h 0m (20 requests @ 15 minutes each)
```

## Integration Points

### Where Timeouts Apply

1. **Settings Panel → Test Connection**
   - Uses `testConnectionMs`
   - Shows progress with timeout duration
   - Provides actionable error messages

2. **Agent Loop → Start/Stop**
   - Uses `agentActivationMs` and `agentDeactivationMs`
   - Passes model load/switch timeouts to backend
   - Handles timeout errors gracefully

3. **Request Queue → Request Processing**
   - Uses `requestMs` for individual requests
   - Uses `modelSwitchMs` when switching models
   - Uses `queuedResponseMs` between responses
   - Enforces `maxQueueDepth` limit

4. **Future: MCP Client** (not yet implemented)
   - Can use `requestMs` for MCP calls
   - Can use queue for concurrent MCP requests

## Testing

### Test Coverage

- **llmTimeouts.test.ts**: 12 test cases
  - Default configuration
  - Custom values
  - Range validation (min/max)
  - Invalid values
  - Queue calculations
  - Duration formatting

- **llmRequestQueue.test.ts**: 15 test cases  
  - Request enqueueing
  - Priority ordering
  - Model switching
  - Timeouts
  - Queue overflow
  - Clear/refresh operations
  - Edge cases

### Running Tests
```bash
cd vscode-extension
npm test -- llmTimeouts.test.ts
npm test -- llmRequestQueue.test.ts
```

## Backward Compatibility

✅ **Fully backward compatible**
- All settings have defaults
- Existing installations work without changes
- No breaking changes to APIs
- Progressive enhancement only

## Future Enhancements

Potential improvements documented in `LLM-TIMEOUT-CONFIGURATION.md`:

- [ ] Dynamic timeout adjustment based on observed performance
- [ ] Per-model timeout overrides
- [ ] Queue priority levels (currently basic priority sorting)
- [ ] Parallel execution for independent models  
- [ ] Automatic queue balancing
- [ ] Timeout metrics and analytics
- [ ] Backend integration for model load/unload tracking

## Configuration Examples

### Fast System (GPU, Low Latency)
```json
{
  "copilot-orchestrator.llm.timeouts.coldLoadMs": 60000,      // 1 minute
  "copilot-orchestrator.llm.timeouts.modelSwitchMs": 120000,  // 2 minutes
  "copilot-orchestrator.llm.timeouts.requestMs": 10000        // 10 seconds
}
```

### Slow System (CPU Only, Remote)
```json
{
  "copilot-orchestrator.llm.timeouts.coldLoadMs": 1800000,    // 30 minutes
  "copilot-orchestrator.llm.timeouts.modelSwitchMs": 2700000, // 45 minutes
  "copilot-orchestrator.llm.timeouts.requestMs": 120000       // 2 minutes
}
```

### Extreme Slow System (24-hour tolerance)
```json
{
  "copilot-orchestrator.llm.timeouts.coldLoadMs": 3600000,    // 1 hour
  "copilot-orchestrator.llm.timeouts.modelSwitchMs": 5400000, // 1.5 hours
  "copilot-orchestrator.llm.timeouts.queuedResponseMs": 3600000, // 1 hour
  "copilot-orchestrator.llm.timeouts.maxQueueDepth": 100
}
```

## API Exports

### From `llmTimeouts.ts`
```typescript
export interface LlmTimeoutConfig { ... }
export interface LlmTimeoutState { ... }
export function readLlmTimeoutConfig(options?: { configuration?: ConfigLike }): LlmTimeoutState
export function calculateQueueWaitTime(queueDepth: number, responseTimeMs: number): number
export function getQueueWaitEstimate(queueDepth: number, config: LlmTimeoutConfig): string
export const LLM_TIMEOUT_DEFAULTS: LlmTimeoutConfig
export const LLM_TIMEOUT_RANGES: { ... }
```

### From `llmRequestQueue.ts`
```typescript
export interface QueuedRequest<T> { ... }
export interface QueueStatus { ... }
export class LlmRequestQueue {
  async enqueue<T>(request: ...): Promise<T>
  getStatus(): QueueStatus
  clear(): void
  refreshConfig(): void
  static getInstance(): LlmRequestQueue
}
```

## Documentation

User-facing documentation in `LLM-TIMEOUT-CONFIGURATION.md`:
- ✅ Complete timeout category reference
- ✅ Configuration examples (fast/slow/extreme systems)
- ✅ Usage scenarios with code examples
- ✅ Troubleshooting guide
- ✅ Error message reference
- ✅ Best practices
- ✅ API reference

## Summary

This implementation provides a **production-ready** timeout configuration system that:

✅ Supports **very slow LLM systems** (up to 1 day timeouts)  
✅ Handles **multiple agents with different models** via request queuing  
✅ Provides **detailed error messages** with configuration hints  
✅ Maintains **full backward compatibility**  
✅ Includes **comprehensive testing** (27 test cases)  
✅ Has **complete documentation** for users and developers  
✅ Follows **VS Code extension best practices**  
✅ Integrates seamlessly with existing code

The system is designed for the specific use case described: slow LLM loading (10-15 minutes) with multiple agents queuing requests that may take 10-15 minutes each to process.
