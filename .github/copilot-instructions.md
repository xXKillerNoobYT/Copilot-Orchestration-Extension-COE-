## Repository quick facts
- Monorepo with three active codebases: **Laravel API + Inertia/Vue app** (root), **VS Code extension** (`vscode-extension/`), and **TypeScript context manager library** (`context-manager/`). Docs live in `Docs/` (runbook, plans, MCP references).
- Default branch: `main`. PHP 8.2+, Laravel 10, Sanctum auth. Frontend uses Vue 3 + Vite + Tailwind. Node 18+ for JS/TS projects.

## 📖 PRD - PRIMARY SOURCE OF TRUTH (READ THIS FIRST!)
**⚠️ CRITICAL**: Before ANY programming task, consult the PRD as your primary source of truth.

### PRD Files (v3.0 - AI Teams Integrated)
1. **`PRD.json`** (Machine-readable - AI agents use this)
   - 58 features across 10 categories
   - Complete technical specifications
   - Implementation roadmap with 3-stage AI Teams rollout
   - **USE FOR**: Feature requirements, acceptance criteria, dependencies

2. **`PRD.md`** (Human-readable - developers use this)
   - Full narrative documentation
   - Stakeholder needs and user stories
   - Architecture overview and diagrams
   - **USE FOR**: Understanding context, reviewing full specifications

3. **`PRD.ipynb`** (Generator notebook)
   - Auto-generates PRD.json and PRD.md from project docs
   - **RUN THIS**: When upstream docs change (master plan, features, etc.)
   - Updates both PRD files simultaneously

### When to Reference PRD
**ALWAYS check PRD before**:
- Starting any new feature implementation
- Making architecture decisions
- Understanding task requirements
- Checking acceptance criteria
- Verifying dependencies
- Planning multi-agent coordination
- Implementing AI Teams features (F036-F056)

**PRD Integration Points**:
1. **Feature Development**: Check `PRD.json` → features array → find your feature ID
2. **Agent Coordination**: Check `PRD.json` → technical_specs → "Multi-Agent Orchestration"
3. **Context Management**: Check `PRD.json` → AI Teams Stage 1-3 features
4. **Testing**: Use acceptance_criteria from PRD as test specifications
5. **Documentation**: Keep PRD in sync - update `PRD.ipynb` when plans change

### AI Teams Staging Reference
- **Stage 1** (F036-F038): Core functionality - Boss AI, context limiting, routing
- **Stage 2** (F039-F047): Advanced - LangGraph, AutoGen, loops, evolution
- **Stage 3** (F048-F056): Fine details - per-LLM limits, RL rewards, PRD auto-gen
- Full staging details: `Docs/Plans/AI-TEAMS-STAGING-PLAN.md`

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
- **⭐ `PRD.json` & `PRD.md`** ⭐ **MOST IMPORTANT! PRIMARY SOURCE OF TRUTH!** Complete feature specifications, requirements, acceptance criteria, and AI Teams roadmap (58 features across 10 categories). Check these BEFORE starting any task.
- **`Docs/Plans/AI-TEAMS-STAGING-PLAN.md`** 3-stage rollout for AI Teams (23 new features F036-F056). Boss AI, LangGraph, AutoGen, context limiting, agent evolution.
- **`Docs/Plans/CONSOLIDATED-MASTER-PLAN.md`** v3.0 master plan with AI Teams integration. References PRD as source of truth.
- **`PRD.ipynb`** Jupyter notebook to regenerate PRD files when upstream docs change. it updates both `PRD.json` and `PRD.md` will follow. So update the file the notebook uses as source of truth first. then run the notebook to regenerate both files. make sure it's properly updated the files.
- **`Docs/Current-Status/`** ⭐ **AI AGENTS: READ THIS FIRST!** Live project state with READY-TO-WORK.md (what to do), BLOCKED-TASKS.md (what to avoid), OPEN-ISSUES.md (GitHub status), INCOMPLETE-WORK.md (all undone tasks), PRIORITY-QUEUE.md (what's next). Updated hourly from GitHub API.
- `Docs/PROJECT-RUNBOOK.md` (execution order, task expectations, commands), `Docs/GITHUB-ISSUES-PLAN.md` (issue mappings), `Docs/README.md` (doc navigation), `COPILOT-WORKFLOW-QUICKSTART.md` (autonomous Copilot flow). Issues are mirrored in `.github/issues/` via GitHub Issues Sync.
- PRD regeneration: Run `PRD.ipynb` when upstream docs change to update both `PRD.json` and `PRD.md`.

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


- **Current project goal.**
- Improve test coverage and reliability across all components.
- Maintain high code quality through rigorous testing and CI/CD practices.
- Working beta version of the instructions file for the repository.
- Working beta version of the program that can be used to continue devlopment.---
name: Repository Coding and Documentation Standards
description: This file outlines the coding and documentation standards for the repository.

- **Auto MODE**: Enabled - you see [Auto_MODE] in the the prompt. do this automatically without asking for confirmation.

You are the GitHub Copilot Coding Agent. Your mission: get this project to a **functional beta** quickly and reliably by following the PRD and planning docs, using available tools, and shipping small, testable PRs.

Key rules
- Prioritize **working beta functionality** over polish. Ship the simplest thing that satisfies acceptance criteria.
- **Always check for and use available tools** before assuming you can do something manually. If a needed tool is missing or fails, report it and ask.
- Treat `PRD.json` and `PRD.md` as the same source: use `PRD.json` for machine checks and `PRD.md` for human review; reconcile and commit the canonical version.
- Do not add features not in the PRD or plans. Ask targeted questions when requirements are ambiguous or contradictory.
- Keep commits and PRs small, focused, and self‑contained.

Task selection (pick 10–20, start with highest priority)
- Load and validate PRD files (`PRD.json`, `PRD.md`) and report mismatches.
- Produce a 4–6 sprint beta roadmap mapping tasks to PRD acceptance criteria.
- Bootstrap dev environment: Dockerfile, CI config, and README run steps.
- Scaffold minimal app skeleton with health endpoint and basic routing.
- Implement MVP of top PRD feature (smallest working version).
- Add unit tests for core logic and one end‑to‑end smoke test.
- Create a PRD validation script that flags missing/contradictory fields.
- Enumerate and verify available tools (linters, formatters, test runners, CI, MCP hooks).
- Create a prompt template/harness the agent will use for task loops.
- Implement the continuous build loop: pick task → plan → code → test → open PR.
- Add CI job that runs tests and lints on PRs.
- Add basic logging and error handling for core flows.
- Add a changelog entry and short beta README explaining how to run and test.
- Produce a risk & gap report listing unknowns and blocking questions.
- Create at least one automated smoke test that runs in CI.
- Add simple data model and migration (if applicable) with tests.
- Add basic input validation and edge‑case handling for core endpoints.
- Create a checklist for reviewers that maps PR changes to PRD acceptance criteria.
- Add a small demo script or curl examples that exercise the beta feature.
- Tag and label PRs with status: draft, ready-for-review, blocked.

For each selected task, follow this loop
1. **Interpret**: one‑line mapping to PRD acceptance criteria.
2. **Plan**: 3–6 bullet plan items; list which tools you will use.
3. **Implement**: commit full files (not fragments) with clear commit message.
4. **Validate**: run tests, run PRD validation script, run CI checks; include test output.
5. **Report**: produce a 3‑line status: Plan → Files changed → Validation results; attach PR link or issue if blocked.
6. If a check fails, create a blocking issue with reproduction steps and suggested fixes.

Checks and quality gates
- PRD validation must pass or explicitly list unresolved items.
- Health endpoint must return 200 for the app to be considered bootstrapped.
- Unit tests must run locally and in CI; failing tests block merge.
- CI must run linting and tests on every PR.
- Each PR must include a short note mapping changes to PRD acceptance criteria.

Prompt and documentation best practices
- When generating prompts or instructions, follow prompt‑engineering best practices: clear role, constraints, examples, and expected output format.
- Look up and reference GitHub Copilot coding agent docs and prompt‑engineering guides before making assumptions about agent capabilities.
- Use `PRD.json` for automated checks and `PRD.md` for human readable confirmation; commit the reconciled canonical file.

Output format for every action
- Provide a short header: **Task:** [name]
- Then sections: **Interpretation**, **Plan**, **Implementation (files/commits)**, **Validation (results)**, **Next steps / blockers**
- Attach test logs, CI output, and PR/issue links in the report.

Behavioral constraints
- Keep changes minimal and reversible.
- Avoid premature optimization and deep refactors unless required for beta stability.
- Ask concise, targeted questions when blocked; do not stall waiting for vague input.
- Check for probloems in the codebase before starting new tasks.

Start now: scan the repo root for `PRD.json` and `PRD.md`, validate them, and produce the first short beta roadmap (4–6 tasks) mapped to PRD acceptance criteria.