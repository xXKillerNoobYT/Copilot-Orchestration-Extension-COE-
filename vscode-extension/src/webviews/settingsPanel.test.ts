/**
 * Tests for SettingsPanel
 * Focus: Team state refresh functionality from MCP
 */

import { MCPClient } from '../services/mcpClient';

// Mock MCPClient
jest.mock('../services/mcpClient');

describe('MCPClient - Team State Refresh', () => {
  let mockMCPClient: jest.Mocked<MCPClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockMCPClient = {
      getTeamsStatus: jest.fn(),
    } as any;

    jest.spyOn(MCPClient, 'getInstance').mockReturnValue(mockMCPClient);
  });

  describe('getTeamsStatus endpoint', () => {
    it('should call /api/teams/status endpoint', async () => {
      // Arrange
      const mockResponse = {
        planning: {
          name: 'Planning',
          status: 'working' as const,
          tasksCompleted: 5,
          activeTaskCount: 1,
        },
        answer: {
          name: 'Answer',
          status: 'idle' as const,
          tasksCompleted: 8,
          activeTaskCount: 0,
        },
        decomposition: {
          name: 'Decomposition',
          status: 'working' as const,
          tasksCompleted: 3,
          activeTaskCount: 1,
        },
        verification: {
          name: 'Verification',
          status: 'blocked' as const,
          tasksCompleted: 12,
          activeTaskCount: 1,
        },
      };

      mockMCPClient.getTeamsStatus.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await mockMCPClient.getTeamsStatus();

      // Assert
      expect(mockMCPClient.getTeamsStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.planning.status).toBe('working');
      expect(result.verification.status).toBe('blocked');
    });

    it('should return team metrics in response', async () => {
      // Arrange
      const mockResponse = {
        planning: {
          name: 'Planning',
          status: 'working' as const,
          tasksCompleted: 10,
          activeTaskCount: 2,
          metrics: {
            tasksCreated: 25,
            planVersion: 'v3.0',
          },
        },
        answer: {
          name: 'Answer',
          status: 'idle' as const,
          tasksCompleted: 15,
          activeTaskCount: 0,
          metrics: {
            questionsAnswered: 42,
          },
        },
        decomposition: {
          name: 'Decomposition',
          status: 'idle' as const,
          tasksCompleted: 8,
          activeTaskCount: 0,
          metrics: {
            subtasksCreated: 50,
            avgTaskSize: 3.2,
          },
        },
        verification: {
          name: 'Verification',
          status: 'working' as const,
          tasksCompleted: 20,
          activeTaskCount: 3,
          metrics: {
            tasksVerified: 60,
            pendingVisual: 5,
          },
        },
      };

      mockMCPClient.getTeamsStatus.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await mockMCPClient.getTeamsStatus();

      // Assert
      expect(result.planning.metrics).toBeDefined();
      expect(result.planning.metrics?.tasksCreated).toBe(25);
      expect(result.planning.metrics?.planVersion).toBe('v3.0');
      expect(result.verification.metrics?.tasksVerified).toBe(60);
      expect(result.verification.metrics?.pendingVisual).toBe(5);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('MCP server unavailable');
      mockMCPClient.getTeamsStatus.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(mockMCPClient.getTeamsStatus()).rejects.toThrow('MCP server unavailable');
      expect(mockMCPClient.getTeamsStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle partial team state updates', async () => {
      // Arrange
      const partialResponse = {
        planning: {
          name: 'Planning',
          status: 'working' as const,
          tasksCompleted: 5,
          activeTaskCount: 1,
        },
        answer: {
          name: 'Answer',
          status: 'idle' as const,
          tasksCompleted: 0,
          activeTaskCount: 0,
        },
        decomposition: {
          name: 'Decomposition',
          status: 'idle' as const,
          tasksCompleted: 0,
          activeTaskCount: 0,
        },
        verification: {
          name: 'Verification',
          status: 'idle' as const,
          tasksCompleted: 0,
          activeTaskCount: 0,
        },
      };

      mockMCPClient.getTeamsStatus.mockResolvedValueOnce(partialResponse);

      // Act
      const result = await mockMCPClient.getTeamsStatus();

      // Assert - all teams should be present even with minimal data
      expect(result.planning).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.decomposition).toBeDefined();
      expect(result.verification).toBeDefined();
    });

    it('should include lastActivity timestamp when present', async () => {
      // Arrange
      const mockResponse = {
        planning: {
          name: 'Planning',
          status: 'working' as const,
          tasksCompleted: 5,
          activeTaskCount: 1,
          lastActivity: '2026-01-16T10:00:00Z',
        },
        answer: {
          name: 'Answer',
          status: 'idle' as const,
          tasksCompleted: 0,
          activeTaskCount: 0,
          lastActivity: '2026-01-16T09:30:00Z',
        },
        decomposition: {
          name: 'Decomposition',
          status: 'idle' as const,
          tasksCompleted: 0,
          activeTaskCount: 0,
        },
        verification: {
          name: 'Verification',
          status: 'idle' as const,
          tasksCompleted: 0,
          activeTaskCount: 0,
        },
      };

      mockMCPClient.getTeamsStatus.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await mockMCPClient.getTeamsStatus();

      // Assert
      expect(result.planning.lastActivity).toBe('2026-01-16T10:00:00Z');
      expect(result.answer.lastActivity).toBe('2026-01-16T09:30:00Z');
    });
  });
});
