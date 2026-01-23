import { parse as parseYaml } from 'yaml';
import { ParsedTask, TaskFrontMatter, isValidTaskStatus, isValidTaskPriority, isValidTaskType, isValidAgentType } from './taskParser';

/**
 * TaskStatusParser: Extracts and parses YAML front matter from .task.md files
 * Handles inline status display, metadata extraction, and validation
 */
export class TaskStatusParser {
  /**
   * Parse a .task.md file and extract metadata
   * Returns structured task data with validation results
   */
  parseTaskFile(filePath: string, content: string): { task: ParsedTask | null; errors: string[] } {
    const errors: string[] = [];

    try {
      // Extract YAML front matter
      const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
      if (!frontMatterMatch) {
        errors.push('No YAML front matter found');
        return { task: null, errors };
      }

      const frontMatterText = frontMatterMatch[1];
      let frontMatter: TaskFrontMatter = {};

      try {
        frontMatter = parseYaml(frontMatterText) as TaskFrontMatter;
      } catch (yamlError: unknown) {
        errors.push(`Invalid YAML: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`);
        return { task: null, errors };
      }

      // Extract body content (everything after front matter)
      const bodyContent = content.substring(frontMatterMatch[0].length).trim();

      // Build ParsedTask object
      const task: ParsedTask = {
        id: frontMatter.id || this.extractIdFromPath(filePath),
        title: frontMatter.title || this.extractTitleFromBody(bodyContent),
        description: bodyContent,
        type: frontMatter.type,
        priority: frontMatter.priority,
        status: frontMatter.status,
        dependencies: Array.isArray(frontMatter.dependencies) ? frontMatter.dependencies : [],
        assignees: Array.isArray(frontMatter.assignees) 
          ? frontMatter.assignees.filter(isValidAgentType)
          : [],
        labels: Array.isArray(frontMatter.labels) ? frontMatter.labels : [],
        estimate: frontMatter.estimate as string | undefined,
        due: frontMatter.due as string | undefined,
        subtasks: [],
        github_issue_id: frontMatter.github_issue_id as number | undefined,
        github_issue_url: frontMatter.github_issue_url as string | undefined,
        context_bundle: frontMatter.context_bundle as string | undefined,
        format_version: frontMatter.format_version as string | undefined,
        rawFrontMatter: frontMatter,
        source: filePath,
      };

      // Validate fields
      this.validateTaskFields(task, errors);

      // Parse subtasks if present
      if (Array.isArray(frontMatter.subtasks)) {
        task.subtasks = this.parseSubtasks(frontMatter.subtasks);
      }

      return { task, errors: errors.length > 0 ? errors : [] };
    } catch (error: unknown) {
      errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      return { task: null, errors };
    }
  }

  /**
   * Build inline status display text
   * Shows task status, priority, and estimated effort
   */
  buildStatusDisplay(task: ParsedTask): string {
    const parts: string[] = [];

    // Status
    if (task.status) {
      const statusLabel = this.formatStatus(task.status);
      parts.push(`Status: ${statusLabel}`);
    }

    // Priority
    if (task.priority) {
      const priorityLabel = this.formatPriority(task.priority);
      parts.push(`Priority: ${priorityLabel}`);
    }

    // Estimate
    if (task.estimate) {
      parts.push(`Est: ${task.estimate}`);
    }

    // Dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      parts.push(`Dependencies: ${task.dependencies.length}`);
    }

    return parts.join(' • ');
  }

  /**
   * Get human-readable status label with emoji
   */
  formatStatus(status: string): string {
    const statusEmojis: Record<string, string> = {
      pending: '⏳ Pending',
      approved: '✅ Approved',
      in_progress: '🔄 In Progress',
      testing: '🧪 Testing',
      review: '💬 Review',
      completed: '✔️ Completed',
      failed: '❌ Failed',
      blocked: '🚫 Blocked',
      cancelled: '❌ Cancelled',
    };
    return statusEmojis[status] || `? ${status}`;
  }

  /**
   * Get human-readable priority label
   */
  formatPriority(priority: string): string {
    const priorityLabels: Record<string, string> = {
      critical: '🔴 Critical',
      high: '🟠 High',
      medium: '🟡 Medium',
      low: '🟢 Low',
    };
    return priorityLabels[priority] || `? ${priority}`;
  }

  /**
   * Get estimated time as human-readable duration
   */
  formatEstimate(estimate?: string): string {
    if (!estimate) return '';
    // If already human-readable (e.g., "2h", "3d"), return as-is
    if (/^\d+[hmd]$|^\d+\.\d+[hmd]$/.test(estimate.toLowerCase())) {
      return estimate;
    }
    // If numeric (minutes), convert
    const minutes = parseInt(estimate, 10);
    if (!isNaN(minutes)) {
      if (minutes >= 480) return `${(minutes / 480).toFixed(1)}d`;
      if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
      return `${minutes}m`;
    }
    return estimate;
  }

  /**
   * Extract task ID from filename (e.g., TASK-001-auth.md -> TASK-001)
   */
  private extractIdFromPath(filePath: string): string {
    const match = filePath.match(/TASK-[A-Za-z0-9]+-[a-z0-9]+\.md/);
    if (match) {
      return match[0].replace('.md', '').split('-').slice(0, 2).join('-');
    }
    return `TASK-${Date.now()}`;
  }

  /**
   * Extract first non-empty line from body as fallback title
   */
  private extractTitleFromBody(body: string): string {
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        return trimmed.substring(0, 80);
      }
    }
    return 'Untitled Task';
  }

  /**
   * Validate task fields and collect errors
   */
  private validateTaskFields(task: ParsedTask, errors: string[]): void {
    if (!task.title || task.title.trim().length === 0) {
      errors.push('Task title is required');
    }

    if (task.type && !isValidTaskType(task.type)) {
      errors.push(`Invalid task type: ${task.type}`);
    }

    if (task.priority && !isValidTaskPriority(task.priority)) {
      errors.push(`Invalid priority: ${task.priority}`);
    }

    if (task.status && !isValidTaskStatus(task.status)) {
      errors.push(`Invalid status: ${task.status}`);
    }

    if (task.dependencies.length > 0) {
      for (const dep of task.dependencies) {
        if (typeof dep !== 'string') {
          errors.push(`Invalid dependency format: ${dep}`);
        }
      }
    }
  }

  /**
   * Parse subtasks from front matter array
   */
  private parseSubtasks(subtasksData: unknown[]): ParsedTask[] {
    const subtasks: ParsedTask[] = [];

    for (const item of subtasksData) {
      if (typeof item === 'string') {
        subtasks.push({
          id: item,
          title: item,
          description: '',
          dependencies: [],
          assignees: [],
          labels: [],
          subtasks: [],
          rawFrontMatter: {},
        });
      } else if (typeof item === 'object' && item !== null) {
        const subData = item as Record<string, unknown>;
        subtasks.push({
          id: (subData.id as string) || '',
          title: (subData.title as string) || '',
          description: (subData.description as string) || '',
          type: subData.type as any,
          priority: subData.priority as any,
          status: subData.status as any,
          dependencies: Array.isArray(subData.dependencies) ? subData.dependencies : [],
          assignees: [],
          labels: [],
          subtasks: [],
          rawFrontMatter: subData,
        });
      }
    }

    return subtasks;
  }
}
