/**
 * Task Tree Item
 * Enhanced tree item for displaying tasks with metadata, priority indicators, and actions
 */

import * as vscode from 'vscode';
import { Task } from '../services/taskService';

export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: Task,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(task.name, collapsibleState);

    this.id = task.id;
    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.iconPath = this.getIcon();
    this.contextValue = 'task';
    
    // Set command to view task details
    this.command = {
      command: 'copilot-orchestrator.viewTaskDetails',
      title: 'View Task Details',
      arguments: [task],
    };
  }

  /**
   * Build detailed tooltip with task information
   */
  private buildTooltip(): string {
    const lines: string[] = [];
    
    lines.push(`**${this.task.name}**`);
    lines.push('');
    
    if (this.task.description) {
      lines.push(`${this.task.description.substring(0, 200)}${this.task.description.length > 200 ? '...' : ''}`);
      lines.push('');
    }
    
    lines.push(`**Status:** ${this.formatStatus(this.task.status)}`);
    lines.push(`**Priority:** ${this.formatPriority(this.task.priority)}`);
    lines.push(`**Type:** ${this.formatTaskType(this.task.task_type)}`);
    
    if (this.task.estimated_effort) {
      const estimated = this.formatMinutes(this.task.estimated_effort);
      const actual = this.task.actual_effort ? this.formatMinutes(this.task.actual_effort) : 'N/A';
      lines.push(`**Effort:** ${estimated} (estimated) / ${actual} (actual)`);
    }
    
    if (this.task.dependencyCount && this.task.dependencyCount > 0) {
      lines.push(`**Dependencies:** ${this.task.dependencyCount}`);
    }
    
    if (this.task.subtaskCount && this.task.subtaskCount > 0) {
      lines.push(`**Subtasks:** ${this.task.subtaskCount}`);
    }
    
    if (this.task.assigned_agent) {
      lines.push(`**Assigned Agent:** ${this.task.assigned_agent}`);
    }
    
    if (this.task.github_issue_url) {
      lines.push(`**GitHub Issue:** ${this.task.github_issue_url}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Build description line (shown next to label)
   */
  private buildDescription(): string {
    const parts: string[] = [];
    
    // Show effort if available
    if (this.task.estimated_effort) {
      const hours = Math.round(this.task.estimated_effort / 60 * 10) / 10;
      parts.push(`${hours}h`);
    }
    
    // Show dependency count
    if (this.task.dependencyCount && this.task.dependencyCount > 0) {
      parts.push(`${this.task.dependencyCount} deps`);
    }
    
    // Show subtask count
    if (this.task.subtaskCount && this.task.subtaskCount > 0) {
      parts.push(`${this.task.subtaskCount} subtasks`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Get icon based on priority and status
   */
  private getIcon(): vscode.ThemeIcon {
    // Priority-based icons
    if (this.task.priority === 'critical') {
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    }
    if (this.task.priority === 'high') {
      return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
    }
    
    // Status-based icons
    switch (this.task.status) {
      case 'completed':
        return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
      case 'in_progress':
        return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.blue'));
      case 'blocked':
        return new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('errorForeground'));
      case 'testing':
      case 'review':
        return new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.purple'));
      case 'failed':
        return new vscode.ThemeIcon('x', new vscode.ThemeColor('errorForeground'));
      case 'pending':
      case 'approved':
      default:
        return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('foreground'));
    }
  }

  /**
   * Format status for display
   */
  private formatStatus(status: string): string {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format priority for display
   */
  private formatPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      'critical': '🔴 Critical',
      'high': '🟠 High',
      'medium': '🟡 Medium',
      'low': '🟢 Low',
    };
    return priorityMap[priority] || priority;
  }

  /**
   * Format task type for display
   */
  private formatTaskType(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format minutes to human-readable duration
   */
  private formatMinutes(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Category Tree Item (for top-level categories)
 */
export class CategoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly categoryId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly iconId?: string
  ) {
    super(label, collapsibleState);

    this.id = `category-${categoryId}`;
    this.contextValue = 'category';
    
    if (iconId) {
      this.iconPath = new vscode.ThemeIcon(iconId);
    }
  }
}
