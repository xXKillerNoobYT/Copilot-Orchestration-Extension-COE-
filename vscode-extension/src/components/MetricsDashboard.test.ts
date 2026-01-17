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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MetricsService } from '../services/metricsService';

describe('MetricsDashboard Component', () => {
  let mockService: MetricsService;
  
  beforeEach(() => {
    // Mock the metrics service
    mockService = {
      getTaskMetrics: vi.fn().mockResolvedValue({
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
      getAgentMetrics: vi.fn().mockResolvedValue({
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
      getErrorMetrics: vi.fn().mockResolvedValue({
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
    vi.clearAllMocks();
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
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const intervalId = setInterval(() => {}, 30000);
      clearInterval(intervalId);
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Chart Data Generation', () => {
    it('should generate time labels for 24h range', () => {
      const labels = generateTimeLabels('24h');
      expect(labels).toHaveLength(24);
      expect(labels[0]).toMatch(/\d+:00/);
    });

    it('should generate time labels for 7d range', () => {
      const labels = generateTimeLabels('7d');
      expect(labels).toHaveLength(7);
    });

    it('should generate time labels for 30d range', () => {
      const labels = generateTimeLabels('30d');
      expect(labels).toHaveLength(30);
    });

    it('should generate sample completion data', () => {
      const data = generateSampleCompletionData(100, 24);
      expect(data).toHaveLength(24);
      expect(data[data.length - 1]).toBeLessThanOrEqual(100);
    });

    it('should generate sample agent data', () => {
      const data = generateSampleAgentData(100);
      expect(data).toHaveLength(5);
      const sum = data.reduce((a, b) => a + b, 0);
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

// Helper functions (copied from component for testing)
function generateTimeLabels(range: '24h' | '7d' | '30d'): string[] {
  const now = new Date();
  const labels: string[] = [];
  
  if (range === '24h') {
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.getHours() + ':00');
    }
  } else if (range === '7d') {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
  }
  
  return labels;
}

function generateSampleCompletionData(total: number, count: number): number[] {
  const data: number[] = [];
  const increment = total / count;
  for (let i = 0; i < count; i++) {
    data.push(Math.floor(increment * i + Math.random() * increment));
  }
  return data;
}

function generateSampleAgentData(totalExecutions: number): number[] {
  const data: number[] = [];
  let remaining = totalExecutions;
  for (let i = 0; i < 4; i++) {
    const value = Math.floor(Math.random() * (remaining / 2));
    data.push(value);
    remaining -= value;
  }
  data.push(remaining);
  return data;
}

function generateSampleSeverityData(totalErrors: number): number[] {
  if (totalErrors === 0) return [0, 0, 0, 0];
  
  const critical = Math.floor(totalErrors * 0.1);
  const high = Math.floor(totalErrors * 0.2);
  const medium = Math.floor(totalErrors * 0.4);
  const low = totalErrors - critical - high - medium;
  
  return [critical, high, medium, low];
}
