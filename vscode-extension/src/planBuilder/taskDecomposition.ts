/**
 * Task decomposition engine for Plan Builder
 * Generates granular tasks from completed project plan
 */

import { openaiClient } from '../llm/openaiClient';
import type { Message } from '../transport/transport';

export interface TaskEstimate {
  value: number;
  unit: 'hours' | 'days' | 'weeks';
}

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  taskType: 'feature' | 'bug' | 'refactor' | 'maintenance' | 'architecture' | 'testing' | 'documentation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimate: TaskEstimate;
  dependencies: string[];
  status: 'pending';
}

export interface DecompositionResult {
  tasks: GeneratedTask[];
  criticalPath: string[];
  milestones: Array<{
    name: string;
    targetDate: string;
    tasks: string[];
  }>;
  riskFactors: string[];
  recommendations: string[];
}

/**
 * Decompose a completed project plan into granular tasks
 */
export async function decomposeProjectPlan(
  wizardState: Record<string, unknown>,
  architectureSuggestions?: any
): Promise<DecompositionResult> {
  try {
    // Build the decomposition prompt
    const prompt = buildDecompositionPrompt(wizardState, architectureSuggestions);

    // Call LLM
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are an expert project manager. Decompose project plans into detailed, actionable tasks with dependencies, estimates, and priorities.
Output ONLY valid JSON in the exact format specified. No additional text or markdown.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await Promise.race([
      openaiClient.chat(messages),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('LLM request timeout')), 60000)
      )
    ]);

    // Parse the response
    const result = parseDecompositionResult(response);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to decompose project plan: ${message}`);
  }
}

/**
 * Build decomposition prompt from wizard state
 */
function buildDecompositionPrompt(wizardState: Record<string, unknown>, suggestions?: any): string {
  const features = extractFeatures(wizardState);
  const integrations = wizardState['project_integrations'] as string[] | undefined || [];
  const teamSize = wizardState['team_size'] as number | undefined || 3;
  const timeline = wizardState['project_timeline'] as string | undefined || 'standard';

  return `Decompose this project plan into implementation tasks:

PROJECT DETAILS:
- Type: ${wizardState['project_category']}
- Tech Stack: ${wizardState['project_tech_stack']}
- Features: ${features.join(', ')}
- Integrations: ${integrations.join(', ')}
- Team Size: ${teamSize} people
- Timeline: ${timeline}
${suggestions ? `\nARCHITECTURE SUGGESTIONS:\n${JSON.stringify(suggestions)}` : ''}

RETURN THIS EXACT JSON STRUCTURE (no markdown, no extra text):
{
  "tasks": [
    {
      "id": "unique-task-id",
      "title": "Task title",
      "description": "Detailed description",
      "taskType": "feature|bug|refactor|maintenance|architecture|testing|documentation",
      "priority": "critical|high|medium|low",
      "estimate": {"value": 8, "unit": "hours|days|weeks"},
      "dependencies": ["id-of-dependent-task"]
    }
  ],
  "criticalPath": ["task-id-1", "task-id-2"],
  "milestones": [
    {"name": "MVP", "targetDate": "2026-02-15", "tasks": ["task-id-1"]}
  ],
  "riskFactors": ["risk 1", "risk 2"],
  "recommendations": ["rec 1", "rec 2"]
}`;
}

/**
 * Extract features from wizard state
 */
function extractFeatures(wizardState: Record<string, unknown>): string[] {
  const features: string[] = [];

  // Extract from various wizard pages
  if (wizardState['project_features']) {
    features.push(...(wizardState['project_features'] as string[]));
  }

  if (wizardState['project_integrations']) {
    features.push(...(wizardState['project_integrations'] as string[]));
  }

  return features;
}

/**
 * Parse LLM response into structured task list
 */
function parseDecompositionResult(response: string): DecompositionResult {
  try {
    // Extract JSON from response
    let jsonStr = response;

    // Handle markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else if (response.startsWith('{')) {
      jsonStr = response;
    } else {
      const startIdx = response.indexOf('{');
      const endIdx = response.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = response.substring(startIdx, endIdx + 1);
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and transform
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error('Invalid response: missing tasks array');
    }

    // Generate task IDs if missing
    const tasks: GeneratedTask[] = parsed.tasks.map((task: any, index: number) => ({
      id: task.id || `task-${Date.now()}-${index}`,
      title: task.title,
      description: task.description,
      taskType: task.taskType || 'feature',
      priority: task.priority || 'medium',
      estimate: task.estimate || { value: 1, unit: 'days' },
      dependencies: task.dependencies || [],
      status: 'pending'
    }));

    return {
      tasks,
      criticalPath: parsed.criticalPath || [],
      milestones: parsed.milestones || [],
      riskFactors: parsed.riskFactors || [],
      recommendations: parsed.recommendations || []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new Error(`Failed to parse task decomposition: ${message}`);
  }
}

/**
 * Generate YAML frontmatter for task file
 */
export function generateTaskYAML(task: GeneratedTask): string {
  const estimateHours = convertToHours(task.estimate);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + Math.ceil(estimateHours / 8));

  return `---
id: "${task.id}"
title: "${task.title.replace(/"/g, '\\"')}"
description: "${task.description.replace(/"/g, '\\"')}"
task_type: ${task.taskType}
priority: ${task.priority}
status: ${task.status}
estimate_hours: ${estimateHours}
due_date: "${dueDate.toISOString().split('T')[0]}"
dependencies: [${task.dependencies.map(d => `"${d}"`).join(', ')}]
created_at: "${new Date().toISOString()}"
---

## Description

${task.description}

## Acceptance Criteria

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Deployed to staging

## Implementation Notes

_Add notes during implementation_
`;
}

/**
 * Convert estimate to hours
 */
function convertToHours(estimate: TaskEstimate): number {
  switch (estimate.unit) {
    case 'hours':
      return estimate.value;
    case 'days':
      return estimate.value * 8;
    case 'weeks':
      return estimate.value * 40;
    default:
      return estimate.value;
  }
}

/**
 * Calculate critical path
 */
export function calculateCriticalPath(tasks: GeneratedTask[]): string[] {
  // Build dependency graph
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  tasks.forEach(task => {
    graph.set(task.id, task.dependencies);
    inDegree.set(task.id, task.dependencies.length);
  });

  // Topological sort to find critical path
  const queue: string[] = [];
  const distances = new Map<string, number>();

  // Find all tasks with no dependencies
  tasks.forEach(task => {
    if (task.dependencies.length === 0) {
      queue.push(task.id);
      distances.set(task.id, getTaskDuration(tasks, task.id));
    }
  });

  // Process queue (DAG traversal)
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDistance = distances.get(current) || 0;

    // Find dependents
    tasks.forEach(task => {
      if (task.dependencies.includes(current)) {
        const taskDistance = currentDistance + getTaskDuration(tasks, task.id);
        const existingDistance = distances.get(task.id) || 0;

        if (taskDistance > existingDistance) {
          distances.set(task.id, taskDistance);
        }

        task.dependencies.forEach(dep => {
          inDegree.set(dep, (inDegree.get(dep) || 1) - 1);
        });
      }
    });
  }

  // Return tasks sorted by distance (critical path)
  return Array.from(distances.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
}

/**
 * Get task duration in hours
 */
function getTaskDuration(tasks: GeneratedTask[], taskId: string): number {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return 0;

  switch (task.estimate.unit) {
    case 'hours':
      return task.estimate.value;
    case 'days':
      return task.estimate.value * 8;
    case 'weeks':
      return task.estimate.value * 40;
    default:
      return task.estimate.value;
  }
}
