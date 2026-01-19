/**
 * Plan Template Type Definitions
 * 
 * Defines the structure and types for plan templates, enabling users to
 * start projects from predefined templates or save custom templates.
 */

import type { PlanJSON } from '../planGenerator';

/**
 * Template categories for organizing and filtering templates
 */
export type TemplateCategory = 'blank' | 'web-app' | 'api-service' | 'cli-tool' | 'library' | 'custom';

/**
 * Template metadata containing descriptive information
 */
export interface PlanTemplateMetadata {
  /** Unique identifier for the template */
  id: string;

  /** Human-readable name */
  name: string;

  /** Detailed description of what this template provides */
  description: string;

  /** Template category for filtering */
  category: TemplateCategory;

  /** Tags for search and categorization */
  tags: string[];

  /** Template author/creator */
  author: string;

  /** Template version (semver format) */
  version: string;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Whether this is a core (built-in) or custom template */
  isCore: boolean;

  /** Optional icon name (VS Code icon ID) */
  icon?: string;

  /** Estimated project completion time */
  estimatedDuration?: string;

  /** Recommended team size */
  recommendedTeamSize?: number;
}

/**
 * Complete plan template with metadata and plan content
 */
export interface PlanTemplate {
  /** Template metadata */
  metadata: PlanTemplateMetadata;

  /** The plan structure (based on PlanJSON) */
  plan: Omit<PlanJSON, 'metadata'>;

  /** Optional customization hints for the template */
  customizationHints?: {
    /** Fields that should be customized before use */
    requiredCustomizations: string[];

    /** Suggested customizations with descriptions */
    optionalCustomizations: Array<{
      field: string;
      description: string;
      example?: string;
    }>;
  };
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  /** Whether the template is valid */
  valid: boolean;

  /** Validation errors (if any) */
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;

  /** Validation warnings (non-blocking) */
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Template application options
 */
export interface TemplateApplicationOptions {
  /** Custom project name to override template default */
  projectName?: string;

  /** Custom project description */
  projectDescription?: string;

  /** Additional customizations to apply */
  customizations?: Record<string, unknown>;

  /** Whether to preserve template metadata in resulting plan */
  preserveMetadata?: boolean;
}

/**
 * Template save options
 */
export interface TemplateSaveOptions {
  /** Template name */
  name: string;

  /** Template description */
  description: string;

  /** Template category */
  category: TemplateCategory;

  /** Template tags */
  tags: string[];

  /** Template author */
  author: string;

  /** Whether to make this template public/shareable */
  isPublic?: boolean;
}

/**
 * Template list filter options
 */
export interface TemplateListOptions {
  /** Filter by category */
  category?: TemplateCategory;

  /** Filter by tags (any match) */
  tags?: string[];

  /** Search query (matches name, description, tags) */
  searchQuery?: string;

  /** Show only core templates */
  coreOnly?: boolean;

  /** Show only custom templates */
  customOnly?: boolean;

  /** Sort order */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'category';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Template operation result
 */
export interface TemplateOperationResult<T = void> {
  /** Whether the operation succeeded */
  success: boolean;

  /** Result data (if successful) */
  data?: T;

  /** Error message (if failed) */
  error?: string;

  /** Warnings (non-blocking) */
  warnings?: string[];
}
