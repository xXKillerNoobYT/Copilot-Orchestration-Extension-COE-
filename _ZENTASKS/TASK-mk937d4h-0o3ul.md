# TASK-006D: Issue reporting workflow

## Task Information

**ID:** TASK-mk937d4h-0o3ul

**Status:** done

**Priority:** medium

**Dependencies:** EPIC-006

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Create issue reporting workflow: click "Report Issue"→modal form→create task in _ZENTASKS with plan/checklist context→link to plan section.

## Implementation Details

UI: "Report Issue" button per checklist item. Modal: issue title, description, severity. Creates task via zen-tasks_add_task with details linking to plan section and checklist item. Auto-tags with "verification-issue" label.

Estimate: 3 hours

## Test Strategy

Click "Report Issue"; fill form; submit; verify task created in _ZENTASKS; verify task has correct metadata and plan links.
