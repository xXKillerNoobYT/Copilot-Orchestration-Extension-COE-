## Role & primary goal
- **You are the GitHub Copilot Coding Agent.** Auto MODE is enabled—act without extra confirmation.
- Ship a **functional beta quickly**. Follow the PRD (use `PRD.json` for checks, `PRD.md` for human review). Do **not** add features outside PRD/plans without approval.

## Core rules (beta-first)
- Prefer the simplest working solution that meets PRD acceptance criteria.
- Check and use available tools before doing work manually; if a tool is missing or fails, report it.
- Keep PRs small, focused, testable, and traceable to PRD sections.
- Treat `PRD.json` and `PRD.md` as the same source; reconcile and commit the canonical version.

## PRD quick access
1. **`PRD.json`** – machine-readable; 58 features (10 categories) incl. AI Teams rollout.
2. **`PRD.md`** – human-readable narrative and diagrams.
3. **`PRD.ipynb`** – generator; run after upstream doc changes to refresh both PRD files.
Always consult PRD before starting a task, making architecture choices, or validating acceptance criteria. AI Teams staging: F036–F038 (Stage 1), F039–F047 (Stage 2), F048–F056 (Stage 3). Full staging: `Docs/Plans/AI-TEAMS-STAGING-PLAN.md`.

## Task loop (for every task)
1. **Interpretation:** one line mapping work → PRD acceptance criteria.
2. **Plan:** 3–6 bullets; list tools to use.
3. **Implement:** commit full files with clear message; include tests.
4. **Validate:** run tests, PRD validation, and CI; capture outputs.
5. **PR:** open PR with PRD mapping, changelog, and demo steps.
6. **Report:** 3-line status (Plan → Files changed → Validation results). If blocked, create/update an issue and mark PR blocked.

## Issue management (minimum 3 open issues)
- If fewer than 3 open issues exist, create more (observations, tech debt, tests, docs, or small tasks) until there are 3.
- Create issues for bugs, blockers, clarifications, observations, and future tasks. Use labels: `bug`, `task`, `enhancement`, `blocked`, `beta`, `urgent`, `needs-review`.
- Issue content: title; priority; repro steps (if bug); expected vs actual; environment; logs; minimal repro; suggested fix. Assign an owner, request reviewers, and update with progress/PR/CI links. Close referencing PR/commit.
- Observations: create lightweight issues; tag `enhancement` or `task`. If blocking, mark PR `blocked` and surface needed decision in the issue body.
- use tools to update and manage issues on github.

### Bug reporting template
Title; Severity (P0/P1/P2); Steps to reproduce; Expected; Actual; Environment; Logs/test output; Minimal repro; Suggested fix.

## Reviews, QA, and reporting
- Each PR must include a **Review Checklist** mapping changed files to PRD acceptance criteria, plus QA notes with manual test steps/results.
- Attach test logs, CI output, and PR/issue links to task reports. Keep `copilot-instructions.md` updated with process changes/templates.

## Checks and quality gates
- PRD validation passes or explicitly lists unresolved items.
- Health endpoint returns 200 before claiming bootstrapped.
- Tests run locally and in CI; failing or undocumented skipped tests block merge.
- CI must run linting and tests on every PR; coverage targets enforced.
- Each PR notes PRD acceptance criteria coverage.

## CI/testing expectations
- Required commands: Laravel `php artisan test`; root Jest; `context-manager` Jest; `vscode-extension` `npm run test:jest`; `npm run build`; `npm run compile`; `npx tsc --noEmit`.
- Coverage targets: context-manager **80%+**; VS Code extension **50%+** (and improving). Design system latency <500ms stays in scope.
- Jest sanity-check must show exactly one intentional fail and one skip; missing entries mean the runner is broken.
- Failing/skipped tests are problems; document skips with issue link/timeline.

## Tools & setup
- Monorepo: Laravel API + Inertia/Vue (root), VS Code extension (`vscode-extension/`), TypeScript context manager (`context-manager/`). Docs in `Docs/`.
- Default branch `main`; PHP 8.2+; Node 18+.
- Setup: `composer install`, copy `.env`, `php artisan key:generate`, `npm install`. Dev: `php artisan serve` + `npm run dev`. Build: `npm run build` (Vite SSR/CSR). Lint: `php artisan pint`, `npm run lint` (context-manager).

## Architecture cues
- API under `/api/v1` (keep Sanctum protection). Controllers: `app/Http/Controllers/Api`; models `app/Models`; services `app/Services`/`app/Repositories`.
- Design System Editor: `resources/js/Components/DesignSystem` (<500ms updates) route `/design-system`.
- VS Code extension docs: `OFFICIAL-MCP-REFERENCE.md`, `GITHUB-COPILOT-AGENT-SETUP.md`, `MCP-ARCHITECTURE-SUMMARY.md`; build/test `npm run compile`, `npm test`.
- Context manager: `src/context-manager.ts`; tests `npm test`; see `IMPLEMENTATION-SUMMARY.md`.

## Docs to read first
- `PRD.json`, `PRD.md` (primary), `PRD.ipynb` (regen), `Docs/Plans/CONSOLIDATED-MASTER-PLAN.md`, `Docs/Plans/AI-TEAMS-STAGING-PLAN.md`, `Docs/Current-Status/*`, `Docs/PROJECT-RUNBOOK.md`, `Docs/GITHUB-ISSUES-PLAN.md`, `COPILOT-WORKFLOW-QUICKSTART.md`.

## Pitfalls to avoid
- Preserve `/api/v1` routing and Ziggy names; keep Sanctum protection.
- Keep MCP config (`.github/copilot-mcp.json` + extension docs) in sync when adding tools.
- Respect context bundle metadata/version APIs; avoid breaking uploads.
- Maintain design system latency budget (<500ms) and LivePreview responsiveness.

## Documentation practice & reports
- Update existing docs instead of adding new files unless requested. Keep root clean.
- Session/build reports only in `reports/` when explicitly requested or required. Otherwise, update `Docs/PROJECT-RUNBOOK.md` or `Docs/QUICK-REFERENCE.md` with dated notes.

## Starting actions (default)
- Scan repo root for `PRD.json` and `PRD.md`, validate them.
- Produce a 4–6 item beta roadmap mapped to PRD acceptance criteria.
- Ensure **≥3 open issues**; create new ones if below threshold (label/assign/describe).

## Testing checklist quick reference

### Testing Checklist for Proper Coverage and Program Reliability
This checklist provides a comprehensive guide to ensure your project has proper test coverage and reliability. Use it to design, implement, execute, and maintain effective tests across your codebase.
#### Test Design
- [ ] **Define scope** — List features, modules, and user flows to be tested.  
- [ ] **Identify test types** — Unit; integration; end to end; regression; performance; security; accessibility.  
- [ ] **Map requirements to tests** — Every requirement or user story has at least one test case.  
- [ ] **Specify acceptance criteria** — Clear pass/fail conditions for each test.  
- [ ] **Design edge case and negative tests** — Include boundary values, invalid inputs, and error paths.  
- [ ] **Plan test data** — Realistic, anonymized, and repeatable datasets; include fixtures for edge cases.


#### Test Implementation
- [ ] **Write small, focused unit tests** — One behavior per test; fast and deterministic.  
- [ ] **Use meaningful test names** — Describe behavior and expected outcome.  
- [ ] **Assert behavior, not implementation** — Verify outputs and side effects, avoid fragile internals.  
- [ ] **Mock and stub responsibly** — Mock external services; keep mocks minimal and documented.  
- [ ] **Cover integration points** — Database, message queues, external APIs, and file systems.  
- [ ] **Include end to end scenarios** — Critical user journeys validated from UI/API to persistence.  
- [ ] **Add performance and load tests** — Baseline response times and resource usage under expected load.  
- [ ] **Add security and vulnerability tests** — Authentication, authorization, input validation, and common exploits.

#### Test Execution and Automation
- [ ] **Automate test runs** — Local dev, pull requests, and CI pipelines run relevant suites.  
- [ ] **Enforce pre-merge checks** — Block merges when critical tests fail or coverage drops below threshold.  
- [ ] **Use environment parity** — CI environment mirrors production configuration and secrets handling.  
- [ ] **Isolate tests** — Ensure tests can run in parallel and do not share mutable global state.  
- [ ] **Record and surface artifacts** — Logs, screenshots, traces, and test reports attached to CI runs.  
- [ ] **Handle flaky tests** — Track, quarantine, and fix flaky tests; do not ignore failures.

#### Quality Metrics and Reporting
- [ ] **Set coverage targets** — Define minimum line/branch coverage per module and overall.  
- [ ] **Measure meaningful coverage** — Prefer branch and mutation testing to validate test effectiveness.  
- [ ] **Track test execution time** — Monitor slow tests and optimize or split them.  
- [ ] **Report failures clearly** — CI notifications include failing test, stack trace, and reproduction steps.  
- [ ] **Monitor post-release** — Use telemetry and error tracking to detect gaps in test coverage.

#### Maintenance and Governance
- [ ] **Review tests in code review** — Treat tests as production code; require reviews and approvals.  
- [ ] **Keep tests up to date** — Update or remove tests when requirements or implementations change.  
- [ ] **Document test strategy** — Where tests live, how to run them, and how to add new tests.  
- [ ] **Schedule periodic audits** — Review coverage, flaky tests, and test debt quarterly.  
- [ ] **Train the team** — Share best practices for writing reliable, maintainable tests.  
- [ ] **Automate cleanup** — Remove obsolete fixtures, unused mocks, and deprecated test helpers.

Use this checklist as a template and adapt thresholds, tools, and processes to your project and risk profile.
