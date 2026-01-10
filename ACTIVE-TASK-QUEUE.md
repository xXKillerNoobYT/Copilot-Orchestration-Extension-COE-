# Active Task Queue - Interactive Plan Builder

## 📋 Complete Task Inventory

### Status Legend
- ✅ DONE - Task completed and verified
- 🔄 IN-PROGRESS - Currently being worked on
- 📅 PENDING - Ready to start, waiting in queue
- 🔴 BLOCKED - Cannot proceed (waiting for dependency)
- ⚠️ ON-HOLD - Not starting yet

---

## High Priority Tasks (Ready to Start)

### 1. TASK-mk7jzg49-qtdmf: LLM Architecture Suggestions (90% complete)
**Status**: 🔄 IN-PROGRESS  
**Priority**: HIGH  
**Effort**: 2-3 hours  
**Created**: 2026-01-10  
**Files**: architectureSuggestions.ts (214 LOC), llmPrompts.ts (156 LOC)

**What's Done**:
- ✅ LLM prompt composition
- ✅ OpenAI API integration
- ✅ Response parsing logic
- ✅ Error handling
- ✅ Suggestion formatting

**What's Needed**:
- 📝 Unit tests with mocked LLM responses
- 📝 Integration test with real LLM (optional)
- 📝 Error scenario testing
- 📝 Performance benchmarking

**Next Steps**:
```
1. Create __tests__/architectureSuggestions.test.ts
2. Mock openaiClient responses
3. Test prompt composition (happy path + variations)
4. Test JSON parsing (including markdown blocks)
5. Test error handling (timeout, malformed JSON, network errors)
6. Run test suite and fix failures
7. Verify code coverage >85%
```

---

### 2. TASK-mk7jzhfj-nlfgg: Task Decomposition Engine (90% complete)
**Status**: 📅 PENDING  
**Priority**: HIGH  
**Effort**: 2-3 hours  
**Dependency**: TASK-mk7jzg49-qtdmf  
**Files**: taskDecomposition.ts (398 LOC)

**What's Done**:
- ✅ Task generation from wizard state
- ✅ Critical path calculation (DAG algorithm)
- ✅ YAML frontmatter generation
- ✅ Milestone generation
- ✅ Effort estimation
- ✅ Risk identification

**What's Needed**:
- 📝 Unit tests for decomposition logic
- 📝 DAG algorithm verification
- 📝 YAML format validation
- 📝 Edge case testing (circular dependencies, zero tasks)

**Next Steps**:
```
1. Create __tests__/taskDecomposition.test.ts
2. Test task generation from various wizard states
3. Test critical path algorithm:
   - Linear chain of dependencies
   - Parallel tasks
   - Complex dependency graphs
4. Test YAML generation (valid format, no injection)
5. Test milestone generation
6. Test effort conversion (hours/days/weeks)
7. Verify code coverage >85%
```

---

### 3. Wire Handlers in Webview Panel
**Status**: 📅 PENDING  
**Priority**: HIGH  
**Effort**: 2-3 hours  
**Dependency**: Both above tasks  
**Files**: planBuilderPanel.ts (needs _handleWizardCompletion implementation)

**What's Done**:
- ✅ WebviewPanel class structure
- ✅ Message routing framework
- ✅ Panel lifecycle management

**What's Needed**:
- 📝 Implement _handleWizardCompletion method
- 📝 Call architectureSuggestions engine
- 📝 Call taskDecomposition engine
- 📝 Generate task files in _ZENTASKS folder
- 📝 Send progress notifications
- 📝 Handle errors gracefully

**Implementation**:
```typescript
private async _handleWizardCompletion(wizardState: any): Promise<void> {
  try {
    // Show "generating..." notification
    vscode.window.showInformationMessage('Generating architecture suggestions...');
    
    // Call LLM for architecture suggestions
    const archContext = extractArchContext(wizardState);
    const suggestions = await generateArchitectureSuggestions(archContext);
    
    // Show suggestions to user (TODO: UI for accepting/modifying)
    
    // Decompose into tasks
    const decomposition = await decomposeProjectPlan(wizardState, suggestions);
    
    // Generate task files
    for (const task of decomposition.tasks) {
      const taskYAML = generateTaskYAML(task);
      const fileName = `TASK-${generateId()}.md`;
      await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(workspaceRoot, '_ZENTASKS', fileName),
        Buffer.from(taskYAML)
      );
    }
    
    // Show results
    vscode.window.showInformationMessage(
      `Plan created! Generated ${decomposition.tasks.length} tasks.`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed: ${error.message}`);
  }
}
```

---

### 4. Integration Tests - Wizard to Tasks Flow
**Status**: 📅 PENDING  
**Priority**: HIGH  
**Effort**: 4-5 hours  
**Dependency**: All above tasks  
**Blocking**: Release approval

**What's Done**:
- ✅ Test framework (mocha) installed
- ✅ Mock patterns established

**What's Needed**:
- 📝 E2E test scenario: Complete wizard → plan → tasks
- 📝 Mock all wizard pages and user inputs
- 📝 Mock LLM responses (architecture suggestions)
- 📝 Mock LLM responses (task decomposition)
- 📝 Validate task file generation
- 📝 Verify dependency graph
- 📝 Check all export formats

**Test Cases**:
```
1. Happy Path: Minimal viable project
   - User fills all pages with default values
   - Architecture suggestions generated
   - Tasks decomposed
   - Files created successfully

2. Complex Project: Feature-rich app
   - Many integrations selected
   - Large team size
   - Aggressive timeline
   - Verify critical path calculation

3. Error Handling: Network failures
   - LLM call timeout
   - Malformed LLM response
   - File system errors
   - Verify graceful degradation

4. Edge Cases:
   - Project with no dependencies
   - Project with circular dependencies (reject)
   - Very large task decomposition (100+ tasks)
   - Minimal and maximal values
```

---

## Medium Priority Tasks

### 5. TASK-mk7jzjst-kmidr: MCP Backend Integration
**Status**: 🔴 BLOCKED  
**Priority**: MEDIUM  
**Effort**: 6-8 hours  
**Blocker**: PHP environment (OpenSSL missing)  
**Creates**: Plan persistence, team workflow

**Planned Implementation**:
```php
// app/Http/Controllers/Api/PlanController.php
- POST   /api/v1/plans              Create plan
- GET    /api/v1/plans/{id}         Retrieve plan
- PUT    /api/v1/plans/{id}         Update plan
- DELETE /api/v1/plans/{id}         Delete plan
- GET    /api/v1/plans/{id}/reviews Team review workflow
```

**Backend Features**:
- Plan CRUD with soft deletes
- Version history (audit trail)
- Team review workflow (pending → approved → active)
- WebSocket events for real-time collaboration
- Conflict resolution (optimistic locking)

---

### 6. TASK-mk7jzizx-ukdhl: Visual Design System Editor
**Status**: 📅 PENDING  
**Priority**: MEDIUM  
**Effort**: 4-6 hours  
**Creates**: Design token generation, Tailwind config

**Planned Features**:
- Color palette picker with live preview
- Typography selector (font families, sizes, weights)
- Spacing scale configurator (margins, padding)
- Component variant builder (buttons, cards, inputs)
- Live preview panel with selected theme
- Export to design tokens (JSON) and Tailwind config

**New Files**:
- `resources/planBuilder/DesignEditor.vue`
- `src/planBuilder/designSystem/tokenGenerator.ts`
- `src/planBuilder/designSystem/colorParser.ts`

---

### 7. TASK-mk7jzlhj-kozt7: Integration Tests
**Status**: 📅 PENDING  
**Priority**: MEDIUM  
**Effort**: 3-4 hours  
**Dependency**: All core components  

**Test Coverage**:
- Full wizard flow end-to-end
- All conditional page visibility paths
- All input validation scenarios
- All export formats
- Error recovery paths
- Performance under load

---

## Low Priority Tasks

### 8. TASK-mk7jzkna-h9lpj: Export to Multiple Formats
**Status**: 📅 PENDING  
**Priority**: LOW  
**Effort**: 3-4 hours  

**Export Formats**:
1. **JSON**: Complete plan with metadata
   - File: `plan-export.json`
   - Schema: Fully typed structure
   - Includes: All wizard answers, architecture, tasks

2. **Markdown**: Documentation package
   - File: `README.md`, `ARCHITECTURE.md`, `TASKS.md`
   - Format: GitHub-compatible markdown
   - Includes: Project overview, architecture diagrams, task list

3. **PDF**: Printable project plan
   - File: `project-plan.pdf`
   - Format: Professional layout with diagrams
   - Includes: Cover page, TOC, architecture, timeline, tasks

4. **GitHub Issues**: Automated issue creation
   - Integration: GitHub API
   - Creates: Issues from tasks, milestones from phases
   - Features: Labels, assignees, descriptions

**New Files**:
- `src/planBuilder/exporters/jsonExporter.ts`
- `src/planBuilder/exporters/markdownExporter.ts`
- `src/planBuilder/exporters/pdfExporter.ts`
- `src/planBuilder/exporters/githubExporter.ts`

---

## Task Statistics

| Status | Count | Total Hours | Priority |
|--------|-------|-------------|----------|
| ✅ DONE | 4 | 8 hours | - |
| 🔄 IN-PROGRESS | 1 | 2-3 hours | HIGH |
| 📅 PENDING HIGH | 3 | 8-11 hours | HIGH |
| 📅 PENDING MEDIUM | 3 | 13-14 hours | MEDIUM |
| 📅 PENDING LOW | 1 | 3-4 hours | LOW |
| 🔴 BLOCKED | 1 | 6-8 hours | MEDIUM |
| **TOTAL** | **13** | **40-48 hours** | - |

---

## Critical Path (Minimum to MVP)

```
1. Complete LLM Architecture Suggestions (2-3 hrs)     [START]
   ↓
2. Complete Task Decomposition (2-3 hrs)
   ↓
3. Wire Handlers in Webview (2-3 hrs)
   ↓
4. Integration Tests (4-5 hrs)
   ↓
5. Backend API Endpoints (6-8 hrs)                     [BOTTLENECK]
   ↓
6. Design System Editor (4-6 hrs)                      [PARALLEL]
   ↓
7. Export Formats (3-4 hrs)
   ↓
8. Final Testing & Polish (2-3 hrs)

CRITICAL PATH: ~20-28 hours (sequential)
PARALLEL TRACK: Design System Editor (not blocking release)
```

---

## Execution Plan (Recommended Sequence)

### Session 1 (Now): Unit Tests & Integration
**Time**: 6-8 hours  
**Goal**: Complete Phase 2 foundation

1. ✅ Create architectureSuggestions tests (2 hrs)
2. ✅ Create taskDecomposition tests (2 hrs)
3. ✅ Wire wizard completion handlers (2 hrs)
4. ✅ Run integration tests (1-2 hrs)

**Success Metric**: All tests passing, wizard → tasks flow working

### Session 2: Backend Integration
**Time**: 6-8 hours  
**Goal**: Plan persistence working

1. 📅 Fix PHP environment (OpenSSL)
2. 📅 Create Plan model and migrations
3. 📅 Implement CRUD endpoints
4. 📅 Add WebSocket events
5. 📅 Test API integration

**Success Metric**: Plans persisting to database

### Session 3: Polish & Export
**Time**: 8-10 hours  
**Goal**: MVP feature-complete

1. 📅 Design System Editor
2. 📅 Export to multiple formats
3. 📅 Comprehensive E2E tests
4. 📅 Performance optimization
5. 📅 Documentation

**Success Metric**: All features working, >90% test coverage

---

## Ready-to-Start Checklist

### Session 1 Ready ✅
- ✅ All core files created and compilable
- ✅ Dependencies installed
- ✅ Build system working (Vite + Webpack)
- ✅ Message protocol defined
- ✅ Mock patterns established

### Session 2 Ready (Pending PHP fix)
- ⏳ PHP environment (waiting for OpenSSL setup)
- 📋 Backend code patterns (standardized)
- 📋 Database migrations planned

### Session 3 Ready
- 📋 Export libraries identified
- 📋 Design system framework selected (Tailwind)
- 📋 Performance profiles baselined

---

## Key Files Reference

### Core Components
- [Question Framework](src/planBuilder/questionFramework.ts)
- [Wizard State Manager](src/planBuilder/wizardState.ts)
- [Validators](src/planBuilder/validators.ts)

### LLM Integration
- [Architecture Suggestions](src/planBuilder/architectureSuggestions.ts)
- [LLM Prompts](src/planBuilder/llmPrompts.ts)
- [Task Decomposition](src/planBuilder/taskDecomposition.ts)

### Webview & UI
- [Webview Panel](src/panels/planBuilderPanel.ts)
- [Plan Builder Command](src/commands/planBuilderCommand.ts)
- [App.vue](resources/planBuilder/App.vue)
- [WizardPage.vue](resources/planBuilder/WizardPage.vue)
- [QuestionCard.vue](resources/planBuilder/QuestionCard.vue)
- [ProgressBar.vue](resources/planBuilder/ProgressBar.vue)

### Documentation
- [Task List](PLAN-BUILDER-TASKS.md)
- [Session Summary](PLAN-BUILDER-SESSION-2026-01-09.md)
- [Executive Summary](PLAN-BUILDER-EXECUTIVE-SUMMARY.md)

---

## Success Criteria

### MVP Definition
- [ ] Wizard completes all 10 pages
- [ ] Architecture suggestions generated from LLM
- [ ] Tasks auto-decomposed with dependencies
- [ ] Task files created in _ZENTASKS with YAML frontmatter
- [ ] Full state persistence
- [ ] >90% test coverage
- [ ] 0 failing tests
- [ ] Performance <5s end-to-end

### Release Criteria (Beyond MVP)
- [ ] Backend persistence working
- [ ] Team review workflow functional
- [ ] All export formats supported
- [ ] User documentation complete
- [ ] Security audit passed
- [ ] Performance benchmarks met

---

## Current Queue Position

### Immediate (Next Session)
1. ✅ LLM Architecture Suggestions - Unit Tests
2. ✅ Task Decomposition - Unit Tests
3. ✅ Wire Handlers - Implementation
4. ✅ Integration Tests - Full flow

### Next 48 Hours
5. 📅 Backend API Endpoints
6. 📅 Design System Editor
7. 📅 Multi-format Export

### Backlog (Next Week)
8. 📅 Performance optimization
9. 📅 Security hardening
10. 📅 Documentation/polish
11. 📅 Release preparation

---

**Last Updated**: 2026-01-09  
**Next Update**: After integration tests complete  
**Owner**: Copilot Orchestrator Autonomous Loop
