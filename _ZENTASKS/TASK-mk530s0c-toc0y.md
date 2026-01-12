# Implement GitHub Issue Sync bi-directional engine

## Task Information

**ID:** TASK-mk530s0c-toc0y

**Status:** cancelled

**Priority:** high

**Dependencies:** None

**Created:** 1/7/2026

**Updated:** 1/8/2026

## Description

Build bi-directional sync between GitHub Issues and internal COE tasks. When issues are created/updated on GitHub, auto-generate or update matching COE tasks. When tasks complete, update/close related issues. Maintain labels, milestones, assignees in sync.

## Implementation Details

Create GitHub API integration (using Octokit), webhook listener for issue events, task creation/update logic, and status-to-issue-state mapping. Support auto-labeling, milestone assignment, and assignee sync. Files: src/github/githubClient.ts (new), src/github/webhookHandler.ts (new), src/services/githubSyncService.ts (new).

## Test Strategy

Mock GitHub API responses. Test webhook payload handling. Verify task creation from issues with correct metadata. Test status sync in both directions. Verify label and assignee preservation.
