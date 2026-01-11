/**
 * Plan Diff Computation
 * Compares current plan with wizard-generated plan to show changes
 */

export interface PlanDiffResult {
  added: DiffItem[];
  removed: DiffItem[];
  modified: DiffItem[];
  unchanged: DiffItem[];
  summary: DiffSummary;
}

export interface DiffItem {
  type: 'task' | 'milestone' | 'dependency' | 'requirement';
  id: string;
  title: string;
  oldValue?: any;
  newValue?: any;
  changes?: string[];
}

export interface DiffSummary {
  totalChanges: number;
  tasksAdded: number;
  tasksRemoved: number;
  tasksModified: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedTimeChange: number; // in hours
}

export interface Plan {
  tasks: Task[];
  milestones?: Milestone[];
  dependencies?: Dependency[];
  requirements?: string[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  estimate?: number;
  dependencies?: string[];
}

interface Milestone {
  id: string;
  name: string;
  targetDate?: string;
  tasks: string[];
}

interface Dependency {
  from: string;
  to: string;
  type: 'hard' | 'soft';
}

/**
 * Compute diff between old and new plan
 */
export function computePlanDiff(oldPlan: Plan, newPlan: Plan): PlanDiffResult {
  const result: PlanDiffResult = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
    summary: {
      totalChanges: 0,
      tasksAdded: 0,
      tasksRemoved: 0,
      tasksModified: 0,
      impactLevel: 'low',
      estimatedTimeChange: 0,
    },
  };

  // Create maps for quick lookup
  const oldTasksMap = new Map(oldPlan.tasks.map(t => [t.id, t]));
  const newTasksMap = new Map(newPlan.tasks.map(t => [t.id, t]));

  // Find added tasks
  for (const newTask of newPlan.tasks) {
    if (!oldTasksMap.has(newTask.id)) {
      result.added.push({
        type: 'task',
        id: newTask.id,
        title: newTask.title,
        newValue: newTask,
      });
      result.summary.tasksAdded++;
      result.summary.estimatedTimeChange += newTask.estimate || 0;
    }
  }

  // Find removed tasks
  for (const oldTask of oldPlan.tasks) {
    if (!newTasksMap.has(oldTask.id)) {
      result.removed.push({
        type: 'task',
        id: oldTask.id,
        title: oldTask.title,
        oldValue: oldTask,
      });
      result.summary.tasksRemoved++;
      result.summary.estimatedTimeChange -= oldTask.estimate || 0;
    }
  }

  // Find modified tasks
  for (const newTask of newPlan.tasks) {
    const oldTask = oldTasksMap.get(newTask.id);
    if (oldTask) {
      const changes = detectTaskChanges(oldTask, newTask);
      if (changes.length > 0) {
        result.modified.push({
          type: 'task',
          id: newTask.id,
          title: newTask.title,
          oldValue: oldTask,
          newValue: newTask,
          changes,
        });
        result.summary.tasksModified++;
        
        // Calculate time delta
        const oldEstimate = oldTask.estimate || 0;
        const newEstimate = newTask.estimate || 0;
        result.summary.estimatedTimeChange += (newEstimate - oldEstimate);
      } else {
        result.unchanged.push({
          type: 'task',
          id: newTask.id,
          title: newTask.title,
          newValue: newTask,
        });
      }
    }
  }

  // Calculate total changes and impact level
  result.summary.totalChanges = 
    result.summary.tasksAdded + 
    result.summary.tasksRemoved + 
    result.summary.tasksModified;

  result.summary.impactLevel = calculateImpactLevel(result.summary);

  return result;
}

/**
 * Detect changes between two tasks
 */
function detectTaskChanges(oldTask: Task, newTask: Task): string[] {
  const changes: string[] = [];

  if (oldTask.title !== newTask.title) {
    changes.push(`Title changed from "${oldTask.title}" to "${newTask.title}"`);
  }

  if (oldTask.description !== newTask.description) {
    changes.push('Description updated');
  }

  if (oldTask.priority !== newTask.priority) {
    changes.push(`Priority changed from ${oldTask.priority} to ${newTask.priority}`);
  }

  if (oldTask.estimate !== newTask.estimate) {
    changes.push(`Estimate changed from ${oldTask.estimate}h to ${newTask.estimate}h`);
  }

  // Check dependencies
  const oldDeps = new Set(oldTask.dependencies || []);
  const newDeps = new Set(newTask.dependencies || []);
  
  const addedDeps = [...newDeps].filter(d => !oldDeps.has(d));
  const removedDeps = [...oldDeps].filter(d => !newDeps.has(d));

  if (addedDeps.length > 0) {
    changes.push(`Dependencies added: ${addedDeps.join(', ')}`);
  }

  if (removedDeps.length > 0) {
    changes.push(`Dependencies removed: ${removedDeps.join(', ')}`);
  }

  return changes;
}

/**
 * Calculate impact level based on changes
 */
function calculateImpactLevel(summary: DiffSummary): 'low' | 'medium' | 'high' | 'critical' {
  const changeRatio = summary.totalChanges;
  const timeChange = Math.abs(summary.estimatedTimeChange);

  if (summary.tasksRemoved > 10 || timeChange > 80) {
    return 'critical';
  }

  if (summary.totalChanges > 20 || timeChange > 40) {
    return 'high';
  }

  if (summary.totalChanges > 5 || timeChange > 10) {
    return 'medium';
  }

  return 'low';
}

/**
 * Format diff result as human-readable string
 */
export function formatDiffSummary(diff: PlanDiffResult): string {
  const { summary } = diff;
  
  let output = `## Plan Changes Summary\n\n`;
  output += `**Impact Level**: ${summary.impactLevel.toUpperCase()}\n`;
  output += `**Total Changes**: ${summary.totalChanges}\n\n`;

  if (summary.tasksAdded > 0) {
    output += `### ✅ Tasks Added (${summary.tasksAdded})\n`;
    diff.added.forEach(item => {
      output += `- ${item.title}\n`;
    });
    output += '\n';
  }

  if (summary.tasksRemoved > 0) {
    output += `### ❌ Tasks Removed (${summary.tasksRemoved})\n`;
    diff.removed.forEach(item => {
      output += `- ${item.title}\n`;
    });
    output += '\n';
  }

  if (summary.tasksModified > 0) {
    output += `### 📝 Tasks Modified (${summary.tasksModified})\n`;
    diff.modified.forEach(item => {
      output += `- ${item.title}\n`;
      if (item.changes) {
        item.changes.forEach(change => {
          output += `  - ${change}\n`;
        });
      }
    });
    output += '\n';
  }

  const timeChangeSign = summary.estimatedTimeChange >= 0 ? '+' : '';
  output += `**Estimated Time Change**: ${timeChangeSign}${summary.estimatedTimeChange} hours\n`;

  return output;
}
