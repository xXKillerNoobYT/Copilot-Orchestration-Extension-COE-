/**
 * Basic Task Routing Algorithm (F038)
 *
 * Implements simple rules-based routing for task assignment to agent teams.
 * Acceptance criteria (PRD F038):
 * - Routes by estimated hours (>1hr → Decomposition)
 * - Routes by status (done → Verification)
 * - Routes questions to Answer Team
 * - Default route to Planning Team
 * - 100% of test tasks routed correctly
 */

export enum AgentTeam {
  Planning = 'Planning',
  Answer = 'Answer',
  Decomposition = 'Decomposition',
  Verification = 'Verification',
}

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'testing'
  | 'done'
  | 'complete';

export interface Task {
  id?: string;
  title?: string;
  description?: string;
  status?: TaskStatus | string;
  estimatedHours?: number; // hours estimate; routes to Decomposition if > 1
  type?: 'question' | 'feature' | 'bug' | 'chore';
  requiresContext?: boolean; // true when additional context gathering is needed
  hasOpenQuestions?: boolean; // true when unresolved questions exist
}

/**
 * Route a task to the appropriate agent team based on simple rules.
 */
export function routeTask(task: Task): AgentTeam {
  const status = (task.status ?? '').toLowerCase();

  // Status-based routing: done/complete → Verification
  if (status === 'done' || status === 'complete') {
    return AgentTeam.Verification;
  }

  // Estimated hours routing: > 1 hr → Decomposition
  if (typeof task.estimatedHours === 'number' && task.estimatedHours > 1) {
    return AgentTeam.Decomposition;
  }

  // Question/context routing: questions or context requirements → Answer
  const isQuestion = task.type === 'question';
  if (isQuestion || task.requiresContext || task.hasOpenQuestions) {
    return AgentTeam.Answer;
  }

  // Default routing → Planning
  return AgentTeam.Planning;
}

/**
 * Convenience helper to batch-route multiple tasks.
 */
export function routeTasks(tasks: Task[]): AgentTeam[] {
  return tasks.map(routeTask);
}
