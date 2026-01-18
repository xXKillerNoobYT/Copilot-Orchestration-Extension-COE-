/**
 * WizardService Unit Tests
 * 
 * Tests for wizard answer processing and plan generation
 */

import { describe, it, expect } from 'vitest';
import { WizardService, type WizardAnswers } from '../services/WizardService';

describe('WizardService', () => {
  const validAnswers: WizardAnswers = {
    projectName: 'Test Project',
    projectType: 'api',
    projectDescription: 'A test project for unit testing the wizard service functionality',
    objectives: [
      'Implement core API endpoints',
      'Add authentication and authorization',
      'Create comprehensive documentation',
    ],
    
    primaryUsers: ['API consumers', 'Mobile app developers'],
    secondaryUsers: ['System administrators'],
    stakeholders: ['Product Manager', 'Engineering Lead'],
    userNeeds: 'Users need a reliable, fast, and secure API to build their applications on top of',
    
    successCriteria: [
      'All API endpoints functional',
      'Response time under 200ms',
      'Zero security vulnerabilities',
    ],
    metrics: ['API response time', 'Error rate', 'Uptime percentage'],
    nonFunctionalRequirements: [
      'Must support 1000 concurrent users',
      'Must have 99.9% uptime',
    ],
    userAcceptanceCriteria: 'Users can successfully make API calls and receive expected responses with proper error handling',
    
    timeline: '3 months - Q1 2024',
    technologyConstraints: ['Node.js 18+', 'PostgreSQL', 'Docker'],
    resourceLimits: 'Team of 3 developers, budget of $50k',
    dependencies: ['Authentication service', 'Database cluster'],
    
    technicalRisks: ['Database scalability', 'API versioning complexity'],
    resourceRisks: ['Developer availability', 'Budget overruns'],
    businessRisks: ['Market competition', 'Changing requirements'],
    mitigations: [
      'Implement caching layer for scalability',
      'Use semantic versioning for API',
    ],
  };

  describe('validateAnswers', () => {
    it('should validate complete answers successfully', () => {
      const result = WizardService.validateAnswers(validAnswers);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when project name is missing', () => {
      const incomplete = { ...validAnswers, projectName: '' };
      const result = WizardService.validateAnswers(incomplete);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });

    it('should fail validation when objectives are insufficient', () => {
      const incomplete = { ...validAnswers, objectives: ['Only one'] };
      const result = WizardService.validateAnswers(incomplete);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least 3 objectives are required');
    });

    it('should fail validation when primary users are missing', () => {
      const incomplete = { ...validAnswers, primaryUsers: [] };
      const result = WizardService.validateAnswers(incomplete);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one primary user is required');
    });

    it('should fail validation when success criteria are missing', () => {
      const incomplete = { ...validAnswers, successCriteria: [] };
      const result = WizardService.validateAnswers(incomplete);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one success criterion is required');
    });

    it('should fail validation when timeline is missing', () => {
      const incomplete = { ...validAnswers, timeline: '' };
      const result = WizardService.validateAnswers(incomplete);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timeline/deadline is required');
    });

    it('should fail validation when risks are missing', () => {
      const incomplete = { ...validAnswers, technicalRisks: [] };
      const result = WizardService.validateAnswers(incomplete);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one technical risk is required');
    });
  });

  describe('generatePlan', () => {
    it('should generate a complete plan from valid answers', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      expect(plan).toBeDefined();
      expect(plan.project.name).toBe('Test Project');
      expect(plan.project.type).toBe('api');
      expect(plan.project.objectives).toHaveLength(3);
    });

    it('should include users and stakeholders in the plan', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      expect(plan.users.primary).toHaveLength(2);
      expect(plan.users.stakeholders).toHaveLength(2);
      expect(plan.users.needs).toBe(validAnswers.userNeeds);
    });

    it('should generate acceptance criteria from answers', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      expect(plan.acceptanceCriteria).toBeDefined();
      expect(plan.acceptanceCriteria.length).toBeGreaterThan(0);
      
      // Should include success criteria
      expect(plan.acceptanceCriteria).toContain('All API endpoints functional');
    });

    it('should include non-functional requirements', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      expect(plan.nonFunctionalRequirements).toHaveLength(2);
      expect(plan.nonFunctionalRequirements).toContain('Must support 1000 concurrent users');
    });

    it('should include constraints in the plan', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      expect(plan.constraints.timeline).toBe('3 months - Q1 2024');
      expect(plan.constraints.technology).toHaveLength(3);
      expect(plan.constraints.dependencies).toHaveLength(2);
    });

    it('should include risks and mitigations', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      expect(plan.risks.technical).toHaveLength(2);
      expect(plan.risks.resource).toHaveLength(2);
      expect(plan.risks.business).toHaveLength(2);
      expect(plan.risks.mitigations).toHaveLength(2);
    });

    it('should decompose project into tasks', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      expect(plan.tasks).toBeDefined();
      expect(plan.tasks.length).toBeGreaterThan(0);
      
      // Should have a setup task
      const setupTask = plan.tasks.find(t => t.id === 'task-setup-01');
      expect(setupTask).toBeDefined();
      expect(setupTask?.phase).toBe('setup');
    });

    it('should create tasks for each objective', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      const objectiveTasks = plan.tasks.filter(t => t.id.startsWith('task-objective-'));
      expect(objectiveTasks.length).toBe(3); // Same as objectives count
    });

    it('should include metadata in the generated plan', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      
      expect(plan.metadata).toBeDefined();
      expect(plan.metadata.createdBy).toBe('wizard');
      expect(plan.metadata.version).toBe('1.0.0');
      expect(plan.metadata.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('exportPlan', () => {
    it('should export plan as JSON', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      const exported = WizardService.exportPlan(plan, 'json');
      
      expect(exported).toBeDefined();
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed.project.name).toBe('Test Project');
    });

    it('should export plan as Markdown', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      const exported = WizardService.exportPlan(plan, 'markdown');
      
      expect(exported).toBeDefined();
      expect(exported).toContain('# Test Project');
      expect(exported).toContain('## Project Overview');
      expect(exported).toContain('## Users & Stakeholders');
      expect(exported).toContain('## Acceptance Criteria');
      expect(exported).toContain('## Tasks');
      expect(exported).toContain('## Risks');
    });

    it('should include checkboxes for acceptance criteria in markdown', async () => {
      const plan = await WizardService.generatePlan(validAnswers);
      const exported = WizardService.exportPlan(plan, 'markdown');
      
      // Should have checkbox format
      expect(exported).toContain('- [ ]');
    });
  });
});
