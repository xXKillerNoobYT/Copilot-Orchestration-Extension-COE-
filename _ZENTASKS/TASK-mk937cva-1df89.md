# TASK-006C: Plan highlight integration

## Task Information

**ID:** TASK-mk937cva-1df89

**Status:** done

**Priority:** medium

**Dependencies:** EPIC-006

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Add plan highlight integration allowing users to click checklist items to navigate to corresponding plan sections.

## Implementation Details

Each checklist item has planSectionId reference. Click item→scroll to/highlight plan section in editor. Use VS Code API to open plan file and reveal range.

Estimate: 2 hours

## Test Strategy

Click checklist item; verify plan file opens; verify correct section highlighted; test with multiple plan files.
