/**
 * AI Assistance Service
 * Provides contextual AI-powered suggestions for wizard questions
 */

import { MCPClient } from './mcpClient';
import { logError } from '../utils/errorHandler';

export interface AiSuggestion {
  question: string;
  suggestion: string;
  confidence: number;
  rationale?: string;
}

export interface AiAssistanceRequest {
  currentPage: string;
  currentQuestion: string;
  userAnswer?: string;
  userRole?: string;
  wizardState: Record<string, unknown>;
}

export interface AiAssistanceResponse {
  suggestions: AiSuggestion[];
  contextualHelp?: string;
  relatedQuestions?: string[];
}

/**
 * AI Assistance Service
 * Wrapper around MCP askQuestion with wizard-specific context
 */
export class AiAssistanceService {
  private mcpClient: MCPClient;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceResolvers: Map<string, ((value: AiAssistanceResponse) => void)[]> = new Map();

  constructor() {
    this.mcpClient = MCPClient.getInstance();
  }

  /**
   * Get AI-powered suggestions for a wizard question
   * 
   * @param request Assistance request with wizard context
   * @returns AI suggestions and contextual help
   */
  async getSuggestions(request: AiAssistanceRequest): Promise<AiAssistanceResponse> {
    try {
      // Build context for MCP askQuestion
      const question = this.buildContextualQuestion(request);
      const context = this.buildContext(request);

      // Call MCP backend
      const response = await this.mcpClient.askQuestion({
        question,
        context,
        planSection: request.currentPage,
      });

      // Parse and structure response
      return this.parseResponse(response);
    } catch (error) {
      logError(error, 'AiAssistanceService.getSuggestions');
      
      // Return empty suggestions on error (graceful degradation)
      return {
        suggestions: [],
        contextualHelp: 'AI assistance temporarily unavailable.',
      };
    }
  }

  /**
   * Get suggestions with debouncing to avoid excessive API calls
   * 
   * All rapid calls with the same key will be resolved with the same result
   * when the debounce timer fires.
   * 
   * @param request Assistance request
   * @param debounceMs Debounce delay in milliseconds (default: 1000ms)
   * @returns Promise that resolves when debounced
   */
  async getSuggestionsDebounced(
    request: AiAssistanceRequest,
    debounceMs: number = 1000
  ): Promise<AiAssistanceResponse> {
    const key = `${request.currentPage}-${request.currentQuestion}`;

    return new Promise((resolve) => {
      // Store the resolve callback for this request
      const resolvers = this.debounceResolvers.get(key) || [];
      resolvers.push(resolve);
      this.debounceResolvers.set(key, resolvers);

      // Clear existing timer for this key
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        const pendingResolvers = this.debounceResolvers.get(key) || [];
        this.debounceResolvers.delete(key);
        
        const suggestions = await this.getSuggestions(request);
        
        // Resolve all pending promises with the same result
        pendingResolvers.forEach(r => r(suggestions));
      }, debounceMs);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Log accepted suggestion for improvement
   * 
   * @param suggestion The suggestion that was accepted
   * @param request Original request context
   */
  async logAcceptedSuggestion(
    suggestion: AiSuggestion,
    request: AiAssistanceRequest
  ): Promise<void> {
    try {
      // Log to backend for model improvement
      console.log('[AiAssistance] Accepted suggestion:', {
        page: request.currentPage,
        question: request.currentQuestion,
        suggestion: suggestion.suggestion,
        confidence: suggestion.confidence,
      });

      // TODO: Send to backend analytics endpoint when available
      // await this.mcpClient.logSuggestionFeedback({...});
    } catch (error) {
      logError(error, 'AiAssistanceService.logAcceptedSuggestion');
    }
  }

  /**
   * Build contextual question for MCP
   */
  private buildContextualQuestion(request: AiAssistanceRequest): string {
    const { currentPage, currentQuestion, userAnswer, userRole } = request;

    let question = `On the "${currentPage}" page of the wizard, `;
    question += `the user (role: ${userRole || 'not specified'}) `;
    question += `is answering: "${currentQuestion}". `;

    if (userAnswer) {
      question += `Their current answer is: "${userAnswer}". `;
    }

    question += 'Provide helpful suggestions, best practices, or considerations.';

    return question;
  }

  /**
   * Build context object for MCP askQuestion
   */
  private buildContext(request: AiAssistanceRequest): Record<string, unknown> {
    return {
      wizardPage: request.currentPage,
      currentQuestion: request.currentQuestion,
      userAnswer: request.userAnswer,
      userRole: request.userRole,
      wizardState: request.wizardState,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse MCP response into structured suggestions
   */
  private parseResponse(response: any): AiAssistanceResponse {
    // Handle different response formats
    if (!response || !response.success) {
      return {
        suggestions: [],
      };
    }

    // Extract suggestions from response
    const suggestions: AiSuggestion[] = [];

    if (response.answer) {
      // Parse answer into suggestions
      // Expected format: response.answer is a text response with suggestions
      const mainSuggestion: AiSuggestion = {
        question: response.question || '',
        suggestion: response.answer,
        confidence: response.confidence || 0.8,
        rationale: response.evidence?.join('\n'),
      };
      suggestions.push(mainSuggestion);
    }

    if (response.suggestions && Array.isArray(response.suggestions)) {
      // If backend returns structured suggestions
      suggestions.push(...response.suggestions);
    }

    return {
      suggestions,
      contextualHelp: response.contextualHelp || response.answer,
      relatedQuestions: response.relatedQuestions || [],
    };
  }

  /**
   * Clean up debounce timers and pending resolvers
   */
  dispose(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.debounceResolvers.clear();
  }
}

// Singleton instance
let aiAssistanceInstance: AiAssistanceService | null = null;

export function getAiAssistanceService(): AiAssistanceService {
  if (!aiAssistanceInstance) {
    aiAssistanceInstance = new AiAssistanceService();
  }
  return aiAssistanceInstance;
}
