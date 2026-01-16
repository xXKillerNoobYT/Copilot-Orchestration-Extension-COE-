# ZenTasks to GitHub Issues Migration - READY TO EXECUTE

**Status:** Ready to create 18 GitHub issues  
**GitHub API Rate Limit:** Resets at ~01:59 UTC (38 minutes)  
**Migration Date:** 2026-01-15

---

## Migration Summary

- **Total Tasks:** 18
- **In-Progress:** 3
- **Pending:** 15
- **Priorities:** 7 High, 10 Medium, 1 Low

---

## Issues to Create (Ordered by Priority)

### CRITICAL PRIORITY (Create First)

None currently marked critical.

### HIGH PRIORITY (7 Issues)

#### Issue 1: Implement Plan-Driven Task Decomposition Engine
**Original ID:** TASK-mk9547ql-mdpp0  
**Status:** in-progress → `status:in-progress`  
**Priority:** high → `priority:high`  
**Type:** `type:feature`  

**Title:** Implement Plan-Driven Task Decomposition Engine

**Body:**
```markdown
## Description
Create automated task generation from plan.json output. Analyze plan structure (features, timeline, requirements) and auto-generate decomposed task tree with proper dependencies, priorities, and subtask relationships. Wire to wizard completion flow to automatically populate task queue.

**Current Problem:** Plans are created by wizard but don't drive task generation. Tasks must be created manually, breaking the automation loop.

**What Should Happen:**
```
Wizard completes → Plan.json generated → PlanDecompositionService analyzes plan → 
Automatic task tree generated → Dependencies inferred → Task priorities assigned → 
Task queue updated → Auto Zen execution starts
```

## Details

### Files to Create:
1. `app/Services/PlanDecompositionService.php` (400-500 LOC)
   - Parse plan.json structure
   - Identify features, components, modules
   - Generate task tree
   - Infer dependencies from feature relationships
   - Calculate critical path
   - Assign priorities and estimates

2. `app/Http/Controllers/Api/PlanDecompositionController.php` (200 LOC)
   - Endpoint: POST /api/plans/{id}/decompose
   - Accept plan parameters
   - Call decomposition service
   - Return generated tasks
   - Create tasks in database

3. `vscode-extension/src/planBuilder/planIntegration.ts` (integration)
   - After plan completion, call decomposition endpoint
   - Create tasks from response
   - Update task queue
   - Show progress to user

### Decomposition Algorithm:
1. Extract feature list from plan.json
2. For each feature:
   - Create feature task
   - Break into components (15-45 min subtasks)
   - Create subtasks per component
   - Identify dependencies between features
   - Calculate effort estimates
   - Assign priority based on critical path
3. Detect cross-feature dependencies
4. Create milestones at critical points
5. Validate no circular dependencies
6. Generate execution plan

## Dependencies
None

## Test Strategy
- Unit test: Feed plan.json to decomposition service, verify correct task tree generated
- Integration test: Complete wizard, verify automatic task generation
- Test with multiple wizard paths (designer, analyst, architect)
- Verify dependencies, priorities, and estimates are correct
- Test circular dependency detection
- Handle complex 10+ feature plans
- Performance: Decompose 50+ features in <2 seconds

## Migration Notes
- Original ZenTask ID: TASK-mk9547ql-mdpp0
- Created: 2026-01-10
- Migrated: 2026-01-15
- Status: in-progress (partial implementation exists)
```

**Labels:** `type:feature`, `priority:high`, `status:in-progress`

---

#### Issue 2: Add AI-Powered Contextual Questions
**Original ID:** TASK-mk93kujh-l3z3r  
**Status:** in-progress → `status:in-progress`  
**Priority:** high → `priority:high`  
**Type:** `type:feature`  

**Title:** Add AI-Powered Contextual Questions to Wizard UI

**Body:**
```markdown
## Description
Integrate MCP askQuestion tool into wizard UI. Add contextual AI-powered follow-up questions based on user answers and role. Display suggestions in side panel.

## Details

### Implementation Steps:
1. Create AiAssistanceService to call MCP askQuestion tool
2. Build ContextualAssistant component (Vue 3)
3. On answer change: debounce 1s, call askQuestion with current page context
4. Display suggestions in optional side panel
5. Allow user to accept/reject suggestions
6. Update answers if suggestion accepted
7. Log accepted suggestions for improvement
8. Test with mock LLM responses

### Files to Create:
- `vscode-extension/src/services/AiAssistanceService.ts`
- `vscode-extension/src/components/ContextualAssistant.vue`

## Dependencies
Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#[TASK-mk9352eu-xm9qr] (if exists, otherwise note: legacy dependency)

## Test Strategy
- Unit: Mock askQuestion responses, verify suggestion display
- Integration: Test with live MCP server, verify latency < 2s
- Graceful error handling when MCP unavailable
- Test with various wizard pages
- Verify debounce prevents excessive API calls

## Migration Notes
- Original ZenTask ID: TASK-mk93kujh-l3z3r
- Created: 2026-01-10
- Migrated: 2026-01-15
- Status: in-progress
```

**Labels:** `type:feature`, `priority:high`, `status:in-progress`

---

#### Issue 3: Five Core Questions (MVP Wizard)
**Original ID:** TASK-mk935327-9r7k4  
**Status:** pending → `status:pending`  
**Priority:** high → `priority:high`  
**Type:** `type:feature`  

**Title:** Implement Five Core Questions for Wizard MVP

**Body:**
```markdown
## Description
Implement 5 essential questions: Project Overview, Architecture Pattern, Feature Breakdown, Timeline Planning, Team Structure. MVP simplified version for initial wizard implementation.

## Details

### Questions:
1. **Q1 - Project Overview:** name, description, type
2. **Q2 - Architecture:** pattern selection with diagrams
3. **Q3 - Features:** add/remove, priorities, dependencies
4. **Q4 - Timeline:** milestones, dates, Gantt preview
5. **Q5 - Team:** roles, skills, agent mapping

### Files to Create:
- `vscode-extension/src/planBuilder/questions/ProjectOverview.vue`
- `vscode-extension/src/planBuilder/questions/ArchitecturePattern.vue`
- `vscode-extension/src/planBuilder/questions/FeatureBreakdown.vue`
- `vscode-extension/src/planBuilder/questions/TimelinePlanning.vue`
- `vscode-extension/src/planBuilder/questions/TeamStructure.vue`

**Estimate:** 8-12 hours total

## Dependencies
Legacy dependency: EPIC-001

## Test Strategy
- Complete wizard flow through all 5 questions
- Validate all fields and data collection
- Verify previews update correctly
- Test wizardStore integration
- Verify data persistence across page transitions

## Migration Notes
- Original ZenTask ID: TASK-mk935327-9r7k4
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:high`, `status:pending`

---

#### Issue 4: Setup Jest Testing Framework
**Original ID:** TASK-mk9aks12-jest-setup  
**Status:** pending → `status:pending`  
**Priority:** high → `priority:high`  
**Type:** `type:testing`  

**Title:** Setup Jest Testing Framework for VS Code Extension

**Body:**
```markdown
## Description
Configure Jest testing framework for VS Code extension to complement existing Mocha and Vitest setups. Provide unified testing experience with better TypeScript support and modern async testing capabilities.

**Current State:**
- ✅ Mocha tests exist for extension core
- ✅ Vitest tests exist for wizard/planBuilder components
- ❌ Jest not configured

**Rationale:**
- Better async/await support than Mocha
- Better TypeScript integration via ts-jest
- Snapshot testing capabilities
- Parallel test execution
- Better mocking utilities

## Details

### Installation:
```bash
npm install --save-dev jest ts-jest @types/jest @vscode/test-electron
```

### Files to Create/Modify:
1. `vscode-extension/jest.config.js` (new)
2. `vscode-extension/package.json` (modify scripts, add devDependencies)
3. `vscode-extension/src/__tests__/sample.test.ts` (new - verification)
4. `.vscode/settings.json` (modify - test explorer config)

### Package.json Scripts:
```json
{
  "test:jest": "jest",
  "test:jest:watch": "jest --watch",
  "test:jest:coverage": "jest --coverage"
}
```

## Dependencies
None

## Test Strategy
1. Run `npm test:jest` - should execute without errors
2. Run `npm test:jest:watch` - should enter watch mode
3. Run `npm test:jest:coverage` - should generate coverage report
4. Verify VS Code Test Explorer shows Jest tests
5. Verify existing Mocha/Vitest tests still work
6. Check IntelliSense for Jest matchers (expect, describe, it)

## Migration Notes
- Original ZenTask ID: TASK-mk9aks12-jest-setup
- Created: 2026-01-11
- Migrated: 2026-01-15
- Note: Jest will complement (not replace) existing test frameworks
```

**Labels:** `type:testing`, `priority:high`, `status:pending`

---

#### Issue 5: Fix Critical Blockers (Git, Design System, Tests)
**Original ID:** TASK-mk9fli5s-rdccw  
**Status:** pending → `status:pending`  
**Priority:** high → `priority:high`  
**Type:** `type:bug`  

**Title:** Fix Critical Blockers: Git State, Design System, and Tests

**Body:**
```markdown
## Description
Resolve three blocking issues preventing project execution:
1. Git repository in inconsistent state with uncommitted changes in vscode-extension/
2. Design system integration incomplete with TEMPORARY markers in planIntegration.ts
3. Test suite partially disabled with design system tests as .disabled files

## Details

### Problem Summary:
1. **Uncommitted changes** in vscode-extension/ (test files disabled, planIntegration.ts modified)
2. **Design system imports** commented out with TEMPORARY markers (lines 11-17, 180-195)
3. **Design system tests** disabled (.disabled extension) with no replacement tests

### Implementation Steps:
1. Commit all pending changes in vscode-extension/
2. Restore design system imports in planIntegration.ts (remove TEMPORARY markers)
3. Re-enable design system tests (rename .disabled files back to .ts)
4. Run design system test suite (74+ tests should pass)
5. Verify TypeScript compilation (0 errors)
6. Update task statuses in _ZENTASKS/
7. Update CODE-MASTER-ALIGNMENT.md with completion status

### Files to Check/Modify:
- `vscode-extension/src/planBuilder/planIntegration.ts` (restore imports, remove TEMPORARY)
- `vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts.disabled` (re-enable)
- `vscode-extension/src/planBuilder/designSystem/validator.test.ts.disabled` (re-enable)
- `_ZENTASKS/tasks.json` (update related task statuses)
- `Docs/Plan/CODE-MASTER-ALIGNMENT.md` (update status from HIGH to RESOLVED)

## Dependencies
None

## Test Strategy
1. Verify git status (git status → 'nothing to commit')
2. Run design tests (npm test -- designSystem → 100% pass rate)
3. Verify TypeScript (npm run compile → 0 errors)
4. Check CODE-MASTER-ALIGNMENT.md (status shows RESOLVED)
5. Verify no TEMPORARY markers (grep -r 'TEMPORARY' src/)
6. Check git log (4+ atomic commits with clear messages)

## Success Criteria
✅ Git working directory clean
✅ Design system imports restored
✅ No TEMPORARY markers in codebase
✅ Design tests re-enabled and passing (74/74)
✅ TypeScript compilation successful (0 errors)
✅ CODE-MASTER-ALIGNMENT.md updated
✅ Ready to proceed to next issue

## Migration Notes
- Original ZenTask ID: TASK-mk9fli5s-rdccw
- Created: 2026-01-11
- Migrated: 2026-01-15
- Marked as ISSUE #1 in original task
```

**Labels:** `type:bug`, `priority:high`, `status:pending`

---

#### Issue 6: Implement Live Preview System
**Original ID:** TASK-mk9flig9-mxpna  
**Status:** pending → `status:pending`  
**Priority:** high → `priority:high`  
**Type:** `type:feature`  

**Title:** Implement Live Preview System with Real-Time Design Updates

**Body:**
```markdown
## Description
Implement real-time preview system allowing users to see design changes as they modify wizard answers. Core feature of Interactive Design Phase with performance requirement: preview updates <500ms after wizard state change.

## Details

### Requirements:
1. **PreviewEngine.ts** - Real-time renderer converting wizard state to visual preview
2. **WizardStateObserver.ts** - Watches for answer changes and triggers updates
3. **PreviewFeedback.ts** - Shows compatibility indicators and impact warnings
4. **WizardContainer integration** - Wire preview into existing wizard interface

### Performance Critical:
- Preview updates within 200-500ms of wizard change (MANDATORY)
- Handle 10+ wizard pages rendering efficiently
- No memory leaks during extended usage

### Files to Create:
- `vscode-extension/src/components/preview/PreviewEngine.ts`
- `vscode-extension/src/components/preview/WizardStateObserver.ts`
- `vscode-extension/src/components/preview/PreviewFeedback.ts`
- `vscode-extension/src/components/preview/PreviewContainer.vue`
- `vscode-extension/src/components/preview/PreviewEngine.test.ts`
- `vscode-extension/src/components/preview/WizardStateObserver.test.ts`

### Integration Points:
- Integrate with `wizardContainer.ts` and `wizardContainer.vue`
- Connect to Pinia store for state watching

## Dependencies
None

## Test Strategy
1. Unit tests: PreviewEngine, WizardStateObserver, PreviewFeedback
2. Integration tests: Wizard → Preview flow
3. Performance tests: Verify <500ms latency (MANDATORY)
4. Edge cases: Empty values, invalid data, page transitions
5. Coverage target: >75% of new code
6. Manual verification: Preview renders in VS Code Markdown preview

## Success Criteria
✅ Preview engine operational
✅ All 10 wizard pages render correctly
✅ Updates <500ms (verified with performance test)
✅ Feedback indicators display correctly
✅ >75% code coverage
✅ 100% test pass rate
✅ 0 TypeScript errors
✅ 0 new lint/type errors

## Migration Notes
- Original ZenTask ID: TASK-mk9flig9-mxpna
- Created: 2026-01-11
- Migrated: 2026-01-15
- Marked as ISSUE #2 in original task
```

**Labels:** `type:feature`, `priority:high`, `status:pending`

---

#### Issue 7: Implement Plan Decomposition Engine
**Original ID:** TASK-mk9flire-o6vp4  
**Status:** pending → `status:pending`  
**Priority:** high → `priority:high`  
**Type:** `type:feature`  

**Title:** Implement Plan Decomposition Engine for Auto Task Generation

**Body:**
```markdown
## Description
Implement automatic task decomposition from plans. Core mechanism converting wizard output into executable task queue. Must include circular dependency detection, priority assignment, and critical path analysis.

## Details

### Core Components:
1. **PlanDecompositionService.php** - Decomposition algorithm, dependency inference, circular detection
2. **WizardPlanParserService.php** - Parse wizard output into plan structure
3. **API Endpoint:** POST /api/v1/plans/{id}/decompose - Trigger decomposition + return tasks

### Algorithm Flow:
```
Plan.features (with scope/timeline)
  ↓
Automatic Feature Decomposition (15-45 min subtasks)
  ↓
Subtask Generation (from feature descriptions)
  ↓
Dependency Inference (smart detection from descriptions)
  ↓
Circular Dependency Check (DFS algorithm)
  ↓
Critical Path Analysis (identify blockers)
  ↓
Priority Assignment (HIGH/MEDIUM/LOW)
  ↓
Task Queue Population (insert into database)
  ↓
WebSocket Event Broadcast (notify frontend)
```

### Files to Create:
- `app/Services/PlanDecompositionService.php`
- `app/Services/WizardPlanParserService.php`
- `app/Http/Controllers/PlanDecompositionController.php`
- `tests/Feature/PlanDecompositionTest.php`
- `tests/Unit/Services/PlanDecompositionServiceTest.php`
- `tests/Unit/Services/WizardPlanParserServiceTest.php`

## Dependencies
None

## Test Strategy
- 27+ unit test cases covering decomposition scenarios
- Edge case tests (complex features, multiple dependencies)
- Circular dependency detection tests
- Priority assignment logic tests
- Performance tests (50+ features in <2 seconds)
- Coverage target: >75% of new code
- All tests must pass (100%)

## Success Criteria
✅ PlanDecompositionService created and tested
✅ WizardPlanParserService created and tested
✅ /api/v1/plans/{id}/decompose endpoint working
✅ Features correctly decomposed into 15-45 min subtasks
✅ Dependencies automatically detected
✅ Circular dependencies prevented
✅ Priority assignments correct (HIGH/MEDIUM/LOW)
✅ Critical path identified
✅ Handles 50+ features efficiently
✅ 27+ tests passing (100%)
✅ >75% code coverage
✅ 0 PHP syntax errors
✅ WebSocket broadcast working

## Migration Notes
- Original ZenTask ID: TASK-mk9flire-o6vp4
- Created: 2026-01-11
- Migrated: 2026-01-15
- Marked as ISSUE #3 in original task
```

**Labels:** `type:feature`, `priority:high`, `status:pending`

---

### MEDIUM PRIORITY (10 Issues)

#### Issue 8: Wizard Flow Integration Tests
**Original ID:** TASK-mk7jzlhj-kozt7  
**Status:** in-progress → `status:in-progress`  
**Priority:** medium → `priority:medium`  
**Type:** `type:testing`  

**Title:** PHASE 4: Plan Builder - Wizard Flow Integration Tests (Section 9.9)

**Body:**
```markdown
## Description
End-to-end tests for complete wizard flow: user completes all 10 pages → plan generated → tasks created → exported to formats.

## Details

### Test Coverage:
1. Simulate user completing all wizard pages
2. Validate plan generation at each step
3. Test LLM integration for architecture suggestions
4. Verify task decomposition output
5. Test all export formats
6. Validate MCP backend persistence
7. Test error recovery and validation flows

### Files to Create:
- `vscode-extension/src/planBuilder/__tests__/integration/*.test.ts`

## Dependencies
None

## Test Strategy
- Full end-to-end test suite
- Mock LLM/MCP responses
- Test all wizard paths (designer, analyst, architect)
- Validate outputs match specifications
- Performance benchmarks
- Coverage target: >80% for wizard flow

## Migration Notes
- Original ZenTask ID: TASK-mk7jzlhj-kozt7
- Created: 2026-01-09
- Updated: 2026-01-10
- Migrated: 2026-01-15
- Status: in-progress
```

**Labels:** `type:testing`, `priority:medium`, `status:in-progress`

---

#### Issue 9: Markdown Export System
**Original ID:** TASK-mk9367c1-v290i  
**Status:** pending → `status:pending`  
**Priority:** medium → `priority:medium`  
**Type:** `type:feature`  

**Title:** EPIC-005: Markdown Export System

**Body:**
```markdown
## Description
Generate human-readable Markdown plan documents with dependency graphs (Mermaid), timeline visualizations (Gantt), and formatted sections for easy reading and sharing.

## Details

### Features:
- Professional Markdown layout with TOC
- Mermaid diagrams for dependencies
- Gantt charts for timelines
- Formatted sections for project overview, architecture, features, timeline, team structure

### Implementation:
File: `vscode-extension/src/exporters/markdownExporter.ts`

Template engine with sections:
- Project overview
- Architecture (with diagram)
- Features (with dependency graph)
- Timeline (Gantt chart)
- Team structure (org chart)

**Estimate:** 6-8 hours total

## Dependencies
Legacy dependency: EPIC-003

## Test Strategy
- Export plan to Markdown
- Verify readability
- Test Mermaid diagrams render correctly in VS Code/GitHub
- Validate timeline accuracy
- Test TOC links
- Verify all sections present and formatted correctly

## Migration Notes
- Original ZenTask ID: TASK-mk9367c1-v290i
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:medium`, `status:pending`

---

#### Issue 10: Metrics Collection Service
**Original ID:** TASK-mk937dlg-xwt43  
**Status:** pending → `status:pending`  
**Priority:** medium → `priority:medium`  
**Type:** `type:feature`  

**Title:** TASK-007A: Metrics Collection Service

**Body:**
```markdown
## Description
Create MetricsService.php for collecting and aggregating metrics: task completion counts, average execution time, error counts, agent utilization percentages.

## Details

### Methods:
- `recordTaskCompletion(taskId, duration)`
- `recordError(taskId, error)`
- `getTaskMetrics(timeRange)`
- `getAgentMetrics()`
- `getErrorMetrics()`

### Storage:
Stores in metrics table with timestamps for time-series queries.

File: `app/Services/MetricsService.php`

**Estimate:** 3 hours

## Dependencies
Legacy dependency: EPIC-007

## Test Strategy
- Record sample metrics
- Verify storage in database
- Test aggregation queries
- Verify time-range filters work correctly
- Test agent utilization calculations
- Validate data accuracy

## Migration Notes
- Original ZenTask ID: TASK-mk937dlg-xwt43
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:medium`, `status:pending`

---

#### Issue 11: Metrics API Endpoints
**Original ID:** TASK-mk937dtg-6dos8  
**Status:** pending → `status:pending`  
**Priority:** medium → `priority:medium`  
**Type:** `type:feature`  

**Title:** TASK-007B: Metrics API Endpoints

**Body:**
```markdown
## Description
Build REST API endpoints for metrics retrieval with time-range filtering and aggregation options.

## Details

### Endpoints:
- GET /api/v1/metrics/tasks?range=7d (completion rate, avg time)
- GET /api/v1/metrics/agents (utilization %)
- GET /api/v1/metrics/errors?severity=high

Returns JSON with chart-ready data (labels, values arrays).

### Files:
- `routes/api.php` (extend)
- `app/Http/Controllers/Api/MetricsController.php` (new)

**Estimate:** 2 hours

## Dependencies
Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#[Issue 10] (Metrics Collection Service)
Legacy dependencies: EPIC-007, TASK-007A

## Test Strategy
- Test each endpoint
- Verify JSON format matches specifications
- Test time-range filters
- Validate aggregations
- Test empty data handling
- Verify error responses

## Migration Notes
- Original ZenTask ID: TASK-mk937dtg-6dos8
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:medium`, `status:pending`

---

#### Issue 12: Metrics Dashboard Component
**Original ID:** TASK-mk937e12-hppdd  
**Status:** pending → `status:pending`  
**Priority:** medium → `priority:medium`  
**Type:** `type:feature`  

**Title:** TASK-007C: Metrics Dashboard Component

**Body:**
```markdown
## Description
Create MetricsDashboard.vue component with Chart.js charts (line for task completion over time, bar for agent utilization, pie for error distribution).

## Details

### Features:
- Time range selector (24h, 7d, 30d)
- Auto-refresh every 30s
- 3 charts:
  - Task completion line chart
  - Agent utilization bar chart
  - Error severity pie chart
- Uses Chart.js library
- Responsive layout

File: `vscode-extension/src/components/MetricsDashboard.vue`

**Estimate:** 4 hours

## Dependencies
Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#[Issue 11] (Metrics API Endpoints)
Legacy dependencies: EPIC-007, TASK-007B

## Test Strategy
- Test charts display correctly
- Verify data updates on time range change
- Test auto-refresh functionality
- Verify responsive layout
- Test empty state handling
- Verify Chart.js integration

## Migration Notes
- Original ZenTask ID: TASK-mk937e12-hppdd
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:medium`, `status:pending`

---

#### Issue 13: Plan Adjustment Workflow
**Original ID:** TASK-mk9380o7-n9c1f  
**Status:** pending → `status:pending`  
**Priority:** medium → `priority:medium`  
**Type:** `type:feature`  

**Title:** EPIC-008: Plan Adjustment Workflow

**Body:**
```markdown
## Description
Detect plan drift (plan vs actual execution), suggest AI-powered adjustments, visualize side-by-side diffs, and enable one-click plan updates with version bumping.

## Details

### Components:
1. **planDriftDetector.ts** - Compare plan to actual tasks/code
2. **Adjustment engine** - AI suggestions based on drift
3. **PlanDiffViewer.vue** - Side-by-side comparison
4. **One-click update** - Automation with versioning

**Estimate:** 10-12 hours total

## Dependencies
Legacy dependencies: EPIC-003, EPIC-006

## Test Strategy
- Detect drift in sample project
- Verify suggestions are valid
- Test diff visualization
- Apply updates and verify version bump
- Test notification to team
- Verify rollback functionality

## Migration Notes
- Original ZenTask ID: TASK-mk9380o7-n9c1f
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:medium`, `status:pending`

---

#### Issue 14: Plan Templates
**Original ID:** TASK-mk938139-n1ch9  
**Status:** pending → `status:pending`  
**Priority:** medium → `priority:medium`  
**Type:** `type:feature`  

**Title:** EPIC-010: Plan Templates

**Body:**
```markdown
## Description
Create template storage system with 4 core templates (Web App, API Service, CLI Tool, Library/Package), template selector UI, and custom template creator for saving plans as reusable templates.

## Details

### Core Templates:
1. Web App
2. API Service
3. CLI Tool
4. Library/Package

### Components:
- Templates stored in `vscode-extension/templates/plan-templates/` as JSON
- **TemplateSelector.vue** for browsing/applying templates
- Each template has metadata (name, description, tags, author)
- Custom template creator saves current plan as template

**Estimate:** 8-10 hours total

## Dependencies
Legacy dependency: EPIC-003

## Test Strategy
- Load each core template
- Verify valid plan generated
- Test template application
- Create custom template
- Verify persistence
- Test template sharing
- Validate template metadata

## Migration Notes
- Original ZenTask ID: TASK-mk938139-n1ch9
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:medium`, `status:pending`

---

#### Issue 15: Multi-Format Export
**Original ID:** TASK-mk9381af-69h9g  
**Status:** pending → `status:pending`  
**Priority:** medium → `priority:medium`  
**Type:** `type:feature`  

**Title:** EPIC-011: Multi-Format Export

**Body:**
```markdown
## Description
Extend export system with enhanced Markdown (professional layout, TOC, cover page), PDF generation (jsPDF/Puppeteer), Figma export (design system specs), and JSON export (OpenAPI-compatible).

## Details

### Export Formats:
1. **Enhanced Markdown** - Professional layout, TOC, cover page
2. **PDF** - jsPDF/Puppeteer with professional layout and charts
3. **Figma** - Design system specs via Figma API
4. **JSON** - OpenAPI-compatible versioned schema

### Files to Create:
- `vscode-extension/src/exporters/pdfExporter.ts`
- `vscode-extension/src/exporters/figmaExporter.ts`
- `vscode-extension/src/exporters/jsonExporter.ts`
- Enhance existing `markdownExporter.ts`

**Estimate:** 10-12 hours total (Week 4 polish feature)

## Dependencies
Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#[Issue 9] (Markdown Export System)
Legacy dependency: EPIC-005

## Test Strategy
- Export to each format
- Verify Markdown enhanced properly
- Test PDF renders charts correctly
- Verify Figma file creates successfully
- Validate JSON against schema
- Test all format conversions

## Migration Notes
- Original ZenTask ID: TASK-mk9381af-69h9g
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:medium`, `status:pending`

---

#### Issue 16: Test Suite for Task Decomposition
**Original ID:** TASK-mk9by33n-4ip41  
**Status:** pending → `status:pending`  
**Priority:** medium → `priority:medium`  
**Type:** `type:testing`  

**Title:** Create Comprehensive Test Suite for Task Decomposition Engine

**Body:**
```markdown
## Description
Add unit tests for taskDecomposition.ts covering template selection, feature decomposition, large feature breaking, dependency mapping, effort estimation, and agent assignment logic.

## Details

### Test Coverage:
Create `taskDecomposition.test.ts` with tests for:
- Template selection (API, UI, database patterns)
- Feature decomposition into impl + test + doc tasks
- Large feature breaking (>16h → subtasks)
- Dependency mapping (FEAT → TASK)
- Effort estimation (30% test, 20% doc)
- Agent assignment (Auto Zen, Testing Agent)
- Edge cases (zero features, very large estimates, complex dependencies)

**Target:** 80%+ code coverage

## Dependencies
Legacy dependency: TASK-004A

## Test Strategy
- Run tests with `npm test`
- Verify coverage with `npm run test:coverage`
- Ensure all edge cases pass
- Validate template selection logic
- Test dependency mapping accuracy
- Verify effort estimation calculations

## Migration Notes
- Original ZenTask ID: TASK-mk9by33n-4ip41
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:testing`, `priority:medium`, `status:pending`

---

### LOW PRIORITY (1 Issue)

#### Issue 17: Visual Design System Editor
**Original ID:** TASK-mk9380vc-br0n9  
**Status:** pending → `status:pending`  
**Priority:** low → `priority:low`  
**Type:** `type:feature`  

**Title:** EPIC-009: Visual Design System Editor

**Body:**
```markdown
## Description
Build Visual Design System Editor with color theme picker (5 presets), font selection (3 options), component style editor, and live preview (<500ms updates) for all page sections.

## Details

### Components:
- **ColorThemePicker.vue**
- **FontSelector.vue**
- **ComponentStyleEditor.vue**
- **LivePreview.vue**

Allows visual customization of plan UI appearance with real-time feedback.

**Estimate:** 12-14 hours total (Week 4 polish feature)

## Dependencies
Legacy dependency: EPIC-002

## Test Strategy
- Select theme; verify preview updates <500ms
- Test font changes
- Toggle component styles
- Verify all 8 page sections render correctly
- Test responsiveness
- Validate style persistence

## Migration Notes
- Original ZenTask ID: TASK-mk9380vc-br0n9
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:low`, `status:pending`

---

#### Issue 18: Programming Orchestrator Dashboard
**Original ID:** TASK-mk9381hr-hivm3  
**Status:** pending → `status:pending`  
**Priority:** low → `priority:low`  
**Type:** `type:feature`  

**Title:** EPIC-012: Programming Orchestrator Dashboard

**Body:**
```markdown
## Description
Build Programming Orchestrator dashboard with agent coordination UI, task queue visualizer (ready/blocked/in-progress), live execution status monitor, and performance metrics (velocity, bottlenecks).

## Details

### Features:
- **Agent status cards** - Real-time agent health
- **Task queue columns** - Drag-drop queue management (ready/blocked/in-progress)
- **Live execution logs** - Real-time log streaming
- **Performance charts** - Velocity, bottlenecks, trends

Component: `OrchestratorDashboard.vue`

Integrates with EPIC-007 metrics system.

**Estimate:** 10-12 hours total (Week 4 polish feature)

## Dependencies
Depends on xXKillerNoobYT/Copilot-Orchestration-Extension-COE-#[Issue 10] (Metrics Collection Service)
Legacy dependency: EPIC-007

## Test Strategy
- Test agent status updates
- Verify queue state matches backend
- Test drag-drop queue management
- Validate execution logs stream correctly
- Test performance metrics accuracy
- Verify real-time updates

## Migration Notes
- Original ZenTask ID: TASK-mk9381hr-hivm3
- Created: 2026-01-10
- Migrated: 2026-01-15
```

**Labels:** `type:feature`, `priority:low`, `status:pending`

---

## Execution Plan

### When GitHub API Rate Limit Resets (~01:59 UTC):

1. **Create issues in priority order** using `mcp_github2_issue_write` with method: "create"
2. **Track issue numbers** as they're created
3. **Update dependencies** in issue bodies with actual GitHub issue numbers (replace placeholders)
4. **Create mapping document** with old TASK-IDs → new GitHub issue numbers
5. **Verify all issues created** correctly

### Commands to Run:

```powershell
# For each issue (execute via GitHub MCP tools):
mcp_github2_issue_write({
  method: "create",
  owner: "xXKillerNoobYT",
  repo: "Copilot-Orchestration-Extension-COE-",
  title: "[Issue Title]",
  body: "[Issue Body with Description, Details, Dependencies, Test Strategy, Migration Notes]",
  labels: ["type:feature", "priority:high", "status:pending"]
})
```

---

## Post-Migration Tasks

1. ✅ All 18 GitHub issues created
2. ✅ Migration mapping document created (Docs/ZENTASKS-MIGRATION-MAP.md)
3. ✅ Update dependencies with real GitHub issue numbers
4. ✅ Archive `_ZENTASKS/` folder (read-only)
5. ✅ Update `.github/copilot-instructions.md` to mark migration complete
6. ✅ Verify GitHub Issues sync extension working
7. ✅ Test Auto Zen can query and execute from GitHub Issues

---

## Notes

- All issues include original ZenTask ID for traceability
- Priorities mapped: high → priority:high, medium → priority:medium, low → priority:low
- Status mapped: in-progress → status:in-progress, pending → status:pending
- All test strategies preserved from original tasks
- Dependencies noted (some legacy, some linkable to new issues)
- Ready to execute as soon as GitHub API rate limit resets

