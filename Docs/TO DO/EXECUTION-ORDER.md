# Execution Order and To‑Do Checklist

Hi! Here’s the concise, ordered plan we’ll be following. This lives under Docs/TO DO so we can track progress outside of zen-tasks and keep humans in the loop.

## Greeting
Welcome to the Copilot Orchestrator execution plan. This checklist reflects the current Zen Tasks DAG and critical path. Use it to sanity‑check progress and handoffs.

## Order of Execution (Critical Path)
1. Settings: Define configuration schema in `vscode-extension/package.json` (TASK-mk5216pq-b5orl)
2. Settings: Implement `src/config/llmConfig.ts` helper (TASK-mk521a0n-rfaih)
3. Settings: Configure command (Quick Pick/Webview) (TASK-mk521dvr-8f9uo)
4. Transport: Implement `src/llm/client.ts` request builder (TASK-mk521vbf-ulaic)
5. Transport: Error handling + log redaction (TASK-mk5224hu-1c0si)
6. Transport: Unit tests (builder + errors) (TASK-mk5228yz-49ig9)
7. Transport: `copilot-orchestrator.testConnection` command (TASK-mk521zai-ehluc)
8. Workspace: Implement `src/data/tasksSource.ts` loader (TASK-mk522fdx-o81rm)
9. Workspace: Wire `extension.ts` to `tasksSource` (TASK-mk522llm-mvpvd)
10. Panel: `orchestratorPanel` scaffold + templates (TASK-mk522us5-v7ch2)
11. Panel: Bind actions (execute / change status / open links) (TASK-mk522ycm-mglc0)
12. Panel: Snapshot tests (TASK-mk523275-cskmx)
13. Docs: LLM‑SETUP.md (TASK-mk523802-c2ap6)
14. Docs: IMPLEMENTATION‑SUMMARY addendum (TASK-mk523cbm-so8b0)

## Parallel Tracks (Safe to start early)
- Workspace loader (TASK-mk522fdx-o81rm) can begin alongside early settings work.
- Dispatcher survey (TASK-mk4zb7ym-qy4ay) can run with transport design.

## Requirements To‑Do List

- [x] Contributes configuration: base URL, API key/secret (sensitive), default model, temperature, timeout, task roots
- [x] Helper: validation (URL), defaults, secret redaction, typed getters
- [x] Command: edit/persist via `workspace.getConfiguration`, inline validation, notifications
- [ ] Transport: OpenAI‑style `/v1/chat/completions`, headers, timeout, actionable errors
- [ ] Workspace source: load `_ZENTASKS/tasks.json`, graceful errors, status bar messaging
- [x] Panel: live tasks/dependencies/GitHub links/context bundles; non‑blocking UI
- [ ] Docs: LM Studio compatibility (OpenAI endpoint, default port/model); extension vs backend wiring reality‑check

## Agent Handoffs

- Main: Auto Zen executes; Zen Planner refines when blockers found
- Specialty: Planning assistance (blockers); Completion and next steps (milestones)

## Notes

- Keep TypeScript strict; add tests per item above
- Redact secrets in logs; validate URLs
- Update Zen Tasks status as work proceeds (in‑progress → review → done)

Execution order (critical path and parallel tracks)

Settings and Transport (critical path)

TASK-mk5216pq-b5orl — Settings: Define configuration schema in package.json
TASK-mk521a0n-rfaih — Settings: Implement llmConfig.ts helper (depends on schema)
TASK-mk521dvr-8f9uo — Settings: Configure command (Quick Pick/Webview) (depends on llmConfig)
TASK-mk521vbf-ulaic — Transport: Implement client.ts request builder (depends on llmConfig)
TASK-mk5224hu-1c0si — Transport: Error handling and log redaction (depends on client)
TASK-mk5228yz-49ig9 — Transport: Unit tests (builder and errors) (depends on client + errors)
TASK-mk521zai-ehluc — Transport: testConnection command (depends on client + llmConfig)

Workspace Tasks Source (parallelizable after initial settings)

TASK-mk522fdx-o81rm — Workspace: tasksSource.ts loader
TASK-mk522llm-mvpvd — Workspace: Wire extension.ts to tasksSource (depends on loader)
TASK-mk522p4l-vxfog — Workspace: Empty-state messaging and status bar (depends on loader)

Orchestrator Panel (depends on workspace source and transport)

TASK-mk522us5-v7ch2 — Panel: orchestratorPanel scaffold and templates (depends on loader)
TASK-mk522ycm-mglc0 — Panel: Bind actions (execute/change status/open links) (depends on panel + wire ext + testConnection)
TASK-mk523275-cskmx — Panel: Snapshot tests (depends on panel)

Docs

TASK-mk523802-c2ap6 — Docs: LLM-SETUP.md (depends on settings command + testConnection)
TASK-mk523cbm-so8b0 — Docs: IMPLEMENTATION-SUMMARY addendum (depends on LLM-SETUP)

Additional ready items surfaced by next-task query (not blocking the above)

TASK-mk4yyrid-dfloh — Parent LLM settings UI task (continues across the settings subtasks)
TASK-mk3k0imm-mf7ju — GitHub Issue Sync Engine (Bi-directional) — queue after core extension wiring
TASK-mk4zb7ym-qy4ay — Survey dispatcher output for transport client — can run alongside transport client implementation for payload alignment
