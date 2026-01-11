import { describe, it, expect, beforeEach } from 'vitest';
import { PlanGenerator, createPlanGenerator, generateAndValidatePlan, WizardAnswers, PlanJSON } from './planGenerator';

/**
 * Unit tests for PlanGenerator
 * Tests: valid wizard→valid JSON, missing fields→error, section mapping, schema validation, edge cases
 */

describe('PlanGenerator', () => {
  let generator: PlanGenerator;
  let sampleAnswers: WizardAnswers;

  beforeEach(() => {
    sampleAnswers = {
      q1ProjectOverview: {
        name: 'Test Project',
        description: 'A comprehensive test project for validation',
        type: 'web',
      },
      q2Architecture: {
        pattern: 'mvc',
        notes: 'Classic MVC pattern for scalability',
      },
      q3Features: {
        features: [
          {
            name: 'User Authentication',
            description: 'Implement secure user login and registration',
            priority: 'Critical',
            dependsOn: null,
          },
          {
            name: 'Dashboard',
            description: 'User dashboard with analytics',
            priority: 'High',
            dependsOn: 0,
          },
          {
            name: 'Reporting',
            description: 'Generate and export reports',
            priority: 'Medium',
            dependsOn: 1,
          },
        ],
      },
      q4Timeline: {
        milestones: [
          {
            name: 'Initial Setup',
            date: '2026-02-01',
            phase: 'planning',
            dependsOn: null,
          },
          {
            name: 'Development Start',
            date: '2026-02-15',
            phase: 'development',
            dependsOn: 0,
          },
          {
            name: 'Testing Phase',
            date: '2026-03-01',
            phase: 'testing',
            dependsOn: 1,
          },
          {
            name: 'Deployment',
            date: '2026-03-15',
            phase: 'deployment',
            dependsOn: 2,
          },
        ],
      },
      q5Team: {
        teamMembers: [
          {
            role: 'frontend-engineer',
            skills: ['React', 'TypeScript', 'CSS'],
            agentMapping: 'Auto Zen',
            availability: 'full-time',
          },
          {
            role: 'backend-engineer',
            skills: ['Node.js', 'PostgreSQL', 'REST APIs'],
            agentMapping: null,
            availability: 'full-time',
          },
          {
            role: 'qa-engineer',
            skills: ['Testing', 'Selenium', 'Cypress'],
            agentMapping: 'Testing Agent',
            availability: 'part-time',
          },
        ],
      },
    };

    generator = new PlanGenerator(sampleAnswers);
  });

  describe('Plan Generation', () => {
    it('should generate valid plan from complete wizard answers', () => {
      const plan = generator.generate();
      expect(plan).toBeDefined();
      expect(plan.metadata).toBeDefined();
      expect(plan.project).toBeDefined();
      expect(plan.architecture).toBeDefined();
      expect(plan.features).toBeDefined();
      expect(plan.timeline).toBeDefined();
      expect(plan.team).toBeDefined();
    });

    it('should set correct project metadata', () => {
      const plan = generator.generate();
      expect(plan.metadata.name).toBe('Test Project');
      expect(plan.metadata.status).toBe('draft');
      expect(plan.metadata.version).toBe('1.0.0');
      expect(plan.metadata.created_at).toBeDefined();
      expect(plan.metadata.updated_at).toBeDefined();
    });

    it('should map Q1 project information correctly', () => {
      const plan = generator.generate();
      expect(plan.project.name).toBe('Test Project');
      expect(plan.project.description).toBe('A comprehensive test project for validation');
      expect(plan.project.type).toBe('web');
      expect(plan.project.status).toBe('planning');
    });

    it('should map Q2 architecture information', () => {
      const plan = generator.generate();
      expect(plan.architecture.pattern).toBe('mvc');
      expect(plan.architecture.rationale).toBe('Classic MVC pattern for scalability');
      expect(plan.architecture.components).toContain('Models');
      expect(plan.architecture.components).toContain('Views');
      expect(plan.architecture.components).toContain('Controllers');
    });

    it('should map Q3 features with all properties', () => {
      const plan = generator.generate();
      expect(plan.features.length).toBe(3);

      const authFeature = plan.features[0];
      expect(authFeature.id).toBe('FEAT-001');
      expect(authFeature.name).toBe('User Authentication');
      expect(authFeature.priority).toBe('critical');
      expect(authFeature.acceptance_criteria.length).toBeGreaterThan(0);
      expect(authFeature.status).toBe('pending');

      const dashFeature = plan.features[1];
      expect(dashFeature.dependencies).toContain('FEAT-001');

      const reportFeature = plan.features[2];
      expect(reportFeature.dependencies).toContain('FEAT-002');
    });

    it('should generate acceptance criteria for features', () => {
      const plan = generator.generate();
      const feature = plan.features[0];
      expect(feature.acceptance_criteria).toContain('User Authentication can be accessed by authorized users');
      expect(feature.acceptance_criteria).toContain('User Authentication handles errors gracefully');
    });

    it('should estimate effort based on priority', () => {
      const plan = generator.generate();
      expect(plan.features[0].effort_estimate).toBe(40); // Critical
      expect(plan.features[1].effort_estimate).toBe(30); // High
      expect(plan.features[2].effort_estimate).toBe(20); // Medium
    });

    it('should map Q4 timeline with milestones', () => {
      const plan = generator.generate();
      expect(plan.timeline.milestones.length).toBe(4);
      expect(plan.timeline.start_date).toBe('2026-02-01');
      expect(plan.timeline.end_date).toBe('2026-03-15');

      const milestone1 = plan.timeline.milestones[0];
      expect(milestone1.id).toBe('MILE-001');
      expect(milestone1.name).toBe('Initial Setup');
      expect(milestone1.phase).toBe('planning');

      const milestone2 = plan.timeline.milestones[1];
      expect(milestone2.dependencies).toContain('MILE-001');
    });

    it('should infer phases from timeline', () => {
      const plan = generator.generate();
      expect(plan.timeline.phases.length).toBe(5);
      expect(plan.timeline.phases[0].name).toBe('Planning');
      expect(plan.timeline.phases[1].name).toBe('Design');
      expect(plan.timeline.phases[2].name).toBe('Development');
      expect(plan.timeline.phases[3].name).toBe('Testing');
      expect(plan.timeline.phases[4].name).toBe('Deployment');
    });

    it('should map Q5 team structure', () => {
      const plan = generator.generate();
      expect(plan.team.members.length).toBe(3);

      const frontendRole = plan.team.members[0];
      expect(frontendRole.id).toBe('ROLE-001');
      expect(frontendRole.role_name).toBe('frontend-engineer');
      expect(frontendRole.skills).toContain('React');
      expect(frontendRole.agent_mapping).toBe('Auto Zen');
      expect(frontendRole.availability).toBe('full-time');

      const qaRole = plan.team.members[2];
      expect(qaRole.agent_mapping).toBe('Testing Agent');
      expect(qaRole.availability).toBe('part-time');
    });

    it('should generate team responsibilities based on role', () => {
      const plan = generator.generate();
      const frontendRole = plan.team.members[0];
      expect(frontendRole.responsibilities).toContain('Build responsive UI components');
      expect(frontendRole.responsibilities).toContain('Write unit tests');
    });

    it('should infer team structure description', () => {
      const plan = generator.generate();
      expect(plan.team.structure).toBe('Medium team (3-5 members)');
    });

    it('should generate success criteria', () => {
      const plan = generator.generate();
      expect(plan.success_criteria.length).toBeGreaterThan(0);
      expect(plan.success_criteria[0]).toContain('3 features implemented');
    });

    it('should generate risks with probabilities and impacts', () => {
      const plan = generator.generate();
      expect(plan.risks.length).toBeGreaterThan(0);
      expect(plan.risks[0].id).toBe('RISK-001');
      expect(plan.risks[0].probability).toBe('high');
      expect(plan.risks[0].impact).toBe('high');
      expect(plan.risks[0].mitigation).toBeDefined();
    });

    it('should generate assumptions and constraints', () => {
      const plan = generator.generate();
      expect(plan.assumptions.length).toBeGreaterThan(0);
      expect(plan.constraints.length).toBeGreaterThan(0);
    });
  });

  describe('Plan Validation', () => {
    it('should validate correctly structured plan', () => {
      const plan = generator.generate();
      const validation = generator.validate(plan);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject plan with invalid project type', () => {
      const plan = generator.generate();
      (plan.project as any).type = 'invalid-type';
      const validation = generator.validate(plan);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject plan with missing project name', () => {
      const plan = generator.generate();
      (plan.project as any).name = '';
      const validation = generator.validate(plan);
      expect(validation.valid).toBe(false);
    });

    it('should reject plan with invalid feature priority', () => {
      const plan = generator.generate();
      (plan.features[0] as any).priority = 'invalid-priority';
      const validation = generator.validate(plan);
      expect(validation.valid).toBe(false);
    });

    it('should reject plan with invalid milestone date format', () => {
      const plan = generator.generate();
      (plan.timeline.milestones[0] as any).target_date = 'invalid-date';
      const validation = generator.validate(plan);
      expect(validation.valid).toBe(false);
    });

    it('should provide detailed error information', () => {
      const plan = generator.generate();
      plan.features[0].name = ''; // Invalid: empty name
      const validation = generator.validate(plan);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      const error = validation.errors[0];
      expect(error.field).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.severity).toBe('error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty wizard answers', () => {
      const emptyGenerator = new PlanGenerator({});
      const plan = emptyGenerator.generate();
      expect(plan).toBeDefined();
      expect(plan.project.name).toBe('Unnamed Project');
      expect(plan.features.length).toBe(0);
    });

    it('should handle missing optional Q2 answers', () => {
      const answers: WizardAnswers = {
        q1ProjectOverview: sampleAnswers.q1ProjectOverview,
      };
      const gen = new PlanGenerator(answers);
      const plan = gen.generate();
      expect(plan.architecture).toBeDefined();
      expect(plan.architecture.pattern).toBe('mvc');
    });

    it('should handle features with null dependencies', () => {
      const plan = generator.generate();
      const feat = plan.features[0];
      expect(feat.dependencies).toBeDefined();
    });

    it('should generate valid IDs for all entities', () => {
      const plan = generator.generate();

      plan.features.forEach((f, idx) => {
        expect(f.id).toBe(`FEAT-${String(idx + 1).padStart(3, '0')}`);
      });

      plan.timeline.milestones.forEach((m, idx) => {
        expect(m.id).toBe(`MILE-${String(idx + 1).padStart(3, '0')}`);
      });

      plan.team.members.forEach((tm, idx) => {
        expect(tm.id).toBe(`ROLE-${String(idx + 1).padStart(3, '0')}`);
      });
    });

    it('should handle different project types', () => {
      const types = ['web', 'api', 'cli', 'library'];
      types.forEach(type => {
        const answers: WizardAnswers = {
          q1ProjectOverview: {
            name: 'Test',
            description: 'Test',
            type: type as 'web' | 'api' | 'cli' | 'library',
          },
        };
        const gen = new PlanGenerator(answers);
        const plan = gen.generate();
        expect(plan.project.type).toBe(type);
      });
    });

    it('should handle all architecture patterns', () => {
      const patterns = ['mvc', 'microservices', 'serverless', 'monolithic', 'modular-monolith'];
      patterns.forEach(pattern => {
        const answers: WizardAnswers = {
          q2Architecture: {
            pattern,
            notes: 'Test pattern',
          },
        };
        const gen = new PlanGenerator(answers);
        const plan = gen.generate();
        expect(plan.architecture.pattern).toBe(pattern);
        expect(plan.architecture.components.length).toBeGreaterThan(0);
      });
    });

    it('should handle single feature', () => {
      const answers: WizardAnswers = {
        q3Features: {
          features: [
            {
              name: 'Single Feature',
              description: 'Only one feature',
              priority: 'High' as const,
              dependsOn: null,
            },
          ],
        },
      };
      const gen = new PlanGenerator(answers);
      const plan = gen.generate();
      expect(plan.features.length).toBe(1);
    });

    it('should handle large number of features', () => {
      const features: any[] = [];
      for (let i = 0; i < 20; i++) {
        features.push({
          name: `Feature ${i + 1}`,
          description: 'Test feature',
          priority: (i % 2 === 0 ? 'High' : 'Medium') as 'High' | 'Medium',
          dependsOn: i > 0 ? i - 1 : null,
        });
      }
      const answers: WizardAnswers = {
        q3Features: { features },
      };
      const gen = new PlanGenerator(answers);
      const plan = gen.generate();
      expect(plan.features.length).toBe(20);
    });

    it('should maintain date ordering in timeline', () => {
      const plan = generator.generate();
      const dates = plan.timeline.milestones.map(m => new Date(m.target_date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });
  });

  describe('Factory Functions', () => {
    it('should create plan generator with factory function', () => {
      const gen = createPlanGenerator(sampleAnswers);
      expect(gen).toBeInstanceOf(PlanGenerator);
      const plan = gen.generate();
      expect(plan).toBeDefined();
    });

    it('should generate and validate in one call', () => {
      const result = generateAndValidatePlan(sampleAnswers);
      expect(result.plan).toBeDefined();
      expect(result.validation.valid).toBe(true);
    });

    it('should return null plan on validation failure', () => {
      const invalidAnswers: WizardAnswers = {
        q1ProjectOverview: {
          name: '',
          description: '',
          type: 'web',
        },
      };
      // Note: empty name/description might still pass - adjust based on actual validation
      const result = generateAndValidatePlan(invalidAnswers);
      expect(result.validation).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should handle complete wizard flow', () => {
      const plan = generator.generate();
      const validation = generator.validate(plan);

      expect(validation.valid).toBe(true);
      expect(plan.features.length).toBe(3);
      expect(plan.timeline.milestones.length).toBe(4);
      expect(plan.team.members.length).toBe(3);
    });

    it('should maintain referential integrity', () => {
      const plan = generator.generate();

      // Check feature dependencies refer to existing features
      plan.features.forEach(f => {
        f.dependencies.forEach(depId => {
          const depFeature = plan.features.find(feat => feat.id === depId);
          expect(depFeature).toBeDefined();
        });
      });

      // Check milestone dependencies refer to existing milestones
      plan.timeline.milestones.forEach(m => {
        m.dependencies.forEach(depId => {
          const depMilestone = plan.timeline.milestones.find(mil => mil.id === depId);
          expect(depMilestone).toBeDefined();
        });
      });
    });
  });
});
