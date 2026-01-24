/**
 * Task Tree Item Tests
 */

import { TaskTreeItem, CategoryTreeItem } from './taskTreeItem';
import { Task } from '../services/taskService';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
  TreeItem: class TreeItem {
    label: string;
    id?: string;
    tooltip?: string | vscode.MarkdownString;
    description?: string;
    iconPath?: any;
    command?: any;
    contextValue?: string;
    collapsibleState?: any;
    
    constructor(label: string, collapsibleState?: any) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: class ThemeIcon {
    id: string;
    color?: any;
    constructor(id: string, color?: any) {
      this.id = id;
      this.color = color;
    }
  },
  ThemeColor: class ThemeColor {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
  },
  MarkdownString: class MarkdownString {
    value: string;
    constructor(value: string) {
      this.value = value;
    }
  },
}));

describe('TaskTreeItem', () => {
  const mockTask: Task = {
    id: 'task-1',
    project_id: 'project-1',
    name: 'Test Task',
    description: 'A test task description that is quite long and should be truncated in the tooltip when it exceeds 200 characters. This is some additional text to make the description longer so we can test the truncation behavior properly.',
    task_type: 'feature',
    priority: 'high',
    status: 'in_progress',
    estimated_effort: 120, // 2 hours
    actual_effort: 90, // 1.5 hours
    dependencyCount: 2,
    subtaskCount: 3,
    assigned_agent: 'planning-agent',
    github_issue_url: 'https://github.com/test/repo/issues/123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  describe('constructor', () => {
    it('should create a tree item with task data', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);

      expect(item.label).toBe('Test Task');
      expect(item.id).toBe('task-1');
      expect(item.contextValue).toBe('task');
      expect(item.command).toBeDefined();
      expect(item.command?.command).toBe('copilot-orchestrator.viewTaskDetails');
    });

    it('should set proper collapsible state', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.Collapsed);
      expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
    });
  });

  describe('tooltip', () => {
    it('should include task name and description', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;

      expect(tooltip).toContain('**Test Task**');
      expect(tooltip).toContain('A test task description');
    });

    it('should truncate long descriptions at word boundary', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;

      // Description should be truncated with ellipsis
      expect(tooltip).toContain('...');
      
      // Verify the description was actually truncated (original is >200 chars)
      expect(mockTask.description!.length).toBeGreaterThan(200);
      
      // The truncated portion should be less than the full description
      const truncatedPart = tooltip.substring(
        tooltip.indexOf(mockTask.description!.substring(0, 50)),
        tooltip.indexOf('...')
      );
      expect(truncatedPart.length).toBeLessThan(mockTask.description!.length);
    });

    it('should include status, priority, and type', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;

      expect(tooltip).toContain('**Status:** In Progress');
      expect(tooltip).toContain('**Priority:** 🟠 High');
      expect(tooltip).toContain('**Type:** Feature');
    });

    it('should include effort information', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;

      expect(tooltip).toContain('**Effort:** 2h (estimated) / 1h 30m (actual)');
    });

    it('should include dependency and subtask counts', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;

      expect(tooltip).toContain('**Dependencies:** 2');
      expect(tooltip).toContain('**Subtasks:** 3');
    });

    it('should include assigned agent', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;

      expect(tooltip).toContain('**Assigned Agent:** planning-agent');
    });

    it('should include GitHub issue URL', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;

      expect(tooltip).toContain('**GitHub Issue:** https://github.com/test/repo/issues/123');
    });
  });

  describe('description', () => {
    it('should show effort in hours', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      
      expect(item.description).toContain('2h');
    });

    it('should show dependency count', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      
      expect(item.description).toContain('2 deps');
    });

    it('should show subtask count', () => {
      const item = new TaskTreeItem(mockTask, vscode.TreeItemCollapsibleState.None);
      
      expect(item.description).toContain('3 subtasks');
    });

    it('should handle tasks without effort', () => {
      const taskNoEffort = { ...mockTask, estimated_effort: undefined };
      const item = new TaskTreeItem(taskNoEffort, vscode.TreeItemCollapsibleState.None);
      
      expect(item.description).not.toContain('h');
    });
  });

  describe('icon', () => {
    it('should use error icon for critical priority', () => {
      const criticalTask = { ...mockTask, priority: 'critical' as const };
      const item = new TaskTreeItem(criticalTask, vscode.TreeItemCollapsibleState.None);
      
      expect((item.iconPath as vscode.ThemeIcon).id).toBe('error');
    });

    it('should use warning icon for high priority', () => {
      const highTask = { ...mockTask, priority: 'high' as const };
      const item = new TaskTreeItem(highTask, vscode.TreeItemCollapsibleState.None);
      
      expect((item.iconPath as vscode.ThemeIcon).id).toBe('warning');
    });

    it('should use check icon for completed status', () => {
      const completedTask = { ...mockTask, status: 'completed' as const, priority: 'medium' as const };
      const item = new TaskTreeItem(completedTask, vscode.TreeItemCollapsibleState.None);
      
      expect((item.iconPath as vscode.ThemeIcon).id).toBe('check');
    });

    it('should use sync icon for in_progress status', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' as const, priority: 'medium' as const };
      const item = new TaskTreeItem(inProgressTask, vscode.TreeItemCollapsibleState.None);
      
      expect((item.iconPath as vscode.ThemeIcon).id).toBe('sync~spin');
    });

    it('should use blocked icon for blocked status', () => {
      const blockedTask = { ...mockTask, status: 'blocked' as const, priority: 'medium' as const };
      const item = new TaskTreeItem(blockedTask, vscode.TreeItemCollapsibleState.None);
      
      expect((item.iconPath as vscode.ThemeIcon).id).toBe('circle-slash');
    });

    it('should use beaker icon for testing status', () => {
      const testingTask = { ...mockTask, status: 'testing' as const, priority: 'medium' as const };
      const item = new TaskTreeItem(testingTask, vscode.TreeItemCollapsibleState.None);
      
      expect((item.iconPath as vscode.ThemeIcon).id).toBe('beaker');
    });
  });

  describe('formatMinutes', () => {
    it('should format minutes less than 60', () => {
      const task = { ...mockTask, estimated_effort: 45 };
      const item = new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;
      
      expect(tooltip).toContain('45m');
    });

    it('should format exact hours', () => {
      const task = { ...mockTask, estimated_effort: 120 };
      const item = new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;
      
      expect(tooltip).toContain('2h (estimated)');
    });

    it('should format hours with minutes', () => {
      const task = { ...mockTask, estimated_effort: 90 };
      const item = new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None);
      const tooltip = item.tooltip as string;
      
      expect(tooltip).toContain('1h 30m');
    });
  });
});

describe('CategoryTreeItem', () => {
  it('should create a category item', () => {
    const item = new CategoryTreeItem(
      'Test Category',
      'test-category',
      vscode.TreeItemCollapsibleState.Expanded,
      'check-all'
    );

    expect(item.label).toBe('Test Category');
    expect(item.id).toBe('category-test-category');
    expect(item.categoryId).toBe('test-category');
    expect(item.contextValue).toBe('category');
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Expanded);
  });

  it('should set icon if provided', () => {
    const item = new CategoryTreeItem(
      'Test',
      'test',
      vscode.TreeItemCollapsibleState.Collapsed,
      'sync~spin'
    );

    expect((item.iconPath as vscode.ThemeIcon).id).toBe('sync~spin');
  });

  it('should work without icon', () => {
    const item = new CategoryTreeItem(
      'Test',
      'test',
      vscode.TreeItemCollapsibleState.Collapsed
    );

    expect(item.iconPath).toBeUndefined();
  });
});
