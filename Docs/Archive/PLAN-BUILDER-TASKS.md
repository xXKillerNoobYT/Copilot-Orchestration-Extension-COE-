# Plan Builder Development - Task List & Roadmap

## 📋 Current Task Queue (Priority Ordered)

### Phase 1: Core Foundation ✅ 80% COMPLETE

#### Completed
- ✅ TASK-mk7jzehj-jrdto: Question Framework (TypeScript + State Management)
- ✅ TASK-mk7jzfdo-bhd41: Vue 3 UI Components (Webview UI)
- ✅ Webview Panel Integration (planBuilderPanel.ts)
- ✅ LLM Architecture Suggestions (Core Engine)
- ✅ Task Decomposition Engine (Core Logic)

#### In Progress
- 🔄 TASK-mk7jzg49-qtdmf: LLM Architecture Suggestions (90% done - needs tests)
- 🔄 TASK-mk7jzhfj-nlfgg: Task Decomposition Engine (90% done - needs tests)

#### Next Immediate Actions
1. Create unit tests for architectureSuggestions.ts
2. Create unit tests for taskDecomposition.ts  
3. Wire up message handlers in planBuilderPanel.ts
4. Test full integration with mock LLM responses

---

## 🎯 Detailed Next Tasks

### TASK 1: LLM Architecture Suggestions - Unit Tests

**Objective**: Create comprehensive unit tests for architecture suggestion generation

**Status**: READY (High Priority)

**Files to Modify**:
- Create: `vscode-extension/src/planBuilder/__tests__/architectureSuggestions.test.ts`

**Implementation Plan**:
1. Mock openaiClient responses
2. Test prompt composition with various contexts
3. Test JSON parsing from LLM responses
4. Test error handling and edge cases
5. Test suggestion formatting for UI display

**Expected Effort**: 2-3 hours

**Success Criteria**:
- [ ] All test cases passing (8+ tests)
- [ ] Mock LLM responses working correctly
- [ ] 100% code coverage on main functions
- [ ] Error scenarios handled gracefully

---

### TASK 2: Task Decomposition - Unit Tests

**Objective**: Validate task generation and dependency graph logic

**Status**: READY (High Priority)

**Files to Modify**:
- Create: `vscode-extension/src/planBuilder/__tests__/taskDecomposition.test.ts`

**Implementation Plan**:
1. Test task generation from wizard state
2. Test critical path calculation (DAG)
3. Test YAML frontmatter generation
4. Test milestone generation
5. Test effort estimation conversions
6. Test error handling

**Expected Effort**: 2-3 hours

**Success Criteria**:
- [ ] All test cases passing (10+ tests)
- [ ] Critical path algorithm verified
- [ ] YAML format validated
- [ ] 100% code coverage on decomposition logic

---

### TASK 3: Wire Handlers in Webview Panel

**Objective**: Connect Vue app to LLM engine and task generation

**Status**: READY (High Priority)

**Files to Modify**:
- `vscode-extension/src/panels/planBuilderPanel.ts` - Add `_handleWizardCompletion` implementation

**Implementation Plan**:
1. Implement wizard completion handler
2. Call architecture suggestion engine
3. Call task decomposition engine
4. Generate task files in _ZENTASKS folder
5. Send results back to Vue app
6. Show progress notifications

**Expected Effort**: 2-3 hours

**Success Criteria**:
- [ ] Completion handler implemented
- [ ] LLM engines called successfully
- [ ] Task files generated with correct YAML
- [ ] Success/error messages shown in UI

---

### TASK 4: Integration Tests - Wizard Flow

**Objective**: End-to-end testing of complete wizard → plan → tasks flow

**Status**: READY (High Priority - Blocks Release)

**Files to Create**:
- `vscode-extension/src/planBuilder/__tests__/integration/wizardFlow.test.ts`

**Test Scenarios**:
1. User completes all 10 wizard pages
2. Architecture suggestions generated
3. Tasks decomposed correctly
4. Task files created in _ZENTASKS
5. Dependency graph accurate
6. All export formats valid

**Expected Effort**: 4-5 hours

**Success Criteria**:
- [ ] Full wizard flow tested
- [ ] Mock LLM responses working
- [ ] Task files validated
- [ ] All assertions passing
- [ ] Performance benchmarks acceptable

---

### TASK 5: MCP Backend Integration

**Objective**: Connect Plan Builder to Laravel backend for persistence

**Status**: BLOCKED (Requires PHP environment)

**Files to Create**:
- `app/Http/Controllers/Api/PlanController.php`
- `app/Services/PlanService.php`
- `app/Models/Plan.php`
- `vscode-extension/src/planBuilder/planSync.ts`

**Implementation Plan**:
1. Create Plan model with YAML storage
2. Implement CRUD endpoints
3. Add team review workflow
4. Implement WebSocket events
5. Create plan sync service
6. Test plan persistence

**Expected Effort**: 6-8 hours

**Success Criteria**:
- [ ] All API endpoints working
- [ ] Plan persistence verified
- [ ] Team workflow functional
- [ ] WebSocket events firing
- [ ] Data consistency maintained

---

### TASK 6: Design System Editor

**Objective**: WYSIWYG editor for design tokens and Tailwind config

**Status**: MEDIUM Priority

**Files to Create**:
- `vscode-extension/resources/planBuilder/DesignEditor.vue`
- `vscode-extension/src/planBuilder/designSystem/tokenGenerator.ts`
- `vscode-extension/src/planBuilder/designSystem/colorParser.ts`

**Features**:
1. Color palette picker
2. Typography selector
3. Spacing scale configurator
4. Component variant builder
5. Live preview panel
6. Token export (JSON + Tailwind config)

**Expected Effort**: 4-6 hours

**Success Criteria**:
- [ ] All UI controls working
- [ ] Design token generation correct
- [ ] Tailwind config valid
- [ ] Live preview accurate
- [ ] Export functionality working

---

### TASK 7: Export Formats

**Objective**: Enable multiple export options for completed plans

**Status**: LOW Priority

**Files to Create**:
- `vscode-extension/src/planBuilder/exporters/jsonExporter.ts`
- `vscode-extension/src/planBuilder/exporters/markdownExporter.ts`
- `vscode-extension/src/planBuilder/exporters/pdfExporter.ts`
- `vscode-extension/src/planBuilder/exporters/githubExporter.ts`

**Export Formats**:
1. **JSON**: Complete plan with metadata
2. **Markdown**: Formatted README and architecture docs
3. **PDF**: Printable project plan with diagrams
4. **GitHub Issues**: Create issues/milestones from tasks

**Expected Effort**: 3-4 hours

**Success Criteria**:
- [ ] All formats exporting correctly
- [ ] JSON valid and complete
- [ ] Markdown properly formatted
- [ ] PDF readable and organized
- [ ] GitHub API integration working

---

## 📊 Task Dependencies

```
Question Framework (✅ DONE)
    ↓
Vue 3 UI Components (✅ DONE)
    ↓
Webview Panel (✅ DONE)
    ├── LLM Arch Suggestions (🔄 IN-PROGRESS)
    │   └── Arch Tests (NEXT)
    │       └── Task Decomposition (🔄 IN-PROGRESS)
    │           └── Decomp Tests (NEXT)
    │               └── Wire Handlers (NEXT)
    │                   └── Integration Tests (NEXT)
    │
    ├── Design System Editor (MEDIUM)
    │
    └── MCP Backend (MEDIUM)
        └── Export Formats (LOW)
            └── Final Integration Tests
```

---

## 📈 Progress Timeline

### Week 1 (Current): Foundation
- ✅ Wizard Framework
- ✅ UI Components
- ✅ Webview Integration
- 🔄 LLM Engine (90% done)
- 🔄 Task Decomposition (90% done)

### Week 2: Testing & Integration
- 📅 Unit Tests (Arch Suggestions)
- 📅 Unit Tests (Decomposition)
- 📅 Integration Tests
- 📅 Wire Handlers
- 📅 Backend API Endpoints

### Week 3: Polish & Export
- 📅 Design System Editor
- 📅 Export Formats
- 📅 Documentation
- 📅 Performance Optimization
- 📅 Security Review

---

## ✅ Acceptance Criteria (MVP)

For Plan Builder to be considered complete, must satisfy:

1. **Functionality**
   - [ ] All 10 wizard pages functional
   - [ ] Architecture suggestions generated from LLM
   - [ ] Tasks auto-decomposed with dependencies
   - [ ] Task files created in _ZENTASKS with YAML frontmatter
   - [ ] Full state persistence (localStorage → backend)

2. **Testing**
   - [ ] Unit tests: 90%+ coverage
   - [ ] Integration tests: All core flows
   - [ ] E2E tests: Complete wizard → export flow
   - [ ] 0 failing tests in CI/CD

3. **Performance**
   - [ ] Wizard pages load <500ms
   - [ ] LLM suggestions return <5s (after initial API call)
   - [ ] Task decomposition <3s
   - [ ] Export operations <2s

4. **Security**
   - [ ] No hardcoded secrets
   - [ ] CSP headers properly configured
   - [ ] YAML injection prevention
   - [ ] Input validation on all fields

5. **Documentation**
   - [ ] User guide for Plan Builder
   - [ ] API documentation for LLM integration
   - [ ] Developer guide for extending
   - [ ] Deployment instructions

---

## 🔗 Related Resources

- [Question Framework](src/planBuilder/questionFramework.ts)
- [Vue Components](resources/planBuilder/)
- [Architecture Suggestions](src/planBuilder/architectureSuggestions.ts)
- [Task Decomposition](src/planBuilder/taskDecomposition.ts)
- [Webview Panel](src/panels/planBuilderPanel.ts)

---

## 💡 Implementation Notes

### Best Practices
1. Always mock external LLM calls in tests
2. Validate YAML before generating task files
3. Use dependency injection for testability
4. Keep components under 300 LOC
5. Separate concerns (UI vs Logic vs LLM)

### Common Pitfalls to Avoid
1. ❌ Don't expose API keys in frontend code
2. ❌ Don't parse JSON without try-catch
3. ❌ Don't generate tasks without validating structure
4. ❌ Don't skip tests for "integration" code
5. ❌ Don't forget error handling in async flows

### Testing Patterns
- Use mock factories for consistent test data
- Test both happy paths AND error scenarios
- Mock external dependencies (LLM, API, storage)
- Use descriptive test names (what-when-then)
- Keep tests DRY but readable

---

## 🚀 Success Metrics

After completion, measure:
- **Code Master Alignment**: Target 80%+ (currently ~55%)
- **Test Coverage**: Target 90%+ (currently ~70%)
- **Performance**: Sub-5s end-to-end wizard flow
- **User Satisfaction**: Intuitive UX, clear error messages
- **Maintainability**: Clear code, comprehensive docs

---

**Last Updated**: 2026-01-09  
**Next Review**: After integration tests complete  
**Owner**: Copilot Orchestrator Team
