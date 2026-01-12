# TASK-004D: Build task JSON generator

## Task Information

**ID:** TASK-mk93676p-wwbug

**Status:** done

**Priority:** high

**Dependencies:** EPIC-004, TASK-004A, TASK-004B, TASK-004C

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Build task JSON generator that outputs valid _ZENTASKS/tasks.json with all tasks, dependencies, priorities, and metadata from the plan.

## Implementation Details

Combines outputs from taskDecomposition, dependencyInference, priorityAssignment. Generates task IDs, timestamps, status (all pending). Validates output against tasks.json schema. Option to merge with existing tasks or replace.

File: vscode-extension/src/services/taskGenerator.ts

Estimate: 3-4 hours

## Test Strategy

Generate tasks.json from plan; validate JSON structure; verify all task fields present; test merge vs replace modes; verify no ID collisions.
