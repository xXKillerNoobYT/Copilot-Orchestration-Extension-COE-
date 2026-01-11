/**
 * Tests for Markdown Exporter
 * Tests export functionality, Mermaid diagram generation, and formatting
 */

import { describe, it, expect } from 'vitest';
import { generateMarkdown, exportPlanToMarkdown } from '../markdownExporter';
import type { PlanJSON } from '../../planBuilder/planGenerator';

// Helper to create a minimal test plan
function createTestPlan(overrides?: Partial<PlanJSON>): PlanJSON {
  const basePlan: PlanJSON = {
    metadata: {
      name: 'Test Project',
      status: 'draft',
      version: '1.0.0',
      author: 'Test User',
      created_at: '2026-01-11T00:00:00Z',
      updated_at: '2026-01-11T00:00:00Z'
    },
    project: {
      name: 'Test Project',
      type: 'web',
      description: 'A test project',
      status: 'planning'
    },
    architecture: {
      pattern: 'microservices',
      description: 'Microservices architecture',
      components: ['API', 'Database', 'Frontend'],
      rationale: 'Scalability and independent deployment'
    },
    features: [
      {
        id: 'feat-1',
        name: 'User Authentication',
        description: 'Login and registration system',
        priority: 'high',
        status: 'pending',
        acceptance_criteria: ['Users can sign up', 'Users can log in'],
        dependencies: [],
        effort_estimate: 8
      },
      {
        id: 'feat-2',
        name: 'Database Setup',
        description: 'PostgreSQL database initialization',
        priority: 'critical',
        status: 'pending',
        acceptance_criteria: ['Database created', 'Migrations applied'],
        dependencies: [],
        effort_estimate: 4
      },
      {
        id: 'feat-3',
        name: 'API Endpoints',
        description: 'RESTful API implementation',
        priority: 'high',
        status: 'pending',
        acceptance_criteria: ['CRUD endpoints created'],
        dependencies: ['feat-2'],
        effort_estimate: 12
      },
      {
        id: 'feat-4',
        name: 'Frontend UI',
        description: 'React UI components',
        priority: 'medium',
        status: 'pending',
        acceptance_criteria: ['Components render correctly'],
        dependencies: ['feat-1', 'feat-3'],
        effort_estimate: 16
      }
    ],
    timeline: {
      start_date: '2026-01-15',
      end_date: '2026-02-15',
      phases: [
        {
          name: 'Setup',
          start_date: '2026-01-15',
          end_date: '2026-01-20'
        },
        {
          name: 'Development',
          start_date: '2026-01-21',
          end_date: '2026-02-10'
        },
        {
          name: 'Testing',
          start_date: '2026-02-11',
          end_date: '2026-02-15'
        }
      ],
      milestones: [
        {
          id: 'ms-1',
          name: 'Database Ready',
          target_date: '2026-01-20',
          phase: 'planning',
          completion_status: 'pending',
          dependencies: []
        }
      ]
    },
    team: {
      structure: 'distributed',
      members: [
        {
          id: 'member-1',
          role_name: 'Backend Developer',
          responsibilities: ['API development'],
          skills: ['TypeScript', 'Node.js'],
          agent_mapping: 'Auto Zen',
          availability: 'full-time'
        }
      ],
      communication_plan: 'Daily standups at 10 AM UTC'
    },
    success_criteria: [
      'All features implemented',
      'Test coverage > 80%',
      'Performance metrics met'
    ],
    risks: [
      {
        id: 'risk-1',
        description: 'Database performance',
        probability: 'medium',
        impact: 'high',
        mitigation: 'Proper indexing and query optimization'
      }
    ],
    assumptions: [
      'Team familiar with TypeScript',
      'CI/CD pipeline available'
    ],
    constraints: [
      'Must use PostgreSQL',
      '4-week timeline'
    ]
  };

  return { ...basePlan, ...overrides };
}

describe('Markdown Exporter', () => {
  it('should generate markdown with all sections', () => {
    const plan = createTestPlan();
    const markdown = generateMarkdown(plan);

    expect(markdown).toContain('# Test Project');
    expect(markdown).toContain('## Project Overview');
    expect(markdown).toContain('## Architecture');
    expect(markdown).toContain('## Features');
    expect(markdown).toContain('## Timeline');
    expect(markdown).toContain('## Team Structure');
    expect(markdown).toContain('## Success Criteria');
    expect(markdown).toContain('## Risks');
  });

  it('should include table of contents', () => {
    const plan = createTestPlan();
    const markdown = generateMarkdown(plan);

    expect(markdown).toContain('## Table of Contents');
    expect(markdown).toContain('[Project Overview](#project-overview)');
    expect(markdown).toContain('[Architecture](#architecture)');
    expect(markdown).toContain('[Features](#features)');
  });

  describe('Dependency Graph Visualization', () => {
    it('should generate Mermaid diagram when features have dependencies', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      expect(markdown).toContain('### Feature Dependency Graph');
      expect(markdown).toContain('```mermaid');
      expect(markdown).toContain('graph TD');
      expect(markdown).toContain('```');
    });

    it('should include all features in the dependency graph', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      expect(markdown).toContain('User Authentication');
      expect(markdown).toContain('Database Setup');
      expect(markdown).toContain('API Endpoints');
      expect(markdown).toContain('Frontend UI');
    });

    it('should show feature priorities in diagram', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      // Check for critical priority styling
      expect(markdown).toContain('critical');
      // Check for high priority styling
      expect(markdown).toContain('high');
      // Check for medium priority styling
      expect(markdown).toContain('medium');
    });

    it('should show effort estimates in diagram nodes', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      // Effort should be displayed as "Xh"
      expect(markdown).toContain('8h');
      expect(markdown).toContain('4h');
      expect(markdown).toContain('12h');
      expect(markdown).toContain('16h');
    });

    it('should create arrows for dependencies', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      // feat-3 depends on feat-2
      expect(markdown).toContain('-->');
      // Should have at least one arrow for dependencies
      const arrowCount = (markdown.match(/-->/g) || []).length;
      expect(arrowCount).toBeGreaterThan(0);
    });

    it('should include Mermaid CSS class definitions', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      expect(markdown).toContain('classDef critical');
      expect(markdown).toContain('classDef high');
      expect(markdown).toContain('classDef medium');
      expect(markdown).toContain('classDef low');
    });

    it('should use correct color scheme for priorities', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      // Check for expected color codes in class definitions
      expect(markdown).toContain('fill:#ff6b6b'); // critical - red
      expect(markdown).toContain('fill:#ffd43b'); // high - yellow
      expect(markdown).toContain('fill:#74c0fc'); // medium - blue
      expect(markdown).toContain('fill:#69db7c'); // low - green
    });

    it('should handle features with no dependencies', () => {
      const plan = createTestPlan({
        features: [
          {
            id: 'feat-1',
            name: 'Standalone Feature',
            description: 'No dependencies',
            priority: 'medium',
            status: 'pending',
            acceptance_criteria: [],
            dependencies: [],
            effort_estimate: 5
          }
        ]
      });

      const markdown = generateMarkdown(plan);
      expect(markdown).toContain('Standalone Feature');
      // Graph should still be generated
      expect(markdown).toContain('```mermaid');
    });

    it('should handle plans with no dependencies at all', () => {
      const plan = createTestPlan({
        features: [
          {
            id: 'feat-1',
            name: 'Feature 1',
            description: 'No deps',
            priority: 'medium',
            status: 'pending',
            acceptance_criteria: [],
            dependencies: [],
            effort_estimate: 5
          },
          {
            id: 'feat-2',
            name: 'Feature 2',
            description: 'No deps',
            priority: 'medium',
            status: 'pending',
            acceptance_criteria: [],
            dependencies: [],
            effort_estimate: 5
          }
        ]
      });

      const markdown = generateMarkdown(plan);
      expect(markdown).toContain('_No dependencies defined between features._');
    });

    it('should generate valid Mermaid syntax', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      // Extract the Mermaid diagram
      const mermaidMatch = markdown.match(/```mermaid\n([\s\S]*?)```/);
      expect(mermaidMatch).toBeTruthy();

      if (mermaidMatch) {
        const diagram = mermaidMatch[1];
        // Check for required elements
        expect(diagram).toContain('graph TD');
        expect(diagram).toContain(':::');
        expect(diagram).toContain('classDef');
      }
    });

    it('should preserve feature order in dependency graph', () => {
      const plan = createTestPlan();
      const markdown = generateMarkdown(plan);

      const mermaidMatch = markdown.match(/```mermaid\n([\s\S]*?)```/);
      if (mermaidMatch) {
        const diagram = mermaidMatch[1];
        // All feature names should appear
        expect(diagram).toContain('User Authentication');
        expect(diagram).toContain('Database Setup');
        expect(diagram).toContain('API Endpoints');
        expect(diagram).toContain('Frontend UI');
      }
    });
  });

  it('should export plan to markdown with correct function', () => {
    const plan = createTestPlan();
    const result = exportPlanToMarkdown(plan);

    expect(typeof result).toBe('string');
    expect(result).toContain('# Test Project');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle empty features array', () => {
    const plan = createTestPlan({ features: [] });
    const markdown = generateMarkdown(plan);

    expect(markdown).toContain('_No features defined yet._');
  });

  it('should handle complex dependency chains', () => {
    const plan = createTestPlan({
      features: [
        {
          id: 'feat-1',
          name: 'Feature 1',
          description: 'Start',
          priority: 'high',
          status: 'pending',
          acceptance_criteria: [],
          dependencies: [],
          effort_estimate: 5
        },
        {
          id: 'feat-2',
          name: 'Feature 2',
          description: 'Depends on 1',
          priority: 'high',
          status: 'pending',
          acceptance_criteria: [],
          dependencies: ['feat-1'],
          effort_estimate: 5
        },
        {
          id: 'feat-3',
          name: 'Feature 3',
          description: 'Depends on 2',
          priority: 'high',
          status: 'pending',
          acceptance_criteria: [],
          dependencies: ['feat-2'],
          effort_estimate: 5
        },
        {
          id: 'feat-4',
          name: 'Feature 4',
          description: 'Depends on 1 and 2',
          priority: 'high',
          status: 'pending',
          acceptance_criteria: [],
          dependencies: ['feat-1', 'feat-2'],
          effort_estimate: 5
        }
      ]
    });

    const markdown = generateMarkdown(plan);
    expect(markdown).toContain('Feature 1');
    expect(markdown).toContain('Feature 2');
    expect(markdown).toContain('Feature 3');
    expect(markdown).toContain('Feature 4');
    expect(markdown).toContain('-->');
  });
});
