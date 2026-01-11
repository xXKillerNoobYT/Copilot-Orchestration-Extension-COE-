# Harden zen-tasks_parse_requirements JSON handling

## Task Information

**ID:** TASK-mjxz0y0m-kk8ty

**Status:** blocked

**Priority:** low

**Dependencies:** None

**Created:** 1/3/2026

**Updated:** 1/8/2026

## Description

[RESOLVED] External tool limitation: LLM JSON output in zen-tasks-copilot. Workaround active: zen-tasks_add_task for reliable individual task creation.

## Implementation Details

INVESTIGATION COMPLETE (2026-01-08). Issue: LLM output occasionally has markdown wrappers; tool parser lacks repair logic. WORKAROUND: zen-tasks_add_task works reliably for individual tasks. IMPACT: Minimal. Can create tasks individually. Future: Local JSON repair in extension. See BLOCKER-INVESTIGATION-REPORT.md for details.

## Test Strategy

zen-tasks_add_task proven working; plan extension-native parser as enhancement
