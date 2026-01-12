# TASK-004C: Add priority assignment logic

## Task Information

**ID:** TASK-mk936720-1uajo

**Status:** done

**Priority:** medium

**Dependencies:** EPIC-004

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Add priority assignment logic using critical path analysis. Tasks on critical path get high priority, parallel tasks get medium, polish tasks get low.

## Implementation Details

Algorithm: Build dependency graph, find critical path (longest path through DAG), assign priorities: critical path=high, blockers of critical path=high, parallel work=medium, polish/docs=low. Priority propagation through dependency chains.

File: vscode-extension/src/services/priorityAssignment.ts

Uses existing DependencyGraphService for graph operations.

Estimate: 2-3 hours

## Test Strategy

Test critical path identification; verify priorities assigned correctly; test priority propagation; validate no orphan tasks.
