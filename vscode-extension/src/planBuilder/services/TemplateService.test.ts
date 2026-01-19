/**
 * TemplateService Tests
 * 
 * Tests for the plan template system including:
 * - Loading core templates
 * - Validating template structure
 * - Applying templates with customizations
 * - Creating custom templates
 * - Persisting custom templates
 */

import * as fs from 'fs';
import * as path from 'path';
import { TemplateService, getTemplateService, resetTemplateService } from './TemplateService';
import type { PlanTemplate, TemplateCategory, PlanTemplateMetadata } from '../types/PlanTemplate';
import type { PlanJSON } from '../planGenerator';

describe('TemplateService', () => {
  let service: TemplateService;
  let extensionPath: string;
  let customTemplatesPath: string;

  beforeEach(() => {
    // Reset singleton
    resetTemplateService();
    
    // Use actual extension path for testing (resolve to vscode-extension root)
    extensionPath = path.join(__dirname, '..', '..', '..');
    customTemplatesPath = path.join(extensionPath, 'templates', 'plan-templates', 'custom');
    
    // Clean up custom templates directory before each test
    if (fs.existsSync(customTemplatesPath)) {
      const files = fs.readdirSync(customTemplatesPath);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(customTemplatesPath, file));
        }
      });
    }
    
    service = new TemplateService(extensionPath);
  });

  afterEach(() => {
    // Clean up custom templates after each test
    if (fs.existsSync(customTemplatesPath)) {
      const files = fs.readdirSync(customTemplatesPath);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(customTemplatesPath, file));
        }
      });
    }
  });

  describe('Core Template Loading', () => {
    it('should load blank template', async () => {
      const template = await service.loadTemplate('core-blank');
      
      expect(template).toBeDefined();
      expect(template.metadata.id).toBe('core-blank');
      expect(template.metadata.name).toBe('Blank Project Guide');
      expect(template.metadata.category).toBe('blank');
      expect(template.metadata.isCore).toBe(true);
      expect(template.plan).toBeDefined();
      expect(template.plan.project).toBeDefined();
      expect(template.plan.features).toBeDefined();
      expect(Array.isArray(template.plan.features)).toBe(true);
      expect(template.customizationHints).toBeDefined();
      expect(template.guidance).toBeDefined();
    });

    it('should load web-app template', async () => {
      const template = await service.loadTemplate('core-web-app');
      
      expect(template).toBeDefined();
      expect(template.metadata.id).toBe('core-web-app');
      expect(template.metadata.name).toBe('Full-Stack Web Application');
      expect(template.metadata.category).toBe('web-app');
      expect(template.metadata.isCore).toBe(true);
      expect(template.plan).toBeDefined();
      expect(template.plan.project).toBeDefined();
      expect(template.plan.features).toBeDefined();
      expect(Array.isArray(template.plan.features)).toBe(true);
      expect(template.plan.features.length).toBeGreaterThan(0);
    });

    it('should load api-service template', async () => {
      const template = await service.loadTemplate('core-api-service');
      
      expect(template).toBeDefined();
      expect(template.metadata.id).toBe('core-api-service');
      expect(template.metadata.name).toBe('RESTful API Service');
      expect(template.metadata.category).toBe('api-service');
      expect(template.metadata.isCore).toBe(true);
      expect(template.plan).toBeDefined();
      expect(template.plan.architecture).toBeDefined();
    });

    it('should load cli-tool template', async () => {
      const template = await service.loadTemplate('core-cli-tool');
      
      expect(template).toBeDefined();
      expect(template.metadata.id).toBe('core-cli-tool');
      expect(template.metadata.name).toBe('Command-Line Tool');
      expect(template.metadata.category).toBe('cli-tool');
      expect(template.metadata.isCore).toBe(true);
    });

    it('should load library template', async () => {
      const template = await service.loadTemplate('core-library');
      
      expect(template).toBeDefined();
      expect(template.metadata.id).toBe('core-library');
      expect(template.metadata.name).toBe('Reusable Library/Package');
      expect(template.metadata.category).toBe('library');
      expect(template.metadata.isCore).toBe(true);
    });

    it('should throw error for non-existent template', async () => {
      await expect(service.loadTemplate('core-nonexistent')).rejects.toThrow('Template not found');
    });

    it('should cache loaded templates', async () => {
      const template1 = await service.loadTemplate('core-web-app');
      const template2 = await service.loadTemplate('core-web-app');
      
      expect(template1).toBe(template2); // Same object reference (cached)
    });
  });

  describe('Template Listing', () => {
    it('should list all core templates', async () => {
      const templates = await service.listTemplates();
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThanOrEqual(5);
      
      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain('core-blank');
      expect(templateIds).toContain('core-web-app');
      expect(templateIds).toContain('core-api-service');
      expect(templateIds).toContain('core-cli-tool');
      expect(templateIds).toContain('core-library');
    });

    it('should filter templates by category', async () => {
      const webAppTemplates = await service.listTemplates({ category: 'web-app' });
      
      expect(webAppTemplates).toBeDefined();
      expect(webAppTemplates.every(t => t.category === 'web-app')).toBe(true);
    });

    it('should filter core templates only', async () => {
      const coreTemplates = await service.listTemplates({ coreOnly: true });
      
      expect(coreTemplates).toBeDefined();
      expect(coreTemplates.every(t => t.isCore)).toBe(true);
    });

    it('should search templates by name', async () => {
      const results = await service.listTemplates({ searchQuery: 'web' });
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.name.toLowerCase().includes('web'))).toBe(true);
    });

    it('should search templates by tags', async () => {
      const results = await service.listTemplates({ tags: ['api'] });
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.tags.includes('api'))).toBe(true);
    });
  });

  describe('Template Validation', () => {
    it('should validate a valid template', async () => {
      const template = await service.loadTemplate('core-web-app');
      const validation = service.validateTemplate(template);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject template without metadata', () => {
      const invalidTemplate = {
        plan: {
          project: { name: 'Test', description: 'Test', type: 'web', status: 'planning' }
        }
      } as any;
      
      const validation = service.validateTemplate(invalidTemplate);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.field === 'metadata')).toBe(true);
    });

    it('should reject template with missing required metadata fields', () => {
      const invalidTemplate: PlanTemplate = {
        metadata: {
          id: 'test',
          name: 'Test',
          // Missing required fields
        } as any,
        plan: {
          project: { name: 'Test', description: 'Test', type: 'web', status: 'planning' }
        } as any
      };
      
      const validation = service.validateTemplate(invalidTemplate);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject template with invalid category', async () => {
      const template = await service.loadTemplate('core-web-app');
      const invalidTemplate = {
        ...template,
        metadata: {
          ...template.metadata,
          category: 'invalid-category' as TemplateCategory
        }
      };
      
      const validation = service.validateTemplate(invalidTemplate);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.field === 'metadata.category')).toBe(true);
    });
  });

  describe('Template Application', () => {
    it('should apply template without customizations', async () => {
      const plan = await service.applyTemplate('core-web-app');
      
      expect(plan).toBeDefined();
      expect(plan.metadata).toBeDefined();
      expect(plan.project).toBeDefined();
      expect(plan.features).toBeDefined();
      expect(plan.architecture).toBeDefined();
    });

    it('should apply template with custom project name', async () => {
      const customName = 'My Custom Project';
      const plan = await service.applyTemplate('core-web-app', {
        projectName: customName
      });
      
      expect(plan.project?.name).toBe(customName);
      expect(plan.metadata?.name).toBe(customName);
    });

    it('should apply template with custom description', async () => {
      const customDescription = 'A custom project description';
      const plan = await service.applyTemplate('core-web-app', {
        projectDescription: customDescription
      });
      
      expect(plan.project?.description).toBe(customDescription);
    });

    it('should preserve template ID when requested', async () => {
      const plan = await service.applyTemplate('core-web-app', {
        preserveMetadata: true
      });
      
      expect((plan.metadata as any)?.templateId).toBe('core-web-app');
    });

    it('should apply all core templates successfully', async () => {
      const templateIds = ['core-blank', 'core-web-app', 'core-api-service', 'core-cli-tool', 'core-library'];
      
      for (const templateId of templateIds) {
        const plan = await service.applyTemplate(templateId);
        expect(plan).toBeDefined();
        expect(plan.metadata).toBeDefined();
        expect(plan.project).toBeDefined();
      }
    });
  });

  describe('Custom Template Creation', () => {
    it('should save a custom template', async () => {
      const plan: PlanJSON = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'Test Author',
          status: 'draft',
          name: 'Test Plan'
        },
        project: {
          name: 'Test Project',
          description: 'A test project',
          type: 'web',
          status: 'planning'
        },
        architecture: {
          pattern: 'MVC',
          description: 'Test architecture',
          components: ['Frontend', 'Backend'],
          rationale: 'Test rationale'
        },
        features: [
          {
            id: 'FEAT-001',
            name: 'Test Feature',
            description: 'A test feature',
            priority: 'high',
            status: 'pending',
            acceptance_criteria: ['Criterion 1'],
            dependencies: [],
            effort_estimate: 5
          }
        ],
        timeline: {
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [],
          phases: []
        },
        team: {
          members: [],
          structure: 'Agile',
          communication_plan: 'Daily standups'
        },
        success_criteria: ['Criterion 1'],
        risks: [],
        assumptions: ['Assumption 1'],
        constraints: ['Constraint 1']
      };

      const result = await service.saveTemplate(plan, {
        name: 'My Custom Template',
        description: 'A template for testing',
        category: 'custom',
        tags: ['test', 'custom'],
        author: 'Test Author'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toMatch(/^custom-/);
      
      // Verify it was saved to disk
      const templatePath = path.join(customTemplatesPath, `${result.data}.json`);
      expect(fs.existsSync(templatePath)).toBe(true);
    });

    it('should load saved custom template', async () => {
      const plan: PlanJSON = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'Test Author',
          status: 'draft',
          name: 'Test Plan'
        },
        project: {
          name: 'Test Project',
          description: 'A test project',
          type: 'web',
          status: 'planning'
        },
        architecture: {
          pattern: 'MVC',
          description: 'Test architecture',
          components: ['Frontend', 'Backend'],
          rationale: 'Test rationale'
        },
        features: [],
        timeline: {
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [],
          phases: []
        },
        team: {
          members: [],
          structure: 'Agile',
          communication_plan: 'Daily standups'
        },
        success_criteria: [],
        risks: [],
        assumptions: [],
        constraints: []
      };

      const saveResult = await service.saveTemplate(plan, {
        name: 'Loadable Template',
        description: 'A template to test loading',
        category: 'custom',
        tags: ['loadable'],
        author: 'Test Author'
      });

      expect(saveResult.success).toBe(true);
      
      // Load the saved template
      const loadedTemplate = await service.loadTemplate(saveResult.data!);
      
      expect(loadedTemplate).toBeDefined();
      expect(loadedTemplate.metadata.name).toBe('Loadable Template');
      expect(loadedTemplate.metadata.isCore).toBe(false);
    });

    it('should list custom templates', async () => {
      const plan: PlanJSON = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'Test Author',
          status: 'draft',
          name: 'Test Plan'
        },
        project: {
          name: 'Test Project',
          description: 'A test project',
          type: 'web',
          status: 'planning'
        },
        architecture: {
          pattern: 'MVC',
          description: 'Test architecture',
          components: ['Frontend', 'Backend'],
          rationale: 'Test rationale'
        },
        features: [],
        timeline: {
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [],
          phases: []
        },
        team: {
          members: [],
          structure: 'Agile',
          communication_plan: 'Daily standups'
        },
        success_criteria: [],
        risks: [],
        assumptions: [],
        constraints: []
      };

      await service.saveTemplate(plan, {
        name: 'Custom Template 1',
        description: 'First custom template',
        category: 'custom',
        tags: ['custom'],
        author: 'Test Author'
      });

      const customTemplates = await service.listTemplates({ customOnly: true });
      
      expect(customTemplates.length).toBeGreaterThan(0);
      expect(customTemplates.every(t => !t.isCore)).toBe(true);
    });

    it('should delete custom template', async () => {
      const plan: PlanJSON = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'Test Author',
          status: 'draft',
          name: 'Test Plan'
        },
        project: {
          name: 'Test Project',
          description: 'A test project',
          type: 'web',
          status: 'planning'
        },
        architecture: {
          pattern: 'MVC',
          description: 'Test architecture',
          components: ['Frontend', 'Backend'],
          rationale: 'Test rationale'
        },
        features: [],
        timeline: {
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [],
          phases: []
        },
        team: {
          members: [],
          structure: 'Agile',
          communication_plan: 'Daily standups'
        },
        success_criteria: [],
        risks: [],
        assumptions: [],
        constraints: []
      };

      const saveResult = await service.saveTemplate(plan, {
        name: 'Deletable Template',
        description: 'A template to test deletion',
        category: 'custom',
        tags: ['deletable'],
        author: 'Test Author'
      });

      expect(saveResult.success).toBe(true);
      
      // Delete the template
      const deleteResult = await service.deleteTemplate(saveResult.data!);
      
      expect(deleteResult.success).toBe(true);
      
      // Verify it's deleted from disk
      const templatePath = path.join(customTemplatesPath, `${saveResult.data}.json`);
      expect(fs.existsSync(templatePath)).toBe(false);
      
      // Verify it can't be loaded
      await expect(service.loadTemplate(saveResult.data!)).rejects.toThrow('Template not found');
    });

    it('should not allow deletion of core templates', async () => {
      const result = await service.deleteTemplate('core-web-app');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete core templates');
    });
  });

  describe('Template Service Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getTemplateService(extensionPath);
      const instance2 = getTemplateService();
      
      expect(instance1).toBe(instance2);
    });

    it('should throw error if extension path not provided on first call', () => {
      resetTemplateService();
      
      expect(() => getTemplateService()).toThrow('Extension path required');
    });
  });

  describe('Cache Management', () => {
    it('should clear template cache', async () => {
      // Load a template to populate cache
      const template1 = await service.loadTemplate('core-web-app');
      expect(template1).toBeDefined();
      
      // Verify it's cached by loading again (should be same instance)
      const template2 = await service.loadTemplate('core-web-app');
      expect(template1).toBe(template2);
      
      // Clear the cache
      service.clearCache();
      
      // Load again - should be a new instance (not from cache)
      const template3 = await service.loadTemplate('core-web-app');
      expect(template3).toBeDefined();
      expect(template3).not.toBe(template1); // Different instance due to cache clear
      
      // Verify the content is still correct
      expect(template3.metadata.id).toBe('core-web-app');
      expect(template3.metadata.name).toBe('Full-Stack Web Application');
    });
  });
});
