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
| Base URL | `copilot-orchestrator.llm.baseUrl` | `http://localhost:1234/v1` | Must start with `http` or `https`. |
| API Key | `copilot-orchestrator.llm.apiKey` | empty | Stored in global scope; redacted in logs. |
| Default Model | `copilot-orchestrator.llm.defaultModel` | `gpt-4.1` | Required; non-empty string. |
| Temperature | `copilot-orchestrator.llm.temperature` | `0.7` | 0–2 inclusive. |
| Timeout (ms) | `copilot-orchestrator.llm.timeoutMs` | `30000` | 1000–120000 ms. |
| Task Roots | `copilot-orchestrator.taskRoots` | `_ZENTASKS` | Comma-separated list of workspace-relative paths. |

## Troubleshooting

- **Invalid base URL**: must begin with `http` or `https` (no `ftp:`). The status bar tooltip lists validation issues.
- **401/Forbidden**: check API key scope and value; re-run Configure LLM.
- **Connection refused / timeout**: verify the server is running and the port/base URL is correct; increase timeout if needed.
- **Wrong model name**: ensure the model string matches your provider (OpenAI model IDs or LM Studio model name).
- **Task roots**: keep `_ZENTASKS` unless your tasks live elsewhere; use relative paths only.

## Where settings are stored

- Workspace-scoped: base URL, default model, temperature, timeout, task roots.
- Global-scoped: API key (to avoid committing secrets).

With these settings saved and a successful test, the extension will route orchestrated prompts through your chosen LLM provider with redacted logging and validation safeguards in place.
