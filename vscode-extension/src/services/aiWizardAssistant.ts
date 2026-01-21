/**
 * AI Assistant for Wizard Components
 * 
 * Provides AI-powered suggestions for wizard questions using structured prompts.
 * This service wraps the existing aiAssistanceService and adds wizard-specific
 * prompt engineering and response parsing.
 */

import { AiAssistanceService } from './aiAssistanceService';
import type { AiAssistanceRequest, AiAssistanceResponse } from './aiAssistanceService';

// Feature Breakdown imports
import type { FeatureBreakdownContext, FeatureSuggestion } from '../prompts/featureBreakdown';
import {
  generateFeatureSuggestionsPrompt,
  generateCategorizationPrompt,
  generateEffortEstimationPrompt,
  generateDependencySuggestionsPrompt,
  parseFeatureSuggestions,
  parseCategorizationSuggestions,
  parseEffortEstimations,
  parseDependencySuggestions,
} from '../prompts/featureBreakdown';

// Timeline imports
import type { TimelineContext, TimelineSuggestion } from '../prompts/timeline';
import {
  generateTimelineRecommendationPrompt,
  generateMilestoneSuggestionsPrompt,
  generateResourceAllocationPrompt,
  generateCriticalPathPrompt,
  parseTimelineRecommendation,
  parseMilestoneSuggestions,
  parseResourceAllocation,
  parseCriticalPathAnalysis,
} from '../prompts/timeline';

// Team Structure imports
import type { TeamStructureContext, RoleSuggestion } from '../prompts/teamStructure';
import {
  generateRoleSuggestionsPrompt,
  generateSkillRequirementsPrompt,
  generateTeamSizePrompt,
  generateWorkloadDistributionPrompt,
  parseRoleSuggestions,
  parseSkillRequirements,
  parseTeamSizeRecommendation,
  parseWorkloadDistribution,
} from '../prompts/teamStructure';

export interface AiWizardAssistantOptions {
  timeout?: number; // milliseconds, default 10000
  retries?: number; // default 2
}

/**
 * AI Wizard Assistant Service
 * 
 * Provides AI-powered suggestions for wizard components with:
 * - Structured prompt engineering
 * - Response parsing and validation
 * - Error handling and fallbacks
 * - Performance tracking
 */
export class AiWizardAssistant {
  private aiService: AiAssistanceService;
  private acceptanceTracking: Map<string, { accepted: number; total: number }> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.aiService = new AiAssistanceService();
  }

  // ==================== Feature Breakdown Methods ====================

  /**
   * Get AI-suggested features based on project context
   */
  async suggestFeatures(
    context: FeatureBreakdownContext,
    options?: AiWizardAssistantOptions
  ): Promise<FeatureSuggestion[]> {
    const startTime = performance.now();
    
    try {
      const prompt = generateFeatureSuggestionsPrompt(context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'feature-breakdown',
          currentQuestion: 'suggest-features',
          wizardState: { context },
        },
        prompt,
        options
      );

      const suggestions = parseFeatureSuggestions(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('suggest-features', performance.now() - startTime);
      return suggestions;
    } catch (error) {
      console.error('[AiWizardAssistant] Error suggesting features:', error);
      return [];
    }
  }

  /**
   * Get AI-suggested categorization for features
   */
  async categorizeFeatures(
    features: Array<{ name: string; description: string }>,
    context: FeatureBreakdownContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateCategorizationPrompt(features, context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'feature-breakdown',
          currentQuestion: 'categorize-features',
          wizardState: { features, context },
        },
        prompt,
        options
      );

      const suggestions = parseCategorizationSuggestions(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('categorize-features', performance.now() - startTime);
      return suggestions;
    } catch (error) {
      console.error('[AiWizardAssistant] Error categorizing features:', error);
      return [];
    }
  }

  /**
   * Get AI-suggested effort estimations for features
   */
  async estimateEffort(
    features: Array<{ name: string; description: string }>,
    context: FeatureBreakdownContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateEffortEstimationPrompt(features, context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'feature-breakdown',
          currentQuestion: 'estimate-effort',
          wizardState: { features, context },
        },
        prompt,
        options
      );

      const estimations = parseEffortEstimations(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('estimate-effort', performance.now() - startTime);
      return estimations;
    } catch (error) {
      console.error('[AiWizardAssistant] Error estimating effort:', error);
      return [];
    }
  }

  /**
   * Get AI-suggested dependencies between features
   */
  async suggestDependencies(
    features: Array<{ name: string; description: string }>,
    context: FeatureBreakdownContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateDependencySuggestionsPrompt(features, context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'feature-breakdown',
          currentQuestion: 'suggest-dependencies',
          wizardState: { features, context },
        },
        prompt,
        options
      );

      const dependencies = parseDependencySuggestions(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('suggest-dependencies', performance.now() - startTime);
      return dependencies;
    } catch (error) {
      console.error('[AiWizardAssistant] Error suggesting dependencies:', error);
      return [];
    }
  }

  // ==================== Timeline Methods ====================

  /**
   * Get AI-recommended timeline for project
   */
  async recommendTimeline(
    context: TimelineContext,
    options?: AiWizardAssistantOptions
  ): Promise<TimelineSuggestion | null> {
    const startTime = performance.now();
    
    try {
      const prompt = generateTimelineRecommendationPrompt(context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'timeline',
          currentQuestion: 'recommend-timeline',
          wizardState: { context },
        },
        prompt,
        options
      );

      const timeline = parseTimelineRecommendation(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('recommend-timeline', performance.now() - startTime);
      return timeline;
    } catch (error) {
      console.error('[AiWizardAssistant] Error recommending timeline:', error);
      return null;
    }
  }

  /**
   * Get AI-suggested milestones based on features
   */
  async suggestMilestones(
    features: Array<{ name: string; estimatedDays?: number }>,
    context: TimelineContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateMilestoneSuggestionsPrompt(features, context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'timeline',
          currentQuestion: 'suggest-milestones',
          wizardState: { features, context },
        },
        prompt,
        options
      );

      const milestones = parseMilestoneSuggestions(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('suggest-milestones', performance.now() - startTime);
      return milestones;
    } catch (error) {
      console.error('[AiWizardAssistant] Error suggesting milestones:', error);
      return [];
    }
  }

  /**
   * Get AI-recommended resource allocation for milestones
   */
  async allocateResources(
    milestones: Array<{ name: string; phase: string }>,
    context: TimelineContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateResourceAllocationPrompt(milestones, context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'timeline',
          currentQuestion: 'allocate-resources',
          wizardState: { milestones, context },
        },
        prompt,
        options
      );

      const allocation = parseResourceAllocation(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('allocate-resources', performance.now() - startTime);
      return allocation;
    } catch (error) {
      console.error('[AiWizardAssistant] Error allocating resources:', error);
      return [];
    }
  }

  /**
   * Get AI-analyzed critical path for milestones
   */
  async analyzeCriticalPath(
    milestones: Array<{ name: string; dependencies?: string[] }>,
    context: TimelineContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateCriticalPathPrompt(milestones, context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'timeline',
          currentQuestion: 'analyze-critical-path',
          wizardState: { milestones, context },
        },
        prompt,
        options
      );

      const analysis = parseCriticalPathAnalysis(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('analyze-critical-path', performance.now() - startTime);
      return analysis;
    } catch (error) {
      console.error('[AiWizardAssistant] Error analyzing critical path:', error);
      return null;
    }
  }

  // ==================== Team Structure Methods ====================

  /**
   * Get AI-suggested team roles based on project context
   */
  async suggestRoles(
    context: TeamStructureContext,
    options?: AiWizardAssistantOptions
  ): Promise<RoleSuggestion[]> {
    const startTime = performance.now();
    
    try {
      const prompt = generateRoleSuggestionsPrompt(context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'team-structure',
          currentQuestion: 'suggest-roles',
          wizardState: { context },
        },
        prompt,
        options
      );

      const roles = parseRoleSuggestions(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('suggest-roles', performance.now() - startTime);
      return roles;
    } catch (error) {
      console.error('[AiWizardAssistant] Error suggesting roles:', error);
      return [];
    }
  }

  /**
   * Get AI-identified skill requirements for roles
   */
  async identifySkills(
    roles: Array<{ role: string; skills?: string[] }>,
    context: TeamStructureContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateSkillRequirementsPrompt(roles, context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'team-structure',
          currentQuestion: 'identify-skills',
          wizardState: { roles, context },
        },
        prompt,
        options
      );

      const skills = parseSkillRequirements(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('identify-skills', performance.now() - startTime);
      return skills;
    } catch (error) {
      console.error('[AiWizardAssistant] Error identifying skills:', error);
      return [];
    }
  }

  /**
   * Get AI-recommended team size
   */
  async recommendTeamSize(
    context: TeamStructureContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateTeamSizePrompt(context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'team-structure',
          currentQuestion: 'recommend-team-size',
          wizardState: { context },
        },
        prompt,
        options
      );

      const recommendation = parseTeamSizeRecommendation(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('recommend-team-size', performance.now() - startTime);
      return recommendation;
    } catch (error) {
      console.error('[AiWizardAssistant] Error recommending team size:', error);
      return null;
    }
  }

  /**
   * Get AI-calculated workload distribution
   */
  async distributeWorkload(
    roles: Array<{ role: string; allocation?: number }>,
    context: TeamStructureContext,
    options?: AiWizardAssistantOptions
  ) {
    const startTime = performance.now();
    
    try {
      const prompt = generateWorkloadDistributionPrompt(roles, context);
      const response = await this.callAiWithTimeout(
        {
          currentPage: 'team-structure',
          currentQuestion: 'distribute-workload',
          wizardState: { roles, context },
        },
        prompt,
        options
      );

      const distribution = parseWorkloadDistribution(response.suggestions[0]?.suggestion || '');
      
      this.recordPerformance('distribute-workload', performance.now() - startTime);
      return distribution;
    } catch (error) {
      console.error('[AiWizardAssistant] Error distributing workload:', error);
      return [];
    }
  }

  // ==================== Tracking & Metrics ====================

  /**
   * Track user acceptance of AI suggestions
   */
  trackAcceptance(suggestionType: string, accepted: boolean): void {
    const current = this.acceptanceTracking.get(suggestionType) || { accepted: 0, total: 0 };
    current.total++;
    if (accepted) {
      current.accepted++;
    }
    this.acceptanceTracking.set(suggestionType, current);
  }

  /**
   * Get acceptance rate for a suggestion type
   */
  getAcceptanceRate(suggestionType: string): number {
    const stats = this.acceptanceTracking.get(suggestionType);
    if (!stats || stats.total === 0) return 0;
    return stats.accepted / stats.total;
  }

  /**
   * Get all acceptance statistics
   */
  getAllAcceptanceStats(): Record<string, { accepted: number; total: number; rate: number }> {
    const stats: Record<string, { accepted: number; total: number; rate: number }> = {};
    
    this.acceptanceTracking.forEach((value, key) => {
      stats[key] = {
        accepted: value.accepted,
        total: value.total,
        rate: value.total > 0 ? value.accepted / value.total : 0,
      };
    });
    
    return stats;
  }

  /**
   * Get performance metrics (p95 response time)
   */
  getPerformanceMetrics(suggestionType: string): { p50: number; p95: number; p99: number } | null {
    const metrics = this.performanceMetrics.get(suggestionType);
    if (!metrics || metrics.length === 0) return null;

    const sorted = [...metrics].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { p50, p95, p99 };
  }

  /**
   * Get all performance metrics
   */
  getAllPerformanceMetrics(): Record<string, { p50: number; p95: number; p99: number }> {
    const allMetrics: Record<string, { p50: number; p95: number; p99: number }> = {};
    
    this.performanceMetrics.forEach((_, key) => {
      const metrics = this.getPerformanceMetrics(key);
      if (metrics) {
        allMetrics[key] = metrics;
      }
    });
    
    return allMetrics;
  }

  // ==================== Private Helper Methods ====================

  /**
   * Call AI service with custom prompt and timeout
   */
  private async callAiWithTimeout(
    request: AiAssistanceRequest,
    customPrompt: string,
    options?: AiWizardAssistantOptions
  ): Promise<AiAssistanceResponse> {
    const timeout = options?.timeout || 10000;
    const retries = options?.retries || 2;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await Promise.race([
          this.callAiService(request, customPrompt),
          this.timeoutPromise(timeout),
        ]);

        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        console.warn(`[AiWizardAssistant] Attempt ${attempt + 1} failed, retrying...`);
      }
    }

    throw new Error('All retries exhausted');
  }

  /**
   * Call the underlying AI service with custom prompt
   */
  private async callAiService(
    request: AiAssistanceRequest,
    customPrompt: string
  ): Promise<AiAssistanceResponse> {
    // For now, we'll create a mock response structure
    // In production, this would call the actual MCP service
    try {
      const response = await this.aiService.getSuggestions(request);
      
      // Inject custom prompt as the question
      return {
        suggestions: [
          {
            question: customPrompt,
            suggestion: customPrompt, // This would be replaced by actual AI response
            confidence: 0.8,
          },
        ],
      };
    } catch (error) {
      console.error('[AiWizardAssistant] AI service call failed:', error);
      return {
        suggestions: [],
        contextualHelp: 'AI assistance temporarily unavailable.',
      };
    }
  }

  /**
   * Create a timeout promise
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Record performance metric
   */
  private recordPerformance(suggestionType: string, duration: number): void {
    const metrics = this.performanceMetrics.get(suggestionType) || [];
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    this.performanceMetrics.set(suggestionType, metrics);
  }
}

// Export singleton instance
let instance: AiWizardAssistant | null = null;

export function getAiWizardAssistant(): AiWizardAssistant {
  if (!instance) {
    instance = new AiWizardAssistant();
  }
  return instance;
}
