/**
 * Plan Context Service
 * 
 * Reads project plan documents from Docs/Plan folder and provides
 * context for AI-assisted question generation.
 * 
 * This service enables dynamic, self-building questions that adapt
 * to the specific project type and plan details.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface PlanContext {
  projectDescription: string;
  features: string[];
  architectureNotes: string;
  constraints: string[];
  technicalRequirements: string[];
}

export class PlanContextService {
  private static instance: PlanContextService;
  private planContext: PlanContext | null = null;
  private workspaceRoot: string | null = null;

  private constructor() {
    // Initialize workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.workspaceRoot = workspaceFolders[0].uri.fsPath;
    }
  }

  static getInstance(): PlanContextService {
    if (!PlanContextService.instance) {
      PlanContextService.instance = new PlanContextService();
    }
    return PlanContextService.instance;
  }

  /**
   * Load plan context from Docs/Plan folder
   */
  async loadPlanContext(): Promise<PlanContext> {
    if (this.planContext) {
      return this.planContext;
    }

    if (!this.workspaceRoot) {
      return this.getEmptyContext();
    }

    const planDir = path.join(this.workspaceRoot, 'Docs', 'Plan');
    
    // Check if plan directory exists
    if (!fs.existsSync(planDir)) {
      console.warn('[PlanContextService] Docs/Plan directory not found');
      return this.getEmptyContext();
    }

    try {
      const projectDescription = await this.readPlanFile(planDir, 'detailed project description');
      const featureList = await this.readPlanFile(planDir, 'feature list');

      this.planContext = {
        projectDescription,
        features: this.parseFeatures(featureList),
        architectureNotes: this.extractArchitectureNotes(projectDescription),
        constraints: this.extractConstraints(projectDescription),
        technicalRequirements: this.extractTechnicalRequirements(projectDescription),
      };

      return this.planContext;
    } catch (error) {
      console.error('[PlanContextService] Error loading plan context:', error);
      return this.getEmptyContext();
    }
  }

  /**
   * Read a plan file from the Docs/Plan directory
   */
  private async readPlanFile(planDir: string, filename: string): Promise<string> {
    const filePath = path.join(planDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`[PlanContextService] File not found: ${filename}`);
      return '';
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`[PlanContextService] Error reading ${filename}:`, error);
      return '';
    }
  }

  /**
   * Parse features from feature list
   */
  private parseFeatures(featureList: string): string[] {
    if (!featureList) return [];

    // Extract features from numbered or bulleted lists
    const lines = featureList.split('\n');
    const features: string[] = [];

    for (const line of lines) {
      // Match patterns like "1.", "##", "*", "-" at the start
      const match = line.match(/^(?:\d+\.|##|[*-])\s+\*\*(.+?)\*\*/);
      if (match) {
        features.push(match[1].trim());
      }
    }

    return features;
  }

  /**
   * Extract architecture notes from project description
   */
  private extractArchitectureNotes(description: string): string {
    // Look for architecture-related sections
    const archMatch = description.match(/architecture|design|pattern|structure/i);
    if (!archMatch) return '';

    // Extract the paragraph containing architecture information
    const sentences = description.split(/\.\s+/);
    const archSentences = sentences.filter(s => 
      /architecture|design|pattern|structure|component|module/i.test(s)
    );

    return archSentences.join('. ').trim();
  }

  /**
   * Extract constraints from project description
   */
  private extractConstraints(description: string): string[] {
    const constraints: string[] = [];
    
    // Look for constraint keywords
    const constraintPatterns = [
      /must not|cannot|should not|restricted|limited/i,
      /requires?|needs?|depends? on/i,
      /compliance|regulation|standard/i,
    ];

    const sentences = description.split(/\.\s+/);
    for (const sentence of sentences) {
      if (constraintPatterns.some(pattern => pattern.test(sentence))) {
        constraints.push(sentence.trim());
      }
    }

    return constraints;
  }

  /**
   * Extract technical requirements from project description
   */
  private extractTechnicalRequirements(description: string): string[] {
    const requirements: string[] = [];
    
    // Look for technical requirement keywords
    const techPatterns = [
      /technology|framework|library|language|platform/i,
      /database|storage|cache|queue/i,
      /api|service|integration|protocol/i,
      /performance|scalability|availability/i,
    ];

    const sentences = description.split(/\.\s+/);
    for (const sentence of sentences) {
      if (techPatterns.some(pattern => pattern.test(sentence))) {
        requirements.push(sentence.trim());
      }
    }

    return requirements;
  }

  /**
   * Get empty context (fallback)
   */
  private getEmptyContext(): PlanContext {
    return {
      projectDescription: '',
      features: [],
      architectureNotes: '',
      constraints: [],
      technicalRequirements: [],
    };
  }

  /**
   * Clear cached context (for testing or refresh)
   */
  clearCache(): void {
    this.planContext = null;
  }

  /**
   * Get cached context without reloading
   */
  getCachedContext(): PlanContext | null {
    return this.planContext;
  }

  /**
   * Generate contextual follow-up questions based on plan
   */
  generateFollowUpQuestions(
    questionId: string,
    currentAnswers: Record<string, unknown>
  ): string[] {
    if (!this.planContext) {
      return [];
    }

    const questions: string[] = [];

    switch (questionId) {
      case 'q1-project-overview':
        // Generate questions based on project type and description
        if (this.planContext.technicalRequirements.length > 0) {
          questions.push('What specific technical stack will you use?');
        }
        if (this.planContext.constraints.length > 0) {
          questions.push('Are there any regulatory or compliance requirements?');
        }
        break;

      case 'q2-architecture':
        // Generate architecture-specific questions
        if (this.planContext.architectureNotes) {
          questions.push('How will you handle scalability and performance?');
        }
        if (currentAnswers.pattern === 'microservices') {
          questions.push('What service discovery mechanism will you use?');
          questions.push('How will you handle inter-service communication?');
        }
        break;

      case 'q3-features':
        // Generate feature-related questions based on plan
        if (this.planContext.features.length > 5) {
          questions.push('Would you like to phase this into multiple releases?');
        }
        questions.push('Are there any critical dependencies between features?');
        break;

      case 'q4-timeline':
        // Generate timeline questions
        const featureCount = this.planContext.features.length;
        if (featureCount > 10) {
          questions.push('Do you want to set up sprints or iterations?');
        }
        questions.push('What is your target launch date?');
        break;

      case 'q5-team':
        // Generate team structure questions
        if (this.planContext.technicalRequirements.length > 3) {
          questions.push('Do you need specialized roles for specific technologies?');
        }
        questions.push('What is your team\'s experience level with this stack?');
        break;
    }

    return questions;
  }

  /**
   * Generate suggestions based on plan context
   */
  generateSuggestions(
    questionId: string,
    fieldName: string,
    currentValue: unknown
  ): unknown[] {
    if (!this.planContext) {
      return [];
    }

    // Generate smart defaults or suggestions based on plan
    switch (questionId) {
      case 'q1-project-overview':
        if (fieldName === 'type') {
          // Suggest project type based on plan description
          const desc = this.planContext.projectDescription.toLowerCase();
          if (desc.includes('api') || desc.includes('backend')) {
            return ['api'];
          }
          if (desc.includes('website') || desc.includes('frontend')) {
            return ['web'];
          }
        }
        break;

      case 'q3-features':
        if (fieldName === 'features' && this.planContext.features.length > 0) {
          // Suggest features from plan
          return this.planContext.features.map((feature, idx) => ({
            name: feature,
            description: '',
            priority: idx < 3 ? 'high' : 'medium',
            dependsOn: null,
          }));
        }
        break;
    }

    return [];
  }
}
