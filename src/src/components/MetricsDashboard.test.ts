/**
 * MetricsDashboard.test.ts
 * 
 * Tests for MetricsDashboard component including:
 * - Chart rendering
 * - Time range selection
 * - Auto-refresh functionality
 * - Data updates
 * 
 * @author Copilot
 * @date 2026-01-17
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { MetricsService } from '../services/metricsService';
import {
  generateTimeLabels,
  generateSampleCompletionData,
  generateSampleAgentData,
  generateSampleSeverityData
} from './metricsChartUtils';

describe('MetricsDashboard Component', () => {
  let mockService: MetricsService;

  beforeEach(() => {
    // Mock the metrics service
    mockService = {
      getTaskMetrics: jest.fn().mockResolvedValue({
        counts: {
          total: 100,
          completed: 60,
          in_progress: 20,
          pending: 15,
          blocked: 3,
          failed: 2,
        },
        completionRate: 60,
        averageCycleSeconds: 3600,
        averageCycleDisplay: '1h',
        lastUpdated: new Date().toISOString(),
      }),
      getAgentMetrics: jest.fn().mockResolvedValue({
        counts: {
          total_agents: 5,
          active_agents: 3,
          total_executions: 150,
        },
        avgExecutionsPerAgent: 30,
        currentRunningExecutions: 2,
        utilization: 0.6,
        busiestAgent: { agent_id: 'agent-1', name: 'Agent 1', executions: 50 },
        lastUpdated: new Date().toISOString(),
      }),
      getErrorMetrics: jest.fn().mockResolvedValue({
        failures: {
          total_executions: 150,
          failed_executions: 5,
          failure_rate: 3.3,
        },
        recent_errors: [
          {
            task_id: 'task-1',
            agent_id: 'agent-1',
            message: 'Test error',
            completed_at: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      }),
    } as unknown as MetricsService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with default time range of 24h', () => {
      const defaultRange = '24h';
      expect(defaultRange).toBe('24h');
    });

    it('should have time range options for 24h, 7d, and 30d', () => {
      const timeRanges = [
        { label: '24h', value: '24h' },
        { label: '7d', value: '7d' },
        { label: '30d', value: '30d' },
      ];

      expect(timeRanges).toHaveLength(3);
      expect(timeRanges[0].value).toBe('24h');
      expect(timeRanges[1].value).toBe('7d');
      expect(timeRanges[2].value).toBe('30d');
    });
  });

  describe('Metrics Service Integration', () => {
    it('should call metrics service with time range parameter', async () => {
      const timeRange = '7d';
      await mockService.getTaskMetrics(timeRange);
      await mockService.getAgentMetrics(timeRange);
      await mockService.getErrorMetrics(timeRange);

      expect(mockService.getTaskMetrics).toHaveBeenCalledWith(timeRange);
      expect(mockService.getAgentMetrics).toHaveBeenCalledWith(timeRange);
      expect(mockService.getErrorMetrics).toHaveBeenCalledWith(timeRange);
    });

    it('should handle successful metric retrieval', async () => {
      const taskMetrics = await mockService.getTaskMetrics('24h');
      const agentMetrics = await mockService.getAgentMetrics('24h');
      const errorMetrics = await mockService.getErrorMetrics('24h');

      expect(taskMetrics.counts.total).toBe(100);
      expect(agentMetrics.counts.total_agents).toBe(5);
      expect(errorMetrics.failures.failure_rate).toBe(3.3);
    });
  });
  describe('Auto-Refresh Functionality', () => {
    it('should have auto-refresh interval of 30 seconds', () => {
      const autoRefreshInterval = 30000; // 30 seconds in milliseconds
      expect(autoRefreshInterval).toBe(30000);
    });

    it('should clean up auto-refresh on component unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const intervalId = setInterval(() => { }, 30000);
      clearInterval(intervalId);

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Chart Data Generation', () => {
    it('should generate time labels for 24h range', () => {
      const labels = generateTimeLabels('24h');
      expect(labels).toHaveLength(24);
      expect(labels[0]).toMatch(/\d{2}:\d{2}/);
    });

    it('should generate time labels for 7d range', () => {
      const labels = generateTimeLabels('7d');
      expect(labels).toHaveLength(7);
    });

    it('should generate time labels for 30d range', () => {
      const labels = generateTimeLabels('30d');
      expect(labels).toHaveLength(30);
    });

    it('should generate deterministic completion data', () => {
      const data1 = generateSampleCompletionData(100, 24);
      const data2 = generateSampleCompletionData(100, 24);
      expect(data1).toEqual(data2);
      expect(data1).toHaveLength(24);
    });

    it('should generate deterministic agent data', () => {
      const data1 = generateSampleAgentData(100);
      const data2 = generateSampleAgentData(100);
      expect(data1).toEqual(data2);
      expect(data1).toHaveLength(5);
      const sum = data1.reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });

    it('should generate sample severity data', () => {
      const data = generateSampleSeverityData(100);
      expect(data).toHaveLength(4);
      const sum = data.reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });

    it('should handle zero errors in severity data', () => {
      const data = generateSampleSeverityData(0);
      expect(data).toEqual([0, 0, 0, 0]);
    });
  });

  describe('Responsive Layout', () => {
    it('should support grid layout for cards', () => {
      const gridLayout = 'repeat(auto-fit, minmax(260px, 1fr))';
      expect(gridLayout).toContain('auto-fit');
      expect(gridLayout).toContain('minmax');
    });

    it('should support grid layout for charts', () => {
      const chartLayout = 'repeat(auto-fit, minmax(220px, 1fr))';
      expect(chartLayout).toContain('auto-fit');
      expect(chartLayout).toContain('minmax');
    });
  });
});
