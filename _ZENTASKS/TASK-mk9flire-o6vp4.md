# Implement plan decomposition engine for auto task generation

## Task Information

**ID:** TASK-mk9flire-o6vp4

**Status:** pending

**Priority:** high

**Dependencies:** None

**Created:** 1/11/2026

**Updated:** 1/11/2026

## Description

ISSUE #3: HIGH - Implement automatic task decomposition from plans. Core mechanism converting wizard output into executable task queue. Must include circular dependency detection, priority assignment, and critical path analysis.

## Implementation Details



## Core Components
1. PlanDecompositionService.php - Decomposition algorithm, dependency inference, circular detection
2. WizardPlanParserService.php - Parse wizard output into plan structure
3. /api/v1/plans/{id}/decompose endpoint - Trigger decomposition + return tasks
4. Circular dependency detection (DFS algorithm)
5. Priority assignment (HIGH/MEDIUM/LOW)
6. Critical path analysis

## Algorithm Flow
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

## Implementation Steps
1. Create PlanDecompositionService.php with core algorithm
2. Create WizardPlanParserService.php for plan parsing
3. Create PlanDecompositionController.php with /api/v1/plans/{id}/decompose endpoint
4. Implement feature decomposition logic (15-45 min subtasks)
5. Implement dependency inference from feature descriptions
6. Implement circular dependency detection (DFS)
7. Implement priority assignment algorithm
8. Implement critical path analysis
9. Create 27+ comprehensive test cases
10. Verify handles 50+ features without performance issues
11. Update API documentation

## New Files to Create
- app/Services/PlanDecompositionService.php
- app/Services/WizardPlanParserService.php
- app/Http/Controllers/PlanDecompositionController.php
- tests/Feature/PlanDecompositionTest.php
- tests/Unit/Services/PlanDecompositionServiceTest.php
- tests/Unit/Services/WizardPlanParserServiceTest.php

## Test Strategy
- 27+ unit test cases covering decomposition scenarios
- Edge case tests (complex features, multiple dependencies)
- Circular dependency detection tests
- Priority assignment logic tests
- Performance tests (50+ features)
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
✅ 0 new lint errors
✅ WebSocket broadcast working (real-time UI updates)
✅ Project completion: 42% → 48%+


## Test Strategy

1. Run feature tests (phpunit tests/Feature/PlanDecompositionTest.php → 100% pass)\n2. Run unit tests (phpunit tests/Unit/Services/ → 27+ tests passing)\n3. Coverage analysis (>75% for new code)\n4. PHP syntax check (php -l app/Services/)\n5. Performance test (50+ feature decomposition → <2 seconds)\n6. Manual API test (curl POST /api/v1/plans/{id}/decompose → returns task list)\n7. WebSocket test (verify real-time broadcast to clients)
