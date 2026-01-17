/**
 * Enhanced Markdown Export Integration Test
 * 
 * Tests the enhanced markdown exporter with full PlanJSON
 */

import { describe, it, expect } from 'vitest';
import { generateMarkdown } from '../markdownExporter';
import type { PlanJSON } from '../../planBuilder/planGenerator';

describe('Enhanced Markdown Exporter', () => {
  const testPlan: PlanJSON = {
    metadata: {
      version: '1.0.0',
      created_at: new Date('2026-01-15').toISOString(),
      updated_at: new Date('2026-01-17').toISOString(),
      author: 'Test Suite',
      status: 'in-progress',
      name: 'Enhanced Export Test',
    },
    project: {
      name: 'Multi-Format Export Test',
      description: 'A comprehensive test project for enhanced markdown export',
      type: 'web',
      status: 'in-progress',
    },
    architecture: {
      pattern: 'MVC',
      description: 'Model-View-Controller architecture',
      components: ['Frontend', 'Backend', 'Database'],
      rationale: 'Well-established pattern for web applications',
    },
    features: [
      {
        id: 'FEAT-001',
        name: 'User Authentication',
        description: 'Implement secure user authentication system',
        priority: 'critical',
        status: 'in-progress',
        acceptance_criteria: ['Login works', 'Logout works', 'Password reset works'],
        dependencies: [],
        effort_estimate: 16,
      },
      {
        id: 'FEAT-002',
        name: 'Dashboard',
        description: 'Create user dashboard',
        priority: 'high',
        status: 'pending',
        acceptance_criteria: ['Shows user data', 'Responsive design'],
        dependencies: ['FEAT-001'],
        effort_estimate: 12,
      },
    ],
    timeline: {
      start_date: '2026-01-15',
      end_date: '2026-03-15',
      milestones: [
        {
          id: 'MS-001',
          name: 'MVP Launch',
          target_date: '2026-02-15',
          phase: 'development',
          completion_status: 'pending',
          dependencies: [],
        },
      ],
      phases: [
        {
          name: 'Planning',
          start_date: '2026-01-15',
          end_date: '2026-01-22',
        },
        {
          name: 'Development',
          start_date: '2026-01-23',
          end_date: '2026-02-28',
        },
      ],
    },
    team: {
      members: [
        {
          id: 'TEAM-001',
          role_name: 'Frontend Developer',
          responsibilities: ['UI development', 'Testing'],
          skills: ['React', 'TypeScript', 'CSS'],
          agent_mapping: 'frontend-agent',
          availability: 'full-time',
        },
      ],
      structure: 'Agile team',
      communication_plan: 'Daily standups, weekly reviews',
    },
    success_criteria: [
      'All features implemented',
      'Tests passing',
      'Performance metrics met',
    ],
    risks: [
      {
        id: 'RISK-001',
        description: 'Timeline may slip',
        probability: 'medium',
        impact: 'high',
        mitigation: 'Regular progress reviews',
      },
    ],
    assumptions: ['Team has necessary skills', 'Requirements are stable'],
    constraints: ['Budget limited to $50k', 'Must launch by Q1'],
  };

  describe('Enhanced Markdown Generation', () => {
    it('should generate markdown with proper structure', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toBeDefined();
      expect(markdown.length).toBeGreaterThan(100);
      expect(typeof markdown).toBe('string');
    });

    it('should include cover page elements', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain(`# ${testPlan.metadata.name}`);
      expect(markdown).toContain(`**Status**: ${testPlan.metadata.status}`);
      expect(markdown).toContain(`**Version**: ${testPlan.metadata.version}`);
      expect(markdown).toContain(`**Author**: ${testPlan.metadata.author}`);
    });

    it('should include table of contents', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Table of Contents');
      expect(markdown).toContain('[Project Overview](#project-overview)');
      expect(markdown).toContain('[Architecture](#architecture)');
      expect(markdown).toContain('[Features](#features)');
      expect(markdown).toContain('[Timeline](#timeline)');
      expect(markdown).toContain('[Team Structure](#team-structure)');
      expect(markdown).toContain('[Risks](#risks)');
    });

    it('should include project overview section', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Project Overview');
      expect(markdown).toContain(testPlan.project.name);
      expect(markdown).toContain(testPlan.project.description);
      expect(markdown).toContain(testPlan.project.type);
    });

    it('should include architecture section', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Architecture');
      expect(markdown).toContain(testPlan.architecture.pattern);
      expect(markdown).toContain(testPlan.architecture.description);
      expect(markdown).toContain(testPlan.architecture.rationale);
    });

    it('should include features table', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Features');
      expect(markdown).toContain('| Feature | Priority | Status | Dependencies | Estimated Effort |');
      expect(markdown).toContain('User Authentication');
      expect(markdown).toContain('Dashboard');
    });

    it('should include Mermaid dependency graph', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('```mermaid');
      expect(markdown).toContain('graph TD');
      expect(markdown).toContain('classDef critical');
      expect(markdown).toContain('classDef high');
      expect(markdown).toContain('classDef medium');
      expect(markdown).toContain('classDef low');
    });

    it('should include Gantt chart timeline', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('gantt');
      expect(markdown).toContain('title Project Timeline');
      expect(markdown).toContain('dateFormat YYYY-MM-DD');
    });

    it('should include team structure', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Team Structure');
      expect(markdown).toContain('Frontend Developer');
      expect(markdown).toContain('React');
      expect(markdown).toContain('full-time');
    });

    it('should include risks section', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Risks');
      expect(markdown).toContain('Timeline may slip');
      expect(markdown).toContain('medium');
      expect(markdown).toContain('high');
      expect(markdown).toContain('Regular progress reviews');
    });

    it('should include success criteria', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Success Criteria');
      testPlan.success_criteria.forEach((criteria) => {
        expect(markdown).toContain(criteria);
      });
    });

    it('should include assumptions', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Assumptions');
      testPlan.assumptions.forEach((assumption) => {
        expect(markdown).toContain(assumption);
      });
    });

    it('should include constraints', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('## Constraints');
      testPlan.constraints.forEach((constraint) => {
        expect(markdown).toContain(constraint);
      });
    });

    it('should include footer', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('_Document generated from plan.json by Copilot Orchestration Extension_');
    });

    it('should format feature dependencies correctly', () => {
      const markdown = generateMarkdown(testPlan);
      
      // FEAT-002 depends on FEAT-001
      expect(markdown).toContain('FEAT_001 --> FEAT_002');
    });

    it('should prioritize features with color coding in Mermaid', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain(':::critical');
      expect(markdown).toContain(':::high');
      expect(markdown).toContain('fill:#ff6b6b'); // critical color
      expect(markdown).toContain('fill:#ffd43b'); // high color
    });

    it('should show feature acceptance criteria', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('**Acceptance Criteria:**');
      expect(markdown).toContain('Login works');
      expect(markdown).toContain('Logout works');
      expect(markdown).toContain('Password reset works');
    });

    it('should include milestone information', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('### Milestones');
      expect(markdown).toContain('MVP Launch');
      expect(markdown).toContain('2026-02-15');
      expect(markdown).toContain('development');
    });

    it('should include phase information', () => {
      const markdown = generateMarkdown(testPlan);
      
      expect(markdown).toContain('### Phases');
      expect(markdown).toContain('Planning');
      expect(markdown).toContain('Development');
    });

    it('should use proper markdown formatting', () => {
      const markdown = generateMarkdown(testPlan);
      
      // Check for proper headings
      expect(markdown).toMatch(/^# /m);
      expect(markdown).toMatch(/^## /m);
      expect(markdown).toMatch(/^### /m);
      
      // Check for horizontal rules
      expect(markdown).toContain('---');
      
      // Check for tables
      expect(markdown).toMatch(/\|.*\|/);
    });

    it('should handle empty sections gracefully', () => {
      const emptyPlan: PlanJSON = {
        ...testPlan,
        features: [],
        risks: [],
        assumptions: [],
        constraints: [],
      };

      const markdown = generateMarkdown(emptyPlan);
      
      expect(markdown).toContain('_No features defined yet._');
      expect(markdown).toContain('_No risks identified yet._');
      expect(markdown).toContain('_No assumptions documented yet._');
      expect(markdown).toContain('_No constraints documented yet._');
    });
  });
});
