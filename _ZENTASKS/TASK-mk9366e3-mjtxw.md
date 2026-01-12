# TASK-003C: Create plan validation engine

## Task Information

**ID:** TASK-mk9366e3-mjtxw

**Status:** done

**Priority:** high

**Dependencies:** EPIC-003, TASK-003A

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Build planValidator.ts with JSON schema validation (Ajv), dependency checks (circular refs, orphans), completeness checks, and timeline validation.

## Implementation Details

Methods: validateSchema, validateDependencies (no circular refs/orphans), validateCompleteness (all required sections), validateTimeline (logical dates), validateTeam (min 1 role).

Returns detailed ValidationResult with error messages, line numbers, field paths.

File: vscode-extension/src/planBuilder/planValidator.ts

Estimate: 2-3 hours

## Test Strategy

Valid plan passes all checks; invalid plans fail with specific errors; verify circular ref detection; test timeline validation; test helpful error messages.
