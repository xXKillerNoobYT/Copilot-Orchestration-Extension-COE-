import { Graph, alg } from 'graphlib';
import { ParsedTask } from './taskParser';

export interface TaskNode {
  id: string;
  task: ParsedTask;
  dependencies: string[];
  dependents: string[]; // tasks that depend on this one
  depth: number; // distance from root nodes (0 for tasks with no dependencies)
  isBlocked: boolean;
  canExecute: boolean; // true if all dependencies are completed
}

export interface TaskGraph {
  graph: Graph;
  nodes: Map<string, TaskNode>;
  rootNodes: string[]; // tasks with no dependencies
  leafNodes: string[]; // tasks with no dependents
  executionOrder: string[][]; // grouped by execution level (parallel execution possible within level)
  cycles: string[][]; // any circular dependencies detected
  orphanedTasks: string[]; // tasks with dependencies that don't exist
}

export interface GraphStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  readyToExecute: number;
  criticalPath: string[]; // longest path from root to leaf
  criticalPathLength: number;
  averageDepth: number;
  maxDepth: number;
}

/**
 * Generates a directed acyclic graph (DAG) from an array of parsed tasks.
 * Validates dependencies, detects cycles, and computes execution order.
 */
export class TaskGraphGenerator {
  private tasks: Map<string, ParsedTask>;
  private graph: Graph;
  
  constructor(tasks: ParsedTask[]) {
    this.tasks = new Map(tasks.map(t => [t.id, t]));
    this.graph = new Graph({ directed: true });
  }

  /**
   * Build the complete task graph with all metadata
   */
  public generateGraph(): TaskGraph {
    // Add all task nodes
    for (const task of this.tasks.values()) {
      this.graph.setNode(task.id, { task });
    }

    // Add dependency edges
    const orphanedTasks: string[] = [];
    for (const task of this.tasks.values()) {
      for (const depId of task.dependencies) {
        if (!this.tasks.has(depId)) {
          orphanedTasks.push(task.id);
          continue;
        }
        // Edge from dependency to dependent (A -> B means B depends on A)
        this.graph.setEdge(depId, task.id);
      }
    }

    // Detect cycles
    const cycles = this.detectCycles();

    // Build task nodes with metadata
    const nodes = this.buildTaskNodes();

    // Find root and leaf nodes
    const rootNodes = this.findRootNodes();
    const leafNodes = this.findLeafNodes();

    // Compute execution order (topological sort grouped by levels)
    const executionOrder = this.computeExecutionOrder();

    return {
      graph: this.graph,
      nodes,
      rootNodes,
      leafNodes,
      executionOrder,
      cycles,
      orphanedTasks,
    };
  }

  /**
   * Detect circular dependencies using Tarjan's algorithm
   */
  private detectCycles(): string[][] {
    if (!alg.isAcyclic(this.graph)) {
      const components = alg.findCycles(this.graph);
      return components;
    }
    return [];
  }

  /**
   * Build enriched task nodes with dependency metadata
   */
  private buildTaskNodes(): Map<string, TaskNode> {
    const nodes = new Map<string, TaskNode>();
    const depths = this.computeDepths();

    for (const task of this.tasks.values()) {
      const dependencies = task.dependencies.filter(depId => this.tasks.has(depId));
      const dependents = this.graph.successors(task.id) || [];
      const depth = depths.get(task.id) || 0;
      
      // Check if task is blocked
      const isBlocked = task.status === 'blocked' || task.status === 'cancelled';
      
      // Check if task can execute (all dependencies completed)
      const canExecute = this.canTaskExecute(task, nodes);

      nodes.set(task.id, {
        id: task.id,
        task,
        dependencies,
        dependents,
        depth,
        isBlocked,
        canExecute,
      });
    }

    return nodes;
  }

  /**
   * Compute depth for each node (distance from root)
   */
  private computeDepths(): Map<string, number> {
    const depths = new Map<string, number>();
    const visited = new Set<string>();

    const visit = (nodeId: string, currentDepth: number) => {
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);
      
      const currentMaxDepth = depths.get(nodeId) || 0;
      depths.set(nodeId, Math.max(currentMaxDepth, currentDepth));
      
      const successors = this.graph.successors(nodeId) || [];
      for (const successor of successors) {
        visit(successor, currentDepth + 1);
      }
    };

    // Start from all root nodes
    const rootNodes = this.findRootNodes();
    for (const rootId of rootNodes) {
      visit(rootId, 0);
    }

    return depths;
  }

  /**
   * Check if a task can execute (all dependencies are completed)
   */
  private canTaskExecute(task: ParsedTask, nodes?: Map<string, TaskNode>): boolean {
    if (task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }

    if (task.status === 'blocked') {
      return false;
    }

    // Check if all dependencies are completed
    for (const depId of task.dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask) {
        // Missing dependency - task is orphaned
        return false;
      }
      
      if (depTask.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Find tasks with no dependencies
   */
  private findRootNodes(): string[] {
    const roots: string[] = [];
    for (const nodeId of this.graph.nodes()) {
      const predecessors = this.graph.predecessors(nodeId) || [];
      if (predecessors.length === 0) {
        roots.push(nodeId);
      }
    }
    return roots;
  }

  /**
   * Find tasks with no dependents
   */
  private findLeafNodes(): string[] {
    const leaves: string[] = [];
    for (const nodeId of this.graph.nodes()) {
      const successors = this.graph.successors(nodeId) || [];
      if (successors.length === 0) {
        leaves.push(nodeId);
      }
    }
    return leaves;
  }

  /**
   * Compute execution order using topological sort, grouped by execution levels
   * Tasks in the same level can be executed in parallel
   */
  private computeExecutionOrder(): string[][] {
    if (!alg.isAcyclic(this.graph)) {
      // Cannot compute topological sort for cyclic graphs
      return [];
    }

    const sorted = alg.topsort(this.graph);
    const depths = this.computeDepths();
    
    // Group by depth level
    const levelMap = new Map<number, string[]>();
    for (const nodeId of sorted) {
      const depth = depths.get(nodeId) || 0;
      if (!levelMap.has(depth)) {
        levelMap.set(depth, []);
      }
      levelMap.get(depth)!.push(nodeId);
    }

    // Convert to array, sorted by depth
    const levels = Array.from(levelMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, nodes]) => nodes);

    return levels;
  }

  /**
   * Get tasks that are ready to execute (all dependencies completed)
   */
  public getReadyTasks(taskGraph: TaskGraph): TaskNode[] {
    const ready: TaskNode[] = [];
    for (const node of taskGraph.nodes.values()) {
      if (node.canExecute && !node.isBlocked) {
        ready.push(node);
      }
    }
    return ready;
  }

  /**
   * Get the critical path (longest path from root to leaf)
   */
  public getCriticalPath(taskGraph: TaskGraph): string[] {
    let longestPath: string[] = [];
    let maxLength = 0;

    for (const leafId of taskGraph.leafNodes) {
      const path = this.getPathFromRoot(leafId, taskGraph);
      if (path.length > maxLength) {
        maxLength = path.length;
        longestPath = path;
      }
    }

    return longestPath;
  }

  /**
   * Get path from root to a specific node
   */
  private getPathFromRoot(nodeId: string, taskGraph: TaskGraph): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    
    const buildPath = (currentId: string): void => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);
      
      path.unshift(currentId);
      
      const predecessors = this.graph.predecessors(currentId) || [];
      if (predecessors.length > 0) {
        // Choose the predecessor with the greatest depth
        let maxDepth = -1;
        let maxPred = '';
        for (const pred of predecessors) {
          const predNode = taskGraph.nodes.get(pred);
          if (predNode && predNode.depth > maxDepth) {
            maxDepth = predNode.depth;
            maxPred = pred;
          }
        }
        if (maxPred) {
          buildPath(maxPred);
        }
      }
    };
    
    buildPath(nodeId);
    return path;
  }

  /**
   * Compute graph statistics
   */
  public getStats(taskGraph: TaskGraph): GraphStats {
    const completedTasks = Array.from(taskGraph.nodes.values()).filter(n => n.task.status === 'completed').length;
    const pendingTasks = Array.from(taskGraph.nodes.values()).filter(n => 
      n.task.status === 'pending' || n.task.status === 'approved'
    ).length;
    const blockedTasks = Array.from(taskGraph.nodes.values()).filter(n => n.isBlocked).length;
    const readyTasks = this.getReadyTasks(taskGraph).length;
    
    const criticalPath = this.getCriticalPath(taskGraph);
    
    const depths = Array.from(taskGraph.nodes.values()).map(n => n.depth);
    const avgDepth = depths.reduce((sum, d) => sum + d, 0) / depths.length;
    const maxDepth = Math.max(...depths, 0);

    return {
      totalTasks: taskGraph.nodes.size,
      completedTasks,
      pendingTasks,
      blockedTasks,
      readyToExecute: readyTasks,
      criticalPath,
      criticalPathLength: criticalPath.length,
      averageDepth: avgDepth,
      maxDepth,
    };
  }

  /**
   * Get all tasks that would be blocked if a specific task fails
   */
  public getImpactedTasks(taskId: string): string[] {
    const impacted: string[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) {
        return;
      }
      visited.add(id);
      
      const successors = this.graph.successors(id) || [];
      for (const successor of successors) {
        if (!visited.has(successor)) {
          impacted.push(successor);
        }
        visit(successor);
      }
    };

    visit(taskId);
    return impacted;
  }

  /**
   * Validate task dependencies
   */
  public validateDependencies(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for cycles
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      errors.push(`Circular dependencies detected in ${cycles.length} cycle(s)`);
      cycles.forEach((cycle, idx) => {
        errors.push(`  Cycle ${idx + 1}: ${cycle.join(' -> ')}`);
      });
    }

    // Check for orphaned tasks
    for (const task of this.tasks.values()) {
      for (const depId of task.dependencies) {
        if (!this.tasks.has(depId)) {
          warnings.push(`Task "${task.id}" depends on non-existent task "${depId}"`);
        }
      }
    }

    // Check for self-dependencies
    for (const task of this.tasks.values()) {
      if (task.dependencies.includes(task.id)) {
        errors.push(`Task "${task.id}" has a self-dependency`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Utility function to generate task graph from tasks
 */
export function generateTaskGraph(tasks: ParsedTask[]): TaskGraph {
  const generator = new TaskGraphGenerator(tasks);
  return generator.generateGraph();
}

/**
 * Utility function to get execution order from tasks
 */
export function getExecutionOrder(tasks: ParsedTask[]): string[][] {
  const graph = generateTaskGraph(tasks);
  return graph.executionOrder;
}

/**
 * Utility function to detect cycles in task dependencies
 */
export function detectCycles(tasks: ParsedTask[]): string[][] {
  const graph = generateTaskGraph(tasks);
  return graph.cycles;
}

/**
 * Utility function to get ready-to-execute tasks
 */
export function getReadyTasks(tasks: ParsedTask[]): ParsedTask[] {
  const generator = new TaskGraphGenerator(tasks);
  const graph = generator.generateGraph();
  const ready = generator.getReadyTasks(graph);
  return ready.map(node => node.task);
}

/**
 * Export a task graph to DOT format for visualization
 */
export function exportToDot(taskGraph: TaskGraph): string {
  const lines: string[] = ['digraph TaskGraph {'];
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box, style=rounded];');
  lines.push('');

  // Add nodes with styling based on status
  for (const node of taskGraph.nodes.values()) {
    const task = node.task;
    const statusColors: Record<string, string> = {
      completed: 'lightgreen',
      in_progress: 'lightblue',
      blocked: 'lightcoral',
      cancelled: 'lightgray',
      pending: 'lightyellow',
      approved: 'lightcyan',
      testing: 'plum',
      review: 'peachpuff',
      failed: 'red',
    };

    const color = statusColors[task.status || 'pending'] || 'white';
    const label = `${task.id}\\n${task.title}\\n[${task.status || 'pending'}]`;
    
    lines.push(`  "${task.id}" [label="${label}", fillcolor="${color}", style="filled,rounded"];`);
  }

  lines.push('');

  // Add edges
  for (const node of taskGraph.nodes.values()) {
    for (const dep of node.dependencies) {
      lines.push(`  "${dep}" -> "${node.id}";`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Export a task graph to Mermaid format for visualization
 */
export function exportToMermaid(taskGraph: TaskGraph): string {
  const lines: string[] = ['graph TD'];
  
  // Add nodes with styling
  for (const node of taskGraph.nodes.values()) {
    const task = node.task;
    const statusClass: Record<string, string> = {
      completed: ':::completed',
      in_progress: ':::inProgress',
      blocked: ':::blocked',
      cancelled: ':::cancelled',
      pending: ':::pending',
    };

    const classStr = statusClass[task.status || 'pending'] || '';
    const label = `${task.id}<br/>${task.title}<br/>[${task.status || 'pending'}]`;
    
    lines.push(`  ${task.id}["${label}"]${classStr}`);
  }

  lines.push('');

  // Add edges
  for (const node of taskGraph.nodes.values()) {
    for (const dep of node.dependencies) {
      lines.push(`  ${dep} --> ${node.id}`);
    }
  }

  lines.push('');
  lines.push('  classDef completed fill:#90EE90,stroke:#333,stroke-width:2px');
  lines.push('  classDef inProgress fill:#ADD8E6,stroke:#333,stroke-width:2px');
  lines.push('  classDef blocked fill:#F08080,stroke:#333,stroke-width:2px');
  lines.push('  classDef cancelled fill:#D3D3D3,stroke:#333,stroke-width:2px');
  lines.push('  classDef pending fill:#FFFFE0,stroke:#333,stroke-width:2px');

  return lines.join('\n');
}
