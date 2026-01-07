# Copilot instructions for this repo

## Zen Tasks Workflow (load first)

Before any development work, load the workflow context to ensure structured, dependency-driven execution.

### Primary: Use the automation tools
1. **Load context**: `zen-tasks_000_workflow_context` — hydrates guidelines and task state.
2. **Query tasks**: `zen-tasks_list_tasks`, `zen-tasks_get_task`, `zen-tasks_next_task`.
3. **Manage tasks**: `zen-tasks_add_task`, `zen-tasks_update_task`, `zen-tasks_set_status`.
4. **Bulk create**: `zen-tasks_parse_requirements` — converts requirements text into tasks.

### Fallback: Read files directly (when tools fail)
If the workflow context tool errors (e.g., "files not found"), load context from the file system:
- `prompts/zen_tasks_workflow.md` — workflow guidelines
- `prompts/base.md` — system overview
- `Docs/Plan/detailed project description` — project vision
- `Docs/Plan/feature list` — planned features
- `_ZENTASKS/tasks.json` — current task state

### Continuous development loop
```
1. Load workflow context (tool or fallback)
2. Inspect current tasks (_ZENTASKS/tasks.json)
3. Pick highest-priority ready task (zen-tasks_next_task or manual)
4. Mark in-progress → implement → test → mark done
5. Create follow-up tasks for discovered work
6. Repeat
```

Operate autonomously: no oversight required—just get the job done right.

---

## Architecture at a glance
- **Laravel backend (app/)** implements task orchestration, agent management, context bundles, GitHub sync, and observability. REST endpoints live in `routes/api.php`; business logic is pushed into `app/Services` and data access into `app/Repositories` with Eloquent models in `app/Models`.
- **Key domains**: `Task` (dependencies, GitHub linkage, soft deletes), `Agent`, `ContextBundle` (bundle_type variants), `WorkflowState`, and audit/notification helpers. See migrations in `database/migrations/2026_*` for enums and columns, and `Docs/IMPLEMENTATION-SUMMARY.md` for the delivered feature set (Phases 1–5) and planned Phase 6 work.
- **Front-end build**: Vite + Vue 3 (see root `package.json`, `resources/js`, `vite.config.js`).
- **VS Code extension scaffold** in `vscode-extension/` parses Markdown tasks with YAML front matter (see `src/taskParser.ts`, `sample-tasks/`, `TEMPLATE-*.md`). Provides a tree view and refresh command (`copilot-orchestrator.refreshTasks`).

## Domain rules & conventions
- **Task enums** (from migrations/parser): `task_type` = feature|bug|refactor|maintenance|architecture|testing|documentation; `priority` = critical|high|medium|low; `status` = pending|approved|in_progress|testing|review|completed|failed|blocked|cancelled. Keep these consistent across backend and extension parser.
- **Relationships**: Tasks can have parent/child (`parent_task_id`), dependencies (`task_dependencies`), workflow states, context bundles, GitHub issue linkage, and branches. Context bundles support types (`task_context`, `architecture_context`, `test_context`, `issue_context`) and store file lists/notes.
- **Layering**: Controllers stay thin; validation is via Form Requests; services encapsulate business rules; repositories wrap Eloquent queries; custom exceptions live under `app/Exceptions`. Preserve this separation when adding features.
- **Observability**: Logging/metrics/audit are part of Phase 5—prefer existing logging helpers and avoid silent failures.

## Build, run, and test
- **Backend setup**: `composer install`; copy `.env.example` → `.env`; `php artisan key:generate`; run migrations/seeds as needed. PHP 8.1–8.3 supported (see `.github/workflows/tests.yml`).
- **Serve**: Typical Laravel flow (`php artisan serve`) plus `npm install` and `npm run dev` (Vite) for assets.
- **Tests**: `phpunit` (see `phpunit.xml`, tests in `tests/Feature` and `tests/Unit`). Keep fixtures and factories under `database/factories`.
- **Frontend build**: `npm run dev` / `npm run build` (root `package.json`).
- **VS Code extension**: `cd vscode-extension && npm install && npm run watch` for dev; uses webpack + TypeScript; entry in `src/extension.ts`.

## Patterns to follow
- **Dependencies & critical path**: Use existing dependency/circular-detection logic (Phase 1) when adding task relations—don’t bypass repositories/services.
- **GitHub integration**: Leverage existing sync flows (Phase 4) and HMAC verification; keep issue/PR fields (`github_issue_id`, `github_issue_url`) aligned.
- **Context bundles**: Reuse bundle factories/services instead of ad-hoc file packaging; respect versioning fields in the model/migrations.
- **Validation**: Mirror backend rules in the extension parser where applicable; prefer adding schema-aware checks to `taskParser.ts` when introducing new front-matter fields.

## Quick references
- APIs: `routes/api.php`
- Models: `app/Models/Task.php`, `Agent.php`, `ContextBundle.php`, `WorkflowState.php`
- Migrations: `database/migrations/2026_*`
- Docs: `Docs/IMPLEMENTATION-SUMMARY.md`, `Docs/task-format-specification.md`, `Docs/task-orchestration-flow.md`
- Extension: `vscode-extension/src/taskParser.ts`, `vscode-extension/sample-tasks/`

## When in doubt
- Keep controllers thin, push logic into services, and write/extend tests alongside new endpoints.
- Match enum values and column names to migrations and parser types to avoid hidden desyncs.
- Prefer existing logging/metrics/audit paths over bespoke logging.