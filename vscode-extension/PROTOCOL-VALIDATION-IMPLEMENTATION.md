# HTTP vs HTTPS Protocol Validation Implementation

## Summary
Implemented protocol validation to detect and warn users when HTTPS is used with local LLM servers (LM Studio, Ollama) that typically run on HTTP. This prevents silent TLS handshake failures and provides actionable guidance.

## Changes Made

### 1. Protocol Validation Utilities (`src/config/llmConfig.ts`)
- Added `isLocalHost()` function to detect local addresses:
  - localhost, localhost.localdomain
  - Loopback addresses (127.x.x.x, ::1)
  - Private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- Added `validateProtocol()` function to check for HTTPS on local addresses
- Integrated validation into `readLlmConfig()` to warn users during configuration

### 2. Enhanced Error Messages (`src/llm/openaiClient.ts`)
- Improved timeout error messages to mention TLS/SSL issues
- Added specific guidance when timeout occurs with HTTPS on local addresses
- Enhanced TLS/SSL error detection and messaging
- Provides actionable suggestion to change protocol to HTTP

### 3. UI Improvements (`src/webviews/settingsPanel.ts`)
- Updated Base URL help text to warn about HTTP vs HTTPS
- Added client-side JavaScript validation for real-time feedback
- Shows warning when user types HTTPS with localhost/private IPs
- Provides guidance about reverse proxy setup for production HTTPS

### 4. Documentation Updates (`LLM-SETUP.md`)
- Added troubleshooting section for HTTPS with local servers
- Included reverse proxy setup examples:
  - nginx configuration with SSL certificates
  - Caddy configuration (simpler alternative)
- Documented proper certificate requirements

### 5. Comprehensive Testing
- Created 13 standalone protocol validation tests (`src/config/protocolValidation.test.ts`)
- Added 6 integration tests to existing llmConfig tests
- Total: 37 tests passing (100% success rate)
- Test coverage includes:
  - Local address detection (localhost, IPs, private ranges)
  - Protocol validation warnings
  - Edge cases (IPv6, boundary values, invalid input)
  - Integration with config validation

## Test Results
```
✓ Protocol Validation: 13/13 tests passed
✓ LLM Configuration: 24/24 tests passed
✓ Total: 37/37 tests passed
```

## Usage Examples

### Valid Configuration (no warning)
```
http://localhost:1234/v1          ✓ OK
http://127.0.0.1:1234/v1          ✓ OK
https://api.openai.com/v1         ✓ OK
```

### Invalid Configuration (shows warning)
```
https://localhost:1234/v1         ⚠️ Warning: Local servers use HTTP
https://127.0.0.1:1234/v1         ⚠️ Warning: Local servers use HTTP
https://192.168.1.100:1234/v1     ⚠️ Warning: Local servers use HTTP
```

## Warning Messages

### Configuration Warning
> "Local LLM servers (LM Studio, Ollama) typically use HTTP, not HTTPS. If you see connection errors, try changing the protocol to http://. For production use with HTTPS, set up a reverse proxy (nginx, caddy) with TLS certificates."

### Timeout Error Enhancement
> "Request timeout after 5000ms. If using HTTPS with localhost/local IP, this may be a TLS handshake failure. Local LLM servers (LM Studio, Ollama) typically use HTTP. Try changing https://localhost:1234/v1 to use http:// instead of https://."

### TLS Error Enhancement
> "TLS/SSL error: [error details]. Local LLM servers use HTTP, not HTTPS. If you need HTTPS, set up a reverse proxy with valid certificates."

## Benefits

1. **Prevents Silent Failures**: Users immediately know when protocol mismatch occurs
2. **Actionable Guidance**: Clear instructions on how to fix the issue
3. **Production Path**: Documentation for proper HTTPS setup via reverse proxy
4. **Real-time Feedback**: UI warns users as they type
5. **Comprehensive Coverage**: Detects all common local address formats

## Security Considerations

- Does NOT recommend disabling certificate validation
- Guides users to proper reverse proxy setup for HTTPS
- Warns against self-signed certificates in production
- Maintains security best practices while improving UX

## Future Enhancements (Optional)

1. Auto-detect protocol from server response
2. One-click protocol fix button in UI
3. Integration test with actual LM Studio instance
4. Telemetry to track how often users encounter this issue
