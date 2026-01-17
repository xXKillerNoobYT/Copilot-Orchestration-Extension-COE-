/**
 * AI Assistance Service Tests
 * Unit tests for MCP askQuestion integration
 */

import { AiAssistanceService, getAiAssistanceService } from './aiAssistanceService';
import { MCPClient } from './mcpClient';

// Mock MCPClient
jest.mock('./mcpClient');
jest.mock('../utils/errorHandler');

describe('AiAssistanceService', () => {
  let service: AiAssistanceService;
  let mockMCPClient: jest.Mocked<MCPClient>;

  beforeEach(() => {
    // Create a mock MCPClient instance
    mockMCPClient = {
      askQuestion: jest.fn(),
      getInstance: jest.fn(),
    } as any;

    // Mock the getInstance static method to return our mock
    (MCPClient.getInstance as jest.Mock).mockReturnValue(mockMCPClient);

    service = new AiAssistanceService();
  });

  afterEach(() => {
    service.dispose();
    jest.clearAllMocks();
  });

  describe('getSuggestions', () => {
    it('should call MCP client and return suggestions', async () => {
      const mockResponse = {
        success: true,
        question: 'Test question',
        answer: 'Test answer',
        confidence: 0.95,
      };

      mockMCPClient.askQuestion.mockResolvedValueOnce(mockResponse);

      const result = await service.getSuggestions({
        currentPage: 'q1-metadata',
        currentQuestion: 'What is your project name?',
        wizardState: {},
      });

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].suggestion).toBe('Test answer');
      expect(result.suggestions[0].confidence).toBe(0.95);
      expect(mockMCPClient.askQuestion).toHaveBeenCalledTimes(1);
    });

    it('should handle MCP client errors gracefully', async () => {
      mockMCPClient.askQuestion.mockRejectedValueOnce(new Error('MCP error'));

      const result = await service.getSuggestions({
        currentPage: 'q1-metadata',
        currentQuestion: 'What is your project name?',
        wizardState: {},
      });

      expect(result.suggestions).toEqual([]);
      expect(result.contextualHelp).toContain('temporarily unavailable');
    });

    it('should handle empty MCP responses', async () => {
      mockMCPClient.askQuestion.mockResolvedValueOnce({
        success: false,
      });

      const result = await service.getSuggestions({
        currentPage: 'q1-metadata',
        currentQuestion: 'What is your project name?',
        wizardState: {},
      });

      expect(result.suggestions).toEqual([]);
    });

    it('should parse structured suggestions from MCP', async () => {
      const mockResponse = {
        success: true,
        answer: 'Main suggestion',
        suggestions: [
          { question: 'Q1', suggestion: 'S1', confidence: 0.9 },
          { question: 'Q2', suggestion: 'S2', confidence: 0.8 },
        ],
        confidence: 0.95,
      };

      mockMCPClient.askQuestion.mockResolvedValueOnce(mockResponse);

      const result = await service.getSuggestions({
        currentPage: 'q2-requirements',
        currentQuestion: 'What features do you need?',
        wizardState: {},
      });

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getSuggestionsDebounced', () => {
    // Fixed: Use real timers with short delay instead of fake timers to avoid async promise issues
    it('should debounce multiple rapid calls', async () => {
      const mockResponse = {
        success: true,
        answer: 'Test answer',
        confidence: 0.9,
      };

      mockMCPClient.askQuestion.mockResolvedValue(mockResponse);

      const request = {
        currentPage: 'q1-metadata',
        currentQuestion: 'Test',
        wizardState: {},
      };

      // Fire 3 requests rapidly with very short debounce (1ms for testing)
      const promise1 = service.getSuggestionsDebounced(request, 1);
      const promise2 = service.getSuggestionsDebounced(request, 1);
      const promise3 = service.getSuggestionsDebounced(request, 1);

      // Wait for all promises to resolve
      const results = await Promise.all([promise1, promise2, promise3]);

      // All should resolve with the same data
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);

      // Only one call should be made after debounce (last one)
      expect(mockMCPClient.askQuestion).toHaveBeenCalledTimes(1);
    });
  });

  describe('logAcceptedSuggestion', () => {
    it('should log accepted suggestions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.logAcceptedSuggestion(
        {
          question: 'Test Q',
          suggestion: 'Test S',
          confidence: 0.9,
        },
        {
          currentPage: 'q1',
          currentQuestion: 'Test',
          wizardState: {},
        }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Accepted suggestion'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should clean up debounce timers', () => {
      service.getSuggestionsDebounced({
        currentPage: 'q1',
        currentQuestion: 'Test',
        wizardState: {},
      });

      service.dispose();

      expect(service['debounceTimers'].size).toBe(0);
    });
  });

  describe('getAiAssistanceService singleton', () => {
    it('should return same instance', () => {
      const instance1 = getAiAssistanceService();
      const instance2 = getAiAssistanceService();

      expect(instance1).toBe(instance2);
    });
  });
});
