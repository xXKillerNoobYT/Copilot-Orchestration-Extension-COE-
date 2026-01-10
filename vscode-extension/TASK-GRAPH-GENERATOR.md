# Task Graph Generator

A powerful utility module for parsing structured task files and generating dependency-resolved task graphs with cycle detection, topological sorting, and visualization support.

## Features

- **Task Parsing**: Reads `.md` and `.task.md` files with YAML frontmatter
- **Dependency Resolution**: Builds a directed acyclic graph (DAG) from task dependencies
- **Cycle Detection**: Identifies circular dependencies using Tarjan's algorithm
- **Topological Sorting**: Computes valid execution order with parallel execution support
- **Graph Analysis**: Provides statistics, critical path analysis, and impact assessment
- **Visualization**: Export to DOT (GraphViz) and Mermaid diagram formats
- **Validation**: Detects orphaned tasks, self-dependencies, and missing dependencies

## Installation

```bash
cd vscode-extension
npm install
```

Dependencies:
- `graphlib` - Graph data structure and algorithms
- `yaml` - YAML frontmatter parsing
- `@types/graphlib` - TypeScript type definitions

## Quick Start

### Basic Usage

```typescript
import { parseTasksFromDirectory } from './taskParser';
import { generateTaskGraph, getExecutionOrder } from './taskGraphGenerator';

// Parse tasks from directory
const tasks = await parseTasksFromDirectory('_ZENTASKS');

// Generate dependency graph
const taskGraph = generateTaskGraph(tasks);

// Get execution order
const executionOrder = getExecutionOrder(tasks);

console.log(`Found ${taskGraph.nodes.size} tasks in ${executionOrder.length} execution levels`);
```

### Advanced Usage

```typescript
import { TaskGraphGenerator } from './taskGraphGenerator';

// Create generator
const generator = new TaskGraphGenerator(tasks);
const graph = generator.generateGraph();

// Validate dependencies
const validation = generator.validateDependencies();
if (!validation.valid) {
  console.error('Dependency issues:', validation.errors);
}

// Get tasks ready to execute
const ready = generator.getReadyTasks(graph);
console.log(`${ready.length} tasks ready to execute`);

// Get critical path
const stats = generator.getStats(graph);
console.log(`Critical path: ${stats.criticalPath.join(' -> ')}`);

// Get impact analysis
const impacted = generator.getImpactedTasks('TASK-123');
console.log(`${impacted.length} tasks would be blocked`);
```

## Task File Format

Tasks should be in Markdown format with YAML frontmatter:

```markdown
---
id: TASK-001
title: Implement Feature X
type: feature
status: pending
priority: high
dependencies:
  - TASK-000
assignees:
  - coder
  - tester
estimate: 4h
---

## Description

Detailed task description goes here...
```

### Supported Fields

- `id` (string): Unique task identifier
- `title` (string): Task title
- `type` (enum): feature, bug, refactor, maintenance, architecture, testing, documentation
- `status` (enum): pending, approved, in_progress, testing, review, completed, failed, blocked, cancelled
- `priority` (enum): critical, high, medium, low
- `dependencies` (array): List of task IDs this task depends on
- `assignees` (array): Agent types assigned to this task
- `estimate` (string): Time estimate (e.g., "2h", "30m", "3d")

## API Reference

### Core Classes

#### `TaskGraphGenerator`

Main class for generating and analyzing task graphs.

```typescript
class TaskGraphGenerator {
  constructor(tasks: ParsedTask[])
  
  // Generate complete task graph
  generateGraph(): TaskGraph
  
  // Get tasks ready to execute
  getReadyTasks(taskGraph: TaskGraph): TaskNode[]
  
  // Get critical path
  getCriticalPath(taskGraph: TaskGraph): string[]
  
  // Get graph statistics
  getStats(taskGraph: TaskGraph): GraphStats
  
  // Get impacted tasks
  getImpactedTasks(taskId: string): string[]
  
  // Validate dependencies
  validateDependencies(): { valid: boolean; errors: string[]; warnings: string[] }
}
```

### Data Structures

#### `TaskGraph`

Complete task graph with metadata:

```typescript
interface TaskGraph {
  graph: Graph;                    // graphlib Graph instance
  nodes: Map<string, TaskNode>;    // All task nodes
  rootNodes: string[];             // Tasks with no dependencies
  leafNodes: string[];             // Tasks with no dependents
  executionOrder: string[][];      // Grouped by execution level
  cycles: string[][];              // Circular dependencies
  orphanedTasks: string[];         // Tasks with missing dependencies
}
```

#### `TaskNode`

Enriched task node with dependency metadata:

```typescript
interface TaskNode {
  id: string;
  task: ParsedTask;
  dependencies: string[];         // Tasks this one depends on
  dependents: string[];           // Tasks that depend on this one
  depth: number;                  // Distance from root nodes
  isBlocked: boolean;             // Task is blocked or cancelled
  canExecute: boolean;            // All dependencies completed
}
```

#### `GraphStats`

Graph analysis statistics:

```typescript
interface GraphStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  readyToExecute: number;
  criticalPath: string[];
  criticalPathLength: number;
  averageDepth: number;
  maxDepth: number;
}
```

### Utility Functions

#### `generateTaskGraph(tasks: ParsedTask[]): TaskGraph`

Generate a complete task graph from an array of parsed tasks.

#### `getExecutionOrder(tasks: ParsedTask[]): string[][]`

Get topological execution order grouped by parallel execution levels.

#### `detectCycles(tasks: ParsedTask[]): string[][]`

Detect circular dependencies in task graph.

#### `getReadyTasks(tasks: ParsedTask[]): ParsedTask[]`

Get tasks that are ready to execute (all dependencies completed).

#### `exportToDot(taskGraph: TaskGraph): string`

Export task graph to DOT format for GraphViz visualization.

#### `exportToMermaid(taskGraph: TaskGraph): string`

Export task graph to Mermaid diagram format.

## Execution Order

Tasks are organized into execution levels where tasks in the same level can run in parallel:

```
Level 0: [TASK-001, TASK-002]           # No dependencies
Level 1: [TASK-003, TASK-004]           # Depend on Level 0
Level 2: [TASK-005]                     # Depends on Level 1
```

## Cycle Detection

The system uses Tarjan's strongly connected components algorithm to detect circular dependencies:

```typescript
const cycles = detectCycles(tasks);
if (cycles.length > 0) {
  console.error('Circular dependencies found:');
  cycles.forEach(cycle => {
    console.error(`  ${cycle.join(' -> ')}`);
  });
}
```

## Visualization

### GraphViz (DOT)

```typescript
const dotGraph = exportToDot(taskGraph);
// Save to file and render with: dot -Tpng graph.dot -o graph.png
```

### Mermaid

```typescript
const mermaidGraph = exportToMermaid(taskGraph);
// Use in markdown or Mermaid live editor
```

## Example Output

```
=== Task Graph Generator Demo ===

Parsing tasks from: /path/to/_ZENTASKS
✓ Parsed 15 tasks

Generating task graph...
✓ Generated graph with 15 nodes
  - Root nodes: 3
  - Leaf nodes: 2
  - Execution levels: 5

Validating dependencies...
✓ No dependency issues found

=== Execution Order (by level) ===

Level 0 (3 tasks can run in parallel):
  - TASK-001: Setup project structure [pending]
  - TASK-002: Configure database [pending]
  - TASK-003: Create CI/CD pipeline [pending]

Level 1 (4 tasks can run in parallel):
  - TASK-004: Implement authentication [pending]
  - TASK-005: Create API endpoints [pending]
  ...

=== Graph Statistics ===
Total tasks: 15
Completed: 8
Pending: 5
Blocked: 2
Ready to execute: 3

Critical path length: 7
Critical path: TASK-001 -> TASK-004 -> TASK-007 -> TASK-010 -> TASK-013
Average depth: 2.53
Max depth: 6
```

## Running the Demo

```bash
cd vscode-extension
npm run compile
node dist/taskGraphDemo.js
```

Or programmatically:

```typescript
import { runTaskGraphDemo } from './taskGraphDemo';
await runTaskGraphDemo();
```

## Integration with VS Code Extension

The task graph generator is designed to integrate seamlessly with the VS Code extension:

```typescript
import * as vscode from 'vscode';
import { parseTasksFromDirectory } from './taskParser';
import { generateTaskGraph } from './taskGraphGenerator';

async function refreshTaskGraph() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  const tasksDir = path.join(workspaceRoot, '_ZENTASKS');
  
  const tasks = await parseTasksFromDirectory(tasksDir);
  const graph = generateTaskGraph(tasks);
  
  // Update tree view, show statistics, etc.
  vscode.window.showInformationMessage(
    `Found ${graph.nodes.size} tasks in ${graph.executionOrder.length} execution levels`
  );
}
```

## Best Practices

1. **Always validate dependencies** before executing tasks
2. **Check for cycles** to prevent infinite loops
3. **Use execution levels** to maximize parallel execution
4. **Monitor ready tasks** to know what can be executed next
5. **Track critical path** to identify bottlenecks
6. **Analyze impact** before blocking or cancelling tasks

## Troubleshooting

### Cycle Detection Failed

If cycles are detected, the execution order will be empty. Fix circular dependencies in your task files.

### Orphaned Tasks

Tasks with missing dependencies won't be executable. Update dependencies or create the missing tasks.

### Performance Issues

For large graphs (>1000 tasks), consider:
- Filtering completed tasks
- Limiting depth of dependency traversal
- Using batch processing

## License

MIT

## Contributing

Contributions welcome! Please ensure all tests pass and add new tests for new features.
