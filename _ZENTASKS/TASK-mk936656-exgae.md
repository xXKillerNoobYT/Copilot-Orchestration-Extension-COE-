# TASK-003A: Build plan JSON generator

## Task Information

**ID:** TASK-mk936656-exgae

**Status:** done

**Priority:** high

**Dependencies:** EPIC-003, TASK-002E

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Create planGenerator.ts that transforms wizard answers (Q1-Q5) into Code Master plan.json schema format with full type safety.

## Implementation Details

Maps: Q1→project metadata, Q2→architecture, Q3→features array, Q4→timeline/milestones, Q5→team structure. Uses Zod schemas for validation.

File: vscode-extension/src/planBuilder/planGenerator.ts

Define interfaces: WizardAnswers, PlanJSON, Feature, Milestone, TeamRole

Estimate: 3-4 hours

## Test Strategy

Unit tests: valid wizard→valid JSON; missing fields→error; verify all sections map; validate against schema; test edge cases (empty arrays, nulls).
