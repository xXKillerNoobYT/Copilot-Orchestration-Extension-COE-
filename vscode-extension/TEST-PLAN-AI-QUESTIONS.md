# Test Plan: AI-Assisted Five Core Questions

## Test Strategy

This test plan validates the five core wizard questions with AI-assisted follow-up capabilities, ensuring proper integration with the plan context service and dynamic question generation.

## Test Scenarios

### 1. Core Question Validation Tests

#### T1.1: ProjectOverview - Basic Validation
**Objective**: Validate core project overview fields  
**Steps**:
1. Open wizard to Q1 - Project Overview
2. Enter project name: "Test Project" (< 3 chars)
3. Verify error: "Project name must be at least 3 characters"
4. Update to: "Test Project 123"
5. Leave description empty
6. Verify error: "Project description is required"
7. Enter description: "A test project" (< 20 chars)
8. Verify error: "Description must be at least 20 characters"
9. Enter valid description (20+ chars)
10. Select project type: Web Application
11. Verify validation summary shows success

**Expected**: All validation rules enforce correctly

#### T1.2: Architecture - Pattern Selection
**Objective**: Validate architecture pattern selection  
**Steps**:
1. Navigate to Q2 - Architecture
2. Verify no pattern selected initially
3. Click "Microservices" card
4. Verify card shows selected state
5. Verify diagram appears
6. Verify validation summary shows success
7. Add architecture notes
8. Navigate back to Q1
9. Navigate forward to Q2
10. Verify "Microservices" still selected

**Expected**: Selection persists across navigation

#### T1.3: Features - Dependency Validation
**Objective**: Validate feature dependencies and circular dependency detection  
**Steps**:
1. Navigate to Q3 - Features
2. Add Feature #1: "User Authentication", Priority: Critical
3. Add Feature #2: "User Profile", Priority: High, Depends on: Feature #1
4. Add Feature #3: "Dashboard", Priority: Medium, Depends on: Feature #2
5. Verify dependency map shows: F1 → F2 → F3
6. Change Feature #1 to depend on Feature #3
7. Verify circular dependency warning appears
8. Remove Feature #3 dependency from Feature #1
9. Verify warning clears

**Expected**: Circular dependencies detected and prevented

#### T1.4: Timeline - Date Validation
**Objective**: Validate milestone dates and ordering  
**Steps**:
1. Navigate to Q4 - Timeline
2. Add Milestone #1: "MVP", Date: tomorrow, Phase: Development
3. Add Milestone #2: "Beta", Date: yesterday, Phase: Testing
4. Verify error: "Milestones should be in chronological order"
5. Update Milestone #2 date to next week
6. Verify error clears
7. Add Milestone #3 with same date as Milestone #1
8. Verify error: "Milestone dates must be unique"

**Expected**: Date validation enforces proper timeline

#### T1.5: Team - Role Validation
**Objective**: Validate team member roles and skills  
**Steps**:
1. Navigate to Q5 - Team
2. Leave role empty
3. Attempt to navigate next
4. Verify error: "Role is required"
5. Select "Frontend Engineer"
6. Add skills: "React, TypeScript, CSS"
7. Verify skill tags appear
8. Click ×  on "TypeScript" tag
9. Verify skill removed
10. Add agent mapping: "Auto Zen"
11. Verify team card preview shows role and skills

**Expected**: Team member data validated and displayed

### 2. AI Follow-Up Question Tests

#### T2.1: ProjectOverview - Web App Follow-Ups
**Objective**: Validate follow-up questions for web applications  
**Steps**:
1. Complete Q1 with Type: Web Application
2. Verify follow-up section appears
3. Verify questions include:
   - "What frontend framework will you use?"
   - "Does this web app need a backend?"
4. Select framework: "React"
5. Check "Does this web app need a backend?"
6. Navigate to Q2 and back to Q1
7. Verify answers persist

**Expected**: Web-specific questions appear and persist

#### T2.2: ProjectOverview - API Follow-Ups
**Objective**: Validate follow-up questions for APIs  
**Steps**:
1. Complete Q1 with Type: API / Backend Service
2. Verify follow-up questions include:
   - "What type of API will you build?" (REST/GraphQL/gRPC)
   - "What database will you use?"
3. Select "REST"
4. Select database: "PostgreSQL"
5. Verify answers saved

**Expected**: API-specific questions appear

#### T2.3: Architecture - Microservices Follow-Ups
**Objective**: Validate architecture-specific follow-ups  
**Steps**:
1. Select Architecture: Microservices
2. Verify follow-up questions include:
   - "What service discovery mechanism will you use?"
   - "How will services communicate?"
   - "Will you use an API Gateway?"
3. Select service discovery: "Kubernetes Service Discovery"
4. Select communication: "gRPC"
5. Check "Yes, use an API Gateway"
6. Verify scalability requirements textarea appears

**Expected**: Microservices-specific questions generated

#### T2.4: Architecture - Serverless Follow-Ups
**Objective**: Validate serverless-specific follow-ups  
**Steps**:
1. Select Architecture: Serverless
2. Verify follow-up questions include:
   - "Which serverless platform will you use?"
   - "What will trigger your functions?"
3. Select platform: "AWS Lambda"
4. Enter triggers: "HTTP requests, S3 events"

**Expected**: Serverless-specific questions appear

#### T2.5: Features - Planning Follow-Ups
**Objective**: Validate feature planning follow-ups  
**Steps**:
1. Add 6+ features with priorities
2. Verify follow-up questions include:
   - "Would you like to phase these features?"
   - "Which features are absolutely critical for launch?"
   - "Which features are technically most complex?"
3. Select phasing: "Start with MVP, then iterate"
4. List critical features in textarea
5. Identify complex features

**Expected**: Feature planning insights generated for large feature lists

#### T2.6: Timeline - Sprint Follow-Ups
**Objective**: Validate timeline optimization follow-ups  
**Steps**:
1. Add 4+ milestones
2. Verify follow-up questions include:
   - "Will you use sprints or iterations?"
   - "Do you want to include buffer time?"
   - "How often will you review progress?"
3. Select: "2-week sprints"
4. Check "Yes, add 20% buffer time"
5. Select review cadence: "Weekly reviews"

**Expected**: Timeline optimization questions appear

#### T2.7: Team - Structure Follow-Ups
**Objective**: Validate team optimization follow-ups  
**Steps**:
1. Add 2+ team members
2. Verify follow-up questions include:
   - "What is your target team size?"
   - "What is the team's overall experience level?"
   - "What is your team's work model?"
   - "Are there any skill gaps you need to fill?"
3. Select team size: "Small (2-5 people)"
4. Select experience: "Mix of junior and senior"
5. Select work model: "Hybrid"
6. Enter skill gaps: "Need DevOps expertise"

**Expected**: Team structure questions generated

### 3. Plan Context Integration Tests

#### T3.1: Plan Document Loading
**Objective**: Verify plan context service loads documents  
**Steps**:
1. Create `Docs/Plan/detailed project description` with content
2. Create `Docs/Plan/feature list` with features
3. Open wizard
4. Complete Q1
5. Verify follow-up questions reference plan content

**Expected**: Plan context loaded and used

#### T3.2: Feature Auto-Population (Future Enhancement)
**Objective**: Verify features can be suggested from plan  
**Steps**:
1. Create plan with feature list:
   ```
   ## Feature List
   1. **User Authentication** - Secure login system
   2. **Dashboard** - Main user interface
   3. **Reporting** - Generate reports
   ```
2. Navigate to Q3 - Features
3. (Future) Click "Import from Plan"
4. Verify features pre-populated

**Expected**: Features suggested from plan

#### T3.3: Architecture Alignment
**Objective**: Verify architecture questions reference plan  
**Steps**:
1. Create plan mentioning "microservices architecture"
2. Select Architecture: Microservices
3. Verify follow-up includes:
   - "How does this architecture align with your plan?"
4. Answer should reference plan requirements

**Expected**: Plan context drives follow-up questions

### 4. Data Persistence Tests

#### T4.1: wizardStore Integration
**Objective**: Validate all answers save to store  
**Steps**:
1. Complete all 5 questions with follow-ups
2. Check wizardStore state
3. Verify structure:
   ```json
   {
     "q1-project-overview": {
       "name": "...",
       "description": "...",
       "type": "...",
       "followUpAnswers": { ... }
     },
     "q2-architecture": { ... },
     ...
   }
   ```

**Expected**: All core + follow-up answers stored

#### T4.2: localStorage Persistence
**Objective**: Verify draft saves to localStorage  
**Steps**:
1. Complete Q1 and Q2
2. Close browser tab
3. Reopen wizard
4. Verify Q1 and Q2 answers restored
5. Verify follow-up answers restored

**Expected**: Draft recovers from localStorage

#### T4.3: Navigation Persistence
**Objective**: Verify data persists across navigation  
**Steps**:
1. Complete Q1 with follow-ups
2. Navigate to Q2
3. Navigate back to Q1
4. Verify all answers (core + follow-ups) still present
5. Navigate to Q3, Q4, Q5
6. Navigate back to Q1
7. Verify answers persist

**Expected**: No data loss during navigation

### 5. UI/UX Tests

#### T5.1: Follow-Up Collapse/Expand
**Objective**: Validate collapsible behavior  
**Steps**:
1. Complete Q1 to trigger follow-ups
2. Verify follow-up section expanded by default
3. Click toggle button (▼)
4. Verify section collapses
5. Click toggle button (▶)
6. Verify section expands

**Expected**: Smooth collapse/expand animation

#### T5.2: AI Loader Display
**Objective**: Verify loading indicator  
**Steps**:
1. Select project type triggering follow-ups
2. Verify AI loader shows briefly
3. Verify text: "Analyzing your answers..."
4. Verify robot emoji (🤖) animates

**Expected**: Loading state provides feedback

#### T5.3: Responsive Design
**Objective**: Validate mobile/tablet layouts  
**Steps**:
1. Resize browser to mobile width (375px)
2. Verify radio groups stack vertically
3. Verify form fields full width
4. Verify follow-up questions readable
5. Resize to tablet (768px)
6. Verify layout adapts

**Expected**: Responsive layout works

### 6. Edge Cases & Error Handling

#### T6.1: Plan Files Missing
**Objective**: Handle missing plan documents gracefully  
**Steps**:
1. Delete `Docs/Plan/` folder
2. Open wizard
3. Complete questions
4. Verify no errors
5. Verify basic follow-ups still generate

**Expected**: Graceful fallback when plan missing

#### T6.2: Invalid Plan Content
**Objective**: Handle malformed plan documents  
**Steps**:
1. Create plan with invalid content (binary, etc.)
2. Complete questions
3. Verify no crash
4. Verify console warnings logged

**Expected**: Robust error handling

#### T6.3: Extremely Long Answers
**Objective**: Handle max length scenarios  
**Steps**:
1. Enter 50-character project name (max)
2. Enter 500-character description (max)
3. Add 10 skills to team member (max)
4. Verify character counters work
5. Verify no truncation

**Expected**: Max lengths enforced correctly

## Automated Test Coverage

### Unit Tests

```typescript
// PlanContextService.test.ts
describe('PlanContextService', () => {
  it('should load plan documents', async () => {
    const service = PlanContextService.getInstance();
    const context = await service.loadPlanContext();
    expect(context).toBeDefined();
  });

  it('should parse features from feature list', () => {
    const service = PlanContextService.getInstance();
    const features = service['parseFeatures']('1. **Feature One**\n2. **Feature Two**');
    expect(features).toHaveLength(2);
    expect(features[0]).toBe('Feature One');
  });

  it('should extract architecture notes', () => {
    const service = PlanContextService.getInstance();
    const notes = service['extractArchitectureNotes']('Uses microservices architecture');
    expect(notes).toContain('microservices');
  });

  it('should generate follow-up questions', () => {
    const service = PlanContextService.getInstance();
    const questions = service.generateFollowUpQuestions('q1-project-overview', { type: 'web' });
    expect(questions.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// wizardFlow.test.ts
describe('Wizard Flow Integration', () => {
  it('should complete all 5 questions with follow-ups', async () => {
    const wizard = useWizardStore();
    
    // Q1
    wizard.setAnswer('q1-project-overview', {
      name: 'Test Project',
      description: 'A comprehensive test project for validation',
      type: 'web',
      followUpAnswers: { 'frontend-framework': 'react' },
    });
    
    // Q2
    wizard.setAnswer('q2-architecture', {
      pattern: 'microservices',
      notes: 'Using microservices for scalability',
      followUpAnswers: { 'service-discovery': 'kubernetes' },
    });
    
    // ... Q3, Q4, Q5
    
    const plan = await wizard.completeWizard();
    expect(plan).toBeDefined();
    expect(plan['q1-project-overview'].followUpAnswers).toBeDefined();
  });
});
```

## Manual Testing Checklist

- [ ] All 5 core questions validate correctly
- [ ] Follow-up questions appear for each question type
- [ ] Answers persist across navigation
- [ ] Data saves to wizardStore correctly
- [ ] localStorage draft recovery works
- [ ] Plan context service loads documents
- [ ] UI is responsive (mobile/tablet/desktop)
- [ ] Error handling works for edge cases
- [ ] Performance is acceptable (no lag)
- [ ] Accessibility: keyboard navigation works
- [ ] Screen reader support (ARIA labels)

## Performance Benchmarks

- **Plan loading**: < 100ms
- **Follow-up generation**: < 200ms
- **Page navigation**: < 50ms
- **Answer persistence**: < 10ms
- **localStorage save**: < 20ms

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] VS Code webview

## Accessibility Tests

- [ ] All inputs have labels
- [ ] Keyboard navigation works (Tab, Enter, Arrow keys)
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader announces changes

## Test Data Samples

### Sample Plan Document

```markdown
# Project Description

The Copilot Orchestration Extension (COE) is a VS Code extension using microservices architecture to manage planning, task management, and GitHub integration. It requires React for the frontend and Node.js for the backend.

## Technical Requirements

- TypeScript
- React for UI
- Node.js/Express for API
- PostgreSQL database
- Docker for containerization

## Constraints

- Must comply with VS Code extension guidelines
- Must support offline mode
- Performance: < 200ms response time

## Features

1. **Task Orchestration** - Central task management
2. **GitHub Integration** - Sync with GitHub Issues
3. **AI Planning** - Intelligent task decomposition
4. **Multi-Agent System** - Coordinated agent workflows
```

### Sample Feature List

```markdown
# Feature List

1. **Task Management** - Create, update, delete tasks
2. **GitHub Sync** - Two-way sync with GitHub Issues
3. **Agent Orchestration** - Coordinate multiple agents
4. **Plan Builder** - Interactive project planning wizard
5. **Context Management** - Manage agent context bundles
```

## Success Criteria

1. **Core Functionality**: All 5 questions work correctly
2. **AI Integration**: Follow-up questions generate based on context
3. **Data Persistence**: No data loss across navigation
4. **Plan Integration**: Successfully reads from Docs/Plan/
5. **User Experience**: Smooth, intuitive wizard flow
6. **Performance**: Meets all benchmarks
7. **Accessibility**: Meets WCAG AA standards
8. **Test Coverage**: > 80% code coverage

## Test Report Template

```markdown
## Test Execution Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [VS Code version, OS]

### Test Results

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| T1.1 | ProjectOverview - Basic Validation | ✅ Pass | |
| T1.2 | Architecture - Pattern Selection | ✅ Pass | |
| ... | ... | ... | ... |

### Issues Found

1. [Issue description]
   - **Severity**: High/Medium/Low
   - **Steps to Reproduce**: ...
   - **Expected**: ...
   - **Actual**: ...

### Summary

- **Total Tests**: 30
- **Passed**: 28
- **Failed**: 2
- **Skipped**: 0
- **Pass Rate**: 93%
```

## Next Steps

After testing completion:
1. Address all critical/high severity issues
2. Update documentation with findings
3. Run automated test suite
4. Perform final review
5. Mark issue as complete
