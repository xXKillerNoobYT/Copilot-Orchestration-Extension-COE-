/**
 * AI Assistance Integration Tests
 * 
 * Tests for wizard → Answer Team → response flow
 * Validates contextual AI assistance during wizard flow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AiAssistanceService } from '../../aiAssistanceService';
import { QuestionFramework } from '../../questionFramework';
import { MCPClient } from '../../../services/mcpClient';

// Mock MCP Client
vi.mock('../../../services/mcpClient', () => ({
  MCPClient: {
    getInstance: vi.fn(() => ({
      askQuestion: vi.fn(),
    })),
  },
}));

describe('AI Assistance Integration Tests', () => {
  let aiService: AiAssistanceService;
  let framework: QuestionFramework;
  let mockMcpClient: any;

  beforeEach(() => {
    framework = new QuestionFramework();
    aiService = new AiAssistanceService({
      debounceMs: 100,
      maxSuggestions: 3,
      enableLogging: false,
    });

    // Get mocked MCP client
    mockMcpClient = MCPClient.getInstance();
  });

  afterEach(() => {
    aiService.dispose();
    vi.clearAllMocks();
  });

  describe('Suggestion Generation', () => {
    it('should generate suggestions for a wizard page', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      // Mock MCP response
      mockMcpClient.askQuestion.mockResolvedValue([
        {
          question: 'What is your target audience?',
          context: 'Understanding your users helps define requirements',
          confidence: 0.9,
          sources: ['Project planning best practices'],
        },
        {
          question: 'What problem does this solve?',
          context: 'Clear problem definition drives better solutions',
          confidence: 0.85,
          sources: ['Product development guidelines'],
        },
      ]);

      const currentAnswers = {
        project_name: 'Test Project',
        project_category: 'web',
      };

      const suggestions = await aiService.generateSuggestions(
        firstPage,
        currentAnswers,
        'analyst'
      );

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].question).toBe('What is your target audience?');
      expect(suggestions[0].sources).toContain('Project planning best practices');
      expect(suggestions[1].confidence).toBe(0.85);
    });

    it('should handle MCP API failure gracefully', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      // Mock MCP failure
      mockMcpClient.askQuestion.mockRejectedValue(new Error('API timeout'));

      const currentAnswers = { project_name: 'Test' };

      const suggestions = await aiService.generateSuggestions(
        firstPage,
        currentAnswers,
        'analyst'
      );

      // Should return empty array, not throw
      expect(suggestions).toHaveLength(0);
    });

    it('should include workspace context in request', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([]);

      const currentAnswers = { project_name: 'Test' };

      await aiService.generateSuggestions(firstPage, currentAnswers, 'analyst');

      // Verify context was passed to MCP
      expect(mockMcpClient.askQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            pageId: firstPage.id,
            pageTitle: firstPage.title,
            planContext: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('Suggestion Acceptance', () => {
    it('should track accepted suggestions', () => {
      const suggestionId = 'test-123';
      const answer = 'My test answer';

      aiService.acceptSuggestion(suggestionId, answer);

      const rate = aiService.getAcceptanceRate();
      expect(rate).toBeGreaterThan(0);
    });

    it('should calculate acceptance rate correctly', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      // Mock 3 suggestions
      mockMcpClient.askQuestion.mockResolvedValue([
        { question: 'Q1', confidence: 0.8 },
        { question: 'Q2', confidence: 0.8 },
        { question: 'Q3', confidence: 0.8 },
      ]);

      const suggestions = await aiService.generateSuggestions(
        firstPage,
        {},
        'analyst'
      );

      // Accept 2 out of 3
      aiService.acceptSuggestion(suggestions[0].id, 'answer1');
      aiService.acceptSuggestion(suggestions[1].id, 'answer2');

      const rate = aiService.getAcceptanceRate();
      expect(rate).toBeCloseTo(0.67, 1); // 2/3 ≈ 0.67
    });
  });

  describe('Context Bundle', () => {
    it('should include relevant answers in context', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([]);

      const currentAnswers = {
        project_name: 'E-commerce App',
        project_category: 'web',
        project_complexity: 'medium',
        other_field: 'ignored',
      };

      await aiService.generateSuggestions(firstPage, currentAnswers, 'analyst');

      const callArgs = mockMcpClient.askQuestion.mock.calls[0][0];
      expect(callArgs.context.relevantAnswers).toBeDefined();
      
      // Should extract important keys
      expect(callArgs.context.answeredQuestions).toBe(4);
    });

    it('should limit context bundle size', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([]);

      // Create large answer set
      const largeAnswers: Record<string, unknown> = {};
      for (let i = 0; i < 100; i++) {
        largeAnswers[`field_${i}`] = 'value'.repeat(100);
      }

      await aiService.generateSuggestions(firstPage, largeAnswers, 'analyst');

      const callArgs = mockMcpClient.askQuestion.mock.calls[0][0];
      const contextStr = JSON.stringify(callArgs.context);

      // Context should be reasonable size (less than 50KB for example)
      expect(contextStr.length).toBeLessThan(50000);
    });
  });

  describe('Source Citations', () => {
    it('should parse sources from MCP response', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([
        {
          question: 'What is your timeline?',
          sources: ['Project Management Guide', 'Agile Practices'],
          citations: ['Best Practices Doc'],
        },
      ]);

      const suggestions = await aiService.generateSuggestions(firstPage, {}, 'analyst');

      expect(suggestions[0].sources).toContain('Project Management Guide');
      expect(suggestions[0].sources).toContain('Agile Practices');
      // Should merge sources and citations
      expect(suggestions[0].sources).toContain('Best Practices Doc');
    });

    it('should handle missing sources gracefully', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([
        {
          question: 'Simple question',
          // No sources provided
        },
      ]);

      const suggestions = await aiService.generateSuggestions(firstPage, {}, 'analyst');

      expect(suggestions[0].sources).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockRejectedValue(new Error('Request timeout'));

      const suggestions = await aiService.generateSuggestions(firstPage, {}, 'analyst');

      expect(suggestions).toHaveLength(0);
    });

    it('should handle malformed responses', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      // Mock malformed response
      mockMcpClient.askQuestion.mockResolvedValue(null);

      const suggestions = await aiService.generateSuggestions(firstPage, {}, 'analyst');

      expect(suggestions).toHaveLength(0);
    });

    it('should handle invalid suggestion format', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([
        { invalid: 'object' }, // No question field
        { question: 'Valid question' }, // Valid
      ]);

      const suggestions = await aiService.generateSuggestions(firstPage, {}, 'analyst');

      // Should skip invalid and return only valid
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].question).toBe('Valid question');
    });
  });

  describe('Suggestion History', () => {
    it('should track suggestion history', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([
        { question: 'Q1', confidence: 0.8 },
      ]);

      expect(aiService.getSuggestionHistory()).toHaveLength(0);

      await aiService.generateSuggestions(firstPage, {}, 'analyst');

      const history = aiService.getSuggestionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].question).toBe('Q1');
    });

    it('should clear history', async () => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([
        { question: 'Q1', confidence: 0.8 },
      ]);

      await aiService.generateSuggestions(firstPage, {}, 'analyst');
      expect(aiService.getSuggestionHistory()).toHaveLength(1);

      aiService.clearHistory();
      expect(aiService.getSuggestionHistory()).toHaveLength(0);
      expect(aiService.getAcceptanceRate()).toBe(0);
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid suggestion requests', (done) => {
      const pages = framework.getPages();
      const firstPage = pages[0];

      mockMcpClient.askQuestion.mockResolvedValue([]);

      let callCount = 0;
      const callback = () => {
        callCount++;
      };

      // Make rapid requests
      aiService.debouncedGenerateSuggestions(firstPage, {}, 'analyst', callback);
      aiService.debouncedGenerateSuggestions(firstPage, {}, 'analyst', callback);
      aiService.debouncedGenerateSuggestions(firstPage, {}, 'analyst', callback);

      // Wait for debounce period
      setTimeout(() => {
        // Should only call once due to debouncing
        expect(callCount).toBe(1);
        done();
      }, 200);
    });
  });
});
