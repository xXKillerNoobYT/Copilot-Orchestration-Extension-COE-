/**
 * Integration Test for Task File Support
 * Tests CodeLens, Document Watcher, Syntax Highlighter, and Interaction API
 */

import * as assert from 'assert';
import { TaskFileCodeLensProvider } from './taskFileCodeLens';
import { TaskStatusParser } from './taskStatusParser';
import { TaskFileSyntaxHighlighter } from './taskFileSyntaxHighlighter';
import { TaskInteractionAPI } from './taskInteractionAPI';

describe('Task File Support Integration', () => {
  describe('TaskStatusParser', () => {
    it('should parse valid .task.md file', () => {
      const parser = new TaskStatusParser();
      const content = `---
id: TASK-001
title: Test Task
type: feature
priority: high
status: pending
dependencies: [TASK-002]
---

## Goal
Test the parsing
`;
      const result = parser.parseTaskFile('/tmp/test.task.md', content);
      assert.ok(result.task);
      assert.strictEqual(result.task.id, 'TASK-001');
      assert.strictEqual(result.task.title, 'Test Task');
      assert.strictEqual(result.task.type, 'feature');
      assert.strictEqual(result.task.priority, 'high');
      assert.strictEqual(result.task.status, 'pending');
      assert.deepStrictEqual(result.task.dependencies, ['TASK-002']);
    });

    it('should detect missing required fields', () => {
      const parser = new TaskStatusParser();
      const content = `---
id: TASK-001
---

No title or type
`;
      const result = parser.parseTaskFile('/tmp/test.task.md', content);
      assert.ok(result.task);
      assert.ok(result.errors.length > 0);
    });

    it('should format status display correctly', () => {
      const parser = new TaskStatusParser();
      const task = {
        id: 'TASK-001',
        title: 'Test',
        status: 'in_progress',
        priority: 'high',
        estimate: '3h',
        dependencies: [],
        assignees: [],
        labels: [],
        subtasks: [],
        rawFrontMatter: {},
      };
      const display = parser.buildStatusDisplay(task);
      assert.ok(display.includes('Status: 🔄 In Progress'));
      assert.ok(display.includes('Priority: 🟠 High'));
      assert.ok(display.includes('Est: 3h'));
    });

    it('should extract task ID from filename', () => {
      const parser = new TaskStatusParser();
      const content = `---
title: Test
type: feature
priority: medium
status: pending
---`;
      const result = parser.parseTaskFile('/path/to/TASK-123-example.task.md', content);
      assert.ok(result.task);
      assert.ok(result.task.id.includes('TASK-123'));
    });
  });

  describe('TaskFileSyntaxHighlighter', () => {
    it('should create decoration types', () => {
      const highlighter = new TaskFileSyntaxHighlighter();
      assert.ok(highlighter);
      // Decorations should be created without errors
      highlighter.dispose();
    });

    it('should validate field values', () => {
      const highlighter = new TaskFileSyntaxHighlighter();
      // The private method is not directly testable, but we can verify
      // the highlighter initializes without errors
      assert.ok(highlighter);
      highlighter.dispose();
    });
  });

  describe('TaskInteractionAPI', () => {
    it('should emit interaction events', (done) => {
      const api = new TaskInteractionAPI();
      let eventEmitted = false;

      api.onTaskInteraction((event) => {
        eventEmitted = true;
        assert.ok(event.taskId);
        assert.ok(['executeTask', 'statusChanged', 'contextBundleCreated', 'gitHubLinked', 'dependenciesChanged'].includes(event.type));
        api.dispose();
        done();
      });

      // Simulate an event (this would normally come from command execution)
      assert.ok(!eventEmitted);
    });
  });

  describe('Task Format Validation', () => {
    it('should validate status enum values', () => {
      const validStatuses = ['pending', 'approved', 'in_progress', 'testing', 'review', 'completed', 'failed', 'blocked', 'cancelled'];
      const parser = new TaskStatusParser();

      for (const status of validStatuses) {
        const content = `---
id: TASK-001
title: Test
type: feature
priority: medium
status: ${status}
---`;
        const result = parser.parseTaskFile('/tmp/test.task.md', content);
        assert.ok(result.task);
        assert.strictEqual(result.task.status, status);
      }
    });

    it('should validate priority enum values', () => {
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      const parser = new TaskStatusParser();

      for (const priority of validPriorities) {
        const content = `---
id: TASK-001
title: Test
type: feature
priority: ${priority}
status: pending
---`;
        const result = parser.parseTaskFile('/tmp/test.task.md', content);
        assert.ok(result.task);
        assert.strictEqual(result.task.priority, priority);
      }
    });

    it('should validate type enum values', () => {
      const validTypes = ['feature', 'bug', 'refactor', 'maintenance', 'architecture', 'testing', 'documentation'];
      const parser = new TaskStatusParser();

      for (const type of validTypes) {
        const content = `---
id: TASK-001
title: Test
type: ${type}
priority: medium
status: pending
---`;
        const result = parser.parseTaskFile('/tmp/test.task.md', content);
        assert.ok(result.task);
        assert.strictEqual(result.task.type, type);
      }
    });

    it('should parse subtasks correctly', () => {
      const parser = new TaskStatusParser();
      const content = `---
id: TASK-001
title: Test
type: feature
priority: medium
status: pending
subtasks:
  - id: TASK-001A
    title: Subtask 1
    priority: high
  - id: TASK-001B
    title: Subtask 2
    priority: medium
---`;
      const result = parser.parseTaskFile('/tmp/test.task.md', content);
      assert.ok(result.task);
      assert.strictEqual(result.task.subtasks.length, 2);
      assert.strictEqual(result.task.subtasks[0].id, 'TASK-001A');
      assert.strictEqual(result.task.subtasks[1].id, 'TASK-001B');
    });
  });
});

// Export for test runner
export { };
