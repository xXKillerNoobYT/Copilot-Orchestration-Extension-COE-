import { promises as fs } from 'fs';
import * as path from 'path';
import { defaultAgentProfileLoader, AgentProfile, AgentProfileLoader } from './agentProfiles';
import { parseTasksFromDirectory, ParsedTask } from './taskParser';

export type MemoryRole = 'user' | 'assistant' | 'system';

export interface MemoryEntry {
  role: MemoryRole;
  content: string;
  timestamp?: string;
}

export interface ContextFile {
  path: string;
  content: string;
  truncated?: boolean;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PromptPayload {
  taskId: string;
  agent: Pick<AgentProfile, 'name' | 'role' | 'instructions' | 'tool_permissions' | 'execution_constraints' | 'prompt_templates' | 'defaults'>;
  task: ParsedTask;
  context: {
    files: ContextFile[];
  };
  memory: MemoryEntry[];
  messages: PromptMessage[];
  metadata?: Record<string, unknown>;
}

export interface ComposeOptions {
  agentName?: string;
  tasksDir?: string;
  contextFiles?: string[];
  memory?: MemoryEntry[];
  extraInstructions?: string;
  workspaceRoot?: string;
  maxContextBytes?: number;
}

const DEFAULT_MAX_CONTEXT_BYTES = 32_000; // pragmatic limit for context ingestion

async function loadTaskById(taskId: string, tasksDir: string): Promise<ParsedTask | null> {
  const tasks = await parseTasksFromDirectory(tasksDir, { validateSchema: true, failOnInvalid: false });
  return tasks.find((t) => t.id === taskId) ?? null;
}

async function loadContextFiles(filePaths: string[], maxBytes: number): Promise<ContextFile[]> {
  const results: ContextFile[] = [];
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const truncated = Buffer.byteLength(content, 'utf-8') > maxBytes;
      results.push({
        path: filePath,
        content: truncated ? content.slice(0, maxBytes) : content,
        truncated,
      });
    } catch (error) {
      // Skip unreadable files but note path
      results.push({ path: filePath, content: `<<unreadable: ${(error as Error).message}>>`, truncated: true });
    }
  }
  return results;
}

function buildSystemPrompt(agent: AgentProfile, extraInstructions?: string): string {
  const base = agent.prompt_templates?.system || agent.instructions || '';
  const additions = [extraInstructions].filter(Boolean).join('\n');
  return [base, additions].filter(Boolean).join('\n\n').trim();
}

function buildUserPrompt(task: ParsedTask, context: ContextFile[], memory: MemoryEntry[], agent: AgentProfile): string {
  const contextSummary = context.map((c) => `- ${path.basename(c.path)}${c.truncated ? ' (truncated)' : ''}`).join('\n');
  const memorySummary = memory.slice(-5).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const template = agent.prompt_templates?.plan || agent.prompt_templates?.planning || '{{task}}';

  const renderedTemplate = template
    .replace('{{task}}', task.description || task.title)
    .replace('{{taskId}}', task.id)
    .replace('{{title}}', task.title)
    .replace('{{status}}', task.status || '')
    .replace('{{priority}}', task.priority || '')
    .replace('{{dependencies}}', task.dependencies?.join(', ') || 'none');

  const details = [
    `Task ID: ${task.id}`,
    `Title: ${task.title}`,
    task.status ? `Status: ${task.status}` : null,
    task.priority ? `Priority: ${task.priority}` : null,
    task.dependencies?.length ? `Dependencies: ${task.dependencies.join(', ')}` : 'Dependencies: none',
    task.assignees?.length ? `Assignees: ${task.assignees.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const sections = [
    '### Task\n' + details,
    '### Description\n' + (task.description || '(no description)'),
    context.length ? '### Context Files\n' + contextSummary : null,
    memory.length ? '### Recent Memory\n' + memorySummary : null,
    '### Template\n' + renderedTemplate,
  ].filter(Boolean);

  return sections.join('\n\n');
}

export class CopilotDispatcher {
  private readonly agentLoader: AgentProfileLoader;
  private readonly tasksDir: string;
  private readonly workspaceRoot: string;

  constructor(options?: { agentLoader?: AgentProfileLoader; tasksDir?: string; workspaceRoot?: string }) {
    this.agentLoader = options?.agentLoader ?? defaultAgentProfileLoader;
    this.workspaceRoot = options?.workspaceRoot ?? path.resolve(__dirname, '..');
    this.tasksDir = options?.tasksDir ?? path.resolve(this.workspaceRoot, '_ZENTASKS');
  }

  async composePrompt(taskId: string, options?: ComposeOptions): Promise<PromptPayload> {
    const tasksDir = options?.tasksDir ?? this.tasksDir;
    const agentName = options?.agentName ?? 'coder';
    const maxContextBytes = options?.maxContextBytes ?? DEFAULT_MAX_CONTEXT_BYTES;

    const agent = await this.requireAgent(agentName);
    const task = await this.requireTask(taskId, tasksDir);
    const contextFiles = options?.contextFiles ? await loadContextFiles(options.contextFiles, maxContextBytes) : [];
    const memory = options?.memory ?? [];

    const systemPrompt = buildSystemPrompt(agent, options?.extraInstructions);
    const userPrompt = buildUserPrompt(task, contextFiles, memory, agent);

    const messages: PromptMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    return {
      taskId,
      agent: {
        name: agent.name,
        role: agent.role,
        instructions: agent.instructions,
        tool_permissions: agent.tool_permissions,
        execution_constraints: agent.execution_constraints,
        prompt_templates: agent.prompt_templates,
        defaults: agent.defaults,
      },
      task,
      context: { files: contextFiles },
      memory,
      messages,
      metadata: {
        workspaceRoot: this.workspaceRoot,
        tasksDir,
        contextFileCount: contextFiles.length,
        memoryCount: memory.length,
      },
    };
  }

  private async requireAgent(agentName: string): Promise<AgentProfile> {
    const profile = await this.agentLoader.loadProfile(agentName);
    if (!profile) {
      throw new Error(`Agent profile not found for '${agentName}'. Ensure a matching YAML/JSON exists in config/agents.`);
    }
    return profile;
  }

  private async requireTask(taskId: string, tasksDir: string): Promise<ParsedTask> {
    const task = await loadTaskById(taskId, tasksDir);
    if (!task) {
      throw new Error(`Task '${taskId}' not found in ${tasksDir}`);
    }
    return task;
  }
}

// Convenience factory
export const defaultCopilotDispatcher = new CopilotDispatcher();
