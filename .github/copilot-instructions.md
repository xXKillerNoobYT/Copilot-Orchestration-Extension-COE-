## Repository quick facts
- Monorepo with three active codebases: **Laravel API + Inertia/Vue app** (root), **VS Code extension** (`vscode-extension/`), and **TypeScript context manager library** (`context-manager/`). Docs live in `Docs/` (runbook, plans, MCP references).
- Default branch: `main`. PHP 8.2+, Laravel 10, Sanctum auth. Frontend uses Vue 3 + Vite + Tailwind. Node 18+ for JS/TS projects.

## Setup & common commands
- Root Laravel app: `composer install`, copy `.env`, `php artisan key:generate`, `npm install`. Dev server: `php artisan serve` + `npm run dev`. Prod build: `npm run build` (runs `vue-tsc` then Vite SSR + CSR).
- Tests: PHP `php artisan test` (or `vendor/bin/phpunit`). JS (root) `npm test` / `npm run test:coverage`. Context-manager: `cd context-manager && npm install && npm test`. VS Code extension: `cd vscode-extension && npm install && npm run compile && npm test`.
- Lint/format: Laravel `php artisan pint`; context-manager `npm run lint`.

## Backend architecture (Laravel)
- API is versioned under `/api/v1` (see `routes/api.php`). Core domains:
	- **Tasks** (`TaskController`): list/project queries, status updates, dependency graph validation, critical path/ready/blocked endpoints.
	- **Agents** (`AgentController`): CRUD, activate/deactivate, workload distribution, candidate matching for tasks.
	- **Context Bundles** (`ContextBundleController`): build task context from tasks/files/repo; supports versioning, search, metadata updates, file add/remove.
	- **Metrics/Monitoring** (`MetricsController`, `MonitoringController`): task/agent/error dashboards; aggregate endpoint protected by Sanctum.
	- **Planning** (`PlanningController`, `PlanDecompositionController`): plan decomposition and plan uploads; controller wiring is present—check implementation before changing contracts.
	- **Repository & MCP** (`RepositoryController`, `RepositoryHealthController`, `McpController`, `GitHubController`): GitHub/MCP integration and repo health checks.
	- **Agent loop** (`AgentLoopController@run`), **Design tokens** (`DesignColor/Typography/SpacingController`) for design system resources.
- Convention: controllers live in `app/Http/Controllers/Api`, Eloquent models in `app/Models`, services in `app/Services` or `app/Repositories`. Keep API namespaced `v1` and mirror route naming when adding endpoints.

## Frontend (resources/js)
- Inertia + Vue 3 with Tailwind. Types live in `resources/js/types`. Vite config in `vite.config.js`; Ziggy for route helpers.
- Design System Editor (see `resources/js/Components/DesignSystem/README.md`): ColorThemePicker, FontSelector, ComponentStyleEditor, LivePreview with <500ms update target; route `/design-system` (auth protected). Maintain latency metric display and section toggles when modifying.

## VS Code extension (`vscode-extension/`)
- Provides task graph parsing/validation and **MCP tools for GitHub Copilot**. Key docs: `OFFICIAL-MCP-REFERENCE.md`, `GITHUB-COPILOT-AGENT-SETUP.md`, `MCP-ARCHITECTURE-SUMMARY.md`, Docker integration guides. Build/test with `npm run compile`, `npm test`. Templates in `templates/plan-templates/` and plan builder docs in `docs/plan-builder/`.

## Context manager library (`context-manager/`)
- Type-safe storage for task/agent contexts (JSON/YAML adapters, pruning policies, Zod validation). Main class `src/context-manager.ts`; storage adapters in `src/storage`. See `README.md` and `IMPLEMENTATION-SUMMARY.md` for API. Tests via Jest (`npm test`).

## Docs to consult first
- `Docs/PROJECT-RUNBOOK.md` (execution order, task expectations, commands), `Docs/GITHUB-ISSUES-PLAN.md` (issue mappings), `Docs/README.md` (doc navigation), `COPILOT-WORKFLOW-QUICKSTART.md` (autonomous Copilot flow). Issues are mirrored in `.github/issues/` via GitHub Issues Sync.
- PRD sources: prefer `PRD.json` (machine-readable for AI); `PRD.md` for human review; regenerate both via `PRD.ipynb` when upstream docs change.

## Testing/CI expectations
- Aim for all suites green: Laravel `php artisan test`, root Jest, context-manager Jest, extension Jest. Coverage targets noted in context-manager (80%+) and extension docs. Keep Vite/TypeScript builds clean (`npm run build`, `npm run compile`).

## Common pitfalls
- API changes must keep `/api/v1` route structure and Sanctum-protected endpoints intact. Update Ziggy route names if routes move.
- Design system latency budget (<500ms) is part of acceptance criteria—avoid heavy synchronous work in LivePreview updates.
- Keep MCP config files (`.github/copilot-mcp.json`, docs in vscode-extension) in sync when adding new MCP tools.
- Context bundles handle file uploads/versions; respect existing metadata/version APIs to avoid breaking clients.

## How to get productive fast
- Start from the relevant doc in `Docs/` (runbook/plan) to understand task intent, then open matching controller/service and Vue component. Use route names from `routes/api.php` with Ziggy in the frontend. For agent automation, follow commands in `COPILOT-WORKFLOW-QUICKSTART.md` and `.github/issues/README.md`.

## PRD sources
- Machine-readable: `PRD.json`
- Human-readable: `PRD.md`
- Regeneration notebook: `PRD.ipynb` Update when upstream docs change.

## Doc
- Main docs folder: `Docs/`
- Runbook: `Docs/PROJECT-RUNBOOK.md` (execution order, commands, status)
- Quick Reference: `Docs/QUICK-REFERENCE.md` (commands, fixes, test status)
- GitHub Issues plan: `.vscode/githubissues` folder and `Docs/GITHUB-ISSUES-PLAN.md`
- Historical reports: `reports/` folder (sessions, builds, tests)

## Documentation Practice
- **UPDATE existing docs** - don't create new files unless specifically requested
- Keep the `./` root folder clean and organized - minimize clutter
- Session/build reports go to `reports/` folder only when explicitly requested
- Update `Docs/PROJECT-RUNBOOK.md` for status changes
- Update `Docs/QUICK-REFERENCE.md` for new commands/fixes
- Keep documentation up to date with code changes
- Clean out old and outdated docs

## Reports Policy
**Do NOT automatically create session reports, build summaries, or completion files.**

Instead:
- Update existing documentation in `Docs/`
- Add dated sections to `PROJECT-RUNBOOK.md` or `QUICK-REFERENCE.md`
- Use `git commit` messages for change tracking

Only create reports in `reports/` when:
1. User explicitly requests a session report
2. Major milestone completions require formal documentation
3. Audit/compliance requires historical records

## Issue management
- Issues are mirrored in `.github/issues/` via GitHub Issues Sync.
- Follow the guidelines in `.github/issues/README.md` for creating and managing issues.
- Use tools to make/update issues on GitHub. They will follow the process automatically.
- NEED TO ADD MORE DETAILS LATER do so using the tools provided.
- Check for commit messages for more details. Use the tools provided. The issues here `.github/issues/` don't have commit messages.

## Testing/CI expectations
- **Default mode**: Jest runs in **watch mode with coverage on save** for immediate feedback during development
- **Required**: All suites must be green before commits:
	- Laravel: `php artisan test` 
	- Root Jest: `npm test`
	- context-manager Jest: `npm test` (in context-manager/)
	- vscode-extension Jest: `npm run test:jest`
- **Coverage targets**:
	- context-manager: **80%+ branches/lines** (enforced in jest.config.js)
	- vscode-extension: 50%+ (gradual improvement expected)
- **Build hygiene**: Keep TypeScript/Vite builds clean:
	- `npm run build` (Vite SSR + CSR)
	- `npm run compile` (vscode-extension webpack)
	- `npx tsc --noEmit` (type checking)
- **Test failures**: 
	- ❌ **Failing tests are PROBLEMS** - reported via VS Code Problems panel (visible with `get_errors`)
	- ⏭️ **Skipped tests are PROBLEMS** - must be documented in test file with JIRA/issue link and timeline
	- 🔴 **Fix promptly**: Failing/skipped tests block PR approval
	- 📊 **Report all test failures** as problems so they appear alongside code errors
- **CI/CD**:
	- Keep pipelines green and efficient
	- Tests run on every PR (GitHub Actions)
	- Coverage reports published to PR comments
	- Failed tests fail the build
- **Jest sanity-check**:
	- **Expected behavior**: The Jest sanity-check file should report exactly one intentionally failing test and one intentionally skipped test, both clearly labeled as sanity checks.
	- **Troubleshooting**: If either sanity-check test does not appear in the VS Code Problems panel or Jest output, the test runner configuration is broken and must be fixed before proceeding.
