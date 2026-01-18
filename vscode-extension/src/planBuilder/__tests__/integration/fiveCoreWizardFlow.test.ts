/**
 * Five Core Wizard Questions - Integration Test
 * 
 * Tests the complete flow of the Five Core Questions wizard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WizardService, type WizardAnswers } from '../../services/WizardService';

describe('Five Core Wizard Questions - Integration Flow', () => {
  let wizardAnswers: Partial<WizardAnswers>;

  beforeEach(() => {
    wizardAnswers = {};
  });

  describe('Question 1: What are you building?', () => {
    it('should collect project name, type, description, and objectives', () => {
      wizardAnswers.projectName = 'E-Commerce Platform';
      wizardAnswers.projectType = 'ui';
      wizardAnswers.projectDescription = 'A modern e-commerce platform for selling digital and physical products with integrated payment processing';
      wizardAnswers.objectives = [
        'Provide seamless shopping experience',
        'Integrate with multiple payment gateways',
        'Support inventory management',
        'Enable multi-language support',
      ];

      expect(wizardAnswers.projectName).toBeDefined();
      expect(wizardAnswers.projectType).toBe('ui');
      expect(wizardAnswers.objectives).toHaveLength(4);
    });

    it('should validate minimum objectives requirement', () => {
      const incomplete = {
        projectName: 'Test',
        projectType: 'api',
        projectDescription: 'A test project description',
        objectives: ['Only one', 'Only two'], // Less than 3
      };

      const validation = WizardService.validateAnswers(incomplete as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('At least 3 objectives are required');
    });
  });

  describe('Question 2: Who are the users/stakeholders?', () => {
    it('should collect users and stakeholders information', () => {
      wizardAnswers.primaryUsers = ['Online shoppers', 'Mobile app users'];
      wizardAnswers.secondaryUsers = ['Store administrators', 'Customer support'];
      wizardAnswers.stakeholders = ['CEO', 'Product Manager', 'Marketing Director'];
      wizardAnswers.userNeeds = 'Users need a fast, intuitive platform to browse products, make purchases, and track orders';

      expect(wizardAnswers.primaryUsers).toHaveLength(2);
      expect(wizardAnswers.stakeholders).toHaveLength(3);
      expect(wizardAnswers.userNeeds).toContain('fast');
    });
  });

  describe('Question 3: What are success criteria?', () => {
    it('should collect success criteria and metrics', () => {
      wizardAnswers.successCriteria = [
        'Users can complete purchase in under 3 minutes',
        'Cart abandonment rate below 20%',
        'Payment success rate above 99%',
      ];
      wizardAnswers.metrics = [
        'Average checkout time',
        'Conversion rate',
        'Payment success rate',
      ];
      wizardAnswers.nonFunctionalRequirements = [
        'Page load time under 2 seconds',
        'Support 10,000 concurrent users',
        'GDPR compliant',
      ];
      wizardAnswers.userAcceptanceCriteria = 'Users can browse products, add to cart, checkout, and receive confirmation email';

      expect(wizardAnswers.successCriteria).toHaveLength(3);
      expect(wizardAnswers.metrics).toHaveLength(3);
      expect(wizardAnswers.nonFunctionalRequirements).toHaveLength(3);
    });
  });

  describe('Question 4: What are constraints?', () => {
    it('should collect timeline and constraints', () => {
      wizardAnswers.timeline = '6 months - Launch by Q2 2024';
      wizardAnswers.technologyConstraints = [
        'Must use React for frontend',
        'Must use Node.js backend',
        'Must deploy on AWS',
      ];
      wizardAnswers.resourceLimits = 'Team of 5 developers, 2 designers, budget of $200k';
      wizardAnswers.dependencies = [
        'Payment gateway API',
        'Shipping provider integration',
        'Analytics platform',
      ];

      expect(wizardAnswers.timeline).toContain('6 months');
      expect(wizardAnswers.technologyConstraints).toHaveLength(3);
      expect(wizardAnswers.dependencies).toHaveLength(3);
    });
  });

  describe('Question 5: What are risks?', () => {
    it('should collect risks and mitigations', () => {
      wizardAnswers.technicalRisks = [
        'Payment gateway integration complexity',
        'Performance under high load',
      ];
      wizardAnswers.resourceRisks = [
        'Key developer leaving',
        'Budget constraints',
      ];
      wizardAnswers.businessRisks = [
        'Market competition',
        'Changing regulations',
      ];
      wizardAnswers.mitigations = [
        'Early POC for payment integration',
        'Load testing from day 1',
        'Knowledge sharing sessions',
      ];

      expect(wizardAnswers.technicalRisks).toHaveLength(2);
      expect(wizardAnswers.resourceRisks).toHaveLength(2);
      expect(wizardAnswers.businessRisks).toHaveLength(2);
      expect(wizardAnswers.mitigations).toHaveLength(3);
    });
  });

  describe('Complete Wizard Flow', () => {
    beforeEach(() => {
      // Simulate completing all 5 questions
      wizardAnswers = {
        // Q1
        projectName: 'E-Commerce Platform',
        projectType: 'ui',
        projectDescription: 'A modern e-commerce platform for selling digital and physical products',
        objectives: [
          'Provide seamless shopping experience',
          'Integrate with multiple payment gateways',
          'Support inventory management',
        ],
        
        // Q2
        primaryUsers: ['Online shoppers', 'Mobile users'],
        secondaryUsers: ['Store administrators'],
        stakeholders: ['CEO', 'Product Manager'],
        userNeeds: 'Users need a fast, intuitive platform to browse and purchase products',
        
        // Q3
        successCriteria: [
          'Users can complete purchase in under 3 minutes',
          'Cart abandonment rate below 20%',
        ],
        metrics: ['Checkout time', 'Conversion rate'],
        nonFunctionalRequirements: [
          'Page load time under 2 seconds',
          'GDPR compliant',
        ],
        userAcceptanceCriteria: 'Users can browse, add to cart, checkout, and receive confirmation',
        
        // Q4
        timeline: '6 months - Q2 2024',
        technologyConstraints: ['React', 'Node.js', 'AWS'],
        resourceLimits: 'Team of 5, budget $200k',
        dependencies: ['Payment API', 'Shipping API'],
        
        // Q5
        technicalRisks: ['Payment integration complexity'],
        resourceRisks: ['Budget constraints'],
        businessRisks: ['Market competition'],
        mitigations: ['Early POC', 'Load testing'],
      } as WizardAnswers;
    });

    it('should validate all answers as complete', () => {
      const validation = WizardService.validateAnswers(wizardAnswers);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should generate a complete project plan', async () => {
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      
      expect(plan).toBeDefined();
      expect(plan.project.name).toBe('E-Commerce Platform');
      expect(plan.users.primary).toContain('Online shoppers');
      expect(plan.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('should auto-generate acceptance criteria from success criteria', async () => {
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      
      const hasSuccessCriteria = plan.acceptanceCriteria.some(
        criteria => criteria.includes('Users can complete purchase in under 3 minutes')
      );
      expect(hasSuccessCriteria).toBe(true);
    });

    it('should decompose project into tasks by phase', async () => {
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      
      const phases = new Set(plan.tasks.map(t => t.phase));
      expect(phases.size).toBeGreaterThan(0);
      
      // Should have at least setup and development phases
      expect(phases.has('setup')).toBe(true);
      expect(phases.has('development')).toBe(true);
    });

    it('should create tasks with proper dependencies', async () => {
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      
      const setupTask = plan.tasks.find(t => t.phase === 'setup');
      const devTasks = plan.tasks.filter(t => t.phase === 'development');
      
      expect(setupTask).toBeDefined();
      expect(devTasks.length).toBeGreaterThan(0);
      
      // Development tasks should depend on setup
      const hasSetupDependency = devTasks.some(
        task => task.dependencies.includes('task-setup-01')
      );
      expect(hasSetupDependency).toBe(true);
    });

    it('should create tasks for each objective', async () => {
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      
      const objectiveTasks = plan.tasks.filter(t => t.id.startsWith('task-objective-'));
      expect(objectiveTasks.length).toBe(wizardAnswers.objectives!.length);
    });

    it('should include risk mitigation tasks when mitigations provided', async () => {
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      
      const mitigationTasks = plan.tasks.filter(t => t.phase === 'risk-management');
      expect(mitigationTasks.length).toBe(wizardAnswers.mitigations!.length);
    });

    it('should export plan to markdown format', async () => {
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      const markdown = WizardService.exportPlan(plan, 'markdown');
      
      expect(markdown).toContain('# E-Commerce Platform');
      expect(markdown).toContain('## Project Overview');
      expect(markdown).toContain('## Users & Stakeholders');
      expect(markdown).toContain('## Acceptance Criteria');
      expect(markdown).toContain('## Tasks');
      expect(markdown).toContain('## Risks');
    });

    it('should preserve all constraints in the generated plan', async () => {
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      
      expect(plan.constraints.timeline).toBe(wizardAnswers.timeline);
      expect(plan.constraints.technology).toEqual(wizardAnswers.technologyConstraints);
      expect(plan.constraints.resources).toBe(wizardAnswers.resourceLimits);
      expect(plan.constraints.dependencies).toEqual(wizardAnswers.dependencies);
    });

    it('should include metadata with creation timestamp', async () => {
      const beforeGeneration = new Date();
      const plan = await WizardService.generatePlan(wizardAnswers as WizardAnswers);
      const afterGeneration = new Date();
      
      expect(plan.metadata.createdAt).toBeInstanceOf(Date);
      expect(plan.metadata.createdAt.getTime()).toBeGreaterThanOrEqual(beforeGeneration.getTime());
      expect(plan.metadata.createdAt.getTime()).toBeLessThanOrEqual(afterGeneration.getTime());
      expect(plan.metadata.createdBy).toBe('wizard');
    });
  });

  describe('Error Handling', () => {
    it('should handle incomplete answers gracefully', () => {
      const incomplete = {
        projectName: 'Test',
        // Missing other required fields
      };

      const validation = WizardService.validateAnswers(incomplete as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should provide clear validation error messages', () => {
      const incomplete = {
        projectName: '',
        projectType: undefined,
        objectives: [],
      };

      const validation = WizardService.validateAnswers(incomplete as any);
      
      expect(validation.errors).toContain('Project name is required');
      expect(validation.errors).toContain('Project type is required');
      expect(validation.errors).toContain('At least 3 objectives are required');
    });
  });
});
