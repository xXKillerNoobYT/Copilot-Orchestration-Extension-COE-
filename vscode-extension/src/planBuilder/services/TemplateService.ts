/**
 * Template Service
 * 
 * Handles loading, validation, listing, and application of plan templates.
 * Manages both core (built-in) and custom (user-created) templates.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  PlanTemplate,
  PlanTemplateMetadata,
  TemplateValidationResult,
  TemplateApplicationOptions,
  TemplateListOptions,
  TemplateOperationResult,
  TemplateSaveOptions
} from '../types/PlanTemplate';
import type { PlanJSON } from '../planGenerator';

/**
 * Template service for managing plan templates
 */
export class TemplateService {
  private templateCache: Map<string, PlanTemplate> = new Map();
  private metadataCache: Map<string, PlanTemplateMetadata> = new Map();
  private readonly coreTemplatesPath: string;
  private readonly customTemplatesPath: string;

  constructor(extensionPath: string) {
    this.coreTemplatesPath = path.join(extensionPath, 'templates', 'plan-templates');
    this.customTemplatesPath = path.join(this.coreTemplatesPath, 'custom');
    this.ensureCustomTemplatesDirectory();
  }

  /**
   * Ensure custom templates directory exists
   */
  private ensureCustomTemplatesDirectory(): void {
    if (!fs.existsSync(this.customTemplatesPath)) {
      fs.mkdirSync(this.customTemplatesPath, { recursive: true });
    }
  }

  /**
   * Load a template by ID
   * @param templateId Template identifier (e.g., 'core-web-app' or 'custom-my-template')
   * @returns Promise resolving to the template
   */
  async loadTemplate(templateId: string): Promise<PlanTemplate> {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    // Determine template file path
    const isCustom = templateId.startsWith('custom-');
    const fileName = isCustom 
      ? `${templateId}.json` 
      : `${templateId.replace('core-', '')}-template.json`;
    
    const templatePath = isCustom
      ? path.join(this.customTemplatesPath, fileName)
      : path.join(this.coreTemplatesPath, fileName);

    // Load and parse template
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateId}`);
    }

    try {
      const fileContent = fs.readFileSync(templatePath, 'utf-8');
      const template: PlanTemplate = JSON.parse(fileContent);

      // Validate template structure
      const validation = this.validateTemplate(template);
      if (!validation.valid) {
        const errors = validation.errors
          .filter(e => e.severity === 'error')
          .map(e => `${e.field}: ${e.message}`)
          .join(', ');
        throw new Error(`Invalid template structure: ${errors}`);
      }

      // Cache the template
      this.templateCache.set(templateId, template);
      this.metadataCache.set(templateId, template.metadata);

      return template;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in template ${templateId}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * List all available templates with optional filtering
   * @param options Filter and sort options
   * @returns Promise resolving to array of template metadata
   */
  async listTemplates(options?: TemplateListOptions): Promise<PlanTemplateMetadata[]> {
    const allMetadata: PlanTemplateMetadata[] = [];

    // Load core templates if not filtered to custom only
    if (!options?.customOnly) {
      const coreFiles = fs.readdirSync(this.coreTemplatesPath)
        .filter(f => f.endsWith('-template.json') && !f.startsWith('.'));
      
      for (const file of coreFiles) {
        const templateId = `core-${file.replace('-template.json', '')}`;
        try {
          const template = await this.loadTemplate(templateId);
          allMetadata.push(template.metadata);
        } catch (error) {
          console.warn(`Failed to load template ${templateId}:`, error);
        }
      }
    }

    // Load custom templates if not filtered to core only
    if (!options?.coreOnly && fs.existsSync(this.customTemplatesPath)) {
      const customFiles = fs.readdirSync(this.customTemplatesPath)
        .filter(f => f.endsWith('.json') && !f.startsWith('.'));
      
      for (const file of customFiles) {
        const templateId = file.replace('.json', '');
        try {
          const template = await this.loadTemplate(templateId);
          allMetadata.push(template.metadata);
        } catch (error) {
          console.warn(`Failed to load custom template ${templateId}:`, error);
        }
      }
    }

    // Apply filters
    let filtered = allMetadata;

    if (options?.category) {
      filtered = filtered.filter(t => t.category === options.category);
    }

    if (options?.tags && options.tags.length > 0) {
      filtered = filtered.filter(t => 
        t.tags.some(tag => options.tags!.includes(tag))
      );
    }

    if (options?.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (options?.sortBy) {
      const sortDirection = options.sortDirection === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * sortDirection;
        }
        
        return 0;
      });
    }

    return filtered;
  }

  /**
   * Validate template structure
   * @param template Template to validate
   * @returns Validation result with errors and warnings
   */
  validateTemplate(template: PlanTemplate): TemplateValidationResult {
    const errors: TemplateValidationResult['errors'] = [];
    const warnings: TemplateValidationResult['warnings'] = [];

    // Validate metadata
    if (!template.metadata) {
      errors.push({ field: 'metadata', message: 'Missing metadata', severity: 'error' });
      return { valid: false, errors, warnings };
    }

    const required = ['id', 'name', 'description', 'category', 'tags', 'author', 'version'];
    for (const field of required) {
      if (!(field in template.metadata)) {
        errors.push({ 
          field: `metadata.${field}`, 
          message: `Missing required field: ${field}`,
          severity: 'error'
        });
      }
    }

    // Validate category
    const validCategories = ['blank', 'web-app', 'api-service', 'cli-tool', 'library', 'custom'];
    if (!validCategories.includes(template.metadata.category)) {
      errors.push({
        field: 'metadata.category',
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        severity: 'error'
      });
    }

    // Validate plan structure
    if (!template.plan) {
      errors.push({ field: 'plan', message: 'Missing plan content', severity: 'error' });
    } else {
      // Check for essential plan fields
      if (!template.plan.project) {
        errors.push({ 
          field: 'plan.project', 
          message: 'Missing project information',
          severity: 'error'
        });
      }

      if (!template.plan.features || template.plan.features.length === 0) {
        warnings.push({
          field: 'plan.features',
          message: 'Template has no features defined'
        });
      }
    }

    // Validate customization hints if present
    if (template.customizationHints) {
      if (!Array.isArray(template.customizationHints.requiredCustomizations)) {
        errors.push({
          field: 'customizationHints.requiredCustomizations',
          message: 'Required customizations must be an array',
          severity: 'error'
        });
      }

      if (template.customizationHints.optionalCustomizations && 
          !Array.isArray(template.customizationHints.optionalCustomizations)) {
        errors.push({
          field: 'customizationHints.optionalCustomizations',
          message: 'Optional customizations must be an array',
          severity: 'error'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Apply a template with optional customizations
   * @param templateId Template identifier
   * @param options Application options including customizations
   * @returns Promise resolving to the customized plan
   */
  async applyTemplate(
    templateId: string, 
    options?: TemplateApplicationOptions
  ): Promise<PlanJSON> {
    const template = await this.loadTemplate(templateId);

    // Start with the template plan and add metadata
    const plan: PlanJSON = {
      ...template.plan as any,
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: options?.customizations?.author as string || 'Unknown',
        status: 'draft' as const,
        name: options?.projectName || template.plan.project?.name || 'Untitled Project',
        ...(options?.preserveMetadata ? { templateId: template.metadata.id } as any : {})
      }
    };

    // Apply customizations
    if (options?.projectName && plan.project) {
      plan.project.name = options.projectName;
    }

    if (options?.projectDescription && plan.project) {
      plan.project.description = options.projectDescription;
    }

    if (options?.customizations) {
      // Deep merge customizations into plan
      Object.entries(options.customizations).forEach(([key, value]) => {
        if (key in plan && typeof value === 'object' && !Array.isArray(value)) {
          plan[key as keyof PlanJSON] = {
            ...(plan[key as keyof PlanJSON] as object),
            ...(value as object)
          } as any;
        } else {
          (plan as any)[key] = value;
        }
      });
    }

    return plan;
  }

  /**
   * Save a plan as a custom template
   * @param plan Plan to save as template
   * @param options Template save options
   * @returns Promise resolving to operation result with template ID
   */
  async saveTemplate(
    plan: PlanJSON,
    options: TemplateSaveOptions
  ): Promise<TemplateOperationResult<string>> {
    try {
      // Generate template ID
      const templateId = `custom-${this.generateTemplateId(options.name)}`;
      
      // Create template structure
      // Extract metadata from plan and create clean plan copy
      const { metadata: _, ...planWithoutMetadata } = plan;
      
      const template: PlanTemplate = {
        metadata: {
          id: templateId,
          name: options.name,
          description: options.description,
          category: options.category,
          tags: options.tags,
          author: options.author,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isCore: false
        },
        plan: planWithoutMetadata as Omit<PlanJSON, 'metadata'>
      };

      // Validate template
      const validation = this.validateTemplate(template);
      if (!validation.valid) {
        const errors = validation.errors
          .filter(e => e.severity === 'error')
          .map(e => e.message)
          .join(', ');
        return {
          success: false,
          error: `Template validation failed: ${errors}`
        };
      }

      // Save to disk
      const templatePath = path.join(this.customTemplatesPath, `${templateId}.json`);
      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf-8');

      // Update cache
      this.templateCache.set(templateId, template);
      this.metadataCache.set(templateId, template.metadata);

      return {
        success: true,
        data: templateId,
        warnings: validation.warnings.map(w => w.message)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving template'
      };
    }
  }

  /**
   * Delete a custom template
   * @param templateId Template identifier
   * @returns Promise resolving to operation result
   */
  async deleteTemplate(templateId: string): Promise<TemplateOperationResult> {
    try {
      // Prevent deletion of core templates
      if (!templateId.startsWith('custom-')) {
        return {
          success: false,
          error: 'Cannot delete core templates'
        };
      }

      const templatePath = path.join(this.customTemplatesPath, `${templateId}.json`);
      
      if (!fs.existsSync(templatePath)) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      // Delete from disk
      fs.unlinkSync(templatePath);

      // Remove from cache
      this.templateCache.delete(templateId);
      this.metadataCache.delete(templateId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting template'
      };
    }
  }

  /**
   * Clear template cache (useful for testing or reloading)
   */
  clearCache(): void {
    this.templateCache.clear();
    this.metadataCache.clear();
  }

  /**
   * Generate a URL-safe template ID from a name
   * @param name Template name
   * @returns URL-safe ID
   */
  private generateTemplateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

/**
 * Singleton instance for use in VS Code extension
 */
let templateServiceInstance: TemplateService | null = null;

/**
 * Get or create the TemplateService singleton
 * @param extensionPath Extension path (required for first call)
 * @returns TemplateService instance
 */
export function getTemplateService(extensionPath?: string): TemplateService {
  if (!templateServiceInstance) {
    if (!extensionPath) {
      throw new Error('Extension path required for first TemplateService initialization');
    }
    templateServiceInstance = new TemplateService(extensionPath);
  }
  return templateServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetTemplateService(): void {
  templateServiceInstance = null;
}
