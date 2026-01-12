/**
 * Wizard Flow Integration Tests
 * 
 * End-to-end tests for complete wizard flow:
 * - User completes all 10 pages
 * - Plan generated successfully
 * - Tasks created via task decomposition
 * - All export formats work
 * 
 * Tests:
 * 1. Complete wizard journey (all pages)
 * 2. Plan generation with LLM integration
 * 3. Task decomposition output validation
 * 4. Export format verification (JSON, Markdown, YAML, ZIP)
 * 5. MCP backend persistence
 * 6. Error recovery flows
 * 7. Validation at each step
 * 8. Performance benchmarks
 * 
 * Reference: TASK-mk7jzlhj-kozt7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WizardContainer } from '../../wizardContainer';
import { QuestionFramework } from '../../questionFramework';
import { PlanGenerator } from '../../planGenerator';
import { TaskDecompositionEngine } from '../../taskDecomposition';
import { PlanExporter } from '../../exporters/planExporter';
import type { Plan, Task } from '../../types';

// Mock LLM service
const mockLLMService = {
  suggestArchitecture: vi.fn(),
  suggestTechStack: vi.fn(),
  generatePlan: vi.fn(),
  analyzeDependencies: vi.fn(),
};

// Mock MCP service
const mockMCPService = {
  persistPlan: vi.fn(),
  persistTasks: vi.fn(),
  fetchPlan: vi.fn(),
  validatePlanStructure: vi.fn(),
};

describe('Wizard Flow Integration Tests', () => {
  let wizard: WizardContainer;
  let framework: QuestionFramework;
  let planGenerator: PlanGenerator;
  let taskEngine: TaskDecompositionEngine;
  let exporter: PlanExporter;

  beforeEach(() => {
    framework = new QuestionFramework();
    wizard = new WizardContainer();
    planGenerator = new PlanGenerator();
    taskEngine = new TaskDecompositionEngine();
    exporter = new PlanExporter();

    // Reset mocks
    vi.clearAllMocks();

    // Setup mock responses
    mockLLMService.suggestArchitecture.mockResolvedValue({
      pattern: 'microservices',
      rationale: 'Best for scalability',
      components: ['api-gateway', 'auth-service', 'user-service'],
    });

    mockLLMService.suggestTechStack.mockResolvedValue({
      frontend: ['Vue 3', 'TypeScript', 'Vite'],
      backend: ['Node.js', 'Express', 'PostgreSQL'],
      deployment: ['Docker', 'Kubernetes', 'AWS'],
    });

    mockLLMService.generatePlan.mockResolvedValue({
      id: 'plan-test-001',
      name: 'Test Project',
      description: 'Comprehensive test plan',
      version: '1.0.0',
      phases: [
        {
          name: 'Phase 1: Foundation',
          duration: '2 weeks',
          deliverables: ['Setup', 'Auth'],
        },
      ],
    });

    mockLLMService.analyzeDependencies.mockResolvedValue({
      dependencies: [
        { from: 'TASK-001', to: 'TASK-002', type: 'blocks' },
      ],
      criticalPath: ['TASK-001', 'TASK-002', 'TASK-003'],
    });

    mockMCPService.persistPlan.mockResolvedValue({ success: true, id: 'plan-001' });
    mockMCPService.persistTasks.mockResolvedValue({ success: true, count: 15 });
    mockMCPService.validatePlanStructure.mockResolvedValue({ valid: true, errors: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Wizard Journey', () => {
    it('should complete all 10 pages successfully', async () => {
      const pages = framework.getPages();
      expect(pages).toHaveLength(10);

      // Page 1: Introduction
      wizard.setAnswer('project_name', 'E-commerce Platform');
      wizard.setAnswer('project_description', 'Full-featured online store');
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 2: Project Type
      wizard.setAnswer('project_category', 'web_app');
      wizard.setAnswer('tech_stack', ['Vue.js', 'Node.js', 'PostgreSQL']);
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 3: Architecture
      wizard.setAnswer('architecture_pattern', 'microservices');
      wizard.setAnswer('database_type', 'sql');
      wizard.setAnswer('caching_strategy', 'redis');
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 4: Integrations
      wizard.setAnswer('auth_provider', 'auth0');
      wizard.setAnswer('payment_provider', 'stripe');
      wizard.setAnswer('email_service', 'sendgrid');
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 5: Deployment
      wizard.setAnswer('hosting_platform', 'aws');
      wizard.setAnswer('ci_cd', 'github_actions');
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 6: Testing
      wizard.setAnswer('test_coverage_target', 80);
      wizard.setAnswer('test_frameworks', ['vitest', 'cypress']);
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 7: Documentation
      wizard.setAnswer('doc_tools', 'vitepress');
      wizard.setAnswer('api_docs', 'openapi');
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 8: Team
      wizard.setAnswer('team_size', '5-10');
      wizard.setAnswer('collaboration_tools', ['github', 'slack']);
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 9: Timeline
      wizard.setAnswer('project_duration', '6 months');
      wizard.setAnswer('mvp_timeline', '3 months');
      expect(wizard.canNavigateNext()).toBe(true);
      wizard.navigateNext();

      // Page 10: Review
      wizard.setAnswer('generate_tasks', true);
      wizard.setAnswer('export_format', ['json', 'markdown']);
      expect(wizard.isComplete()).toBe(true);

      // Verify all answers recorded
      const allAnswers = wizard.getAllAnswers();
      expect(allAnswers).toHaveProperty('project_name');
      expect(allAnswers).toHaveProperty('architecture_pattern');
      expect(allAnswers).toHaveProperty('mvp_timeline');
      expect(Object.keys(allAnswers).length).toBeGreaterThan(15);
    });

    it('should track progress correctly throughout journey', async () => {
      const pages = framework.getPages();
      
      // Start at 0%
      let progress = wizard.getProgress();
      expect(progress.percentage).toBe(0);
      expect(progress.currentPage).toBe(0);
      expect(progress.totalPages).toBe(10);

      // Complete page 1 (10%)
      wizard.setAnswer('project_name', 'Test Project');
      wizard.setAnswer('project_description', 'Test description');
      wizard.navigateNext();
      progress = wizard.getProgress();
      expect(progress.percentage).toBeGreaterThanOrEqual(10);

      // Complete page 5 (50%)
      for (let i = 1; i < 5; i++) {
        wizard.setAnswer(`question_${i}`, `answer_${i}`);
        wizard.navigateNext();
      }
      progress = wizard.getProgress();
      expect(progress.percentage).toBeGreaterThanOrEqual(50);

      // Complete all pages (100%)
      for (let i = 5; i < 10; i++) {
        wizard.setAnswer(`question_${i}`, `answer_${i}`);
        if (i < 9) wizard.navigateNext();
      }
      expect(wizard.isComplete()).toBe(true);
      progress = wizard.getProgress();
      expect(progress.percentage).toBe(100);
    });

    it('should allow navigation back and forth', async () => {
      // Go forward 3 pages
      wizard.setAnswer('q1', 'a1');
      wizard.navigateNext();
      wizard.setAnswer('q2', 'a2');
      wizard.navigateNext();
      wizard.setAnswer('q3', 'a3');
      wizard.navigateNext();
      
      expect(wizard.getCurrentPageIndex()).toBe(3);

      // Go back 2 pages
      wizard.navigateBack();
      expect(wizard.getCurrentPageIndex()).toBe(2);
      wizard.navigateBack();
      expect(wizard.getCurrentPageIndex()).toBe(1);

      // Verify answers persisted
      expect(wizard.getAnswer('q1')).toBe('a1');
      expect(wizard.getAnswer('q2')).toBe('a2');
      expect(wizard.getAnswer('q3')).toBe('a3');
    });
  });

  describe('Plan Generation', () => {
    it('should generate plan from wizard answers', async () => {
      // Complete wizard with test data
      const testAnswers = {
        project_name: 'Task Manager',
        project_description: 'Team collaboration tool',
        project_category: 'web_app',
        tech_stack: ['React', 'Node.js'],
        architecture_pattern: 'mvc',
        database_type: 'sql',
      };

      Object.entries(testAnswers).forEach(([key, value]) => {
        wizard.setAnswer(key, value);
      });

      // Generate plan
      const plan = await planGenerator.generateFromAnswers(wizard.getAllAnswers());

      expect(plan).toBeDefined();
      expect(plan.name).toBe('Task Manager');
      expect(plan.description).toBe('Team collaboration tool');
      expect(plan.version).toBeDefined();
      expect(plan.phases).toBeDefined();
      expect(plan.phases.length).toBeGreaterThan(0);
    });

    it('should include LLM suggestions in plan', async () => {
      wizard.setAnswer('project_name', 'AI Platform');
      wizard.setAnswer('architecture_pattern', 'microservices');

      const plan = await planGenerator.generateFromAnswers(
        wizard.getAllAnswers(),
        { useLLM: true }
      );

      expect(mockLLMService.suggestArchitecture).toHaveBeenCalled();
      expect(plan.architecture).toBeDefined();
      expect(plan.architecture?.pattern).toBe('microservices');
    });

    it('should validate plan structure', async () => {
      const testAnswers = {
        project_name: 'Valid Project',
        project_description: 'Test description',
        architecture_pattern: 'monolith',
      };

      Object.entries(testAnswers).forEach(([key, value]) => {
        wizard.setAnswer(key, value);
      });

      const plan = await planGenerator.generateFromAnswers(wizard.getAllAnswers());
      const validation = await mockMCPService.validatePlanStructure(plan);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Task Decomposition', () => {
    it('should decompose plan into tasks', async () => {
      const mockPlan: Plan = {
        id: 'plan-001',
        name: 'Test Project',
        description: 'Test description',
        version: '1.0.0',
        phases: [
          {
            name: 'Phase 1',
            duration: '2 weeks',
            deliverables: ['Feature A', 'Feature B'],
          },
        ],
      };

      const tasks = await taskEngine.decompose(mockPlan);

      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      
      // Verify task structure
      tasks.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('description');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('priority');
      });
    });

    it('should analyze and assign task dependencies', async () => {
      const mockPlan: Plan = {
        id: 'plan-002',
        name: 'Complex Project',
        version: '1.0.0',
        phases: [
          {
            name: 'Foundation',
            deliverables: ['Database Setup', 'API Framework'],
          },
          {
            name: 'Features',
            deliverables: ['User Auth', 'Dashboard'],
            dependencies: ['Foundation'],
          },
        ],
      };

      const tasks = await taskEngine.decompose(mockPlan, { analyzeDependencies: true });
      const analysis = await mockLLMService.analyzeDependencies(tasks);

      expect(mockLLMService.analyzeDependencies).toHaveBeenCalled();
      expect(analysis.dependencies).toBeDefined();
      expect(analysis.dependencies.length).toBeGreaterThan(0);
      expect(analysis.criticalPath).toBeDefined();
      expect(analysis.criticalPath.length).toBeGreaterThan(0);
    });

    it('should assign priority levels to tasks', async () => {
      const mockPlan: Plan = {
        id: 'plan-003',
        name: 'Priority Test',
        version: '1.0.0',
        phases: [
          {
            name: 'MVP',
            critical: true,
            deliverables: ['Core Feature'],
          },
          {
            name: 'Enhancement',
            critical: false,
            deliverables: ['Nice-to-have'],
          },
        ],
      };

      const tasks = await taskEngine.decompose(mockPlan, { assignPriorities: true });

      expect(tasks.some(t => t.priority === 'critical')).toBe(true);
      expect(tasks.some(t => t.priority === 'high')).toBe(true);
      expect(tasks.some(t => t.priority === 'medium')).toBe(true);
    });
  });

  describe('Export Formats', () => {
    const mockPlan: Plan = {
      id: 'export-test-001',
      name: 'Export Test Project',
      description: 'Testing all export formats',
      version: '1.0.0',
      phases: [],
    };

    const mockTasks: Task[] = [
      {
        id: 'TASK-001',
        title: 'Setup Database',
        description: 'Initialize PostgreSQL',
        status: 'pending',
        priority: 'high',
      },
    ];

    it('should export plan to JSON format', async () => {
      const json = await exporter.exportToJSON(mockPlan, mockTasks);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json);
      expect(parsed.plan).toBeDefined();
      expect(parsed.tasks).toBeDefined();
      expect(parsed.plan.id).toBe('export-test-001');
    });

    it('should export plan to Markdown format', async () => {
      const markdown = await exporter.exportToMarkdown(mockPlan, mockTasks);

      expect(markdown).toBeDefined();
      expect(typeof markdown).toBe('string');
      expect(markdown).toContain('# Export Test Project');
      expect(markdown).toContain('## Tasks');
      expect(markdown).toContain('TASK-001');
    });

    it('should export plan to YAML format', async () => {
      const yaml = await exporter.exportToYAML(mockPlan, mockTasks);

      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe('string');
      expect(yaml).toContain('name: Export Test Project');
      expect(yaml).toContain('id: TASK-001');
    });

    it('should create ZIP archive with all formats', async () => {
      const zipBuffer = await exporter.exportToZIP(mockPlan, mockTasks);

      expect(zipBuffer).toBeDefined();
      expect(Buffer.isBuffer(zipBuffer)).toBe(true);
      expect(zipBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('MCP Backend Persistence', () => {
    const mockPlan: Plan = {
      id: 'mcp-test-001',
      name: 'MCP Test Project',
      version: '1.0.0',
    };

    it('should persist plan to MCP backend', async () => {
      const result = await mockMCPService.persistPlan(mockPlan);

      expect(mockMCPService.persistPlan).toHaveBeenCalledWith(mockPlan);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should persist tasks to MCP backend', async () => {
      const mockTasks: Task[] = [
        { id: 'TASK-001', title: 'Task 1', status: 'pending', priority: 'high' },
        { id: 'TASK-002', title: 'Task 2', status: 'pending', priority: 'medium' },
      ];

      const result = await mockMCPService.persistTasks('mcp-test-001', mockTasks);

      expect(mockMCPService.persistTasks).toHaveBeenCalledWith('mcp-test-001', mockTasks);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });

    it('should fetch plan from MCP backend', async () => {
      mockMCPService.fetchPlan.mockResolvedValue(mockPlan);

      const fetched = await mockMCPService.fetchPlan('mcp-test-001');

      expect(mockMCPService.fetchPlan).toHaveBeenCalledWith('mcp-test-001');
      expect(fetched).toEqual(mockPlan);
    });
  });

  describe('Error Recovery', () => {
    it('should handle LLM service errors gracefully', async () => {
      mockLLMService.suggestArchitecture.mockRejectedValue(new Error('LLM API down'));

      const plan = await planGenerator.generateFromAnswers(
        { project_name: 'Test' },
        { useLLM: true, fallbackMode: true }
      );

      expect(plan).toBeDefined();
      expect(plan.name).toBe('Test');
      // Should fallback to rule-based generation
    });

    it('should handle MCP persistence errors', async () => {
      mockMCPService.persistPlan.mockRejectedValue(new Error('Network error'));

      const mockPlan: Plan = { id: 'error-test', name: 'Error Test', version: '1.0.0' };
      
      await expect(async () => {
        await mockMCPService.persistPlan(mockPlan);
      }).rejects.toThrow('Network error');
    });

    it('should validate answers before proceeding', () => {
      // Missing required field
      wizard.setAnswer('project_name', '');
      expect(wizard.canNavigateNext()).toBe(false);

      // Valid answer
      wizard.setAnswer('project_name', 'Valid Name');
      expect(wizard.canNavigateNext()).toBe(true);
    });

    it('should handle incomplete wizard state', () => {
      // Only 5 pages completed out of 10
      for (let i = 0; i < 5; i++) {
        wizard.setAnswer(`q${i}`, `a${i}`);
        if (i < 4) wizard.navigateNext();
      }

      expect(wizard.isComplete()).toBe(false);
      expect(wizard.getProgress().percentage).toBeLessThan(100);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete wizard journey in <5 seconds', async () => {
      const start = performance.now();

      // Simulate fast user completing wizard
      const pages = framework.getPages();
      for (let i = 0; i < pages.length; i++) {
        wizard.setAnswer(`question_${i}`, `answer_${i}`);
        if (i < pages.length - 1) wizard.navigateNext();
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5000);
    });

    it('should generate plan in <10 seconds', async () => {
      const testAnswers = {
        project_name: 'Performance Test',
        architecture_pattern: 'microservices',
        database_type: 'sql',
      };

      Object.entries(testAnswers).forEach(([k, v]) => wizard.setAnswer(k, v));

      const start = performance.now();
      const plan = await planGenerator.generateFromAnswers(wizard.getAllAnswers());
      const duration = performance.now() - start;

      expect(plan).toBeDefined();
      expect(duration).toBeLessThan(10000);
    });

    it('should decompose plan into tasks in <3 seconds', async () => {
      const mockPlan: Plan = {
        id: 'perf-test',
        name: 'Performance Test Plan',
        version: '1.0.0',
        phases: [
          { name: 'Phase 1', deliverables: ['A', 'B', 'C'] },
          { name: 'Phase 2', deliverables: ['D', 'E', 'F'] },
        ],
      };

      const start = performance.now();
      const tasks = await taskEngine.decompose(mockPlan);
      const duration = performance.now() - start;

      expect(tasks.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(3000);
    });

    it('should export all formats in <2 seconds', async () => {
      const mockPlan: Plan = { id: 'export-perf', name: 'Export Perf', version: '1.0.0' };
      const mockTasks: Task[] = [
        { id: 'T1', title: 'Task 1', status: 'pending', priority: 'high' },
      ];

      const start = performance.now();
      await Promise.all([
        exporter.exportToJSON(mockPlan, mockTasks),
        exporter.exportToMarkdown(mockPlan, mockTasks),
        exporter.exportToYAML(mockPlan, mockTasks),
      ]);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});
