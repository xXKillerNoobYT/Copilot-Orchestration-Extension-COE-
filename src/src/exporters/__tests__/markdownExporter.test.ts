import { generateMarkdown } from '../markdownExporter';
import type { PlanJSON } from '../../planBuilder/planGenerator';

jest.mock('vscode');

// Helper to create a complete plan with all required fields
const createTestPlan = (overrides?: Partial<PlanJSON>): PlanJSON => ({
  metadata: {
    name: 'Test Plan',
    description: 'A test plan',
    version: '1.0.0',
    author: 'Test Author',
    status: 'in-progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  project: {
    name: 'Test Project',
    type: 'Software Development',
    status: 'In Progress',
    description: 'Test project description',
  },
  architecture: {
    pattern: 'MVC',
    description: 'Model-View-Controller architecture',
  },
  timeline: {
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    milestones: [],
  },
  team: {
    size: 5,
    roles: [],
  },
  constraints: {
    budget: '$100,000',
    technical: [],
    business: [],
  },
  risks: [],
  dependencies: [],
  features: [],
  ...overrides,
} as PlanJSON);

describe('MarkdownExporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should export generateMarkdown function', () => {
      expect(generateMarkdown).toBeDefined();
      expect(typeof generateMarkdown).toBe('function');
    });
  });

  describe('Plan Export', () => {
    it('should export plan to markdown', () => {
      const plan = createTestPlan({
        features: [
          {
            id: 'F001',
            title: 'Task 1',
            status: 'pending',
            priority: 'high',
            description: 'Test task',
            acceptance_criteria: [],
          },
          {
            id: 'F002',
            title: 'Task 2',
            status: 'complete',
            priority: 'medium',
            description: 'Complete task',
            acceptance_criteria: [],
          },
        ],
      } as any);

      const markdown = generateMarkdown(plan);

      expect(markdown).toContain('# Test Plan');
      expect(markdown).toContain('Test task');
      expect(markdown).toContain('Complete task');
    });

    it('should handle empty plan', () => {
      const plan = createTestPlan({
        metadata: {
          name: 'Empty Plan',
          version: '1.0.0',
          author: 'Test',
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      const markdown = generateMarkdown(plan);
      expect(markdown).toContain('# Empty Plan');
    });

    it('should include task metadata', () => {
      const plan = createTestPlan({
        metadata: {
          name: 'Test Plan',
          version: '1.0.0',
          author: 'user@example.com',
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        features: [
          {
            id: 'F001',
            title: 'Task 1',
            status: 'pending',
            priority: 'high',
            description: 'Important task',
            acceptance_criteria: [],
          },
        ],
      } as any);

      const markdown = generateMarkdown(plan);
      expect(markdown).toContain('user@example.com');
    });
  });

  describe('Task Formatting', () => {
    it('should format task status', () => {
      const plan = createTestPlan({
        features: [
          { id: 'F001', title: 'Done Task', status: 'complete', priority: 'high', description: '', acceptance_criteria: [] },
          { id: 'F002', title: 'Pending Task', status: 'pending', priority: 'low', description: '', acceptance_criteria: [] },
        ],
      } as any);

      const markdown = generateMarkdown(plan);
      expect(markdown).toContain('high');
      expect(markdown).toContain('complete');
      expect(markdown).toContain('pending');
    });

    it('should include features in output', () => {
      const plan = createTestPlan({
        features: [
          {
            id: 'F001',
            title: 'Parent Task',
            status: 'pending',
            priority: 'high',
            description: 'Parent description',
            acceptance_criteria: ['AC1', 'AC2'],
          },
        ],
      } as any);

      const markdown = generateMarkdown(plan);
      expect(markdown).toContain('Parent description');
      expect(markdown).toContain('AC1');
      expect(markdown).toContain('AC2');
    });
  });

  describe('Metadata Formatting', () => {
    it('should include plan metadata in header', () => {
      const plan = createTestPlan({
        metadata: {
          name: 'Test Plan',
          author: 'Test Author',
          created_at: new Date('2026-01-01').toISOString(),
          updated_at: new Date('2026-01-15').toISOString(),
          version: '1.0.0',
          status: 'completed',
        },
      });

      const markdown = generateMarkdown(plan);
      expect(markdown).toContain('Test Author');
      expect(markdown).toContain('1.0.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle minimal plan structure', () => {
      const plan = createTestPlan();
      expect(() => generateMarkdown(plan)).not.toThrow();
    });

    it('should safely handle special characters in content', () => {
      const plan = createTestPlan({
        features: [
          {
            id: 'F001',
            title: 'Task with <special> characters',
            status: 'pending',
            priority: 'high',
            description: 'Description',
            acceptance_criteria: [],
          },
        ],
      } as any);

      const markdown = generateMarkdown(plan);
      expect(markdown).toBeDefined();
    });
  });
});
