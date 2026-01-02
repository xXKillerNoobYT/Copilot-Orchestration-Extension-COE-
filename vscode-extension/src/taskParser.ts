import { promises as fs } from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';

export type TaskStatus = 'pending' | 'approved' | 'in_progress' | 'testing' | 'review' | 'completed' | 'failed' | 'blocked' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TaskFrontMatter {
  id?: string;
  title?: string;
  type?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dependencies?: string[];
  assignees?: string[];
  labels?: string[];
  estimate?: string;
  due?: string;
  subtasks?: Array<string | TaskFrontMatter>;
  [key: string]: unknown;
}

export interface ParsedTask {
  id: string;
  title: string;
  description: string;
  type?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dependencies: string[];
  assignees: string[];
  labels: string[];
  estimate?: string;
  due?: string;
  subtasks: ParsedTask[];
  rawFrontMatter: Record<string, unknown>;
  source?: string;
}

function normalizeTaskId(idFromFrontMatter: string | undefined, fileName?: string): string {
  if (idFromFrontMatter && idFromFrontMatter.trim().length > 0) {
    return idFromFrontMatter.trim();
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

    return {
      id: subtaskId,
      title,
      description: typeof subtask.description === 'string' ? subtask.description : '',
      type: subtask.type as string | undefined,
      priority: subtask.priority as TaskPriority | undefined,
      status: subtask.status as TaskStatus | undefined,
      dependencies: Array.isArray(subtask.dependencies) ? subtask.dependencies.filter(Boolean) as string[] : [],
      assignees: Array.isArray(subtask.assignees) ? subtask.assignees.filter(Boolean) as string[] : [],
      labels: Array.isArray(subtask.labels) ? subtask.labels.filter(Boolean) as string[] : [],
      estimate: typeof subtask.estimate === 'string' ? subtask.estimate : undefined,
      due: typeof subtask.due === 'string' ? subtask.due : undefined,
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

  const parsedTask: ParsedTask = {
    id,
    title,
    description: body,
    type: frontMatter.type as string | undefined,
    priority: frontMatter.priority as TaskPriority | undefined,
    status: frontMatter.status as TaskStatus | undefined,
    dependencies: Array.isArray(frontMatter.dependencies) ? (frontMatter.dependencies.filter(Boolean) as string[]) : [],
    assignees: Array.isArray(frontMatter.assignees) ? (frontMatter.assignees.filter(Boolean) as string[]) : [],
    labels: Array.isArray(frontMatter.labels) ? (frontMatter.labels.filter(Boolean) as string[]) : [],
    estimate: typeof frontMatter.estimate === 'string' ? frontMatter.estimate : undefined,
    due: typeof frontMatter.due === 'string' ? frontMatter.due : undefined,
    subtasks: buildSubtasks(frontMatter.subtasks, options?.fileName ?? id),
    rawFrontMatter: frontMatter as Record<string, unknown>,
    source: options?.fileName,
  };

  return parsedTask;
}

export async function parseTasksFromDirectory(directory: string): Promise<ParsedTask[]> {
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
      const parsed = parseTaskMarkdown(content, { fileName: filePath });
      tasks.push(parsed);
    } catch (error) {
      // Surface the error with file context for easier debugging
      throw new Error(`Error parsing task file ${filePath}: ${(error as Error).message}`);
    }
  }

  // Sort by id for deterministic ordering
  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}
