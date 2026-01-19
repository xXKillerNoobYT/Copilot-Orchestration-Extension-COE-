# LLM Loading Timeout Configuration

## Overview

The Copilot Orchestration Extension now supports comprehensive timeout configurations designed for **slow LLM systems** where model loading can take significant time. This is essential when:

- Models must be loaded from disk to RAM/VRAM (cold load: ~10 minutes)
- Models are switched between agents (unload + load: ~15 minutes)
- Multiple agents queue requests to shared LLM resources
- Running on resource-constrained hardware or remote servers

## Timeout Categories

### 1. Cold Load Timeout (`coldLoadMs`)
- **Purpose**: First-time model loading from disk to RAM/VRAM
- **Default**: 600,000ms (10 minutes)
- **Range**: 1 minute - 1 day
- **Applies to**: Initial model loading, system startup

### 2. Model Switch Timeout (`modelSwitchMs`)
- **Purpose**: Switching between different models (unload A, load B)
- **Default**: 900,000ms (15 minutes)
- **Range**: 1 minute - 1 day
- **Applies to**: Agent activation/deactivation, model changes

### 3. Test Connection Timeout (`testConnectionMs`)
- **Purpose**: Testing LLM connectivity and responsiveness
- **Default**: 120,000ms (2 minutes)
- **Range**: 30 seconds - 10 minutes
- **Applies to**: Settings panel "Test Connection" button

### 4. Standard Request Timeout (`requestMs`)
- **Purpose**: Normal inference requests
- **Default**: 30,000ms (30 seconds)
- **Range**: 5 seconds - 5 minutes
- **Applies to**: Standard chat completions, API calls

### 5. Queued Response Timeout (`queuedResponseMs`)
- **Purpose**: Wait time between queued requests when multiple agents use different LLMs
- **Default**: 900,000ms (15 minutes)
- **Range**: 1 minute - 1 day
- **Applies to**: Multi-agent scenarios with request queuing

### 6. Agent Activation Timeout (`agentActivationMs`)
- **Purpose**: Complete agent activation including model loading
- **Default**: 900,000ms (15 minutes)
- **Range**: 1 minute - 1 day
- **Applies to**: Starting the agent loop, activating agents

### 7. Agent Deactivation Timeout (`agentDeactivationMs`)
- **Purpose**: Complete agent deactivation including model unloading
- **Default**: 300,000ms (5 minutes)
- **Range**: 30 seconds - 15 minutes
- **Applies to**: Stopping the agent loop, deactivating agents

### 8. Max Queue Depth (`maxQueueDepth`)
- **Purpose**: Maximum number of queued requests before rejection
- **Default**: 20
- **Range**: 1 - 100
- **Applies to**: Request queue management

## Configuration

### VS Code Settings

Add to `.vscode/settings.json` or configure via UI:

```json
{
  "copilot-orchestrator.llm.timeouts.coldLoadMs": 600000,
  "copilot-orchestrator.llm.timeouts.modelSwitchMs": 900000,
  "copilot-orchestrator.llm.timeouts.testConnectionMs": 120000,
  "copilot-orchestrator.llm.timeouts.requestMs": 30000,
  "copilot-orchestrator.llm.timeouts.queuedResponseMs": 900000,
  "copilot-orchestrator.llm.timeouts.agentActivationMs": 900000,
  "copilot-orchestrator.llm.timeouts.agentDeactivationMs": 300000,
  "copilot-orchestrator.llm.timeouts.maxQueueDepth": 20
}
```

### Extreme Slow System Example

For very slow systems (e.g., CPU-only inference on large models):

```json
{
  "copilot-orchestrator.llm.timeouts.coldLoadMs": 3600000,        // 1 hour
  "copilot-orchestrator.llm.timeouts.modelSwitchMs": 5400000,     // 1.5 hours
  "copilot-orchestrator.llm.timeouts.testConnectionMs": 600000,   // 10 minutes
  "copilot-orchestrator.llm.timeouts.requestMs": 300000,          // 5 minutes
  "copilot-orchestrator.llm.timeouts.queuedResponseMs": 3600000,  // 1 hour
  "copilot-orchestrator.llm.timeouts.agentActivationMs": 5400000, // 1.5 hours
  "copilot-orchestrator.llm.timeouts.agentDeactivationMs": 900000,// 15 minutes
  "copilot-orchestrator.llm.timeouts.maxQueueDepth": 50
}
```

## Request Queuing

### How It Works

When multiple agents use different LLMs, requests are queued and processed sequentially:

1. **Agent A** sends request (uses Model X)
2. **Agent B** sends request (uses Model Y) → **queued**
3. Agent A's request completes
4. **Wait time** (configured by `queuedResponseMs`)
5. **Model switch** from X to Y (takes `modelSwitchMs`)
6. Agent B's request executes

### Queue Wait Time Calculation

With 20 queued requests and 15-minute `queuedResponseMs`:
- **Total wait time**: 20 × 15 minutes = **5 hours**

The system provides real-time estimates:
```
Queue Status:
  Depth: 20 requests
  Current Model: llama-70b
  Estimated Wait: ~5h 0m (20 requests @ 15 minutes each)
```

### Queue Management

```typescript
import { LlmRequestQueue } from './services/llmRequestQueue';

const queue = LlmRequestQueue.getInstance();

// Enqueue a request
const result = await queue.enqueue({
  id: 'req-123',
  agentId: 'agent-auto-zen',
  modelName: 'llama-70b',
  priority: 1,
  execute: async () => {
    return await llmProvider.chat({ messages: [...] });
  }
});

// Check queue status
const status = queue.getStatus();
console.log(`Queue depth: ${status.queueDepth}`);
console.log(`Estimated wait: ${status.estimatedWaitTime}`);
```

## Usage Scenarios

### Scenario 1: Test Connection with Cold Model

```
User clicks "Test Connection"
  ↓
System applies testConnectionMs (2 minutes default)
  ↓
If model is cold loading:
  - Shows progress: "Testing connection (timeout: 2 minutes)..."
  - Waits up to 2 minutes
  - If timeout: Suggests increasing timeout in settings
```

### Scenario 2: Multi-Agent Task Execution

```
Agent A (Planning) activates
  ↓
Loads Model X (10 minutes - coldLoadMs)
  ↓
Executes tasks...
  ↓
Agent B (Verification) needs to activate
  ↓
Switches Model X → Model Y (15 minutes - modelSwitchMs)
  ↓
Agent B executes tasks...
```

### Scenario 3: Request Queue Overflow

```
20 agents send requests (maxQueueDepth = 20)
  ↓
21st request arrives
  ↓
Rejected with error:
"Queue full: 20/20 requests. Estimated wait time: ~5h 0m"
```

## Error Messages

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

### Agent Activation Timeout

```
Agent activation timeout after 900000ms. This may indicate model loading delays. 
You can increase timeouts in settings: copilot-orchestrator.llm.timeouts
```

## API Reference

### Configuration Reading

```typescript
import { readLlmTimeoutConfig } from './config/llmTimeouts';

const state = readLlmTimeoutConfig();

if (state.isValid) {
  console.log('Cold load timeout:', state.config.coldLoadMs);
} else {
  console.error('Configuration issues:', state.issues);
}
```

### Queue Operations

```typescript
import { LlmRequestQueue } from './services/llmRequestQueue';

const queue = LlmRequestQueue.getInstance();

// Enqueue
const result = await queue.enqueue({
  id: 'req-123',
  agentId: 'agent-1',
  modelName: 'gpt-4',
  priority: 1,
  execute: async () => { /* ... */ }
});

// Status
const status = queue.getStatus();

// Clear queue
queue.clear();

// Refresh config
queue.refreshConfig();
```

## Best Practices

### 1. Start with Defaults
Use default timeouts initially and increase only if experiencing timeouts.

### 2. Monitor Queue Depth
Check `queue.getStatus()` regularly to avoid overflow.

### 3. Adjust for Hardware
- **Fast systems** (GPU, low latency): Use defaults
- **Slow systems** (CPU only, remote): Increase all timeouts
- **Very slow systems**: Consider using up to 1-day timeouts

### 4. Balance Queue Depth vs. Wait Time
- Higher `maxQueueDepth` = longer total wait times
- Lower `queuedResponseMs` = faster processing but less time for model switching

### 5. Test Configuration
Use "Test Connection" after changing timeouts to verify settings work.

## Troubleshooting

### Problem: Connection tests always timeout

**Solution**: Increase `testConnectionMs`:
```json
{
  "copilot-orchestrator.llm.timeouts.testConnectionMs": 600000  // 10 minutes
}
```

### Problem: Agents fail to activate

**Solution**: Increase `agentActivationMs` and `coldLoadMs`:
```json
{
  "copilot-orchestrator.llm.timeouts.coldLoadMs": 1800000,      // 30 minutes
  "copilot-orchestrator.llm.timeouts.agentActivationMs": 1800000
}
```

### Problem: Queue always full

**Solution**: Increase `maxQueueDepth` or decrease `queuedResponseMs`:
```json
{
  "copilot-orchestrator.llm.timeouts.maxQueueDepth": 50,
  "copilot-orchestrator.llm.timeouts.queuedResponseMs": 600000  // 10 minutes
}
```

### Problem: Multi-agent switching takes too long

**Solution**: This is expected with slow models. Either:
1. Increase `modelSwitchMs` to avoid timeouts
2. Use fewer concurrent agents
3. Use a single model for all agents

## Implementation Details

### Files Modified

- `vscode-extension/src/config/llmTimeouts.ts` - Core configuration
- `vscode-extension/src/services/llmRequestQueue.ts` - Queue management
- `vscode-extension/src/services/agentLoopService.ts` - Agent activation/deactivation
- `vscode-extension/src/webviews/settingsPanel.ts` - Test connection
- `vscode-extension/package.json` - VS Code settings schema

### Backward Compatibility

All new settings have sensible defaults. Existing installations continue to work without configuration changes.

## Future Enhancements

- [ ] Dynamic timeout adjustment based on observed performance
- [ ] Per-model timeout overrides
- [ ] Queue priority levels
- [ ] Parallel execution for independent models
- [ ] Automatic queue balancing

## Support

For issues or questions:
1. Check this documentation
2. Review error messages (they include configuration hints)
3. Test with increased timeouts
4. Report issues with system specs and timeout values used
