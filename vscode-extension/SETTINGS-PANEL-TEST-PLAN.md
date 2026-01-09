# LLM Settings Panel Test Plan

## Overview

Replaced sequential input-box LLM configuration with a comprehensive tabbed webview settings panel designed for LM Studio and OpenAI-compatible endpoints.

## New Features

### 1. Tabbed Interface

- **Connection Tab**: Base URL, API key, selected model
- **Models Tab**: Dynamic model discovery via GET /v1/models
- **Advanced Tab**: Temperature and timeout settings
- **Endpoints Tab**: API documentation and current configuration

### 2. Dynamic Model Discovery

- Fetches available models from the configured endpoint using GET /v1/models
- Displays model ID, object type, creation timestamp, and owner
- Handles errors gracefully with user-friendly messages

### 3. Connection Testing

- Tests the connection by sending a ping message to POST /v1/chat/completions
- Validates endpoint accessibility before saving settings
- Shows detailed error messages if connection fails

### 4. LM Studio-First Design

- Default URL: <http://localhost:1234/v1>
- Optional API key (not required for LM Studio)
- Supports local model hosting

### 5. Full OpenAI API Support

- GET /v1/models - List available models
- POST /v1/chat/completions - Chat interface
- POST /v1/completions - Text completion
- POST /v1/embeddings - Generate embeddings

## Testing Steps

### 1. Launch Extension

1. Press F5 in VS Code to launch Extension Development Host
2. Wait for extension to activate

### 2. Open Settings Panel

1. Open Command Palette (Ctrl+Shift+P)
2. Run command: "Copilot Orchestrator: Configure LLM"
3. Verify settings panel opens in new webview tab

### 3. Test Connection Tab

1. Verify default values are populated from current config
2. Test invalid URL input (should show error on save)
3. Test valid URL changes
4. Test API key input (password-masked)

### 4. Test Models Tab

1. Ensure LM Studio is running on <http://localhost:1234>
2. Click "Refresh Models" button
3. Verify model list displays with:
   - Model ID
   - Object type
   - Created timestamp
   - Owner
4. Test model selection (radio buttons)
5. Test with LM Studio offline (should show error message)

### 5. Test Advanced Tab

1. Verify temperature slider (0-2 range)
2. Test temperature input validation
3. Verify timeout input (1000-120000 ms)
4. Test timeout validation

### 6. Test Endpoints Tab

1. Verify all endpoints are documented:
   - GET /v1/models
   - POST /v1/chat/completions
   - POST /v1/completions
   - POST /v1/embeddings
2. Verify current config displays correctly

### 7. Test Connection Test Button

1. Click "Test Connection" button
2. With LM Studio running: Verify success message
3. With LM Studio offline: Verify error message with details
4. With invalid URL: Verify connection error

### 8. Test Save Settings

1. Modify settings in all tabs
2. Click "Save Settings" button
3. Verify success message
4. Close settings panel
5. Reopen and verify settings persisted correctly

### 9. Test Theme Compatibility

1. Switch VS Code theme to Dark+ (default dark)
2. Verify settings panel colors match
3. Switch to Light+ (default light)
4. Verify colors adapt to theme

## Expected API Behavior

### GET /v1/models

```json
{
  "object": "list",
  "data": [
    {
      "id": "llama-3.1-8b-instruct",
      "object": "model",
      "created": 1234567890,
      "owned_by": "organization"
    }
  ]
}
```

### POST /v1/chat/completions (ping test)

```json
{
  "model": "selected-model",
  "messages": [{"role": "user", "content": "ping"}],
  "max_tokens": 5
}
```

Expected response: HTTP 200 with completion object

## Configuration Storage

Settings are stored in VS Code workspace/user settings:

- `copilot-orchestrator.llm.baseUrl` (workspace)
- `copilot-orchestrator.llm.apiKey` (global, sensitive)
- `copilot-orchestrator.llm.model` (workspace)
- `copilot-orchestrator.llm.temperature` (workspace)
- `copilot-orchestrator.llm.timeoutMs` (workspace)

## Known Limitations

1. Model discovery requires GET /v1/models endpoint support
2. Connection test sends actual API request (may cost tokens with paid services)
3. Settings panel does not auto-refresh on external config changes
4. No validation for model-specific parameters (context window, etc.)

## Troubleshooting

### Issue: Settings panel doesn't open

- **Solution**: Check extension activation, run "Developer: Reload Window"

### Issue: No models show in Models tab

- **Solution**: Verify LM Studio is running, check baseUrl is correct, click "Refresh Models"

### Issue: Connection test fails

- **Solution**: Verify endpoint URL, check API key if required, ensure network connectivity

### Issue: Settings don't save

- **Solution**: Check VS Code workspace permissions, check browser console for errors

## Success Criteria

✅ Settings panel opens on command
✅ All 4 tabs render correctly
✅ Dynamic model discovery works with LM Studio
✅ Connection test validates endpoint
✅ Settings save and persist across sessions
✅ UI adapts to VS Code theme
✅ Error messages are clear and actionable
