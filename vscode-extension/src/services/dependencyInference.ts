import { GeneratedTask } from './taskDecomposition';

/**
 * dependencyInference.ts
 * Automatically infers task dependencies based on:
 * - Feature relationships
 * - Technical constraints (database → API → UI)
 * - Logical sequencing (impl → test → doc)
 * - Circular dependency detection with topological sort
 */

export interface DependencyRule {
  pattern: RegExp | string;
  mustComeAfter: RegExp | string;
  reason: string;
}

export interface DependencyInferenceResult {
  tasks: GeneratedTask[];
  inferredDependencies: Map<string, string[]>;
  topologicalOrder: string[];
  cycles: string[][];
  warnings: string[];
}

export class DependencyInferenceEngine {
  private implicitRules: DependencyRule[] = [
    // Database comes before API
    {
      pattern: /api|endpoint|rest/i,
      mustComeAfter: /database|schema|migration/i,
      reason: 'API endpoints require database schema',
    },
    // API comes before UI
    {
      pattern: /ui|component|interface|frontend/i,
      mustComeAfter: /api|endpoint|backend/i,
      reason: 'UI components consume API endpoints',
    },
    // Implementation before testing
    {
      pattern: /test|testing|qa/i,
      mustComeAfter: /implement|feature|create/i,
      reason: 'Testing requires implementation to be complete',
    },
    // Implementation/testing before documentation
    {
      pattern: /document|documentation|docs/i,
      mustComeAfter: /implement|test/i,
      reason: 'Documentation describes implemented features',
    },
    // Infrastructure before features
    {
      pattern: /feature|implement/i,
      mustComeAfter: /setup|infrastructure|architecture/i,
      reason: 'Features require project infrastructure',
    },
  ];

  constructor(options?: { additionalRules?: DependencyRule[] }) {
    if (options?.additionalRules) {
      this.implicitRules.push(...options.additionalRules);
    }
  }

  /**
   * Infer dependencies for all tasks and return topological order
   */
  infer(tasks: GeneratedTask[]): DependencyInferenceResult {
    const warnings: string[] = [];
    const inferredDependencies = new Map<string, string[]>();

    // Step 1: Apply implicit rules
    this.applyImplicitRules(tasks, inferredDependencies, warnings);

    // Step 2: Detect cycles
    const { cycles, acyclicDeps } = this.detectCycles(tasks, inferredDependencies);

    // Step 3: Topological sort (using acyclic dependencies)
    const topologicalOrder = this.topologicalSort(tasks, acyclicDeps);

    // Step 4: Update tasks with inferred dependencies (avoiding cycles)
    const updatedTasks = this.updateTaskDependencies(tasks, acyclicDeps);

    return {
      tasks: updatedTasks,
      inferredDependencies: acyclicDeps,
      topologicalOrder,
      cycles,
      warnings,
    };
  }

  /**
   * Apply implicit dependency rules based on task names and descriptions
   */
  private applyImplicitRules(
    tasks: GeneratedTask[],
    inferredDeps: Map<string, string[]>,
    warnings: string[]
  ): void {
    tasks.forEach(task => {
      const taskDeps = new Set(task.dependencies);
      const taskText = `${task.title} ${task.description}`.toLowerCase();

      // Check each rule
      this.implicitRules.forEach(rule => {
        const patternMatch = this.matchesPattern(taskText, rule.pattern);
        
        if (patternMatch) {
          // Find tasks that match the "mustComeAfter" pattern
          const prerequisiteTasks = tasks.filter(otherTask => {
            if (otherTask.id === task.id) return false;
            const otherText = `${otherTask.title} ${otherTask.description}`.toLowerCase();
            return this.matchesPattern(otherText, rule.mustComeAfter);
          });

          prerequisiteTasks.forEach(prereq => {
            if (!taskDeps.has(prereq.id)) {
              taskDeps.add(prereq.id);
              warnings.push(
                `Inferred dependency: ${task.title} → ${prereq.title} (${rule.reason})`
              );
            }
          });
        }
      });

      inferredDeps.set(task.id, Array.from(taskDeps));
    });
  }

  /**
   * Check if text matches a pattern (string or regex)
   */
  private matchesPattern(text: string, pattern: RegExp | string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(text);
    }
    return text.includes(pattern.toLowerCase());
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCycles(
    tasks: GeneratedTask[],
    inferredDeps: Map<string, string[]>
  ): { cycles: string[][]; acyclicDeps: Map<string, string[]> } {
    const cycles: string[][] = [];
    const acyclicDeps = new Map(inferredDeps);
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const dfs = (taskId: string, path: string[]): void => {
      if (recursionStack.has(taskId)) {
        // Cycle detected
        const cycleStart = path.indexOf(taskId);
        const cycle = path.slice(cycleStart).concat(taskId);
        cycles.push(cycle);
        
        // Remove the back edge to break cycle
        const lastTask = path[path.length - 1];
        const deps = acyclicDeps.get(lastTask) || [];
        acyclicDeps.set(
          lastTask,
          deps.filter(d => d !== taskId)
        );
        return;
      }

      if (visited.has(taskId)) return;

      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const deps = inferredDeps.get(taskId) || [];
      deps.forEach(depId => {
        if (taskMap.has(depId)) {
          dfs(depId, [...path]);
        }
      });

      recursionStack.delete(taskId);
    };

    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        dfs(task.id, []);
      }
    });

    return { cycles, acyclicDeps };
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(
    tasks: GeneratedTask[],
    dependencies: Map<string, string[]>
  ): string[] {
    const sorted: string[] = [];
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    tasks.forEach(task => {
      inDegree.set(task.id, 0);
      adjList.set(task.id, []);
    });

    // Build adjacency list and in-degree count
    tasks.forEach(task => {
      const deps = dependencies.get(task.id) || [];
      deps.forEach(depId => {
        adjList.get(depId)?.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      });
    });

    // Queue with zero in-degree
    const queue: string[] = [];
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) queue.push(taskId);
    });

    // Process queue
    while (queue.length > 0) {
      const taskId = queue.shift()!;
      sorted.push(taskId);

      const neighbors = adjList.get(taskId) || [];
      neighbors.forEach(neighborId => {
        inDegree.set(neighborId, (inDegree.get(neighborId) || 0) - 1);
        if (inDegree.get(neighborId) === 0) {
          queue.push(neighborId);
        }
      });
    }

    // If sorted length < tasks length, there's a cycle (shouldn't happen after cycle detection)
    if (sorted.length < tasks.length) {
      const missing = tasks.filter(t => !sorted.includes(t.id));
      console.warn('Topological sort incomplete, missing tasks:', missing.map(t => t.id));
    }

    return sorted;
  }

  /**
   * Update task dependencies with inferred dependencies (avoiding cycles)
   */
  private updateTaskDependencies(
    tasks: GeneratedTask[],
    acyclicDeps: Map<string, string[]>
  ): GeneratedTask[] {
    return tasks.map(task => ({
      ...task,
      dependencies: Array.from(new Set([
        ...task.dependencies,
        ...(acyclicDeps.get(task.id) || []),
      ])),
    }));
  }

  /**
   * Validate that all dependencies reference valid tasks
   */
  validateDependencies(tasks: GeneratedTask[]): string[] {
    const errors: string[] = [];
    const taskIds = new Set(tasks.map(t => t.id));

    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        if (!taskIds.has(depId)) {
          errors.push(
            `Task "${task.title}" (${task.id}) depends on non-existent task: ${depId}`
          );
        }
      });
    });

    return errors;
  }

  /**
   * Get critical path (longest path through DAG)
   */
  getCriticalPath(tasks: GeneratedTask[]): string[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();

    // Initialize distances
    tasks.forEach(task => {
      distances.set(task.id, task.estimatedHours || 0);
      predecessors.set(task.id, null);
    });

    // Topological sort first
    const sorted = this.topologicalSort(tasks, new Map(tasks.map(t => [t.id, t.dependencies])));

    // Calculate longest path
    sorted.forEach(taskId => {
      const task = taskMap.get(taskId);
      if (!task) return;

      const currentDist = distances.get(taskId) || 0;

      task.dependencies.forEach(depId => {
        const depDist = (distances.get(depId) || 0) + currentDist;
        if (depDist > (distances.get(taskId) || 0)) {
          distances.set(taskId, depDist);
          predecessors.set(taskId, depId);
        }
      });
    });

    // Find task with maximum distance
    let maxDist = 0;
    let endTask = '';
    distances.forEach((dist, taskId) => {
      if (dist > maxDist) {
        maxDist = dist;
        endTask = taskId;
      }
    });

    // Reconstruct critical path
    const path: string[] = [];
    let current: string | null = endTask;
    while (current) {
      path.unshift(current);
      current = predecessors.get(current) || null;
    }

    return path;
  }
}
