import { promises as fs } from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';

// Aligned with backend database schema (app/Models/Task.php)
export type TaskStatus = 'pending' | 'approved' | 'in_progress' | 'testing' | 'review' | 'completed' | 'failed' | 'blocked' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskType = 'feature' | 'bug' | 'refactor' | 'maintenance' | 'architecture' | 'testing' | 'documentation';

// Valid agent types from backend (app/Models/Agent.php)
export type AgentType = 'planner' | 'architect' | 'coder' | 'tester' | 'reviewer' | 'documentation' | 'deployment' | 'maintenance';

export interface TaskFrontMatter {
  id?: string;
  title?: string;
  type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  dependencies?: string[];
  assignees?: AgentType[];
  labels?: string[];
  estimate?: string;
  due?: string;
  subtasks?: Array<string | TaskFrontMatter>;
  github_issue_id?: number;
  github_issue_url?: string;
  context_bundle?: string;
  format_version?: string;
  [key: string]: unknown;
}

export interface ParsedTask {
  id: string;
  title: string;
  description: string;
  type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  dependencies: string[];
  assignees: AgentType[];
  labels: string[];
  estimate?: string;
  due?: string;
  subtasks: ParsedTask[];
  github_issue_id?: number;
  github_issue_url?: string;
  context_bundle?: string;
  format_version?: string;
  rawFrontMatter: Record<string, unknown>;
  source?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ValidationError {
  file: string;
  line?: number;
  field: string;
  message: string;
  suggestion?: string;
  severity: 'error' | 'warning';
}

export interface ParserOptions {
  fileName?: string;
  validateSchema?: boolean;
  failOnInvalid?: boolean;
  normalizeEffort?: boolean;
}

export interface ParseResult {
  task: ParsedTask | null;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Validation functions
export function isValidTaskType(value: unknown): value is TaskType {
  return typeof value === 'string' &&
    ['feature', 'bug', 'refactor', 'maintenance', 'architecture', 'testing', 'documentation'].includes(value);
}

export function isValidTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' &&
    ['critical', 'high', 'medium', 'low'].includes(value);
}

export function isValidTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' &&
    ['pending', 'approved', 'in_progress', 'testing', 'review', 'completed', 'failed', 'blocked', 'cancelled'].includes(value);
}

export function isValidAgentType(value: unknown): value is AgentType {
  return typeof value === 'string' &&
    ['planner', 'architect', 'coder', 'tester', 'reviewer', 'documentation', 'deployment', 'maintenance'].includes(value);
}

// Effort normalization: converts human-readable estimates to minutes
export function normalizeEffort(estimate: string): number {
  const trimmed = estimate.trim().toLowerCase();

  // Numeric only (assume minutes)
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  let totalMinutes = 0;

  // Parse composite format: "2h 30m", "3d", "1w", etc.
  const patterns = [
    { regex: /(\d+(?:\.\d+)?)\s*w(?:eeks?)?/g, multiplier: 2400 },  // 5 days × 8 hours × 60 min
    { regex: /(\d+(?:\.\d+)?)\s*d(?:ays?)?/g, multiplier: 480 },    // 8 hours × 60 min
    { regex: /(\d+(?:\.\d+)?)\s*h(?:ours?)?/g, multiplier: 60 },
    { regex: /(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/g, multiplier: 1 },
  ];

  for (const { regex, multiplier } of patterns) {
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      totalMinutes += parseFloat(match[1]) * multiplier;
    }
  }

  return totalMinutes > 0 ? Math.round(totalMinutes) : 0;
}

function validateTask(task: ParsedTask, options: ParserOptions): ValidationError[] {
  const errors: ValidationError[] = [];
  const fileName = options.fileName || task.source || 'unknown';

  // Required field validation
  if (!task.title || task.title.trim().length === 0) {
    errors.push({
      file: fileName,
      field: 'title',
      message: 'Task title is required and cannot be empty',
      severity: 'error',
    });
  }

  // Type validation
  if (task.type && !isValidTaskType(task.type)) {
    errors.push({
      file: fileName,
      field: 'type',
      message: `Invalid task type: "${task.type}"`,
      suggestion: 'Must be one of: feature, bug, refactor, maintenance, architecture, testing, documentation',
      severity: 'error',
    });
  }

  // Priority validation
  if (task.priority && !isValidTaskPriority(task.priority)) {
    errors.push({
      file: fileName,
      field: 'priority',
      message: `Invalid priority: "${task.priority}"`,
      suggestion: 'Must be one of: critical, high, medium, low',
      severity: 'error',
    });
  }

  // Status validation
  if (task.status && !isValidTaskStatus(task.status)) {
    errors.push({
      file: fileName,
      field: 'status',
      message: `Invalid status: "${task.status}"`,
      suggestion: 'Must be one of: pending, approved, in_progress, testing, review, completed, failed, blocked, cancelled',
      severity: 'error',
    });
  }

  // Assignees validation
  if (task.assignees.length > 0) {
    const invalidAssignees = task.assignees.filter(a => !isValidAgentType(a));
    if (invalidAssignees.length > 0) {
      errors.push({
        file: fileName,
        field: 'assignees',
        message: `Invalid agent types: ${invalidAssignees.join(', ')}`,
        suggestion: 'Must be one of: planner, architect, coder, tester, reviewer, documentation, deployment, maintenance',
        severity: 'error',
      });
    }
  }

  // Effort validation
  if (options.normalizeEffort && task.estimate) {
    const normalized = normalizeEffort(task.estimate);
    if (normalized === 0) {
      errors.push({
        file: fileName,
        field: 'estimate',
        message: `Could not parse effort estimate: "${task.estimate}"`,
        suggestion: 'Use format like "2h", "30m", "3d", "1w", or numeric minutes',
        severity: 'warning',
      });
    }
  }

  // GitHub integration validation
  if (task.github_issue_id && task.github_issue_id <= 0) {
    errors.push({
      file: fileName,
      field: 'github_issue_id',
      message: 'GitHub issue ID must be a positive integer',
      severity: 'warning',
    });
  }

  if (task.github_issue_url && !task.github_issue_url.startsWith('http')) {
    errors.push({
      file: fileName,
      field: 'github_issue_url',
      message: 'GitHub issue URL must be a valid HTTP(S) URL',
      severity: 'warning',
    });
  }

  return errors;
}

function normalizeTaskId(idFromFrontMatter: string | number | undefined, fileName?: string): string {
  // Handle both string and number IDs (GitHub issues use numeric IDs)
  if (idFromFrontMatter !== undefined && idFromFrontMatter !== null) {
    const idString = String(idFromFrontMatter).trim();
    if (idString.length > 0) {
      return idString;
    }
  }

  if (fileName) {
    return path.basename(fileName).replace(path.extname(fileName), '');
  }

  throw new Error('Task is missing an id');
}

function normalizeTitle(titleFromFrontMatter: string | undefined, fallbackId: string): string {
  if (titleFromFrontMatter && titleFromFrontMatter.trim().length > 0) {
    return titleFromFrontMatter.trim();
  }
  return fallbackId;
}

function normalizeGitHubState(state: unknown): TaskStatus | undefined {
  if (typeof state === 'string') {
    const normalized = state.toLowerCase();
    if (normalized === 'open') return 'pending';
    if (normalized === 'closed') return 'completed';
  }
  return undefined;
}

function normalizeGitHubAssignees(assignees: unknown): string[] {
  if (!Array.isArray(assignees)) return [];
  return assignees
    .filter((a): a is { login: string } => typeof a === 'object' && a !== null && typeof (a as any).login === 'string')
    .map(a => a.login);
}

function buildSubtasks(subtasks: TaskFrontMatter['subtasks'], parentSource?: string): ParsedTask[] {
  if (!subtasks || subtasks.length === 0) {
    return [];
  }

  return subtasks.map((subtask, index) => {
    if (typeof subtask === 'string') {
      return {
        id: subtask,
        title: subtask,
        description: '',
        dependencies: [],
        assignees: [],
        labels: [],
        subtasks: [],
        rawFrontMatter: { id: subtask, title: subtask },
        source: parentSource ? `${parentSource}#subtask-${index}` : undefined,
      } satisfies ParsedTask;
    }

    const subtaskId = normalizeTaskId(subtask.id, parentSource ? `${parentSource}#${index}` : undefined);
    const title = normalizeTitle(subtask.title, subtaskId);

    // Extract and validate type
    const type = subtask.type && isValidTaskType(subtask.type) ? subtask.type : undefined;

    // Extract and validate assignees
    const assignees: AgentType[] = Array.isArray(subtask.assignees)
      ? subtask.assignees.filter((a): a is AgentType => typeof a === 'string' && isValidAgentType(a))
      : [];

    return {
      id: subtaskId,
      title,
      description: typeof subtask.description === 'string' ? subtask.description : '',
      type,
      priority: subtask.priority,
      status: subtask.status,
      dependencies: Array.isArray(subtask.dependencies) ? subtask.dependencies.filter(Boolean) as string[] : [],
      assignees,
      labels: Array.isArray(subtask.labels) ? subtask.labels.filter(Boolean) as string[] : [],
      estimate: typeof subtask.estimate === 'string' ? subtask.estimate : undefined,
      due: typeof subtask.due === 'string' ? subtask.due : undefined,
      github_issue_id: typeof subtask.github_issue_id === 'number' ? subtask.github_issue_id : undefined,
      github_issue_url: typeof subtask.github_issue_url === 'string' ? subtask.github_issue_url : undefined,
      context_bundle: typeof subtask.context_bundle === 'string' ? subtask.context_bundle : undefined,
      format_version: typeof subtask.format_version === 'string' ? subtask.format_version : undefined,
      subtasks: buildSubtasks(subtask.subtasks, parentSource ? `${parentSource}#${subtaskId}` : subtaskId),
      rawFrontMatter: subtask as Record<string, unknown>,
      source: parentSource ? `${parentSource}#${subtaskId}` : undefined,
    } satisfies ParsedTask;
  });
}

export function parseTaskMarkdown(markdown: string, options?: { fileName?: string }): ParsedTask {
  const frontMatterRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*/;
  const match = markdown.match(frontMatterRegex);

  let frontMatter: TaskFrontMatter = {};
  let body = markdown.trim();

  if (match) {
    try {
      frontMatter = (parseYaml(match[1]) as TaskFrontMatter) ?? {};
    } catch (error) {
      throw new Error(`Failed to parse YAML front matter: ${(error as Error).message}`);
    }
    body = markdown.slice(match[0].length).trim();
  }

  const id = normalizeTaskId(frontMatter.id, options?.fileName);
  const title = normalizeTitle(frontMatter.title, id);

  // Handle GitHub issue format: 'number' field maps to github_issue_id
  const githubIssueId = typeof frontMatter.github_issue_id === 'number'
    ? frontMatter.github_issue_id
    : (typeof (frontMatter as any).number === 'number' ? (frontMatter as any).number : undefined);

  // Handle GitHub issue format: 'state' field maps to status
  const status = frontMatter.status
    ? frontMatter.status
    : normalizeGitHubState((frontMatter as any).state);

  // Extract and validate type
  const type = frontMatter.type && isValidTaskType(frontMatter.type) ? frontMatter.type : undefined;

  // Handle GitHub issue format: assignees can be objects with 'login' property
  const githubAssigneeLogins = normalizeGitHubAssignees(frontMatter.assignees);
  const assignees: AgentType[] = Array.isArray(frontMatter.assignees) && typeof frontMatter.assignees[0] === 'string'
    ? frontMatter.assignees.filter((a): a is AgentType => typeof a === 'string' && isValidAgentType(a))
    : githubAssigneeLogins.filter((login): login is AgentType => isValidAgentType(login));

  const parsedTask: ParsedTask = {
    id,
    title,
    description: body,
    type,
    priority: frontMatter.priority,
    status,
    dependencies: Array.isArray(frontMatter.dependencies) ? (frontMatter.dependencies.filter(Boolean) as string[]) : [],
    assignees,
    labels: Array.isArray(frontMatter.labels) ? (frontMatter.labels.filter(Boolean) as string[]) : [],
    estimate: typeof frontMatter.estimate === 'string' ? frontMatter.estimate : undefined,
    due: typeof frontMatter.due === 'string' ? frontMatter.due : undefined,
    github_issue_id: githubIssueId,
    github_issue_url: typeof frontMatter.github_issue_url === 'string' ? frontMatter.github_issue_url : undefined,
    context_bundle: typeof frontMatter.context_bundle === 'string' ? frontMatter.context_bundle : undefined,
    format_version: typeof frontMatter.format_version === 'string' ? frontMatter.format_version : undefined,
    subtasks: buildSubtasks(frontMatter.subtasks, options?.fileName ?? id),
    rawFrontMatter: frontMatter as Record<string, unknown>,
    source: options?.fileName,
  };

  return parsedTask;
}

// Enhanced parser with validation support
export function parseTaskFile(markdown: string, options: ParserOptions = {}): ParseResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    const task = parseTaskMarkdown(markdown, options);

    // Perform validation if requested
    if (options.validateSchema) {
      const validationErrors = validateTask(task, options);

      validationErrors.forEach(err => {
        if (err.severity === 'error') {
          errors.push(err);
        } else {
          warnings.push(err);
        }
      });

      // Fail fast if requested and errors found
      if (options.failOnInvalid && errors.length > 0) {
        return { task: null, errors, warnings };
      }
    }

    return { task, errors, warnings };
  } catch (error) {
    errors.push({
      file: options.fileName || 'unknown',
      field: 'parse',
      message: (error as Error).message,
      severity: 'error',
    });

    return { task: null, errors, warnings };
  }
}

export async function parseTasksFromDirectory(directory: string, options: ParserOptions = {}): Promise<ParsedTask[]> {
  const dirExists = await fs.stat(directory).then(() => true).catch(() => false);
  if (!dirExists) {
    return [];
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const tasks: ParsedTask[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!['.md', '.markdown'].includes(ext)) {
      continue;
    }

    const filePath = path.join(directory, entry.name);
    const content = await fs.readFile(filePath, 'utf-8');

    try {
      const result = parseTaskFile(content, { ...options, fileName: filePath });

      if (result.task) {
        tasks.push(result.task);
      }

      // Validation errors/warnings are now silent in production
      // Uncomment for debugging:
      // if (result.errors.length > 0 || result.warnings.length > 0) {
      //   console.warn(`Validation issues in ${filePath}:`);
      //   result.errors.forEach(err => console.error(`  ERROR: ${err.field}: ${err.message}`));
      //   result.warnings.forEach(warn => console.warn(`  WARNING: ${warn.field}: ${warn.message}`));
      // }
    } catch (error) {
      // Surface the error with file context for easier debugging
      throw new Error(`Error parsing task file ${filePath}: ${(error as Error).message}`);
    }
  }

  // Sort by id for deterministic ordering
  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}
