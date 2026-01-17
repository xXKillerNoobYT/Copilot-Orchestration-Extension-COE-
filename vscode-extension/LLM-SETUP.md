# LLM Setup Guide

This extension speaks to OpenAI-compatible chat endpoints (OpenAI, Azure OpenAI with compatible URL, or LM Studio). Use this guide to configure settings, verify connectivity, and troubleshoot common issues.

## Quick Start

1. Open the Command Palette and run **“Copilot Orchestrator: Configure LLM”**.
2. Fill the fields (defaults shown in parentheses):
   - **Base URL** (`http://localhost:1234/v1` for LM Studio; `https://api.openai.com/v1` for OpenAI).
   - **API Key** (required for OpenAI/Azure; leave empty for LM Studio).
   - **Default Model** (e.g., `gpt-4.1`, `gpt-4o`, or your LM Studio model name).
   - **Temperature** (0–2; defaults to `0.7`).
   - **Timeout (ms)** (1000–120000; defaults to `30000`).
   - **Task Roots** (comma-separated, defaults to `_ZENTASKS`).
3. Save when prompted; secrets are redacted in logs.
4. Run **“Copilot Orchestrator: Test Connection”** to confirm reachability and credentials.
5. Check the status bar:
   - `LLM: Configured` when settings are valid.
   - `LLM: Not configured` with tooltip reasons when invalid or missing.

## LM Studio (local) recipe

- Start LM Studio’s server (default port **1234**).
- Use **Base URL**: `http://localhost:1234/v1`.
- **API Key**: leave blank.
- **Default Model**: the exact LM Studio model ID you loaded (see LM Studio UI).
- Run **Test Connection**; if it fails, ensure LM Studio server is running and port 1234 is open.

## OpenAI recipe

- **Base URL**: `https://api.openai.com/v1`.
- **API Key**: your OpenAI key (stored in global settings, redacted in logs).
- **Default Model**: `gpt-4.1`, `gpt-4o`, or your chosen model.
- **Temperature**: 0–2 (defaults to 0.7). Values outside this range are clamped and warned.
- **Timeout (ms)**: 1000–120000 (defaults to 30000). Values outside this range are clamped and warned.
- Run **Test Connection** to verify; actionable errors are shown for 401/404/connection issues.

## Field reference and defaults

| Setting | Key | Default | Notes |
| --- | --- | --- | --- |
| Base URL | `copilot-orchestrator.llm.baseUrl` | `http://localhost:1234/v1` | Must start with `http` or `https`. Can be overridden with `COPILOT_LLM_BASE_URL` environment variable. |
| API Key | `copilot-orchestrator.llm.apiKey` | empty | Stored in global scope; redacted in logs. |
| Default Model | `copilot-orchestrator.llm.defaultModel` | `gpt-4.1` | Required; non-empty string. |
| Temperature | `copilot-orchestrator.llm.temperature` | `0.7` | 0–2 inclusive. |
| Timeout (ms) | `copilot-orchestrator.llm.timeoutMs` | `30000` | 1000–120000 ms. |
| Task Roots | `copilot-orchestrator.taskRoots` | `_ZENTASKS` | Comma-separated list of workspace-relative paths. |

## Environment Variable Override

You can override the base URL using the `COPILOT_LLM_BASE_URL` environment variable. This is useful for:
- CI/CD pipelines where you need to point to a different server
- Remote LM Studio installations
- Testing against different environments

Example:
```bash
export COPILOT_LLM_BASE_URL="http://my-server:1234/v1"
```

The priority order is:
1. `COPILOT_LLM_BASE_URL` environment variable (highest priority)
2. `copilot-orchestrator.llm.baseUrl` VS Code setting
3. Default value (`http://localhost:1234/v1`)

## Troubleshooting

- **Invalid base URL**: must begin with `http` or `https` (no `ftp:`). The status bar tooltip lists validation issues.
- **APIPA address warning (169.254.x.x)**: This indicates automatic IP addressing, which typically means network configuration issues. Use `localhost` or a properly configured static IP instead.
- **HTTPS with local servers**: Local LLM servers (LM Studio, Ollama) run on HTTP by default, not HTTPS. If you see connection timeouts or TLS errors with `https://localhost` or `https://192.168.x.x`, change the protocol to `http://`. For production deployments requiring HTTPS, see the reverse proxy setup section below.
- **401/Forbidden**: check API key scope and value; re-run Configure LLM.
- **Connection refused / timeout**: verify the server is running and the port/base URL is correct; increase timeout if needed.
- **Wrong model name**: ensure the model string matches your provider (OpenAI model IDs or LM Studio model name).
- **Task roots**: keep `_ZENTASKS` unless your tasks live elsewhere; use relative paths only.

## HTTPS Reverse Proxy Setup (Optional)

Local LLM servers typically use HTTP for simplicity. If you need HTTPS (e.g., for security policies or remote access), set up a reverse proxy with TLS certificates:

### nginx Example
```nginx
server {
    listen 443 ssl http2;
    server_name llm.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:1234;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy Example (simpler)
```
llm.example.com {
    reverse_proxy localhost:1234
}
```

After setting up the reverse proxy:
1. Point your Base URL to `https://llm.example.com` (or your domain)
2. Ensure certificates are valid and trusted
3. Test the connection with "Test Connection" button

**Note**: Self-signed certificates may still cause connection errors. Use Let's Encrypt or proper CA-signed certificates for production.

## Where settings are stored

- Workspace-scoped: base URL, default model, temperature, timeout, task roots.
- Global-scoped: API key (to avoid committing secrets).

With these settings saved and a successful test, the extension will route orchestrated prompts through your chosen LLM provider with redacted logging and validation safeguards in place.
