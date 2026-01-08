# Recommended New Tasks — Ready to Create
**Analysis Date:** January 8, 2026  
**Recommendation Status:** High-priority, dependency-clear tasks ready for immediate creation  

---

## 🚨 URGENT — Create in Next 8 Hours

### Task 1: Verify Phase 7 Auto-Agent Switching Functionality
```yaml
title: "Verify Phase 7: Auto-Agent Switching & Continuous Execution"
priority: "critical"
status: "pending"
type: "testing"
dependencies: ["TASK-mk3k0e09-culd4"]  # Must verify this first

description: |
  Verify that TASK-mk3k0e09-culd4 (Phase 7 auto-switching) works as designed.
  Phase 8 (GitHub Issue Sync) cannot start until this is verified.

details: |
  Test Scenarios:
  1. Planning cycle: Give Zen Planner a high-level requirement
     - Verify it creates structured tasks
     - Verify tasks have dependencies
     - Mark "planning complete"
  
  2. Execution cycle: Auto Zen picks up tasks from queue
     - Verify it executes one task
     - Verify it marks task complete
     - Verify it reports status
  
  3. Loop cycle: Next iteration without manual intervention
     - Verify next task auto-selected
     - Verify no user prompt required
     - Verify loop continues until queue empty
  
  4. Failure handling: What if Zen Planner creates invalid tasks?
     - Verify Auto Zen detects and reports
     - Verify graceful error handling
     - Verify does not loop infinitely

testStrategy: |
  - Create test queue with 3 planning tasks + 3 execution tasks
  - Run auto-switch loop for full cycle
  - Measure loop latency (goal: <2s per iteration)
  - Verify no manual intervention required
  - Document any issues or edge cases
  - Update TASK-mk3k0e09-culd4 status to "tested" or "issues"

expectedOutput: |
  - Auto-switch test scenario file (markdown)
  - Pass/fail report for each scenario
  - Any blocking issues documented
  - Recommendation: Mark Phase 8 as READY (if passing) or CREATE PREREQUISITE

effort: "2-3 hours"
```

---

### Task 2: Complete LLM-SETUP.md Documentation
```yaml
title: "Complete LLM-SETUP.md User Documentation"
priority: "high"
status: "in-progress"  # Already started
type: "documentation"
dependencies: []

description: |
  Complete the LLM-SETUP.md documentation started on 2026-01-08.
  Users need clear instructions to configure OpenAI or LM Studio endpoints.

details: |
  Sections Required:
  
  1. OpenAI Configuration
     - Sign up for OpenAI API
     - Get API key
     - Configure in VS Code settings
     - Test connection
  
  2. LM Studio Local Setup
     - Download LM Studio
     - Install and run
     - Default port (1234)
     - Configure in VS Code settings
     - Download a model (e.g., mistral-7b)
     - Test connection
  
  3. Settings Reference
     - Base URL formats (openai, lm studio)
     - API key handling (security note)
     - Model selection
     - Temperature/timeout/max_tokens
     - Task roots configuration
  
  4. Connection Troubleshooting
     - 401 Unauthorized (API key issues)
     - 404 Not Found (wrong endpoint)
     - ECONNREFUSED (server not running)
     - Timeout (server too slow)
  
  5. Quick Start Checklist
     - Download LM Studio OR get OpenAI API key
     - Configure settings via copilot-orchestrator.configureLLM
     - Run copilot-orchestrator.testConnection
     - Verify success message

testStrategy: |
  - Follow guide steps for OpenAI (on real account)
  - Follow guide steps for LM Studio (local)
  - Verify testConnection works for both
  - Confirm error messages are clear
  - Link check (all URLs valid)

expectedOutput: |
  - vscode-extension/LLM-SETUP.md (~500 words, 5 sections)
  - Link from README → LLM-SETUP.md
  - Screen captures/examples if possible

effort: "1-2 hours"
```

---

### Task 3: Consolidate Duplicate Tasks in tasks.json
```yaml
title: "Consolidate Duplicate Tasks in _ZENTASKS/tasks.json"
priority: "high"
status: "pending"
type: "maintenance"
dependencies: []

description: |
  Clean up duplicate/overlapping tasks that create confusion and risk redundant work.
  Consolidate into single authoritative versions.

details: |
  Duplicates to Consolidate:
  
  1. GitHub Issue Sync
     - TASK-mk3k0imm-mf7ju: "Implement Phase 8: GitHub Issue Sync..." (PENDING, detailed)
     - TASK-mk530s0c-toc0y: "Implement GitHub Issue Sync..." (PENDING, less detailed)
     - ACTION: Keep mk3k0imm-mf7ju; Archive/delete mk530s0c-toc0y
  
  2. TransportTest.ts
     - TASK-mk54jgk9-y2jsh: "...payload-to-LLM mapping" (PENDING)
     - TASK-mk54nip9-67p9x: "...LLM payload transport validation" (DONE)
     - ACTION: DONE task is correct; Delete PENDING duplicate
  
  3. Auto-Agent Switching
     - TASK-mjy040m5-0ggvk: Old version (PENDING, 2026-01-03)
     - TASK-mk3k0e09-culd4: New version (DONE, 2026-01-07)
     - ACTION: Archive old task; keep new version

testStrategy: |
  - Verify old task IDs not referenced elsewhere
  - Move archived tasks to separate "archived" section in tasks.json
  - Confirm only one version remains for each feature

expectedOutput: |
  - Updated tasks.json with duplicates consolidated
  - Optional: Archived tasks moved to separate file
  - Confirmation: Clean dependency graph (no orphans)

effort: "30 minutes"
```

---

## 🔴 HIGH-PRIORITY — Create Today

### Task 4-9: Phase 6B Backend Task Hierarchy
**Background:** PHASE-6B-IMPLEMENTATION-PLAN.md exists with detailed design but NO tasks. Phase 6B should not block backend work.

#### Task 4: Implement Phase 6B Database Migrations
```yaml
title: "Implement Phase 6B: Database Migrations (repositories, branches)"
priority: "high"
status: "pending"
type: "backend"
dependencies: []

description: |
  Create Laravel migrations for Phase 6B repository & branch management.
  Implement 2 new database tables per PHASE-6B-IMPLEMENTATION-PLAN.md.

details: |
  Tables to Create:
  
  1. repositories
     - id (uuid primary key)
     - project_id (fk → projects)
     - name, url (unique combo)
     - type (enum: monorepo, polyrepo)
     - initialized_at, status
     - config (JSON)
     - created_at, updated_at
     - Indexes: project_id, status
  
  2. repository_branches
     - id (uuid primary key)
     - repository_id (fk → repositories)
     - name, type (enum: main/feature/hotfix/release/integration)
     - issue_id (fk → tasks)
     - created_at, last_commit_at, last_ci_status
     - protected (bool)
     - created_at, updated_at
     - Indexes: repository_id, issue_id, type

testStrategy: |
  - php artisan migrate (verify no errors)
  - Verify tables exist with correct columns
  - Test foreign key constraints
  - Test unique constraints
  - Rollback and re-migrate (verify idempotent)

expectedOutput: |
  - database/migrations/YYYY_MM_DD_create_repositories_table.php
  - database/migrations/YYYY_MM_DD_create_repository_branches_table.php
  - Zero migration errors

effort: "2-3 hours"
```

#### Task 5: Implement RepositoryLifecycleService
```yaml
title: "Implement Phase 6B: RepositoryLifecycleService"
priority: "high"
status: "pending"
type: "backend"
dependencies: ["Task-4"]  # Database migrations must exist first

description: |
  Create RepositoryLifecycleService for managing repository creation,
  initialization, and scaffolding (per PHASE-6B-IMPLEMENTATION-PLAN.md).

details: |
  Service Methods (~600 LOC):
  
  1. createRepository($projectId, $config): Repository
     - Create repo in database
     - Validate project_id exists
     - Return Repository object
  
  2. initializeRepository($repositoryId, $options): void
     - Create GitHub repository if needed
     - Clone/setup local folder
     - Create .gitignore, .editorconfig
     - Initialize git
  
  3. scaffoldStructure($repositoryId, $template): void
     - Create folder structure (src/, tests/, docs/)
     - Copy template files
     - Update README with project info
  
  4. configureEnvironment($repositoryId, $envVars): void
     - Create .env file
     - Set default values
     - Install dependencies (npm install, composer install)
  
  5. archiveRepository($repositoryId): void
     - Mark status = 'archived'
     - Keep data (don't delete)

testStrategy: |
  - Unit tests for each method
  - Mock GitHub API, file system
  - Test error handling (missing project, file write failures)
  - Integration test: full workflow

expectedOutput: |
  - app/Services/RepositoryLifecycleService.php (~600 LOC)
  - tests/Unit/RepositoryLifecycleServiceTest.php (~400 LOC)
  - All tests passing

effort: "6-8 hours"
```

#### Task 6: Implement BranchingStrategyService
```yaml
title: "Implement Phase 6B: BranchingStrategyService"
priority: "high"
status: "pending"
type: "backend"
dependencies: ["Task-4"]

description: |
  Enforce Git Flow branching strategy: feature/hotfix/release/integration branches
  with naming conventions and branch creation logic.

details: |
  Service Methods (~700 LOC):
  
  1. createBranch($repositoryId, $branchType, $issueId): RepositoryBranch
     - Validate branchType (main/feature/hotfix/release/integration)
     - Generate name: feature/issue-{id}, hotfix/*, release/v*
     - Create in database
     - Return RepositoryBranch
  
  2. validateBranchName($name, $type): bool
     - Check naming convention
     - Verify pattern matches type
  
  3. detectStaleBranches($repositoryId, $daysThreshold=30): Collection
     - Find branches with no commits >30d
     - Check if CI passing
     - Return stale branch list
  
  4. suggestCleanup($staleBranches): Collection
     - Recommend deletion
     - Keep if has open PR or issue
  
  5. getProtectedBranches($repositoryId): Collection
     - main branch always protected
     - Return list of protected branches

testStrategy: |
  - Unit tests for naming convention validation
  - Unit tests for stale branch detection
  - Mock git log queries
  - Integration test: branch creation workflow

expectedOutput: |
  - app/Services/BranchingStrategyService.php (~700 LOC)
  - tests/Unit/BranchingStrategyServiceTest.php (~500 LOC)
  - All tests passing

effort: "8-10 hours"
```

#### Task 7: Implement BranchIsolationService (Merge Safety)
```yaml
title: "Implement Phase 6B: BranchIsolationService (Merge Safety)"
priority: "high"
status: "pending"
type: "backend"
dependencies: ["Task-4"]

description: |
  Implement merge safety validation: run tests, architecture checks, 
  dependency checks before allowing merge to main/integration branches.

details: |
  Service Methods (~800 LOC):
  
  1. validateMerge($branchId, $targetBranch='main'): MergeValidation
     - Check branch exists
     - Run test suite
     - Run architecture checks
     - Check dependencies
     - Return validation result (pass/fail/warnings)
  
  2. runTestSuite($repositoryId): TestResults
     - Execute npm test / phpunit
     - Parse results
     - Return pass/fail count
  
  3. checkArchitecture($repositoryId): ArchitectureCheck
     - Use Phase 1-3 services to validate
     - Check for breaking changes
     - Return check results
  
  4. checkDependencies($repositoryId): DependencyCheck
     - Compare dependencies before/after
     - Flag security issues (CVE)
     - Flag version conflicts
  
  5. approveMerge($branchId): bool
     - All checks passed?
     - Mark branch merge-approved
     - Return true/false

testStrategy: |
  - Mock test suite execution
  - Mock architecture validation
  - Mock dependency checks
  - Integration test: merge workflow with all checks
  - Test failure scenarios (tests fail, arch breaks, etc.)

expectedOutput: |
  - app/Services/BranchIsolationService.php (~800 LOC)
  - tests/Unit/BranchIsolationServiceTest.php (~600 LOC)
  - All tests passing

effort: "10-12 hours"
```

#### Task 8: Implement Phase 6B REST API Endpoints (25 endpoints)
```yaml
title: "Implement Phase 6B: REST API Endpoints (25 endpoints)"
priority: "high"
status: "pending"
type: "backend"
dependencies: ["Task-5", "Task-6", "Task-7"]

description: |
  Create 25 REST API endpoints for repository & branch management.
  Routes, controllers, validation, error handling per REST conventions.

details: |
  Endpoint Groups:
  
  Repositories (10 endpoints):
  - POST   /api/v1/projects/{projectId}/repositories (create)
  - GET    /api/v1/projects/{projectId}/repositories (list)
  - GET    /api/v1/repositories/{id} (show)
  - PUT    /api/v1/repositories/{id} (update)
  - DELETE /api/v1/repositories/{id} (delete/archive)
  - POST   /api/v1/repositories/{id}/initialize (setup)
  - POST   /api/v1/repositories/{id}/scaffold (structure)
  - POST   /api/v1/repositories/{id}/configure (environment)
  - GET    /api/v1/repositories/{id}/health (status)
  - POST   /api/v1/repositories/{id}/archive (archive)
  
  Branches (10 endpoints):
  - POST   /api/v1/repositories/{repoId}/branches (create)
  - GET    /api/v1/repositories/{repoId}/branches (list)
  - GET    /api/v1/branches/{id} (show)
  - DELETE /api/v1/branches/{id} (delete)
  - POST   /api/v1/branches/{id}/protect (protect)
  - GET    /api/v1/repositories/{repoId}/branches/stale (detect stale)
  - POST   /api/v1/branches/{id}/merge/validate (check merge safety)
  - POST   /api/v1/branches/{id}/merge/approve (approve merge)
  - POST   /api/v1/branches/{id}/cleanup (delete stale)
  - GET    /api/v1/repositories/{repoId}/protected (list protected)
  
  Configuration (5 endpoints):
  - GET    /api/v1/branching-strategies (list available)
  - POST   /api/v1/repositories/{id}/strategy (set strategy)
  - GET    /api/v1/repositories/{id}/merge-policies (policies)
  - POST   /api/v1/repositories/{id}/merge-policies (update)
  - GET    /api/v1/repositories/{id}/ci-config (CI settings)

testStrategy: |
  - Feature tests for each endpoint (CRUD operations)
  - Error handling tests (validation, permissions, not found)
  - Integration tests (workflows: create repo → create branch → merge)
  - Performance tests (list endpoints with 100+ items)

expectedOutput: |
  - routes/api.php (new routes)
  - app/Http/Controllers/RepositoryController.php (~400 LOC)
  - app/Http/Controllers/BranchController.php (~400 LOC)
  - app/Http/Requests/StoreRepository.php (~100 LOC)
  - app/Http/Requests/UpdateRepository.php (~100 LOC)
  - tests/Feature/RepositoryApiTest.php (~600 LOC)
  - tests/Feature/BranchApiTest.php (~600 LOC)
  - All tests passing

effort: "15-18 hours"
```

#### Task 9: Implement Phase 6B Comprehensive Tests
```yaml
title: "Implement Phase 6B: Comprehensive Test Suite"
priority: "high"
status: "pending"
type: "testing"
dependencies: ["Task-8"]

description: |
  Create comprehensive test suite for Phase 6B (repository & branch management).
  Unit tests, feature tests, integration tests, edge cases.

details: |
  Test Coverage:
  
  1. Unit Tests (~400 LOC)
     - RepositoryLifecycleService methods
     - BranchingStrategyService methods
     - BranchIsolationService methods
     - Validation logic
     - Error handling
  
  2. Feature Tests (~400 LOC)
     - Repository CRUD operations
     - Branch CRUD operations
     - Protected branch enforcement
     - Merge validation workflow
     - Stale branch detection
  
  3. Integration Tests (~200 LOC)
     - Full repo creation → init → scaffold → configure
     - Branch creation → merge gate → approval
     - Stale branch detection → cleanup
     - Error scenarios (network failures, permissions)
  
  4. Edge Cases (~200 LOC)
     - Duplicate repo/branch names
     - Invalid transitions (hotfix after release)
     - Concurrent branch operations
     - Large repository scenarios (1000+ branches)

testStrategy: |
  - Run full test suite: phpunit
  - Verify coverage >90%
  - Performance tests (merge gate validation <1s)
  - Stress tests (1000 branches)

expectedOutput: |
  - tests/Unit/RepositoryLifecycleServiceTest.php (~200 LOC)
  - tests/Unit/BranchingStrategyServiceTest.php (~150 LOC)
  - tests/Unit/BranchIsolationServiceTest.php (~200 LOC)
  - tests/Feature/RepositoryApiTest.php (~300 LOC)
  - tests/Feature/BranchApiTest.php (~300 LOC)
  - tests/Feature/MergeGateTest.php (~200 LOC)
  - All 25+ tests passing
  - Coverage >90%

effort: "8-10 hours"
```

---

## 🟠 MEDIUM-PRIORITY — Create This Week

### Task 10: Panel Action Binding Implementation
```yaml
title: "Implement Panel Action Bindings (Execute/Status/Links)"
priority: "high"
status: "pending"
type: "extension-feature"
dependencies: 
  - "TASK-mk522us5-v7ch2"  # Panel scaffold ✅
  - "TASK-mk522llm-mvpvd"  # Wire to extension ✅
  - "TASK-mk521zai-ehluc"  # testConnection command ✅

description: |
  Wire orchestrator panel action buttons to extension commands.
  Users can execute tasks, change status, open GitHub issues directly from panel.

details: |
  Actions to Implement:
  
  1. Execute Task Button
     - Click → Run task via LLM (dispatc...
     - Show spinner during execution
     - Display response in side panel
     - Update task status automatically
  
  2. Change Status Dropdown
     - pending → in-progress → done → blocked
     - Update task in workspace
     - Persist to tasks.json
     - Show confirmation
  
  3. Open GitHub Issue Link
     - If github_issue_id present
     - Open in default browser
     - Or show issue title/description
  
  4. Open Context Bundle
     - If context present
     - Show file list
     - Option to open in editor

testStrategy: |
  - Mock LLM responses
  - Test status transitions
  - Verify file persistence
  - UI action tests (button clicks)
  - Error handling (network, bad data)

expectedOutput: |
  - Updated orchestratorPanel.ts (~200 LOC)
  - New command handlers for actions
  - Tests for each action
  - Zero compilation errors

effort: "6-8 hours"
```

### Task 11: Create E2E Dispatcher-LLM Integration Test
```yaml
title: "Create E2E Integration Test: Dispatcher → Client → LLM"
priority: "high"
status: "pending"
type: "testing"
dependencies:
  - "TASK-mk4zb7ym-qy4ay"   # Dispatcher survey ✅
  - "TASK-mk521vbf-ulaic"   # Client builder ✅
  - "TASK-mk54nip9-67p9x"   # Transport test ✅

description: |
  Create end-to-end test verifying full pipeline: 
  Dispatcher composes prompt → Client builds request → LLM responds → Response processed.

details: |
  Test Scenarios:
  
  1. Full Pipeline Test
     - Create task payload
     - Compose prompt via CopilotDispatcher
     - Build request via client.ts
     - Send to mock LLM
     - Verify response integration
  
  2. Real LM Studio Test
     - Connect to local LM Studio instance
     - Send real prompt
     - Verify response quality
     - Measure latency
  
  3. Error Scenarios
     - Network failure (timeout)
     - LLM error response (500)
     - Malformed payload
     - Invalid API key
  
  4. Context Preservation
     - Verify taskId preserved
     - Verify agent info transmitted
     - Verify memory maintained
     - Verify metadata tracked

testStrategy: |
  - Unit test with mocked LLM
  - Integration test with real LM Studio (if available)
  - Error injection tests
  - Performance benchmarks (target: <5s per request)

expectedOutput: |
  - vscode-extension/src/__tests__/e2eDispatcherLlmTest.ts (~300 LOC)
  - Dispatcher → Client → LLM pipeline validated
  - All scenarios passing
  - Latency metrics documented

effort: "6-8 hours"
```

---

## Summary: Task Creation Checklist

### Create Immediately (Next 8 Hours)
- [ ] TASK-VERIFY-PHASE-7 (verify auto-switch works)
- [ ] TASK-COMPLETE-LLM-SETUP (finish documentation)
- [ ] TASK-CONSOLIDATE-DUPLICATES (clean up tasks.json)

### Create Today (Batch 1)
- [ ] TASK-PHASE-6B-DATABASE (migrations)
- [ ] TASK-PHASE-6B-REPO-LIFECYCLE (service)
- [ ] TASK-PHASE-6B-BRANCHING (service)

### Create Today (Batch 2)
- [ ] TASK-PHASE-6B-MERGE-GATE (service)
- [ ] TASK-PHASE-6B-API-ENDPOINTS (25 endpoints)
- [ ] TASK-PHASE-6B-TESTS (comprehensive)

### Create This Week
- [ ] TASK-PANEL-ACTION-BINDING (execute/status/links)
- [ ] TASK-E2E-DISPATCHER-LLM-TEST (integration)

---

**Total Estimated Effort:**
- Urgent: 3 hours
- High-Priority: 45-50 hours (Phase 6B)
- Medium-Priority: 12-16 hours
- **Total: ~60-70 hours (1.5-2 weeks for one developer)**

**Recommended:** Use Auto Zen agent to create backend tasks in parallel while documenting Phase 6B completion.

