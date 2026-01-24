import * as path from 'path';
import { parseTasksFromDirectory } from './taskParser';
import {
  TaskGraphGenerator,
  generateTaskGraph,
  getExecutionOrder,
  detectCycles,
  getReadyTasks,
  exportToDot,
  exportToMermaid,
} from './taskGraphGenerator';

/**
 * Example usage of the Task Graph Generator
 * 
 * This demonstrates how to:
 * 1. Parse task files from a directory
 * 2. Generate a dependency graph
 * 3. Detect cycles and validate dependencies
 * 4. Get execution order and ready tasks
 * 5. Export to visualization formats
 */
async function main() {
  console.log('=== Task Graph Generator Demo ===\n');

  // 1. Parse tasks from directory
  const tasksDir = path.join(__dirname, '..', '..', '_ZENTASKS');
  console.log(`Parsing tasks from: ${tasksDir}\n`);
  
  const tasks = await parseTasksFromDirectory(tasksDir, {
    validateSchema: true,
    failOnInvalid: false,
  });
  
  console.log(`✓ Parsed ${tasks.length} tasks\n`);

  // 2. Generate task graph
  console.log('Generating task graph...');
  const generator = new TaskGraphGenerator(tasks);
  const taskGraph = generator.generateGraph();
  
  console.log(`✓ Generated graph with ${taskGraph.nodes.size} nodes`);
  console.log(`  - Root nodes: ${taskGraph.rootNodes.length}`);
  console.log(`  - Leaf nodes: ${taskGraph.leafNodes.length}`);
  console.log(`  - Execution levels: ${taskGraph.executionOrder.length}\n`);

  // 3. Validate dependencies
  console.log('Validating dependencies...');
  const validation = generator.validateDependencies();
  
  if (validation.valid) {
    console.log('✓ No dependency issues found\n');
  } else {
    console.log('✗ Dependency issues found:');
    validation.errors.forEach(err => console.log(`  ERROR: ${err}`));
    validation.warnings.forEach(warn => console.log(`  WARNING: ${warn}`));
    console.log();
  }

  // 4. Detect cycles
  if (taskGraph.cycles.length > 0) {
    console.log('⚠ Circular dependencies detected:');
    taskGraph.cycles.forEach((cycle, idx) => {
      console.log(`  Cycle ${idx + 1}: ${cycle.join(' -> ')}`);
    });
    console.log();
  }

  // 5. Check for orphaned tasks
  if (taskGraph.orphanedTasks.length > 0) {
    console.log('⚠ Orphaned tasks (missing dependencies):');
    taskGraph.orphanedTasks.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        console.log(`  - ${taskId}: missing dependencies ${task.dependencies.join(', ')}`);
      }
    });
    console.log();
  }

  // 6. Get execution order
  console.log('=== Execution Order (by level) ===');
  taskGraph.executionOrder.forEach((level, idx) => {
    console.log(`\nLevel ${idx} (${level.length} tasks can run in parallel):`);
    level.forEach(taskId => {
      const node = taskGraph.nodes.get(taskId);
      if (node) {
        console.log(`  - ${taskId}: ${node.task.title} [${node.task.status}]`);
      }
    });
  });
  console.log();

  // 7. Get ready-to-execute tasks
  const readyTasks = generator.getReadyTasks(taskGraph);
  console.log(`=== Ready to Execute (${readyTasks.length} tasks) ===`);
  readyTasks.forEach(node => {
    console.log(`  - ${node.id}: ${node.task.title}`);
    console.log(`    Priority: ${node.task.priority || 'none'}`);
    console.log(`    Type: ${node.task.type || 'none'}`);
  });
  console.log();

  // 8. Get graph statistics
  const stats = generator.getStats(taskGraph);
  console.log('=== Graph Statistics ===');
  console.log(`Total tasks: ${stats.totalTasks}`);
  console.log(`Completed: ${stats.completedTasks}`);
  console.log(`Pending: ${stats.pendingTasks}`);
  console.log(`Blocked: ${stats.blockedTasks}`);
  console.log(`Ready to execute: ${stats.readyToExecute}`);
  console.log(`\nCritical path length: ${stats.criticalPathLength}`);
  console.log(`Critical path: ${stats.criticalPath.join(' -> ')}`);
  console.log(`Average depth: ${stats.averageDepth.toFixed(2)}`);
  console.log(`Max depth: ${stats.maxDepth}\n`);

  // 9. Get impacted tasks for a specific task
  if (tasks.length > 0) {
    const firstTask = tasks[0];
    const impacted = generator.getImpactedTasks(firstTask.id);
    if (impacted.length > 0) {
      console.log(`=== Tasks Impacted if "${firstTask.id}" fails ===`);
      impacted.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          console.log(`  - ${taskId}: ${task.title}`);
        }
      });
      console.log();
    }
  }

  // 10. Export visualizations
  console.log('=== Export Formats ===\n');

  // Export to DOT format
  const dotGraph = exportToDot(taskGraph);
  console.log('DOT format (GraphViz):');
  console.log('-----');
  console.log(dotGraph.substring(0, 300) + '...\n');

  // Export to Mermaid format
  const mermaidGraph = exportToMermaid(taskGraph);
  console.log('Mermaid format:');
  console.log('-----');
  console.log(mermaidGraph.substring(0, 300) + '...\n');

  // 11. Demonstrate utility functions
  console.log('=== Using Utility Functions ===\n');

  // Quick execution order
  const quickOrder = getExecutionOrder(tasks);
  console.log(`Quick execution order: ${quickOrder.length} levels`);

  // Quick cycle detection
  const quickCycles = detectCycles(tasks);
  console.log(`Quick cycle detection: ${quickCycles.length} cycles found`);

  // Quick ready tasks
  const quickReady = getReadyTasks(tasks);
  console.log(`Quick ready tasks: ${quickReady.length} tasks ready\n`);

  console.log('=== Demo Complete ===');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error running demo:', error);
    process.exit(1);
  });
}

export { main as runTaskGraphDemo };
