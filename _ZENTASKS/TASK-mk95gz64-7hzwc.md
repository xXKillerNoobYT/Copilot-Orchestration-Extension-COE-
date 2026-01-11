# Create PlanDecompositionService with task generation logic

## Task Information

**ID:** TASK-mk95gz64-7hzwc

**Status:** done

**Priority:** high

**Dependencies:** TASK-mk9547ql-mdpp0

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Build core service to analyze plan.json and generate decomposed task tree with dependencies and priorities

## Implementation Details

✅ COMPLETED (2026-01-11):

Implementation:
- Created app/Services/PlanDecompositionService.php (510 lines)
- Core methods implemented:
  * decomposePlan() - Main orchestration method
  * generateTasksFromFeatures() - Convert features to tasks
  * breakIntoSubtasks() - Microtask decomposition (15-45 min subtasks)
  * estimateEffort() - Complexity-based effort estimation
  * inferDependencies() - Map feature dependencies to task dependencies
  * assignPriorities() - Critical path-based priority boost
  * validateNoCycles() - Circular dependency detection (DFS)
  * calculateCriticalPath() - Longest path calculation with memoization
  * buildDependencyGraph() - Adjacency list representation
  * hasCycleFrom() - Cycle detection using DFS with recursion stack
  * calculateLongestPath() - Recursive longest path with cycle protection
  * getPriorityBreakdown() - Statistics generation

Algorithm Features:
- Automatic subtask breakdown for features >45 min (configurable)
- Complexity estimation based on keywords: authentication (1.5x), database (1.3x), API (1.2x), integration (1.4x)
- Critical path calculation promotes task priorities
- Circular dependency detection prevents invalid task trees
- Cycle-safe longest path calculation with static processing guard

Output Structure:
{
  "tasks": [
    {
      "id": "feat-id",
      "title": "Implement: Feature Name",
      "description": "...",
      "type": "feature",
      "priority": "high|medium|low|critical",
      "dependencies": ["feat-1", ...],
      "estimate_hours": 8.5,
      "subtasks": [...]  // Optional, for large features
    }
  ],
  "metadata": {
    "total_tasks": 15,
    "estimated_hours": 120,
    "critical_path": ["feat-1", "feat-3"],
    "architecture_pattern": "microservices",
    "priority_breakdown": {
      "critical": 2,
      "high": 5,
      "medium": 6,
      "low": 2
    }
  }
}

Test Coverage:
- Created tests/Unit/Services/PlanDecompositionServiceTest.php
- 11 test cases, 63 assertions
- ✅ ALL TESTS PASSING (11/11)

Test Cases:
1. Simple plan decomposition (2 features)
2. Large feature breakdown into subtasks
3. Complexity-based effort estimation
4. Dependency inference from features
5. Critical path calculation
6. Priority boost for critical path tasks
7. Metadata generation (totals, breakdown)
8. Circular dependency detection and exception
9. Empty feature list handling
10. Microtask size option respect
11. Priority normalization (critical/normal/unknown)

Files Created:
- app/Services/PlanDecompositionService.php (510 lines)
- tests/Unit/Services/PlanDecompositionServiceTest.php (466 lines)

Validation:
- phpunit execution: 11/11 tests passing, 63 assertions
- No errors in codebase
- Memory-safe with cycle protection
- Ready for controller integration

## Test Strategy

Unit test: feed sample plan.json, verify correct task tree generated with all dependencies, priorities, and estimates. Test circular dependency detection. Test critical path calculation.
