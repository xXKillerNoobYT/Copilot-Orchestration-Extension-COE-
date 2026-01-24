import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock console methods
const consoleSpy = {
    log: jest.spyOn(console, 'log').mockImplementation(() => { }),
    error: jest.spyOn(console, 'error').mockImplementation(() => { }),
};

describe('validate-parser script', () => {
    const testDir = path.join(__dirname, '__test_validate_parser__');
    const sampleTasksDir = path.join(__dirname, '../../sample-tasks');

    beforeEach(async () => {
        await fs.mkdir(testDir, { recursive: true });
        await fs.mkdir(sampleTasksDir, { recursive: true });
        consoleSpy.log.mockClear();
        consoleSpy.error.mockClear();
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
            await fs.rm(sampleTasksDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Example Task Validation', () => {
        it('should validate a complete example task', async () => {
            const exampleTaskPath = path.join(sampleTasksDir, 'EXAMPLE-complete-task.md');
            const taskContent = `---
id: TASK-001
title: Complete Feature Implementation
type: feature
priority: high
status: in_progress
dependencies:
  - TASK-002
assignees:
  - architect
  - coder
labels:
  - backend
  - api
estimate: 2h 30m
github_issue_id: 123
context_bundle: bundle-123
subtasks:
  - id: SUB-001
    title: Design Phase
    status: completed
  - id: SUB-002
    title: Implementation
    status: in_progress
---
# Complete Feature Implementation

## Overview
This task demonstrates all supported fields.

## Acceptance Criteria
- Criterion 1
- Criterion 2`;

            await fs.writeFile(exampleTaskPath, taskContent, 'utf-8');

            // The validate-parser script would parse this
            const { parseTaskFile, normalizeEffort } = require('../taskParser');
            const content = await fs.readFile(exampleTaskPath, 'utf-8');
            const result = parseTaskFile(content, {
                fileName: exampleTaskPath,
                validateSchema: true,
                normalizeEffort: true,
                failOnInvalid: false,
            });

            expect(result.task).toBeTruthy();
            expect(result.task.id).toBe('TASK-001');
            expect(result.task.title).toBe('Complete Feature Implementation');
            expect(result.task.type).toBe('feature');
            expect(result.task.priority).toBe('high');
            expect(result.task.status).toBe('in_progress');
            expect(result.task.assignees).toContain('architect');
            expect(result.task.assignees).toContain('coder');
            expect(result.task.labels).toContain('backend');
            expect(result.task.estimate).toBe('2h 30m');

            const minutes = normalizeEffort(result.task.estimate);
            expect(minutes).toBe(150); // 2h 30m = 150 minutes

            expect(result.task.subtasks).toHaveLength(2);
            expect(result.task.subtasks[0].status).toBe('completed');
            expect(result.task.subtasks[1].status).toBe('in_progress');

            expect(result.errors).toHaveLength(0);
        });

        it('should detect validation errors in malformed task', async () => {
            const exampleTaskPath = path.join(sampleTasksDir, 'EXAMPLE-invalid-task.md');
            // Test with malformed YAML that will fail parsing
            const taskContent = `---
id: TASK-002
title: Test Task
type: feature
bad-yaml: [unclosed array
priority: high
---
Task content`;

            await fs.writeFile(exampleTaskPath, taskContent, 'utf-8');

            const { parseTaskFile } = require('../taskParser');
            const content = await fs.readFile(exampleTaskPath, 'utf-8');
            const result = parseTaskFile(content, {
                fileName: exampleTaskPath,
                validateSchema: true,
                normalizeEffort: true,
                failOnInvalid: false,
            });

            // Malformed YAML should cause parse errors
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some((e: any) => e.field === 'parse')).toBe(true);
        });

        it('should display warnings for questionable values', async () => {
            const exampleTaskPath = path.join(sampleTasksDir, 'EXAMPLE-warning-task.md');
            const taskContent = `---
id: TASK-003
title: Task with Warnings
estimate: invalid-estimate
---
Task content`;

            await fs.writeFile(exampleTaskPath, taskContent, 'utf-8');

            const { parseTaskFile } = require('../taskParser');
            const content = await fs.readFile(exampleTaskPath, 'utf-8');
            const result = parseTaskFile(content, {
                fileName: exampleTaskPath,
                validateSchema: true,
                normalizeEffort: true,
                failOnInvalid: false,
            });

            expect(result.warnings.some((w: any) => w.field === 'estimate')).toBe(true);
        });
    });

    describe('Validation Display', () => {
        it('should format subtask output correctly', async () => {
            const exampleTaskPath = path.join(sampleTasksDir, 'EXAMPLE-subtasks.md');
            const taskContent = `---
id: TASK-004
title: Parent Task
subtasks:
  - id: SUB-001
    title: Completed Subtask
    status: completed
  - id: SUB-002
    title: In Progress Subtask
    status: in_progress
  - id: SUB-003
    title: Pending Subtask
    status: pending
---
Task with various subtask statuses`;

            await fs.writeFile(exampleTaskPath, taskContent, 'utf-8');

            const { parseTaskFile } = require('../taskParser');
            const content = await fs.readFile(exampleTaskPath, 'utf-8');
            const result = parseTaskFile(content, {
                fileName: exampleTaskPath,
                validateSchema: true,
                failOnInvalid: false,
            });

            expect(result.task.subtasks).toHaveLength(3);
            expect(result.task.subtasks.find((st: any) => st.status === 'completed')).toBeTruthy();
            expect(result.task.subtasks.find((st: any) => st.status === 'in_progress')).toBeTruthy();
            expect(result.task.subtasks.find((st: any) => st.status === 'pending')).toBeTruthy();
        });

        it('should handle tasks without optional fields', async () => {
            const exampleTaskPath = path.join(sampleTasksDir, 'EXAMPLE-minimal.md');
            const taskContent = `---
id: TASK-005
title: Minimal Task
---
Minimal task description`;

            await fs.writeFile(exampleTaskPath, taskContent, 'utf-8');

            const { parseTaskFile } = require('../taskParser');
            const content = await fs.readFile(exampleTaskPath, 'utf-8');
            const result = parseTaskFile(content, {
                fileName: exampleTaskPath,
                validateSchema: true,
                failOnInvalid: false,
            });

            expect(result.task).toBeTruthy();
            expect(result.task.id).toBe('TASK-005');
            expect(result.task.title).toBe('Minimal Task');
            expect(result.task.subtasks).toHaveLength(0);
            expect(result.task.dependencies).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Effort Normalization Display', () => {
        it('should display normalized effort in hours and minutes', () => {
            const { normalizeEffort } = require('../taskParser');

            expect(normalizeEffort('2h 30m')).toBe(150);
            expect(normalizeEffort('1h')).toBe(60);
            expect(normalizeEffort('30m')).toBe(30);
            expect(normalizeEffort('1d')).toBe(480);
            expect(normalizeEffort('1w')).toBe(2400);
        });

        it('should handle complex effort formats', () => {
            const { normalizeEffort } = require('../taskParser');

            expect(normalizeEffort('1w 2d 3h 30m')).toBe(3570); // 2400 + 960 + 180 + 30
            expect(normalizeEffort('3d 6h')).toBe(1800); // 1440 + 360
        });
    });

    describe('Validation Summary', () => {
        it('should count parsed tasks correctly', async () => {
            const exampleTaskPath = path.join(sampleTasksDir, 'EXAMPLE-summary.md');
            const taskContent = `---
id: TASK-006
title: Summary Test
---
Content`;

            await fs.writeFile(exampleTaskPath, taskContent, 'utf-8');

            const { parseTaskFile } = require('../taskParser');
            const content = await fs.readFile(exampleTaskPath, 'utf-8');
            const result = parseTaskFile(content, {
                fileName: exampleTaskPath,
                validateSchema: true,
                failOnInvalid: false,
            });

            const tasksParsed = result.task ? 1 : 0;
            expect(tasksParsed).toBe(1);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        it('should provide accurate error and warning counts', async () => {
            const exampleTaskPath = path.join(sampleTasksDir, 'EXAMPLE-errors.md');
            const taskContent = `---
id: TASK-007
title: Test Task
estimate: bad-format
---
Content`;

            await fs.writeFile(exampleTaskPath, taskContent, 'utf-8');

            const { parseTaskFile } = require('../taskParser');
            const content = await fs.readFile(exampleTaskPath, 'utf-8');
            const result = parseTaskFile(content, {
                fileName: exampleTaskPath,
                validateSchema: true,
                normalizeEffort: true,
                failOnInvalid: false,
            });

            // Should have at least 1 warning for bad estimate format
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings.some((w: any) => w.field === 'estimate')).toBe(true);
        });
    });

    describe('Type and Agent Validation', () => {
        it('should validate task types correctly', () => {
            const { isValidTaskType } = require('../taskParser');

            expect(isValidTaskType('feature')).toBe(true);
            expect(isValidTaskType('bug')).toBe(true);
            expect(isValidTaskType('invalid')).toBe(false);
        });

        it('should validate agent types correctly', () => {
            const { isValidAgentType } = require('../taskParser');

            expect(isValidAgentType('architect')).toBe(true);
            expect(isValidAgentType('coder')).toBe(true);
            expect(isValidAgentType('tester')).toBe(true);
            expect(isValidAgentType('invalid')).toBe(false);
        });
    });
});
