# Phase 6B Implementation Plan: Repository & Branch Management
**Status:** Ready to Begin  
**Date:** January 8, 2026  
**Priority:** HIGH (Foundation for Phases 6C-6F)  

---

## Executive Summary

Phase 6B implements **Repository Lifecycle Management** (Feature 15) and **Safe Branching Strategy** (Features 16-18), enabling:

1. **Repository Lifecycle Service** — Create/initialize repositories, scaffold structure, configure environments
2. **Branching Strategy Service** — Enforce Git Flow or trunk-based strategy
3. **Branch Isolation & Merge Safety** — Automated testing, architecture validation, dependency checks
4. **Stale Branch Cleanup** — Auto-detect and remove abandoned branches

**Estimated Effort:** 2-3 weeks  
**LOC Planned:** ~4,500 production + ~1,200 test  
**API Endpoints:** 25 new  
**Database Tables:** 2 new (repositories, branches)

---

## Feature Requirements (From Phase 6A Plan)

### Feature 15: Repository Lifecycle Management
**Description:** Create repositories, initialize structures, configure environments, scaffold documentation

**Requirements:**
- Repository creation via GitHub API
- Local folder initialization
- .gitignore, CI/CD config scaffolding
- README, docs structure generation
- Environment variable setup
- Dependency installation (npm, composer)

### Feature 16-18: Safe Branching Strategy
**Description:** Enforce branching model with feature/hotfix/release/integration branches, merge safety validation

**Requirements:**
- Branch naming convention enforcement
- Feature/hotfix/release/integration branch auto-creation
- Test suite execution before merge
- Architecture validation before merge
- Dependency check before merge
- Stale branch detection (>30 days, CI passing)
- Automated branch cleanup with confirmation

---

## Database Schema

### repositories Table
```sql
CREATE TABLE repositories (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id),
    name varchar(255) NOT NULL,
    url varchar(500) NOT NULL,
    type ENUM('monorepo', 'polyrepo') DEFAULT 'monorepo',
    initialized_at timestamp,
    status ENUM('pending', 'initializing', 'active', 'archived') DEFAULT 'pending',
    config JSON,  -- scaffolding options, CI/CD type, etc.
    created_at timestamp,
    updated_at timestamp,
    UNIQUE(project_id, name),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE repository_branches (
    id uuid PRIMARY KEY,
    repository_id uuid NOT NULL REFERENCES repositories(id),
    name varchar(255) NOT NULL,
    type ENUM('main', 'feature', 'hotfix', 'release', 'integration') DEFAULT 'feature',
    issue_id uuid REFERENCES tasks(id),  -- linked task
    created_at timestamp,
    last_commit_at timestamp,
    last_ci_status ENUM('pending', 'success', 'failure') DEFAULT 'pending',
    protected boolean DEFAULT false,
    updated_at timestamp,
    UNIQUE(repository_id, name),
    FOREIGN KEY (repository_id) REFERENCES repositories(id)
);
```

---

## Service Architecture

### RepositoryLifecycleService (~600 lines)
**Purpose:** Manage repository creation, initialization, and scaffolding

**Core Methods:**
```php
// Repository management
public function createRepository(string $projectId, array $config): Repository;
public function initializeRepository(string $repositoryId, array $options): void;
public function scaffoldStructure(string $repositoryId, string $template): void;
public function configureEnvironment(string $repositoryId, array $envVars): void;
public function archiveRepository(string $repositoryId): void;

// Queries
public function getRepository(string $repositoryId): Repository;
public function getProjectRepositories(string $projectId): Collection;

// Integration helpers
public function getRepositoryStatus(string $repositoryId): RepositoryStatus;
public function validateRepositoryHealth(string $repositoryId): ValidationResult;
```

**Key Features:**
- Integrates with GitHub API (create remote repo)
- Local file system scaffolding
- Template support (Laravel, Node, monorepo, etc.)
- Environment variable management
- CI/CD config generation
- Logging & audit trail

### BranchingStrategyService (~500 lines)
**Purpose:** Enforce branching conventions and manage branch lifecycle

**Core Methods:**
```php
// Branch creation
public function createBranch(string $repositoryId, string $taskId, array $options): Branch;
public function createFeatureBranch(string $repositoryId, string $taskId): Branch;
public function createHotfixBranch(string $repositoryId, string $issueId): Branch;
public function createReleaseBranch(string $repositoryId, string $version): Branch;

// Branch validation
public function validateBranchName(string $name, string $type): ValidationResult;
public function validateBranchingStrategy(string $repositoryId): ValidationResult;

// Branch queries
public function getBranch(string $branchId): Branch;
public function getRepositoryBranches(string $repositoryId, string $type = null): Collection;
public function getActiveBranches(string $repositoryId): Collection;
```

**Key Features:**
- Naming convention enforcement (feature/{issue-id}, hotfix/{version}, etc.)
- Automatic branch creation per Git Flow
- Strategy validation (no stale main, etc.)
- Branch protection rules
- Merge base tracking

### BranchIsolationService (~400 lines)
**Purpose:** Validate branch isolation and prevent unsafe merges

**Core Methods:**
```php
// Merge validation
public function validateMergeReady(string $branchId): MergeValidationResult;
public function runMergeGates(string $branchId): array;  // tests, arch, deps

// Merge gates
public function validateTests(string $branchId): TestResult;
public function validateArchitecture(string $branchId): ArchitectureResult;
public function validateDependencies(string $branchId): DependencyResult;

// Merge authorization
public function authorizeMerge(string $branchId, ?string $userId = null): void;
public function rejectMerge(string $branchId, string $reason): void;

// Branch cleanup
public function detectStaleBranches(string $repositoryId, int $daysThreshold = 30): Collection;
public function cleanupStaleBranches(string $repositoryId, bool $confirm = true): CleanupResult;
```

**Key Features:**
- Test suite validation (via CI/CD)
- Architecture drift detection (Phase 1 graph logic)
- Dependency validation (no breaking upgrades)
- Merge conflict detection
- Rollback support
- Audit trail for all merge decisions

---

## API Endpoints (25 Total)

### Repository Management (8 endpoints)
```php
POST   /api/v1/projects/{projectId}/repositories         // Create repo
GET    /api/v1/projects/{projectId}/repositories         // List repos
GET    /api/v1/repositories/{repositoryId}               // Get repo details
PATCH  /api/v1/repositories/{repositoryId}               // Update repo config
DELETE /api/v1/repositories/{repositoryId}               // Archive repo
POST   /api/v1/repositories/{repositoryId}/initialize    // Initialize (scaffold)
POST   /api/v1/repositories/{repositoryId}/health        // Health status
GET    /api/v1/projects/{projectId}/repo-status         // Project repo status
```

### Branch Management (9 endpoints)
```php
POST   /api/v1/repositories/{repositoryId}/branches              // Create branch
GET    /api/v1/repositories/{repositoryId}/branches              // List branches
GET    /api/v1/branches/{branchId}                               // Get branch
PATCH  /api/v1/branches/{branchId}                               // Update branch
DELETE /api/v1/branches/{branchId}                               // Delete branch
POST   /api/v1/branches/{branchId}/protect                       // Protect branch
POST   /api/v1/repositories/{repositoryId}/branches/strategy     // Validate strategy
GET    /api/v1/repositories/{repositoryId}/branches/active       // Get active branches
GET    /api/v1/repositories/{repositoryId}/branches/stale        // Detect stale
```

### Merge & Validation (8 endpoints)
```php
POST   /api/v1/branches/{branchId}/validate-merge            // Check merge ready
POST   /api/v1/branches/{branchId}/merge-gates               // Run all gates
GET    /api/v1/branches/{branchId}/merge-status             // Get merge status
POST   /api/v1/branches/{branchId}/authorize-merge          // Approve merge
POST   /api/v1/branches/{branchId}/reject-merge             // Reject merge
POST   /api/v1/branches/{branchId}/run-tests                // Run test suite
POST   /api/v1/branches/{branchId}/validate-architecture    // Arch check
GET    /api/v1/repositories/{repositoryId}/branches/cleanup  // Stale cleanup
```

---

## Testing Strategy

### Unit Tests (~400 lines)
- **RepositoryLifecycleServiceTest** (100 lines)
  - Repository creation validation
  - Environment variable handling
  - Template scaffolding logic
  
- **BranchingStrategyServiceTest** (100 lines)
  - Branch naming convention validation
  - Strategy enforcement
  - Branch creation workflows

- **BranchIsolationServiceTest** (200 lines)
  - Merge gate validation
  - Test result parsing
  - Architecture drift detection
  - Stale branch detection

### Integration Tests (~300 lines)
- GitHub API integration (mock)
- File system operations (tempdir)
- Database transactions (rollback)
- End-to-end merge workflow
- Branch cleanup with CI status

### API Tests (~400 lines)
- Repository CRUD operations
- Branch creation/deletion
- Merge authorization flow
- Health endpoint responses
- Error handling (401, 404, 422)

---

## Implementation Roadmap

### Week 1: Foundation
1. Database migrations (repositories, branches tables)
2. Models: Repository, Branch, MergeGate, RepositoryStatus
3. RepositoryLifecycleService core methods (60%)
4. BranchingStrategyService core methods (60%)

### Week 2: Merge Validation
1. BranchIsolationService implementation (100%)
2. Merge gate implementations (tests, arch, deps)
3. Integration with Phase 1 graph logic
4. Integration with Phase 5 monitoring

### Week 3: API & Testing
1. RepositoryController (8 endpoints)
2. BranchController (9 endpoints)
3. MergeController (8 endpoints)
4. Comprehensive test suite
5. Validation rules and error handling

---

## Dependencies & Prerequisites

### Must Have Before Starting
- ✅ Phase 1-3 infrastructure (models, services, repositories)
- ✅ Phase 4 GitHub API integration (Octokit client)
- ✅ Phase 5 logging and monitoring
- ✅ Database migration tooling

### Integration Points
- **Phase 1 Services:** DependencyGraphService (for merge validation)
- **Phase 5 Services:** LoggingService, MetricsCollectionService
- **Phase 4 Services:** GitHubIntegrationService (for repo creation)
- **Phase 6A Services:** TaskOrchestrationService (branch to task linking)

---

## Key Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| GitHub API rate limiting | LOW | MEDIUM | Implement caching, batch operations |
| CI/CD integration complexity | MEDIUM | HIGH | Use simple HTTP polling first, webhook later |
| Merge conflict handling | LOW | MEDIUM | Leverage git CLI for conflict detection |
| File system permission issues | MEDIUM | LOW | Use tempdir, cleanup on error |
| Concurrent branch operations | LOW | MEDIUM | Database locks, transaction isolation |

---

## Success Criteria

- ✅ All 25 API endpoints implemented and tested
- ✅ Repository creation working end-to-end with GitHub
- ✅ Branch creation following Git Flow strategy
- ✅ Merge gates (tests, arch, deps) validating correctly
- ✅ Stale branch detection and cleanup working
- ✅ All unit/integration/API tests passing
- ✅ Zero database migration errors
- ✅ Logging and audit trail complete

---

## First Tasks to Create

**Priority Order for Execution:**

1. **Database Migrations** (P1-HIGH)
   - Create repositories table
   - Create branches table
   - Add indexes, foreign keys
   - ~60 min

2. **Models: Repository & Branch** (P2-HIGH)
   - Define relationships
   - Add validation rules
   - Add eager loading strategies
   - ~90 min

3. **RepositoryLifecycleService: Core Methods** (P3-HIGH)
   - createRepository()
   - initializeRepository()
   - scaffoldStructure()
   - configureEnvironment()
   - ~120 min (split into 2 subtasks)

4. **BranchingStrategyService: Core Methods** (P4-HIGH)
   - createBranch()
   - createFeatureBranch()
   - validateBranchName()
   - ~90 min

5. **BranchIsolationService: Merge Validation** (P5-HIGH)
   - validateMergeReady()
   - runMergeGates()
   - validateTests()
   - validateArchitecture()
   - validateDependencies()
   - ~180 min (split into 3 subtasks)

6. **RepositoryController: API Endpoints** (P6-HIGH)
   - 8 repository endpoints
   - Request validation
   - Response formatting
   - ~150 min

7. **Testing Suite** (P7-HIGH)
   - Unit tests for all services
   - Integration tests
   - API tests
   - ~200 min (split into phases)

---

## Ready to Begin

All dependencies are met. Phase 6B is **ready to start immediately**.

**Next Action:** Execute Task 1 (Database Migrations) as first subtask.

---

**Plan Prepared:** Auto Zen Agent  
**Alignment:** 35-Feature Project Plan (Features 15-18)  
**Status:** ✅ READY FOR EXECUTION
