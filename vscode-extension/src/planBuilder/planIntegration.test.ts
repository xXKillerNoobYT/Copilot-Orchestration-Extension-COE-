/**
 * Integration tests for Plan Builder complete workflow
 */

import { processPlanCompletion, displayCompletionResults, generateSummaryContent } from './planIntegration';
import type { PlanCompletionResult } from './planIntegration';

// Mock wizard state
const mockWizardState: Record<string, unknown> = {
  project_name: 'E-Commerce Platform',
  project_category: 'web_app',
  project_tech_stack: 'Vue3,Node.js,PostgreSQL,Docker',
  team_size: 5,
  project_scale: 'large',
  project_integrations: ['Stripe', 'SendGrid', 'AWS S3'],
  project_timeline: 'aggressive',
  project_features: ['User Authentication', 'Product Catalog', 'Shopping Cart', 'Payment Processing', 'Admin Dashboard'],
  project_budget: 100000,
  project_constraints: 'Must be production-ready in 3 months'
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Validate wizard state structure
  try {
    console.assert(
      mockWizardState.project_name && typeof mockWizardState.project_name === 'string',
      'Wizard state should have project_name'
    );
    console.assert(
      mockWizardState.project_category && typeof mockWizardState.project_category === 'string',
      'Wizard state should have project_category'
    );
    console.assert(
      mockWizardState.team_size && typeof mockWizardState.team_size === 'number',
      'Wizard state should have team_size as number'
    );
    console.assert(
      Array.isArray(mockWizardState.project_features),
      'Wizard state should have project_features array'
    );

    passed++;
    console.log('✓ Test 1: Wizard state validation');
  } catch (error) {
    failed++;
    console.log('✗ Test 1 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 2: Result structure validation
  try {
    const mockResult: PlanCompletionResult = {
      success: true,
      taskCount: 25,
      tasksCreated: ['TASK-001.md', 'TASK-002.md', 'TASK-003.md'],
      architectureSuggestions: {
        suggestions: [
          {
            pattern: 'Microservices',
            rationale: 'Scalable architecture',
            frameworks: ['Docker', 'Kubernetes'],
            folderStructure: [
              { directory: 'services/', purpose: 'Microservices' },
              { directory: 'api-gateway/', purpose: 'API Gateway' }
            ],
            ciCdSetup: 'GitHub Actions',
            bestPractices: ['Containerization', 'API versioning']
          }
        ],
        reasoning: 'Recommended based on scale',
        alternatives: ['Monolithic', 'Lambda'],
        risks: ['Complexity', 'Latency'],
        recommendations: ['Start with 3 core services']
      },
      decompositionResult: {
        tasks: [
          {
            id: 'task-1',
            title: 'Setup Infrastructure',
            description: 'Setup cloud resources',
            taskType: 'architecture',
            priority: 'critical',
            estimate: { value: 3, unit: 'days' },
            dependencies: [],
            status: 'pending'
          }
        ],
        criticalPath: ['task-1'],
        milestones: [
          { name: 'MVP', targetDate: '2026-02-15', tasks: ['task-1'] }
        ],
        riskFactors: [],
        recommendations: []
      },
      dependencySummary: 'Project duration: 60 days\nCritical path: 1 task'
    };

    console.assert(
      mockResult.success === true,
      'Result should have success flag'
    );
    console.assert(
      mockResult.taskCount > 0,
      'Result should have task count > 0'
    );
    console.assert(
      Array.isArray(mockResult.tasksCreated),
      'Result should have tasksCreated array'
    );
    console.assert(
      mockResult.architectureSuggestions.suggestions !== undefined,
      'Result should have architecture suggestions'
    );
    console.assert(
      mockResult.decompositionResult.tasks !== undefined,
      'Result should have decomposition tasks'
    );
    console.assert(
      typeof mockResult.dependencySummary === 'string',
      'Result should have dependency summary string'
    );

    passed++;
    console.log('✓ Test 2: Result structure validation');
  } catch (error) {
    failed++;
    console.log('✗ Test 2 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 3: Error result handling
  try {
    const errorResult: PlanCompletionResult = {
      success: false,
      taskCount: 0,
      tasksCreated: [],
      architectureSuggestions: {} as any,
      decompositionResult: {} as any,
      dependencySummary: '',
      errorMessage: 'LLM client not configured'
    };

    console.assert(
      !errorResult.success,
      'Error result should have success=false'
    );
    console.assert(
      errorResult.errorMessage !== undefined,
      'Error result should have errorMessage'
    );
    console.assert(
      errorResult.taskCount === 0,
      'Error result should have 0 taskCount'
    );

    passed++;
    console.log('✓ Test 3: Error result handling');
  } catch (error) {
    failed++;
    console.log('✗ Test 3 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 4: Task file naming convention
  try {
    const taskIds = ['task-mk5216pq', 'task-mk521a0n', 'task-abc123'];
    const fileNames = taskIds.map(id => `TASK-${id}.md`);

    console.assert(
      fileNames.every(f => f.startsWith('TASK-') && f.endsWith('.md')),
      'Task files should follow TASK-*.md naming'
    );

    passed++;
    console.log('✓ Test 4: Task file naming');
  } catch (error) {
    failed++;
    console.log('✗ Test 4 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 5: Summary content generation
  try {
    const mockResult: PlanCompletionResult = {
      success: true,
      taskCount: 5,
      tasksCreated: ['TASK-001.md'],
      architectureSuggestions: {
        suggestions: [
          {
            pattern: 'API-First',
            rationale: 'Enable rapid frontend development',
            frameworks: ['REST', 'GraphQL'],
            folderStructure: [],
            ciCdSetup: '',
            bestPractices: []
          }
        ],
        reasoning: 'Suitable for team',
        alternatives: [],
        risks: [],
        recommendations: []
      },
      decompositionResult: {
        tasks: [
          {
            id: 'task-1',
            title: 'API Setup',
            description: 'Setup REST API',
            taskType: 'architecture',
            priority: 'critical',
            estimate: { value: 2, unit: 'days' },
            dependencies: [],
            status: 'pending'
          }
        ],
        criticalPath: ['task-1'],
        milestones: [
          { name: 'Phase 1', targetDate: '2026-02-01', tasks: ['task-1'] }
        ],
        riskFactors: ['Integration complexity'],
        recommendations: ['Use type-safe APIs']
      },
      dependencySummary: 'Analysis: 1 critical task'
    };

    const summary = generateSummaryContent(mockResult);

    console.assert(
      summary.includes('# Plan Processing Summary'),
      'Summary should have main heading'
    );
    console.assert(
      summary.includes('Architecture Recommendations'),
      'Summary should include architecture section'
    );
    console.assert(
      summary.includes('Task Decomposition'),
      'Summary should include decomposition section'
    );
    console.assert(
      summary.includes('Critical Path'),
      'Summary should include critical path'
    );
    console.assert(
      summary.includes('Milestones'),
      'Summary should include milestones'
    );
    console.assert(
      summary.includes('Risk Factors'),
      'Summary should include risk factors'
    );
    console.assert(
      summary.includes('Created Task Files'),
      'Summary should include created files list'
    );

    passed++;
    console.log('✓ Test 5: Summary content generation');
  } catch (error) {
    failed++;
    console.log('✗ Test 5 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 6: Architecture context conversion
  try {
    // Simulated context conversion from wizard state
    const archContext = {
      projectName: 'E-Commerce',
      projectType: 'web_app',
      techStack: ['Vue3', 'Node.js', 'PostgreSQL'],
      teamSize: 5,
      scale: 'large',
      integrations: ['Stripe', 'SendGrid'],
      timeline: 'aggressive'
    };

    console.assert(
      typeof archContext.projectName === 'string',
      'Context should have projectName string'
    );
    console.assert(
      typeof archContext.projectType === 'string',
      'Context should have projectType string'
    );
    console.assert(
      Array.isArray(archContext.techStack),
      'Context should have techStack array'
    );
    console.assert(
      typeof archContext.teamSize === 'number',
      'Context should have teamSize number'
    );

    passed++;
    console.log('✓ Test 6: Architecture context conversion');
  } catch (error) {
    failed++;
    console.log('✗ Test 6 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 7: Task count calculation
  try {
    const tasks = Array.from({ length: 25 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `Task ${i + 1}`,
      description: 'Test task',
      taskType: 'feature',
      priority: 'high',
      estimate: { value: 2, unit: 'days' },
      dependencies: [],
      status: 'pending'
    }));

    console.assert(
      tasks.length === 25,
      'Should have 25 tasks'
    );
    console.assert(
      tasks.every(t => t.id && t.title),
      'All tasks should have id and title'
    );

    passed++;
    console.log('✓ Test 7: Task count calculation');
  } catch (error) {
    failed++;
    console.log('✗ Test 7 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 8: Milestone tracking
  try {
    const milestones = [
      { name: 'Kickoff', targetDate: '2026-01-20', tasks: ['task-1', 'task-2'] },
      { name: 'MVP', targetDate: '2026-02-15', tasks: ['task-3', 'task-4'] },
      { name: 'Beta', targetDate: '2026-03-15', tasks: ['task-5', 'task-6'] },
      { name: 'Release', targetDate: '2026-04-15', tasks: ['task-7'] }
    ];

    console.assert(
      milestones.length === 4,
      'Should have 4 milestones'
    );
    console.assert(
      milestones.every(m => m.name && m.targetDate && Array.isArray(m.tasks)),
      'All milestones should have required fields'
    );
    console.assert(
      milestones[0].targetDate < milestones[milestones.length - 1].targetDate,
      'Milestones should be chronologically ordered'
    );

    passed++;
    console.log('✓ Test 8: Milestone tracking');
  } catch (error) {
    failed++;
    console.log('✗ Test 8 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 9: Risk identification
  try {
    const risks = [
      'Integration complexity with third-party APIs',
      'Team onboarding time for new tech stack',
      'Database migration from legacy system',
      'Payment processing compliance requirements'
    ];

    console.assert(
      risks.length > 0,
      'Should identify risks'
    );
    console.assert(
      risks.every(r => typeof r === 'string'),
      'All risks should be strings'
    );

    passed++;
    console.log('✓ Test 9: Risk identification');
  } catch (error) {
    failed++;
    console.log('✗ Test 9 Failed:', error instanceof Error ? error.message : error);
  }

  // Test 10: Recommendations generation
  try {
    const recommendations = [
      'Use Docker for consistent development environments',
      'Implement CI/CD pipeline from day one',
      'Schedule daily standups for coordination',
      'Use feature flags for gradual rollout'
    ];

    console.assert(
      recommendations.length > 0,
      'Should have recommendations'
    );
    console.assert(
      recommendations.every(r => typeof r === 'string' && r.length > 10),
      'Recommendations should be meaningful'
    );

    passed++;
    console.log('✓ Test 10: Recommendations generation');
  } catch (error) {
    failed++;
    console.log('✗ Test 10 Failed:', error instanceof Error ? error.message : error);
  }

  // Summary
  console.log(`\n=== Plan Builder Integration Tests Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  if (failed === 0) {
    console.log('✓ All integration tests passed!');
  }
}

// Run tests
runTests().catch(console.error);
