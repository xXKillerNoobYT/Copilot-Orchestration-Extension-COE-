import { ParsedTask } from './taskParser';
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
 * Simple test suite for Task Graph Generator
 */

function createTestTask(id: string, deps: string[] = [], status: string = 'pending'): ParsedTask {
  return {
    id,
    title: `Task ${id}`,
    description: `Description for ${id}`,
    status: status as any,
    dependencies: deps,
    assignees: [],
    labels: [],
    subtasks: [],
    rawFrontMatter: {},
  };
}

function testBasicGraph() {
  console.log('Test: Basic Graph Generation');
  
  const tasks = [
    createTestTask('A'),
    createTestTask('B', ['A']),
    createTestTask('C', ['A']),
    createTestTask('D', ['B', 'C']),
  ];

  const graph = generateTaskGraph(tasks);
  
  console.assert(graph.nodes.size === 4, 'Should have 4 nodes');
  console.assert(graph.rootNodes.length === 1, 'Should have 1 root node');
  console.assert(graph.rootNodes[0] === 'A', 'Root should be A');
  console.assert(graph.leafNodes.length === 1, 'Should have 1 leaf node');
  console.assert(graph.leafNodes[0] === 'D', 'Leaf should be D');
  console.assert(graph.executionOrder.length === 3, 'Should have 3 execution levels');
  
  console.log('✓ Basic graph generation passed\n');
}

function testParallelExecution() {
  console.log('Test: Parallel Execution Levels');
  
  const tasks = [
    createTestTask('A'),
    createTestTask('B'),
    createTestTask('C', ['A']),
    createTestTask('D', ['B']),
    createTestTask('E', ['C', 'D']),
  ];

  const order = getExecutionOrder(tasks);
  
  console.assert(order.length === 3, 'Should have 3 levels');
  console.assert(order[0].length === 2, 'Level 0 should have 2 tasks (A, B)');
  console.assert(order[1].length === 2, 'Level 1 should have 2 tasks (C, D)');
  console.assert(order[2].length === 1, 'Level 2 should have 1 task (E)');
  
  console.log('✓ Parallel execution levels passed\n');
}

function testCycleDetection() {
  console.log('Test: Cycle Detection');
  
  const tasks = [
    createTestTask('A', ['B']),
    createTestTask('B', ['C']),
    createTestTask('C', ['A']),
  ];

  const cycles = detectCycles(tasks);
  
  console.assert(cycles.length > 0, 'Should detect cycle');
  console.assert(cycles[0].length === 3, 'Cycle should have 3 tasks');
  
  console.log('✓ Cycle detection passed\n');
}

function testNoCycles() {
  console.log('Test: No Cycles in Valid Graph');
  
  const tasks = [
    createTestTask('A'),
    createTestTask('B', ['A']),
    createTestTask('C', ['B']),
  ];

  const cycles = detectCycles(tasks);
  
  console.assert(cycles.length === 0, 'Should not detect cycles');
  
  console.log('✓ No cycles detection passed\n');
}

function testReadyTasks() {
  console.log('Test: Ready Tasks Detection');
  
  const tasks = [
    createTestTask('A', [], 'completed'),
    createTestTask('B', ['A'], 'pending'),
    createTestTask('C', ['B'], 'pending'),
    createTestTask('D', [], 'pending'),
  ];

  const ready = getReadyTasks(tasks);
  
  console.assert(ready.length === 2, 'Should have 2 ready tasks (B and D)');
  console.assert(ready.find(t => t.id === 'B') !== undefined, 'B should be ready');
  console.assert(ready.find(t => t.id === 'D') !== undefined, 'D should be ready');
  
  console.log('✓ Ready tasks detection passed\n');
}

function testOrphanedTasks() {
  console.log('Test: Orphaned Task Detection');
  
  const tasks = [
    createTestTask('A', ['NON_EXISTENT']),
    createTestTask('B'),
  ];

  const graph = generateTaskGraph(tasks);
  
  console.assert(graph.orphanedTasks.length === 1, 'Should have 1 orphaned task');
  console.assert(graph.orphanedTasks[0] === 'A', 'A should be orphaned');
  
  console.log('✓ Orphaned task detection passed\n');
}

function testDepthCalculation() {
  console.log('Test: Depth Calculation');
  
  const tasks = [
    createTestTask('A'),
    createTestTask('B', ['A']),
    createTestTask('C', ['B']),
    createTestTask('D', ['C']),
  ];

  const generator = new TaskGraphGenerator(tasks);
  const graph = generator.generateGraph();
  
  console.assert(graph.nodes.get('A')?.depth === 0, 'A should have depth 0');
  console.assert(graph.nodes.get('B')?.depth === 1, 'B should have depth 1');
  console.assert(graph.nodes.get('C')?.depth === 2, 'C should have depth 2');
  console.assert(graph.nodes.get('D')?.depth === 3, 'D should have depth 3');
  
  console.log('✓ Depth calculation passed\n');
}

function testCriticalPath() {
  console.log('Test: Critical Path Detection');
  
  const tasks = [
    createTestTask('A'),
    createTestTask('B'),
    createTestTask('C', ['A']),
    createTestTask('D', ['B']),
    createTestTask('E', ['C']),
    createTestTask('F', ['D', 'E']),
  ];

  const generator = new TaskGraphGenerator(tasks);
  const graph = generator.generateGraph();
  const stats = generator.getStats(graph);
  
  console.assert(stats.criticalPath.length > 0, 'Should have a critical path');
  console.assert(stats.criticalPathLength === stats.criticalPath.length, 'Length should match path');
  
  console.log(`Critical path: ${stats.criticalPath.join(' -> ')}`);
  console.log('✓ Critical path detection passed\n');
}

function testImpactAnalysis() {
  console.log('Test: Impact Analysis');
  
  const tasks = [
    createTestTask('A'),
    createTestTask('B', ['A']),
    createTestTask('C', ['A']),
    createTestTask('D', ['B', 'C']),
  ];

  const generator = new TaskGraphGenerator(tasks);
  generator.generateGraph();
  const impacted = generator.getImpactedTasks('A');
  
  if (impacted.length !== 3) {
    throw new Error(`Expected 3 impacted tasks, got ${impacted.length}: ${JSON.stringify(impacted)}`);
  }
  if (!impacted.includes('B')) {
    throw new Error('Should include B');
  }
  if (!impacted.includes('C')) {
    throw new Error('Should include C');
  }
  if (!impacted.includes('D')) {
    throw new Error('Should include D');
  }
  
  console.log('✓ Impact analysis passed\n');
}

function testDependencyValidation() {
  console.log('Test: Dependency Validation');
  
  const tasks = [
    createTestTask('A', ['A']), // Self-dependency
    createTestTask('B', ['NON_EXISTENT']), // Missing dependency
  ];

  const generator = new TaskGraphGenerator(tasks);
  generator.generateGraph();
  const validation = generator.validateDependencies();
  
  console.assert(!validation.valid, 'Should be invalid');
  console.assert(validation.errors.length > 0, 'Should have errors');
  console.assert(validation.warnings.length > 0, 'Should have warnings');
  
  console.log('✓ Dependency validation passed\n');
}

function testExportFormats() {
  console.log('Test: Export Formats');
  
  const tasks = [
    createTestTask('A'),
    createTestTask('B', ['A']),
  ];

  const graph = generateTaskGraph(tasks);
  
  const dot = exportToDot(graph);
  console.assert(dot.includes('digraph TaskGraph'), 'DOT should be valid');
  console.assert(dot.includes('"A"'), 'DOT should include task A');
  
  const mermaid = exportToMermaid(graph);
  console.assert(mermaid.includes('graph TD'), 'Mermaid should be valid');
  console.assert(mermaid.includes('A['), 'Mermaid should include task A');
  
  console.log('✓ Export formats passed\n');
}

function testGraphStats() {
  console.log('Test: Graph Statistics');
  
  const tasks = [
    createTestTask('A', [], 'completed'),
    createTestTask('B', ['A'], 'pending'),
    createTestTask('C', ['A'], 'in_progress'),
    createTestTask('D', ['B', 'C'], 'blocked'),
  ];

  const generator = new TaskGraphGenerator(tasks);
  const graph = generator.generateGraph();
  const stats = generator.getStats(graph);
  
  console.assert(stats.totalTasks === 4, 'Should have 4 total tasks');
  console.assert(stats.completedTasks === 1, 'Should have 1 completed task');
  console.assert(stats.blockedTasks === 1, 'Should have 1 blocked task');
  console.assert(stats.maxDepth >= 0, 'Max depth should be >= 0');
  
  console.log('✓ Graph statistics passed\n');
}

// Run all tests
function runAllTests() {
  console.log('=== Task Graph Generator Tests ===\n');
  
  try {
    testBasicGraph();
    testParallelExecution();
    testCycleDetection();
    testNoCycles();
    testReadyTasks();
    testOrphanedTasks();
    testDepthCalculation();
    testCriticalPath();
    testImpactAnalysis();
    testDependencyValidation();
    testExportFormats();
    testGraphStats();
    
    console.log('=== All Tests Passed ✓ ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
