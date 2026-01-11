# Implement Plan-Driven Task Decomposition Engine

## Task Information

**ID:** TASK-mk9547ql-mdpp0

**Status:** in-progress

**Priority:** high

**Dependencies:** None

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Create automated task generation from plan.json output. Analyze plan structure (features, timeline, requirements) and auto-generate decomposed task tree with proper dependencies, priorities, and subtask relationships. Wire to wizard completion flow to automatically populate task queue.

## Implementation Details

**Current State**: Plans are created by wizard but don't drive task generation. Tasks must be created manually. This breaks the automation loop.

**What Should Happen**:
```
Wizard completes
    ↓
Plan.json generated and saved
    ↓ 
PlanDecompositionService analyzes plan
    ↓
Automatic task tree generated
    ↓
Dependencies inferred from plan structure
    ↓
Task priorities assigned
    ↓
Task queue updated
    ↓
Auto Zen execution starts
```

**What Actually Happens**:
```
Wizard completes
    ↓
Plan.json saved
    ↓
✗ Nothing happens
    ↓
User must manually create tasks
```

**Implementation**:

1. **Create Laravel Service**: `app/Services/PlanDecompositionService.php` (400-500 LOC)
   - Parse plan.json structure
   - Identify features, components, modules
   - Generate task tree
   - Infer dependencies from feature relationships
   - Calculate critical path
   - Assign priorities and estimates

2. **Create Laravel Controller**: `app/Http/Controllers/Api/PlanDecompositionController.php` (200 LOC)
   - Endpoint: POST /api/plans/{id}/decompose
   - Accept plan parameters
   - Call decomposition service
   - Return generated tasks
   - Create tasks in database

3. **Integrate with Wizard**: `vscode-extension/src/planBuilder/planIntegration.ts`
   - After plan completion, call decomposition endpoint
   - Create tasks from response
   - Update task queue
   - Show progress to user

4. **Update Frontend**: Create task display for generated tasks
   - Show task tree visualization
   - Allow user to edit/approve before execution
   - Enable manual refinement

**Decomposition Algorithm**:
```
Input: Plan.json {features[], timeline, scope, constraints}
  ↓
1. Extract feature list
2. For each feature:
   - Create feature task
   - Break into components
   - Create subtasks per component
   - Identify dependencies between features
   - Calculate effort estimates
   - Assign priority based on critical path
3. Detect cross-feature dependencies
4. Create milestones at critical points
5. Validate no circular dependencies
6. Generate execution plan
  ↓
Output: Task tree with dependencies and priorities
```

**Test Cases**:
- Decompose simple 2-feature plan
- Decompose complex 10-feature plan
- Handle cross-feature dependencies
- Verify critical path calculation
- Validate no circular dependencies
- Check task estimate accuracy
- Test all wizard paths (designer, analyst, architect)

**Related Tasks**:
- TASK-mk7jzlhj-kozt7: Wizard Flow Integration Tests (depends on this)
- Section 10 Completion (unlocks full plan lifecycle)

## Test Strategy

Unit test: feed plan.json to decomposition service, verify correct task tree generated. Integration test: complete wizard, verify automatic task generation. Test with multiple wizard paths (designer, analyst, architect). Verify dependencies, priorities, and estimates are correct.
