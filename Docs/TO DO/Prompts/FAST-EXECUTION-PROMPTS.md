# Fast Execution Prompts (LLM + Extension wiring)

Use these prompts with the code-aware agent that has repository access. Keep scope to the task ID indicated.

## Prompt 1: LLM Settings UI (TASK-mk4yyrid-dfloh)

"""
You are updating the VS Code extension `vscode-extension/`. Add a settings surface for LLM endpoints (OpenAI-compatible + LM Studio).

Requirements:

- Contribute configuration in `vscode-extension/package.json` with settings: base URL, API key/secret (treat as secret), default model, temperature, timeout, task roots.
- Add a command/panel to edit settings (quick pick or webview). Persist values via `workspace.getConfiguration` (workspace or global scope). Validate URLs; redact secrets in logs.
- Plumb a small helper (e.g., `config/llmConfig.ts`) to read and validate settings.
- Wire status bar or tree view to show when config is missing.
- Keep TypeScript strict; update tests/mocks if needed.


Deliverables: updated package.json contributions, helper module, command registration, minimal tests for config helper.
"""

## Prompt 2: LLM Transport + Connection Test (TASK-mk4yzupo-5g43r)

"""

- Add a client (TypeScript) that builds a /v1/chat/completions request from `CopilotDispatcher.composePrompt` output. Support http/https base URL, configurable model, temperature, timeout, optional API key header.
- Provide a `copilot-orchestrator.testConnection` command that sends a minimal ping and reports success/failure via notifications/status bar.
- Redact secrets in logs/errors; surface actionable error messages.
- Unit tests: request body/header builder (OpenAI + LM Studio), error handling for 401/404/ECONNREFUSED.


Wire: export the client; do not yet change dispatcher behavior beyond optional integration hook.
"""

## Prompt 3: Live Orchestrator Panel + Workspace Tasks (TASK-mk4yywrc-mr4c5, TASK-mk4yzzaz-tip0b)

"""

- Update `extension.ts` data source; add fallback message when no workspace tasks exist.
- Refresh command uses new source; status bar reflects load errors.
- Orchestrator panel renders live tasks, dependencies, GitHub links, context bundle path if present, and supports actions: execute, change status, open linked issue/context.
- Keep panel lightweight; avoid blocking UI. Add snapshot/render test for HTML generation.
"""


## Prompt 4: Docs Reality Check (TASK-mk4z07r5-d2065)

"""
Update docs to describe the new LLM settings flow, LM Studio compatibility (OpenAI-style endpoint, default port), and clarify what is implemented in the extension vs. backend.

Requirements:

- Add a short setup section to the extension README or a new LLM-SETUP.md in `vscode-extension/`.
- Append an "Extension status" note to `Docs/IMPLEMENTATION-SUMMARY.md` or a new addendum, calling out missing wiring (settings, transport, panel) and linking to tasks.
- Keep existing marketing text but add reality-check bullets.
"""
