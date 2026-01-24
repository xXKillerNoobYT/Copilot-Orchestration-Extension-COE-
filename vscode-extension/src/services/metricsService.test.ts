/**
 * Tests for MetricsService
 * Tests API integration for task, agent, and error metrics
 */

import { MetricsService, createMetricsService } from './metricsService';

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

describe('MetricsService', () => {
  let service: MetricsService;
  const baseUrl = 'http://localhost:8000';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MetricsService(baseUrl);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Factory', () => {
    it('should create service with baseUrl', () => {
      expect(service).toBeInstanceOf(MetricsService);
      expect((service as any).baseUrl).toBe(baseUrl);
    });

    it('should create service using factory function', () => {
      const factoryService = createMetricsService('http://test.com');
      expect(factoryService).toBeInstanceOf(MetricsService);
      expect((factoryService as any).baseUrl).toBe('http://test.com');
    });
  });

  describe('getTaskMetrics', () => {
    it('should fetch task metrics successfully', async () => {
      const mockResponse = {
        counts: {
          total: 100,
          completed: 75,
          in_progress: 15,
          pending: 5,
          blocked: 3,
          failed: 2
        },
        completionRate: 0.75,
        averageCycleSeconds: 3600,
        averageCycleDisplay: '1 hour',
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getTaskMetrics('24h');

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/metrics/tasks?range=24h`
      );
      expect(result).toEqual(mockResponse);
      expect(result.counts.total).toBe(100);
      expect(result.completionRate).toBe(0.75);
    });

    it('should use default time range when not specified', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          counts: { total: 0, completed: 0, in_progress: 0, pending: 0, blocked: 0, failed: 0 },
          completionRate: 0,
          averageCycleSeconds: 0,
          averageCycleDisplay: '0 seconds',
          lastUpdated: new Date().toISOString()
        })
      });

      await service.getTaskMetrics();

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/metrics/tasks?range=24h`
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(service.getTaskMetrics('24h')).rejects.toThrow(
        'Failed to fetch task metrics (500)'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getTaskMetrics('24h')).rejects.toThrow('Network error');
    });

    it('should properly encode time range parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          counts: { total: 0, completed: 0, in_progress: 0, pending: 0, blocked: 0, failed: 0 },
          completionRate: 0,
          averageCycleSeconds: 0,
          averageCycleDisplay: '0',
          lastUpdated: ''
        })
      });

      await service.getTaskMetrics('7 days');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('7 days'))
      );
    });
  });

  describe('getAgentMetrics', () => {
    it('should fetch agent metrics successfully', async () => {
      const mockResponse = {
        counts: {
          total_agents: 5,
          active_agents: 3,
          total_executions: 150
        },
        avgExecutionsPerAgent: 30,
        currentRunningExecutions: 2,
        utilization: 0.6,
        busiestAgent: {
          agent_id: 'agent-123',
          name: 'Planning Agent',
          executions: 50
        },
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getAgentMetrics('24h');

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/metrics/agents?range=24h`
      );
      expect(result).toEqual(mockResponse);
      expect(result.counts.total_agents).toBe(5);
      expect(result.utilization).toBe(0.6);
    });

    it('should handle null busiest agent', async () => {
      const mockResponse = {
        counts: {
          total_agents: 0,
          active_agents: 0,
          total_executions: 0
        },
        avgExecutionsPerAgent: 0,
        currentRunningExecutions: 0,
        utilization: 0,
        busiestAgent: null,
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getAgentMetrics('24h');
      expect(result.busiestAgent).toBeNull();
    });

    it('should use default time range', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          counts: { total_agents: 0, active_agents: 0, total_executions: 0 },
          avgExecutionsPerAgent: 0,
          currentRunningExecutions: 0,
          utilization: 0,
          busiestAgent: null,
          lastUpdated: ''
        })
      });

      await service.getAgentMetrics();

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/metrics/agents?range=24h`
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(service.getAgentMetrics('24h')).rejects.toThrow(
        'Failed to fetch agent metrics (404)'
      );
    });
  });

  describe('getErrorMetrics', () => {
    it('should fetch error metrics successfully', async () => {
      const mockResponse = {
        failures: {
          total_executions: 100,
          failed_executions: 5,
          failure_rate: 0.05
        },
        recent_errors: [
          {
            task_id: 'task-1',
            agent_id: 'agent-1',
            message: 'Test error',
            completed_at: '2026-01-23T09:00:00Z'
          },
          {
            task_id: 'task-2',
            agent_id: null,
            message: 'Another error',
            completed_at: '2026-01-23T08:00:00Z'
          }
        ],
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getErrorMetrics('24h');

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/metrics/errors?range=24h`
      );
      expect(result).toEqual(mockResponse);
      expect(result.failures.failure_rate).toBe(0.05);
      expect(result.recent_errors).toHaveLength(2);
    });

    it('should handle empty recent errors', async () => {
      const mockResponse = {
        failures: {
          total_executions: 100,
          failed_executions: 0,
          failure_rate: 0
        },
        recent_errors: [],
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getErrorMetrics('24h');
      expect(result.recent_errors).toHaveLength(0);
    });

    it('should use default time range', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          failures: { total_executions: 0, failed_executions: 0, failure_rate: 0 },
          recent_errors: [],
          lastUpdated: ''
        })
      });

      await service.getErrorMetrics();

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/metrics/errors?range=24h`
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503
      });

      await expect(service.getErrorMetrics('24h')).rejects.toThrow(
        'Failed to fetch error metrics (503)'
      );
    });

    it('should handle errors with null agent_id', async () => {
      const mockResponse = {
        failures: {
          total_executions: 10,
          failed_executions: 2,
          failure_rate: 0.2
        },
        recent_errors: [
          {
            task_id: 'task-1',
            agent_id: null,
            message: null,
            completed_at: null
          }
        ],
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getErrorMetrics('24h');
      expect(result.recent_errors[0].agent_id).toBeNull();
      expect(result.recent_errors[0].message).toBeNull();
    });
  });

  describe('Different Time Ranges', () => {
    const testCases = [
      { range: '1h', expected: '1h' },
      { range: '24h', expected: '24h' },
      { range: '7d', expected: '7d' },
      { range: '30d', expected: '30d' },
      { range: 'custom', expected: 'custom' }
    ];

    testCases!!.forEach(({ range, expected }) => {
      it(`should handle ${range} time range`, async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            counts: { total: 0, completed: 0, in_progress: 0, pending: 0, blocked: 0, failed: 0 },
            completionRate: 0,
            averageCycleSeconds: 0,
            averageCycleDisplay: '0',
            lastUpdated: ''
          })
        });

        await service.getTaskMetrics(range);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`range=${expected}`)
        );
      });
    });
  });

  describe('Error Response Handling', () => {
    it('should handle 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await expect(service.getTaskMetrics()).rejects.toThrow('Failed to fetch task metrics (401)');
    });

    it('should handle 403 forbidden', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403
      });

      await expect(service.getAgentMetrics()).rejects.toThrow('Failed to fetch agent metrics (403)');
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(service.getTaskMetrics()).rejects.toThrow('Invalid JSON');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent metric requests', async () => {
      const mockTaskMetrics = {
        counts: { total: 100, completed: 75, in_progress: 15, pending: 5, blocked: 3, failed: 2 },
        completionRate: 0.75,
        averageCycleSeconds: 3600,
        averageCycleDisplay: '1 hour',
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      const mockAgentMetrics = {
        counts: { total_agents: 5, active_agents: 3, total_executions: 150 },
        avgExecutionsPerAgent: 30,
        currentRunningExecutions: 2,
        utilization: 0.6,
        busiestAgent: null,
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      const mockErrorMetrics = {
        failures: { total_executions: 100, failed_executions: 5, failure_rate: 0.05 },
        recent_errors: [],
        lastUpdated: '2026-01-23T10:00:00Z'
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTaskMetrics })
        .mockResolvedValueOnce({ ok: true, json: async () => mockAgentMetrics })
        .mockResolvedValueOnce({ ok: true, json: async () => mockErrorMetrics });

      const [tasks, agents, errors] = await Promise.all([
        service.getTaskMetrics(),
        service.getAgentMetrics(),
        service.getErrorMetrics()
      ]);

      expect(tasks.counts.total).toBe(100);
      expect(agents.counts.total_agents).toBe(5);
      expect(errors.failures.failure_rate).toBe(0.05);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
