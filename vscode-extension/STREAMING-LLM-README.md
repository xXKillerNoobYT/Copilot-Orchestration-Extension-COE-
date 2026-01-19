# Streaming LLM Execution

Real-time streaming of LLM responses for live feedback during AI operations.

## Features

✅ **Real-Time Streaming**: Token-by-token display of LLM responses  
✅ **Progress Indicators**: Spinner and percentage tracking  
✅ **Stream Statistics**: Duration, tokens, and throughput metrics  
✅ **Cancellation Support**: Cancel streams via VS Code cancellation  
✅ **Error Handling**: Detailed error messages and graceful failure  
✅ **SSE Transport**: Compatible with OpenAI-style streaming endpoints  

**Note**: WebSocket support is planned for a future release.  

## Usage

### Command Palette

1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Search for: **"Copilot Orchestrator: Execute LLM Task (Streaming)"**
3. Enter task ID and agent name when prompted
4. Watch real-time output in the "LLM Streaming" output channel

### Configuration

Configure your LLM endpoint in VS Code settings:

```json
{
  "copilot-orchestrator.llm.baseUrl": "http://localhost:1234/v1",
  "copilot-orchestrator.llm.apiKey": "your-api-key",
  "copilot-orchestrator.llm.defaultModel": "gpt-3.5-turbo",
  "copilot-orchestrator.llm.temperature": 0.7,
  "copilot-orchestrator.llm.timeoutMs": 30000
}
```

## Architecture

### Components

#### StreamingClient
Location: `vscode-extension/src/services/streamingClient.ts`

- **SSE Transport**: Compatible with OpenAI-style `/chat/completions` endpoints
- **WebSocket Transport**: For custom streaming servers
- **Buffer Management**: Handles incomplete SSE messages
- **Timeout Handling**: Configurable timeout with abort controller
- **Cancellation**: Integrates with VS Code cancellation tokens

**API**:
```typescript
const client = createStreamingClient(config);

await client.streamChat(messages, {
  onChunk: (chunk) => {
    // Handle text, progress, error, or done chunks
  },
  onComplete: (fullResponse) => {
    // Stream completed successfully
  },
  onError: (error) => {
    // Handle errors
  },
  onCancel: () => {
    // Stream was cancelled
  }
}, {
  transport: 'sse', // or 'websocket'
  temperature: 0.7,
  timeoutMs: 30000,
  cancellationToken: vscode.CancellationToken
});
```

#### StreamingOutputChannel  
Location: `vscode-extension/src/ui/streamingOutputChannel.ts`

- **Real-Time Display**: Token-by-token append to VS Code output channel
- **Progress Indicators**: Rotating spinner with optional percentage
- **Statistics Tracking**: Chars, tokens, duration, speed
- **Error Display**: Formatted error messages with stack traces

**API**:
```typescript
const outputChannel = getStreamingOutputChannel();

outputChannel.startStream(taskId, agentName);
outputChannel.appendChunk(content);
outputChannel.updateProgress(percentage);
outputChannel.endStream(success);
```

### Integration Points

#### Task Execution
```typescript
// In executeLLM.ts
import { executeLlmCommandStreaming } from './commands/executeLLM';

// Streaming execution with task context
await executeLlmCommandStreaming();
```

#### Event Flow
```
User Input (Task ID + Agent)
  ↓
Compose Prompt (CopilotDispatcher)
  ↓
Create StreamingClient
  ↓
Start Output Channel
  ↓
Stream Chat Request
  ↓
  ├─ onChunk → Append to Output
  ├─ onProgress → Update Spinner
  ├─ onError → Display Error
  └─ onComplete → Show Statistics
```

## Testing

### Unit Tests
Location: `vscode-extension/src/services/streamingClient.test.ts`

**Coverage**: 10 test cases
- ✅ SSE streaming with mock responses
- ✅ Error handling (network, HTTP, timeout)
- ✅ Cancellation support
- ✅ Response accumulation
- ✅ Metadata parsing
- ✅ Buffer management for incomplete messages

### Running Tests
```bash
cd vscode-extension
npm run test:jest -- src/services/streamingClient.test.ts
```

## Troubleshooting

### Stream Not Starting
**Symptom**: "Streaming execution not yet implemented" message  
**Solution**: Ensure you're using the **Streaming** variant of the command:
- ✅ "Execute LLM Task (Streaming)"
- ❌ "Execute LLM Task" (non-streaming)

### Connection Timeout
**Symptom**: "Request timeout after Xms"  
**Solution**:
1. Check LLM server is running
2. Verify `baseUrl` in settings (use HTTP not HTTPS for local servers)
3. Increase `timeoutMs` in settings

### Empty Response
**Symptom**: Stream completes but no output  
**Solution**:
1. Check LLM server supports `/chat/completions` endpoint
2. Enable `stream: true` parameter in request
3. Verify API key authentication (if required)

### SSE Parse Errors
**Symptom**: Console warnings "Failed to parse SSE data"  
**Solution**:
1. Ensure server sends SSE format: `data: {...}\n\n`
2. Check for `[DONE]` marker at end of stream
3. Verify JSON structure matches OpenAI format

## Performance

**Target Metrics**:
- **Latency**: < 200ms to first token
- **Throughput**: > 50 chars/second (typical)
- **Memory**: < 10MB for 10K character response

**Optimization**:
- Uses `AbortController` for clean cancellation
- Efficient buffer management for SSE parsing
- Minimal UI updates (progress every 100ms)
- Statistics calculated incrementally

## Future Enhancements

Planned improvements not yet implemented:
- [ ] Syntax highlighting in output channel
- [ ] Save stream to file
- [ ] Pause/Resume streaming
- [ ] Multiple concurrent streams
- [ ] WebSocket transport support (currently only SSE is supported)
- [ ] Automatic retry logic for failed streams

## API Reference

### StreamChunk Interface
```typescript
interface StreamChunk {
  type: 'text' | 'progress' | 'error' | 'done';
  content?: string;      // For type='text'
  progress?: number;     // For type='progress' (0-100)
  error?: string;        // For type='error'
  metadata?: {           // Optional metadata
    model?: string;
    finishReason?: string;
  };
}
```

### StreamingOptions Interface
```typescript
interface StreamingOptions {
  transport?: 'sse' | 'websocket';
  temperature?: number;
  timeoutMs?: number;
  cancellationToken?: vscode.CancellationToken;
}
```

### StreamCallbacks Interface
```typescript
interface StreamCallbacks {
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}
```

## License

Part of the Copilot Orchestration Extension. See root LICENSE file.
