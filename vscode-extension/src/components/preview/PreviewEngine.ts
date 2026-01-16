/**
 * PreviewEngine.ts
 * 
 * Real-time rendering engine that converts wizard state into visual preview HTML.
 * Performance requirement: <500ms update latency (MANDATORY).
 * 
 * @performance Critical - Must render within 500ms
 * @author Auto Zen Agent
 * @date 2026-01-12
 */

export interface WizardState {
  currentStep: number;
  answers: Record<string, any>;
  validationErrors: Record<string, string[] | undefined>;
  isComplete: boolean;
}

export interface PreviewRenderResult {
  html: string;
  warnings: string[];
  renderTimeMs: number;
  sections: PreviewSection[];
}

export interface PreviewSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'visual' | 'code' | 'list';
  isComplete: boolean;
}

export interface RenderOptions {
  includeIncomplete?: boolean;
  highlightErrors?: boolean;
  showMetadata?: boolean;
  maxRenderTimeMs?: number; // Default 500ms
}

/**
 * PreviewEngine - High-performance wizard state renderer
 * 
 * Converts wizard answers into a visual HTML preview with the following guarantees:
 * - Render time <500ms for any valid wizard state
 * - Handles 10+ pages efficiently (no performance degradation)
 * - Memory-safe (no leaks during extended usage)
 * - Graceful degradation on invalid data
 */
export class PreviewEngine {
  private static readonly DEFAULT_MAX_RENDER_TIME = 500; // ms
  private static readonly RENDER_TIMEOUT_WARNING_THRESHOLD = 300; // ms
  
  private readonly maxRenderTimeMs: number;
  private lastRenderTimeMs: number = 0;

  constructor(options: RenderOptions = {}) {
    this.maxRenderTimeMs = options.maxRenderTimeMs ?? PreviewEngine.DEFAULT_MAX_RENDER_TIME;
  }

  /**
   * Render wizard state to HTML preview
   * 
   * @param state Current wizard state
   * @param options Rendering options
   * @returns Preview result with HTML, warnings, and performance metrics
   */
  public render(state: WizardState, options: RenderOptions = {}): PreviewRenderResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    const sections: PreviewSection[] = [];

    try {
      // Validate state
      if (!state || typeof state !== 'object') {
        warnings.push('Invalid wizard state provided');
        return this.createEmptyResult(warnings, startTime);
      }

      // Extract configuration from answers
      const projectName = state.answers.projectName || 'Untitled Project';
      const projectType = state.answers.projectType || 'unknown';
      const description = state.answers.description || '';
      const technologies = Array.isArray(state.answers.technologies) ? state.answers.technologies : [];
      const architecture = (state.answers.architecture && typeof state.answers.architecture === 'object') ? state.answers.architecture : {};
      const features = Array.isArray(state.answers.features) ? state.answers.features : [];

      // Build preview sections
      sections.push(this.renderProjectHeader(projectName, projectType, description));
      
      if (technologies.length > 0) {
        sections.push(this.renderTechnologies(technologies));
      }
      
      if (Object.keys(architecture).length > 0) {
        sections.push(this.renderArchitecture(architecture));
      }
      
      if (features.length > 0) {
        sections.push(this.renderFeatures(features));
      }

      // Add incomplete sections if requested
      if (options.includeIncomplete) {
        sections.push(...this.renderIncompleteSections(state));
      }

      // Combine sections into HTML
      const html = this.combineIntoHTML(sections, options);

      // Calculate render time
      const renderTimeMs = performance.now() - startTime;
      this.lastRenderTimeMs = renderTimeMs;

      // Performance warnings
      if (renderTimeMs > PreviewEngine.RENDER_TIMEOUT_WARNING_THRESHOLD) {
        warnings.push(`Render time ${renderTimeMs.toFixed(1)}ms approaching limit (${this.maxRenderTimeMs}ms)`);
      }

      if (renderTimeMs > this.maxRenderTimeMs) {
        warnings.push(`CRITICAL: Render time ${renderTimeMs.toFixed(1)}ms exceeded limit (${this.maxRenderTimeMs}ms)`);
      }

      return {
        html,
        warnings,
        renderTimeMs,
        sections
      };

    } catch (error) {
      warnings.push(`Rendering failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.createEmptyResult(warnings, startTime);
    }
  }

  /**
   * Render project header section
   */
  private renderProjectHeader(name: string, type: string, description: string): PreviewSection {
    const content = `
      <div class="preview-project-header">
        <h1>${this.escapeHTML(name)}</h1>
        <span class="project-type">${this.escapeHTML(type)}</span>
        ${description ? `<p class="description">${this.escapeHTML(description)}</p>` : ''}
      </div>
    `;

    return {
      id: 'project-header',
      title: 'Project Overview',
      content,
      type: 'visual',
      isComplete: !!(name && type)
    };
  }

  /**
   * Render technologies section
   */
  private renderTechnologies(technologies: string[]): PreviewSection {
    const techList = technologies
      .map(tech => `<li class="tech-item">${this.escapeHTML(tech)}</li>`)
      .join('');

    const content = `
      <div class="preview-technologies">
        <h2>Technologies</h2>
        <ul class="tech-list">${techList}</ul>
      </div>
    `;

    return {
      id: 'technologies',
      title: 'Tech Stack',
      content,
      type: 'list',
      isComplete: technologies.length > 0
    };
  }

  /**
   * Render architecture section
   */
  private renderArchitecture(architecture: Record<string, any>): PreviewSection {
    const pattern = architecture.pattern || 'Not specified';
    const layers = architecture.layers || [];
    
    const layersList = layers.length > 0
      ? `<ul>${layers.map((layer: string) => `<li>${this.escapeHTML(layer)}</li>`).join('')}</ul>`
      : '<p>No layers defined</p>';

    const content = `
      <div class="preview-architecture">
        <h2>Architecture</h2>
        <p><strong>Pattern:</strong> ${this.escapeHTML(pattern)}</p>
        <div class="layers">
          <strong>Layers:</strong>
          ${layersList}
        </div>
      </div>
    `;

    return {
      id: 'architecture',
      title: 'Architecture Design',
      content,
      type: 'visual',
      isComplete: !!(architecture.pattern)
    };
  }

  /**
   * Render features section
   */
  private renderFeatures(features: any[]): PreviewSection {
    const featureList = features
      .map((feature, index) => {
        const name = typeof feature === 'string' ? feature : feature.name || `Feature ${index + 1}`;
        const priority = typeof feature === 'object' && feature.priority ? feature.priority : 'medium';
        return `<li class="feature-item priority-${priority}">${this.escapeHTML(name)}</li>`;
      })
      .join('');

    const content = `
      <div class="preview-features">
        <h2>Features</h2>
        <ul class="feature-list">${featureList}</ul>
      </div>
    `;

    return {
      id: 'features',
      title: 'Feature List',
      content,
      type: 'list',
      isComplete: features.length > 0
    };
  }

  /**
   * Render incomplete sections (placeholders for unanswered wizard pages)
   */
  private renderIncompleteSections(state: WizardState): PreviewSection[] {
    const incompleteSections: PreviewSection[] = [];
    
    // Check for common optional sections
    if (!state.answers.testing) {
      incompleteSections.push({
        id: 'testing-placeholder',
        title: 'Testing Strategy',
        content: '<div class="incomplete">Not yet configured</div>',
        type: 'text',
        isComplete: false
      });
    }

    if (!state.answers.deployment) {
      incompleteSections.push({
        id: 'deployment-placeholder',
        title: 'Deployment Configuration',
        content: '<div class="incomplete">Not yet configured</div>',
        type: 'text',
        isComplete: false
      });
    }

    return incompleteSections;
  }

  /**
   * Combine sections into final HTML
   */
  private combineIntoHTML(sections: PreviewSection[], options: RenderOptions): string {
    const sectionHTML = sections
      .map(section => {
        const completeClass = section.isComplete ? 'complete' : 'incomplete';
        return `<section class="preview-section ${completeClass}" data-id="${section.id}">${section.content}</section>`;
      })
      .join('\n');

    return `
      <div class="wizard-preview">
        ${options.showMetadata ? this.renderMetadata() : ''}
        ${sectionHTML}
      </div>
    `;
  }

  /**
   * Render metadata section
   */
  private renderMetadata(): string {
    return `
      <div class="preview-metadata">
        <small>Last render: ${this.lastRenderTimeMs.toFixed(1)}ms</small>
      </div>
    `;
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(warnings: string[], startTime: number): PreviewRenderResult {
    return {
      html: '<div class="preview-error">Unable to render preview</div>',
      warnings,
      renderTimeMs: performance.now() - startTime,
      sections: []
    };
  }

  /**
   * HTML escape utility - works in Node and Browser environments
   */
  private escapeHTML(text: any): string {
    // Handle non-string types
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') {
      text = String(text); // Convert to string
    }
    
    // Check if document exists (browser environment)
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Node/test environment - use manual escaping
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char: string) => htmlEscapeMap[char] || char);
  }

  /**
   * Get last render time (for performance monitoring)
   */
  public getLastRenderTime(): number {
    return this.lastRenderTimeMs;
  }

  /**
   * Reset performance metrics
   */
  public resetMetrics(): void {
    this.lastRenderTimeMs = 0;
  }
}
