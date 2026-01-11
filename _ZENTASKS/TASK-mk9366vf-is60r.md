# TASK-004B: Implement dependency inference

## Task Information

**ID:** TASK-mk9366vf-is60r

**Status:** done

**Priority:** high

**Dependencies:** EPIC-004

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Implement dependency inference that automatically detects task dependencies based on feature relationships, technical constraints, and logical sequencing.

## Implementation Details

Rules: testing tasks depend on implementation tasks, documentation depends on both. Feature dependencies map to task dependencies. Detect implicit deps (database before API, API before UI). Circular dependency detection with helpful error messages.

File: vscode-extension/src/services/dependencyInference.ts

Uses graph algorithms (topological sort, cycle detection).

Estimate: 3-4 hours

## Test Strategy

Test implicit dependency detection; verify circular ref detection; test feature dependency mapping; validate topological sort order.
