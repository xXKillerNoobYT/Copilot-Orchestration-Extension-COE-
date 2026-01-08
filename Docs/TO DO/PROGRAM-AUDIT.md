# Program Audit (2026-01-07)

## What we checked
- Repository plan docs: `Docs/Plan/detailed project description`, `Docs/Plan/feature list`, `Docs/IMPLEMENTATION-SUMMARY.md`.
- Current task backlog: `_ZENTASKS/tasks.json` and existing task files.
- VS Code extension scaffold in `vscode-extension/` (commands, UI, task parsing, agent prompts).
- Laravel backend surface (routes/controllers/services for tasks, agents, planning, monitoring, GitHub hooks).

## Key findings
1. **Extension lacks a settings surface** for LLM endpoints (no `contributes.configuration`, no settings view, no secret handling). User cannot point the extension at a private LLM or LM Studio.
2. **Task source is hardcoded to bundled samples.** `extension.ts` loads only `sample-tasks/` under the extension install path; workspace tasks in `_ZENTASKS/` are ignored.
3. **Orchestrator UI is largely static.** `orchestratorPanel` shows stub memory/context bundles and does not reflect live workspace data or backend state; no plan breakdown or interaction beyond info toasts.
4. **LLM dispatch is incomplete.** `copilotDispatcher` composes prompts but has no transport to an LLM, no provider selection, and no connection tests; LM Studio compatibility is unspecified.
5. **Plan vs. reality drift.** `IMPLEMENTATION-SUMMARY.md` claims Phases 1–5 “complete” and highlights GitHub sync and monitoring, but the extension does not expose or wire to those APIs. Continuous-agent loop and issue sync described in plan are not reachable from the extension.
6. **Zen-tasks toolchain reliability gaps.** Prior tasks remain blocked due to external tool errors (loader/path issues), so we should avoid relying solely on the tool for critical workflow steps.

## High-priority gaps mapped to plan
- **Feature 9 (Local and Cloud LLM Integration):** No UI or wiring to select/connect to local (LM Studio) or cloud endpoints.
- **Feature 4 (VS Code Extension UI):** Missing settings, live task tree sourced from workspace, and actionable controls in the Orchestrator panel.
- **Feature 11 (Continuous Coding Framework):** Extension has no link to backend loop/agent APIs; orchestration loop is not exposed.
- **Feature 21/27 (GitHub Issue↔Task Sync):** Backend routes exist, but extension provides no entry points to configure GitHub, trigger sync, or display status.

## Recommended actions (now tracked in _ZENTASKS)
- **TASK-mk4yyrid-dfloh:** Add VS Code settings UI for LLM endpoints (OpenAI-compatible + LM Studio) with validation and secret handling.
- **TASK-mk4yywrc-mr4c5:** Load workspace tasks instead of bundled samples and unify data for tree/graph/panel.
- Add transport + connection check for configured LLMs (OpenAI + LM Studio) and route `copilotDispatcher` output to them.
- Make the Orchestrator panel live: show real tasks, memory, context bundles, and plan breakdown; add actions (execute, change status, open issue/context).
- Surface backend workflows (agent loop start/stop/status, planning/generation) via commands and UI once settings exist.

## Documentation updates needed
- Add an extension-facing setup note explaining how to configure LLM endpoints (cloud and LM Studio) and task root detection.
- Amend implementation status to distinguish delivered backend APIs from missing extension wiring.
- Provide a “connection checklist” for LM Studio (e.g., expected OpenAI-compatible endpoint, port, model name, auth behavior).
