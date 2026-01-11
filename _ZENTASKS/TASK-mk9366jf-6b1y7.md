# EPIC-004: Plan → Task Decomposition

## Task Information

**ID:** TASK-mk9366jf-6b1y7

**Status:** done

**Priority:** high

**Dependencies:** EPIC-003

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Auto-generate tasks from plan features with dependency mapping, priority assignment via critical path analysis, and circular dependency detection. Outputs to _ZENTASKS/tasks.json.

## Implementation Details

Components:
- taskDecomposition.ts: plan features→tasks with acceptance criteria
- dependencyInference.ts: smart dependency detection, circular checks
- priorityAssignment.ts: critical path analysis, priority propagation
- taskGenerator.ts: generate valid tasks.json

Integrates with existing DependencyGraphService from backend.

Estimate: 12-16 hours total

## Test Strategy

Generate tasks from plan; verify dependencies correct; check circular refs prevented; validate priorities assigned; test tasks.json validity.
