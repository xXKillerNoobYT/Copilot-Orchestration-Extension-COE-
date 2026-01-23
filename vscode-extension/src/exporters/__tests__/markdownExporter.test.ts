import { MarkdownExporter } from '../markdownExporter';

jest.mock('vscode');

describe('MarkdownExporter', () => {
  let exporter: MarkdownExporter;

  beforeEach(() => {
    jest.clearAllMocks();
    exporter = new MarkdownExporter();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(exporter).toBeDefined();
      expect(MarkdownExporter).toBeDefined();
    });
  });

  describe('Plan Export', () => {
    it('should export plan to markdown', () => {
      const plan = {
        title: 'Test Plan',
        description: 'A test plan',
        tasks: [
          { id: '1', title: 'Task 1', status: 'pending' },
          { id: '2', title: 'Task 2', status: 'complete' },
        ],
      };

      const markdown = exporter.exportPlan(plan);

      expect(markdown).toContain('# Test Plan');
      expect(markdown).toContain('Task 1');
      expect(markdown).toContain('Task 2');
    });

    it('should handle empty plan', () => {
      const plan = {
        title: 'Empty Plan',
        description: '',
        tasks: [],
      };

      const markdown = exporter.exportPlan(plan);
      expect(markdown).toContain('# Empty Plan');
      expect(markdown).toContain('No tasks');
    });

    it('should include task metadata', () => {
      const plan = {
        title: 'Test Plan',
        tasks: [
          {
            id: '1',
            title: 'Task 1',
            status: 'pending',
            priority: 'high',
            assignee: 'user@example.com',
          },
        ],
      };

      const markdown = exporter.exportPlan(plan);
      expect(markdown).toContain('high');
      expect(markdown).toContain('user@example.com');
    });
  });

  describe('Task Formatting', () => {
    it('should format task status with checkboxes', () => {
      const plan = {
        tasks: [
          { id: '1', title: 'Done Task', status: 'complete' },
          { id: '2', title: 'Pending Task', status: 'pending' },
        ],
      };

      const markdown = exporter.exportPlan(plan);
      expect(markdown).toContain('[x]');
      expect(markdown).toContain('[ ]');
    });

    it('should format nested subtasks', () => {
      const plan = {
        tasks: [
          {
            id: '1',
            title: 'Parent Task',
            subtasks: [
              { id: '1.1', title: 'Subtask 1' },
              { id: '1.2', title: 'Subtask 2' },
            ],
          },
        ],
      };

      const markdown = exporter.exportPlan(plan);
      expect(markdown).toContain('Subtask 1');
      expect(markdown).toContain('Subtask 2');
    });
  });

  describe('Metadata Formatting', () => {
    it('should include plan metadata in frontmatter', () => {
      const plan = {
        title: 'Test Plan',
        metadata: {
          author: 'Test Author',
          created: new Date('2026-01-01').toISOString(),
          version: '1.0.0',
        },
        tasks: [],
      };

      const markdown = exporter.exportPlan(plan);
      expect(markdown).toContain('---');
      expect(markdown).toContain('Test Author');
      expect(markdown).toContain('1.0.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid plan structure', () => {
      const invalidPlan: any = { invalid: 'structure' };
      expect(() => exporter.exportPlan(invalidPlan)).toThrow();
    });

    it('should sanitize malicious markdown', () => {
      const plan = {
        title: 'Test Plan',
        tasks: [
          {
            id: '1',
            title: '<script>alert("xss")</script>',
          },
        ],
      };

      const markdown = exporter.exportPlan(plan);
      expect(markdown).not.toContain('<script>');
    });
  });
});
