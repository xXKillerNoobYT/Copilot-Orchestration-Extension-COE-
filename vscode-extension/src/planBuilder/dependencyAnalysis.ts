/**
 * Dependency Analysis for Task Decomposition
 * Analyzes task dependencies, detects cycles, and optimizes execution order
 */

import type { GeneratedTask, TaskEstimate } from './taskDecomposition';

export interface DependencyGraph {
  tasks: Map<string, GeneratedTask>;
  adjacencyList: Map<string, string[]>;
  inDegree: Map<string, number>;
}

export interface CriticalPathAnalysis {
  criticalPath: string[];
  duration: number;
  slackTimes: Map<string, number>;
  parallelizable: string[][];
}

export interface CycleDetetion {
  hasCycle: boolean;
  cycle?: string[];
}

/**
 * Build dependency graph from tasks
 */
export function buildDependencyGraph(tasks: GeneratedTask[]): DependencyGraph {
  const graph: DependencyGraph = {
    tasks: new Map(),
    adjacencyList: new Map(),
    inDegree: new Map()
  };

  // Initialize maps
  tasks.forEach(task => {
    graph.tasks.set(task.id, task);
    graph.adjacencyList.set(task.id, []);
    graph.inDegree.set(task.id, 0);
  });

  // Build adjacency list and calculate in-degrees
  tasks.forEach(task => {
    task.dependencies.forEach(dep => {
      const adjacents = graph.adjacencyList.get(dep) || [];
      adjacents.push(task.id);
      graph.adjacencyList.set(dep, adjacents);

      const inDeg = (graph.inDegree.get(task.id) || 0) + 1;
      graph.inDegree.set(task.id, inDeg);
    });
  });

  return graph;
}

/**
 * Detect circular dependencies
 */
export function detectCycles(graph: DependencyGraph): CycleDetetion {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycleDFS(taskId: string, path: string[]): string[] | null {
    visited.add(taskId);
    recursionStack.add(taskId);
    path.push(taskId);

    const adjacents = graph.adjacencyList.get(taskId) || [];
    for (const adjacent of adjacents) {
      if (!visited.has(adjacent)) {
        const cyclePath = hasCycleDFS(adjacent, [...path]);
        if (cyclePath) return cyclePath;
      } else if (recursionStack.has(adjacent)) {
        // Found a cycle
        const cycleStart = path.indexOf(adjacent);
        return path.slice(cycleStart).concat(adjacent);
      }
    }

    recursionStack.delete(taskId);
    return null;
  }

  // Check each task
  for (const taskId of graph.tasks.keys()) {
    if (!visited.has(taskId)) {
      const cycle = hasCycleDFS(taskId, []);
      if (cycle) {
        return {
          hasCycle: true,
          cycle
        };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Get topological sort of tasks
 */
export function topologicalSort(graph: DependencyGraph): string[] {
  const inDegree = new Map(graph.inDegree);
  const queue: string[] = [];
  const result: string[] = [];

  // Find all tasks with no dependencies
  for (const [taskId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    const adjacents = graph.adjacencyList.get(current) || [];
    for (const adjacent of adjacents) {
      const newDegree = (inDegree.get(adjacent) || 1) - 1;
      inDegree.set(adjacent, newDegree);

      if (newDegree === 0) {
        queue.push(adjacent);
      }
    }
  }

  return result;
}

/**
 * Calculate task durations in hours
 */
function getTaskDurationHours(task: GeneratedTask): number {
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

/**
 * Calculate earliest start and finish times (forward pass)
 */
function calculateEarliestTimes(
  graph: DependencyGraph,
  sorted: string[]
): Map<string, { es: number; ef: number }> {
  const times = new Map<string, { es: number; ef: number }>();

  for (const taskId of sorted) {
    const task = graph.tasks.get(taskId)!;
    const duration = getTaskDurationHours(task);

    // ES = max(EF of predecessors)
    let es = 0;
    if (task.dependencies.length > 0) {
      const predecessorTimes = task.dependencies
        .map(dep => times.get(dep))
        .filter(t => t !== undefined) as any[];

      if (predecessorTimes.length > 0) {
        es = Math.max(...predecessorTimes.map(t => t.ef));
      }
    }

    const ef = es + duration;
    times.set(taskId, { es, ef });
  }

  return times;
}

/**
 * Calculate latest start and finish times (backward pass)
 */
function calculateLatestTimes(
  graph: DependencyGraph,
  sorted: string[],
  projectDuration: number
): Map<string, { ls: number; lf: number }> {
  const times = new Map<string, { ls: number; lf: number }>();

  // Process in reverse topological order
  for (let i = sorted.length - 1; i >= 0; i--) {
    const taskId = sorted[i];
    const task = graph.tasks.get(taskId)!;
    const duration = getTaskDurationHours(task);

    // Find successors
    const successors: string[] = [];
    for (const [otherId, adjacents] of graph.adjacencyList.entries()) {
      if (adjacents.includes(taskId)) {
        successors.push(otherId);
      }
    }

    // LF = min(LS of successors)
    let lf = projectDuration;
    if (successors.length > 0) {
      const successorTimes = successors
        .map(succ => times.get(succ))
        .filter(t => t !== undefined) as any[];

      if (successorTimes.length > 0) {
        lf = Math.min(...successorTimes.map(t => t.ls));
      }
    }

    const ls = lf - duration;
    times.set(taskId, { ls, lf });
  }

  return times;
}

/**
 * Calculate slack time for each task
 */
export function calculateSlackTimes(
  graph: DependencyGraph,
  sorted: string[]
): Map<string, number> {
  const earliest = calculateEarliestTimes(graph, sorted);
  const projectDuration = Math.max(
    ...[...earliest.values()].map(t => t.ef)
  );
  const latest = calculateLatestTimes(graph, sorted, projectDuration);

  const slackTimes = new Map<string, number>();

  for (const taskId of graph.tasks.keys()) {
    const earlyTime = earliest.get(taskId);
    const lateTime = latest.get(taskId);

    if (earlyTime && lateTime) {
      const slack = lateTime.ls - earlyTime.es;
      slackTimes.set(taskId, slack);
    }
  }

  return slackTimes;
}

/**
 * Find critical path using slack times
 */
export function findCriticalPath(graph: DependencyGraph): string[] {
  const sorted = topologicalSort(graph);
  const slackTimes = calculateSlackTimes(graph, sorted);

  const criticalPath: string[] = [];

  for (const [taskId, slack] of slackTimes.entries()) {
    if (slack === 0) {
      criticalPath.push(taskId);
    }
  }

  // Sort by topological order
  return criticalPath.sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
}

/**
 * Identify parallelizable task groups
 */
export function findParallelizableGroups(
  graph: DependencyGraph
): string[][] {
  const sorted = topologicalSort(graph);
  const levels: Map<number, string[]> = new Map();

  // Calculate level for each task (based on longest dependency chain)
  const levels_calc = new Map<string, number>();

  for (const taskId of sorted) {
    const task = graph.tasks.get(taskId)!;

    if (task.dependencies.length === 0) {
      levels_calc.set(taskId, 0);
    } else {
      const maxDepLevel = Math.max(
        ...task.dependencies.map(dep => levels_calc.get(dep) || 0)
      );
      levels_calc.set(taskId, maxDepLevel + 1);
    }
  }

  // Group by level
  for (const [taskId, level] of levels_calc.entries()) {
    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level)!.push(taskId);
  }

  // Return sorted by level
  const result: string[][] = [];
  for (let i = 0; i < Math.max(...levels_calc.values()) + 1; i++) {
    if (levels.has(i)) {
      result.push(levels.get(i)!);
    }
  }

  return result;
}

/**
 * Calculate project metrics
 */
export interface ProjectMetrics {
  totalDurationHours: number;
  totalDurationDays: number;
  criticalPathLength: number;
  parallelizableLevels: number;
  resourceUtilization: number;
}

export function calculateProjectMetrics(graph: DependencyGraph): ProjectMetrics {
  const sorted = topologicalSort(graph);
  const earliest = calculateEarliestTimes(graph, sorted);
  const parallelLevels = findParallelizableGroups(graph);

  let totalDurationHours = 0;
  for (const time of earliest.values()) {
    totalDurationHours = Math.max(totalDurationHours, time.ef);
  }

  let totalTaskHours = 0;
  for (const task of graph.tasks.values()) {
    totalTaskHours += getTaskDurationHours(task);
  }

  const resourceUtilization = totalTaskHours > 0
    ? (totalDurationHours / totalTaskHours) * 100
    : 0;

  return {
    totalDurationHours,
    totalDurationDays: Math.ceil(totalDurationHours / 8),
    criticalPathLength: findCriticalPath(graph).length,
    parallelizableLevels: parallelLevels.length,
    resourceUtilization: Math.round(resourceUtilization * 100) / 100
  };
}

/**
 * Generate dependency summary report
 */
export function generateDependencySummary(tasks: GeneratedTask[]): string {
  const graph = buildDependencyGraph(tasks);
  const cycleCheck = detectCycles(graph);
  const metrics = calculateProjectMetrics(graph);
  const criticalPath = findCriticalPath(graph);
  const parallelGroups = findParallelizableGroups(graph);

  let report = '# Dependency Analysis Report\n\n';

  if (cycleCheck.hasCycle) {
    report += `⚠️ **CIRCULAR DEPENDENCY DETECTED**: ${cycleCheck.cycle?.join(' → ')}\n\n`;
  }

  report += '## Project Metrics\n';
  report += `- Total Duration: ${metrics.totalDurationDays} days (${metrics.totalDurationHours} hours)\n`;
  report += `- Critical Path Length: ${metrics.criticalPathLength} tasks\n`;
  report += `- Parallelizable Levels: ${metrics.parallelizableLevels}\n`;
  report += `- Resource Utilization: ${metrics.resourceUtilization}%\n\n`;

  report += '## Critical Path\n';
  for (const taskId of criticalPath) {
    const task = graph.tasks.get(taskId);
    if (task) {
      report += `- ${task.title} (${task.estimate.value} ${task.estimate.unit})\n`;
    }
  }

  report += '\n## Parallelizable Task Groups\n';
  for (let i = 0; i < parallelGroups.length; i++) {
    report += `\n### Phase ${i + 1}\n`;
    for (const taskId of parallelGroups[i]) {
      const task = graph.tasks.get(taskId);
      if (task) {
        report += `- ${task.title}\n`;
      }
    }
  }

  return report;
}
