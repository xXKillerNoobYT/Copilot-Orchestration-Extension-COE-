import { GeneratedTask } from './taskDecomposition';

/**
 * priorityAssignment.ts
 * Assigns task priorities using critical path analysis
 * - Critical path tasks → high priority
 * - Tasks blocking critical path → high priority
 * - Parallel tasks → medium priority
 * - Polish/documentation → low priority
 */

export interface PriorityAssignmentResult {
  tasks: GeneratedTask[];
  criticalPath: string[];
  priorityReasons: Map<string, string>;
  warnings: string[];
}

export class PriorityAssignmentEngine {
  /**
   * Assign priorities to tasks based on critical path analysis
   */
  assignPriorities(
    tasks: GeneratedTask[],
    criticalPath: string[]
  ): PriorityAssignmentResult {
    const warnings: string[] = [];
    const priorityReasons = new Map<string, string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const criticalPathSet = new Set(criticalPath);

    // Calculate priority for each task
    const updatedTasks = tasks.map(task => {
      const { priority, reason } = this.calculatePriority(
        task,
        criticalPathSet,
        taskMap,
        tasks
      );

      priorityReasons.set(task.id, reason);

      return {
        ...task,
        priority,
      };
    });

    return {
      tasks: updatedTasks,
      criticalPath,
      priorityReasons,
      warnings,
    };
  }

  /**
   * Calculate priority for a single task
   */
  private calculatePriority(
    task: GeneratedTask,
    criticalPathSet: Set<string>,
    taskMap: Map<string, GeneratedTask>,
    allTasks: GeneratedTask[]
  ): { priority: 'critical' | 'high' | 'medium' | 'low'; reason: string } {
    // Priority 1: Task is on critical path
    if (criticalPathSet.has(task.id)) {
      return {
        priority: 'critical',
        reason: 'On critical path (longest dependency chain)',
      };
    }

    // Priority 2: Task blocks critical path tasks
    const blocksCriticalPath = this.blocksCriticalPath(task, criticalPathSet, allTasks);
    if (blocksCriticalPath) {
      return {
        priority: 'high',
        reason: 'Blocks critical path task(s)',
      };
    }

    // Priority 3: Infrastructure/setup tasks
    if (this.isInfrastructureTask(task)) {
      return {
        priority: 'high',
        reason: 'Infrastructure task required by many features',
      };
    }

    // Priority 4: Testing tasks inherit priority from implementation
    if (this.isTestingTask(task)) {
      const implPriority = this.getImplementationPriority(task, taskMap);
      if (implPriority === 'critical' || implPriority === 'high') {
        return {
          priority: implPriority,
          reason: `Testing for ${implPriority} priority implementation`,
        };
      }
      return {
        priority: 'medium',
        reason: 'Testing task (medium by default)',
      };
    }

    // Priority 5: Documentation tasks
    if (this.isDocumentationTask(task)) {
      return {
        priority: 'low',
        reason: 'Documentation task (can be completed later)',
      };
    }

    // Priority 6: Tasks with many dependents
    const dependentCount = this.countDependents(task.id, allTasks);
    if (dependentCount >= 3) {
      return {
        priority: 'high',
        reason: `Has ${dependentCount} dependent tasks`,
      };
    }

    // Priority 7: Feature tasks inherit from plan
    if (task.priority === 'critical') {
      return {
        priority: 'critical',
        reason: 'Marked as critical in project plan',
      };
    }
    if (task.priority === 'high') {
      return {
        priority: 'high',
        reason: 'Marked as high priority in project plan',
      };
    }

    // Default: medium priority
    return {
      priority: 'medium',
      reason: 'Standard feature task',
    };
  }

  /**
   * Check if task blocks any critical path tasks
   */
  private blocksCriticalPath(
    task: GeneratedTask,
    criticalPathSet: Set<string>,
    allTasks: GeneratedTask[]
  ): boolean {
    return allTasks.some(
      otherTask =>
        criticalPathSet.has(otherTask.id) &&
        otherTask.dependencies.includes(task.id)
    );
  }

  /**
   * Check if task is infrastructure/setup type
   */
  private isInfrastructureTask(task: GeneratedTask): boolean {
    const infraKeywords = /setup|infrastructure|architecture|init|config|project setup/i;
    return (
      infraKeywords.test(task.title) ||
      infraKeywords.test(task.description) ||
      task.type === 'architecture'
    );
  }

  /**
   * Check if task is a testing task
   */
  private isTestingTask(task: GeneratedTask): boolean {
    const testKeywords = /test|testing|qa|validation|verify/i;
    return (
      testKeywords.test(task.title) ||
      task.type === 'testing'
    );
  }

  /**
   * Check if task is documentation
   */
  private isDocumentationTask(task: GeneratedTask): boolean {
    const docKeywords = /document|documentation|docs|readme/i;
    return (
      docKeywords.test(task.title) ||
      task.type === 'documentation'
    );
  }

  /**
   * Get priority of implementation task that this testing task depends on
   */
  private getImplementationPriority(
    testTask: GeneratedTask,
    taskMap: Map<string, GeneratedTask>
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Find implementation task dependency
    const implTask = testTask.dependencies
      .map(depId => taskMap.get(depId))
      .find(dep => dep && !this.isTestingTask(dep) && !this.isDocumentationTask(dep));

    return implTask?.priority || 'medium';
  }

  /**
   * Count how many tasks depend on this task
   */
  private countDependents(taskId: string, allTasks: GeneratedTask[]): number {
    return allTasks.filter(task => task.dependencies.includes(taskId)).length;
  }

  /**
   * Propagate priorities through dependency chains
   * If a high priority task depends on a lower priority task, elevate the dependency
   */
  propagatePriorities(tasks: GeneratedTask[]): GeneratedTask[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const updated = new Map(tasks.map(t => [t.id, { ...t }]));
    
    const priorityValue = (p: string): number => {
      switch (p) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    };

    const valueToPriority = (v: number): 'critical' | 'high' | 'medium' | 'low' => {
      if (v >= 4) return 'critical';
      if (v >= 3) return 'high';
      if (v >= 2) return 'medium';
      return 'low';
    };

    // Iterate until no more propagation happens
    let changed = true;
    let iterations = 0;
    const maxIterations = tasks.length; // Prevent infinite loops

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      tasks.forEach(task => {
        const currentPriority = updated.get(task.id)!.priority;
        const currentValue = priorityValue(currentPriority);

        // Check all dependencies
        task.dependencies.forEach(depId => {
          const dep = updated.get(depId);
          if (!dep) return;

          const depValue = priorityValue(dep.priority);

          // If task priority is higher than dependency, elevate dependency
          // But only by one level maximum to avoid over-escalation
          if (currentValue > depValue) {
            const newValue = Math.min(currentValue, depValue + 1);
            const newPriority = valueToPriority(newValue);

            if (newPriority !== dep.priority) {
              updated.set(depId, {
                ...dep,
                priority: newPriority,
              });
              changed = true;
            }
          }
        });
      });
    }

    return Array.from(updated.values());
  }

  /**
   * Get tasks grouped by priority
   */
  groupByPriority(tasks: GeneratedTask[]): Map<string, GeneratedTask[]> {
    const grouped = new Map<string, GeneratedTask[]>();
    
    ['critical', 'high', 'medium', 'low'].forEach(priority => {
      grouped.set(priority, []);
    });

    tasks.forEach(task => {
      const group = grouped.get(task.priority) || [];
      group.push(task);
      grouped.set(task.priority, group);
    });

    return grouped;
  }

  /**
   * Get execution order respecting both dependencies and priorities
   */
  getExecutionOrder(tasks: GeneratedTask[]): GeneratedTask[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const priorityValue = (p: string): number => {
      switch (p) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    };

    // Topological sort with priority as tiebreaker
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    tasks.forEach(task => {
      inDegree.set(task.id, 0);
      adjList.set(task.id, []);
    });

    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        if (taskMap.has(depId)) {
          adjList.get(depId)?.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      });
    });

    // Queue with zero in-degree, sorted by priority
    const queue: string[] = [];
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) queue.push(taskId);
    });

    // Sort queue by priority (higher priority first)
    queue.sort((a, b) => {
      const taskA = taskMap.get(a);
      const taskB = taskMap.get(b);
      if (!taskA || !taskB) return 0;
      return priorityValue(taskB.priority) - priorityValue(taskA.priority);
    });

    const sorted: GeneratedTask[] = [];

    while (queue.length > 0) {
      // Always take highest priority task from queue
      queue.sort((a, b) => {
        const taskA = taskMap.get(a);
        const taskB = taskMap.get(b);
        if (!taskA || !taskB) return 0;
        return priorityValue(taskB.priority) - priorityValue(taskA.priority);
      });

      const taskId = queue.shift()!;
      const task = taskMap.get(taskId);
      if (task) sorted.push(task);

      const neighbors = adjList.get(taskId) || [];
      neighbors.forEach(neighborId => {
        inDegree.set(neighborId, (inDegree.get(neighborId) || 0) - 1);
        if (inDegree.get(neighborId) === 0) {
          queue.push(neighborId);
        }
      });
    }

    return sorted;
  }
}
