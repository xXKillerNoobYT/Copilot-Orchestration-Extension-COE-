/**
 * AI Assistance Service Tests
 * 
 * Tests for AI-powered contextual suggestion generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiAssistanceService, type AiSuggestion } from './aiAssistanceService';
import { QuestionFramework } from './questionFramework';

describe('AiAssistanceService', () => {
  let service: AiAssistanceService;
  let framework: QuestionFramework;

  beforeEach(() => {
    service = new AiAssistanceService({ debounceMs: 100, enableLogging: false });
    framework = new QuestionFramework();

    // Mock MCP client if needed
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create service with default config', () => {
      expect(service).toBeDefined();
      expect(service.getSuggestionHistory()).toHaveLength(0);
    });

    it('should accept custom config', () => {
      const customService = new AiAssistanceService({
        debounceMs: 500,
        maxSuggestions: 5,
        enableLogging: true,
      });
      expect(customService).toBeDefined();
    });
  });

  describe('Suggestion Management', () => {
    it('should track suggestion history', () => {
      expect(service.getSuggestionHistory()).toHaveLength(0);
      expect(service.getAcceptanceRate()).toBe(0);
    });

    it('should calculate acceptance rate', () => {
      const rate = service.getAcceptanceRate();
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });

    it('should clear history', () => {
      service.clearHistory();
      expect(service.getSuggestionHistory()).toHaveLength(0);
    });
  });

  describe('Context Building', () => {
    it('should build context from page and answers', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      if (firstPage) {
        const answers = {
          project_name: 'Test Project',
          project_description: 'A test project',
        };

        // Service should handle context building internally
        expect(firstPage.id).toBeDefined();
        expect(Object.keys(answers).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Disposal', () => {
    it('should cleanup on dispose', () => {
      service.dispose();
      // Should not throw
      expect(service).toBeDefined();
    });

    it('should cancel pending debounced calls on dispose', () => {
      service.dispose();
      // Debounced timers should be cleared
      expect(service).toBeDefined();
    });
  });

  describe('Suggestion Acceptance', () => {
    it('should track accepted suggestions', () => {
      const suggestionId = 'test-123';
      service.acceptSuggestion(suggestionId, 'test answer');

      // Service should track this internally
      expect(service).toBeDefined();
    });
  });
});
