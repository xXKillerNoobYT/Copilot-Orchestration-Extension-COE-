# TASK-003D: Add plan metadata manager

## Task Information

**ID:** TASK-mk9340a0-y1pk7

**Status:** done

**Priority:** high

**Dependencies:** EPIC-003, TASK-003A

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Create planMetadata.ts for managing plan metadata (created date, author, version, status tracking).

## Implementation Details

TypeScript service with methods:
- addMetadata(plan: PlanJSON): PlanJSON → adds:
  * createdAt: ISO 8601 timestamp
  * updatedAt: ISO 8601 timestamp
  * author: from git config user.name (fallback to OS username)
  * version: "1.0.0" (semantic versioning)
  * status: "draft" (draft|active|completed|archived)
- updateMetadata(plan: PlanJSON, changes: Partial<Metadata>): PlanJSON → updates specific fields, auto-updates updatedAt
- incrementVersion(plan: PlanJSON, type: 'major'|'minor'|'patch'): PlanJSON → semantic version bump
- getAuthor(): Promise<string> → reads from git config or OS username

File: vscode-extension/src/planBuilder/planMetadata.ts

Estimate: 2-3 hours

## Test Strategy

Test metadata generation; verify timestamps are ISO 8601 format; test version incrementing (major: 1.0.0→2.0.0, minor: 1.0.0→1.1.0, patch: 1.0.0→1.0.1); verify author detection from git config; test fallback to OS username.
