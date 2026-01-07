# Task Parser and Graph Generator - Quick Start Guide

This guide will help you get started with the Task Parser and Task Graph Generator.

## Installation

1. Navigate to the vscode-extension directory:
```bash
cd vscode-extension
```

2. Install dependencies:
```bash
npm install
```

This will install:
- `graphlib` - Graph data structures and algorithms
- `yaml` - YAML parsing for frontmatter
- Type definitions for TypeScript

## Running Tests

Run the test suite to verify everything is working:

```bash
npm test
```

You should see output like:
```
=== Task Graph Generator Tests ===

Test: Basic Graph Generation
✓ Basic graph generation passed

Test: Parallel Execution Levels
✓ Parallel execution levels passed

...

=== All Tests Passed ✓ ===
```

## Running the Demo

Run the demo to see the task graph generator in action with real task files:

```bash
npm run demo
```

This will:
1. Parse all tasks from the `_ZENTASKS` directory
2. Generate a dependency graph
3. Detect cycles and validate dependencies
4. Show execution order
5. Display graph statistics
6. Export visualization formats

## Basic Usage

### Parse Tasks from Directory

```typescript
import { parseTasksFromDirectory } from './taskParser';
import { generateTaskGraph } from './taskGraphGenerator';

// Parse all .md files from a directory
const tasks = await parseTasksFromDirectory('_ZENTASKS');

// Generate dependency graph
const graph = generateTaskGraph(tasks);

console.log(`Found ${graph.nodes.size} tasks`);
console.log(`Execution levels: ${graph.executionOrder.length}`);
```

### Get Execution Order

```typescript
import { getExecutionOrder } from './taskGraphGenerator';

const executionOrder = getExecutionOrder(tasks);

executionOrder.forEach((level, idx) => {
  console.log(`Level ${idx}: ${level.join(', ')}`);
});
```

### Detect Cycles

```typescript
import { detectCycles } from './taskGraphGenerator';

const cycles = detectCycles(tasks);

if (cycles.length > 0) {
  console.log('Circular dependencies found!');
  cycles.forEach(cycle => {
    console.log(`  ${cycle.join(' -> ')}`);
  });
}
```

### Get Ready Tasks

```typescript
import { getReadyTasks } from './taskGraphGenerator';

const ready = getReadyTasks(tasks);

console.log(`${ready.length} tasks ready to execute:`);
ready.forEach(task => {
  console.log(`  - ${task.id}: ${task.title}`);
});
```

### Advanced Analysis

```typescript
import { TaskGraphGenerator } from './taskGraphGenerator';

const generator = new TaskGraphGenerator(tasks);
const graph = generator.generateGraph();

// Get statistics
const stats = generator.getStats(graph);
console.log(`Critical path: ${stats.criticalPath.join(' -> ')}`);
console.log(`Total tasks: ${stats.totalTasks}`);
console.log(`Completed: ${stats.completedTasks}`);

// Validate dependencies
const validation = generator.validateDependencies();
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}

// Get impact analysis
const impacted = generator.getImpactedTasks('TASK-001');
console.log(`${impacted.length} tasks would be blocked`);
```

### Export Visualizations

```typescript
import { exportToDot, exportToMermaid } from './taskGraphGenerator';

// Export to GraphViz DOT format
const dotGraph = exportToDot(graph);
await fs.writeFile('task-graph.dot', dotGraph);
// Render with: dot -Tpng task-graph.dot -o task-graph.png

// Export to Mermaid format
const mermaidGraph = exportToMermaid(graph);
await fs.writeFile('task-graph.mmd', mermaidGraph);
// Use in Markdown or Mermaid live editor
```

## VS Code Extension Integration

The task graph generator is integrated into the VS Code extension. After installing:

1. **Refresh Tasks**: `Ctrl+Shift+P` → "Copilot Orchestrator: Refresh Tasks"
2. **Show Graph**: `Ctrl+Shift+P` → "Copilot Orchestrator: Show Task Graph"
3. **Show Dependencies**: `Ctrl+Shift+P` → "Copilot Orchestrator: Show Task Dependencies"

## Task File Format

Create task files in Markdown with YAML frontmatter:

```markdown
---
id: TASK-001
title: Implement Authentication
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

Implement user authentication with JWT tokens...

## Acceptance Criteria

- [ ] Login endpoint
- [ ] Token validation
- [ ] Refresh tokens
```

## Understanding the Graph

The task graph organizes tasks into execution levels:

```
Level 0: [A, B]        # No dependencies, can run in parallel
Level 1: [C, D]        # Depend on Level 0
Level 2: [E]           # Depends on Level 1
```

Tasks in the same level have no dependencies between them and can be executed in parallel.

## Common Use Cases

### Find What to Work On Next

```typescript
const ready = getReadyTasks(tasks);
const highPriority = ready.filter(t => t.priority === 'high');
console.log('High priority tasks ready:', highPriority);
```

### Validate Project Dependencies

```typescript
const generator = new TaskGraphGenerator(tasks);
const graph = generator.generateGraph();
const validation = generator.validateDependencies();

if (graph.cycles.length > 0) {
  console.error('Fix circular dependencies first!');
}

if (graph.orphanedTasks.length > 0) {
  console.warn('Some tasks have missing dependencies');
}
```

### Track Progress

```typescript
const stats = generator.getStats(graph);
const progress = (stats.completedTasks / stats.totalTasks) * 100;
console.log(`Project ${progress.toFixed(1)}% complete`);
```

### Find Critical Path

```typescript
const stats = generator.getStats(graph);
console.log('Critical path (longest dependency chain):');
stats.criticalPath.forEach(taskId => {
  const task = tasks.find(t => t.id === taskId);
  console.log(`  ${taskId}: ${task?.title}`);
});
```

## Troubleshooting

### "Cannot find module 'graphlib'"

Run `npm install` in the vscode-extension directory.

### "No tasks found"

Make sure you have .md or .task.md files with YAML frontmatter in your tasks directory.

### Circular dependency error

Check your task dependencies - you have a cycle like A→B→C→A. Remove one dependency to break the cycle.

### TypeScript errors

Run `npm run compile` to check for compilation errors.

## Next Steps

- Read the full [Task Graph Generator documentation](TASK-GRAPH-GENERATOR.md)
- See [taskGraphDemo.ts](src/taskGraphDemo.ts) for comprehensive examples
- Check [taskGraphTest.ts](src/taskGraphTest.ts) for test cases
- Review the [Task Format Specification](../Docs/task-format-specification.md)

## Getting Help

If you encounter issues:
1. Check the test suite runs successfully
2. Review the demo output for examples
3. Ensure task files have valid YAML frontmatter
4. Verify dependencies reference existing task IDs
