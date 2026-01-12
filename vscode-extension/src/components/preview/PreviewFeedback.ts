/**
 * PreviewFeedback.ts
 * 
 * Computes and displays compatibility indicators and impact warnings for wizard preview.
 * Analyzes wizard answers to detect potential issues, conflicts, and provide actionable feedback.
 * 
 * @author Auto Zen Agent
 * @date 2026-01-12
 */

import type { WizardState } from './PreviewEngine';

export interface FeedbackItem {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  category: 'compatibility' | 'performance' | 'security' | 'best-practice';
  message: string;
  affectedFields: string[];
  suggestion?: string;
  severity: number; // 1 (low) - 10 (critical)
}

export interface FeedbackResult {
  items: FeedbackItem[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    successCount: number;
  };
  overallScore: number; // 0-100, higher is better
  isActionable: boolean; // True if user should fix something
}

export interface FeedbackOptions {
  includeInfo?: boolean; // Include informational messages
  includeSuccess?: boolean; // Include success messages
  severityThreshold?: number; // Only show items >= this severity
}

/**
 * PreviewFeedback - Analyzes wizard state and provides actionable feedback
 * 
 * Features:
 * - Technology compatibility checking
 * - Architecture pattern validation
 * - Performance impact warnings
 * - Security best-practice recommendations
 * - Severity-based filtering
 */
export class PreviewFeedback {
  private static readonly SEVERITY_CRITICAL = 10;
  private static readonly SEVERITY_HIGH = 7;
  private static readonly SEVERITY_MEDIUM = 5;
  private static readonly SEVERITY_LOW = 3;
  private static readonly SEVERITY_INFO = 1;

  /**
   * Analyze wizard state and generate feedback
   * 
   * @param state Current wizard state
   * @param options Feedback generation options
   * @returns Feedback result with categorized items
   */
  public analyze(state: WizardState, options: FeedbackOptions = {}): FeedbackResult {
    const items: FeedbackItem[] = [];

    // Run all analysis checks
    items.push(...this.checkTechnologyCompatibility(state));
    items.push(...this.checkArchitectureConsistency(state));
    items.push(...this.checkPerformanceImpact(state));
    items.push(...this.checkSecurityBestPractices(state));
    items.push(...this.checkCompleteness(state));

    // Filter by options
    const filteredItems = this.filterItems(items, options);

    // Calculate summary
    const summary = this.calculateSummary(filteredItems);

    // Calculate overall score
    const overallScore = this.calculateScore(filteredItems);

    // Check if action is required
    const isActionable = summary.errorCount > 0 || summary.warningCount > 0;

    return {
      items: filteredItems,
      summary,
      overallScore,
      isActionable
    };
  }

  /**
   * Check technology stack compatibility
   */
  private checkTechnologyCompatibility(state: WizardState): FeedbackItem[] {
    const items: FeedbackItem[] = [];
    const technologies = state.answers.technologies || [];
    const projectType = state.answers.projectType;

    // Example: React with API-only project
    if (technologies.includes('React') && projectType === 'api') {
      items.push({
        id: 'tech-react-api-mismatch',
        type: 'warning',
        category: 'compatibility',
        message: 'React is typically used for UI projects, but project type is "API"',
        affectedFields: ['projectType', 'technologies'],
        suggestion: 'Consider changing project type to "Web App" or removing React',
        severity: PreviewFeedback.SEVERITY_MEDIUM
      });
    }

    // Example: No database for data-heavy app
    const hasDatabase = technologies.some((tech: string) => 
      ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'].some(db => tech.includes(db))
    );
    const features = state.answers.features || [];
    const hasDataFeatures = features.some((f: any) => {
      const featureName = typeof f === 'string' ? f : f.name || '';
      return featureName.toLowerCase().includes('data') || 
             featureName.toLowerCase().includes('storage') ||
             featureName.toLowerCase().includes('database');
    });

    if (hasDataFeatures && !hasDatabase) {
      items.push({
        id: 'tech-missing-database',
        type: 'warning',
        category: 'best-practice',
        message: 'Data-related features detected but no database technology selected',
        affectedFields: ['technologies', 'features'],
        suggestion: 'Add a database technology (PostgreSQL, MongoDB, etc.)',
        severity: PreviewFeedback.SEVERITY_HIGH
      });
    }

    // Example: Duplicate technologies
    const uniqueTech = new Set(technologies);
    if (technologies.length > uniqueTech.size) {
      items.push({
        id: 'tech-duplicates',
        type: 'error',
        category: 'compatibility',
        message: 'Duplicate technologies detected in stack',
        affectedFields: ['technologies'],
        suggestion: 'Remove duplicate entries',
        severity: PreviewFeedback.SEVERITY_LOW
      });
    }

    return items;
  }

  /**
   * Check architecture pattern consistency
   */
  private checkArchitectureConsistency(state: WizardState): FeedbackItem[] {
    const items: FeedbackItem[] = [];
    const architecture = state.answers.architecture || {};
    const pattern = architecture.pattern;
    const layers = architecture.layers || [];

    // No architecture selected
    if (!pattern) {
      items.push({
        id: 'arch-not-selected',
        type: 'info',
        category: 'best-practice',
        message: 'No architecture pattern selected',
        affectedFields: ['architecture'],
        suggestion: 'Select an architecture pattern (MVC, Microservices, etc.)',
        severity: PreviewFeedback.SEVERITY_MEDIUM
      });
      return items;
    }

    // Microservices without proper layers
    if (pattern === 'Microservices' && layers.length < 2) {
      items.push({
        id: 'arch-microservices-layers',
        type: 'warning',
        category: 'best-practice',
        message: 'Microservices architecture typically requires multiple service layers',
        affectedFields: ['architecture'],
        suggestion: 'Define at least 2 service layers (e.g., API Gateway, Services)',
        severity: PreviewFeedback.SEVERITY_MEDIUM
      });
    }

    // MVC without standard layers
    if (pattern === 'MVC' && layers.length > 0) {
      const hasMVC = ['Model', 'View', 'Controller'].every(layer =>
        layers.some((l: string) => l.includes(layer))
      );
      if (!hasMVC) {
        items.push({
          id: 'arch-mvc-missing-layers',
          type: 'warning',
          category: 'best-practice',
          message: 'MVC pattern should include Model, View, and Controller layers',
          affectedFields: ['architecture'],
          suggestion: 'Add missing MVC layers',
          severity: PreviewFeedback.SEVERITY_LOW
        });
      }
    }

    return items;
  }

  /**
   * Check performance impact of selections
   */
  private checkPerformanceImpact(state: WizardState): FeedbackItem[] {
    const items: FeedbackItem[] = [];
    const technologies = state.answers.technologies || [];
    const features = state.answers.features || [];

    // Too many features without modularization
    if (features.length > 20) {
      items.push({
        id: 'perf-many-features',
        type: 'warning',
        category: 'performance',
        message: `Large number of features (${features.length}) may impact development velocity`,
        affectedFields: ['features'],
        suggestion: 'Consider breaking into multiple phases or modules',
        severity: PreviewFeedback.SEVERITY_MEDIUM
      });
    }

    // Heavy frontend frameworks
    const heavyFrameworks = ['Angular', 'Ember'];
    const hasHeavyFramework = technologies.some((tech: string) =>
      heavyFrameworks.some(heavy => tech.includes(heavy))
    );

    if (hasHeavyFramework && state.answers.projectType === 'cli') {
      items.push({
        id: 'perf-heavy-framework-cli',
        type: 'warning',
        category: 'performance',
        message: 'Heavy UI framework selected for CLI project',
        affectedFields: ['technologies', 'projectType'],
        suggestion: 'CLI tools typically use lighter frameworks',
        severity: PreviewFeedback.SEVERITY_LOW
      });
    }

    return items;
  }

  /**
   * Check security best practices
   */
  private checkSecurityBestPractices(state: WizardState): FeedbackItem[] {
    const items: FeedbackItem[] = [];
    const features = state.answers.features || [];

    // Authentication features without security tech
    const hasAuthFeatures = features.some((f: any) => {
      const featureName = typeof f === 'string' ? f : f.name || '';
      return featureName.toLowerCase().includes('auth') ||
             featureName.toLowerCase().includes('login') ||
             featureName.toLowerCase().includes('user');
    });

    const technologies = state.answers.technologies || [];
    const hasSecurityTech = technologies.some((tech: string) =>
      ['JWT', 'OAuth', 'Auth0', 'Passport'].some(sec => tech.includes(sec))
    );

    if (hasAuthFeatures && !hasSecurityTech) {
      items.push({
        id: 'security-no-auth-tech',
        type: 'error',
        category: 'security',
        message: 'Authentication features detected without security technology',
        affectedFields: ['features', 'technologies'],
        suggestion: 'Add authentication technology (JWT, OAuth, etc.)',
        severity: PreviewFeedback.SEVERITY_CRITICAL
      });
    }

    return items;
  }

  /**
   * Check wizard completeness
   */
  private checkCompleteness(state: WizardState): FeedbackItem[] {
    const items: FeedbackItem[] = [];

    // Check required fields
    if (!state.answers.projectName) {
      items.push({
        id: 'complete-no-name',
        type: 'error',
        category: 'best-practice',
        message: 'Project name not specified',
        affectedFields: ['projectName'],
        suggestion: 'Enter a project name',
        severity: PreviewFeedback.SEVERITY_HIGH
      });
    }

    if (!state.answers.description) {
      items.push({
        id: 'complete-no-description',
        type: 'warning',
        category: 'best-practice',
        message: 'Project description not specified',
        affectedFields: ['description'],
        suggestion: 'Add a brief project description',
        severity: PreviewFeedback.SEVERITY_MEDIUM
      });
    }

    const features = state.answers.features || [];
    if (features.length === 0) {
      items.push({
        id: 'complete-no-features',
        type: 'warning',
        category: 'best-practice',
        message: 'No features defined',
        affectedFields: ['features'],
        suggestion: 'Add at least one feature',
        severity: PreviewFeedback.SEVERITY_HIGH
      });
    }

    return items;
  }

  /**
   * Filter feedback items by options
   */
  private filterItems(items: FeedbackItem[], options: FeedbackOptions): FeedbackItem[] {
    return items.filter(item => {
      // Filter by type
      if (!options.includeInfo && item.type === 'info') {
        return false;
      }
      if (!options.includeSuccess && item.type === 'success') {
        return false;
      }

      // Filter by severity threshold
      if (options.severityThreshold && item.severity < options.severityThreshold) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate feedback summary
   */
  private calculateSummary(items: FeedbackItem[]): FeedbackResult['summary'] {
    return {
      errorCount: items.filter(i => i.type === 'error').length,
      warningCount: items.filter(i => i.type === 'warning').length,
      infoCount: items.filter(i => i.type === 'info').length,
      successCount: items.filter(i => i.type === 'success').length
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateScore(items: FeedbackItem[]): number {
    if (items.length === 0) {
      return 100; // Perfect score if no issues
    }

    // Calculate penalty based on severity
    const totalPenalty = items.reduce((sum, item) => {
      switch (item.type) {
        case 'error': return sum + (item.severity * 2);
        case 'warning': return sum + item.severity;
        case 'info': return sum + (item.severity * 0.5);
        default: return sum;
      }
    }, 0);

    // Start at 100, subtract penalties
    const score = Math.max(0, 100 - totalPenalty);
    return Math.round(score);
  }
}

/**
 * Create a new PreviewFeedback instance
 */
export function createFeedback(): PreviewFeedback {
  return new PreviewFeedback();
}
