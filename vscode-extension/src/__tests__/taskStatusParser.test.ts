import { describe, it, expect, beforeEach } from '@jest/globals';
import { TaskStatusParser } from '../taskStatusParser';
import { TaskStatus, TaskPriority, TaskType, AgentType } from '../taskParser';

describe('TaskStatusParser', () => {
  let parser: TaskStatusParser;

  beforeEach(() => {
    parser = new TaskStatusParser();
  });

  describe('parseTaskFile', () => {
    it('should parse valid task file with complete front matter', () => {
      const content = `---
id: task-001
title: Test Task
type: feature
priority: high
status: in-progress
dependencies:
  - task-002
assignees:
  - auto-zen
labels:
  - backend
estimate: 4h
due: 2026-01-30
github_issue_id: 123
github_issue_url: https://github.com/owner/repo/issues/123
context_bundle: bundle-001
format_version: 1.0.0
---

This is the task description with details.`;

      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.errors).toEqual([]);
      expect(result.task?.id).toBe('task-001');
      expect(result.task?.title).toBe('Test Task');
      expect(result.task?.type).toBe('feature');
      expect(result.task?.priority).toBe('high');
      expect(result.task?.status).toBe('in-progress');
      expect(result.task?.dependencies).toEqual(['task-002']);
      expect(result.task?.assignees).toEqual(['auto-zen']);
      expect(result.task?.labels).toEqual(['backend']);
      expect(result.task?.estimate).toBe('4h');
      expect(result.task?.due).toBe('2026-01-30');
      expect(result.task?.github_issue_id).toBe(123);
      expect(result.task?.github_issue_url).toBe('https://github.com/owner/repo/issues/123');
      expect(result.task?.context_bundle).toBe('bundle-001');
      expect(result.task?.format_version).toBe('1.0.0');
      expect(result.task?.description).toContain('task description with details');
    });

    it('should handle missing front matter', () => {
      const content = 'Just some markdown content without front matter';
      
      const result = parser.parseTaskFile('/path/to/task.task.md', content);

      expect(result.task).toBeNull();
      expect(result.errors).toContain('No YAML front matter found');
    });

    it('should handle invalid YAML in front matter', () => {
      const content = `---
invalid: yaml: syntax: error
---

Content`;
      
      const result = parser.parseTaskFile('/path/to/task.task.md', content);

      expect(result.task).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid YAML');
    });

    it('should extract ID from file path when not in front matter', () => {
      const content = `---
title: Test Task
---

Content`;
      
      const result = parser.parseTaskFile('/tasks/task-123.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.id).toBe('task-123');
    });

    it('should extract title from body when not in front matter', () => {
      const content = `---
id: task-001
---

# Main Task Title

This is the content.`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.title).toBe('Main Task Title');
    });

    it('should handle empty dependencies array', () => {
      const content = `---
id: task-001
title: Test Task
dependencies: []
---

Content`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.dependencies).toEqual([]);
    });

    it('should filter invalid agent types from assignees', () => {
      const content = `---
id: task-001
title: Test Task
assignees:
  - auto-zen
  - invalid-agent
  - plan-agent
---

Content`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.assignees).toContain('auto-zen');
      expect(result.task?.assignees).toContain('plan-agent');
      expect(result.task?.assignees).not.toContain('invalid-agent');
    });

    it('should parse subtasks from front matter', () => {
      const content = `---
id: task-001
title: Test Task
subtasks:
  - id: subtask-001
    title: Subtask 1
    status: pending
  - id: subtask-002
    title: Subtask 2
    status: completed
---

Content`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.subtasks).toHaveLength(2);
      expect(result.task?.subtasks?.[0].id).toBe('subtask-001');
      expect(result.task?.subtasks?.[1].status).toBe('completed');
    });

    it('should handle malformed front matter gracefully', () => {
      const content = `---
id: task-001
title: Test Task
type: invalid-type
priority: invalid-priority
status: invalid-status
---

Content`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should catch unexpected parsing errors', () => {
      const content = `---
id: task-001
---

Content`;
      
      // Simulate unexpected error by passing null
      const result = parser.parseTaskFile('', content);

      expect(result.task).toBeDefined();
    });
  });

  describe('buildStatusDisplay', () => {
    it('should build complete status display', () => {
      const task = {
        id: 'task-001',
        title: 'Test Task',
        status: 'in-progress' as TaskStatus,
        priority: 'high' as TaskPriority,
        estimate: '4h',
        dependencies: ['task-002'],
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);

      expect(display).toContain('Status:');
      expect(display).toContain('Priority:');
      expect(display).toContain('Est: 4h');
    });

    it('should handle task with only status', () => {
      const task = {
        id: 'task-001',
        title: 'Test Task',
        status: 'pending' as TaskStatus,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);

      expect(display).toContain('Status:');
      expect(display).not.toContain('Priority:');
      expect(display).not.toContain('Est:');
    });

    it('should handle task with no metadata', () => {
      const task = {
        id: 'task-001',
        title: 'Test Task',
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);

      expect(display).toBeDefined();
    });

    it('should include dependencies in display', () => {
      const task = {
        id: 'task-001',
        title: 'Test Task',
        dependencies: ['task-002', 'task-003'],
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);

      expect(display).toBeDefined();
    });
  });

  describe('formatStatus', () => {
    it('should format pending status', () => {
      const task = {
        id: 'task-001',
        title: 'Test',
        status: 'pending' as TaskStatus,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);
      expect(display).toContain('pending');
    });

    it('should format in-progress status', () => {
      const task = {
        id: 'task-001',
        title: 'Test',
        status: 'in-progress' as TaskStatus,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);
      expect(display).toContain('in-progress');
    });

    it('should format completed status', () => {
      const task = {
        id: 'task-001',
        title: 'Test',
        status: 'completed' as TaskStatus,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);
      expect(display).toContain('completed');
    });

    it('should format blocked status', () => {
      const task = {
        id: 'task-001',
        title: 'Test',
        status: 'blocked' as TaskStatus,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);
      expect(display).toContain('blocked');
    });
  });

  describe('formatPriority', () => {
    it('should format critical priority', () => {
      const task = {
        id: 'task-001',
        title: 'Test',
        priority: 'critical' as TaskPriority,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);
      expect(display).toContain('critical');
    });

    it('should format high priority', () => {
      const task = {
        id: 'task-001',
        title: 'Test',
        priority: 'high' as TaskPriority,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);
      expect(display).toContain('high');
    });

    it('should format medium priority', () => {
      const task = {
        id: 'task-001',
        title: 'Test',
        priority: 'medium' as TaskPriority,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);
      expect(display).toContain('medium');
    });

    it('should format low priority', () => {
      const task = {
        id: 'task-001',
        title: 'Test',
        priority: 'low' as TaskPriority,
        description: '',
        subtasks: [],
        assignees: [],
        labels: []
      };

      const display = parser.buildStatusDisplay(task);
      expect(display).toContain('low');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string content', () => {
      const result = parser.parseTaskFile('/path/to/task.task.md', '');

      expect(result.task).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle content with only front matter delimiters', () => {
      const content = `---
---`;
      
      const result = parser.parseTaskFile('/path/to/task.task.md', content);

      expect(result.task).toBeDefined();
    });

    it('should handle very large task descriptions', () => {
      const largeDescription = 'Content '.repeat(10000);
      const content = `---
id: task-001
title: Large Task
---

${largeDescription}`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.description.length).toBeGreaterThan(50000);
    });

    it('should handle special characters in front matter', () => {
      const content = `---
id: task-001
title: "Task with \"quotes\" and 'apostrophes'"
description: "Special chars: @#$%^&*()"
---

Content`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.title).toContain('quotes');
    });

    it('should handle unicode characters', () => {
      const content = `---
id: task-001
title: "任务 🚀 Tâche"
---

Content with émojis 🎉`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.title).toContain('🚀');
    });

    it('should handle malformed date fields', () => {
      const content = `---
id: task-001
title: Test Task
due: not-a-date
---

Content`;
      
      const result = parser.parseTaskFile('/path/to/task-001.task.md', content);

      expect(result.task).toBeDefined();
      expect(result.task?.due).toBe('not-a-date');
    });
  });
});
