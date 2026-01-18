/**
 * AI Assistance Service
 * 
 * Provides contextual AI-powered suggestions during wizard flow
 * Integrates with MCP askQuestion tool for intelligent follow-ups
 * 
 * Reference: Code Master Section 9.4 - AI-Assisted Planning
 */

import { MCPClient } from '../services/mcpClient';
import { PlanContextService } from './services/PlanContextService';
import type { WizardPage } from './questionFramework';

export interface AiSuggestion {
  id: string;
  question: string;
  context: string;
  relatedAnswers: string[];
  confidence: number;
  timestamp: Date;
  sources?: string[];
  suggestedAnswer?: string;
}

export interface AiAssistanceConfig {
  debounceMs?: number;
  enableLogging?: boolean;
  maxSuggestions?: number;
}

/**
 * Service for generating AI-powered contextual suggestions
 */
export class AiAssistanceService {
  private mcpClient: MCPClient;
  private planContextService: PlanContextService;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private config: Required<AiAssistanceConfig>;
  private suggestionHistory: AiSuggestion[] = [];
  private acceptedSuggestions: Set<string> = new Set();

  constructor(config: AiAssistanceConfig = {}) {
    this.mcpClient = MCPClient.getInstance();
    this.planContextService = PlanContextService.getInstance();
    this.config = {
      debounceMs: config.debounceMs ?? 1000,
      enableLogging: config.enableLogging ?? false,
      maxSuggestions: config.maxSuggestions ?? 3,
    };
  }

  /**
   * Generate contextual suggestions based on current answers
   */
  async generateSuggestions(
    currentPage: WizardPage,
    currentAnswers: Record<string, unknown>,
    userRole?: string
  ): Promise<AiSuggestion[]> {
    // Build context from current state (now async)
    const context = await this.buildContext(currentPage, currentAnswers, userRole);

    try {
      const response = await this.mcpClient.askQuestion({
        question: `Based on the user's answers to "${currentPage.title}", what follow-up question would be most helpful? Provide 1-3 clarifying questions.`,
        planSection: currentPage.id,
        context: context,
      });

      return this.parseSuggestions(response, currentPage.id);
    } catch (error) {
      this.log('Error generating suggestions:', error);
      
      // Graceful degradation: return empty array instead of throwing
      // This allows the wizard to continue functioning even if AI is unavailable
      return [];
    }
  }

  /**
   * Accept a suggestion and potentially update answers
   */
  acceptSuggestion(suggestionId: string, answer: unknown): void {
    this.acceptedSuggestions.add(suggestionId);

    const suggestion = this.suggestionHistory.find(s => s.id === suggestionId);
    if (suggestion) {
      this.log('Suggestion accepted:', suggestion);
    }
  }

  /**
   * Get suggestion history
   */
  getSuggestionHistory(): AiSuggestion[] {
    return [...this.suggestionHistory];
  }

  /**
   * Get acceptance rate for suggestions
   */
  getAcceptanceRate(): number {
    if (this.suggestionHistory.length === 0) return 0;
    return this.acceptedSuggestions.size / this.suggestionHistory.length;
  }

  /**
   * Clear suggestion history
   */
  clearHistory(): void {
    this.suggestionHistory = [];
    this.acceptedSuggestions.clear();
  }

  /**
   * Build context object for MCP request
   * Includes plan context from workspace for richer AI responses
   */
  private async buildContext(
    page: WizardPage,
    answers: Record<string, unknown>,
    userRole?: string
  ): Promise<Record<string, unknown>> {
    // Load plan context from workspace with error handling
    let planContext;
    try {
      planContext = await this.planContextService.loadPlanContext();
    } catch (error) {
      this.log('Failed to load plan context, using empty context:', error);
      planContext = {
        projectDescription: '',
        features: [],
        architectureNotes: '',
        constraints: [],
        technicalRequirements: [],
      };
    }
    
    return {
      pageId: page.id,
      pageTitle: page.title,
      pageDescription: page.description,
      userRole: userRole || 'analyst',
      answeredQuestions: Object.keys(answers).length,
      relevantAnswers: this.extractRelevantAnswers(answers),
      questionCount: page.questions.length,
      // Add workspace context
      planContext: {
        projectDescription: planContext.projectDescription,
        features: planContext.features,
        architectureNotes: planContext.architectureNotes,
        constraints: planContext.constraints,
        technicalRequirements: planContext.technicalRequirements,
      },
    };
  }

  /**
   * Extract relevant answers for context
   */
  private extractRelevantAnswers(answers: Record<string, unknown>): Record<string, unknown> {
    const relevant: Record<string, unknown> = {};
    const importantKeys = ['project_name', 'project_category', 'project_complexity'];

    for (const key of importantKeys) {
      if (key in answers) {
        relevant[key] = answers[key];
      }
    }

    return relevant;
  }

  /**
   * Parse MCP response into suggestions
   * 
   * Expected response format:
   * {
   *   question: string,        // The suggestion question text
   *   context?: string,        // Explanation/context for the suggestion
   *   confidence?: number,     // AI confidence (0-1)
   *   sources?: string[],      // Array of source citations (preferred)
   *   citations?: string[],    // Alternative property for sources (legacy support)
   *   suggestedAnswer?: string, // Suggested answer text (preferred)
   *   answer?: string          // Alternative property for suggested answer (legacy support)
   * }
   */
  private parseSuggestions(response: any, pageId: string): AiSuggestion[] {
    const suggestions: AiSuggestion[] = [];

    try {
      // Response should contain questions array or string
      const questions = Array.isArray(response) ? response : [response];

      questions.slice(0, this.config.maxSuggestions).forEach((item: any, index: number) => {
        // Support both 'sources' (preferred) and 'citations' (legacy) properties
        const sourcesArray = item.sources || item.citations || [];
        
        // Support both 'suggestedAnswer' (preferred) and 'answer' (legacy) properties
        const answerText = item.suggestedAnswer || item.answer || '';
        
        const suggestion: AiSuggestion = {
          id: `ai-${pageId}-${Date.now()}-${index}`,
          question: typeof item === 'string' ? item : item.question || item.text || '',
          context: item.context || item.explanation || '',
          relatedAnswers: item.relatedAnswers || [],
          confidence: item.confidence || 0.8,
          timestamp: new Date(),
          sources: sourcesArray,
          suggestedAnswer: answerText,
        };

        if (suggestion.question) {
          suggestions.push(suggestion);
          this.suggestionHistory.push(suggestion);
        }
      });
    } catch (error) {
      this.log('Error parsing suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Debounced suggestion generation
   */
  debouncedGenerateSuggestions(
    currentPage: WizardPage,
    currentAnswers: Record<string, unknown>,
    userRole?: string,
    callback?: (suggestions: AiSuggestion[]) => void
  ): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const suggestions = await this.generateSuggestions(currentPage, currentAnswers, userRole);
      callback?.(suggestions);
    }, this.config.debounceMs);
  }

  /**
   * Logging helper
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[AiAssistanceService] ${message}`, data);
    }
  }

  /**
   * Cleanup on dispose
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
