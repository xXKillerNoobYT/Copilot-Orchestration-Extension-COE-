# TASK-006B: Real-time checklist sync

## Task Information

**ID:** TASK-mk937cn3-1qoz4

**Status:** done

**Priority:** high

**Dependencies:** EPIC-006

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Build real-time checklist sync that fetches checklist from backend API and updates UI via WebSocket events.

## Implementation Details

Fetch from /api/v1/verification/checklist endpoint. Listen to WebSocket 'checklist-updated' events. Update UI with checkboxes, progress bar, completion percentage. Mark items checked/unchecked with backend sync.

Estimate: 3 hours

## Test Strategy

Verify checklist loads from API; test real-time updates via WebSocket; test checkbox state syncs to backend; verify progress bar updates.
