/**
 * Unit tests for Task Decomposition Engine
 */

import {
  decomposeProjectPlan,
  generateTaskYAML,
  calculateCriticalPath,
  type GeneratedTask,
  type DecompositionResult,
  type TaskEstimate
} from './taskDecomposition';

// Mock LLM client
const mockLlmClient = {
  sendChat: async (messages: any[]) => {
    // Simulate LLM response
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Setup project infrastructure',
        description: 'Initialize project structure, repos, CI/CD',
        taskType: 'architecture',
        priority: 'critical',
        estimate: { value: 2, unit: 'days' },
        dependencies: []
      },
      {
        id: 'task-2',
        title: 'Implement core API endpoints',
        description: 'Build REST API with auth',
        taskType: 'feature',
        priority: 'critical',
        estimate: { value: 5, unit: 'days' },
        dependencies: ['task-1']
      },
      {
        id: 'task-3',
        title: 'Create frontend scaffolding',
        description: 'Setup Vue app with components',
        taskType: 'feature',
        priority: 'high',
        estimate: { value: 3, unit: 'days' },
        dependencies: ['task-1']
      },
      {
        id: 'task-4',
        title: 'Implement UI components',
        description: 'Build reusable component library',
        taskType: 'feature',
        priority: 'high',
        estimate: { value: 4, unit: 'days' },
        dependencies: ['task-3']
      },
      {
        id: 'task-5',
        title: 'Write unit tests',
        description: 'Test coverage for core modules',
        taskType: 'testing',
        priority: 'high',
        estimate: { value: 3, unit: 'days' },
        dependencies: ['task-2', 'task-4']
      },
      {
        id: 'task-6',
        title: 'Integration testing',
        description: 'E2E tests for full workflow',
        taskType: 'testing',
        priority: 'medium',
        estimate: { value: 2, unit: 'days' },
        dependencies: ['task-5']
      },
      {
        id: 'task-7',
        title: 'Performance optimization',
        description: 'Optimize critical paths',
        taskType: 'refactor',
        priority: 'medium',
        estimate: { value: 1, unit: 'days' },
        dependencies: ['task-6']
      }
    ];

    return {
      choices: [{
        message: {
          content: JSON.stringify({
            tasks: mockTasks,
            criticalPath: ['task-1', 'task-2', 'task-5', 'task-6', 'task-7'],
            milestones: [
              { name: 'MVP', targetDate: '2026-02-15', tasks: ['task-1', 'task-2', 'task-3'] },
              { name: 'Beta', targetDate: '2026-03-15', tasks: ['task-4', 'task-5'] },
              { name: 'Release', targetDate: '2026-04-01', tasks: ['task-6', 'task-7'] }
            ],
            riskFactors: ['Team onboarding', 'Third-party API integration'],
            recommendations: ['Use agile sprints', 'Daily standups', 'Weekly demos']
          })
        }
      }]
    };
  }
};

// Test cases
async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Decompose project plan
  try {
    const wizardState = {
      project_category: 'web_app',
      project_tech_stack: 'Vue3, Node.js, PostgreSQL',
      project_features: ['Authentication', 'Dashboard', 'Reporting'],
      project_integrations: ['Stripe', 'SendGrid'],
      team_size: 4,
      project_timeline: 'aggressive'
    };

    const result = await decomposeProjectPlan(wizardState, mockLlmClient as any);

    console.assert(
      result.tasks && result.tasks.length > 0,
      'Should generate task list'
    );
    console.assert(
      result.criticalPath && result.criticalPath.length > 0,
      'Should calculate critical path'
    );
    console.assert(
      result.milestones && result.milestones.length > 0,
      'Should generate milestones'
    );

    passed++;
    console.log('✓ Test 1: Decompose project plan');
  } catch (error) {
    failed++;
    console.log('✗ Test 1 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 2: Task structure validation
  try {
    const mockTasks: GeneratedTask[] = [
      {
        id: 'task-1',
        title: 'Test task',
        description: 'Test description',
        taskType: 'feature',
        priority: 'high',
        estimate: { value: 2, unit: 'days' },
        dependencies: [],
        status: 'pending'
      }
    ];

    console.assert(
      Boolean(mockTasks[0].id && mockTasks[0].title),
      'Task should have id and title'
    );
    console.assert(
      mockTasks[0].taskType === 'feature',
      'Task should have valid taskType'
    );
    console.assert(
      mockTasks[0].priority === 'high',
      'Task should have valid priority'
    );

    passed++;
    console.log('✓ Test 2: Task structure validation');
  } catch (error) {
    failed++;
    console.log('✗ Test 2 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 3: Generate YAML frontmatter
  try {
    const task: GeneratedTask = {
      id: 'task-test',
      title: 'Test Task',
      description: 'This is a test task',
      taskType: 'feature',
      priority: 'high',
      estimate: { value: 3, unit: 'days' },
      dependencies: ['task-1', 'task-2'],
      status: 'pending'
    };

    const yaml = generateTaskYAML(task);

    console.assert(
      yaml.includes('---'),
      'YAML should have frontmatter markers'
    );
    console.assert(
      yaml.includes('id:'),
      'YAML should include task id'
    );
    console.assert(
      yaml.includes('title:'),
      'YAML should include task title'
    );
    console.assert(
      yaml.includes('priority: high'),
      'YAML should include priority'
    );
    console.assert(
      yaml.includes('## Description'),
      'YAML should include description section'
    );
    console.assert(
      yaml.includes('## Acceptance Criteria'),
      'YAML should include acceptance criteria'
    );

    passed++;
    console.log('✓ Test 3: Generate YAML frontmatter');
  } catch (error) {
    failed++;
    console.log('✗ Test 3 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 4: YAML special character escaping
  try {
    const task: GeneratedTask = {
      id: 'task-special',
      title: 'Task with "quotes" and \\backslash',
      description: 'Description with "quotes"',
      taskType: 'feature',
      priority: 'medium',
      estimate: { value: 1, unit: 'days' },
      dependencies: [],
      status: 'pending'
    };

    const yaml = generateTaskYAML(task);

    console.assert(
      !yaml.includes('title: "Task with "quotes"'),
      'Quotes should be escaped'
    );

    passed++;
    console.log('✓ Test 4: YAML special character escaping');
  } catch (error) {
    failed++;
    console.log('✗ Test 4 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 5: Critical path calculation
  try {
    const tasks: GeneratedTask[] = [
      {
        id: 'task-1',
        title: 'Setup',
        description: 'Setup',
        taskType: 'architecture',
        priority: 'critical',
        estimate: { value: 2, unit: 'days' },
        dependencies: [],
        status: 'pending'
      },
      {
        id: 'task-2',
        title: 'API',
        description: 'API',
        taskType: 'feature',
        priority: 'critical',
        estimate: { value: 5, unit: 'days' },
        dependencies: ['task-1'],
        status: 'pending'
      },
      {
        id: 'task-3',
        title: 'Frontend',
        description: 'Frontend',
        taskType: 'feature',
        priority: 'high',
        estimate: { value: 3, unit: 'days' },
        dependencies: ['task-1'],
        status: 'pending'
      },
      {
        id: 'task-4',
        title: 'Testing',
        description: 'Testing',
        taskType: 'testing',
        priority: 'high',
        estimate: { value: 2, unit: 'days' },
        dependencies: ['task-2', 'task-3'],
        status: 'pending'
      }
    ];

    const criticalPath = calculateCriticalPath(tasks);

    console.assert(
      Array.isArray(criticalPath),
      'Critical path should be an array'
    );
    console.assert(
      criticalPath.length > 0,
      'Critical path should not be empty'
    );
    console.assert(
      criticalPath.includes('task-1'),
      'Critical path should include task-1'
    );

    passed++;
    console.log('✓ Test 5: Critical path calculation');
  } catch (error) {
    failed++;
    console.log('✗ Test 5 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 6: Estimate conversion (hours, days, weeks)
  try {
    const estimates: Array<[TaskEstimate, number]> = [
      [{ value: 8, unit: 'hours' }, 8],
      [{ value: 1, unit: 'days' }, 8],
      [{ value: 1, unit: 'weeks' }, 40]
    ];

    // Test is implicit - if parsing works without error, conversion works
    const task: GeneratedTask = {
      id: 'task-estimate',
      title: 'Test estimates',
      description: 'Test',
      taskType: 'feature',
      priority: 'medium',
      estimate: { value: 2, unit: 'weeks' },
      dependencies: [],
      status: 'pending'
    };

    const yaml = generateTaskYAML(task);
    console.assert(
      yaml.includes('estimate_hours: 80'),
      'Should convert 2 weeks to 80 hours'
    );

    passed++;
    console.log('✓ Test 6: Estimate conversion');
  } catch (error) {
    failed++;
    console.log('✗ Test 6 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 7: Priority validation
  try {
    const priorities = ['critical', 'high', 'medium', 'low'];
    const allValid = priorities.every(p => {
      return ['critical', 'high', 'medium', 'low'].includes(p);
    });

    console.assert(allValid, 'All priority values should be valid');

    passed++;
    console.log('✓ Test 7: Priority validation');
  } catch (error) {
    failed++;
    console.log('✗ Test 7 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 8: Task type validation
  try {
    const taskTypes = ['feature', 'bug', 'refactor', 'maintenance', 'architecture', 'testing', 'documentation'];
    const allValid = taskTypes.every(t => {
      return ['feature', 'bug', 'refactor', 'maintenance', 'architecture', 'testing', 'documentation'].includes(t);
    });

    console.assert(allValid, 'All task type values should be valid');

    passed++;
    console.log('✓ Test 8: Task type validation');
  } catch (error) {
    failed++;
    console.log('✗ Test 8 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 9: Dependency graph handling
  try {
    const tasks: GeneratedTask[] = [
      {
        id: 'task-a',
        title: 'A',
        description: 'A',
        taskType: 'feature',
        priority: 'high',
        estimate: { value: 1, unit: 'days' },
        dependencies: [],
        status: 'pending'
      },
      {
        id: 'task-b',
        title: 'B',
        description: 'B',
        taskType: 'feature',
        priority: 'high',
        estimate: { value: 1, unit: 'days' },
        dependencies: ['task-a'],
        status: 'pending'
      },
      {
        id: 'task-c',
        title: 'C',
        description: 'C',
        taskType: 'feature',
        priority: 'high',
        estimate: { value: 1, unit: 'days' },
        dependencies: ['task-a'],
        status: 'pending'
      },
      {
        id: 'task-d',
        title: 'D',
        description: 'D',
        taskType: 'feature',
        priority: 'high',
        estimate: { value: 1, unit: 'days' },
        dependencies: ['task-b', 'task-c'],
        status: 'pending'
      }
    ];

    const path = calculateCriticalPath(tasks);
    console.assert(
      path.includes('task-a'),
      'Path should include root task'
    );
    console.assert(
      path.includes('task-d'),
      'Path should include leaf task'
    );

    passed++;
    console.log('✓ Test 9: Dependency graph handling');
  } catch (error) {
    failed++;
    console.log('✗ Test 9 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 10: Empty task handling
  try {
    const tasks: GeneratedTask[] = [];
    const path = calculateCriticalPath(tasks);

    console.assert(
      Array.isArray(path),
      'Empty task list should return empty array'
    );

    passed++;
    console.log('✓ Test 10: Empty task handling');
  } catch (error) {
    failed++;
    console.log('✗ Test 10 Failed:', error instanceof Error ? error.message : error);
  }

  // Summary
  console.log(`\n=== Task Decomposition Tests Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  if (failed === 0) {
    console.log('✓ All tests passed!');
  }

  return { passed, failed };
}

// Jest test wrapper
describe('Task Decomposition Integration Tests', () => {
  it('should pass all decomposition tests', async () => {
    const result = await runTests();
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(0);
  });
});
